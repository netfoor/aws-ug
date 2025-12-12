import { DynamoDBStreamHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { 
  CognitoIdentityProviderClient, 
  ListUsersInGroupCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const sesClient = new SESClient({ region: process.env.AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// ⚙️ CONFIGURACIÓN
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'fortino.romero.man@gmail.com';
const USER_POOL_ID = process.env.USER_POOL_ID;
const NOTIFICATION_TABLE_PREFIX = 'Notification';
const SPEAKER_APPLICATION_TABLE_PREFIX = 'SpeakerApplication';
const USER_TABLE_PREFIX = 'User';
const TALK_PROPOSAL_TABLE_PREFIX = 'TalkProposal';

/**
 * 🔍 Obtiene el nombre real de la tabla con el prefijo dado
 */
async function getTableName(prefix: string): Promise<string> {
  const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
  const response = await dynamoClient.send(new ListTablesCommand({}));
  const table = response.TableNames?.find((name) => name.startsWith(prefix));
  
  if (!table) {
    throw new Error(`❌ No se encontró tabla con prefijo: ${prefix}`);
  }
  
  console.log(`✅ Tabla encontrada: ${table}`);
  return table;
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
    Limit: 60,
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
async function notifyAdmins(applicationId: string, applicantEmail: string) {
  console.log('🔔 Creando notificaciones para administradores...');
  
  const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
  const admins = await getAdminUsers();
  const now = new Date().toISOString();
  const { randomUUID } = await import('crypto');

  for (const admin of admins) {
    try {
      await docClient.send(new PutCommand({
        TableName: notificationTableName,
        Item: {
          id: randomUUID(),
          userId: admin.userId,
          type: 'NEW_SPEAKER_APPLICATION',
          title: '📝 Nueva postulación de speaker',
          message: `${applicantEmail} ha enviado una postulación para ser speaker. Revisa los detalles en el panel de administración.`,
          read: false,
          link: `/admin/speakers?status=PENDING`,
          icon: '🎤',
          createdAt: now,
          updatedAt: now,
          owner: admin.username,
        },
      }));
      
      console.log(`✅ Notificación creada para admin: ${admin.username}`);
    } catch (error) {
      console.error(`❌ Error creando notificación para ${admin.username}:`, error);
    }
  }
}

/**
 * 📧 Envía email de aprobación
 */
async function sendApprovalEmail(email: string, name: string) {
  console.log(`📧 Enviando email de aprobación a: ${email}`);
  
  const params = {
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '🎉 ¡Tu postulación como Speaker ha sido aprobada!',
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
                .badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 ¡Felicidades!</h1>
                  <p>Ya eres parte del equipo de Speakers</p>
                </div>
                <div class="content">
                  <h2>¡Hola ${name}!</h2>
                  <p>Nos complace informarte que tu postulación como <span class="badge">SPEAKER</span> ha sido <strong>aprobada</strong>.</p>
                  <p><strong>¿Qué significa esto?</strong></p>
                  <ul>
                    <li>Ahora tienes el rol de Speaker en AWS Puebla Connect</li>
                    <li>Puedes proponer charlas y talleres para la comunidad</li>
                    <li>Acceso a recursos exclusivos para speakers</li>
                    <li>Visibilidad en el directorio de speakers</li>
                  </ul>
                  <p><strong>Próximos pasos:</strong></p>
                  <ol>
                    <li><strong>Completa tu perfil profesional</strong> (foto, CV/LinkedIn, área de especialización)</li>
                    <li>Propón tu primera charla para la comunidad</li>
                    <li>Comparte tu conocimiento con AWS User Group Puebla</li>
                  </ol>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://awspuebla.com/profile#professional-profile" class="button" style="margin-right: 10px;">Completar Perfil</a>
                    <a href="https://awspuebla.com/speaker/propose-talk" class="button">Proponer Charla</a>
                  </div>
                  <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    💡 <strong>Tip:</strong> Completa tu perfil profesional antes de proponer tu primera charla. 
                    Esto nos ayudará a promocionar mejor tu participación en nuestros eventos.
                  </p>
                  <p style="margin-top: 30px;">¡Estamos emocionados de tenerte en el equipo!</p>
                </div>
              </div>
            </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log('✅ Email de aprobación enviado correctamente');
  } catch (error) {
    console.error('❌ Error enviando email de aprobación:', error);
  }
}

/**
 * 🔔 Crea notificación in-app para el usuario aprobado
 */
async function createApprovalNotification(userId: string, userName: string) {
  console.log('🔔 Creando notificación de aprobación para usuario...');
  
  const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
  const { randomUUID } = await import('crypto');
  const now = new Date().toISOString();

  try {
    await docClient.send(new PutCommand({
      TableName: notificationTableName,
      Item: {
        id: randomUUID(),
        userId,
        type: 'SPEAKER_APPROVED',
        title: '🎉 ¡Tu postulación fue aprobada!',
        message: 'Felicitaciones, ahora eres speaker. Completa tu perfil profesional y propón tu primera charla.',
        read: false,
        link: '/profile#professional-profile',
        icon: '🎤',
        createdAt: now,
        updatedAt: now,
        owner: userId,
      },
    }));
    
    console.log('✅ Notificación de aprobación creada');
  } catch (error) {
    console.error('❌ Error creando notificación de aprobación:', error);
  }
}

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
 * ✅ Aprueba la aplicación inmediatamente
 */
async function approveApplicationImmediately(applicationId: string, userId: string, userEmail: string) {
  console.log(`⚡ Aprobando aplicación inmediatamente: ${applicationId}`);
  
  try {
    // 1️⃣ Obtener nombre de las tablas
    const speakerAppTableName = await getTableName(SPEAKER_APPLICATION_TABLE_PREFIX);
    const userTableName = await getTableName(USER_TABLE_PREFIX);
    
    // 2️⃣ Actualizar estado en SpeakerApplication a APPROVED
    console.log('📝 Actualizando estado a APPROVED en DynamoDB');
    await docClient.send(
      new UpdateCommand({
        TableName: speakerAppTableName,
        Key: { id: applicationId },
        UpdateExpression: 'SET #status = :approved, reviewedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':approved': 'APPROVED',
          ':now': new Date().toISOString(),
        },
      })
    );
    console.log('✅ Estado actualizado en SpeakerApplication');

    // 3️⃣ Agregar usuario al grupo SPEAKERS en Cognito
    console.log(`👤 Agregando usuario ${userId} al grupo SPEAKERS`);
    try {
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
          GroupName: 'SPEAKERS',
        })
      );
      console.log('✅ Usuario agregado al grupo SPEAKERS');
    } catch (error: any) {
      if (error.name !== 'UserNotFoundException') {
        console.warn('⚠️  Advertencia al agregar a grupo:', error.message);
      } else {
        throw error;
      }
    }

    // 4️⃣ Actualizar role en User table a SPEAKER
    console.log(`📋 Actualizando role en User table: ${userId}`);
    await docClient.send(
      new UpdateCommand({
        TableName: userTableName,
        Key: { id: userId },
        UpdateExpression: 'SET #role = :role, updatedAt = :now',
        ExpressionAttributeNames: {
          '#role': 'role',
        },
        ExpressionAttributeValues: {
          ':role': 'SPEAKER',
          ':now': new Date().toISOString(),
        },
      })
    );
    console.log('✅ Role actualizado en User table');

    // 5️⃣ Obtener info completa del usuario
    let userName = userEmail.split('@')[0];
    try {
      const userResult = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
        })
      );

      const givenNameAttr = userResult.UserAttributes?.find((attr) => attr.Name === 'given_name');
      const familyNameAttr = userResult.UserAttributes?.find((attr) => attr.Name === 'family_name');

      if (givenNameAttr?.Value) {
        userName = givenNameAttr.Value;
        if (familyNameAttr?.Value) userName += ` ${familyNameAttr.Value}`;
      }
    } catch (error) {
      console.warn('⚠️  No se pudo obtener info adicional del usuario:', error);
    }

    // 6️⃣ Enviar email de aprobación
    await sendApprovalEmail(userEmail, userName);

    // 7️⃣ Crear notificación in-app
    await createApprovalNotification(userId, userName);

    console.log(`✅ Aplicación ${applicationId} aprobada exitosamente`);
  } catch (error) {
    console.error('❌ Error en aprobación automática:', error);
    throw error;
  }
}

/**
 * 🎯 Crea automáticamente una TalkProposal si viene en la aplicación
 */
async function createAttachedTalkProposal(
  applicationId: string,
  userId: string,
  userEmail: string,
  attachedProposal: any
) {
  console.log('🎯 Creando propuesta de charla adjunta automáticamente...');
  
  const talkProposalTableName = await getTableName(TALK_PROPOSAL_TABLE_PREFIX);
  const { randomUUID } = await import('crypto');
  const now = new Date().toISOString();

  const talkProposalData = {
    id: randomUUID(),
    userId,
    userEmail,
    speakerName: userEmail.split('@')[0], // Temporal, se actualiza después
    speakerEmail: userEmail,
    applicationId, // ← Vinculación con SpeakerApplication
    title: attachedProposal.talkTitle,
    description: attachedProposal.talkDescription,
    duration: attachedProposal.duration || 45,
    targetAudience: attachedProposal.targetAudience || 'ALL',
    proposedDate: attachedProposal.proposedDate,
    topics: [], // Se puede extraer de la aplicación si es necesario
    status: 'SUBMITTED', // Aún debe ser revisada por admins
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    owner: userId,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: talkProposalTableName,
      Item: talkProposalData,
    }));
    
    console.log(`✅ Propuesta de charla creada automáticamente: ${talkProposalData.id}`);
    
    // Notificar admins sobre la nueva propuesta
    await notifyAdminsNewProposal(talkProposalData.id, userEmail, attachedProposal.talkTitle);
    
    return talkProposalData.id;
  } catch (error) {
    console.error('❌ Error creando propuesta adjunta:', error);
    throw error;
  }
}

/**
 * 🔔 Notifica a admins sobre nueva propuesta de charla
 */
async function notifyAdminsNewProposal(proposalId: string, speakerEmail: string, talkTitle: string) {
  console.log('🔔 Notificando a admins sobre nueva propuesta...');
  
  const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
  const admins = await getAdminUsers();
  const now = new Date().toISOString();
  const { randomUUID } = await import('crypto');

  for (const admin of admins) {
    try {
      await docClient.send(new PutCommand({
        TableName: notificationTableName,
        Item: {
          id: randomUUID(),
          userId: admin.userId,
          type: 'NEW_TALK_PROPOSAL',
          title: '💡 Nueva propuesta de charla',
          message: `${speakerEmail} propuso: "${talkTitle}". Revisa los detalles en el panel de administración.`,
          read: false,
          link: `/admin/proposals?status=SUBMITTED`,
          icon: '💡',
          createdAt: now,
          updatedAt: now,
          owner: admin.username,
        },
      }));
      
      console.log(`✅ Notificación de propuesta creada para admin: ${admin.username}`);
    } catch (error) {
      console.error(`❌ Error creando notificación para ${admin.username}:`, error);
    }
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
      
      // Extraer propuesta adjunta si existe
      const hasAttachedProposal = newImage.hasAttachedProposal?.BOOL || false;
      let attachedProposal = null;
      
      if (hasAttachedProposal && newImage.attachedProposal?.S) {
        try {
          // Parse JSON string from DynamoDB
          attachedProposal = JSON.parse(newImage.attachedProposal.S);
          console.log('📎 Propuesta adjunta detectada:', attachedProposal.talkTitle);
        } catch (error) {
          console.error('❌ Error parsing attachedProposal JSON:', error);
        }
      }

      if (!applicationId || !userId || !email) {
        console.error('❌ Datos incompletos en la aplicación:', { applicationId, userId, email });
        continue;
      }

      console.log(`👤 Procesando aplicación de: ${email} (${applicationId})`);

      // 1️⃣ Notificar a todos los admins
      await notifyAdmins(applicationId, email);

      // 2️⃣ ⚡ APROBAR INMEDIATAMENTE (sin esperar)
      // Esto enviará el email de aprobación directamente
      await approveApplicationImmediately(applicationId, userId, email);
      
      // 3️⃣ Si viene propuesta adjunta, crearla automáticamente
      if (hasAttachedProposal && attachedProposal) {
        console.log('🎯 Creando propuesta adjunta automáticamente...');
        try {
          await createAttachedTalkProposal(applicationId, userId, email, attachedProposal);
        } catch (error) {
          console.error('❌ Error creando propuesta adjunta (no crítico):', error);
          // No detenemos el flujo si falla la propuesta
        }
      }

      console.log(`✅ Aplicación procesada y aprobada correctamente: ${applicationId}`);
    } catch (error) {
      console.error('❌ Error procesando aplicación:', error);
      // No lanzamos error para que otros records se procesen
    }
  }

  console.log('🏁 Process Speaker Application Lambda completada');
};
