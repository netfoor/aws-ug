import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    id: a.id(),
    givenName: a.string(),
    familyName: a.string(),
    email: a.string(),
    phoneNumber: a.string(),
    createdAt: a.timestamp(),
    updatedAt: a.timestamp(),
  })
  .authorization((allow) => [
    allow.guest().to(['read']),
    allow.groups(['Admin', 'Speaker']).to(['create', 'update', 'delete', 'read']),
    allow.owner().to(['create', 'update', 'delete', 'read']),
  ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});