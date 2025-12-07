# 🏗️ Arquitectura AWS - Explicación Técnica Completa

## Descripción General

Este documento explica en detalle cómo funciona la arquitectura AWS del sistema AWS User Group Puebla Connect, desde la autenticación hasta la gestión de eventos.

---

## 📦 Componentes Principales de AWS

### 1. Amazon Cognito User Pools (Autenticación y Autorización)

**Función**: Base de datos de usuarios con autenticación federada.

**Componentes**:
- **User Pool**: Almacena usuarios y sus atributos
- **Grupos**: `ADMINS`, `SPEAKERS`, `MEMBERS` (por defecto)
- **Atributos custom**: `custom:role` (sincronizado con grupos)
- **Hosted UI**: Interfaz de login/registro/logout integrada
- **JWT Tokens**:
  * `idToken`: Contiene atributos del usuario (`custom:role`, `given_name`, `email`, etc.)
  * `accessToken`: Contiene `cognito:groups` (FUENTE DE VERDAD para roles)
  * `refreshToken`: Para renovar sesión sin re-login completo

**Descubrimiento Importante - Limitación de JWT**:

Cuando un admin agrega un usuario al grupo `SPEAKERS`:
- ✅ `accessToken.cognito:groups` se actualiza **inmediatamente**
- ❌ `idToken.custom:role` **NO** se actualiza hasta re-login

**Solución Implementada**:

El frontend llama `getUserRoleFromCognito()` que:
1. Lee `accessToken.cognito:groups` (siempre actualizado)
2. **Override** `custom:role` en `userAttributes` con el valor correcto
3. Esto evita tener que esperar al re-login para ver cambios

```typescript
// En auth-context.tsx
const role = await getUserRoleFromCognito(user);
const updatedAttributes = { 
  ...attributes, 
  'custom:role': role // Override con valor actualizado
};
```

---

### 2. AWS AppSync + DynamoDB (Backend de Datos)

**Amplify Gen 2 Data** usa AppSync GraphQL como capa intermedia:

```
Frontend → generateClient() → AppSync GraphQL API → DynamoDB Tables
```

**Arquitectura de Capas**:
1. **Cliente**: `generateClient<Schema>()` genera cliente tipado de TypeScript
2. **GraphQL API**: AppSync gestiona queries, mutations, subscriptions
3. **Resolvers**: Automáticos (generados por Amplify) para operaciones CRUD
4. **DataStore**: DynamoDB con provisioning automático

**Tablas DynamoDB Creadas Automáticamente**:

| Tabla | Propósito | Campos Clave |
|-------|-----------|--------------|
| `SpeakerApplication-*` | Postulaciones de speakers | userId, status, submittedAt |
| `TalkProposal-*` | Propuestas de charlas | userId, title, status, topics |
| `Event-*` | Eventos publicados | slug, status, startDate, speakerId |
| `EventRegistration-*` | Registros de asistentes | eventId, userId, qrCodeToken |
| `Notification-*` | Notificaciones in-app | userId, type, read, createdAt |
| `User-*` | Datos adicionales de usuarios | sub (Cognito userId) |

**Authorization Rules** (definidas en cada modelo):

```typescript
// Ejemplo: TalkProposal
authorization: [
  allow.owner(),                        // Owner puede ver/editar sus propias
  allow.groups(['ADMINS']).to(['*']),  // Admins pueden hacer todo
  allow.authenticated().to(['read']),  // Autenticados pueden leer
]
```

**Secondary Indexes** (para queries eficientes):

- `status` + `submittedAt` → Filtrar propuestas por estado ordenadas por fecha
- `userId` + `createdAt` → Ver todas las propuestas de un usuario
- `slug` → Buscar eventos por URL amigable
- `qrCodeToken` → Check-in rápido por escaneo QR

**Ventaja**: Queries indexadas son **~100x más baratas** que scans completos.

---

### 3. AWS Lambda Functions (Lógica de Negocio)

#### Lambda 1: `process-speaker-application`

**Trigger**: DynamoDB Stream de tabla `SpeakerApplication`  
**Evento**: Cuando se crea nueva postulación (`INSERT`)

**Flujo de Ejecución**:
1. Lee datos de la postulación desde el Stream event
2. Envía email de confirmación al aplicante (Amazon SES)
3. Obtiene lista de admins de Cognito (`ListUsersInGroupCommand`)
4. Crea notificación in-app para cada admin (DynamoDB `PutItem`)
5. Crea EventBridge Schedule para auto-aprobación en 5 minutos

**Permisos IAM Requeridos**:
```typescript
- ses:SendEmail, ses:SendRawEmail → Enviar emails
- scheduler:CreateSchedule → Crear schedule de auto-aprobación
- dynamodb:PutItem → Crear notificaciones
- cognito-idp:ListUsersInGroup → Obtener lista de admins
```

**Variables de Entorno**:
- `APPROVE_LAMBDA_ARN`: ARN de la Lambda de aprobación
- `SENDER_EMAIL`: Email verificado en SES
- `NOTIFICATION_TABLE_PREFIX`: Prefijo de tabla de notificaciones

**Stack Assignment**: `resourceGroupName: 'data'` (usa DynamoDB Streams)

---

#### Lambda 2: `approve-speaker-application`

**Trigger**: EventBridge Scheduler (5 minutos después de postulación)

**Flujo de Ejecución**:
1. Obtiene postulación de DynamoDB (`GetItem`)
2. Actualiza status → `APPROVED` (`UpdateItem`)
3. Agrega usuario a grupo `SPEAKERS` en Cognito (`AdminAddUserToGroup`)
4. Envía email de bienvenida (SES)
5. Crea notificación in-app para el usuario

**Permisos IAM**:
```typescript
- dynamodb:GetItem, UpdateItem → Leer/actualizar postulación
- cognito-idp:AdminAddUserToGroup → Agregar a grupo SPEAKERS
- ses:SendEmail → Email de bienvenida
- dynamodb:PutItem → Crear notificación
```

**Stack Assignment**: `resourceGroupName: 'auth'` (principalmente usa Cognito)

---

#### Lambda 3: `manual-approve-speaker`

**Trigger**: API Route `/api/admin/approve-speaker` (POST desde admin panel)

**Flujo de Ejecución**:
1. Cancela schedule de EventBridge (evitar doble aprobación)
2. Actualiza postulación → `APPROVED` en DynamoDB
3. Agrega usuario a grupo `SPEAKERS` en Cognito
4. Envía email de aprobación manual (SES)
5. Crea notificación con botón "Activar Permisos (Re-login)"

**Permisos IAM**:
```typescript
- scheduler:DeleteSchedule → Cancelar auto-aprobación pendiente
- dynamodb:GetItem, UpdateItem, PutItem → CRUD en DynamoDB
- cognito-idp:AdminAddUserToGroup → Gestionar grupos
- ses:SendEmail → Notificar por email
```

**Diferencia clave vs Lambda 2**: 
- Cancela schedule automático
- Ejecuta inmediatamente (no espera 5 min)
- Mensaje de email indica aprobación manual por admin

**Stack Assignment**: `resourceGroupName: 'auth'`

---

#### Lambda 4: `reject-speaker-application`

**Trigger**: API Route `/api/admin/reject-speaker` (POST)

**Flujo de Ejecución**:
1. Cancela schedule de EventBridge (evitar auto-aprobación)
2. Actualiza postulación → `REJECTED` con `rejectionReason`
3. Envía email de rechazo con motivo específico (SES)
4. Crea notificación in-app explicando el rechazo

**Permisos IAM**: Similares a Lambda 3, sin permisos de Cognito groups

**Stack Assignment**: `resourceGroupName: 'auth'`

---

#### Lambda 5: `create-event-from-proposal`

**Trigger**: Frontend (futuro, cuando se implemente completamente)

**Flujo Planificado**:
1. Lee propuesta aprobada de DynamoDB (`GetItem`)
2. Crea evento en tabla `Event` (`PutItem`)
3. Actualiza propuesta con `eventId` y status `EVENT_CREATED` (`UpdateItem`)

**Estado Actual**: ⚠️ Skeleton implementado (retorna mock data)

**Permisos IAM**:
```typescript
- dynamodb:GetItem, PutItem, UpdateItem → CRUD en TalkProposal y Event
- dynamodb:ListTables → Encontrar tablas dinámicamente
```

**Stack Assignment**: `resourceGroupName: 'data'`

---

#### Lambda 6: `notify-admins-new-proposal` ✨ NUEVA

**Trigger**: API Route `/api/speaker/notify-admins` (POST después de crear propuesta)

**Flujo de Ejecución**:
1. Recibe `proposalId`, `speakerName`, `title` del request
2. Lista usuarios del grupo `ADMINS` en Cognito (`ListUsersInGroupCommand`)
3. Para cada admin encontrado:
   - Crea notificación en DynamoDB:
     * Type: `NEW_TALK_PROPOSAL`
     * Title: "📢 Nueva propuesta de charla"
     * Message: "{speakerName} ha enviado: {title}"
     * Link: `/admin/talk-proposals`
     * Icon: 🎤
4. Retorna count de notificaciones enviadas vs fallidas

**Permisos IAM**:
```typescript
- cognito-idp:ListUsersInGroup → Obtener lista de admins
- dynamodb:PutItem → Crear notificaciones
- dynamodb:ListTables → Encontrar tabla Notification
```

**Variables de Entorno**:
- `USER_POOL_ID`: ID del Cognito User Pool
- `NOTIFICATION_TABLE_PREFIX`: 'Notification'

**Stack Assignment**: `resourceGroupName: 'auth'` (principalmente usa Cognito)

**Costo Estimado**: ~$0.53/mes con 100 propuestas (extremadamente económico)

---

### 4. Amazon EventBridge Scheduler (Tareas Programadas)

**Uso Principal**: Auto-aprobación de speakers después de 5 minutos.

**Arquitectura del Flujo**:

```
1. SpeakerApplication creada → DynamoDB Stream
2. Lambda process-speaker-application ejecuta:
   
   await scheduler.send(new CreateScheduleCommand({
     Name: `approve-speaker-${applicationId}`,
     ScheduleExpression: `at(${approvalTime})`, // 5 min en el futuro
     Target: {
       Arn: APPROVE_LAMBDA_ARN,
       RoleArn: SCHEDULER_ROLE_ARN,
       Input: JSON.stringify({ applicationId })
     }
   }));

3. Después de 5 minutos → EventBridge invoca Lambda approve-speaker-application

4. Si admin aprueba manualmente antes:
   
   await scheduler.send(new DeleteScheduleCommand({
     Name: `approve-speaker-${applicationId}`
   }));
```

**Ventajas sobre Cron Jobs**:
- ✅ Un schedule por tarea (no polling masivo)
- ✅ Se elimina automáticamente después de ejecutarse
- ✅ Cancelable desde otras Lambdas
- ✅ Costo: $0.00001 por invocación (~$0.10/mes para 100 schedules)

**Cleanup**: Si se borra la Lambda o la tabla, EventBridge limpia los schedules automáticamente.

---

### 5. Amazon SES (Simple Email Service)

**Función**: Enviar emails transaccionales automatizados.

**Tipos de Emails Implementados**:

| Email | Trigger | Destinatario | Contenido |
|-------|---------|--------------|-----------|
| Confirmación de postulación | SpeakerApplication creada | Aplicante | "Solicitud recibida, revisaremos en 5 min" |
| Aprobación automática | EventBridge Schedule | Aplicante | "¡Aprobado! Ya eres speaker" |
| Aprobación manual | Admin click "Aprobar" | Aplicante | "Admin te aprobó manualmente" |
| Rechazo | Admin click "Rechazar" | Aplicante | "Lamentablemente no aprobada: {razón}" |

**Configuración Actual**:
- **Sender Email**: `fortino.romero.man@gmail.com` (verificado)
- **Modo**: Sandbox (solo puede enviar a emails verificados)
- **Rate Limit**: 1 email/segundo, 200 emails/día

**Producción**:
1. Solicitar salida de sandbox: SES Console → "Request production access"
2. Verificar dominio: `awspuebla.dev` con DNS records
3. Aumenta límite a 50,000 emails/día
4. Habilita envío a cualquier email

**Costos**:
- $0.10 por 1,000 emails
- 62,000 emails/mes gratis (primer año)

---

### 6. AWS IAM (Identity and Access Management)

**Roles Principales Creados**:

#### 1. Lambda Execution Roles

Cada Lambda tiene su propio rol con permisos específicos:

```typescript
// Ejemplo: notify-admins-new-proposal
backend.notifyAdminsNewProposal.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:ListUsersInGroup'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
```

**Permisos comunes**:
- CloudWatch Logs (automático): `logs:CreateLogGroup`, `logs:PutLogEvents`
- DynamoDB: `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query`
- Cognito: `cognito-idp:AdminAddUserToGroup`, `ListUsersInGroup`
- SES: `ses:SendEmail`, `ses:SendRawEmail`
- EventBridge: `scheduler:CreateSchedule`, `DeleteSchedule`

#### 2. Authenticated User IAM Role

Rol asignado a usuarios autenticados (logueados):

```typescript
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [
      backend.manualApproveSpeaker.resources.lambda.functionArn,
      backend.notifyAdminsNewProposal.resources.lambda.functionArn,
    ],
  })
);
```

**Permisos**:
- Invocar Lambdas de admin (si es ADMIN en Cognito)
- Invocar Lambda de notificación (cualquier autenticado)
- Read/Write en DynamoDB vía AppSync (según authorization rules)

#### 3. Unauthenticated User IAM Role

Usuarios no logueados (invitados):

**Permisos**:
- ✅ Lectura de eventos públicos (`Event` con `isPublic: true`)
- ❌ No puede crear propuestas, registrarse a eventos, etc.

#### 4. EventBridge Scheduler Role

Rol que permite a EventBridge invocar Lambdas:

```typescript
const schedulerRole = new Role(stack, 'SchedulerRole', {
  assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaRole')
  ]
});
```

---

### 7. CloudWatch Logs (Observabilidad)

**Configuración Automática**:

Todas las Lambdas tienen log retention de **7 días** configurado vía Custom Resource:

```typescript
new AwsCustomResource(lambda.stack, `${name}LogRetention`, {
  onCreate: {
    service: 'CloudWatchLogs',
    action: 'putRetentionPolicy',
    parameters: {
      logGroupName: `/aws/lambda/${lambda.functionName}`,
      retentionInDays: 7,
    },
  },
});
```

**Ventaja**: Evita acumulación de logs indefinidos (reducción de costos).

**Debugging en Tiempo Real**:
```bash
# Ver logs de Lambda en vivo
aws logs tail /aws/lambda/amplify-awsug-notify-admins --follow

# Buscar errores específicos
aws logs filter-pattern --log-group-name /aws/lambda/amplify-awsug-notify-admins --filter-pattern "ERROR"
```

---

## 🔄 Flujos Completos End-to-End

### FLUJO 1: Registro y Aprobación de Speaker

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario se registra → Cognito User Pool                      │
│    - Grupo por defecto: MEMBERS                                 │
│    - custom:role: 'MEMBER'                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Usuario aplica a speaker → Frontend                          │
│    client.models.SpeakerApplication.create({                    │
│      userId, givenName, familyName, email, bio,                 │
│      linkedIn, topics, experience, status: 'PENDING'            │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. DynamoDB PutItem → SpeakerApplication table                  │
│    - Genera evento en DynamoDB Stream                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. DynamoDB Stream trigger → Lambda process-speaker-application │
│    a) Envía email "Solicitud recibida" (SES)                    │
│    b) Obtiene lista de admins (Cognito ListUsersInGroup)        │
│    c) Crea notificación para cada admin (DynamoDB PutItem)      │
│    d) Crea EventBridge Schedule para auto-aprobación (5 min)    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────┬─────────────────────────────────────────┐
│ 5a. FLUJO AUTOMÁTICO  │ 5b. FLUJO MANUAL (Admin aprueba antes)  │
│                       │                                         │
│ EventBridge Schedule  │ Admin click "Aprobar" →                 │
│ (5 min después)       │ API Route /api/admin/approve-speaker   │
│         ↓             │         ↓                               │
│ Lambda approve-       │ Lambda manual-approve-speaker          │
│ speaker-application   │         ↓                               │
│         ↓             │ EventBridge DeleteSchedule              │
│ Update DynamoDB:      │ (cancela auto-aprobación)              │
│ status=APPROVED       │         ↓                               │
│         ↓             │ Same as 5a (Update DB, Cognito, etc.)  │
│ Cognito:              │                                         │
│ AdminAddUserToGroup   │                                         │
│ ('SPEAKERS')          │                                         │
│         ↓             │                                         │
│ SES: Email bienvenida │                                         │
│         ↓             │                                         │
│ DynamoDB: Crear       │                                         │
│ notificación user     │                                         │
└───────────────────────┴─────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Usuario recibe notificación con botón "Activar Permisos"     │
│    - Frontend muestra modal explicando re-login necesario       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Usuario click → logout() → Cognito Hosted UI logout          │
│    - Limpia sesión local                                        │
│    - Redirect a login                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Usuario re-login → Cognito Hosted UI                         │
│    - Emite nuevos JWT tokens                                    │
│    - accessToken.cognito:groups ahora incluye ['SPEAKERS']      │
│    - idToken.custom:role actualizado a 'SPEAKER'                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Frontend ejecuta getUserRoleFromCognito()                    │
│    - Lee accessToken.cognito:groups                             │
│    - Override custom:role en userAttributes                     │
│    - setUserAttributes({ ...attrs, 'custom:role': 'SPEAKER' }) │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Usuario ahora tiene acceso a:                               │
│     - /speaker/propose-talk ✅                                  │
│     - /speaker/my-proposals ✅                                  │
│     - Navbar muestra "Proponer Charla" ✅                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### FLUJO 2: Propuesta de Charla y Notificación a Admins

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Speaker navega a /speaker/propose-talk                       │
│    - Verifica rol: custom:role === 'SPEAKER' ✅                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Speaker llena formulario                                     │
│    - Título, descripción, temas, duración, audiencia            │
│    - Equipment requerido, notas adicionales                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Submit → client.models.TalkProposal.create()                 │
│    AppSync GraphQL mutation → DynamoDB PutItem                  │
│    Authorization: allow.owner() ✅                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Frontend llama API Route (en paralelo)                       │
│    POST /api/speaker/notify-admins                              │
│    Body: {                                                      │
│      proposalId: data.id,                                       │
│      speakerName: "Fortino Romero",                             │
│      title: "AWS Lambda Deep Dive"                              │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. API Route verifica autenticación                             │
│    - fetchAuthSession() → Valida JWT token                      │
│    - No requiere ser admin (cualquier autenticado puede)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. API Route invoca Lambda notify-admins-new-proposal           │
│    LambdaClient.send(new InvokeCommand({                        │
│      FunctionName: notifyAdminsNewProposalLambdaName,           │
│      Payload: JSON.stringify(payload)                           │
│    }))                                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Lambda notify-admins-new-proposal ejecuta:                   │
│                                                                 │
│    a) Cognito ListUsersInGroupCommand('ADMINS')                 │
│       → Returns: [                                              │
│            { userId: 'uuid1', username: 'admin1' },             │
│            { userId: 'uuid2', username: 'admin2' }              │
│          ]                                                      │
│                                                                 │
│    b) For each admin:                                           │
│        DynamoDB PutItem en Notification table                   │
│        {                                                        │
│          id: randomUUID(),                                      │
│          userId: admin.userId,                                  │
│          type: 'NEW_TALK_PROPOSAL',                             │
│          title: '📢 Nueva propuesta de charla',                │
│          message: 'Fortino Romero ha enviado: "AWS Lambda..."', │
│          read: false,                                           │
│          link: '/admin/talk-proposals',                         │
│          icon: '🎤',                                            │
│          createdAt: now,                                        │
│          owner: admin.userId                                    │
│        }                                                        │
│                                                                 │
│    c) Return { successCount: 2, errorCount: 0, totalAdmins: 2 }│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Frontend muestra mensaje de éxito                            │
│    "✅ ¡Propuesta enviada exitosamente!"                        │
│    Console.log: "✅ Notificaciones enviadas a administradores"  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Admin navega a cualquier página                              │
│    - NotificationList component se monta                        │
│    - Carga notificaciones con query: notificationsByUser        │
│    - Index: userId + createdAt (query rápida)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Admin ve notificación 🔔 en navbar                          │
│     - Badge con count: "2"                                      │
│     - Click → Dropdown con lista de notificaciones              │
│     - Click en notificación → Redirect /admin/talk-proposals    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. Admin ve propuesta en estado PENDING                        │
│     - Puede aprobar, rechazar, o crear evento directamente      │
└─────────────────────────────────────────────────────────────────┘
```

**Costo de este flujo**:
- 1 DynamoDB PutItem (propuesta): $0.00025
- 1 Lambda invocation (notify-admins): $0.0000002
- 2 DynamoDB PutItems (notificaciones): $0.0005
- 2 DynamoDB GetItems (admin ve notificaciones): $0.0001
- **Total por propuesta**: ~$0.00078 ≈ **$0.078 por 100 propuestas**

---

### FLUJO 3: Aprobación de Propuesta y Creación de Evento

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Admin navega a /admin/talk-proposals                         │
│    - Verifica rol: isAdmin === true (context)                   │
│    - Carga propuestas: client.models.TalkProposal.list()        │
│    - Filtros: PENDING, APPROVED, REJECTED, EVENT_CREATED        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Admin click "Aprobar" en propuesta PENDING                   │
│    client.models.TalkProposal.update({                          │
│      id: proposalId,                                            │
│      status: 'APPROVED',                                        │
│      reviewedBy: user.userId,                                   │
│      reviewedAt: new Date().toISOString()                       │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. AppSync mutation → DynamoDB UpdateItem                       │
│    Authorization: allow.groups(['ADMINS']) ✅                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Propuesta ahora en tab "Aprobadas"                           │
│    Admin click "Crear Evento" → Modal CreateEventModal abre     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Modal CreateEventModal pre-llena datos                       │
│    Pre-filled:                                                  │
│    - title: proposal.title                                      │
│    - description: proposal.description                          │
│    - topics: proposal.topics                                    │
│    - speaker info: speakerId, name, email                       │
│                                                                 │
│    Admin completa:                                              │
│    - startDate: "2025-12-15"                                    │
│    - startTime: "19:00"                                         │
│    - duration: 60 (minutos)                                     │
│    - location: "Auditorio TechHub Puebla"                       │
│    - locationAddress: "Calle 5 de Mayo 123"                     │
│    - maxAttendees: 50 (o unlimited)                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Submit → client.models.Event.create()                        │
│    - Genera slug: "aws-lambda-deep-dive-1733438900"             │
│    - Calcula endDate: startDate + duration                      │
│    - status: 'DRAFT' (no visible públicamente aún)              │
│    - talkProposalId: proposal.id (relación)                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Actualiza propuesta con eventId                              │
│    client.models.TalkProposal.update({                          │
│      id: proposal.id,                                           │
│      status: 'EVENT_CREATED',                                   │
│      eventId: createdEvent.id                                   │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Admin navega a /admin/events                                 │
│    - Ve evento en tab "Borradores"                              │
│    - Status badge: "BORRADOR" (amarillo)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Admin revisa evento y click "Publicar"                       │
│    client.models.Event.update({                                 │
│      id: event.id,                                              │
│      status: 'PUBLISHED',                                       │
│      publishedAt: new Date().toISOString()                      │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Evento ahora visible en /events (página pública)            │
│     - Aparece en lista de eventos publicados                    │
│     - URL: /events/aws-lambda-deep-dive-1733438900              │
│     - Usuarios pueden registrarse (futuro)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Análisis de Costos AWS Detallado

### Escenario: 100 Usuarios Activos/Mes

| Servicio AWS | Uso Mensual | Costo Unitario | Costo/Mes | Free Tier |
|--------------|-------------|----------------|-----------|-----------|
| **Cognito User Pools** | 100 MAU | $0.0055/MAU | $0.55 | 50,000 MAU gratis |
| **DynamoDB On-Demand** | 5,000 writes | $1.25/million | $0.00625 | 25 GB storage gratis |
| | 50,000 reads | $0.25/million | $0.0125 | 2.5M reads/mes gratis |
| **Lambda Invocations** | 2,000 calls | $0.20/million | $0.0004 | 1M requests gratis |
| **Lambda Duration** | 40,000 GB-sec | $0.0000166667/GB-sec | $0.67 | 400,000 GB-sec gratis |
| **AppSync** | 100,000 queries | $4.00/million | $0.40 | Incluido |
| **SES** | 200 emails | $0.10/1000 | $0.02 | 62,000 emails gratis |
| **EventBridge Scheduler** | 100 schedules | $1.00/million | $0.0001 | Incluido |
| **CloudWatch Logs** | 5 GB ingestion | $0.50/GB | $2.50 | 5 GB gratis |
| **CloudWatch Logs Storage** | 2 GB | $0.03/GB | $0.06 | Incluido |
| **Data Transfer** | 10 GB out | $0.09/GB | $0.90 | 100 GB gratis (12 meses) |
| **API Gateway** (AppSync) | 100,000 requests | $3.50/million | $0.35 | Incluido |

**Total Estimado**: **~$5.50/mes** (sin Free Tier)  
**Total con Free Tier (primer año)**: **~$0.70/mes** ✨

### Desglose por Funcionalidad

**Sistema de Notificaciones**:
- DynamoDB writes (300/mes): $0.00075
- DynamoDB reads (9,000/mes): $0.00225
- **Total notificaciones**: **$0.003/mes** (~0.3 centavos)

**Sistema de Aprobación de Speakers**:
- Lambda invocations (100): $0.00002
- SES emails (200): $0.02
- EventBridge schedules (100): $0.0001
- DynamoDB operations: $0.005
- **Total aprobaciones**: **$0.025/mes**

**Sistema de Eventos**:
- DynamoDB operations (publicar, registrar): $0.01
- Lambda invocations (futuro check-in): $0.002
- **Total eventos**: **$0.012/mes**

### Optimizaciones de Costo Implementadas

1. **CloudWatch Log Retention: 7 días**
   - Sin esto: ~$15/mes acumulando logs indefinidos
   - Con retention: ~$2.50/mes

2. **DynamoDB On-Demand (no Provisioned)**
   - Pagas solo por lo que usas
   - Sin capacidad reservada desperdiciada

3. **Secondary Indexes estratégicos**
   - Evita scans completos (100x más caros que queries)
   - Queries por index: $0.25/millón vs Scans: $25/millón

4. **Lambda memory optimizado**
   - 512 MB (balance entre costo y performance)
   - Más memoria = más rápido = menos GB-segundos

5. **SES en Sandbox durante desarrollo**
   - Sin costo hasta estar listo para producción

---

## 🎯 Patrones Arquitectónicos Clave

### 1. DynamoDB Streams como Event Bus

**Problema**: ¿Cómo ejecutar lógica automática al crear una postulación?

**Solución**:
```
SpeakerApplication.create() 
  → DynamoDB PutItem 
  → DynamoDB Stream (INSERT event)
  → Lambda process-speaker-application trigger
  → Ejecuta acciones automáticas (email, notificaciones, schedule)
```

**Ventajas**:
- ✅ No necesitas polling o webhooks
- ✅ Near real-time (< 1 segundo de latencia)
- ✅ Totalmente event-driven
- ✅ Retry automático si Lambda falla

**Cuándo usar**:
- Auditoría de cambios
- Sincronización entre sistemas
- Workflows automáticos
- Notificaciones en tiempo real

---

### 2. EventBridge Scheduler para Delayed Tasks

**Problema**: Ejecutar acción después de X tiempo (auto-aprobación en 5 min).

**Alternativas consideradas**:
- ❌ Cron job cada minuto: Desperdicia recursos
- ❌ Polling database: Ineficiente y costoso
- ✅ EventBridge Scheduler: Perfecto para el caso

**Implementación**:
```typescript
// Crear schedule de una sola ejecución
await scheduler.send(new CreateScheduleCommand({
  Name: `approve-speaker-${applicationId}`,
  ScheduleExpression: `at(${futureTime})`, // One-time, no recurring
  Target: {
    Arn: lambdaArn,
    Input: JSON.stringify({ applicationId })
  },
  FlexibleTimeWindow: { Mode: 'OFF' }
}));

// Cancelar si admin aprueba antes
await scheduler.send(new DeleteScheduleCommand({
  Name: `approve-speaker-${applicationId}`
}));
```

**Ventajas**:
- ✅ No ejecuta hasta el momento exacto
- ✅ Se elimina automáticamente después de ejecutar
- ✅ Cancelable desde otras Lambdas
- ✅ Costo: $0.00001 por schedule

---

### 3. JWT Token Limitations y Workaround

**Problema Descubierto**:

Cuando admin agrega usuario a grupo `SPEAKERS`:
- Cognito actualiza membresía inmediatamente
- `accessToken.cognito:groups` refleja cambio
- Pero `idToken.custom:role` NO cambia hasta re-login

**Por qué sucede**:

JWT tokens son **inmutables** después de emitidos. Para actualizar, necesitas:
1. Invalidar token actual
2. Emitir nuevo token con datos actualizados
3. Esto solo pasa en re-login

**Workaround Implementado**:

```typescript
// lib/amplify/auth.ts
export async function getUserRoleFromCognito(user) {
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken.payload['cognito:groups'];
  
  if (groups?.includes('ADMINS')) return 'ADMIN';
  if (groups?.includes('SPEAKERS')) return 'SPEAKER';
  return 'MEMBER';
}

// context/auth-context.tsx
const refreshUser = async (user) => {
  const attributes = await fetchUserAttributes();
  const role = await getUserRoleFromCognito(user);
  
  // Override custom:role con valor actualizado de grupos
  const updatedAttributes = { 
    ...attributes, 
    'custom:role': role // Fuente de verdad: cognito:groups
  };
  
  setUserAttributes(updatedAttributes);
};
```

**Resultado**:
- ✅ UI refleja rol correcto inmediatamente después de refresh
- ✅ No necesita re-login para verificaciones en frontend
- ⚠️ Backends deben leer `cognito:groups` del accessToken, no custom:role

---

### 4. Amplify Gen 2 Data Architecture

**Modelo de Capas**:

```
┌──────────────────────────────────────────────────────────┐
│ Frontend (Next.js + React)                               │
│   - generateClient<Schema>() → Cliente tipado           │
│   - client.models.Event.create(), .list(), .update()    │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ AWS AppSync GraphQL API (generado por Amplify)          │
│   - Mutations: create, update, delete                   │
│   - Queries: get, list, custom queries                  │
│   - Subscriptions: onCreate, onUpdate (real-time)       │
│   - Authorization: Cognito User Pools + IAM             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ AppSync Resolvers (VTL templates automáticos)            │
│   - Transforman GraphQL → DynamoDB operations           │
│   - Aplican authorization rules                         │
│   - Manejo de errores y validaciones                    │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ Amazon DynamoDB Tables (auto-provisioned)                │
│   - Tabla por modelo (Event, TalkProposal, etc.)        │
│   - Secondary indexes según definición                   │
│   - Streams habilitados automáticamente                  │
└──────────────────────────────────────────────────────────┘
```

**Ventajas**:
- ✅ TypeScript end-to-end typesafety
- ✅ No necesitas escribir queries GraphQL manualmente
- ✅ Authorization declarativa en el schema
- ✅ Real-time subscriptions sin WebSockets manualmente

**Schema Example**:
```typescript
const schema = a.schema({
  Event: a.model({
    title: a.string().required(),
    slug: a.string().required(),
    status: a.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
    goingCount: a.integer().default(0),
  })
  .authorization([
    a.allow.guest().to(['read']),
    a.allow.authenticated().to(['read']),
    a.allow.groups(['ADMINS']),
  ])
  .secondaryIndexes((index) => [
    index('slug'),
    index('status').sortKeys(['startDate']),
  ])
});

// Frontend usage (100% typesafe):
const { data } = await client.models.Event.list({
  filter: { status: { eq: 'PUBLISHED' } }
});
```

---

### 5. API Routes como Lambda Proxy

**Problema**: ¿Cómo permitir que frontend invoque Lambdas de forma segura?

**Patrón Implementado**:

```
Frontend 
  → POST /api/speaker/notify-admins
  → Next.js API Route (edge function)
  → Verifica autenticación con fetchAuthSession()
  → Invoca Lambda con LambdaClient.send()
  → Retorna respuesta al frontend
```

**Código de API Route**:
```typescript
// src/app/api/speaker/notify-admins/route.ts
export async function POST(request: NextRequest) {
  // 1. Verificar autenticación
  const session = await fetchAuthSession();
  if (!session.tokens) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // 2. Obtener datos del request
  const { proposalId, speakerName, title } = await request.json();

  // 3. Invocar Lambda
  const response = await lambdaClient.send(new InvokeCommand({
    FunctionName: lambdaName,
    Payload: JSON.stringify({ proposalId, speakerName, title })
  }));

  // 4. Retornar respuesta
  return NextResponse.json(JSON.parse(response.Payload));
}
```

**Ventajas**:
- ✅ Frontend no necesita credenciales AWS
- ✅ API Route valida autenticación antes de invocar
- ✅ Puede agregar rate limiting, logging, etc.
- ✅ Separa concerns: Frontend → API → Lambda

---

### 6. Notification System Pattern

**Patrón "Fan-Out" para Notificaciones**:

```typescript
// Obtener destinatarios de Cognito Group
const admins = await cognitoClient.send(
  new ListUsersInGroupCommand({
    UserPoolId: USER_POOL_ID,
    GroupName: 'ADMINS'
  })
);

// Crear notificación para cada destinatario
for (const admin of admins.Users) {
  const userId = admin.Attributes.find(a => a.Name === 'sub').Value;
  
  await ddbClient.send(new PutCommand({
    TableName: notificationTable,
    Item: {
      id: randomUUID(),
      userId,                              // Partition key
      type: 'NEW_TALK_PROPOSAL',
      message: `${speakerName} ha enviado: ${title}`,
      read: false,
      link: '/admin/talk-proposals',
      createdAt: new Date().toISOString(), // Sort key
      owner: userId                        // Para authorization
    }
  }));
}
```

**Ventajas**:
- ✅ Cada usuario tiene sus propias notificaciones
- ✅ Query eficiente: `notificationsByUser(userId)` con index
- ✅ Escalable: Si hay 100 admins, 100 notificaciones independientes
- ✅ Permite marcar como leído individualmente

**Query en Frontend**:
```typescript
const { data } = await client.models.Notification.listNotificationsByUser({
  userId: user.userId,
  filter: { read: { eq: false } }
}, {
  sortDirection: 'DESC',
  limit: 20
});
```

---

## 🔍 Debugging y Troubleshooting

### Ver Logs de Lambda en Tiempo Real

```bash
# Tail logs de Lambda específica
aws logs tail /aws/lambda/amplify-awsug-notify-admins --follow

# Filtrar solo errores
aws logs filter-pattern \
  --log-group-name /aws/lambda/amplify-awsug-notify-admins \
  --filter-pattern "ERROR"

# Ver últimas 100 líneas
aws logs tail /aws/lambda/amplify-awsug-notify-admins --since 10m
```

### Inspeccionar DynamoDB

```bash
# Ver todos los items de una tabla
aws dynamodb scan --table-name Notification-<sandbox-id>

# Buscar notificación específica
aws dynamodb query \
  --table-name Notification-<sandbox-id> \
  --index-name userId-createdAt-index \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"user-uuid"}}'

# Ver estructura de tabla
aws dynamodb describe-table --table-name Event-<sandbox-id>
```

### Ver Cognito Groups

```bash
# Listar usuarios en grupo ADMINS
aws cognito-idp list-users-in-group \
  --user-pool-id <pool-id> \
  --group-name ADMINS

# Ver información de usuario
aws cognito-idp admin-get-user \
  --user-pool-id <pool-id> \
  --username <username>
```

### Inspeccionar EventBridge Schedules

```bash
# Listar todos los schedules
aws scheduler list-schedules

# Ver detalles de schedule específico
aws scheduler get-schedule \
  --name approve-speaker-abc123

# Eliminar schedule manualmente
aws scheduler delete-schedule \
  --name approve-speaker-abc123
```

### Ver Métricas en CloudWatch

```bash
# Invocaciones de Lambda (últimas 24h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=amplify-awsug-notify-admins \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Errores de Lambda
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=amplify-awsug-notify-admins \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/)
- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [EventBridge Scheduler Guide](https://docs.aws.amazon.com/scheduler/)

### CLI Cheat Sheet

```bash
# Amplify
npx ampx sandbox          # Iniciar sandbox
npx ampx sandbox delete   # Eliminar recursos
npx ampx generate outputs # Regenerar amplify_outputs.json

# AWS CLI
aws configure             # Configurar credenciales
aws sts get-caller-identity # Ver cuenta actual
aws lambda list-functions # Listar Lambdas
aws dynamodb list-tables  # Listar tablas
```

### Costos y Facturación

```bash
# Ver costos del mes actual
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

**Documento creado**: Diciembre 5, 2025  
**Autor**: AWS User Group Puebla Connect - Sistema de Gestión  
**Versión**: 1.0 (Fase 1 completada)
