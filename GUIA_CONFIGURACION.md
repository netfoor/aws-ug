# Guía de Configuración y Tour del Sistema AWS UG

## Descripción Breve del Sistema

Este es un sistema de autenticación y gestión de eventos para el AWS User Group Puebla, construido con Next.js 15, AWS Amplify Gen 2. Incluye integración con Google OAuth, gestión de speakers, eventos y usuarios.

### Lo que necesitas configurar antes de empezar:

1. **Cuenta de AWS** 
2. **Proyecto en Google Cloud Console** para OAuth y Maps API
3. **Node.js 18+** instalado

### Dependencias principales:
- Next.js 15 (framework)
- AWS Amplify Gen 2 (backend)
- Amazon Cognito (autenticación)
- Google OAuth (login)
- Google Maps API (ubicaciones)
- Tailwind CSS (estilos)

### APIs y servicios externos:
- Google Cloud Console (OAuth + Maps)
- AWS SES (emails, opcional)
- AWS Amplify (backend as code)

**Nota**: Si necesitas credenciales o ayuda con la configuración, contacta al desarrollador principal.

---

## Paso 1: Preparación del Entorno

### Instalar dependencias del sistema

**Comando**: Instalar Node.js 18+ desde [nodejs.org](https://nodejs.org/)

**Por qué**: El proyecto requiere Node.js para ejecutar Next.js y las herramientas de desarrollo.

### Verificar instalación

**Comando**: `node --version && npm --version`

**Por qué**: Confirma que Node.js y npm están instalados correctamente.

### Clonar el repositorio

**Comando**: `git clone <url-del-repo>`

**Navegar a la carpeta** `cd aws-ug`

**Por qué**: Obtener el código fuente del proyecto.

### Instalar dependencias del proyecto

**Comando**: `npm install`

**Por qué**: Instalar todas las librerías necesarias listadas en package.json.

---

## Paso 2: Configuración de Variables de Entorno

### Copiar archivo de ejemplo

**Comando**: `cp .env.local.example .env.local`

**Por qué**: Crear archivo de variables locales basado en la plantilla.

### Variables requeridas (configurar las necesarias una por una):

#### GOOGLE_CLIENT_ID
**Valor**: Obtener de Google Cloud Console  
**Por qué**: ID del cliente OAuth de Google para login.

#### GOOGLE_CLIENT_SECRET
**Valor**: Obtener de Google Cloud Console  
**Por qué**: Secreto del cliente OAuth de Google.

#### NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
**Valor**: Obtener de Google Cloud Console  
**Por qué**: API key para Google Maps (visible en frontend).

---

## Paso 3: Configuración de Credenciales en AWS Amplify

### Configurar AWS CLI (si no está hecho)

**Comando**: `aws configure`

**Por qué**: Configurar credenciales de AWS para acceder a servicios.

### Verificar configuración de AWS

**Comando**: `aws sts get-caller-identity`

**Por qué**: Confirmar que las credenciales de AWS son válidas.

### Configurar secrets de Google OAuth en Amplify

**Comando**: `npx ampx sandbox secret set GOOGLE_CLIENT_ID <tu-client-id>`

**Por qué**: Establecer el ID del cliente de Google en Amplify sandbox.

**Comando**: `npx ampx sandbox secret set GOOGLE_CLIENT_SECRET <tu-client-secret>`

**Por qué**: Establecer el secreto del cliente de Google en Amplify sandbox.

### Iniciar Amplify sandbox

**Comando**: `npx ampx sandbox`

**Por qué**: Desplegar el backend localmente para desarrollo.

### Verificar que sandbox esté corriendo

**Comando**: Verificar en terminal que muestra "File written: amplify_outputs.json"

**Por qué**: Confirmar que el backend está funcionando correctamente.

---

## Paso 4: Inicio del Servidor de Desarrollo

### Iniciar servidor de desarrollo (en nueva terminal)

**Comando**: `npm run dev`

**Por qué**: Iniciar el servidor de Next.js en modo desarrollo con Turbopack.

### Verificar que el servidor esté corriendo

**Comando**: Abrir navegador en http://localhost:3000

**Por qué**: Confirmar que la aplicación web está accesible.

### Verificar funcionalidades básicas

**Acción**: Navegar por la landing page principal.

**Por qué**: Asegurar que la aplicación carga correctamente.


---

## Paso 5: Configuración de Usuario Administrador

### Hacer login inicial con Google

**Acción**: En la aplicación hacer login con Google usando el correo que quieres que sea administrador

**Por qué**: Necesario crear el usuario en Cognito primero antes de asignar permisos de admin

### Ejecutar script de configuración de admin

**Comando**: `node scripts/admin-user-setup.js`

**Por qué**: Configurar permisos de administrador para el usuario que acabas de crear (el script explica que es necesario hacer login primero por temas de OAuth de Google)

### Seguir instrucciones del script

**Acción**: El script te pedirá el email del usuario admin y lo agregará al grupo ADMIN

**Por qué**: Asignar permisos administrativos al usuario

### Hacer re-login

**Acción**: Cerrar sesión y volver a hacer login con el mismo usuario

**Por qué**: Los cambios de grupos requieren nueva sesión para aplicarse

### Verificar acceso admin

**Acción**: Verificar que ahora tienes acceso a secciones de administración

**Por qué**: Confirmar que la configuración funcionó correctamente

---

## ⚠️ Nota Importante: Experiencia Móvil

**Para probar la aplicación en dispositivos móviles:**

**Opción 1 - Modo móvil del navegador (recomendado):**
- Abre DevTools (F12)
- Haz clic en el ícono de dispositivo móvil (📱) en la esquina superior
- Selecciona un dispositivo (ej: iPhone 12, Pixel 5)
- Recarga la página

**Opción 2 - Túnel con ngrok (avanzado):**
- Requiere configurar dominios adicionales en Google Cloud Console
- Complica la configuración inicial
- Solo recomendado si necesitas testing real en dispositivo físico

**Por qué es importante:** La aplicación está optimizada para móvil y algunas funcionalidades (como escaneo de QR) requieren vista móvil para funcionar correctamente.

---

## Paso 6: Exploración del Sistema

### Página principal (/)

**Acción**: Visitar http://localhost:3000

**Qué encontrarás**: Landing page con información del AWS UG Puebla y **lista de eventos publicados** (próximos y pasados)

### Eventos individuales (/events/[slug])

**Acción**: Hacer clic en un evento desde la página principal

**Qué encontrarás**: Detalles completos del evento, registro con QR, información del speaker, ubicación

### Sección de autenticación (/auth)

**Acción**: Acceder durante el proceso de login

**Qué hace**: Maneja callbacks de OAuth de Google

### Login (/login)

**Acción**: Para iniciar sesión con Google

**Qué encontrarás**: Botón de "Login con Google"

### Onboarding (/onboarding)

**Acción**: Primer acceso después de registro

**Qué encontrarás**: Completar perfil de usuario

### Perfil de usuario (/profile)

**Acción**: Gestionar tu información personal

**Qué encontrarás**: Editar datos personales, ver historial de asistencia

### Sección de speakers (/speaker)

**Acción**: Para speakers registrados

**Subsecciones:**
- **/speaker/apply**: Aplicar para ser speaker
- **/speaker/propose-talk**: Proponer una nueva charla
- **/speaker/my-proposals**: Ver tus propuestas de charlas

### Sección de administración (/admin - solo ADMINS)

**Acción**: Acceder con usuario administrador

**Subsecciones:**
- **/admin/dashboard**: Panel principal de administración
- **/admin/events**: Gestionar eventos
- **/admin/speakers**: Gestionar speakers
- **/admin/talk-proposals**: Gestionar propuestas de charlas

### Página de acceso denegado (/access-denied)

**Acción**: Cuando intentas acceder sin permisos

**Qué encontrarás**: Mensaje explicativo de permisos insuficientes


**Importante**
- Explora cada sección para familiarizarte con la navegación y funcionalidades.

- Algunas de las funcionalidades fueron pensadas principalmente para uso en movil y puede que necesites configurar un tunel local para poder abrirlo en el telefono. 

- Asegurate de navegar por todo el sistema!

---

## Paso 7: Comandos Adicionales y Troubleshooting

### Comandos de desarrollo útiles

**Construir para producción:**
```bash
npm run build
```
**Por qué**: Genera la versión optimizada para producción (incluye validación automática)

**Iniciar servidor de producción:**
```bash
npm run start
```
**Por qué**: Ejecuta la aplicación en modo producción

**Desarrollo con ngrok (para testing móvil real):**
```bash
npm run dev:ngrok
```
**Por qué**: Inicia el servidor con soporte para ngrok (requiere configuración adicional)

**Validar configuración:**
```bash
npm run validate
```
**Por qué**: Verifica que todas las variables de entorno estén configuradas

### Troubleshooting común

**Problema: Build falla**
```
npm run build
```
**Solución:**
1. Verificar que todas las variables de entorno estén configuradas
2. Limpiar cache: `rm -rf .next`
3. Reinstalar dependencias: `rm -rf node_modules && npm install`

**Problema: Amplify sandbox no inicia**
```
npx ampx sandbox
```
**Solución:**
1. Verificar credenciales AWS: `aws sts get-caller-identity`
2. Limpiar sandbox anterior: `npx ampx sandbox delete`
3. Reiniciar terminal

**Problema: Login con Google no funciona**
**Solución:**
1. Verificar que los secrets estén configurados en Amplify
2. Comprobar URLs de callback en Google Cloud Console
3. Asegurar que Amplify sandbox esté corriendo

**Problema: No se aplican cambios de permisos**
**Solución:**
1. Cerrar sesión completamente
2. Limpiar cookies/localStorage del navegador
3. Volver a hacer login


## 🎉 ¡Configuración Completa!

**Resumen de lo logrado:**
✅ Entorno de desarrollo configurado
✅ Variables de entorno establecidas  
✅ Credenciales AWS y Google configuradas
✅ Backend Amplify funcionando
✅ Servidor de desarrollo corriendo
✅ Usuario administrador configurado
✅ Sistema explorado y funcional

**Para desarrollo continuo:**
- Usa `npm run dev` para desarrollo
- Usa `npm run build` para verificar producción
- Contacta al desarrollador para soporte adicional

---

## 🐛 Reporte de Problemas

**Si encuentras algún problema durante la configuración o uso del sistema:**

### 🚨 Levantar un Issue en GitHub

1. **Ve al repositorio** del proyecto en GitHub
2. **Haz clic en "Issues"** en la parte superior
3. **Clic en "New Issue"**
4. **Elige el tipo de issue apropiado:**
   - 🐛 **Bug report** - Para errores o comportamientos inesperados
   - ❓ **Question** - Para preguntas sobre configuración o funcionamiento
   - 💡 **Feature request** - Para sugerencias de mejoras
   - 📚 **Documentation** - Para problemas con esta guía

### 📝 Información útil para incluir en el Issue:

**Para problemas de configuración:**
- Sistema operativo y versión
- Versión de Node.js: `node --version`
- Error exacto que aparece
- Pasos que seguiste antes del error
- Variables de entorno que configuraste (sin valores sensibles)

**Para problemas en ejecución:**
- URL donde ocurre el problema
- Navegador y versión
- Acciones que realizaste
- Mensajes de error en consola (F12 → Console)
- Capturas de pantalla si es relevante

### 💬 Soporte Adicional

- **Comentarios en Issues existentes** - Si encuentras un issue similar, agrega tu experiencia
- **Discusiones en GitHub** - Para preguntas generales sobre el proyecto
- **Contactar al desarrollador principal** - Para problemas urgentes o credenciales

**Nota:** El desarrollador principal revisará y resolverá los issues lo antes posible.

---

**Versión del documento:** 1.0  
**Última actualización:** Diciembre 2025  
**Proyecto:** AWS UG Puebla - Sistema de Gestión de Eventos