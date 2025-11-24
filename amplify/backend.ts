import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { processSpeakerApplication } from './functions/process-speaker-application/resource';
import { approveSpeakerApplication } from './functions/approve-speaker-application/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

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

// 🔗 TRIGGER: Conectar DynamoDB Stream a Lambda de procesamiento
// Necesitamos configurar el trigger manualmente porque Amplify Data no expone streams directamente
// Esto se hará mediante CDK después del deploy inicial
// Por ahora, la Lambda está lista para recibir eventos de DynamoDB Stream

// TODO: Configurar DynamoDB Stream trigger después del primer deploy
// aws lambda create-event-source-mapping --function-name <process-lambda-arn> --event-source-arn <dynamodb-stream-arn> --starting-position LATEST

backend.approveSpeakerApplication.addEnvironment(
  'SPEAKER_APPLICATION_TABLE',
  // Amplify genera el nombre de tabla dinámicamente, lo configuraremos después
  'SpeakerApplication' // Placeholder
);

console.log('✅ Speaker Application Workflow configurado');
