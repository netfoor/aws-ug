# Requerimientos - Sistema de Check-in para Eventos

## Introducción

El sistema de check-in automatizado permitirá a los asistentes registrados mostrar su código QR único para ingresar rápidamente a los eventos, mientras que los administradores podrán escanear estos códigos para registrar la asistencia de manera eficiente. El sistema debe ser rápido, confiable y funcionar tanto online como offline.

## Requerimientos

### Requerimiento 1: Generación y Visualización de QR para Asistentes

**User Story:** Como asistente registrado a un evento, quiero acceder fácilmente a mi código QR único para poder hacer check-in rápidamente al llegar al evento.

#### Criterios de Aceptación

1. CUANDO un miembro se registra exitosamente a un evento ENTONCES el sistema SHALL generar un token QR único que combine eventId, userId y timestamp
2. CUANDO un miembro accede a la página de detalles de un evento al que está registrado ENTONCES el botón de registro SHALL cambiar a "Mi Ticket"
3. CUANDO un miembro hace clic en "Mi Ticket" ENTONCES el sistema SHALL mostrar su código QR en una interfaz optimizada para móvil
4. CUANDO se muestra el código QR ENTONCES SHALL incluir información del evento (título, fecha, ubicación) y datos del asistente (nombre)
5. CUANDO se genera el QR ENTONCES SHALL tener una validez limitada al día del evento más 24 horas adicionales
6. CUANDO el asistente visualiza su ticket ENTONCES SHALL poder descargar el QR como imagen PNG para uso offline

### Requerimiento 2: Scanner QR para Administradores

**User Story:** Como administrador del evento, quiero una interfaz móvil optimizada para escanear códigos QR de los asistentes y registrar su check-in de manera rápida y eficiente.

#### Criterios de Aceptación

1. CUANDO un admin accede a la página de un evento ENTONCES SHALL ver un botón "Check-in" que lo lleve al scanner
2. CUANDO el admin abre el scanner ENTONCES el sistema SHALL activar la cámara del dispositivo automáticamente
3. CUANDO se escanea un QR válido ENTONCES el sistema SHALL marcar al asistente como "checked-in" con timestamp
4. CUANDO se completa un check-in exitoso ENTONCES SHALL mostrar feedback visual (verde) y sonoro con los datos del asistente
5. CUANDO se escanea un QR inválido o ya usado ENTONCES SHALL mostrar feedback de error (rojo) con el motivo
6. CUANDO no hay conexión a internet ENTONCES el sistema SHALL almacenar los check-ins localmente y sincronizar cuando se restablezca la conexión

### Requerimiento 3: Check-in Manual de Respaldo

**User Story:** Como administrador, quiero poder registrar manualmente la asistencia de personas que no puedan usar el QR (problemas técnicos, olvido del teléfono, etc.).

#### Criterios de Aceptación

1. CUANDO el admin está en el scanner ENTONCES SHALL tener acceso a una opción "Check-in Manual"
2. CUANDO selecciona check-in manual ENTONCES SHALL poder buscar asistentes por nombre o email
3. CUANDO encuentra al asistente correcto ENTONCES SHALL poder marcarlo como "checked-in" manualmente
4. CUANDO se realiza check-in manual ENTONCES el sistema SHALL registrar el método como "MANUAL" y el admin que lo realizó
5. CUANDO se completa check-in manual ENTONCES SHALL mostrar confirmación visual similar al QR scan

### Requerimiento 4: Integración con Lista de Asistentes Existente

**User Story:** Como administrador, quiero que el sistema de check-in se integre con la lista de asistentes existente para tener una vista unificada del evento.

#### Criterios de Aceptación

1. CUANDO se realiza un check-in ENTONCES la página de asistentes (`/admin/events/[id]/attendees`) SHALL reflejar el cambio automáticamente
2. CUANDO el admin está en el scanner ENTONCES SHALL poder navegar fácilmente a la lista de asistentes
3. CUANDO visualiza la lista de asistentes ENTONCES SHALL ver el estado de check-in actualizado con timestamp
4. CUANDO se realiza check-in manual desde el scanner ENTONCES SHALL registrarse en la lista con el método correcto
5. CUANDO hay errores de sincronización ENTONCES SHALL mostrar indicadores visuales en ambas interfaces

### Requerimiento 5: Validación y Seguridad del QR

**User Story:** Como sistema, necesito validar que los códigos QR sean auténticos, únicos y válidos para prevenir fraudes y duplicaciones.

#### Criterios de Aceptación

1. CUANDO se genera un QR token ENTONCES SHALL incluir una firma criptográfica para validar autenticidad
2. CUANDO se escanea un QR ENTONCES el sistema SHALL verificar que el token no haya sido usado previamente
3. CUANDO se valida un QR ENTONCES SHALL confirmar que corresponde al evento actual
4. CUANDO se detecta un QR expirado ENTONCES SHALL rechazarlo con mensaje explicativo
5. CUANDO se detecta un intento de QR duplicado ENTONCES SHALL registrar el incidente y notificar al admin
6. CUANDO se escanea un QR de otro evento ENTONCES SHALL rechazarlo indicando el evento correcto

### Requerimiento 6: Experiencia Offline y Sincronización

**User Story:** Como administrador, necesito que el sistema funcione sin conexión a internet durante el evento y sincronice los datos cuando se restablezca la conexión.

#### Criterios de Aceptación

1. CUANDO no hay conexión a internet ENTONCES el scanner SHALL continuar funcionando normalmente
2. CUANDO se realizan check-ins offline ENTONCES SHALL almacenarlos en localStorage del dispositivo
3. CUANDO se restablece la conexión ENTONCES el sistema SHALL sincronizar automáticamente todos los check-ins pendientes
4. CUANDO hay conflictos de sincronización ENTONCES SHALL priorizar el primer check-in registrado
5. CUANDO se completa la sincronización ENTONCES SHALL mostrar confirmación de todos los registros procesados
6. CUANDO hay errores de sincronización ENTONCES SHALL mostrar lista de registros que requieren atención manual