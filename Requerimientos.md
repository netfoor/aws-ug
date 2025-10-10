Documento de Requerimientos - Plataforma User Group Puebla (MVP)
Fecha de Preparación: 8/10/2025
Versión: 1.0 (MVP Inicial)

1. Resumen del Proyecto y Objetivos
Nombre del Proyecto: Plataforma Centralizada User Group Puebla (AWSPuebla Connect)
Objetivo General:
Reducir la carga administrativa del equipo organizador del User Group Puebla y establecer una plataforma centralizada que automatice procesos manuales (como registros, control de asistencia y comunicación), mejore la gestión de la comunidad, y complemente la publicación de eventos en Meetup.
Objetivos Específicos del MVP:
Automatización de Asistencia: Implementar un sistema de registro de asistencia eficiente (QR y check-in móvil) para reducir la gestión manual en los eventos.
Centralización de Datos de Miembros: Crear perfiles persistentes para los miembros, eliminando la necesidad de rellenar datos en cada evento.
Gestión Integrada de Eventos: Permitir la creación y gestión de eventos desde la plataforma, con sincronización bidireccional con Meetup.
Comunicación Automatizada: Automatizar notificaciones (confirmaciones, recordatorios, encuestas) para mejorar la interacción con los miembros y speakers.
Soporte Básico para Speakers: Proporcionar un portal para la gestión de propuestas de charlas y materiales.
Métricas Operacionales: Ofrecer un dashboard básico para administradores con métricas clave de asistencia y encuestas.
Facilidad de Uso: Priorizar la facilidad de mantenimiento y operación para el equipo organizador.

2. Stakeholders y Personas
Stakeholders Principales:
Equipo Organizador del User Group Puebla: Los principales beneficiarios de la reducción de la carga administrativa.
Miembros de la Comunidad: Usuarios finales que asisten a los eventos y se benefician de la experiencia mejorada.
Speakers/Ponentes: Contribuyentes clave del contenido de los eventos.
Personas (Roles de Usuario en la Plataforma):
A. Público / Guest (No Autenticado)
Descripción: Visitantes del sitio web que aún no se han registrado.
Necesidades: Ver información general, conocer los eventos, explorar contenido pasado.
Funcionalidades Principales:
Ver eventos públicos (futuros y pasados), calendario.
Acceder a la galería de videos, posts de blog/anuncios.
Visualizar el archivo de ediciones pasadas del newsletter.
CTA para "Crear Perfil" o "Registrarme".
Posibilidad de intentar suscribirse al newsletter, lo cual los redirigirá al registro si no son Miembros.
Contenido atractivo: Eventos pasados (fotos, videos), fotos de la comunidad, beneficios del UG, información sobre AWS User Groups en general, y el evento más reciente.


B. Miembro (Autenticado)
Descripción: Usuarios registrados en la plataforma, miembros activos de la comunidad. Puede ser un "Suscriptor" si ha optado por recibir el newsletter.
Necesidades: Gestionar su perfil, registrarse en eventos, acceder a contenido exclusivo, ver su historial.
Funcionalidades Principales:
Perfil persistente: Visualizar y editar sus datos personales (nombre, email, teléfono opcional), intereses (tags), historial de asistencia, preferencias de comunicación, consentimientos.
Registro Unificado: Realizar RSVP a eventos sin tener que volver a ingresar sus datos.
Check-in Rápido: Acceder a su QR de asistencia personal para cada evento al que se ha registrado.
Acceso a materiales exclusivos vinculados a eventos.
Historial de encuestas respondidas.
Recepción y respuesta a encuestas post-evento automatizadas.
Visualización en tiempo real de la Ruleta de asistentes si es seleccionado como ganador.
Gestión de su suscripción al newsletter (activar/desactivar).


C. Speaker / Ponente (Tipo de Miembro con Permisos Adicionales)
Descripción: Miembros que han postulado y/o impartido charlas.
Necesidades: Gestionar sus propuestas, coordinar logística para sus charlas, acceder a feedback.
Funcionalidades Principales:
Todas las funcionalidades de un Miembro.
Panel de Speaker: Gestionar los detalles de sus charlas (horarios, material, requerimientos A/V).
Postulación de Charla: Enviar nuevas propuestas de charlas a través de un formulario.
Estatus de Charla: Ver el estado actual de sus propuestas (pendiente, aprobada, rechazada).
Subir material complementario (slides, enlaces a demos).
Declarar requerimientos técnicos y A/V.
Gestionar el consentimiento de grabación de su charla.
Recibir recordatorios y enlaces para ensayos (rehearsals).
Recibir notificación por correo cuando su charla ha sido aprobada o rechazada.
Obtener un certificado de speaker automático una vez impartida la charla.
Posibilidad de crear entradas de blog (sujeta a validación futura).


D. Admin (Rol Adicional con Permisos Elevados)
Descripción: Miembros del equipo organizador con acceso completo a la gestión y configuración de la plataforma.
Necesidades: Crear y gestionar eventos, monitorear la comunidad, automatizar comunicaciones, analizar métricas.
Funcionalidades Principales:
Crear y editar eventos (utilizando plantillas: charla, workshop, hackathon).
Gestión Centralizada de Eventos: Crear eventos en la plataforma que se sincronicen y publiquen en Meetup (fuente de verdad principal es la plataforma).
Sincronizar cambios desde Meetup a la plataforma (polling).
Importar eventos y asistentes pasados desde Meetup.
Check-in de Eventos: Escanear QRs de asistencia con un lector móvil (web app) y registrar asistencia.
Gestionar el fallback manual de check-in (buscar por nombre y marcar).
Dashboard de Administración: Ver métricas clave (KPIs: asistencias vs RSVPs, tasa de conversión, satisfacción media, asistentes nuevos vs recurrentes, top speakers, tasa de apertura de newsletter).
Exportar datos a CSV/XLSX (listas de asistentes, resultados de encuestas).
Gestión de Encuestas: Crear y editar formularios y encuestas personalizadas (Form Builder propio).
Configurar y automatizar el envío de encuestas post-evento (solo a asistentes verificados, con recordatorios).
Revisar resultados agregados de encuestas (promedio de satisfacción, temas recurrentes, NPS por speaker).
Gestionar speakers y su información.
Moderación básica de comentarios (si aplica).
Subir grabaciones y materiales de eventos a la Media Library.
Aprobar/Rechazar propuestas de charlas, con notificación vía email.
Gestión de Comunicación: Crear y enviar ediciones del newsletter.
Automatizar emails (secuencias de bienvenida, confirmación de registro, recordatorios de evento, post-evento con encuesta + grabación).
Personalización de correos utilizando plantillas y variables.
Crear entradas de blog/anuncios.
Ruleta de Asistentes: Configurar y lanzar la ruleta para asistentes validados en tiempo real.
Gestionar roles y permisos (futuro).
Configurar automatizaciones y reglas (futuro: ej. si CSAT < 3 → crear ticket).

3. Requerimientos Funcionales (RF) - MVP
Los siguientes requerimientos funcionales describen lo que el sistema debe hacer, organizados por área temática.
A. Gestión de Eventos y Sincronización
RF-ADMIN-001: Creación de Eventos en la Plataforma.
Descripción: El Admin podrá crear un nuevo evento directamente en la plataforma.
Criterios de Aceptación (AC):
AC1: El Admin puede acceder a un formulario en el dashboard para crear un nuevo evento.
AC2: El formulario incluirá campos para: título, descripción (soporte markdown/HTML básico), fecha, hora de inicio y fin, ubicación, cupo (opcional), tipo de evento (charla, workshop, hackathon, etc.), tags, speakers asociados (seleccionables de la lista de usuarios), visibilidad (público/privado), requerimientos específicos para speakers (texto libre).
AC3: Al guardar, el evento se crea en la base de datos de la plataforma y es visible para el Admin en su panel.
AC4: El Admin puede opcionalmente marcar una opción para "Publicar en Meetup" al crear el evento.
AC5: Si se marca "Publicar en Meetup", el sistema intentará crear el evento correspondiente en Meetup a través de su API. Si falla, el Admin será notificado en la interfaz o por email.
AC6: Al crear en Meetup, la plataforma debe guardar el meetup_event_id para futuras sincronizaciones.

RF-ADMIN-002: Edición de Eventos y Sincronización Bidireccional.
Descripción: El Admin podrá editar un evento existente en la plataforma. Los cambios pueden reflejarse en Meetup, y la plataforma reaccionará a cambios en Meetup.
Criterios de Aceptación (AC):
AC1: El Admin puede seleccionar un evento del listado en el dashboard y acceder a su formulario de edición.
AC2: Si un evento fue creado o vinculado a Meetup, al editarlo en la plataforma, el Admin tiene la opción de "Actualizar en Meetup".
AC3: Si se actualiza en Meetup, el sistema enviará los cambios al evento correspondiente en Meetup vía API.
AC4: El sistema implementará un mecanismo de polling periódico para consultar Meetup (ej. cada X horas/día) y detectar cambios en eventos existentes (fecha, hora, descripción, cancelación).
AC5: Si se detecta un cambio en un evento de Meetup que está vinculado, la plataforma actualizará automáticamente la información local del evento.
AC6: Si un evento es cancelado en Meetup, la plataforma lo marcará como "cancelado".


RF-ADMIN-003: Importación de Eventos y Asistentes desde Meetup.
Descripción: El Admin podrá importar eventos pasados y sus asistentes desde Meetup para construir el historial de la plataforma.
Criterios de Aceptación (AC):
AC1: El Admin puede iniciar una importación manual desde un apartado en el dashboard, especificando un rango de fechas o eventos específicos de Meetup.
AC2: Los eventos importados se crearán en la base de datos de la plataforma y se marcarán como "importados de Meetup", asignándoles el meetup_event_id.
AC3: Para cada evento importado, el sistema recuperará la lista de RSVPs/asistentes de Meetup.
AC4: Los asistentes importados se asociarán a sus respectivos perfiles de Miembro existentes (buscando por email o meetupId).
AC5: Si un asistente importado no tiene un perfil de Miembro, se creará un perfil de Miembro básico (con email y nombre) y se vinculará la asistencia.


B. Registro de Asistencia y Check-in por QR
RF-MIEMBRO-001: Generación y Acceso al QR por Evento.
Descripción: Un Miembro que se ha registrado a un evento (ya sea vía Meetup o la plataforma) tendrá acceso a un código QR único para ese evento específico.
Criterios de Aceptación (AC):
AC1: Un Miembro autenticado, al acceder a la página de detalles de un evento al que está registrado, verá su QR personal para ese evento.
AC2: El QR contendrá un token seguro o información cifrada que identifique de forma única al Miembro y al Evento.
AC3: El QR debe tener una caducidad implícita o explícita (ej. solo válido el día del evento) para evitar usos indebidos.
AC4: El Miembro podrá descargar su QR como imagen (ej. PNG) o PDF.


RF-ADMIN-004: Lector de QR para Check-in.
Descripción: El Admin (o personal autorizado) usará una interfaz web móvil para escanear los QRs de los asistentes en la puerta del evento.
Criterios de Aceptación (AC):
AC1: El Admin puede acceder a una interfaz web optimizada para dispositivos móviles (o desktop con cámara) desde el dashboard, seleccionando el evento actual.
AC2: La interfaz activará la cámara del dispositivo para leer códigos QR.
AC3: Al escanear un QR válido, el sistema marcará al Miembro como "Checked-in" para ese evento en la base de datos, registrando un timestamp.
AC4: La interfaz proporcionará retroalimentación visual y sonora inmediata (ej. "Asistencia Confirmada" en verde, "QR Inválido" en rojo, sonido de éxito/error).
AC5 (Modo Offline): Si la conexión a internet no está disponible, el lector almacenará localmente los check-ins y los sincronizará automáticamente cuando se restablezca la conexión, sin pérdida de datos.
AC6 (Fallback Manual): En la misma interfaz del lector (o una sección accesible desde ella), el Admin podrá buscar asistentes por nombre/email y marcar su asistencia manualmente.
AC7: Los check-ins manuales también deben registrarse con un timestamp y el identificador del Admin que realizó la operación.

RF-ADMIN-005: Dashboard de Asistencia y Reportes.
Descripción: El Admin podrá ver un resumen y detalle de la asistencia por evento.
Criterios de Aceptación (AC):
AC1: Para cada evento, el dashboard de Admin mostrará: número total de RSVPs, número de asistentes validados, y la tasa de asistencia (asistentes validados / RSVPs).
AC2: Se podrá acceder a una lista detallada de asistentes por evento, mostrando para cada Miembro: nombre, email, estado (RSVP, Checked-in, No Asistió) y timestamp de check-in (si aplica).
AC3: Posibilidad de exportar la lista detallada de asistentes a un archivo CSV/XLSX.

C. Ruleta de Asistentes en Tiempo Real
RF-ADMIN-006: Configuración y Lanzamiento de Ruleta.
Descripción: El Admin podrá configurar y lanzar una ruleta de premios para un evento específico, incluyendo solo a los asistentes validados.
Criterios de Aceptación (AC):
AC1: El Admin podrá acceder a la funcionalidad de "Ruleta" desde el dashboard, seleccionando un evento.
AC2: La ruleta automáticamente precargará la lista de Miembros marcados como "Checked-in" para ese evento.
AC3: El Admin podrá iniciar el proceso de la ruleta desde la interfaz.
AC4: Al iniciar, el sistema generará una URL pública que los asistentes podrán usar para ver la ruleta.
AC5: La ruleta se mostrará en pantalla girando con los nombres de los participantes.
AC6: Al detenerse, la ruleta mostrará claramente el nombre del ganador.

RF-MIEMBRO-002: Visualización de la Ruleta y Notificación de Ganador.
Descripción: Los asistentes podrán ver la ruleta en tiempo real y recibir una felicitación si ganan.
Criterios de Aceptación (AC):
AC1: Los asistentes podrán acceder a la URL pública de la ruleta para ver el proceso en vivo en sus dispositivos.
AC2: La interfaz de la ruleta en los dispositivos de los asistentes se actualizará en tiempo real para mostrar el giro y el resultado.
AC3: Si el Miembro actual es seleccionado como ganador, se mostrará un mensaje de felicitación prominente en su pantalla.


3. Requerimientos Funcionales (RF) - MVP
(Continuación)
D. Comunicación y Encuestas Automatizadas
RF-ADMIN-007: Automatización de Encuestas Post-Evento.
Descripción: El Admin podrá configurar encuestas que se envían automáticamente a los asistentes validados de un evento después de que este finalice, con recordatorios.
Criterios de Aceptación (AC):
AC1: El Admin puede acceder a un "Form Builder" en el dashboard para crear y editar plantillas de encuestas (ej. CSAT, NPS, personalizada con campos customizables).
AC2: El Admin puede vincular una encuesta a un evento y configurar un cronograma de envío automático:
Envío inicial (ej. inmediatamente al finalizar el evento).
Múltiples recordatorios (ej. 24h después, 48h después, 72h después del envío inicial).


AC3: El sistema enviará la encuesta solo a los Miembros que fueron marcados como "Checked-in" para el evento asociado.
AC4: Si un Miembro no responde la encuesta, el sistema enviará los recordatorios programados, con un máximo de 3 recordatorios por evento y Miembro.
AC5: Una vez que un Miembro responde la encuesta, el envío de recordatorios para esa encuesta y evento en particular cesa para dicho Miembro.
AC6: Las respuestas de la encuesta se almacenarán vinculadas al Miembro y al evento correspondiente.

RF-MIEMBRO-003: Recepción y Respuesta de Encuestas.
Descripción: Los Miembros recibirán las encuestas post-evento y podrán responderlas de forma sencilla.
Criterios de Aceptación (AC):
AC1: El Miembro recibirá un correo electrónico con un enlace único y seguro a la encuesta.
AC2: Al hacer clic en el enlace, se abrirá la interfaz de la encuesta, precargada con la información del Miembro (si es posible) para facilitar el llenado.
AC3: El Miembro podrá seleccionar sus respuestas y enviar el formulario, las cuales serán registradas por el sistema.

RF-ADMIN-008: Dashboard de Resultados de Encuestas.
Descripción: El Admin podrá visualizar los resultados agregados y detallados de las encuestas por evento y en general.
Criterios de Aceptación (AC):
AC1: Para cada evento, el dashboard mostrará un resumen de los resultados (ej. promedio de CSAT/NPS, porcentaje de respuestas, gráficos básicos de distribución).
AC2: El Admin podrá acceder a una vista detallada para revisar las respuestas individuales y los comentarios de texto libre.
AC3: Posibilidad de exportar los resultados completos de las encuestas (agregados o individuales) a CSV/XLSX.




RF-ADMIN-010: Gestión y Envío de Newsletter.
Descripción: El Admin podrá crear, gestionar y enviar ediciones del newsletter a los Miembros que han consentido recibirlas.
Criterios de Aceptación (AC):
AC1: El Admin puede acceder a una interfaz para crear nuevas ediciones del newsletter, incluyendo título, contenido (HTML/Markdown) e imagen destacada opcional.
AC2: El Admin puede previsualizar la edición del newsletter antes de enviarla.
AC3: El Admin puede programar la fecha y hora de envío de una edición del newsletter.
AC4: El sistema enviará el newsletter por correo electrónico solo a los Miembros que tienen activado newsletterOptIn en su perfil.
AC5: Cada correo del newsletter contendrá un enlace a la versión completa del mismo en la plataforma (ej. /newsletter/id-de-edicion).
AC6: El sistema registrará el estado de envío (ej. entregado, rebotado) y la tasa de apertura básica del newsletter.




RF-PUBLIC-001: Archivo Público de Newsletter.
Descripción: Los visitantes y Miembros podrán acceder a un archivo de las ediciones pasadas del newsletter.
Criterios de Aceptación (AC):
AC1: Existirá una ruta pública (ej. /newsletter) que mostrará un listado de todas las ediciones publicadas del newsletter.
AC2: Cada edición del newsletter tendrá su propia página detallada con el contenido completo.




E. Speaker Portal y Gestión de Propuestas
RF-SPEAKER-001: Postulación y Gestión de Charla por Speaker.
Descripción: Un Speaker podrá postular nuevas charlas y gestionar los detalles de las charlas que han sido aprobadas.
Criterios de Aceptación (AC):
AC1: Un Miembro con rol de speaker (o que desea postular para obtenerlo) puede acceder a un formulario para enviar una nueva propuesta de charla.
AC2: El formulario de postulación incluirá campos para: título, abstract (resumen), requerimientos A/V, y enlace a slides/materiales.
AC3: El Speaker podrá ver el estado de sus propuestas (pendiente, aprobada, rechazada) en su panel personal.
AC4: Si una charla es aprobada, el Speaker podrá subir materiales adicionales (ej. URL a una demo, archivos de slides) y gestionar sus requisitos técnicos.
AC5: El Speaker recibirá notificaciones por correo electrónico sobre el estado de sus propuestas (aprobada/rechazada).
AC6: Una vez que la charla ha sido impartida y validada por el Admin, el Speaker podrá descargar un certificado automático con los datos de la charla y el speaker.




RF-ADMIN-009: Notificación y Aprobación de Charlas vía Email.
Descripción: Cuando un Speaker postula una nueva charla, un Admin recibirá una notificación por email con la opción de aprobarla o rechazarla directamente desde el correo.
Criterios de Aceptación (AC):
AC1: Al crearse una nueva TalkProposal con estado pending, el sistema enviará un email a una dirección predefinida de Admin (o a un grupo de Admins).
AC2: El email de notificación incluirá un resumen claro de la propuesta de charla (título, speaker, resumen, fecha de postulación).
AC3: El email contendrá botones o enlaces directos (ej. "Aprobar Charla", "Rechazar Charla") que al ser clickeados desencadenarán una acción en la plataforma.
AC4: Al hacer clic en "Aprobar Charla", el sistema actualizará el estado de la TalkProposal a approved y enviará un email de confirmación al Speaker con los detalles de la aprobación.
AC5: Al hacer clic en "Rechazar Charla", el sistema actualizará el estado de la TalkProposal a rejected y enviará un email al Speaker (opcionalmente con un campo para que el Admin escriba el motivo del rechazo en la plataforma antes de enviar).
AC6: Los enlaces de aprobación/rechazo en el email deben ser seguros (ej. tokens de un solo uso o firmas) para evitar manipulaciones.




F. Contenido y Multimedia
RF-ADMIN-011: Gestión de Entradas de Blog / Anuncios.
Descripción: El Admin podrá crear, editar y publicar entradas de blog o anuncios para la comunidad.
Criterios de Aceptación (AC):
AC1: El Admin puede acceder a una interfaz en el dashboard para crear y editar entradas de blog.
AC2: Una entrada de blog incluirá campos para: título, contenido (HTML/Markdown), autor (Admin), fecha de publicación, categoría, tags e imagen de portada opcional.
AC3: El Admin puede marcar una entrada de blog como "Pinned" para que aparezca destacada.
AC4: Solo los Admins pueden crear entradas de blog en el MVP.

RF-PUBLIC-002: Visualización de Contenido Público.
Descripción: Los visitantes y Miembros podrán navegar y ver el contenido publicado (blogs, videos, fotos).
Criterios de Aceptación (AC):
AC1: El sitio web tendrá secciones públicas para "Blog" o "Noticias" y "Galería" (o "Recursos").
AC2: La sección de Blog mostrará un listado de entradas, permitiendo filtrar por categoría o tags.
AC3: La sección de Galería/Recursos mostrará videos (embed de YouTube) y fotos de eventos.
AC4: Se incluirá un buscador básico por tags, speaker, tema, o fecha para el contenido.



4. Requerimientos No Funcionales (RNF)
Estos requerimientos describen las cualidades del sistema, más allá de sus funcionalidades, y son críticos para la estrategia de implementación y la experiencia del usuario.
RNF-001: Seguridad y Autenticación
Descripción: El sistema debe garantizar un acceso seguro y controlar la identidad de los usuarios y sus permisos.
Criterios de Aceptación (AC):
AC1: El sistema utilizará AWS Cognito para la gestión de usuarios, soportando inicio de sesión con email/contraseña.
AC2: El sistema permitirá el inicio de sesión federado a través de Meetup para facilitar el registro y la vinculación de perfiles existentes.
AC3: El sistema gestionará y almacenará los consentimientos de los usuarios (ej. para newsletter, uso de datos) de forma clara y auditable.
AC4: Se implementarán mecanismos de autorización basados en roles (Miembro, Speaker, Admin) para que cada usuario acceda solo a las funcionalidades y datos que le corresponden.
AC5: Para la vinculación con Meetup, el sistema implementará el flujo OAuth o similar de manera segura, sin exponer credenciales sensibles de los usuarios.




RNF-002: Privacidad de Datos
Descripción: El sistema debe manejar los datos personales de los usuarios de manera responsable y transparente, conforme a las buenas prácticas.
Criterios de Aceptación (AC):
AC1: El sitio web incluirá una política de privacidad clara y accesible que informará a los usuarios sobre qué datos se recopilan, cómo se utilizan y con quién se comparten.
AC2: Los datos personales se almacenarán solo si son explícitamente necesarios para el funcionamiento de la plataforma y con el consentimiento explícito del usuario.
AC3: Los Miembros podrán revisar, actualizar o solicitar la eliminación de sus datos personales a través de su perfil o mediante un proceso documentado.




RNF-003: Rendimiento y Escalabilidad
Descripción: El sistema debe ofrecer una experiencia de usuario fluida y ser capaz de manejar un crecimiento moderado de usuarios y eventos de manera eficiente.
Criterios de Aceptación (AC):
AC1: El sistema estará diseñado para soportar picos de hasta 50 usuarios concurrentes durante los eventos mensuales.
AC2: El tiempo de carga de las páginas principales (landing, listado de eventos, ficha de evento, perfil de usuario) debe ser rápido (objetivo: menos de 3 segundos en condiciones normales de red).
AC3: La latencia de las operaciones críticas (ej. registro a evento, check-in, carga de la ruleta) debe ser mínima, priorizando una buena experiencia de usuario sobre la inmediatez del "cold start" de Lambda (se aceptan pequeños retrasos si la UX es fluida).
AC4: La arquitectura serverless (AWS Lambda, API Gateway, DynamoDB) se utilizará para proporcionar escalabilidad automática y adaptarse a la demanda sin intervención manual.
AC5: La funcionalidad de la Ruleta en tiempo real se implementará utilizando WebSockets (ej. a través de AWS AppSync o API Gateway con WebSockets) para garantizar la sincronización en vivo de la interfaz de usuario entre el Admin y los asistentes.


RNF-004: Disponibilidad y Resiliencia
Descripción: El sistema debe estar disponible para los usuarios y administradores la mayor parte del tiempo, con un manejo adecuado de fallas.
Criterios de Aceptación (AC):
AC1: La plataforma debe operar con alta disponibilidad básica, aprovechando la redundancia y resiliencia inherente de los servicios serverless de AWS (ej. replicación automática de datos en DynamoDB, redundancia de Lambda en AZs).
AC2: El sistema debe tener un mecanismo para enviar notificaciones automáticas (ej. a Slack o email) al equipo de desarrollo/administrador sobre errores críticos o fallas de servicio.
AC3: El Admin realizará pruebas de funcionamiento completas de la plataforma un día antes de cada evento para asegurar que todos los flujos principales operan correctamente.
AC4: Se implementará un sistema de monitoreo básico (ej. AWS CloudWatch) para detectar y alertar sobre fallas en las API o el frontend.


RNF-005: Facilidad de Mantenimiento y Operación
Descripción: La plataforma debe ser fácil de administrar y mantener por parte del equipo organizador, minimizando la necesidad de conocimientos técnicos avanzados para las operaciones diarias.
Criterios de Aceptación (AC):
AC1: La interfaz de administración (dashboard) debe ser altamente intuitiva, con un diseño limpio y procesos guiados para tareas como crear/editar eventos, gestionar usuarios, enviar newsletters y revisar métricas.
AC2: Los procesos automatizados (ej. envío de encuestas, sincronización Meetup, envío de newsletters) deben ser configurables y gestionables desde el panel de administración sin necesidad de modificar código.
AC3: El despliegue y la gestión de la infraestructura serverless se realizarán a través de herramientas de AWS (ej. Amplify, CloudFormation/CDK) que simplifiquen las operaciones.
AC4: Se proporcionará documentación clara y concisa (ej. guías de usuario) para el equipo organizador sobre cómo usar y operar el panel de administración y las funcionalidades clave.





5. Modelo de Datos Inicial (Entidades Principales)
Este es un esbozo de las entidades principales y sus atributos clave para el MVP, asumiendo una base de datos NoSQL como DynamoDB.
1. User (Usuarios / Miembros / Speakers / Admins)
userId (PK - ID único del usuario, generado por Cognito)
email (Email principal, para login y comunicaciones)
name (Nombre completo)
phone (Teléfono, opcional)
company (Empresa, opcional)
role (Rol principal: member, speaker, admin. Puede ser un array: ['member', 'speaker'])
interests (Array de tags/intereses, ej. ['Serverless', 'Security'])
bio (Biografía del speaker, si role incluye speaker)
socialLinks (Objeto con enlaces a redes sociales, si role incluye speaker)
avatarUrl (URL de la imagen del avatar del usuario)
meetupId (ID del usuario en Meetup, para sincronización)
newsletterOptIn (Booleano: true/false si ha consentido recibir el newsletter)
privacyConsentDate (Fecha y hora del último consentimiento de privacidad)
createdAt, updatedAt
2. Event (Eventos)
eventId (PK - ID único del evento, generado por la plataforma)
meetupEventId (ID del evento en Meetup, para sincronización bidireccional)
title (Título del evento)
description (Descripción detallada)
date, startTime, endTime
location (Lugar físico del evento)
capacity (Cupo máximo, opcional)
type (Tipo de evento: charla, workshop, hackathon)
tags (Array de tags/categorías)
speakers (Array de IDs de userId de los speakers participantes)
status (draft, published, cancelled, completed)
isPublishedOnMeetup (Booleano: true/false si está publicado en Meetup)
coverImageUrl (URL de la imagen de portada)
recordingUrl (URL de la grabación)
materialsUrl (URL a slides o materiales)
createdAt, updatedAt
3. Attendance (Asistencia a Eventos)
attendanceId (PK - ID único de la asistencia)
userId (FK - Referencia al userId del usuario)
eventId (FK - Referencia al eventId del evento)
meetupRSVPStatus (Estado RSVP en Meetup)
checkInStatus (RSVP, Checked-in, No-show)
checkInTimestamp (Fecha y hora del check-in, si aplica)
qrCodeUsed (Booleano: true/false si se usó QR)
createdAt, updatedAt
4. TalkProposal (Propuestas de Charla)
proposalId (PK - ID único de la propuesta)
speakerId (FK - Referencia al userId del speaker)
title (Título de la charla propuesta)
abstract (Resumen de la charla)
status (pending, approved, rejected)
eventId (FK - Referencia al eventId si aprobada y asignada)
requiredAV (Requerimientos A/V del speaker)
slidesUrl (URL a las slides o material)
recordingConsent (Booleano: true/false consentimiento de grabación)
rehearsalNotes (Notas de ensayos)
createdAt, updatedAt
5. Survey (Encuestas)
surveyId (PK - ID único de la encuesta)
title (Título de la encuesta)
description (Descripción)
type (CSAT, NPS, custom)
questions (Array de objetos con preguntas)
eventId (FK - Referencia al eventId si es encuesta post-evento)
sendSchedule (Objeto con los tiempos de envío automáticos)
createdAt, updatedAt
6. SurveyResponse (Respuestas de Encuestas)
responseId (PK - ID único de la respuesta)
surveyId (FK - Referencia al surveyId de la encuesta)
userId (FK - Referencia al userId del usuario que respondió)
eventId (FK - Referencia al eventId del evento)
answers (Objeto con las respuestas a cada pregunta)
respondedAt (Timestamp de cuándo fue respondida)
createdAt, updatedAt
7. NewsletterEdition (Ediciones del Newsletter)
editionId (PK - ID único de la edición)
title (Título del newsletter)
content (Contenido HTML/Markdown)
publishDate (Fecha de publicación)
authorId (FK - Referencia al userId del Admin que lo publicó)
heroImageUrl (URL de imagen destacada, opcional)
createdAt, updatedAt
8. Blog (Entradas de Blog / Anuncios)
blogId (PK - ID único del post)
title (Título del post)
content (Contenido HTML/Markdown)
authorId (FK - Referencia al userId del autor - Admin)
publishDate (Fecha de publicación)
category (Categoría del post, ej. Announcement)
tags (Array de tags)
coverImageUrl (URL de imagen de portada, opcional)
isPinned (Booleano: true/false si está "pinned")
createdAt, updatedAt
9. PrizeWinner (Ganadores de Ruleta)
winnerId (PK - ID único del ganador)
eventId (FK - Referencia al eventId del evento)
userId (FK - Referencia al userId del ganador)
prize (Descripción del premio)
winningTimestamp (Fecha y hora en que ganó)
createdAt

6. Roadmap / Pasos Siguientes Recomendados (Prácticos)
Validación Interna: Revisa este documento con tu equipo organizador y de desarrollo para asegurar que todos los puntos son claros y acordados.
Diseño de Alto Nivel de la Arquitectura: Detallar cómo los servicios de AWS (Amplify, Lambda, API Gateway, DynamoDB, S3, Cognito, SES, AppSync) se integrarán para soportar estos requerimientos.
Prototipos/Wireframes: Crear bocetos visuales de las pantallas clave (ej. Landing Page, Perfil de Miembro, Ficha de Evento, Dashboard Admin, Lector de QR) para validar el flujo de usuario.
Desglose de Tareas de Desarrollo: Convertir cada requerimiento funcional y no funcional en tareas más pequeñas y asignables para el equipo de desarrollo.
Configuración del Entorno de Desarrollo: Preparar el entorno de AWS Amplify y otros servicios.
Desarrollo por Iteraciones: Empezar a construir las funcionalidades del MVP de forma incremental, siguiendo un enfoque ágil.
Pruebas Continuas: Implementar pruebas unitarias, de integración y de aceptación para asegurar la calidad.
Preparación para el Lanzamiento del MVP: Incluye la migración inicial de datos históricos de Meetup (si aplica) y la capacitación al equipo Admin.
