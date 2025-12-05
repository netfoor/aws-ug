import { defineFunction } from '@aws-amplify/backend';

export const createEventFromProposal = defineFunction({
  name: 'create-event-from-proposal',
  entry: './handler.ts',
});
