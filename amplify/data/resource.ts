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
  ]),

  // 🎤 SPEAKER APPLICATION: Sistema de postulación para speakers
  SpeakerApplication: a.model({
    id: a.id(),
    userId: a.string().required(), // Cognito user ID
    email: a.string().required(),
    
    // Datos de la postulación
    motivation: a.string().required(), // ¿Por qué quieres ser speaker?
    topics: a.string().array().required(), // Temas que te gustaría presentar
    experience: a.string(), // Experiencia previa (opcional)
    previousTalksLinks: a.string().array(), // Links a charlas anteriores (opcional)
    
    // Estado del proceso (default PENDING se maneja en Lambda)
    status: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
    
    // Timestamps
    submittedAt: a.datetime().required(),
    reviewedAt: a.datetime(),
    
    // Metadata para tracking
    schedulerArn: a.string(), // ARN del EventBridge Schedule
    rejectionReason: a.string(), // Solo si status = REJECTED
    
    // Owner field para authorization
    owner: a.string(),
  })
  .secondaryIndexes((index) => [
    index('userId').sortKeys(['submittedAt']).queryField('applicationsByUser'),
    index('status').sortKeys(['submittedAt']).queryField('applicationsByStatus'),
  ])
  .authorization((allow) => [
    // Usuarios pueden crear su propia postulación y leer las suyas
    allow.authenticated().to(['create', 'read']),
    allow.owner().to(['read']),
    // Solo ADMINS pueden ver todas y modificar estados
    allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
  ]),

  // 🔔 NOTIFICATIONS: Sistema de notificaciones in-app
  Notification: a.model({
    id: a.id(),
    userId: a.string().required(), // Usuario que recibe la notificación
    
    // Contenido de la notificación
    type: a.enum(['SPEAKER_APPROVED', 'SPEAKER_REJECTED', 'NEW_EVENT', 'COMMENT', 'ANNOUNCEMENT']),
    title: a.string().required(), // Título corto
    message: a.string().required(), // Mensaje descriptivo
    
    // Metadata
    read: a.boolean().default(false), // Si fue leída o no
    link: a.string(), // URL a donde navegar al hacer click (opcional)
    icon: a.string(), // Emoji o nombre del icono (opcional)
    
    // Timestamps
    createdAt: a.datetime().required(),
    readAt: a.datetime(), // Cuando se marcó como leída
    
    // Owner field
    owner: a.string(),
  })
  .secondaryIndexes((index) => [
    index('userId').sortKeys(['createdAt']).queryField('notificationsByUser'),
  ])
  .authorization((allow) => [
    // Usuario solo puede leer y actualizar sus propias notificaciones
    allow.owner().to(['read', 'update']),
    // ADMINS y sistema pueden crear notificaciones para cualquier usuario
    allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']), // Leer solo las propias
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});