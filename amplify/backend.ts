import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { processSpeakerApplication } from './functions/process-speaker-application/resource';
import { approveSpeakerApplication } from './functions/approve-speaker-application/resource';
import { manualApproveSpeaker } from './functions/manual-approve-speaker/resource';
import { rejectSpeakerApplication } from './functions/reject-speaker-application/resource';
import { PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

const backend = defineBackend({
  auth,
  data,
  processSpeakerApplication,
  approveSpeakerApplication,
  manualApproveSpeaker,
  rejectSpeakerApplication,
});

// 🎤 SPEAKER APPLICATION WORKFLOW: Configuración de permisos

// Lambda 1: Process Speaker Application
// - Necesita enviar emails via SES
// - Necesita crear schedules en EventBridge
// - Necesita leer DynamoDB Streams
backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'], // SES requiere * o ARN específico del dominio
  })
);

backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetRecords',
      'dynamodb:GetShardIterator',
      'dynamodb:DescribeStream',
      'dynamodb:ListStreams',
    ],
    resources: [`arn:aws:dynamodb:${backend.auth.resources.userPool.stack.region}:${backend.auth.resources.userPool.stack.account}:table/SpeakerApplication-*/stream/*`],
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
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:ListTables', // Necesario para encontrar la tabla dinámicamente
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      `arn:aws:dynamodb:*:*:table/User-*`,
      '*', // ListTables requiere acceso global
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
  'fortino.romero.man@gmail.com' // Cambiar cuando configures SES
);

backend.approveSpeakerApplication.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);

backend.approveSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'fortino.romero.man@gmail.com' // Cambiar cuando configures SES
);

// 🎯 CONFIGURACIÓN AVANZADA CON CDK (100% IaC)

// 1️⃣ Crear IAM Role para EventBridge Scheduler
// Este role permite que Scheduler invoque la Lambda de aprobación
// ⚠️ IMPORTANTE: Crear en el MISMO stack que la Lambda (auth)
const schedulerRole = new Role(
  backend.approveSpeakerApplication.resources.lambda.stack,
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

// 2️⃣ Obtener acceso a las tablas de DynamoDB
// Amplify Data crea las tablas dinámicamente
// El nombre real será: SpeakerApplication-{hash}-{environment}
// La Lambda lo obtendrá dinámicamente listando tablas con ese prefijo
backend.approveSpeakerApplication.addEnvironment(
  'SPEAKER_APPLICATION_TABLE_PREFIX',
  'SpeakerApplication'
);

// Lambda 3: Manual Approve Speaker (Admin Panel)
// - Necesita actualizar DynamoDB
// - Necesita agregar usuarios a grupos de Cognito
// - Necesita enviar emails via SES
// - Necesita cancelar schedules de EventBridge
backend.manualApproveSpeaker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:UpdateItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:ListTables',
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      `arn:aws:dynamodb:*:*:table/User-*`,
      '*',
    ],
  })
);

backend.manualApproveSpeaker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminGetUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

backend.manualApproveSpeaker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

backend.manualApproveSpeaker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'scheduler:DeleteSchedule',
      'scheduler:GetSchedule',
    ],
    resources: ['*'],
  })
);

backend.manualApproveSpeaker.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);

backend.manualApproveSpeaker.addEnvironment(
  'SENDER_EMAIL',
  'fortino.romero.man@gmail.com'
);

backend.manualApproveSpeaker.addEnvironment(
  'SPEAKER_APPLICATION_TABLE_PREFIX',
  'SpeakerApplication'
);

// Lambda 4: Reject Speaker Application (Admin Panel)
// - Necesita actualizar DynamoDB
// - Necesita enviar emails via SES
// - Necesita cancelar schedules de EventBridge
backend.rejectSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:UpdateItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:ListTables',
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      '*',
    ],
  })
);

backend.rejectSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

backend.rejectSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'scheduler:DeleteSchedule',
      'scheduler:GetSchedule',
    ],
    resources: ['*'],
  })
);

backend.rejectSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'fortino.romero.man@gmail.com'
);

backend.rejectSpeakerApplication.addEnvironment(
  'SPEAKER_APPLICATION_TABLE_PREFIX',
  'SpeakerApplication'
);

// 🌐 PERMISOS PARA API ROUTES (Admin Panel)
// Las API routes necesitan invocar las Lambdas de admin
// Esto se aplica al rol de Amplify Auth authenticated
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [
      backend.manualApproveSpeaker.resources.lambda.functionArn,
      backend.rejectSpeakerApplication.resources.lambda.functionArn,
    ],
  })
);

console.log('✅ Permisos de invocación Lambda agregados para API routes');

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
