import { defineFunction } from '@aws-amplify/backend';

export const notifyAdminsNewProposal = defineFunction({
  name: 'notify-admins-new-proposal',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'auth', // Asignar a auth porque usa Cognito ListUsersInGroup
});
