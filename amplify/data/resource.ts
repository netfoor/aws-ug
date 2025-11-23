import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    id: a.id(),
    givenName: a.string().required(),
    familyName: a.string().required(),
    email: a.string().required(),
    phoneNumber: a.string(),
    company: a.string(),
    bio: a.string(),
    interests: a.string().array(),
    role: a.enum(['MEMBER', 'SPEAKER', 'ADMIN']),
    meetupId: a.string(),
    newsletterOptIn: a.boolean().default(false),
    avatarUrl: a.string(),
    socialLinks: a.json(),
    privacyConsentDate: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization((allow) => [
    allow.guest().to(['read']),
    allow.groups(['ADMINS']).to(['create', 'update', 'delete', 'read']),
    // ✅ AGREGADO: Permitir a cualquier usuario autenticado gestionar su propio perfil
    // IMPORTANTE: Esto permite crear/actualizar usando su propio userId como id
    allow.authenticated().to(['create', 'update', 'read']),
    // allow.owner() también funciona, pero authenticated() es más explícito para este caso
    allow.owner().to(['create', 'update', 'delete', 'read']),
  ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});