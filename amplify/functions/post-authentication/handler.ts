import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Clientes AWS (se reutilizan entre invocaciones)
const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Nombre de la tabla User (se obtiene de variables de entorno)
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || '';

/**
 * 🔐 Lambda PreTokenGeneration Handler
 * 
 * CUÁNDO SE EJECUTA:
 * - ANTES de generar tokens JWT (access token, id token)
 * - ✅ Funciona con Google OAuth (PostAuthentication NO funciona con OAuth)
 * - En cada login, incluido refresh tokens
 * 
 * QUÉ HACE:
 * 1. Verifica si el usuario tiene grupos personalizados (MEMBERS, SPEAKERS, ADMINS)
 *    - Si NO tiene ninguno → Lo agrega a "MEMBERS"
 * 2. Verifica si el usuario existe en la tabla User de DynamoDB
 *    - Si NO existe → Lo crea con profileCompleted=false (forzar onboarding)
 * 
 * IMPORTANTE:
 * - Se ejecuta CADA login (no solo el primero)
 * - AdminAddUserToGroup es idempotente (seguro llamar múltiples veces)
 * - Crear usuario en DynamoDB solo ocurre una vez (primer login)
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  console.log('🔐 PreTokenGeneration trigger iniciado');
  console.log('👤 Usuario:', event.userName);
  console.log('📧 Email:', event.request.userAttributes.email);
  console.log('🔑 Trigger Source:', event.triggerSource);
  
  try {
    // ========================================
    // PARTE 1: ASIGNACIÓN DE GRUPO MEMBERS
    // ========================================
    const groupsInToken = event.request.groupConfiguration?.groupsToOverride || [];
    console.log('👥 Grupos actuales:', groupsInToken.length > 0 ? groupsInToken : 'Ninguno');
    
    const customGroups = ['MEMBERS', 'SPEAKERS', 'ADMINS'];
    const hasCustomGroup = groupsInToken.some(g => customGroups.includes(g));
    
    if (!hasCustomGroup) {
      console.log('➕ Usuario sin grupo personalizado, agregando a MEMBERS...');
      
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: 'MEMBERS',
      }));
      
      console.log('✅ Usuario agregado a MEMBERS');
    } else {
      console.log('✅ Usuario ya tiene grupo personalizado:', groupsInToken.filter(g => customGroups.includes(g)));
    }

    // ========================================
    // PARTE 2: CREACIÓN DE USUARIO EN DYNAMODB
    // ========================================
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email;
    const givenName = event.request.userAttributes.given_name || '';
    const familyName = event.request.userAttributes.family_name || '';
    
    console.log('📊 Verificando si usuario existe en DynamoDB...');
    
    // Verificar si el usuario ya existe
    const existingUser = await docClient.send(new GetCommand({
      TableName: USER_TABLE_NAME,
      Key: { id: userId },
    }));
    
    if (!existingUser.Item) {
      console.log('🆕 Usuario no existe, creando registro en DynamoDB...');
      
      const now = new Date().toISOString();
      
      await docClient.send(new PutCommand({
        TableName: USER_TABLE_NAME,
        Item: {
          id: userId,
          email: email,
          givenName: givenName,
          familyName: familyName,
          role: 'MEMBER', // Default role
          profileCompleted: false, // 🚨 FORZAR ONBOARDING
          newsletterOptIn: false,
          createdAt: now,
          updatedAt: now,
          __typename: 'User',
        },
      }));
      
      console.log('✅ Usuario creado en DynamoDB con profileCompleted=false');
      console.log('🎯 Usuario será redirigido a onboarding en siguiente carga');
    } else {
      console.log('✅ Usuario ya existe en DynamoDB:', existingUser.Item.email);
    }
    
  } catch (error) {
    // NO lanzamos el error para evitar bloquear el login
    console.error('❌ Error en PreTokenGeneration:', error);
    console.log('⚠️ El usuario podrá iniciar sesión de todas formas');
  }
  
  // IMPORTANTE: Siempre retornar el evento
  return event;
};
