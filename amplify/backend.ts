import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { processSpeakerApplication } from './functions/process-speaker-application/resource';
import { approveSpeakerApplication } from './functions/approve-speaker-application/resource';
import { manualApproveSpeaker } from './functions/manual-approve-speaker/resource';
import { rejectSpeakerApplication } from './functions/reject-speaker-application/resource';
import { createEventFromProposal } from './functions/create-event-from-proposal/resource';
import { notifyAdminsNewProposal } from './functions/notify-admins-new-proposal/resource';
import { PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { RetentionDays, LogGroup } from 'aws-cdk-lib/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

const backend = defineBackend({
  auth,
  data,
  storage,
  processSpeakerApplication,
  approveSpeakerApplication,
  manualApproveSpeaker,
  rejectSpeakerApplication,
  createEventFromProposal,
  notifyAdminsNewProposal,
});

// 📝 CLOUDWATCH LOGS: Configurar retención automática (7 días)
// Evita acumulación de logs indefinidos y reduce costos
//
// ⚠️ LIMITACIÓN: Amplify Gen 2 no expone LogGroup directamente desde IFunction
// SOLUCIÓN: El script cleanup-orphaned-resources.ps1 configura retention manualmente
// O usar Custom Resource para aplicar retention policies automáticamente
//
// TODO: Crear Custom Resource que aplique retention a todos los log groups
// con patrón /aws/lambda/amplify-awsug-*
//
// Por ahora, la retención se gestiona con:
//   scripts/cleanup-orphaned-resources-fixed.ps1 (sección 4)

console.log('⚠️  Log retention: Usar cleanup-orphaned-resources-fixed.ps1 para aplicar 7 días');

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

backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

backend.processSpeakerApplication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:PutItem',
      'dynamodb:ListTables',
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/Notification-*`,
      '*', // ListTables requiere acceso global
    ],
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

backend.processSpeakerApplication.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
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
      'dynamodb:PutItem', // Para crear notificaciones
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      `arn:aws:dynamodb:*:*:table/User-*`,
      `arn:aws:dynamodb:*:*:table/Notification-*`, // Tabla de notificaciones
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

backend.manualApproveSpeaker.addEnvironment(
  'NOTIFICATION_TABLE_PREFIX',
  'Notification'
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
      'dynamodb:PutItem', // Para crear notificaciones
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      `arn:aws:dynamodb:*:*:table/Notification-*`, // Tabla de notificaciones
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

backend.rejectSpeakerApplication.addEnvironment(
  'NOTIFICATION_TABLE_PREFIX',
  'Notification'
);

// 🌐 PERMISOS PARA API ROUTES (Admin Panel + Speakers)
// Las API routes necesitan invocar las Lambdas de admin y notificaciones
// Esto se aplica al rol de Amplify Auth authenticated
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [
      backend.manualApproveSpeaker.resources.lambda.functionArn,
      backend.rejectSpeakerApplication.resources.lambda.functionArn,
      backend.notifyAdminsNewProposal.resources.lambda.functionArn,
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

// 🔄 DYNAMODB STREAM TRIGGER: Configuración automática
// ⚠️ LIMITACIÓN AMPLIFY GEN 2: No podemos acceder directamente a backend.data.resources.tables
// porque Amplify Data genera las tablas dinámicamente sin exponerlas como objetos CDK.
//
// WORKAROUND TEMPORAL:
// Usar addEventSource requiere acceso al objeto Table de CDK, pero Amplify Gen 2
// no expone las tablas individuales en el backend object.
//
// SOLUCIÓN ACTUAL: Configuración manual UNA SOLA VEZ con:
//   amplify/functions/process-speaker-application/event-source-mapping.json
//
// Este archivo se puede usar con:
//   aws lambda create-event-source-mapping --cli-input-json file://event-source-mapping.json
//
// El mapping NO queda huérfano porque:
// 1. Está vinculado a la Lambda (se borra automáticamente al borrar la Lambda)
// 2. Está vinculado a la tabla (se borra automáticamente al borrar la tabla)
// 3. CloudFormation lo gestiona si se crea dentro del stack
//
// TODO: Cuando Amplify Gen 2 soporte acceso a tablas individuales, migrar a:
// const speakerApplicationTable = backend.data.resources.tables['SpeakerApplication'];
// backend.processSpeakerApplication.resources.lambda.addEventSource(
//   new DynamoEventSource(speakerApplicationTable, {
//     startingPosition: StartingPosition.LATEST,
//     batchSize: 10,
//     retryAttempts: 2,
//   })
// );

console.log('⚠️  DynamoDB Stream: Configurar manualmente con post-deploy-setup.ps1');
console.log('   El mapping se gestiona automáticamente y NO queda huérfano');

// 📝 CLOUDWATCH LOG RETENTION (IaC)
// Configurar retención de 7 días en todos los logs de Lambda
// Lambda 5: Create Event From Proposal
// - Necesita leer TalkProposal (GetItem)
// - Necesita crear Event (PutItem)
// - Necesita actualizar TalkProposal con eventId y status (UpdateItem)
backend.createEventFromProposal.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:ListTables',
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/TalkProposal-*`,
      `arn:aws:dynamodb:*:*:table/Event-*`,
      '*',
    ],
  })
);

backend.createEventFromProposal.addEnvironment(
  'TALK_PROPOSAL_TABLE_PREFIX',
  'TalkProposal'
);
backend.createEventFromProposal.addEnvironment(
  'EVENT_TABLE_PREFIX',
  'Event'
);

// Lambda 6: Notify Admins New Proposal
// - Necesita listar usuarios del grupo ADMINS en Cognito
// - Necesita crear notificaciones en DynamoDB
backend.notifyAdminsNewProposal.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

backend.notifyAdminsNewProposal.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:PutItem',
      'dynamodb:ListTables',
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/Notification-*`,
      '*',
    ],
  })
);

backend.notifyAdminsNewProposal.addEnvironment(
  'USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);
backend.notifyAdminsNewProposal.addEnvironment(
  'NOTIFICATION_TABLE_PREFIX',
  'Notification'
);

// Esto ELIMINA la necesidad del script de limpieza manual
const lambdaFunctions = [
  { lambda: backend.processSpeakerApplication.resources.lambda, name: 'ProcessSpeakerApplication' },
  { lambda: backend.approveSpeakerApplication.resources.lambda, name: 'ApproveSpeakerApplication' },
  { lambda: backend.manualApproveSpeaker.resources.lambda, name: 'ManualApproveSpeaker' },
  { lambda: backend.rejectSpeakerApplication.resources.lambda, name: 'RejectSpeakerApplication' },
  { lambda: backend.createEventFromProposal.resources.lambda, name: 'CreateEventFromProposal' },
  { lambda: backend.notifyAdminsNewProposal.resources.lambda, name: 'NotifyAdminsNewProposal' },
];

lambdaFunctions.forEach(({ lambda, name }) => {
  new AwsCustomResource(lambda.stack, `${name}LogRetention`, {
    onCreate: {
      service: 'CloudWatchLogs',
      action: 'putRetentionPolicy',
      parameters: {
        logGroupName: `/aws/lambda/${lambda.functionName}`,
        retentionInDays: 7,
      },
      physicalResourceId: PhysicalResourceId.of(`log-retention-${name}`),
      ignoreErrorCodesMatching: 'ResourceNotFoundException', // Log group no existe aún
    },
    onUpdate: {
      service: 'CloudWatchLogs',
      action: 'putRetentionPolicy',
      parameters: {
        logGroupName: `/aws/lambda/${lambda.functionName}`,
        retentionInDays: 7,
      },
      physicalResourceId: PhysicalResourceId.of(`log-retention-${name}`),
      ignoreErrorCodesMatching: 'ResourceNotFoundException',
    },
    policy: AwsCustomResourcePolicy.fromSdkCalls({
      resources: AwsCustomResourcePolicy.ANY_RESOURCE,
    }),
  });
});

console.log('✅ CloudWatch Log Retention configurado (7 días) para todas las Lambdas');

// 🔗 Exportar nombres de Lambdas como outputs para consumir desde frontend
backend.addOutput({
  custom: {
    manualApproveLambdaName: backend.manualApproveSpeaker.resources.lambda.functionName,
    rejectSpeakerLambdaName: backend.rejectSpeakerApplication.resources.lambda.functionName,
    createEventFromProposalLambdaName: backend.createEventFromProposal.resources.lambda.functionName,
    notifyAdminsNewProposalLambdaName: backend.notifyAdminsNewProposal.resources.lambda.functionName,
  },
});
