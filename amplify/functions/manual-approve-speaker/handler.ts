/**
 * 🎯 LAMBDA: manual-approve-speaker
 * 
 * Aprobación MANUAL de postulación de speaker por admin.
 * Similar a approve-speaker-application pero con diferencias:
 * - Triggered por API   console.log(`✅ Email de aprobación enviado: ${email}`);
}
/**
 * Crea notificación in-app para el usuario
 */
async function createNotification(userId: string, notificationTableName: string): Promise<void> {
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
  const { randomUUID } = await import('crypto');
  
  const now = new Date().toISOString();
  await docClient.send(new PutCommand({
    TableName: notificationTableName,
    Item: {
      id: randomUUID(),
      userId,
      type: 'SPEAKER_APPROVED',
      title: '🎉 ¡Tu postulación fue aprobada!',
      message: 'Felicitaciones, ahora eres parte del equipo de speakers de AWS User Group Puebla. Tus permisos se actualizarán automáticamente. Ya puedes proponer charlas para nuestros eventos.',
      read: false,
      link: '/speaker/propose-talk',
      icon: '🎤',
      createdAt: now,
      updatedAt: now,
      owner: userId,
    },
  }));
  
  console.log(`✅ Notificación creada para usuario ${userId}`);
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================y (no EventBridge)
// * - Cancela el schedule automático de EventBridge si existe
// * - Ejecuta inmediatamente (no espera 5 min)
// * 
// * Flujo:
// * 1️⃣ Recibe applicationId del admin panel
// * 2️⃣ Cancela schedule de EventBridge (si existe)
// * 3️⃣ Obtiene datos de DynamoDB
// * 4️⃣ Actualiza status → APPROVED
// * 5️⃣ Agrega usuario a grupo SPEAKERS en Cognito
// * 6️⃣ Envía email de aprobación
// */

import type { Handler } from 'aws-lambda';
import { 
  DynamoDBClient, 
  ListTablesCommand 
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { 
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  SESClient, 
  SendEmailCommand 
} from '@aws-sdk/client-ses';
import {
  SchedulerClient,
  DeleteScheduleCommand,
} from '@aws-sdk/client-scheduler';

// ========================================
// 🔧 CONFIGURACIÓN
// ========================================
const TABLE_PREFIX = process.env.SPEAKER_APPLICATION_TABLE_PREFIX || 'SpeakerApplication';
const NOTIFICATION_TABLE_PREFIX = process.env.NOTIFICATION_TABLE_PREFIX || 'Notification';
const USER_POOL_ID = process.env.USER_POOL_ID;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'fortino.romero.man@gmail.com';
const REGION = process.env.AWS_REGION || 'us-east-1';

// ========================================
// 📦 CLIENTES AWS
// ========================================
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const sesClient = new SESClient({ region: REGION });
const schedulerClient = new SchedulerClient({ region: REGION });

// ========================================
// 📊 TIPOS
// ========================================
interface ManualApprovalEvent {
  applicationId: string;
  userId: string;
  approvedBy: string; // Admin user ID que aprobó
}

interface SpeakerApplication {
  id: string;
  userId: string;
  email: string;
  motivation: string;
  topics: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  schedulerArn?: string; // ARN del EventBridge Schedule
}

// ========================================
// 🛠️ UTILIDADES
// ========================================
/**
 * Obtiene el nombre real de la tabla DynamoDB con sufijo
 */
async function getTableName(prefix: string): Promise<string> {
  const response = await ddbClient.send(new ListTablesCommand({}));
  const tableName = response.TableNames?.find(name => name.startsWith(prefix));
  
  if (!tableName) {
    throw new Error(`❌ No se encontró tabla con prefijo: ${prefix}`);
  }
  
  return tableName;
}

/**
 * Cancela el schedule de EventBridge (aprobación automática)
 */
async function cancelAutoApprovalSchedule(scheduleName: string): Promise<void> {
  try {
    await schedulerClient.send(new DeleteScheduleCommand({
      Name: scheduleName,
    }));
    console.log(`✅ Schedule cancelado: ${scheduleName}`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`⚠️ Schedule ya no existe: ${scheduleName}`);
    } else {
      console.error(`❌ Error cancelando schedule:`, error);
      // No lanzamos error - continuar con aprobación manual
    }
  }
}

/**
 * Envía email de aprobación usando SES
 */
async function sendApprovalEmail(email: string, userName: string): Promise<void> {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF9900 0%, #FF6B00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    .button { background: #FF9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ¡Felicidades ${userName}!</h1>
    </div>
    <div class="content">
      <p>¡Excelentes noticias!</p>
      
      <p>Tu postulación para ser <span class="badge">SPEAKER</span> de AWS User Group Puebla ha sido <strong>APROBADA</strong>.</p>
      
      <h3>📋 ¿Qué sigue?</h3>
      <ul>
        <li>Ya tienes acceso a funcionalidades exclusivas de speakers</li>
        <li>Puedes proponer charlas para nuestros próximos eventos</li>
        <li>Tu perfil ahora muestra el badge de SPEAKER</li>
        <li>Pronto nos pondremos en contacto contigo para coordinar tu primera charla</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="https://awspuebla.com/profile" class="button">Ver mi perfil</a>
      </p>
      
      <p>¡Bienvenido al equipo de speakers! 🎤</p>
      
      <p>Saludos,<br>
      <strong>AWS User Group Puebla</strong></p>
    </div>
    <div class="footer">
      <p>AWS User Group Puebla | Puebla, México</p>
      <p>Este es un mensaje automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>
  `;

  const command = new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '🎉 ¡Tu postulación como SPEAKER ha sido aprobada!',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `¡Felicidades ${userName}! Tu postulación para ser SPEAKER de AWS User Group Puebla ha sido APROBADA. Ya tienes acceso a funcionalidades exclusivas de speakers. Visita tu perfil en: https://awspuebla.com/profile`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
  console.log(`✅ Email de aprobación enviado a: ${email}`);
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================
export const handler: Handler<ManualApprovalEvent> = async (event) => {
  console.log('🎯 Aprobación MANUAL de speaker iniciada:', JSON.stringify(event, null, 2));

  const { applicationId, userId, approvedBy } = event;

  if (!applicationId || !userId) {
    throw new Error('❌ Faltan parámetros requeridos: applicationId, userId');
  }

  if (!USER_POOL_ID) {
    throw new Error('❌ USER_POOL_ID no configurado');
  }

  try {
    // 0️⃣ Obtener nombres reales de las tablas
    const tableName = await getTableName(TABLE_PREFIX);
    const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
    console.log(`📋 Usando tablas: ${tableName}, ${notificationTableName}`);

    // 1️⃣ Obtener datos de la postulación
    console.log(`📖 Obteniendo postulación: ${applicationId}`);
    const getResult = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: applicationId },
    }));

    const application = getResult.Item as SpeakerApplication;

    if (!application) {
      throw new Error(`❌ Postulación no encontrada: ${applicationId}`);
    }

    if (application.status !== 'PENDING') {
      throw new Error(`⚠️ Postulación ya fue procesada. Estado actual: ${application.status}`);
    }

    console.log(`✅ Postulación encontrada para: ${application.email}`);

    // 2️⃣ Cancelar schedule de aprobación automática (si existe)
    if (application.schedulerArn) {
      const scheduleName = application.schedulerArn.split('/').pop();
      if (scheduleName) {
        await cancelAutoApprovalSchedule(scheduleName);
      }
    }

    // 3️⃣ Actualizar status en DynamoDB
    console.log('📝 Actualizando status a APPROVED...');
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: applicationId },
      UpdateExpression: 'SET #status = :status, reviewedAt = :reviewedAt, approvedBy = :approvedBy',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'APPROVED',
        ':reviewedAt': new Date().toISOString(),
        ':approvedBy': approvedBy,
      },
    }));

    console.log('✅ Status actualizado correctamente');

    // 4️⃣ Agregar usuario al grupo SPEAKERS en Cognito
    console.log(`👥 Agregando usuario ${userId} al grupo SPEAKERS...`);
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      GroupName: 'SPEAKERS',
    }));

    console.log('✅ Usuario agregado al grupo SPEAKERS');

    // 5️⃣ Enviar email de aprobación
    const userName = application.email.split('@')[0]; // Fallback si no hay nombre
    await sendApprovalEmail(application.email, userName);

    console.log('✅ Email de aprobación enviado');

    // 6️⃣ Crear notificación in-app
    await createNotification(userId, notificationTableName);

    console.log('✅ Notificación in-app creada');

    // ========================================
    // 🎉 ÉXITO
    // ========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Speaker aprobado manualmente exitosamente',
        applicationId,
        userId,
        status: 'APPROVED',
        approvedBy,
      }),
    };

  } catch (error) {
    console.error('❌ Error en aprobación manual:', error);
    throw error;
  }
};
