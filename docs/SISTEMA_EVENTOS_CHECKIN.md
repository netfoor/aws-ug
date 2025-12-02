# 📅 Sistema de Eventos y Check-In - Especificación Técnica

## 🎯 Visión General

Crear un sistema de eventos inspirado en **Luma**, priorizando simplicidad y UX fluida tanto para admins como para usuarios. La magia del sistema: **reutilizar datos existentes de postulaciones** - sin duplicar información.

---

## 👥 Roles y Permisos

### 🔧 Admin
- Crear eventos (desde cero o desde postulación aprobada)
- Gestionar eventos (editar, cancelar, republicar)
- Check-in de asistentes (manual o QR scan)
- Ver listas: Going, Checked In, Invited, Not Going
- Invitar usuarios
- Ver analytics del evento

### 🎤 Speaker (Postulante Aprobado)
- Ver sus charlas programadas
- Compartir evento
- Ver lista de asistentes (solo Going/Checked In)

### 👤 Member (Usuario Regular)
- Ver eventos públicos
- Register (confirmar asistencia)
- Contact (contactar organizador)
- Share (compartir evento)
- Ver sus eventos registrados

---

## ⚠️ Separación de Flujos

### **Flujo A: Ser Speaker** (Ya existe ✅)
```
Usuario → SpeakerApplication → Admin aprueba → 
Usuario obtiene rol SPEAKER → Parte de la comunidad
```

### **Flujo B: Proponer Charla** (Nuevo 🆕)
```
Speaker → TalkProposal → Admin revisa → 
Admin crea Event desde propuesta → Evento publicado
```

**NO se mezclan:** SpeakerApplication es para unirse a la comunidad, TalkProposal es para proponer charlas específicas.

---

## 🗄️ Modelo de Datos

### **TalkProposal** (Nuevo modelo - Fase 0)
```typescript
TalkProposal {
  id: string (PK)
  userId: string (solo usuarios con rol SPEAKER pueden crear)
  speakerName: string
  speakerEmail: string
  
  // Propuesta de charla
  title: string
  description: string
  topics: string[]
  duration: number (minutos: 15, 30, 45, 60)
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL'
  requiredEquipment?: string[] (proyector, micrófono, etc)
  additionalNotes?: string
  
  // Estado
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EVENT_CREATED'
  
  // Vinculación con evento (cuando admin lo crea)
  eventId?: string
  
  // Review del admin
  reviewedBy?: string (userId del admin)
  reviewedAt?: string
  rejectionReason?: string
  adminNotes?: string
  
  // Metadata
  submittedAt: string
  updatedAt: string
  owner: string
}
```

### **Event** (Nuevo modelo - Fase 1)
```typescript
Event {
  id: string (PK)
  title: string
  description: string
  slug: string (unique, para URLs bonitas)
  
  // Vinculación con Talk Proposal (si se creó desde propuesta)
  talkProposalId?: string
  speakerId: string
  speakerName: string
  speakerEmail: string
  speakerBio?: string
  
  // Detalles del evento
  eventType: 'TALK' | 'WORKSHOP' | 'MEETUP' | 'NETWORKING'
  topics: string[] (heredados de postulación o custom)
  
  // Fecha y ubicación
  startDate: string (ISO)
  endDate: string (ISO)
  timezone: string
  location: string
  isVirtual: boolean
  virtualLink?: string (Zoom, Meet, etc.)
  
  // Capacidad
  maxAttendees?: number
  isUnlimited: boolean
  
  // Visibilidad
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
  isPublic: boolean
  requiresApproval: boolean (para eventos privados)
  
  // Media
  coverImage?: string (S3 URL)
  
  // Metadata
  createdBy: string (userId del admin)
  createdAt: string
  updatedAt: string
  publishedAt?: string
  
  // Stats (calculadas)
  goingCount: number
  checkedInCount: number
  invitedCount: number
}
```

### **EventRegistration** (Nuevo modelo)
```typescript
EventRegistration {
  id: string (PK)
  eventId: string (GSI)
  userId: string (GSI)
  
  // Estado del registro
  status: 'GOING' | 'NOT_GOING' | 'INVITED' | 'WAITLIST'
  
  // Check-in
  checkedIn: boolean
  checkedInAt?: string
  checkedInBy?: string (userId del admin que hizo check-in)
  checkInMethod?: 'QR_SCAN' | 'MANUAL' | 'SELF_CHECKIN'
  
  // QR Code
  qrCodeToken: string (unique, para validar check-in)
  
  // Metadata
  registeredAt: string
  invitedBy?: string (userId)
  cancelledAt?: string
  
  // Datos del usuario (desnormalizados para queries rápidas)
  userName: string
  userEmail: string
  userAvatar?: string
}
```

### **Relación con SpeakerApplication**
Cuando un admin aprueba una postulación, puede:
1. Solo aprobar (como ahora)
2. **Aprobar + Crear Evento** (nuevo flujo)

Si elige crear evento, el sistema:
- Pre-llena título, descripción, topics desde la postulación
- Vincula `speakerApplicationId` al evento
- Copia datos del speaker
- Admin solo ajusta fecha, ubicación, capacidad

---

## 🎨 Flujos de Usuario

### 📝 **Flujo 1: Crear Evento desde Postulación (Admin)**

```
1. Admin ve postulación pendiente
2. Click "Aprobar + Crear Evento"
3. Modal pre-llenado:
   ✅ Título: motivación del speaker
   ✅ Descripción: experience + previous talks
   ✅ Topics: topics de la postulación
   ✅ Speaker: nombre + email
   📅 Fecha: [Admin selecciona]
   📍 Ubicación: [Admin selecciona]
   👥 Capacidad: [Admin selecciona]
   🖼️ Cover: [Admin sube opcional]
4. Click "Crear Evento"
5. Animación: "🎉 Evento creado!"
6. Opciones:
   - Ver página del evento
   - Invitar asistentes
   - Volver al dashboard
```

### 📅 **Flujo 2: Crear Evento desde Cero (Admin)**

```
1. Admin → Dashboard → "Crear Evento"
2. Formulario limpio (sin pre-llenar)
3. Mismos campos que Flujo 1
4. Mismo resultado
```

### 🎟️ **Flujo 3: Usuario ve Evento (Member)**

```
1. Home → Lista de eventos próximos
2. Click en evento → Página del evento
3. Ve:
   - Cover image
   - Título + Descripción
   - Speaker (nombre, bio)
   - Fecha + Ubicación
   - Topics
   - Going count
4. Botones:
   - 🎯 Register (confirmar asistencia)
   - 💬 Contact (enviar mensaje al organizador)
   - 🔗 Share (copiar link, redes sociales)
```

### ✅ **Flujo 4: Check-In (Admin en el evento)**

```
1. Admin → Evento → "Check In"
2. Interfaz con 2 pestañas:
   
   📋 LIST:
   - Buscar por nombre/email
   - Ver lista Going/Invited
   - Click en nombre → Marcar como Checked In
   - Estado en tiempo real
   
   📱 SCAN:
   - Cámara activa
   - Usuario muestra QR desde su app/email
   - Scan automático
   - ✅ Animación de éxito + nombre
   - ❌ Error si no registrado o ya checked in
```

### 📊 **Flujo 5: Gestión de Listas (Admin)**

```
Pestañas en página del evento:

📍 Going (23)
- Lista de confirmados
- Botón "Check In" por usuario
- Export CSV

✅ Checked In (15)
- Lista de asistentes presentes
- Timestamp de check-in
- Método (QR/Manual)

📧 Invited (45)
- Lista de invitados que no confirmaron
- Botón "Enviar recordatorio"

❌ Not Going (5)
- Lista de cancelaciones
- Razón (opcional)
```

---

## 🛠️ Stack Técnico Propuesto

### Backend (AWS Amplify Gen 2)

**Nuevos Modelos:**
```typescript
// amplify/data/resource.ts
Event: a.model({
  // campos arriba definidos
})
.authorization([
  a.allow.authenticated().to(['read']),
  a.allow.groups(['ADMINS']).to(['create', 'update', 'delete'])
])

EventRegistration: a.model({
  // campos arriba definidos
})
.authorization([
  a.allow.owner(),
  a.allow.groups(['ADMINS'])
])
```

**Nuevas Lambdas:**
1. `create-event-from-application`: 
   - Trigger: Manual (desde admin panel)
   - Crea Event + actualiza SpeakerApplication

2. `register-for-event`:
   - Trigger: API call
   - Crea EventRegistration + genera QR token
   - Envía email con QR code

3. `checkin-attendee`:
   - Trigger: API call (QR scan o manual)
   - Valida token/userId
   - Actualiza EventRegistration
   - Incrementa Event.checkedInCount

4. `send-event-invitations`:
   - Trigger: Manual (admin invita usuarios)
   - Crea EventRegistration con status INVITED
   - Envía email de invitación

### Frontend (Next.js 14)

**Nuevas Páginas:**
```
/events                    → Lista pública de eventos
/events/[slug]             → Detalle de evento (público)
/events/[slug]/manage      → Gestión (admin only)
/events/[slug]/checkin     → Check-in interface (admin only)
/admin/events              → Dashboard de eventos (admin)
/admin/events/new          → Crear evento (admin)
/admin/events/[id]/edit    → Editar evento (admin)
/profile/my-events         → Mis eventos registrados (member)
```

**Nuevos Componentes:**
```
components/events/
  ├── EventCard.tsx              → Card de evento (para lista)
  ├── EventDetail.tsx            → Página completa del evento
  ├── EventForm.tsx              → Formulario crear/editar
  ├── EventStats.tsx             → Estadísticas (going, checked in)
  ├── RegisterButton.tsx         → Botón de registro
  ├── ShareEventButton.tsx       → Botón compartir
  ├── CheckInInterface.tsx       → Interfaz List/Scan
  ├── QRScanner.tsx              → Scanner de QR
  ├── AttendeeList.tsx           → Lista de asistentes
  └── AttendeeListTabs.tsx       → Pestañas (Going/Checked/Invited/Not)
```

### Librerías Necesarias

**QR Code:**
```bash
npm install qrcode react-qr-code
npm install html5-qrcode  # Para scan con cámara
```

**Manejo de Fechas:**
```bash
npm install date-fns date-fns-tz
```

**Compartir en Redes:**
```bash
npm install react-share
```

**Camera/Media:**
```bash
# Ya incluido en navegadores modernos (MediaDevices API)
```

---

## 📋 Plan de Implementación (Fases)

### **Fase 0: Separar Flujos - TalkProposal** (2-3 horas) ⬅️ EMPEZAMOS AQUÍ
- [ ] Crear modelo `TalkProposal` en data/resource.ts
- [ ] Authorization rules (speakers pueden crear, admins pueden ver todas)
- [ ] Página `/speaker/propose-talk` (formulario para speakers)
- [ ] Validación: solo usuarios con rol SPEAKER pueden acceder
- [ ] Página `/admin/talk-proposals` (lista para admins)
- [ ] Componente lista con estados (Pending/Approved/Rejected)
- [ ] Botón "Aprobar" y "Rechazar" con modal de razón
- [ ] Deploy y test en sandbox
- [ ] **NO tocar** SpeakerApplication - se mantiene igual

### **Fase 1: Modelos de Eventos** (2-3 horas)
- [ ] Crear modelos Event y EventRegistration
- [ ] Configurar authorization rules
- [ ] Crear Lambda `create-event-from-proposal` (desde TalkProposal)
- [ ] Crear Lambda `register-for-event`
- [ ] Deploy y test en sandbox

### **Fase 2: Crear Eventos (Admin)** (3-4 horas)
- [ ] Página `/admin/events/new`
- [ ] Formulario EventForm con validaciones
- [ ] Integración con SpeakerApplication (modal "Aprobar + Crear Evento")
- [ ] Pre-llenado de datos desde postulación
- [ ] Upload de cover image a S3
- [ ] Animación de creación exitosa

### **Fase 3: Vista Pública de Eventos** (2-3 horas)
- [ ] Página `/events` - Lista de eventos
- [ ] EventCard component (responsive)
- [ ] Página `/events/[slug]` - Detalle
- [ ] EventDetail component
- [ ] Botón Register
- [ ] Botón Share
- [ ] Botón Contact

### **Fase 4: Registro de Asistentes** (3-4 horas)
- [ ] Flujo de registro (Register button)
- [ ] Generación de QR code único
- [ ] Email de confirmación con QR
- [ ] Lambda `register-for-event`
- [ ] Página `/profile/my-events`
- [ ] Mostrar QR code en perfil

### **Fase 5: Check-In Interface** (4-5 horas)
- [ ] Página `/events/[slug]/checkin` (admin only)
- [ ] CheckInInterface con pestañas List/Scan
- [ ] Lista de asistentes (buscar, filtrar)
- [ ] QRScanner component
- [ ] Lambda `checkin-attendee`
- [ ] Validación de QR token
- [ ] Animaciones de éxito/error
- [ ] Estado en tiempo real (polling o WebSocket)

### **Fase 6: Gestión de Listas** (2-3 horas)
- [ ] AttendeeListTabs component
- [ ] Pestañas: Going/Checked In/Invited/Not Going
- [ ] Check-in manual desde lista
- [ ] Export a CSV
- [ ] Enviar recordatorios
- [ ] Analytics básicos

### **Fase 7: Features Avanzados** (Futuro)
- [ ] Invitaciones masivas
- [ ] Waitlist cuando evento lleno
- [ ] Eventos privados con aprobación
- [ ] Eventos recurrentes
- [ ] Integración con calendario (iCal)
- [ ] Notificaciones push (recordatorios)
- [ ] Check-in geolocalizado
- [ ] Feedback post-evento

---

## 🎯 Prioridades Inmediatas

### ✅ **Empezar por:**

1. **Modelos de datos** (Base sólida)
2. **Crear evento desde postulación** (Flujo clave que diferencia el sistema)
3. **Vista pública** (Para validar UX)
4. **Check-in básico** (Core feature)

### 🔄 **Iteración:**
- Implementar features progresivamente
- Testear cada fase en sandbox
- Feedback temprano de UX
- Ajustar según uso real

---

## 💡 Ventajas vs Luma

1. ✅ **Datos pre-existentes**: No duplicar información de speakers
2. ✅ **Flujo unificado**: Postulación → Aprobación → Evento → Check-in
3. ✅ **Comunidad integrada**: Usuarios ya tienen perfil con intereses
4. ✅ **Zero-setup**: Speakers no configuran nada, admin lo hace
5. ✅ **Analytics built-in**: Conocemos intereses, historial, engagement

---

## 🚀 Siguiente Paso

**¿Empezamos con Fase 1 (Modelos y Backend)?**

Esto nos da la base de datos sólida y podemos iterar rápido en frontend después.

¿O prefieres ajustar algo de esta especificación primero?
