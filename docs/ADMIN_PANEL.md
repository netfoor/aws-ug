# 👨‍💼 Panel de Administración - Sistema de Speakers

## 📋 Resumen

Sistema completo de administración para gestionar postulaciones de speakers. Permite a los administradores revisar, aprobar o rechazar postulaciones de forma manual, cancelando el proceso automático si existe.

---

## 🏗️ Arquitectura

### **Backend (AWS Lambda)**

#### **1. Lambda: manual-approve-speaker**
- **Trigger**: Invocación manual desde el panel de admin
- **Función**: Aprobar postulación manualmente
- **Flujo**:
  1. Cancela el EventBridge Schedule automático (si existe)
  2. Obtiene datos de DynamoDB
  3. Actualiza status → `APPROVED`
  4. Agrega usuario a grupo `SPEAKERS` en Cognito
  5. Envía email de aprobación
- **Permisos IAM**:
  - `dynamodb:GetItem`, `UpdateItem`, `ListTables`
  - `cognito-idp:AdminAddUserToGroup`
  - `ses:SendEmail`
  - `scheduler:DeleteSchedule`, `GetSchedule`

#### **2. Lambda: reject-speaker-application**
- **Trigger**: Invocación manual desde el panel de admin
- **Función**: Rechazar postulación con razón personalizada
- **Flujo**:
  1. Cancela el EventBridge Schedule automático (si existe)
  2. Obtiene datos de DynamoDB
  3. Actualiza status → `REJECTED` con `rejectionReason`
  4. Envía email de rechazo con feedback
- **Permisos IAM**:
  - `dynamodb:GetItem`, `UpdateItem`, `ListTables`
  - `ses:SendEmail`
  - `scheduler:DeleteSchedule`, `GetSchedule`

#### **3. Templates de Email**

**Email de Rechazo:**
- HTML estilizado con branding AWS UG Puebla
- Incluye razón personalizada del admin
- Mensaje motivacional para volver a aplicar
- Link a eventos de la comunidad

---

### **Frontend (Next.js + React)**

#### **Ruta**: `/admin/speakers`
- **Protección**: Middleware verifica grupo `ADMINS` en Cognito
- **Acceso**: Solo administradores

#### **Componentes**

##### **1. AdminDashboard** (`src/components/admin/AdminDashboard.tsx`)
```tsx
interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}
```
- 4 tarjetas con estadísticas
- Iconos por estado: Users, Clock, CheckCircle, XCircle
- Colores temáticos: blue, yellow, green, red
- Loading skeleton animado

##### **2. SpeakerApplicationsList** (`src/components/admin/SpeakerApplicationsList.tsx`)
- **Tabla responsive** con todas las postulaciones
- **Filtros**:
  - Por estado: ALL, PENDING, APPROVED, REJECTED
  - Búsqueda por email o motivación
- **Columnas**:
  - Usuario (avatar + email + userId)
  - Estado (badge con color)
  - Fecha (formateada en español)
  - Temas (máximo 2 + contador)
  - Acciones (botón "Ver detalles")
- **Footer**: Contador de resultados filtrados

##### **3. SpeakerApplicationDetail** (`src/components/admin/SpeakerApplicationDetail.tsx`)
- **Modal full-featured** con scroll
- **Secciones**:
  - Header con avatar y email
  - Badge de estado (solo si ya fue procesada)
  - Info Grid: User ID, Email, Fechas
  - Motivación (en box gris)
  - Temas (badges naranja)
  - Experiencia (opcional, en box gris)
  - Links a charlas (opcional, clickeables)
  - Razón de rechazo (si fue rechazada)
- **Acciones** (solo si status = PENDING):
  - **Botón "Rechazar"**: Abre formulario con textarea
  - **Botón "Aprobar"**: Ejecuta aprobación directa
  - **Formulario de rechazo**:
    - Textarea para razón personalizada
    - Validación: Razón obligatoria
    - Botones: Cancelar / Confirmar Rechazo
- **Estados de carga**: Spinners en botones durante ejecución

##### **4. Página Principal** (`src/app/admin/speakers/page.tsx`)
```tsx
export default function AdminSpeakersPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  // ...
}
```
- **Verificación de permisos**: Redirige si no es admin
- **Carga automática**: Obtiene todas las postulaciones al montar
- **Botón "Actualizar"**: Recarga lista manualmente
- **Integración**:
  - `AdminDashboard` con stats calculadas
  - `SpeakerApplicationsList` con todas las aplicaciones
  - `SpeakerApplicationDetail` en modal

#### **Navegación**

**Link en Navigation** (`src/components/layout/Navigation.tsx`):
- Visible solo si `isAdmin === true`
- Texto: "🛡️ Panel Admin"
- Ubicado en menú de usuario (desktop y mobile)
- Ruta: `/admin/speakers`

---

## 🔐 Seguridad

### **Middleware** (`src/middleware.ts`)
```typescript
const ADMIN_ROUTES = ['/admin'];

if (isProtectedByPrefix(pathname, ADMIN_ROUTES)) {
  const isAdmin = Array.isArray(groups) && groups.includes('ADMINS');
  if (!isAdmin) {
    return NextResponse.redirect('/access-denied');
  }
}
```
- Verifica grupo `ADMINS` en token de Cognito
- Redirige a `/access-denied` si no tiene permisos
- Se ejecuta server-side antes de renderizar

### **GraphQL Authorization** (`amplify/data/resource.ts`)
```typescript
SpeakerApplication: a.model({
  // ...
}).authorization((allow) => [
  allow.authenticated().to(['create', 'read']),
  allow.owner().to(['read']),
  allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
])
```
- Usuarios autenticados: pueden crear y leer las suyas
- Owners: pueden leer sus propias postulaciones
- ADMINS: acceso total (CRUD)

---

## 📊 Flujos de Trabajo

### **Flujo 1: Aprobación Manual**
```
1. Admin abre /admin/speakers
2. Ve lista de postulaciones
3. Click en "Ver detalles" de una PENDING
4. Modal muestra toda la información
5. Admin click en "Aprobar"
6. Sistema:
   ✅ Cancela schedule de EventBridge (si existe)
   ✅ Actualiza DynamoDB: status = APPROVED
   ✅ Agrega usuario a grupo SPEAKERS
   ✅ Envía email de aprobación
7. Modal se cierra, lista se recarga
8. Postulación ahora aparece como APPROVED
```

### **Flujo 2: Rechazo con Razón**
```
1. Admin abre /admin/speakers
2. Ve lista de postulaciones
3. Click en "Ver detalles" de una PENDING
4. Modal muestra toda la información
5. Admin click en "Rechazar"
6. Aparece formulario con textarea
7. Admin escribe razón personalizada (ej: "Necesitas más experiencia con Lambda")
8. Admin click en "Confirmar Rechazo"
9. Sistema:
   ✅ Cancela schedule de EventBridge (si existe)
   ✅ Actualiza DynamoDB: status = REJECTED, rejectionReason = "..."
   ✅ Envía email de rechazo con la razón y mensaje motivacional
10. Modal se cierra, lista se recarga
11. Postulación ahora aparece como REJECTED
```

### **Flujo 3: Cancelación de Aprobación Automática**
```
Escenario: Usuario aplicó hace 3 minutos, falta 2 min para aprobación auto

1. Admin aprueba/rechaza manualmente
2. Lambda busca el schedule en EventBridge:
   - Nombre: approve-speaker-{applicationId}
3. Lambda ejecuta DeleteScheduleCommand
4. Schedule cancelado antes de ejecutarse
5. Solo la acción manual del admin se aplica
```

---

## 🛠️ Configuración y Deploy

### **1. Archivos Modificados/Creados**

**Backend:**
```
amplify/
├── backend.ts                                    # ✅ 2 Lambdas nuevas + permisos
├── functions/
│   ├── manual-approve-speaker/
│   │   ├── handler.ts                            # ✅ Nueva Lambda
│   │   ├── package.json                          # ✅ Dependencias
│   │   └── resource.ts                           # ✅ Configuración
│   └── reject-speaker-application/
│       ├── handler.ts                            # ✅ Nueva Lambda
│       ├── package.json                          # ✅ Dependencias
│       └── resource.ts                           # ✅ Configuración
```

**Frontend:**
```
src/
├── app/
│   └── admin/
│       └── speakers/
│           └── page.tsx                          # ✅ Nueva página admin
├── components/
│   ├── admin/
│   │   ├── AdminDashboard.tsx                    # ✅ Nuevo componente
│   │   ├── SpeakerApplicationsList.tsx           # ✅ Nuevo componente
│   │   └── SpeakerApplicationDetail.tsx          # ✅ Nuevo componente
│   └── layout/
│       └── Navigation.tsx                         # ✏️ Modificado (link admin)
└── middleware.ts                                  # ✅ Ya existía (sin cambios)
```

### **2. Deploy del Backend**

```powershell
# Deploy de sandbox con nuevas Lambdas
npx ampx sandbox

# Salida esperada:
# ✅ Lambda manual-approve-speaker creada
# ✅ Lambda reject-speaker-application creada
# ✅ Permisos IAM configurados
# ✅ Variables de entorno establecidas
```

### **3. Variables de Entorno Configuradas**

**manual-approve-speaker:**
- `USER_POOL_ID`: ID del User Pool de Cognito
- `SENDER_EMAIL`: fortino.romero.man@gmail.com
- `SPEAKER_APPLICATION_TABLE_PREFIX`: SpeakerApplication

**reject-speaker-application:**
- `SENDER_EMAIL`: fortino.romero.man@gmail.com
- `SPEAKER_APPLICATION_TABLE_PREFIX`: SpeakerApplication

### **4. Testing Manual**

```bash
# 1. Login como admin
# Ve a: http://localhost:3000/login
# Usar cuenta con grupo ADMINS

# 2. Verificar link en navegación
# Debe aparecer "🛡️ Panel Admin" en menú de usuario

# 3. Acceder al panel
# http://localhost:3000/admin/speakers

# 4. Verificar dashboard
# Debe mostrar: Total, Pendientes, Aprobadas, Rechazadas

# 5. Crear postulación de prueba
# Logout → Login con otra cuenta → Ir a Profile → Aplicar como speaker

# 6. Volver al panel admin
# Debe aparecer nueva postulación con estado PENDING

# 7. Aprobar postulación
# Click "Ver detalles" → Click "Aprobar" → Verificar email

# 8. Verificar en DynamoDB
aws dynamodb scan \
  --table-name SpeakerApplication-* \
  --filter-expression "id = :id" \
  --expression-attribute-values '{":id":{"S":"<application-id>"}}'
# Status debe ser APPROVED

# 9. Verificar grupo en Cognito
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_XXXXXXXX \
  --username google_XXXXXXXX
# Debe incluir SPEAKERS

# 10. Crear otra postulación y rechazar
# Escribir razón: "Necesitas más experiencia práctica con servicios AWS"
# Verificar email de rechazo con la razón
```

---

## 📝 Monitoring

### **CloudWatch Logs**

**manual-approve-speaker:**
```bash
aws logs tail /aws/lambda/manual-approve-speaker-* --follow --format short
```

**reject-speaker-application:**
```bash
aws logs tail /aws/lambda/reject-speaker-application-* --follow --format short
```

### **DynamoDB Queries**

**Ver todas las postulaciones:**
```bash
aws dynamodb scan \
  --table-name SpeakerApplication-* \
  --projection-expression "id, email, #s, submittedAt, reviewedAt" \
  --expression-attribute-names '{"#s":"status"}'
```

**Ver postulaciones pendientes:**
```bash
aws dynamodb query \
  --table-name SpeakerApplication-* \
  --index-name status-submittedAt-index \
  --key-condition-expression "#s = :pending" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":pending":{"S":"PENDING"}}'
```

**Ver postulaciones rechazadas con razón:**
```bash
aws dynamodb scan \
  --table-name SpeakerApplication-* \
  --filter-expression "#s = :rejected" \
  --projection-expression "email, rejectionReason, reviewedAt" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":rejected":{"S":"REJECTED"}}'
```

---

## 🔍 Troubleshooting

### **1. Error: "Acceso Denegado" al intentar acceder a /admin/speakers**

**Causa**: Usuario no tiene grupo `ADMINS`

**Solución**:
```bash
# Agregar usuario a grupo ADMINS
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXX \
  --username google_XXXXXXXX \
  --group-name ADMINS

# Verificar
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_XXXXXXXX \
  --username google_XXXXXXXX
```

### **2. Error: Lambda no puede cancelar schedule**

**Causa**: Schedule ya fue ejecutado o eliminado

**Logs esperados**:
```
⚠️ Schedule ya no existe: approve-speaker-{id}
```

**Acción**: Esto es normal, el sistema continúa con la aprobación/rechazo

### **3. Error: Email no se envía**

**Causa**: SES en modo sandbox requiere emails verificados

**Solución**:
```bash
# Verificar email del destinatario
aws ses verify-email-identity --email-address usuario@example.com

# O solicitar acceso a producción
# AWS Console → SES → Account Dashboard → Request Production Access
```

### **4. Error: "Error al cargar postulaciones" en el panel**

**Causa**: Usuario no tiene permisos de lectura en GraphQL

**Verificar autorización** en `amplify/data/resource.ts`:
```typescript
.authorization((allow) => [
  allow.groups(['ADMINS']).to(['create', 'read', 'update', 'delete']),
])
```

**Logs de GraphQL**:
```bash
# Ver logs del API Gateway
aws logs tail /aws/appsync/apis/<api-id> --follow
```

### **5. Error: "Datos incompletos de la aplicación"**

**Causa**: Registro en DynamoDB tiene `id` o `userId` como `null`

**Verificar datos**:
```bash
aws dynamodb get-item \
  --table-name SpeakerApplication-* \
  --key '{"id":{"S":"<application-id>"}}'
```

**Solución**: Asegurar que el formulario de postulación siempre envía estos campos

---

## 📊 Métricas y KPIs

### **Dashboard Metrics**

1. **Total Postulaciones**: Todas las aplicaciones históricas
2. **Pendientes**: Esperando revisión (automática o manual)
3. **Aprobadas**: Usuarios ya en grupo SPEAKERS
4. **Rechazadas**: Con feedback personalizado

### **Tiempo de Respuesta**

- **Aprobación automática**: 5 minutos después de aplicar
- **Aprobación manual**: Inmediata (< 1 segundo)
- **Rechazo manual**: Inmediato (< 1 segundo)

### **Emails Enviados**

- **Por aplicación aprobada**: 2 emails (confirmación + aprobación)
- **Por aplicación rechazada**: 2 emails (confirmación + rechazo)
- **Tasa de entrega**: 99%+ (con SES en producción)

---

## 🚀 Próximas Mejoras

### **Fase 4.1: Notificaciones en Tiempo Real**
- WebSocket para notificar admins de nuevas postulaciones
- Badge con contador en icono del panel admin

### **Fase 4.2: Analytics y Reportes**
- Gráficos con Recharts: Tendencias mensuales
- Exportar a CSV: Lista completa de postulaciones
- Filtros avanzados: Por rango de fechas, temas específicos

### **Fase 4.3: Comentarios de Admin**
- Agregar notas internas a cada postulación
- Historial de acciones: Quién aprobó/rechazó y cuándo

### **Fase 4.4: Bulk Actions**
- Aprobar/Rechazar múltiples postulaciones a la vez
- Plantillas de razones de rechazo predefinidas

---

## 📚 Referencias

- [SPEAKER_WORKFLOW_TECHNICAL.md](./SPEAKER_WORKFLOW_TECHNICAL.md) - Documentación del workflow automático
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon SES Developer Guide](https://docs.aws.amazon.com/ses/)
- [AWS Cognito Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## 👥 Roles y Permisos

| Rol | Permisos | Puede acceder a |
|-----|----------|-----------------|
| **ADMIN** | Todos | Panel admin, ver/aprobar/rechazar postulaciones |
| **SPEAKER** | Propias postulaciones | Ver su propia aplicación, no puede crear otra |
| **MEMBER** | Crear postulación | Formulario de aplicación, ver su status |
| **Público** | Ninguno | Login requerido |

---

## ✅ Checklist de Deploy

- [x] Backend: 2 Lambdas creadas y configuradas
- [x] Backend: Permisos IAM agregados
- [x] Backend: Variables de entorno establecidas
- [x] Frontend: 3 componentes de admin creados
- [x] Frontend: Página /admin/speakers creada
- [x] Frontend: Link en Navigation agregado
- [x] Middleware: Protección de rutas verificada
- [x] GraphQL: Autorización de ADMINS configurada
- [ ] Testing: Login como admin y verificar acceso
- [ ] Testing: Aprobar una postulación manualmente
- [ ] Testing: Rechazar una postulación con razón
- [ ] Testing: Verificar emails recibidos
- [ ] Testing: Verificar DynamoDB y Cognito
- [ ] Production: Solicitar acceso SES fuera de sandbox
- [ ] Production: Configurar dominio personalizado
- [ ] Production: Configurar alertas de CloudWatch

---

**Última actualización**: Noviembre 26, 2025  
**Autor**: AWS User Group Puebla Dev Team  
**Versión**: 1.0.0
