# 🎤 Speaker Application Workflow - Documentación Técnica Completa

## 📖 Descripción General

Sistema automatizado de postulación para speakers con aprobación automática después de 5 minutos. El flujo está completamente orquestado por servicios AWS con mínima intervención manual.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                     │
├─────────────────────────────────────────────────────────────────────┤
│  SpeakerApplicationForm.tsx  →  GraphQL Mutation  →  AppSync         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DYNAMODB (SpeakerApplication)                   │
│  Nuevo registro: { status: "PENDING", userId, email, motivation }   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ DynamoDB Stream (NEW_IMAGE)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Lambda 1: process-speaker-application                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Enviar email "Solicitud Recibida" (SES)                    │  │
│  │ 2. Crear EventBridge Schedule (5 min delay)                   │  │
│  │    Target: approve-speaker-application Lambda                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ Espera 5 minutos (EventBridge Scheduler)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Lambda 2: approve-speaker-application                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Actualizar DynamoDB: status = "APPROVED"                   │  │
│  │ 2. Agregar usuario al grupo SPEAKERS (Cognito)                │  │
│  │ 3. Enviar email "¡Aprobado!" (SES)                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 RESULTADO FINAL                                      │
│  ✅ Usuario en grupo SPEAKERS (Cognito)                             │
│  ✅ Badge SPEAKER visible en frontend                                │
│  ✅ 2 emails enviados al usuario                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Archivos Involucrados

### **Backend - Configuración Core**

#### 1. `amplify/backend.ts`
**Propósito:** Configura toda la infraestructura del workflow

**Componentes clave:**
```typescript
// Importar Lambdas
import { processSpeakerApplication } from './functions/process-speaker-application/resource';
import { approveSpeakerApplication } from './functions/approve-speaker-application/resource';

// Registrar en backend
const backend = defineBackend({
  // ... otros
  processSpeakerApplication,
  approveSpeakerApplication,
});

// ========================================
// PERMISOS IAM
// ========================================

// 1. Lambda de procesamiento → SES (enviar emails)
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// 2. Lambda de procesamiento → EventBridge Scheduler (crear schedules)
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule'],
    resources: ['*'],
  })
);

// 3. Lambda de procesamiento → IAM (pasar role a Scheduler)
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['iam:PassRole'],
    resources: ['arn:aws:iam::*:role/EventBridgeSchedulerToLambdaRole-*'],
  })
);

// 4. Lambda de procesamiento → DynamoDB Streams (leer eventos)
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetRecords',
      'dynamodb:GetShardIterator',
      'dynamodb:DescribeStream',
      'dynamodb:ListStreams',
    ],
    resources: ['arn:aws:dynamodb:*:*:table/SpeakerApplication-*/stream/*'],
  })
);

// 5. Lambda de aprobación → DynamoDB (actualizar status)
backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:UpdateItem',
      'dynamodb:PutItem',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/SpeakerApplication-*',
      'arn:aws:dynamodb:*:*:table/User-*',
    ],
  })
);

// 6. Lambda de aprobación → Cognito (agregar a grupo)
backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminGetUser',
    ],
    resources: ['arn:aws:cognito-idp:*:*:userpool/*'],
  })
);

// 7. Lambda de aprobación → SES (enviar email de aprobación)
backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// ========================================
// EVENTBRIDGE SCHEDULER IAM ROLE (IaC con CDK)
// ========================================

const schedulerRole = new Role(
  backend.createStack('speaker-workflow-stack'),
  'SchedulerInvokeLambdaRole',
  {
    assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
    description: 'Role para EventBridge Scheduler invocar Lambda de aprobación',
  }
);

schedulerRole.addToPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [backend.approveSpeakerApplication.resources.lambda.functionArn],
  })
);

// Pasar ARN del role como variable de entorno
backend.processSpeakerApplication.addEnvironment(
  'SCHEDULER_ROLE_ARN',
  schedulerRole.roleArn
);

// ========================================
// VARIABLES DE ENTORNO
// ========================================

// Lambda de procesamiento
backend.processSpeakerApplication.addEnvironment(
  'APPROVE_LAMBDA_ARN',
  backend.approveSpeakerApplication.resources.lambda.functionArn
);
backend.processSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'fortino.romero.man@gmail.com' // Email verificado en SES
);

// Lambda de aprobación
backend.approveSpeakerApplication.addEnvironment(
  'SPEAKER_APPLICATION_TABLE',
  speakerApplicationTableName // Auto-generado por Amplify
);
backend.approveSpeakerApplication.addEnvironment(
  'USER_POOL_ID',
  userPoolId // Auto-generado por Amplify
);
backend.approveSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'fortino.romero.man@gmail.com'
);
```

**Recursos generados:**
- ✅ 2 Lambdas con permisos completos
- ✅ IAM Role para EventBridge Scheduler
- ✅ Todas las políticas necesarias
- ✅ Variables de entorno automáticas

---

#### 2. `amplify/data/resource.ts`
**Propósito:** Define el schema GraphQL y modelo de DynamoDB

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // ... otros modelos
  
  SpeakerApplication: a.model({
    userId: a.string().required(),
    email: a.string().required(),
    motivation: a.string().required(),
    topics: a.string().array().required(),
    experience: a.string(),
    previousTalksLinks: a.string().array(),
    status: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
    submittedAt: a.datetime().required(),
    reviewedAt: a.datetime(),
    schedulerArn: a.string(), // ARN del EventBridge Schedule
  })
    .authorization((allow) => [
      allow.owner(), // Usuario puede ver sus propias postulaciones
      allow.group('ADMINS'), // Admins pueden ver todo
    ])
    .secondaryIndexes((index) => [
      index('userId')
        .sortKeys(['submittedAt'])
        .queryField('applicationsByUser'),
      index('status')
        .sortKeys(['submittedAt'])
        .queryField('applicationsByStatus'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

**Tabla generada en DynamoDB:**
- Nombre: `SpeakerApplication-{hash}-SANDBOX`
- Primary Key: `id` (String, UUID auto-generado)
- GSI 1: `userId-submittedAt-index` (para ver aplicaciones por usuario)
- GSI 2: `status-submittedAt-index` (para admins filtrar por status)
- **Stream:** `NEW_AND_OLD_IMAGES` (captura cambios)

---

### **Backend - Lambda Functions**

#### 3. `amplify/functions/process-speaker-application/resource.ts`
**Propósito:** Define la Lambda como recurso de Amplify

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const processSpeakerApplication = defineFunction({
  name: 'process-speaker-application',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
});
```

---

#### 4. `amplify/functions/process-speaker-application/handler.ts`
**Propósito:** Lambda que procesa nuevas postulaciones

**Trigger:** DynamoDB Stream (INSERT events)

**Flujo completo:**
```typescript
import { DynamoDBStreamHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SchedulerClient, CreateScheduleCommand } from '@aws-sdk/client-scheduler';

const sesClient = new SESClient({ region: 'us-east-1' });
const schedulerClient = new SchedulerClient({ region: 'us-east-1' });

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    // Solo procesar nuevas aplicaciones
    if (record.eventName !== 'INSERT') continue;
    
    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    // Extraer datos
    const applicationId = newImage.id?.S || '';
    const userId = newImage.userId?.S || '';
    const email = newImage.email?.S || '';
    const name = email.split('@')[0]; // Nombre simple del email
    
    console.log(`📋 Procesando aplicación: ${applicationId}`);
    console.log(`👤 Usuario: ${userId} (${email})`);

    try {
      // ========================================
      // PASO 1: ENVIAR EMAIL DE CONFIRMACIÓN
      // ========================================
      
      await sendApplicationReceivedEmail(email, name);
      console.log('✅ Email de confirmación enviado');

      // ========================================
      // PASO 2: CREAR EVENTBRIDGE SCHEDULE
      // ========================================
      
      // Calcular hora de aprobación (5 minutos desde ahora)
      const approvalTime = new Date(Date.now() + 5 * 60 * 1000);
      const scheduleTime = approvalTime.toISOString().slice(0, 19); // Format: 2024-11-24T18:35:00
      
      console.log(`⏰ Programando auto-aprobación para: ${scheduleTime}`);

      const scheduleCommand = new CreateScheduleCommand({
        Name: `approve-speaker-${applicationId}`, // Nombre único
        ScheduleExpression: `at(${scheduleTime})`, // One-time execution
        FlexibleTimeWindow: { Mode: 'OFF' as const }, // Ejecutar exactamente a la hora
        State: 'ENABLED' as const,
        Target: {
          Arn: process.env.APPROVE_LAMBDA_ARN!, // Lambda de aprobación
          RoleArn: process.env.SCHEDULER_ROLE_ARN!, // Role para invocar Lambda
          Input: JSON.stringify({ // Payload para la Lambda
            applicationId,
            userId,
            userEmail: email,
          }),
        },
        // Auto-delete después de ejecución (limpieza automática)
        ActionAfterCompletion: 'DELETE' as const,
      });

      const scheduleResult = await schedulerClient.send(scheduleCommand);
      console.log('✅ Schedule creado:', scheduleResult.ScheduleArn);

    } catch (error) {
      console.error('❌ Error procesando aplicación:', error);
      // No lanzar error para no bloquear otros records del batch
    }
  }
};

// ========================================
// FUNCIÓN AUXILIAR: ENVIAR EMAIL
// ========================================

async function sendApplicationReceivedEmail(email: string, name: string) {
  const emailCommand = new SendEmailCommand({
    Source: process.env.SENDER_EMAIL!, // fortino.romero.man@gmail.com
    Destination: { ToAddresses: [email] },
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
              <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
                  <h1 style="color: #FF9900;">🎤 ¡Hola ${name}!</h1>
                  <p style="font-size: 16px; color: #333;">
                    Hemos recibido tu postulación para convertirte en Speaker de 
                    <strong>AWS User Group Puebla</strong>.
                  </p>
                  <p style="font-size: 16px; color: #333;">
                    Tu solicitud está siendo procesada automáticamente. 
                    Recibirás un correo de confirmación en los próximos minutos.
                  </p>
                  <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      <strong>Estado:</strong> 🔄 En revisión<br>
                      <strong>Tiempo estimado:</strong> 5 minutos
                    </p>
                  </div>
                  <p style="font-size: 14px; color: #999;">
                    Saludos,<br>
                    <strong>AWS User Group Puebla</strong>
                  </p>
                </div>
              </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(emailCommand);
}
```

**Variables de entorno requeridas:**
- `APPROVE_LAMBDA_ARN`: ARN de la Lambda de aprobación
- `SCHEDULER_ROLE_ARN`: ARN del IAM Role para EventBridge
- `SENDER_EMAIL`: Email verificado en SES (fortino.romero.man@gmail.com)

**Permisos IAM necesarios:**
- ✅ `ses:SendEmail` → Enviar emails
- ✅ `scheduler:CreateSchedule` → Crear schedule de EventBridge
- ✅ `iam:PassRole` → Pasar role a EventBridge Scheduler
- ✅ `dynamodb:GetRecords` → Leer stream events

**CloudWatch Logs:**
- Log Group: `/aws/lambda/amplify-awsug-{hash}-processspeakerapplicatio-{id}`
- Buscar: "📋 Procesando aplicación", "✅ Email enviado", "✅ Schedule creado"

---

#### 5. `amplify/functions/process-speaker-application/package.json`
```json
{
  "name": "process-speaker-application",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-ses": "^3.600.0",
    "@aws-sdk/client-scheduler": "^3.600.0",
    "aws-lambda": "^1.0.7"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.138",
    "@types/node": "^20.12.12",
    "esbuild": "^0.20.2",
    "tsx": "^4.7.3",
    "typescript": "^5.4.5"
  }
}
```

---

#### 6. `amplify/functions/approve-speaker-application/resource.ts`
```typescript
import { defineFunction } from '@aws-amplify/backend';

export const approveSpeakerApplication = defineFunction({
  name: 'approve-speaker-application',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
});
```

---

#### 7. `amplify/functions/approve-speaker-application/handler.ts`
**Propósito:** Lambda que aprueba automáticamente después de 5 minutos

**Trigger:** EventBridge Scheduler (one-time, after 5 min delay)

**Flujo completo:**
```typescript
import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const sesClient = new SESClient({ region: 'us-east-1' });

// Tipo del evento que envía EventBridge Scheduler
interface ApprovalEvent {
  applicationId: string;
  userId: string;
  userEmail: string;
}

export const handler: Handler<ApprovalEvent> = async (event) => {
  const { applicationId, userId, userEmail } = event;
  
  console.log('🎉 Approve Speaker Application Lambda iniciada');
  console.log('📋 Application ID:', applicationId);
  console.log('👤 User ID:', userId);

  try {
    // ========================================
    // PASO 1: OBTENER APLICACIÓN DE DYNAMODB
    // ========================================
    
    const getCommand = new GetCommand({
      TableName: process.env.SPEAKER_APPLICATION_TABLE!,
      Key: { id: applicationId },
    });

    const getResult = await docClient.send(getCommand);
    const application = getResult.Item;

    if (!application) {
      console.error('❌ Aplicación no encontrada:', applicationId);
      return { success: false, error: 'Application not found' };
    }

    console.log('📖 Aplicación encontrada:', application);

    // Verificar que no esté ya aprobada
    if (application.status === 'APPROVED') {
      console.log('⚠️ Aplicación ya estaba aprobada, saliendo...');
      return { success: true, message: 'Already approved' };
    }

    // ========================================
    // PASO 2: ACTUALIZAR STATUS EN DYNAMODB
    // ========================================
    
    console.log('📝 Actualizando estado a APPROVED...');

    const updateCommand = new UpdateCommand({
      TableName: process.env.SPEAKER_APPLICATION_TABLE!,
      Key: { id: applicationId },
      UpdateExpression: 'SET #status = :approved, reviewedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':approved': 'APPROVED',
        ':now': new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);
    console.log('✅ Estado actualizado en DynamoDB');

    // ========================================
    // PASO 3: AGREGAR AL GRUPO SPEAKERS EN COGNITO
    // ========================================
    
    console.log(`👤 Agregando usuario ${userId} al grupo SPEAKERS...`);

    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: userId, // google_102417110559256792690
      GroupName: 'SPEAKERS',
    });

    await cognitoClient.send(addToGroupCommand);
    console.log('✅ Usuario agregado al grupo SPEAKERS en Cognito');

    // ========================================
    // PASO 4: ENVIAR EMAIL DE APROBACIÓN
    // ========================================
    
    console.log(`📧 Enviando email de aprobación a: ${userEmail}`);

    await sendApprovalEmail(userEmail, userEmail.split('@')[0]);
    console.log('✅ Email de aprobación enviado correctamente');

    return {
      success: true,
      applicationId,
      userId,
      message: 'Speaker approved successfully',
    };

  } catch (error) {
    console.error('❌ Error aprobando aplicación:', error);
    throw error; // Lanzar para que CloudWatch lo registre
  }
};

// ========================================
// FUNCIÓN AUXILIAR: ENVIAR EMAIL DE APROBACIÓN
// ========================================

async function sendApprovalEmail(email: string, name: string) {
  const emailCommand = new SendEmailCommand({
    Source: process.env.SENDER_EMAIL!,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: '🎉 ¡Tu postulación como Speaker ha sido APROBADA!',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #FF9900; font-size: 36px;">🎉</h1>
                    <h1 style="color: #232F3E; margin: 10px 0;">¡Felicidades ${name}!</h1>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%); 
                              padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="color: white; font-size: 20px; font-weight: bold; margin: 0;">
                      ✅ POSTULACIÓN APROBADA
                    </p>
                    <p style="color: white; font-size: 16px; margin: 10px 0 0 0;">
                      Ahora eres Speaker oficial de AWS User Group Puebla
                    </p>
                  </div>

                  <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #232F3E; margin-top: 0;">📋 Próximos pasos:</h3>
                    <ul style="color: #333; line-height: 1.8;">
                      <li>Tu perfil ahora muestra el badge <strong>SPEAKER</strong></li>
                      <li>Puedes proponer temas para próximos eventos</li>
                      <li>Recibirás invitaciones para participar como ponente</li>
                      <li>Únete a nuestro canal de Slack para coordinación</li>
                    </ul>
                  </div>

                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      <strong>💡 Tip:</strong> Actualiza tu perfil con tus redes sociales 
                      para que la comunidad pueda seguirte.
                    </p>
                  </div>

                  <p style="font-size: 14px; color: #999; margin-top: 30px;">
                    ¡Gracias por formar parte de nuestra comunidad!<br>
                    <strong>AWS User Group Puebla</strong>
                  </p>
                </div>
              </body>
            </html>
          `,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(emailCommand);
}
```

**Variables de entorno requeridas:**
- `SPEAKER_APPLICATION_TABLE`: Nombre de la tabla DynamoDB
- `USER_POOL_ID`: ID del Cognito User Pool
- `SENDER_EMAIL`: Email verificado en SES

**Permisos IAM necesarios:**
- ✅ `dynamodb:GetItem` → Leer aplicación
- ✅ `dynamodb:UpdateItem` → Actualizar status
- ✅ `cognito-idp:AdminAddUserToGroup` → Agregar a grupo
- ✅ `ses:SendEmail` → Enviar email

**CloudWatch Logs:**
- Log Group: `/aws/lambda/amplify-awsug-{hash}-approvespeakerapplicatio-{id}`
- Buscar: "🎉 Approve Speaker", "✅ Estado actualizado", "✅ Usuario agregado"

---

#### 8. `amplify/functions/approve-speaker-application/package.json`
```json
{
  "name": "approve-speaker-application",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.600.0",
    "@aws-sdk/client-ses": "^3.600.0",
    "aws-lambda": "^1.0.7"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.138",
    "@types/node": "^20.12.12",
    "esbuild": "^0.20.2",
    "tsx": "^4.7.3",
    "typescript": "^5.4.5"
  }
}
```

---

### **Frontend - React Components**

#### 9. `src/components/speaker/UnifiedSpeakerProposalForm.tsx`
**Propósito:** Formulario unificado para aplicación de speaker con propuesta de charla

**Funcionalidad:**
```typescript
'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function UnifiedSpeakerProposalForm({ userId, userEmail, userName }: Props) {
  // Email de contacto editable (puede diferir del email principal del usuario)
  const [formData, setFormData] = useState({
    email: userEmail, // Pre-filled but editable for contact preferences
    // ... otros campos
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Filtrar campos vacíos
      const validTopics = topics.filter(t => t.trim());
      const validLinks = previousTalksLinks.filter(l => l.trim());

      // Validación básica
      if (!motivation.trim()) {
        throw new Error('La motivación es requerida');
      }
      if (validTopics.length === 0) {
        throw new Error('Debes agregar al menos un tema');
      }

      // ========================================
      // GRAPHQL MUTATION → DYNAMODB
      // ========================================
      
      const result = await client.models.SpeakerApplication.create({
        userId,
        email: userEmail,
        motivation: motivation.trim(),
        topics: validTopics,
        experience: experience.trim() || undefined,
        previousTalksLinks: validLinks.length > 0 ? validLinks : undefined,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      });

      if (result.data) {
        console.log('✅ Postulación enviada:', result.data.id);
        setSuccess(true);
        
        // Limpiar formulario
        setMotivation('');
        setTopics(['']);
        setExperience('');
        setPreviousTalksLinks(['']);
      } else {
        throw new Error(result.errors?.[0]?.message || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('❌ Error enviando postulación:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // UI con múltiples inputs para topics y links
  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
    </form>
  );
}
```

**Integración con AppSync:**
- Usa `generateClient<Schema>()` de Amplify
- Mutation: `client.models.SpeakerApplication.create()`
- Automáticamente se guarda en DynamoDB con auth del usuario

---

#### 10. `src/components/profile/SpeakerApplicationStatus.tsx`
**Propósito:** Mostrar estado de postulación existente

**Funcionalidad:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function SpeakerApplicationStatus({ userId }: Props) {
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplication();
  }, [userId]);

  const loadApplication = async () => {
    try {
      // ========================================
      // QUERY GRAPHQL POR USUARIO
      // ========================================
      
      const result = await client.models.SpeakerApplication.applicationsByUser({
        userId,
      }, {
        sortDirection: 'DESC', // Más reciente primero
        limit: 1,
      });

      if (result.data && result.data.length > 0) {
        setApplication(result.data[0]);
      }
    } catch (error) {
      console.error('Error cargando aplicación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar badge según status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">🔄 Pendiente</Badge>;
      case 'APPROVED':
        return <Badge variant="success">✅ Aprobada</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">❌ Rechazada</Badge>;
    }
  };

  return (
    <Card>
      {application ? (
        <>
          {getStatusBadge(application.status)}
          {/* Mostrar detalles de la aplicación */}
        </>
      ) : (
        <p>No tienes postulaciones activas</p>
      )}
    </Card>
  );
}
```

**Integración con AppSync:**
- Query: `client.models.SpeakerApplication.applicationsByUser()`
- Usa el GSI `userId-submittedAt-index` automáticamente
- Ordenado por fecha (más reciente primero)

---

#### 11. `src/app/profile/page.tsx`
**Propósito:** Página de perfil que integra ambos componentes

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';
import SpeakerApplicationForm from '@/components/profile/SpeakerApplicationForm';
import SpeakerApplicationStatus from '@/components/profile/SpeakerApplicationStatus';

export default function ProfilePage() {
  const { user, userGroups } = useAuth();

  // Mostrar badge si ya es SPEAKER
  const isSpeaker = userGroups.includes('SPEAKERS');

  return (
    <div>
      {/* Perfil info */}
      
      {/* Mostrar badge si es speaker */}
      {isSpeaker && (
        <Badge variant="success">🎤 SPEAKER</Badge>
      )}

      {/* Sección de postulación (solo si NO es speaker) */}
      {!isSpeaker && (
        <section>
          <h2>🎤 Conviértete en Speaker</h2>
          
          {/* Verificar si ya tiene postulación */}
          <SpeakerApplicationStatus userId={user.userId} />
          
          {/* Formulario para nueva postulación */}
          <SpeakerApplicationForm 
            userId={user.userId} 
            userEmail={user.signInDetails?.loginId || ''} 
          />
        </section>
      )}
    </div>
  );
}
```

---

## 🔄 Flujo Detallado Paso a Paso

### **Paso 1: Usuario llena el formulario** (Frontend)

1. Usuario accede a `/profile`
2. Ve sección "🎤 Conviértete en Speaker"
3. Llena campos:
   - ✏️ Motivación (textarea, requerido)
   - 🏷️ Temas (array de inputs, mínimo 1)
   - 📚 Experiencia (textarea, opcional)
   - 🔗 Links (array de inputs, opcional)
4. Click en "Enviar Postulación"

---

### **Paso 2: GraphQL Mutation → DynamoDB** (AppSync)

```graphql
mutation CreateSpeakerApplication {
  createSpeakerApplication(input: {
    userId: "google_102417110559256792690"
    email: "2311080254@alumno.utpuebla.edu.mx"
    motivation: "Quiero compartir conocimiento..."
    topics: ["Lambda", "Serverless"]
    status: PENDING
    submittedAt: "2024-11-24T18:30:00.000Z"
  }) {
    id
    status
  }
}
```

**Resultado:**
- ✅ Nuevo registro en DynamoDB tabla `SpeakerApplication`
- ✅ ID auto-generado (UUID)
- ✅ `status: "PENDING"`
- ✅ `submittedAt: timestamp`

---

### **Paso 3: DynamoDB Stream Event** (Automático)

DynamoDB detecta nuevo registro y envía evento al stream:

```json
{
  "eventName": "INSERT",
  "dynamodb": {
    "NewImage": {
      "id": { "S": "abc123..." },
      "userId": { "S": "google_102417110559256792690" },
      "email": { "S": "2311080254@alumno.utpuebla.edu.mx" },
      "motivation": { "S": "Quiero compartir..." },
      "topics": { "L": [{"S": "Lambda"}, {"S": "Serverless"}] },
      "status": { "S": "PENDING" },
      "submittedAt": { "S": "2024-11-24T18:30:00.000Z" }
    }
  }
}
```

**Event Source Mapping:**
- Batch size: 10 records
- Batching window: 5 seconds
- Starting position: LATEST

Stream invoca Lambda [`process-speaker-application`](node_modules/@types/node/globals.d.ts ).

---

### **Paso 4: Lambda procesa nueva aplicación** (process-speaker-application)

**Duración: ~2-3 segundos**

```
📋 Procesando aplicación: abc123...
👤 Usuario: google_102417110559256792690 (2311080254@alumno.utpuebla.edu.mx)

📧 Enviando email de confirmación...
✅ Email de confirmación enviado

⏰ Calculando hora de aprobación...
   Ahora: 2024-11-24T18:30:00.000Z
   Aprobación: 2024-11-24T18:35:00.000Z (+ 5 minutos)

📅 Creando EventBridge Schedule...
   Nombre: approve-speaker-abc123...
   Expression: at(2024-11-24T18:35:00)
   Target: arn:aws:lambda:...:function:approve-speaker-application
   
✅ Schedule creado: arn:aws:scheduler:.../approve-speaker-abc123
```

**Resultado:**
- ✅ Email #1 enviado (SES)
- ✅ EventBridge Schedule creado
- ✅ Schedule configurado para ejecutar en 5 minutos
- ✅ ActionAfterCompletion: DELETE (auto-limpieza)

---

### **Paso 5: Usuario recibe email #1** (SES → Email)

**Asunto:** ✅ Tu postulación como Speaker ha sido recibida

**Contenido:**
```
🎤 ¡Hola 2311080254!

Hemos recibido tu postulación para convertirte en Speaker de
AWS User Group Puebla.

Tu solicitud está siendo procesada automáticamente.
Recibirás un correo de confirmación en los próximos minutos.

┌─────────────────────────────┐
│ Estado: 🔄 En revisión      │
│ Tiempo estimado: 5 minutos  │
└─────────────────────────────┘

Saludos,
AWS User Group Puebla
```

**Timeline:** ⏱️ Llega en 1-2 segundos después del submit

---

### **Paso 6: Espera de 5 minutos** ⏳ (EventBridge Scheduler)

EventBridge Scheduler espera hasta la hora programada:
- Schedule Name: `approve-speaker-abc123...`
- State: `ENABLED`
- Expression: `at(2024-11-24T18:35:00)`
- Flexible Window: `OFF` (ejecución exacta)

```
🕐 18:30:00 → Schedule creado
🕑 18:31:00 → Esperando...
🕒 18:32:00 → Esperando...
🕓 18:33:00 → Esperando...
🕔 18:34:00 → Esperando...
🕕 18:35:00 → ¡EJECUTAR!
```

---

### **Paso 7: EventBridge ejecuta Lambda** (approve-speaker-application)

**Trigger:** EventBridge Scheduler (one-time execution)

**Payload del evento:**
```json
{
  "applicationId": "abc123...",
  "userId": "google_102417110559256792690",
  "userEmail": "2311080254@alumno.utpuebla.edu.mx"
}
```

**Ejecución de la Lambda:**
```
🎉 Approve Speaker Application Lambda iniciada
📋 Application ID: abc123...
👤 User ID: google_102417110559256792690

📖 Obteniendo aplicación de DynamoDB...
✅ Aplicación encontrada

📝 Actualizando estado a APPROVED...
   SET status = 'APPROVED'
   SET reviewedAt = '2024-11-24T18:35:00.000Z'
✅ Estado actualizado en DynamoDB

👤 Agregando usuario al grupo SPEAKERS en Cognito...
   User Pool: us-east-1_CFlWpHKxh
   Username: google_102417110559256792690
   Group: SPEAKERS
✅ Usuario agregado al grupo SPEAKERS

📧 Enviando email de aprobación...
✅ Email de aprobación enviado correctamente

🎊 Proceso completado exitosamente
```

**Resultado:**
- ✅ DynamoDB actualizado: `status: "APPROVED"`, `reviewedAt: timestamp`
- ✅ Usuario en grupo SPEAKERS (Cognito)
- ✅ Email #2 enviado (SES)
- ✅ Schedule auto-eliminado (ActionAfterCompletion: DELETE)

---

### **Paso 8: Usuario recibe email #2** (SES → Email)

**Asunto:** 🎉 ¡Tu postulación como Speaker ha sido APROBADA!

**Contenido:**
```
🎉
¡Felicidades 2311080254!

┌──────────────────────────────────────┐
│  ✅ POSTULACIÓN APROBADA             │
│  Ahora eres Speaker oficial de       │
│  AWS User Group Puebla               │
└──────────────────────────────────────┘

📋 Próximos pasos:
  • Tu perfil ahora muestra el badge SPEAKER
  • Puedes proponer temas para próximos eventos
  • Recibirás invitaciones para participar como ponente
  • Únete a nuestro canal de Slack para coordinación

💡 Tip: Actualiza tu perfil con tus redes sociales
para que la comunidad pueda seguirte.

¡Gracias por formar parte de nuestra comunidad!
AWS User Group Puebla
```

**Timeline:** ⏱️ Llega exactamente 5 minutos después del email #1

---

### **Paso 9: Usuario refresca perfil** (Frontend)

1. Usuario hace refresh en `/profile` (F5 o Ctrl+R)
2. `useAuth()` re-fetcha grupos de Cognito
3. Detecta grupo `SPEAKERS` en la respuesta
4. UI actualiza:
   ```tsx
   {userGroups.includes('SPEAKERS') && (
     <Badge variant="success">🎤 SPEAKER</Badge>
   )}
   ```

**Resultado visible:**
- ✅ Badge "🎤 SPEAKER" aparece en el perfil
- ✅ Sección de postulación se oculta (ya es speaker)
- ✅ `SpeakerApplicationStatus` muestra "✅ Aprobada"

---

## 📊 Monitoreo y Debugging

### **CloudWatch Logs**

#### Lambda de procesamiento:
```powershell
aws logs tail /aws/lambda/amplify-awsug-{hash}-processspeakerapplicatio-{id} --follow
```

**Buscar:**
- ✅ "📋 Procesando aplicación"
- ✅ "✅ Email de confirmación enviado"
- ✅ "✅ Schedule creado"
- ❌ "❌ Error procesando aplicación"

#### Lambda de aprobación:
```powershell
aws logs tail /aws/lambda/amplify-awsug-{hash}-approvespeakerapplicatio-{id} --follow
```

**Buscar:**
- ✅ "🎉 Approve Speaker Application Lambda iniciada"
- ✅ "✅ Estado actualizado en DynamoDB"
- ✅ "✅ Usuario agregado al grupo SPEAKERS"
- ✅ "✅ Email de aprobación enviado"
- ❌ "❌ Error aprobando aplicación"

---

### **DynamoDB Queries**

#### Ver aplicación por ID:
```powershell
aws dynamodb get-item `
  --table-name SpeakerApplication-{hash}-SANDBOX `
  --key '{"id":{"S":"abc123..."}}'
```

#### Ver aplicaciones por usuario:
```powershell
aws dynamodb query `
  --table-name SpeakerApplication-{hash}-SANDBOX `
  --index-name userId-submittedAt-index `
  --key-condition-expression "userId = :userId" `
  --expression-attribute-values '{":userId":{"S":"google_102417110559256792690"}}'
```

---

### **Cognito Queries**

#### Ver grupos del usuario:
```powershell
aws cognito-idp admin-list-groups-for-user `
  --user-pool-id us-east-1_CFlWpHKxh `
  --username google_102417110559256792690
```

**Resultado esperado:**
```json
{
  "Groups": [
    {
      "GroupName": "MEMBERS",
      "UserPoolId": "us-east-1_CFlWpHKxh",
      "CreationDate": "2024-11-23T10:00:00.000Z"
    },
    {
      "GroupName": "SPEAKERS",
      "UserPoolId": "us-east-1_CFlWpHKxh",
      "CreationDate": "2024-11-24T18:35:00.000Z"
    }
  ]
}
```

---

### **EventBridge Scheduler**

#### Listar schedules activos:
```powershell
aws scheduler list-schedules --name-prefix approve-speaker
```

#### Ver schedule específico:
```powershell
aws scheduler get-schedule --name approve-speaker-abc123...
```

**Resultado:**
```json
{
  "Name": "approve-speaker-abc123...",
  "State": "ENABLED",
  "ScheduleExpression": "at(2024-11-24T18:35:00)",
  "Target": {
    "Arn": "arn:aws:lambda:...:function:approve-speaker-application",
    "RoleArn": "arn:aws:iam:...role/EventBridgeSchedulerToLambdaRole-...",
    "Input": "{\"applicationId\":\"abc123...\",\"userId\":\"google_102417110559256792690\"}"
  },
  "ActionAfterCompletion": "DELETE"
}
```

---

### **Amazon SES**

#### Verificar identidades verificadas:
```powershell
aws sesv2 list-email-identities
```

#### Ver estadísticas de envío:
```powershell
aws sesv2 get-account
```

---

## 🐛 Troubleshooting Común

### ❌ **Error: "Email address is not verified"**

**Causa:** Email no verificado en SES (Sandbox mode)

**Solución:**
```powershell
# Verificar email del usuario
aws ses verify-email-identity --email-address usuario@dominio.com

# O cambiar SENDER_EMAIL a un email ya verificado en backend.ts
```

---

### ❌ **Error: "AccessDeniedException: User is not authorized to perform: scheduler:CreateSchedule"**

**Causa:** Lambda no tiene permiso para crear schedules

**Solución:**
```typescript
// Verificar en amplify/backend.ts:
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule'],
    resources: ['*'],
  })
);
```

---

### ❌ **Error: "AccessDeniedException: User is not authorized to perform: iam:PassRole"**

**Causa:** Lambda no puede pasar role a EventBridge Scheduler

**Solución:**
```typescript
// Verificar en amplify/backend.ts:
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['iam:PassRole'],
    resources: ['arn:aws:iam::*:role/EventBridgeSchedulerToLambdaRole-*'],
  })
);
```

---

### ❌ **Error: "User not approved after 5 minutes"**

**Causa:** Schedule no se creó o falló la ejecución

**Diagnóstico:**
```powershell
# 1. Verificar que schedule se creó
aws scheduler list-schedules --name-prefix approve-speaker

# 2. Ver logs de approve Lambda
aws logs tail /aws/lambda/amplify-awsug-{hash}-approvespeakerapplicatio-{id} --since 10m

# 3. Verificar SCHEDULER_ROLE_ARN en env vars
aws lambda get-function-configuration --function-name process-speaker-application
```

---

### ❌ **Error: "Stream trigger not firing"**

**Causa:** DynamoDB Stream no conectado a Lambda

**Solución:**
```powershell
# Verificar Event Source Mapping
aws lambda list-event-source-mappings --function-name process-speaker-application

# Si no existe, ejecutar:
.\scripts\post-deploy-setup.ps1
```

---

## 📝 Resumen de Archivos

| Archivo | Tipo | Propósito | LOC |
|---------|------|-----------|-----|
| `amplify/backend.ts` | Config | Infraestructura, permisos, env vars | ~200 |
| `amplify/data/resource.ts` | Schema | Modelo GraphQL/DynamoDB | ~50 |
| `amplify/functions/process-speaker-application/handler.ts` | Lambda | Procesar nueva postulación | ~150 |
| `amplify/functions/approve-speaker-application/handler.ts` | Lambda | Aprobar automáticamente | ~180 |
| `src/components/speaker/UnifiedSpeakerProposalForm.tsx` | React | Formulario unificado de aplicación | ~800 |
| `src/components/profile/SpeakerApplicationStatus.tsx` | React | Mostrar estado | ~200 |
| `src/app/profile/page.tsx` | Next.js | Página de perfil | ~250 |
| `scripts/post-deploy-setup.ps1` | Script | Conectar Stream trigger | ~100 |

**Total:** ~1,430 líneas de código

---

## 🎯 Puntos Clave

1. **99% IaC:** Todo se deploya con `npx ampx sandbox` excepto DynamoDB Stream trigger
2. **Auto-limpieza:** EventBridge Schedules se eliminan automáticamente después de ejecutar
3. **Emails:** Se envían 2 emails automáticos (confirmación inmediata, aprobación a los 5 min)
4. **Seguridad:** Permisos IAM específicos por Lambda, autenticación via Cognito
5. **Email de contacto:** El formulario permite editar el email para notificaciones de speaker (independiente del email principal del usuario)
5. **Escalable:** Soporta múltiples postulaciones simultáneas sin conflictos
6. **Monitoreable:** CloudWatch Logs detallados con emojis para debugging fácil
7. **Testing:** Frontend y backend funcionan independientemente

---

## 📚 Recursos Adicionales

- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/nextjs/)
- [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/Welcome.html)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Amazon Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)

---

**Última actualización:** 24 de noviembre de 2024  
**Versión:** 1.0.0  
**Autor:** AWS User Group Puebla Team
