/**
 * 🔔 LAMBDA: notify-admins-new-proposal
 * 
 * Notifica a todos los admins cuando un speaker envía una propuesta de charla.
 * Se ejecuta desde el frontend después de crear TalkProposal.
 * 
 * Flujo:
 * 1️⃣ Recibe proposalId, speakerName, title del frontend
 * 2️⃣ Obtiene lista de usuarios en grupo ADMINS de Cognito
 * 3️⃣ Crea notificación in-app para cada admin
 */

import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, ListUsersInGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';

// Clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({});

// Variables de entorno
const USER_POOL_ID = process.env.USER_POOL_ID;
const NOTIFICATION_TABLE_PREFIX = process.env.NOTIFICATION_TABLE_PREFIX;

interface NotifyAdminsEvent {
  proposalId: string;
  speakerName: string;
  title: string;
}

/**
 * 🔍 Obtiene el nombre completo de una tabla DynamoDB
 */
async function getTableName(prefix: string | undefined): Promise<string> {
  if (!prefix) {
    throw new Error('❌ Table prefix no configurado');
  }
  
  const response = await ddbClient.send(new ListTablesCommand({}));
  const tableName = response.TableNames?.find(name => name.startsWith(prefix));
  
  if (!tableName) {
    throw new Error(`❌ No se encontró tabla con prefijo: ${prefix}`);
  }
  
  console.log(`✅ Tabla encontrada: ${tableName}`);
  return tableName;
}

/**
 * 👥 Obtiene todos los usuarios del grupo ADMINS
 */
async function getAdminUsers(): Promise<Array<{ userId: string; username: string }>> {
  if (!USER_POOL_ID) {
    throw new Error('❌ USER_POOL_ID no configurado');
  }

  console.log('👥 Obteniendo usuarios del grupo ADMINS...');
  
  const response = await cognitoClient.send(new ListUsersInGroupCommand({
    UserPoolId: USER_POOL_ID,
    GroupName: 'ADMINS',
    Limit: 60, // Límite por página (suficiente para comunidad)
  }));

  const admins = (response.Users || []).map(user => ({
    userId: user.Attributes?.find(attr => attr.Name === 'sub')?.Value || '',
    username: user.Username || '',
  })).filter(admin => admin.userId);

  console.log(`✅ Se encontraron ${admins.length} administradores`);
  return admins;
}

/**
 * 🔔 Crea notificaciones para todos los admins
 */
async function notifyAdmins(proposalId: string, speakerName: string, title: string) {
  console.log('🔔 Creando notificaciones para administradores...');
  
  const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
  const admins = await getAdminUsers();
  const now = new Date().toISOString();

  let successCount = 0;
  let errorCount = 0;

  for (const admin of admins) {
    try {
      await docClient.send(new PutCommand({
        TableName: notificationTableName,
        Item: {
          id: randomUUID(),
          userId: admin.userId,
          type: 'NEW_TALK_PROPOSAL',
          title: '📢 Nueva propuesta de charla',
          message: `${speakerName} ha enviado una propuesta: "${title}"`,
          read: false,
          link: '/admin/dashboard',
          icon: '🎤',
          createdAt: now,
          updatedAt: now,
          owner: admin.userId,
          // Metadata adicional para filtrar/buscar
          metadata: JSON.stringify({
            proposalId,
            speakerName,
            proposalTitle: title,
          }),
        },
      }));

      successCount++;
      console.log(`✅ Notificación creada para admin ${admin.username} (${admin.userId})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error al crear notificación para admin ${admin.username}:`, error);
    }
  }

  console.log(`🎉 Notificaciones enviadas: ${successCount} exitosas, ${errorCount} fallidas`);
  return { successCount, errorCount, totalAdmins: admins.length };
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================

export const handler = async (event: NotifyAdminsEvent) => {
  console.log('📥 Evento recibido:', JSON.stringify(event, null, 2));

  try {
    // Validar input
    if (!event.proposalId || !event.speakerName || !event.title) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: proposalId, speakerName, title',
        }),
      };
    }

    // Validar variables de entorno
    if (!USER_POOL_ID || !NOTIFICATION_TABLE_PREFIX) {
      throw new Error('❌ Variables de entorno no configuradas correctamente');
    }

    // Enviar notificaciones a admins
    const result = await notifyAdmins(event.proposalId, event.speakerName, event.title);

    // Respuesta exitosa
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Notificaciones enviadas a administradores',
        ...result,
      }),
    };

  } catch (error) {
    console.error('❌ Error en notify-admins-new-proposal:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error al enviar notificaciones',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
