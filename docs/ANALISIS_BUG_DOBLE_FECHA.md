# 🐛 ANÁLISIS COMPLETO: Bug de Doble Fecha Ocupada

**Fecha**: 22 Diciembre 2025  
**Severidad**: 🔴 CRÍTICA  
**Estado**: ROOT CAUSE IDENTIFICADO

---

## 🎯 RESUMEN EJECUTIVO

**Síntoma**: Cuando un admin cambia la fecha en el wizard, aparecen DOS fechas ocupadas:
- Fecha original (del SpeakerApplication): "Reservada"
- Fecha nueva (del Event): "Ocupada"

**Root Cause Identificado**:
1. Lambda `manual-approve-speaker` crea `TalkProposal` con la fecha ORIGINAL del attachedProposal
2. SpeakerApplication cambia de `PENDING` → `APPROVED` (ya no se cuenta en DateSelector)
3. TalkProposal queda con fecha VIEJA y status `PENDING`
4. Event se crea con fecha NUEVA
5. DateSelector ve TalkProposal (fecha vieja) + Event (fecha nueva) = 2 fechas ocupadas

---

## 📊 FLUJO ACTUAL (CON BUG)

```
Usuario aplica speaker con fecha: 2026-01-29
↓
SpeakerApplication creada (status: PENDING, attachedProposal.proposedDate: 2026-01-29)
↓
Admin clickea "Aprobar Todo"
↓
Lambda manual-approve-speaker:
  - Cambia SpeakerApplication → APPROVED ✅
  - Crea TalkProposal con proposedDate: 2026-01-29 ❌ (PROBLEMA 1)
  - TalkProposal.status = PENDING
↓
Admin abre wizard, cambia fecha a 2026-02-26
↓
API create-and-publish-event:
  - Crea Event con startDate: 2026-02-26 ✅
  - Actualiza TalkProposal → status: EVENT_CREATED ✅
  - Intenta actualizar SpeakerApplication.attachedProposal ❌ (PROBLEMA 2: demasiado tarde)
↓
RESULTADO EN DB:
  - SpeakerApplication: APPROVED, attachedProposal.proposedDate: 2026-02-26 (actualizado)
  - TalkProposal: EVENT_CREATED, proposedDate: 2026-01-29 ❌❌❌ (NUNCA SE ACTUALIZA)
  - Event: PUBLISHED, startDate: 2026-02-26 ✅
↓
DateSelector:
  - SpeakerApplication: NO SE CUENTA (status = APPROVED, solo cuenta PENDING)
  - TalkProposal: SE CUENTA (status = EVENT_CREATED, proposedDate = 2026-01-29) ❌
  - Event: SE CUENTA (startDate = 2026-02-26) ✅
  = 2 fechas marcadas como ocupadas
```

---

## 🔍 COMPONENTES INVOLUCRADOS

### 1. **DateSelector.tsx**
**Responsabilidad**: Marcar fechas ocupadas

**Lógica actual**:
```typescript
// TalkProposal: Cuenta PENDING, APPROVED, EVENT_CREATED
const proposalsWithDate = allProposals?.filter(p => 
  p.proposedDate && 
  (p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'EVENT_CREATED') &&
  p.id !== currentProposalId
) || [];

// SpeakerApplication: Solo cuenta PENDING
const applicationsWithDate = allApplications?.filter(app => {
  const proposal = JSON.parse(app.attachedProposal);
  return proposal.proposedDate && app.status === 'PENDING'; // ❌ PROBLEMA
}) || [];

// Event: Cuenta todos
const existingEvent = events?.find(event => isSameDay(event.startDate, thursday));
```

**❌ Inconsistencia #1**: 
- TalkProposal cuenta 3 status (PENDING, APPROVED, EVENT_CREATED)
- SpeakerApplication solo cuenta 1 status (PENDING)
- Cuando se aprueba, SpeakerApplication desaparece pero TalkProposal aparece

---

### 2. **Lambda: manual-approve-speaker/handler.ts**
**Responsabilidad**: Aprobar speaker y crear TalkProposal

**Lógica actual**:
```typescript
async function createTalkProposalFromAttached() {
  await docClient.send(new PutCommand({
    TableName: talkProposalTableName,
    Item: {
      // ...
      title: attachedProposal.talkTitle,
      proposedDate: attachedProposal.proposedDate || null, // ❌ USA FECHA ORIGINAL
      status: 'PENDING',
      // ...
    },
  }));
}
```

**❌ Problema #2**: 
- TalkProposal se crea con la fecha ORIGINAL del attachedProposal
- Esta fecha NUNCA se actualiza cuando el admin cambia la fecha en el wizard
- TalkProposal queda con fecha vieja PERMANENTEMENTE

---

### 3. **API: create-and-publish-event/route.ts**
**Responsabilidad**: Crear Event y actualizar referencias

**Lógica actual**:
```typescript
// Crea Event con fecha NUEVA
const eventData = {
  startDate: eventDateTime, // ✅ Fecha nueva del wizard
  // ...
};

// Actualiza TalkProposal → EVENT_CREATED
await client.models.TalkProposal.update({
  id: talkProposalId,
  status: 'EVENT_CREATED',
  eventId: event.id,
  // ❌ NO ACTUALIZA proposedDate
});

// Intenta actualizar SpeakerApplication
if (speakerApplicationId) {
  const updatedProposal = {
    ...attachedProposal,
    proposedDate: eventDateTime, // ✅ Actualiza attachedProposal
  };
  await client.models.SpeakerApplication.update({
    id: speakerApplicationId,
    attachedProposal: JSON.stringify(updatedProposal),
  });
}
```

**❌ Problema #3**:
- SpeakerApplication SÍ se actualiza (pero ya no importa porque está APPROVED)
- TalkProposal NO se actualiza con la nueva fecha
- TalkProposal queda con fecha vieja pero status EVENT_CREATED
- DateSelector ve TalkProposal (fecha vieja) + Event (fecha nueva)

---

## 🎯 SOLUCIONES PROPUESTAS

### **SOLUCIÓN 1: Actualizar TalkProposal.proposedDate** ⭐ RECOMENDADA
**Complejidad**: Baja  
**Impacto**: Bajo  
**Efectividad**: Alta

```typescript
// En create-and-publish-event/route.ts
await client.models.TalkProposal.update({
  id: talkProposalId,
  status: 'EVENT_CREATED',
  eventId: event.id,
  proposedDate: eventDateTime, // ✅ AGREGAR ESTO
  updatedAt: now,
});
```

**Ventajas**:
- Fix simple, una línea
- No rompe nada existente
- Mantiene consistencia de datos

**Desventajas**:
- No previene el problema en el futuro si hay otros flujos

---

### **SOLUCIÓN 2: No crear TalkProposal hasta wizard**
**Complejidad**: Alta  
**Impacto**: Alto  
**Efectividad**: Alta

Cambiar arquitectura para no crear TalkProposal en la Lambda, solo crear cuando se completa wizard.

**Ventajas**:
- Elimina duplicación de datos
- TalkProposal siempre tiene fecha correcta

**Desventajas**:
- Requiere refactor grande
- Puede romper flujos existentes
- No es urgente para fix inmediato

---

### **SOLUCIÓN 3: DateSelector solo cuenta EVENT_CREATED con eventId**
**Complejidad**: Media  
**Impacto**: Medio  
**Efectividad**: Media

```typescript
// Solo contar TalkProposals que NO tengan evento creado
const proposalsWithDate = allProposals?.filter(p => 
  p.proposedDate && 
  (p.status === 'PENDING' || p.status === 'APPROVED') && // ❌ Quitar EVENT_CREATED
  !p.eventId && // ❌ Si tiene eventId, que el Event lo cuente
  p.id !== currentProposalId
) || [];
```

**Ventajas**:
- Evita duplicación en DateSelector
- Event se convierte en source of truth

**Desventajas**:
- No arregla la inconsistencia de datos
- TalkProposal sigue con fecha vieja en DB

---

## ✅ PLAN DE ACCIÓN RECOMENDADO

### **FASE 1: Fix Inmediato (5 minutos)**
1. Agregar `proposedDate: eventDateTime` al update de TalkProposal
2. Desplegar y verificar

### **FASE 2: Mejora DateSelector (10 minutos)**
1. Cambiar filtro para no contar TalkProposal con EVENT_CREATED si tiene eventId
2. Esto evita contar duplicados incluso si hay inconsistencia

### **FASE 3: Limpieza de Datos (Una vez)**
1. Script para actualizar TalkProposals existentes con fecha incorrecta
2. Comparar TalkProposal.proposedDate vs Event.startDate
3. Actualizar los que no coincidan

---

## 📝 INCONSISTENCIAS ENCONTRADAS

### 1. **Status Filtering Inconsistente**
- TalkProposal: 3 status (PENDING, APPROVED, EVENT_CREATED)
- SpeakerApplication: 1 status (PENDING)
- Lógica: ¿Por qué diferentes criterios?

### 2. **Duplicación de Fecha en 3 Lugares**
- SpeakerApplication.attachedProposal.proposedDate
- TalkProposal.proposedDate
- Event.startDate
- Riesgo: Sincronización manual, errores humanos

### 3. **Updates Parciales**
- API actualiza SpeakerApplication ✅
- API actualiza TalkProposal.status ✅
- API NO actualiza TalkProposal.proposedDate ❌

### 4. **Source of Truth Ambiguo**
- ¿Qué es la fecha correcta?
- SpeakerApplication está APPROVED (no se cuenta)
- TalkProposal tiene fecha vieja
- Event tiene fecha correcta
- **Recomendación**: Event debería ser source of truth

---

## 🎓 LECCIONES APRENDIDAS

1. **Duplicación de datos es peligrosa**: 3 lugares con la misma fecha = 3x probabilidad de desincronización

2. **Status transitions inconsistentes**: Diferentes criterios de filtrado causan bugs sutiles

3. **Updates deben ser atómicos**: Si cambias fecha en un lugar, cambiar en TODOS o en ninguno

4. **Source of Truth claro**: Event es el que se publica, debería ser la única fuente de verdad

5. **Testing de flujos completos**: Tests unitarios no capturan bugs de sincronización multi-tabla

---

## 🚀 IMPLEMENTACIÓN DEL FIX

Ver cambios en:
- `src/app/api/admin/create-and-publish-event/route.ts`
- `src/components/common/DateSelector.tsx`

**Testing checklist**:
- [ ] Usuario aplica con fecha X
- [ ] Admin aprueba y cambia a fecha Y en wizard
- [ ] Verificar DB: TalkProposal.proposedDate = Y
- [ ] Verificar DB: Event.startDate = Y
- [ ] Verificar UI: Solo fecha Y aparece ocupada
- [ ] Verificar UI: Fecha X aparece disponible
