import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Cliente de Cognito (se reutiliza entre invocaciones)
const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * 🔐 Lambda PreTokenGeneration Handler
 * 
 * CUÁNDO SE EJECUTA:
 * - ANTES de generar tokens JWT (access token, id token)
 * - ✅ Funciona con Google OAuth (PostAuthentication NO funciona con OAuth)
 * - En cada login, incluido refresh tokens
 * 
 * QUÉ HACE:
 * - Verifica si el usuario tiene grupos personalizados (MEMBERS, SPEAKERS, ADMINS)
 * - Si NO tiene ninguno de esos → Lo agrega a "MEMBERS"
 * - Si YA tiene alguno → No hace nada
 * 
 * IMPORTANTE:
 * - Se ejecuta CADA login (no solo el primero)
 * - AdminAddUserToGroup es idempotente (seguro llamar múltiples veces)
 * - Los grupos automáticos de OAuth (us-east-1_xxx_Google) no cuentan
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  console.log('🔐 PreTokenGeneration trigger iniciado');
  console.log('👤 Usuario:', event.userName);
  console.log('📧 Email:', event.request.userAttributes.email);
  console.log('🔑 Trigger Source:', event.triggerSource);
  
  try {
    // Obtener los grupos del usuario desde el evento
    const groupsInToken = event.request.groupConfiguration?.groupsToOverride || [];
    
    console.log('👥 Grupos actuales:', groupsInToken.length > 0 ? groupsInToken : 'Ninguno');
    
    // Verificar si el usuario tiene alguno de nuestros grupos personalizados
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
      console.log('⚠️ Cambios visibles en el PRÓXIMO token (siguiente login o refresh)');
    } else {
      console.log('✅ Usuario ya tiene grupo personalizado:', groupsInToken.filter(g => customGroups.includes(g)));
    }
    
  } catch (error) {
    // NO lanzamos el error para evitar bloquear el login
    console.error('❌ Error en PreTokenGeneration:', error);
    console.log('⚠️ El usuario podrá iniciar sesión de todas formas');
  }
  
  // IMPORTANTE: Siempre retornar el evento
  // PreTokenGeneration puede modificar el token, pero no lo hacemos aquí
  return event;
};
