# Diseño - Sistema de Check-in para Eventos

## Overview

El sistema de check-in se integrará con la arquitectura existente de Next.js + AWS Amplify, reutilizando los modelos de datos ya definidos (EventRegistration) y complementando las páginas existentes. Se implementará usando tecnologías web estándar para máxima compatibilidad móvil.

## Architecture

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   QR Ticket     │  │   QR Scanner    │  │  Manual Check   │ │
│  │   (Usuario)     │  │    (Admin)      │  │     (Admin)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Amplify DataStore (Existing)               │
├─────────────────────────────────────────────────────────────┤
│                    AWS Backend                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   DynamoDB      │  │   API Gateway   │  │   Lambda        │ │
│  │ EventRegistration│  │   (Existing)    │  │  (Existing)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Generación QR**: Ya implementado en `/events/[slug]/register`
2. **Visualización QR**: Nueva funcionalidad en `/events/[slug]`
3. **Scanner QR**: Nueva página `/admin/events/[id]/checkin`
4. **Actualización Estado**: Usar Amplify DataStore existente
5. **Sincronización**: LocalStorage + Amplify sync

## Components and Interfaces

### 1. QR Ticket Component (`/components/events/QRTicket.tsx`)

**Propósito**: Mostrar el código QR del usuario para un evento específico

```typescript
interface QRTicketProps {
  eventId: string;
  userId: string;
  qrToken: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  userName: string;
}
```

**Funcionalidades**:
- Generar QR visual usando `qrious` library
- Mostrar información del evento y usuario
- Botón de descarga como PNG
- Diseño responsive y optimizado para móvil
- Validación de expiración del token

### 2. QR Scanner Component (`/components/admin/QRScanner.tsx`)

**Propósito**: Escanear códigos QR y procesar check-ins

```typescript
interface QRScannerProps {
  eventId: string;
  onCheckIn: (registration: EventRegistration) => void;
  onError: (error: string) => void;
}
```

**Funcionalidades**:
- Activar cámara usando `qr-scanner` library
- Validar tokens QR escaneados
- Feedback visual y sonoro
- Modo offline con localStorage
- Contador en tiempo real

### 3. Manual Check-in Component (`/components/admin/ManualCheckIn.tsx`)

**Propósito**: Búsqueda y check-in manual de asistentes

```typescript
interface ManualCheckInProps {
  eventId: string;
  attendees: AttendeeWithDetails[];
  onCheckIn: (registrationId: string) => void;
}
```

**Funcionalidades**:
- Búsqueda por nombre/email
- Lista filtrable de asistentes
- Check-in con un clic
- Indicadores de estado

### 4. Offline Sync Manager (`/lib/offline-sync.ts`)

**Propósito**: Manejar sincronización offline

```typescript
interface OfflineCheckIn {
  id: string;
  eventId: string;
  qrToken: string;
  timestamp: string;
  method: 'QR_SCAN' | 'MANUAL';
  adminId: string;
}

class OfflineSyncManager {
  storeCheckIn(checkIn: OfflineCheckIn): void
  syncPendingCheckIns(): Promise<SyncResult[]>
  getPendingCount(): number
}
```

## Data Models

### Existing EventRegistration (No changes needed)

```typescript
EventRegistration {
  id: string
  eventId: string
  userId: string
  status: 'GOING' | 'NOT_GOING' | 'INVITED' | 'WAITLIST'
  checkedIn: boolean
  checkedInAt: datetime
  checkedInBy: string
  checkInMethod: 'QR_SCAN' | 'MANUAL' | 'SELF_CHECKIN'
  qrCodeToken: string
  // ... otros campos existentes
}
```

### QR Token Structure

```typescript
interface QRTokenData {
  eventId: string;
  userId: string;
  registrationId: string;
  timestamp: number;
  signature: string; // Para validación
}
```

## Error Handling

### QR Validation Errors

1. **Token Expirado**: Mostrar mensaje con opción de regenerar
2. **Token Inválido**: Indicar que el QR no es válido
3. **Ya Usado**: Mostrar información del check-in previo
4. **Evento Incorrecto**: Indicar el evento correcto del QR

### Network Errors

1. **Sin Conexión**: Activar modo offline automáticamente
2. **Sync Fallido**: Mostrar lista de registros pendientes
3. **Conflictos**: Priorizar primer check-in registrado

### Camera Errors

1. **Sin Permisos**: Guía para habilitar cámara
2. **No Disponible**: Fallback a check-in manual
3. **Error Técnico**: Reintentar con botón

## Testing Strategy

### Unit Tests

1. **QR Generation**: Validar formato y contenido del token
2. **QR Validation**: Probar casos de tokens válidos/inválidos
3. **Offline Sync**: Verificar almacenamiento y sincronización
4. **Manual Check-in**: Validar búsqueda y filtros

### Integration Tests

1. **End-to-End Flow**: Registro → QR → Scanner → Check-in
2. **Offline Scenario**: Check-in sin conexión + sync
3. **Multiple Admins**: Concurrencia en check-ins
4. **Error Recovery**: Manejo de errores de red

### E2E Tests

1. **Mobile Experience**: Probar en dispositivos móviles reales
2. **Camera Integration**: Verificar funcionamiento de cámara
3. **Performance**: Tiempo de respuesta del scanner
4. **Cross-browser**: Compatibilidad en diferentes navegadores

## Implementation Plan

### Phase 1: Core QR Functionality
- Instalar librerías necesarias (`qrious`, `qr-scanner`)
- Implementar QRTicket component
- Modificar página de evento para mostrar "Mi Ticket"
- Crear página básica de scanner

### Phase 2: Scanner Implementation
- Implementar QRScanner component
- Crear página `/admin/events/[id]/checkin`
- Integrar con EventRegistration model
- Añadir feedback visual/sonoro

### Phase 3: Manual Check-in
- Implementar ManualCheckIn component
- Integrar búsqueda de asistentes
- Conectar con lista existente de attendees

### Phase 4: Offline Support
- Implementar OfflineSyncManager
- Añadir localStorage para check-ins
- Crear UI para sync status
- Manejar conflictos de sincronización

### Phase 5: Polish & Testing
- Optimizar performance móvil
- Añadir animaciones y micro-interacciones
- Tests comprehensivos
- Documentación de usuario

## Security Considerations

### QR Token Security
- Tokens incluyen signature criptográfica
- Expiración automática (24h post-evento)
- Validación server-side de todos los tokens
- Rate limiting en endpoints de check-in

### Admin Access Control
- Verificar permisos de admin en cada operación
- Audit log de todos los check-ins manuales
- Session timeout para páginas de admin
- HTTPS obligatorio para scanner

### Data Privacy
- No almacenar datos biométricos
- Minimizar datos en localStorage offline
- Limpiar datos offline después de sync
- Cumplir con políticas de retención existentes