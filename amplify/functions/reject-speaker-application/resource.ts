import { defineFunction } from '@aws-amplify/backend';

export const rejectSpeakerApplication = defineFunction({
  name: 'reject-speaker-application',
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: 'auth', // Mover a auth porque authenticatedUserIamRole necesita acceso
});
