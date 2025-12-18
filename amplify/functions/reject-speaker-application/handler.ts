/**
 * 🎯 LAMBDA: reject-speaker-application
 * 
 * Rechaza postulación de speaker con razón personalizada.
 * 
 * Flujo:
 * 1️⃣ Recibe applicationId, userId, rejectionReason del admin
 * 2️⃣ Cancela schedule de EventBridge (si existe)
 * 3️⃣ Actualiza status → REJECTED con razón
 * 4️⃣ Envía email de rechazo (con mensaje motivacional)
 */

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
  SESClient,
  SendEmailCommand
} from '@aws-sdk/client-ses';

// ========================================
// 🔧 CONFIGURACIÓN
// ========================================
const TABLE_PREFIX = process.env.SPEAKER_APPLICATION_TABLE_PREFIX || 'SpeakerApplication';
const NOTIFICATION_TABLE_PREFIX = process.env.NOTIFICATION_TABLE_PREFIX || 'Notification';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'fortino.romero.man@gmail.com';
const REGION = process.env.AWS_REGION || 'us-east-1';

// ========================================
// 📦 CLIENTES AWS
// ========================================
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sesClient = new SESClient({ region: REGION });

// ========================================
// 📊 TIPOS
// ========================================
interface RejectionEvent {
  applicationId: string;
  userId: string;
  rejectionReason: string;
  rejectedBy: string; // Admin user ID que rechazó
}

interface SpeakerApplication {
  id: string;
  userId: string;
  email: string;
  motivation: string;
  topics: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  schedulerArn?: string;
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
 * Envía email de rechazo con razón personalizada
 */
async function sendRejectionEmail(
  email: string,
  userName: string,
  rejectionReason: string
): Promise<void> {
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
    .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    .button { background: #FF9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .highlight { background: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sobre tu postulación como Speaker</h1>
    </div>
    <div class="content">
      <p>Hola ${userName},</p>
      
      <p>Gracias por tu interés en ser parte del equipo de speakers de AWS User Group Puebla. Hemos revisado cuidadosamente tu postulación.</p>
      
      <div class="reason-box">
        <h3>📋 Feedback:</h3>
        <p><strong>${rejectionReason}</strong></p>
      </div>
      
      <div class="highlight">
        <h3>💡 ¡No te desanimes!</h3>
        <p>Esta decisión no es definitiva. Te animamos a:</p>
        <ul>
          <li>Seguir participando en nuestros eventos como miembro</li>
          <li>Trabajar en las áreas sugeridas en el feedback</li>
          <li>Aplicar nuevamente en el futuro cuando te sientas listo/a</li>
          <li>Contactarnos si tienes dudas o necesitas orientación</li>
        </ul>
      </div>
      
      <p>La comunidad de AWS User Group Puebla está aquí para apoyarte en tu crecimiento profesional. Esperamos verte en nuestros próximos eventos.</p>
      
      <p style="text-align: center;">
        <a href="https://awspuebla.com/events" class="button">Ver próximos eventos</a>
      </p>
      
      <p>Saludos cordiales,<br>
      <strong>AWS User Group Puebla</strong></p>
    </div>
    <div class="footer">
      <p>AWS User Group Puebla | Puebla, México</p>
      <p>¿Tienes preguntas? Responde este correo para contactarnos.</p>
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
        Data: 'Actualización sobre tu postulación como Speaker - AWS User Group Puebla',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Hola ${userName}, hemos revisado tu postulación como speaker. Feedback: ${rejectionReason}. Te animamos a seguir participando y aplicar nuevamente en el futuro. Visita nuestros eventos: https://awspuebla.com/events`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
  console.log(`✅ Email de rechazo enviado a: ${email}`);
}

/**
 * Crea notificación in-app para el usuario
 */
async function createNotification(userId: string, rejectionReason: string, notificationTableName: string): Promise<void> {
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
  const { randomUUID } = await import('crypto');

  const now = new Date().toISOString();
  await docClient.send(new PutCommand({
    TableName: notificationTableName,
    Item: {
      id: randomUUID(),
      userId,
      type: 'SPEAKER_REJECTED',
      title: 'Actualización sobre tu postulación',
      message: `Tu postulación como speaker fue revisada. Feedback: ${rejectionReason}. Te animamos a seguir participando y aplicar nuevamente en el futuro.`,
      read: false,
      link: '/profile',
      icon: '📋',
      createdAt: now,
      updatedAt: now,
      owner: userId,
    },
  }));

  console.log(`✅ Notificación creada para usuario ${userId}`);
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================
export const handler: Handler<RejectionEvent> = async (event) => {
  console.log('❌ Rechazo de speaker iniciado:', JSON.stringify(event, null, 2));

  const { applicationId, userId, rejectionReason, rejectedBy } = event;

  if (!applicationId || !userId || !rejectionReason) {
    throw new Error('❌ Faltan parámetros requeridos: applicationId, userId, rejectionReason');
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

    // 2️⃣ Actualizar status en DynamoDB
    console.log('📝 Actualizando status a REJECTED...');
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: applicationId },
      UpdateExpression: 'SET #status = :status, reviewedAt = :reviewedAt, rejectionReason = :reason, rejectedBy = :rejectedBy',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'REJECTED',
        ':reviewedAt': new Date().toISOString(),
        ':reason': rejectionReason,
        ':rejectedBy': rejectedBy,
      },
    }));

    console.log('✅ Status actualizado correctamente');

    // 4️⃣ Enviar email de rechazo
    const userName = application.email.split('@')[0]; // Fallback
    await sendRejectionEmail(application.email, userName, rejectionReason);

    console.log('✅ Email de rechazo enviado');

    // 5️⃣ Crear notificación in-app
    await createNotification(userId, rejectionReason, notificationTableName);

    console.log('✅ Notificación in-app creada');

    // ========================================
    // 🎉 ÉXITO
    // ========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Speaker rechazado exitosamente',
        applicationId,
        userId,
        status: 'REJECTED',
        rejectedBy,
      }),
    };

  } catch (error) {
    console.error('❌ Error en rechazo:', error);
    throw error;
  }
};
