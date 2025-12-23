# 📋 PLAN DE CORRECCIÓN - Problemas Identificados en Sistema de Eventos

**Fecha**: 22 de Diciembre 2025  
**Estado**: Análisis completo - Pendiente de implementación  
**Prioridad**: ALTA - Bugs críticos en producción

---

## 🎯 RESUMEN EJECUTIVO

Se identificaron **9 problemas críticos** en el sistema que afectan:
- ✅ Gestión de archivos en S3 (uploads prematuros, archivos huérfanos)
- ✅ Validación de fechas (zonas horarias, fechas ocupadas)
- ✅ UX (botones redundantes, duración de charlas)
- ✅ Permisos de archivos (Error 403)

**Impacto**: Usuarios confundidos, basura en S3, pérdida de datos, conflictos de fechas

---

## 🚨 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Uploads a S3 Prematuros - Fotos**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: `CoverImageUpload.tsx`

**Descripción**:
- Las fotos se suben a S3 **inmediatamente** al seleccionar el archivo
- Esto ocurre incluso si el usuario no confirma el formulario
- Si el usuario cambia de opinión o cierra el navegador, el archivo queda huérfano en S3

**Evidencia**:
```typescript
// CoverImageUpload.tsx línea 128
if (autoUpload && eventId) {
  await uploadImage(optimized); // ❌ Sube antes de confirmar
}
```

**Archivos afectados**:
- `src/components/common/CoverImageUpload.tsx`
- `src/app/admin/events/new/page.tsx`
- `src/app/admin/events/[id]/edit/page.tsx`

**Impacto**:
- 💰 Costos innecesarios de S3
- 🗑️ Basura acumulada en S3
- 🔒 Archivos sin referencia en BD

---

### **PROBLEMA 2: Uploads a S3 Prematuros - PDFs y Fotos de Speaker**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: `UnifiedSpeakerProposalForm.tsx`, `speaker-uploads.ts`

**Descripción**:
- Los CVs (PDFs) se suben a S3 al seleccionar el archivo
- Las fotos profesionales de speakers se suben al seleccionar
- Mismo problema que con cover images

**Evidencia**:
```typescript
// UnifiedSpeakerProposalForm.tsx línea 130
const result = await uploadSpeakerPhoto(userId, file, (progress) => {
  setPhotoProgress(progress);
}); // ❌ Sube inmediatamente al seleccionar

// línea 153
const result = await uploadSpeakerCV(userId, file, (progress) => {
  setCvProgress(progress);
}); // ❌ Sube inmediatamente al seleccionar
```

**Archivos afectados**:
- `src/components/speaker/UnifiedSpeakerProposalForm.tsx`
- `src/components/speaker/SpeakerProfileEditor.tsx`
- `src/components/profile/ProfessionalProfileForm.tsx`
- `src/lib/speaker-uploads.ts`

**Impacto**: Mismo que PROBLEMA 1

---

### **PROBLEMA 3: No se Borran Archivos Anteriores al Reemplazar**
**Severidad**: 🟠 ALTA  
**Componente afectado**: `CoverImageUpload.tsx`, `speaker-uploads.ts`

**Descripción**:
- Cuando un usuario reemplaza una foto, la anterior NO se borra de S3
- Esto genera archivos huérfanos que nunca se limpian
- Se acumula basura con el tiempo

**Evidencia**:
```typescript
// CoverImageUpload.tsx - handleRemove
const handleRemove = useCallback(() => {
  if (previewUrl && previewUrl !== currentImageUrl) {
    revokeImagePreview(previewUrl); // ❌ Solo revoca preview, no borra de S3
  }
  setPreviewUrl(currentImageUrl || null);
  setSelectedFile(null);
  // ❌ Falta: remove(oldFileKey) de S3
}, [previewUrl, currentImageUrl, onImageRemoved]);
```

**Solución requerida**:
- Usar `remove()` de Amplify Storage para borrar archivo anterior
- Trackear el `key` del archivo anterior para poder borrarlo
- Implementar limpieza de archivos huérfanos

**Archivos afectados**:
- `src/components/common/CoverImageUpload.tsx`
- `src/lib/speaker-uploads.ts`

---

### **PROBLEMA 4: Fotos de Evento No se Guardan en EventCreationWizard**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: `EventCreationWizard.tsx`, API endpoint

**Descripción**:
- El wizard muestra el componente `CoverImageUpload` pero no envía la foto al API
- El campo `coverImageUrl` en `formData` no se está enviando al backend
- Los eventos creados desde wizard NO tienen cover image

**Evidencia**:
```typescript
// EventCreationWizard.tsx línea 89
const response = await fetch('/api/admin/create-and-publish-event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    talkProposalId,
    ...formData, // ❌ coverImageUrl no está en formData correctamente
    publish,
  }),
});
```

**Archivos afectados**:
- `src/components/admin/EventCreationWizard.tsx`
- `src/app/api/admin/create-and-publish-event/route.ts`

**Solución requerida**:
- Asegurar que `formData.coverImageUrl` se envíe al API
- El API debe guardar el campo en el Event
- Validar que la foto suba ANTES de crear el evento

---

### **PROBLEMA 5: Error 403 (Forbidden) en Imágenes**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: Configuración de S3, Amplify Storage

**Descripción**:
- Las imágenes se suben correctamente a S3
- Pero al intentar accederlas desde el frontend, devuelven 403 Forbidden
- Esto indica un problema de permisos o URLs incorrectas

**Causa probable**:
1. Las imágenes no son públicas por defecto
2. Las URLs generadas no tienen firma (signed URLs)
3. Falta configuración de CORS en S3
4. Bucket no tiene acceso público correcto

**Archivos afectados**:
- `amplify/storage/resource.ts` (configuración)
- Todos los componentes que muestran imágenes

**Solución requerida**:
- Configurar bucket para acceso público a imágenes
- O generar signed URLs con `getUrl()` de Amplify Storage
- Revisar políticas de IAM y bucket policies

---

### **PROBLEMA 6: Zona Horaria Incorrecta en Fechas**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: `date-utils.ts`, manejo de fechas

**Descripción**:
- Las fechas se guardan con zona horaria incorrecta
- Jueves 29 de Enero se convierte en Viernes 30 de Enero
- Esto rompe la lógica de "últimos jueves del mes"
- Ejemplo: `"2026-01-30T00:30:00.000Z"` debería ser `"2026-01-29T18:30:00.000Z"`

**Evidencia del usuario**:
> "proposedDate" : { "S" : "2026-01-30T00:30:00.000Z" }, es decir esta cambiandome la fecha y eso ya es Viernes

**Causa**:
```typescript
// date-utils.ts línea 45
lastThursday.setHours(18, 30, 0, 0); // ❌ Esto usa hora local del servidor/browser

// Cuando se convierte a ISO:
thursday.toISOString() // ❌ Convierte a UTC, puede cambiar de día
```

**Archivos afectados**:
- `src/lib/date-utils.ts`
- `src/components/common/DateSelector.tsx`
- `src/components/speaker/UnifiedSpeakerProposalForm.tsx`

**Solución requerida**:
- Usar `Date.UTC()` para crear fechas en UTC directamente
- O especificar timezone explícitamente (America/Mexico_City)
- Nunca confiar en hora local del browser
- Guardar SIEMPRE en formato ISO con timezone correcto

---

### **PROBLEMA 7: Selector de Fechas No Valida Correctamente**
**Severidad**: 🔴 CRÍTICA  
**Componente afectado**: `DateSelector.tsx`

**Descripción**:
- El selector muestra fechas ocupadas incorrectamente
- Febrero aparece ocupado cuando NO hay evento
- Enero y Marzo con eventos publicados aparecen DISPONIBLES
- La validación no está funcionando correctamente

**Evidencia del usuario**:
> "Solo me muestra ocupada la fecha jueves 26 de febrero que en realidad no hay evento publicado con esa fecha, los eventos publicados tienen enero y marzo, queee me deja seleccionar ambas fechas"

**Causa probable**:
```typescript
// DateSelector.tsx línea 106
const isoDate = thursday.toISOString().split('T')[0]; // ❌ Comparación de fechas incorrecta

// línea 111
return isSameDay(eventDate, thursday); // ❌ isSameDay no está funcionando por timezone
```

**Archivos afectados**:
- `src/components/common/DateSelector.tsx`
- `src/lib/date-utils.ts` (función `isSameDay`)

**Solución requerida**:
- Corregir la función `isSameDay()` para comparar solo fecha (no hora)
- Normalizar todas las fechas a UTC antes de comparar
- Loggear las fechas que se están comparando para debug
- Validar contra TODAS las propuestas y eventos

---

### **PROBLEMA 8: Duración de Charlas No Coincide con Fechas**
**Severidad**: 🟡 MEDIA  
**Componente afectado**: Formularios múltiples

**Descripción**:
- La duración se pregunta en el formulario pero no se usa consistentemente
- Las fechas siempre muestran 6:30-7:30 PM (1 hora)
- La duración del formulario no afecta las horas mostradas

**Evidencia del usuario**:
> "Duración de la platica no coincide con las fechas pero igual casi todas son de 1 hora así que dejarlo como default"

**Solución recomendada por usuario**:
- Eliminar pregunta de duración (default a 1 hora)
- O asegurar que la duración calcule correctamente la hora de fin
- Mantener consistencia: 6:30 PM - 7:30 PM fijo

**Archivos afectados**:
- `src/components/speaker/UnifiedSpeakerProposalForm.tsx`
- `src/components/admin/EventCreationWizard.tsx`
- `src/components/CreateEventModal.tsx`

---

### **PROBLEMA 9: Botones Redundantes en Formulario**
**Severidad**: 🟢 BAJA  
**Componente afectado**: `UnifiedSpeakerProposalForm.tsx`

**Descripción**:
- En la sección 6 (preguntas opcionales) hay dos botones:
  - "Omitir y Enviar"
  - "✅ Enviar Propuesta Completa"
- Ambos hacen exactamente lo mismo (`onClick={handleSubmit}`)
- Esto confunde al usuario

**Evidencia**:
```typescript
// UnifiedSpeakerProposalForm.tsx línea 923-950
<Button onClick={handleSubmit}>Omitir y Enviar</Button>
<Button onClick={handleSubmit}>✅ Enviar Propuesta Completa</Button>
// ❌ Ambos llaman a la misma función
```

**Archivos afectados**:
- `src/components/speaker/UnifiedSpeakerProposalForm.tsx`

**Solución requerida**:
- Eliminar el botón "Omitir y Enviar"
- Dejar solo "✅ Enviar Propuesta" (sin "Completa")
- O cambiar a un solo botón "Continuar →" que vaya a review

---

## 📊 MATRIZ DE PRIORIDADES

| # | Problema | Severidad | Impacto | Esfuerzo | Prioridad |
|---|----------|-----------|---------|----------|-----------|
| 6 | Zona horaria fechas | 🔴 CRÍTICA | ALTO | MEDIO | 🔥 P0 |
| 7 | Validación fechas | 🔴 CRÍTICA | ALTO | MEDIO | 🔥 P0 |
| 5 | Error 403 imágenes | 🔴 CRÍTICA | ALTO | BAJO | 🔥 P0 |
| 4 | Fotos wizard no se guardan | 🔴 CRÍTICA | MEDIO | BAJO | 🔥 P1 |
| 1 | Upload prematuro - Cover | 🔴 CRÍTICA | MEDIO | ALTO | 🔥 P1 |
| 2 | Upload prematuro - Speaker | 🔴 CRÍTICA | MEDIO | ALTO | 🔥 P1 |
| 3 | No borrar archivos viejos | 🟠 ALTA | MEDIO | MEDIO | ⚠️ P2 |
| 8 | Duración inconsistente | 🟡 MEDIA | BAJO | BAJO | ⚠️ P3 |
| 9 | Botones redundantes | 🟢 BAJA | BAJO | BAJO | ℹ️ P4 |

---

## 🎯 PLAN DE ACCIÓN PROPUESTO

### **SPRINT 1: Problemas Críticos de Fechas (P0)** ✅ COMPLETADO
**Duración**: 1-2 días  
**Commit**: da3ebca

- [x] **Tarea 1.1**: Corregir `getLastThursdayOfMonth()` para usar UTC
  - Archivo: `src/lib/date-utils.ts`
  - Cambiar `setHours()` por `Date.UTC()`
  - Testing exhaustivo con múltiples meses
  - ✅ COMPLETADO: Usa Date.UTC() para evitar conversión de zona horaria

- [x] **Tarea 1.2**: Corregir función `isSameDay()`
  - Archivo: `src/lib/date-utils.ts`
  - Comparar solo fecha, ignorar hora
  - Normalizar a UTC antes de comparar
  - ✅ COMPLETADO: Compara ISO strings sin componente de tiempo

- [x] **Tarea 1.3**: Fix validación en `DateSelector`
  - Archivo: `src/components/common/DateSelector.tsx`
  - Agregar logs para debug
  - Validar contra eventos Y propuestas correctamente
  - ✅ COMPLETADO: Valida Events + TalkProposals (excluye EVENT_CREATED) + SpeakerApplications

- [x] **Tarea 1.4**: Corregir Error 403 en imágenes
  - Archivo: `amplify/storage/resource.ts`
  - Configurar acceso público o signed URLs
  - Testing con imágenes reales
  - ✅ COMPLETADO: Configurado allow.guest.to(['read']) para acceso público

- [x] **BONUS**: Fix doble fecha bug
  - TalkProposal.proposedDate ahora se actualiza cuando admin cambia fecha
  - DateSelector excluye TalkProposals con EVENT_CREATED
  - Documentado en ANALISIS_BUG_DOBLE_FECHA.md

- [x] **BONUS**: Fix timezone en display de fechas
  - UnifiedApplicationCard y SpeakerApplicationDetail usan formatProposedDateUTC()
  - Evita mostrar día anterior (25 en lugar de 26)

**Criterios de éxito**:
- ✅ Jueves 29 Enero no se convierte en Viernes 30
- ✅ Fechas ocupadas se muestran correctamente
- ✅ Imágenes se cargan sin error 403
- ✅ Bug de doble fecha resuelto
- ✅ Display de fechas muestra día correcto

---

### **SPRINT 2: Uploads y Archivos (P1)**
**Duración**: 2-3 días

- [ ] **Tarea 2.1**: Refactor `CoverImageUpload` - No subir automáticamente
  - Archivo: `src/components/common/CoverImageUpload.tsx`
  - Remover auto-upload en `handleFileSelect`
  - Solo subir cuando `uploadImage()` se llame explícitamente
  - Mantener preview sin upload

- [ ] **Tarea 2.2**: Refactor `speaker-uploads.ts` - Upload manual
  - Archivo: `src/lib/speaker-uploads.ts`
  - Crear función `prepareSpeakerPhoto()` - solo valida y preview
  - Crear función `commitSpeakerPhoto()` - sube a S3
  - Mantener backward compatibility

- [ ] **Tarea 2.3**: Actualizar `UnifiedSpeakerProposalForm`
  - Archivo: `src/components/speaker/UnifiedSpeakerProposalForm.tsx`
  - Preparar archivos en selección
  - Subir en `handleSubmit` solo si valida
  - Rollback si falla submit

- [ ] **Tarea 2.4**: Fix `EventCreationWizard` - Guardar cover image
  - Archivo: `src/components/admin/EventCreationWizard.tsx`
  - Asegurar `coverImageUrl` en payload
  - Actualizar API route para aceptar cover
  - Testing completo

**Criterios de éxito**:
- ✅ Archivos solo se suben al confirmar formulario
- ✅ Si falla submit, no hay archivos huérfanos
- ✅ Wizard guarda cover image correctamente

---

### **SPRINT 3: Limpieza de Archivos (P2)**
**Duración**: 1-2 días

- [ ] **Tarea 3.1**: Implementar `deleteFile()` en uploads
  - Archivo: `src/lib/speaker-uploads.ts`
  - Usar `remove()` de Amplify Storage
  - Manejar errores de borrado

- [ ] **Tarea 3.2**: Track archivos anteriores
  - En todos los formularios
  - Guardar `oldPhotoKey`, `oldCvKey`, etc.
  - Borrar al reemplazar

- [ ] **Tarea 3.3**: Script de limpieza de huérfanos
  - Crear script para detectar archivos sin referencia
  - Listar archivos en S3
  - Comparar con BD
  - Opción manual de borrado

**Criterios de éxito**:
- ✅ Al reemplazar foto, la vieja se borra
- ✅ No hay archivos huérfanos en S3
- ✅ Script detecta y limpia huérfanos

---

### **SPRINT 4: UX y Pulido (P3-P4)**
**Duración**: 1 día

- [ ] **Tarea 4.1**: Simplificar duración de charlas
  - Default: 60 minutos fijo
  - Remover input de duración de formularios
  - Calcular endDate automáticamente

- [ ] **Tarea 4.2**: Eliminar botón redundante
  - Archivo: `src/components/speaker/UnifiedSpeakerProposalForm.tsx`
  - Dejar solo un botón de submit
  - Mejorar texto del botón

**Criterios de éxito**:
- ✅ Duración siempre 60 min (6:30-7:30 PM)
- ✅ Solo un botón "Enviar"

---

## 🔍 TESTING REQUERIDO

### **Test Plan - Fechas**
```
1. Crear propuesta el día 20 de diciembre
2. Seleccionar último jueves de enero (30 enero 2026)
3. Verificar en BD: debe ser "2026-01-30T00:30:00.000Z" ❌ o "2026-01-30T18:30:00.000Z" ✅
4. Verificar que sea JUEVES en calendario
5. Crear otro user, verificar que esa fecha aparezca OCUPADA
```

### **Test Plan - Uploads**
```
1. Comenzar formulario speaker
2. Subir foto → verificar S3 (NO debe estar aún)
3. Cancelar formulario → verificar S3 (NO debe estar)
4. Reiniciar, subir foto, completar formulario
5. Confirmar → verificar S3 (debe estar ahora)
6. Editar perfil, cambiar foto
7. Verificar S3: foto vieja debe estar borrada
```

### **Test Plan - Permisos**
```
1. Subir imagen en cualquier formulario
2. Obtener URL de S3
3. Abrir en navegador incógnito
4. Debe cargar SIN error 403 ✅
```

---

## 📝 NOTAS ADICIONALES

### **Decisiones Técnicas Recomendadas**

1. **Zona Horaria**: Usar siempre UTC en ISO string
   - Convertir a local solo para display
   - Nunca confiar en `new Date()` del browser
   - Usar librería como `date-fns-tz` si es necesario

2. **Uploads**: Patrón "prepare → commit"
   - `prepare`: Validar, preview, guardar en estado
   - `commit`: Subir a S3 solo si todo OK
   - `rollback`: Borrar si falla

3. **Permisos S3**: 
   - Opción A: Bucket público (más simple)
   - Opción B: Signed URLs (más seguro)
   - Recomendar: Opción A para cover images

4. **Limpieza**: 
   - Implementar job periódico (Lambda?)
   - O limpieza manual con script
   - Documentar proceso

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Sprint 1 - Fechas (P0)
- [x] 1.1 Fix `getLastThursdayOfMonth()` UTC
- [x] 1.2 Fix `isSameDay()` comparison
- [x] 1.3 Fix `DateSelector` validation
- [x] 1.4 Fix Error 403 images
- [ ] Testing fechas completo
- [ ] Testing imágenes completo

### Sprint 2 - Uploads (P1)
- [ ] 2.1 Refactor `CoverImageUpload`
- [ ] 2.2 Refactor `speaker-uploads.ts`
- [ ] 2.3 Update `UnifiedSpeakerProposalForm`
- [ ] 2.4 Fix `EventCreationWizard`
- [ ] Testing uploads completo

### Sprint 3 - Limpieza (P2)
- [ ] 3.1 Implement `deleteFile()`
- [ ] 3.2 Track old files
- [ ] 3.3 Cleanup script
- [ ] Testing limpieza

### Sprint 4 - UX (P3-P4)
- [ ] 4.1 Simplify duration
- [ ] 4.2 Remove redundant button
- [ ] Testing UX

---

## 📞 CONTACTO Y APROBACIÓN

**Documento creado por**: GitHub Copilot  
**Fecha**: 22 de Diciembre 2025  
**Para revisión de**: Usuario/Product Owner  

**Próximos pasos**:
1. ✅ Revisar y aprobar este plan
2. ⏳ Comenzar Sprint 1 (fechas)
3. ⏳ Testing incremental
4. ⏳ Deploy a sandbox
5. ⏳ Deploy a producción

---

**NOTAS FINALES**:
- Este documento NO hace cambios en el código
- Solo documenta problemas y soluciones propuestas
- Cada tarea requiere aprobación antes de implementar
- Testing es OBLIGATORIO en cada sprint
- No avanzar al siguiente sprint sin completar el anterior

