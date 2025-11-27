import { defineFunction } from '@aws-amplify/backend';

export const manualApproveSpeaker = defineFunction({
  name: 'manual-approve-speaker',
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: 'auth', // Asignar al stack de auth porque usa Cognito
});
