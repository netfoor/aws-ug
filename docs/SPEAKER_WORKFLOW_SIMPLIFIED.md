# 🎤 Speaker Workflow - Flujo Simplificado

## 📋 Resumen

Flujo directo sin EventBridge Scheduler ni auto-aprobaciones:
**Frontend → DynamoDB → Admin Manual Review**

## 🔄 Flujo Completo

### 1. **Usuario aplica como Speaker**
- **Página:** `/speaker/apply`
- **Formulario:** Unificado (datos personales + speaker + propuesta de charla)
- **Resultado:** Registro en `SpeakerApplication` con `attachedProposal`

### 2. **Admin revisa aplicaciones**
- **Página:** `/admin/speakers`
- **Componentes:** `SpeakerApplicationsList` + `SpeakerApplicationDetail`
- **Vista:** Muestra datos profesionales + propuesta de charla adjunta
- **Acciones:** Aprobar o Rechazar

### 3. **Aprobación/Rechazo**
- **Lambda:** `manual-approve-speaker` o `reject-speaker-application`
- **Resultado Aprobación:** 
  - Actualiza status en DynamoDB
  - Agrega usuario a grupo Cognito "SPEAKERS"
  - Actualiza role en User table
  - Envía email de notificación
  - **🆕 AUTOMÁTICO:** Crea `TalkProposal` desde `attachedProposal`
  - Crea notificación in-app con link a propuesta

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    DynamoDB     │    │   Admin Panel   │
│  /speaker/apply │───▶│SpeakerApplication│◀───│ /admin/speakers │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ attachedProposal│    │ manual-approve- │
                       │    (JSON)       │    │   speaker       │
                       └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  TalkProposal   │
                                              │  (automática)   │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Admin Review    │
                                              │ Talk Proposals  │
                                              └─────────────────┘
```

## 🗂️ Estructura de Datos

### SpeakerApplication
```typescript
{
  userId: string;
  email: string;
  motivation: string;
  experience: string;
  topics: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hasAttachedProposal: true;
  attachedProposal: string; // JSON con datos de charla
  professionalProfile: string; // JSON con datos profesionales
}
```

### attachedProposal (JSON)
```typescript
{
  talkTitle: string;
  talkDescription: string;
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate: string; // ISO date
}
```

## 🚀 Ventajas del Flujo Simplificado

✅ **Menos complejidad** - Sin EventBridge Scheduler
✅ **Más control** - Admin decide cuándo aprobar
✅ **Mejor UX** - Formulario unificado (speaker + charla)
✅ **Menos costos** - Menos Lambdas y servicios
✅ **Más mantenible** - Código más simple

## 🔧 Componentes Activos

### Lambdas
- ✅ `manual-approve-speaker` - Aprobación manual
- ✅ `reject-speaker-application` - Rechazo manual
- ✅ `create-event-from-proposal` - Crear evento desde propuesta
- ✅ `notify-admins-new-proposal` - Notificar admins

### Frontend
- ✅ `/speaker/apply` - Formulario unificado
- ✅ `/admin/speakers` - Panel de administración
- ✅ `UnifiedSpeakerProposalForm` - Componente principal

### Removido (Legacy)
- ❌ `process-speaker-application` - Auto-procesamiento
- ❌ `approve-speaker-application` - Auto-aprobación
- ❌ EventBridge Scheduler - Delay de 5 minutos
- ❌ DynamoDB Streams - Triggers automáticos