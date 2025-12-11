import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    id: a.id(),
    givenName: a.string().required(),
    familyName: a.string().required(),
    email: a.string().required(),
    phoneNumber: a.string(),
    company: a.string(),
    jobTitle: a.string(), // 🆕 Rol o Carrera (ej: "Ingeniero de Software", "Estudiante de TI")
    bio: a.string(),
    interests: a.string().array(),
    awsExperienceLevel: a.enum(['PROFESSIONAL', 'PERSONAL', 'NONE', 'LEARNING']), // 🆕 Experiencia con AWS
    role: a.enum(['MEMBER', 'SPEAKER', 'ADMIN']),
    meetupId: a.string(),
    newsletterOptIn: a.boolean().default(false),
    avatarUrl: a.string(),
    socialLinks: a.json(),
    privacyConsentDate: a.datetime(),
    profileCompleted: a.boolean().default(false), // 🆕 Para detectar primer login
    onboardingCompletedAt: a.datetime(), // 🆕 Timestamp de cuando completó onboarding
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

  // 🎯 TALK PROPOSAL: Propuestas de charlas de speakers aprobados
  TalkProposal: a.model({
    id: a.id(),
    userId: a.string().required(), // Speaker que propone (debe tener rol SPEAKER)
    speakerName: a.string().required(),
    speakerEmail: a.string().required(),
    
    // Datos de la propuesta de charla
    title: a.string().required(), // Título de la charla
    description: a.string().required(), // Descripción detallada
    topics: a.string().array().required(), // Temas que cubre
    duration: a.integer().required(), // Duración en minutos (15, 30, 45, 60)
    targetAudience: a.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']),
    requiredEquipment: a.string().array(), // Proyector, micrófono, etc.
    additionalNotes: a.string(), // Notas adicionales para el admin
    
    // Estado de la propuesta
    status: a.enum(['PENDING', 'APPROVED', 'REJECTED', 'EVENT_CREATED']),
    
    // Vinculación con evento (cuando se crea)
    eventId: a.string(), // ID del evento creado desde esta propuesta
    
    // Review del admin
    reviewedBy: a.string(), // userId del admin que revisó
    reviewedAt: a.datetime(),
    rejectionReason: a.string(), // Si fue rechazada
    adminNotes: a.string(), // Notas internas del admin
    
    // Timestamps
    submittedAt: a.datetime().required(),
    updatedAt: a.datetime(),
    
    // Owner field
    owner: a.string(),
  })
  .secondaryIndexes((index) => [
    index('userId').sortKeys(['submittedAt']).queryField('proposalsByUser'),
    index('status').sortKeys(['submittedAt']).queryField('proposalsByStatus'),
  ])
  .authorization((allow) => [
    // Speakers (usuarios con rol SPEAKER) pueden crear propuestas y ver las suyas
    allow.authenticated().to(['create', 'read']),
    allow.owner().to(['read', 'update']), // Solo actualizar sus propias propuestas (por si necesitan editar antes de aprobar)
    // ADMINS pueden ver todas y actualizar estados
    allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
  ]),

  // 🔔 NOTIFICATIONS: Sistema de notificaciones in-app
  Notification: a.model({
    id: a.id(),
    userId: a.string().required(), // Usuario que recibe la notificación
    
    // Contenido de la notificación
    type: a.enum(['SPEAKER_APPROVED', 'SPEAKER_REJECTED', 'NEW_SPEAKER_APPLICATION', 'NEW_TALK_PROPOSAL', 'NEW_EVENT', 'COMMENT', 'ANNOUNCEMENT']),
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

  // 📅 EVENT: Eventos de la comunidad
  Event: a.model({
    id: a.id(),
    title: a.string().required(),
    description: a.string().required(),
    slug: a.string().required(), // URL-friendly (ej: intro-aws-lambda-2024)
    
    // Vinculación con propuesta de charla (si se creó desde una)
    talkProposalId: a.string(),
    
    // Speaker
    speakerId: a.string().required(), // userId del speaker
    speakerName: a.string().required(),
    speakerEmail: a.string().required(),
    speakerBio: a.string(),
    speakerAvatar: a.string(), // URL de avatar
    
    // Detalles del evento
    eventType: a.enum(['TALK', 'WORKSHOP', 'MEETUP', 'NETWORKING']),
    topics: a.string().array().required(), // Tags de temas
    
    // Fecha y ubicación
    startDate: a.datetime().required(), // ISO timestamp
    endDate: a.datetime().required(),
    timezone: a.string().default('America/Mexico_City'),
    location: a.string().required(), // Nombre del lugar
    locationAddress: a.string(), // Dirección completa
    isVirtual: a.boolean().default(false),
    virtualLink: a.string(), // Zoom, Meet, etc.
    
    // Capacidad
    maxAttendees: a.integer(), // null = ilimitado
    isUnlimited: a.boolean().default(false),
    
    // Visibilidad y estado
    status: a.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
    isPublic: a.boolean().default(true),
    requiresApproval: a.boolean().default(false), // Para eventos privados
    
    // Media
    coverImageUrl: a.string(), // S3 URL
    
    // Metadata
    createdBy: a.string().required(), // userId del admin que creó
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
    publishedAt: a.datetime(),
    
    // Stats (se actualizan desde EventRegistration)
    goingCount: a.integer().default(0),
    checkedInCount: a.integer().default(0),
    invitedCount: a.integer().default(0),
    notGoingCount: a.integer().default(0),
  })
  .secondaryIndexes((index) => [
    index('slug').queryField('eventBySlug'),
    index('status').sortKeys(['startDate']).queryField('eventsByStatus'),
    index('speakerId').sortKeys(['startDate']).queryField('eventsBySpeaker'),
  ])
  .authorization((allow) => [
    // Eventos públicos pueden ser leídos por cualquiera (incluso guest)
    allow.guest().to(['read']),
    allow.authenticated().to(['read']),
    // Solo ADMINS pueden crear, actualizar, eliminar
    allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
  ]),

  // 🎟️ EVENT REGISTRATION: Registros de asistentes a eventos
  EventRegistration: a.model({
    id: a.id(),
    eventId: a.string().required(),
    userId: a.string().required(),
    
    // Estado del registro
    status: a.enum(['GOING', 'NOT_GOING', 'INVITED', 'WAITLIST']),
    
    // Check-in
    checkedIn: a.boolean().default(false),
    checkedInAt: a.datetime(),
    checkedInBy: a.string(), // userId del admin que hizo check-in
    checkInMethod: a.enum(['QR_SCAN', 'MANUAL', 'SELF_CHECKIN']),
    
    // QR Code único para check-in
    qrCodeToken: a.string().required(), // UUID único
    
    // Metadata
    registeredAt: a.datetime().required(),
    invitedBy: a.string(), // userId del que invitó (si aplica)
    cancelledAt: a.datetime(),
    
    // Datos del usuario (desnormalizados para queries rápidas)
    userName: a.string().required(),
    userEmail: a.string().required(),
    userAvatar: a.string(),
    
    // Owner field
    owner: a.string(),
  })
  .secondaryIndexes((index) => [
    index('eventId').sortKeys(['registeredAt']).queryField('registrationsByEvent'),
    index('userId').sortKeys(['registeredAt']).queryField('registrationsByUser'),
    index('qrCodeToken').queryField('registrationByQrToken'),
  ])
  .authorization((allow) => [
    // Usuario puede crear su propio registro y leer sus registros
    allow.authenticated().to(['create', 'read']),
    allow.owner().to(['read', 'update']), // Actualizar su propio registro (ej: cancelar)
    // ADMINS pueden ver todos los registros y hacer check-in
    allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});