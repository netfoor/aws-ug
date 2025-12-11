import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { 
  CognitoIdentityProviderClient, 
  AdminAddUserToGroupCommand,
  AdminGetUserCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });

// ⚙️ CONFIGURACIÓN
const USER_POOL_ID = process.env.USER_POOL_ID;
const TABLE_PREFIX = process.env.SPEAKER_APPLICATION_TABLE_PREFIX || 'SpeakerApplication';
const USER_TABLE_PREFIX = process.env.USER_TABLE_PREFIX || 'User';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'fortino.romero.man@gmail.com';

// 🔍 Función para obtener el nombre real de la tabla dinámicamente
async function getTableName(prefix: string): Promise<string> {
  const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
  const response = await ddbClient.send(new ListTablesCommand({}));
  const tableName = response.TableNames?.find(name => name.startsWith(prefix));
  if (!tableName) {
    throw new Error(`No se encontró tabla con prefijo: ${prefix}`);
  }
  return tableName;
}

interface ApprovalEvent {
  applicationId: string;
  userId: string;
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
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
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
                    <li>✅ Ahora tienes el rol de Speaker en AWS Puebla Connect</li>
                    <li>🎤 Puedes proponer charlas y talleres para la comunidad</li>
                    <li>👥 Acceso a recursos exclusivos para speakers</li>
                    <li>📊 Visibilidad en el directorio de speakers</li>
                  </ul>

                  <p><strong>Próximos pasos:</strong></p>
                  <ol>
                    <li>Inicia sesión en AWS Puebla Connect</li>
                    <li>Completa tu perfil de speaker</li>
                    <li>Propón tu primera charla</li>
                  </ol>

                  <a href="https://awspuebla.com/profile" class="button">Ir a mi perfil</a>

                  <p style="margin-top: 30px;">¡Estamos emocionados de tenerte en el equipo!</p>
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
¡Hola ${name}!

Nos complace informarte que tu postulación como SPEAKER ha sido aprobada.

¿Qué significa esto?
- Ahora tienes el rol de Speaker en AWS Puebla Connect
- Puedes proponer charlas y talleres para la comunidad
- Acceso a recursos exclusivos para speakers
- Visibilidad en el directorio de speakers

Próximos pasos:
1. Inicia sesión en AWS Puebla Connect
2. Completa tu perfil de speaker
3. Propón tu primera charla

¡Estamos emocionados de tenerte en el equipo!

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
    console.log('✅ Email de aprobación enviado correctamente');
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    // No lanzamos error para que el proceso continúe
  }
}

/**
 * 🎯 Handler principal - Auto-aprobar aplicación
 */
export const handler: Handler<ApprovalEvent> = async (event) => {
  console.log('🎉 Approve Speaker Application Lambda iniciada');
  console.log('📦 Event:', JSON.stringify(event, null, 2));

  const { applicationId, userId } = event;

  if (!applicationId || !userId) {
    console.error('❌ Datos incompletos:', { applicationId, userId });
    throw new Error('applicationId y userId son requeridos');
  }

  try {
    // 0️⃣ Obtener el nombre real de la tabla
    const tableName = await getTableName(TABLE_PREFIX);
    const userTableName = await getTableName(USER_TABLE_PREFIX);
    console.log(`📋 Usando tablas: ${tableName}, ${userTableName}`);

    // 1️⃣ Obtener la aplicación de DynamoDB
    console.log(`📖 Obteniendo aplicación: ${applicationId}`);
    const getResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id: applicationId },
      })
    );

    if (!getResult.Item) {
      console.error('❌ Aplicación no encontrada');
      throw new Error(`Aplicación ${applicationId} no encontrada`);
    }

    const application = getResult.Item;
    console.log('📄 Aplicación encontrada:', application);

    // Verificar que aún esté PENDING
    if (application.status !== 'PENDING') {
      console.warn(`⚠️  Aplicación ya procesada. Estado actual: ${application.status}`);
      return {
        statusCode: 200,
        message: `Aplicación ya procesada con estado: ${application.status}`,
      };
    }

    // 2️⃣ Actualizar estado en DynamoDB a APPROVED
    console.log('📝 Actualizando estado a APPROVED');
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
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
    console.log('✅ Estado actualizado en DynamoDB');

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
      // Si el usuario ya está en el grupo, no es un error crítico
      if (error.name === 'UserNotFoundException') {
        console.error('❌ Usuario no encontrado en Cognito');
        throw error;
      }
      console.warn('⚠️  Advertencia al agregar a grupo:', error.message);
    }

    // 4️⃣ 🎯 Actualizar role en tabla User a SPEAKER
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

    // 5️⃣ Obtener email del usuario para notificación
    let userEmail = application.email;
    let userName = userEmail.split('@')[0];

    try {
      const userResult = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
        })
      );

      // Extraer email y nombre de los atributos
      const emailAttr = userResult.UserAttributes?.find((attr) => attr.Name === 'email');
      const givenNameAttr = userResult.UserAttributes?.find((attr) => attr.Name === 'given_name');
      const familyNameAttr = userResult.UserAttributes?.find((attr) => attr.Name === 'family_name');

      if (emailAttr?.Value) userEmail = emailAttr.Value;
      if (givenNameAttr?.Value) {
        userName = givenNameAttr.Value;
        if (familyNameAttr?.Value) userName += ` ${familyNameAttr.Value}`;
      }
    } catch (error) {
      console.warn('⚠️  No se pudo obtener info adicional del usuario:', error);
    }

    // 6️⃣ Enviar email de aprobación
    await sendApprovalEmail(userEmail, userName);

    console.log(`✅ Aplicación ${applicationId} aprobada exitosamente`);
    return {
      statusCode: 200,
      message: 'Aplicación aprobada exitosamente',
      applicationId,
      userId,
    };
  } catch (error) {
    console.error('❌ Error en proceso de aprobación:', error);
    throw error;
  }
};
