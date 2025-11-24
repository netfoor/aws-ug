import { DynamoDBStreamHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { 
  SchedulerClient, 
  CreateScheduleCommand
} from '@aws-sdk/client-scheduler';

const sesClient = new SESClient({ region: process.env.AWS_REGION });
const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION });

// ⚙️ CONFIGURACIÓN
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@awspuebla.com';
const APPROVAL_DELAY_MINUTES = 5; // Delay antes de auto-aprobar
const APPROVE_LAMBDA_ARN = process.env.APPROVE_LAMBDA_ARN;

/**
 * 📧 Envía email de confirmación "Solicitud Recibida"
 */
async function sendApplicationReceivedEmail(email: string, name: string) {
  console.log(`📧 Enviando email de confirmación a: ${email}`);
  
  const params = {
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '✅ Tu postulación como Speaker ha sido recibida',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎤 AWS Puebla Connect</h1>
                  <p>Sistema de Postulación para Speakers</p>
                </div>
                <div class="content">
                  <h2>¡Hola ${name}!</h2>
                  <p>Tu postulación como <strong>Speaker</strong> ha sido recibida exitosamente.</p>
                  <p>Nuestro equipo revisará tu solicitud y te notificaremos por email una vez que haya sido procesada.</p>
                  <p><strong>¿Qué sigue?</strong></p>
                  <ul>
                    <li>Revisaremos tu experiencia y temas propuestos</li>
                    <li>Recibirás una notificación con nuestra decisión</li>
                    <li>Si eres aprobado, tendrás acceso a funciones exclusivas para speakers</li>
                  </ul>
                  <p>Gracias por tu interés en compartir tu conocimiento con la comunidad de AWS Puebla.</p>
                </div>
                <div class="footer">
                  <p>AWS User Group Puebla • awspuebla.com</p>
                  <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `
Hola ${name},

Tu postulación como Speaker ha sido recibida exitosamente.

Nuestro equipo revisará tu solicitud y te notificaremos por email una vez que haya sido procesada.

Gracias por tu interés en compartir tu conocimiento con la comunidad de AWS Puebla.

--
AWS User Group Puebla
awspuebla.com
          `,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log('✅ Email de confirmación enviado correctamente');
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * ⏰ Crea EventBridge Schedule para auto-aprobación
 */
async function scheduleAutoApproval(applicationId: string, userId: string) {
  console.log(`⏰ Programando auto-aprobación para: ${applicationId}`);
  
  const scheduleTime = new Date(Date.now() + APPROVAL_DELAY_MINUTES * 60 * 1000);
  const scheduleName = `approve-speaker-${applicationId}`;
  
  const params = {
    Name: scheduleName,
    ScheduleExpression: `at(${scheduleTime.toISOString().slice(0, 19)})`, // Format: at(yyyy-mm-ddThh:mm:ss)
    Target: {
      Arn: APPROVE_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_ROLE_ARN, // IAM role para invocar Lambda
      Input: JSON.stringify({
        applicationId,
        userId,
      }),
    },
    FlexibleTimeWindow: {
      Mode: 'OFF' as const, // Ejecutar exactamente a la hora programada
    },
    State: 'ENABLED' as const,
  };

  try {
    const response = await schedulerClient.send(new CreateScheduleCommand(params));
    console.log(`✅ Schedule creado: ${response.ScheduleArn}`);
    return response.ScheduleArn;
  } catch (error) {
    console.error('❌ Error creando schedule:', error);
    throw error;
  }
}

/**
 * 🎯 Handler principal - Se ejecuta cuando se crea una SpeakerApplication
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  console.log('🎤 Process Speaker Application Lambda iniciada');
  console.log('📦 Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    // Solo procesar nuevas inserciones
    if (record.eventName !== 'INSERT') {
      console.log(`⏭️  Ignorando evento: ${record.eventName}`);
      continue;
    }

    try {
      // Extraer datos de la nueva aplicación
      const newImage = record.dynamodb?.NewImage;
      if (!newImage) {
        console.warn('⚠️  No se encontró NewImage en el record');
        continue;
      }

      const applicationId = newImage.id?.S;
      const userId = newImage.userId?.S;
      const email = newImage.email?.S;
      const userName = email?.split('@')[0] || 'Usuario'; // Fallback si no hay nombre

      if (!applicationId || !userId || !email) {
        console.error('❌ Datos incompletos en la aplicación:', { applicationId, userId, email });
        continue;
      }

      console.log(`👤 Procesando aplicación de: ${email} (${applicationId})`);

      // 1️⃣ Enviar email de confirmación
      await sendApplicationReceivedEmail(email, userName);

      // 2️⃣ Programar auto-aprobación
      const schedulerArn = await scheduleAutoApproval(applicationId, userId);

      // TODO: Actualizar DynamoDB con schedulerArn para tracking
      // Esto lo haremos después de configurar permisos

      console.log(`✅ Aplicación procesada correctamente: ${applicationId}`);
    } catch (error) {
      console.error('❌ Error procesando aplicación:', error);
      // No lanzamos error para que otros records se procesen
    }
  }

  console.log('🏁 Process Speaker Application Lambda completada');
};
