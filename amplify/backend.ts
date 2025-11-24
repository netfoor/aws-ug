import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { processSpeakerApplication } from './functions/process-speaker-application/resource';
import { approveSpeakerApplication } from './functions/approve-speaker-application/resource';
import { PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

const backend = defineBackend({
  auth,
  data,
  processSpeakerApplication,
  approveSpeakerApplication,
});

// 🎤 SPEAKER APPLICATION WORKFLOW: Configuración de permisos

// Lambda 1: Process Speaker Application
// - Necesita enviar emails via SES
// - Necesita crear schedules en EventBridge
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'], // SES requiere * o ARN específico del dominio
  })
);

backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'scheduler:CreateSchedule',
      'scheduler:GetSchedule',
      'scheduler:DeleteSchedule',
    ],
    resources: ['*'], // EventBridge Scheduler
  })
);

backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['iam:PassRole'],
    resources: ['*'], // Necesario para crear schedules con rol de ejecución
  })
);

// Lambda 2: Approve Speaker Application
// - Necesita actualizar DynamoDB
// - Necesita agregar usuarios a grupos de Cognito
// - Necesita enviar emails via SES
backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:UpdateItem',
      'dynamodb:GetItem',
    ],
    resources: [
      `arn:aws:dynamodb:${backend.auth.resources.userPool.stack.region}:${backend.auth.resources.userPool.stack.account}:table/SpeakerApplication-*`,
    ],
  })
);

backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminGetUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

backend.approveSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

// 📝 Variables de entorno para las Lambdas
backend.processSpeakerApplication.addEnvironment(
  'APPROVE_LAMBDA_ARN',
  backend.approveSpeakerApplication.resources.lambda.functionArn
);

backend.processSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'noreply@awspuebla.com' // Cambiar cuando configures SES
);

backend.approveSpeakerApplication.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);

backend.approveSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'noreply@awspuebla.com' // Cambiar cuando configures SES
);

// 🎯 CONFIGURACIÓN AVANZADA CON CDK (100% IaC)

// 1️⃣ Crear IAM Role para EventBridge Scheduler
// Este role permite que Scheduler invoque la Lambda de aprobación
const schedulerRole = new Role(
  backend.createStack('speaker-workflow-stack'),
  'SchedulerInvokeLambdaRole',
  {
    assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
    description: 'Role para EventBridge Scheduler invocar Lambda de aprobación de speakers',
  }
);

// Dar permiso para invocar la Lambda de aprobación
schedulerRole.addToPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [backend.approveSpeakerApplication.resources.lambda.functionArn],
  })
);

// Agregar el ARN del role a las variables de entorno
backend.processSpeakerApplication.addEnvironment(
  'SCHEDULER_ROLE_ARN',
  schedulerRole.roleArn
);

// 2️⃣ Obtener la tabla de DynamoDB para conectar Stream
// Amplify Data crea las tablas dinámicamente, necesitamos acceder vía CDK
const dataStack = backend.data.resources.cfnResources;

// Buscar la tabla SpeakerApplication en los recursos generados
// Nota: Amplify Gen 2 aún no expone directamente las tablas individuales
// Por ahora, agregamos el nombre de tabla como env var
backend.approveSpeakerApplication.addEnvironment(
  'SPEAKER_APPLICATION_TABLE',
  'SpeakerApplication' // Amplify lo resolve automáticamente
);

// 3️⃣ IMPORTANTE: DynamoDB Stream Trigger
// ⚠️ LIMITACIÓN DE AMPLIFY GEN 2:
// - Amplify Data NO expone streams de tablas individuales en defineData
// - DynamoEventSource requiere acceso al objeto Table de CDK
// - Las tablas son generadas dinámicamente por Amplify y no son accesibles directamente
//
// SOLUCIÓN TEMPORAL (hasta que Amplify Gen 2 soporte esto):
// Después del primer deploy, conectar manualmente UNA SOLA VEZ:
//
// aws lambda create-event-source-mapping \
//   --function-name <process-lambda-name> \
//   --event-source-arn <dynamodb-stream-arn> \
//   --starting-position LATEST \
//   --batch-size 10
//
// Este mapping SÍ se limpia automáticamente cuando borras la Lambda o la tabla.
// NO queda huérfano porque está vinculado a recursos de Amplify.

console.log('✅ Speaker Application Workflow configurado (IaC)');
console.log('⚠️  Recuerda: DynamoDB Stream trigger requiere configuración manual una sola vez');
console.log('   Ver: scripts/README.md para instrucciones');
