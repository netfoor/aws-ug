import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { postAuthentication } from './functions/post-authentication/resource';

import { manualApproveSpeaker } from './functions/manual-approve-speaker/resource';
import { rejectSpeakerApplication } from './functions/reject-speaker-application/resource';
import { createEventFromProposal } from './functions/create-event-from-proposal/resource';
import { notifyAdminsNewProposal } from './functions/notify-admins-new-proposal/resource';
import { PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

import { RetentionDays, LogGroup } from 'aws-cdk-lib/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

const backend = defineBackend({
  auth,
  data,
  storage,
  postAuthentication,
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

// 🔐 POST-AUTHENTICATION LAMBDA: Crear usuarios en DynamoDB
// Necesita acceso a la tabla User para crear registros en primer login
backend.postAuthentication.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:ListTables', // 🆕 Necesario para buscar tabla por prefijo
    ],
    resources: [
      `arn:aws:dynamodb:${backend.auth.resources.userPool.stack.region}:${backend.auth.resources.userPool.stack.account}:table/User-*`,
      '*', // ListTables requiere * como resource
    ],
  })
);

// Pasar prefijo de tabla como variable de entorno (la Lambda buscará la tabla completa)
backend.postAuthentication.addEnvironment(
  'USER_TABLE_PREFIX',
  'User'
);

// 🎤 SPEAKER APPLICATION WORKFLOW: Configuración de permisos
// Flujo simplificado: Frontend → DynamoDB → Admin Manual Review

// Lambda 3: Manual Approve Speaker (Admin Panel)
// - Necesita actualizar DynamoDB
// - Necesita agregar usuarios a grupos de Cognito
// - Necesita enviar emails via SES
backend.manualApproveSpeaker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:UpdateItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:ListTables',
      'dynamodb:PutItem', // Para crear notificaciones y TalkProposal
    ],
    resources: [
      `arn:aws:dynamodb:*:*:table/SpeakerApplication-*`,
      `arn:aws:dynamodb:*:*:table/User-*`,
      `arn:aws:dynamodb:*:*:table/Notification-*`, // Tabla de notificaciones
      `arn:aws:dynamodb:*:*:table/TalkProposal-*`, // 🆕 Tabla de propuestas
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

backend.manualApproveSpeaker.addEnvironment(
  'USER_TABLE_PREFIX',
  'User'
);

backend.manualApproveSpeaker.addEnvironment(
  'TALK_PROPOSAL_TABLE_PREFIX',
  'TalkProposal'
);

// Lambda 4: Reject Speaker Application (Admin Panel)
// - Necesita actualizar DynamoDB
// - Necesita enviar emails via SES
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

console.log('✅ Speaker Application Workflow configurado (Flujo simplificado)');

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
  { lambda: backend.postAuthentication.resources.lambda, name: 'PostAuthentication' },
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
