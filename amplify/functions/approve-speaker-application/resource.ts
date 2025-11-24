import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda: Approve Speaker Application
 * 
 * PROPÓSITO:
 * - Auto-aprobar aplicaciones de speaker después del delay
 * - Actualizar estado en DynamoDB a APPROVED
 * - Agregar usuario al grupo SPEAKERS en Cognito
 * - Enviar email de aprobación
 * 
 * TRIGGER: EventBridge Scheduler (programado por process-speaker-application)
 * 
 * PERMISOS NECESARIOS:
 * - DynamoDB: UpdateItem
 * - Cognito: AdminAddUserToGroup
 * - SES: SendEmail
 */
export const approveSpeakerApplication = defineFunction({
  name: 'approve-speaker-application',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'auth', // Parte del stack de auth para acceder a Cognito
});
