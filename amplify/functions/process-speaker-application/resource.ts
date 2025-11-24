import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda: Process Speaker Application
 * 
 * PROPÓSITO:
 * - Se ejecuta cuando se crea una nueva SpeakerApplication
 * - Envía email de confirmación "Solicitud Recibida"
 * - Programa auto-aprobación usando EventBridge Scheduler
 * 
 * TRIGGER: DynamoDB Stream (onCreate SpeakerApplication)
 * 
 * PERMISOS NECESARIOS:
 * - SES: SendEmail
 * - EventBridge Scheduler: CreateSchedule
 * - Lambda: InvokeFunction (para la Lambda de aprobación)
 */
export const processSpeakerApplication = defineFunction({
  name: 'process-speaker-application',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data', // Parte del stack de data para acceder a DynamoDB
});
