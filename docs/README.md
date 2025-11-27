# 📚 Documentación del Proyecto AWS UG# AWS User Group Puebla - Documentación



**Proyecto:** Sistema de Autenticación con AWS Amplify Gen 2 + Next.js 15  Este directorio contiene la documentación técnica completa del proyecto AWS User Group Puebla.

**Estado:** En desarrollo (Fase 2 completada, Fase 3 pendiente)  

**Última actualización:** 9 de octubre de 2025## 📚 Índice de Documentación



---### 🔐 Pilar 1: Sistema de Autenticación

- [**auth-system.md**](./auth-system.md) - Documentación completa del sistema de autenticación implementado con AWS Amplify Gen2

## 📋 Índice de Documentación

### 🚧 Próximos Pilares (En desarrollo)

### 🔍 [Análisis](./analysis/)- **Pilar 2**: Gestión de Eventos y Contenido

Documentos de análisis técnico y comparación de versiones.- **Pilar 3**: Sistema de Notificaciones y Newsletter

- **Pilar 4**: Panel de Administración

- **[ANALISIS_AUTENTICACION.md](./analysis/ANALISIS_AUTENTICACION.md)**  - **Pilar 5**: Integración con APIs Externas

  Análisis comprehensivo del sistema de autenticación, vulnerabilidades identificadas y arquitectura actual.

  ## 🏗️ Arquitectura General

- **[COMPARACION_VERSIONES.md](./analysis/COMPARACION_VERSIONES.md)**  

  Comparación entre commits ca63e3d vs c8c60f0. Decisión: proceder con c8c60f0 (ahorra 17 horas de desarrollo UI).El proyecto está construido sobre **Next.js 15** con **AWS Amplify Gen2**, dividido en pilares modulares que permiten desarrollo y testing independiente.



---### Stack Tecnológico Principal

- **Frontend**: Next.js 15 + React 19 + TypeScript

### 🔐 [Seguridad](./security/)- **Backend**: AWS Amplify Gen2 (Cognito + Lambda + DynamoDB)

Documentación de implementaciones de seguridad y resolución de problemas OAuth.- **Autenticación**: AWS Cognito con OAuth2 (Google)

- **Estilos**: Tailwind CSS 4

- **[FASE_2_SEGURIDAD.md](./security/FASE_2_SEGURIDAD.md)** ⭐  - **Estado**: React Context API

  Implementación completa de mejoras de seguridad:- **Build**: Turbopack

  - MFA (Multi-Factor Authentication) habilitado

  - Rate limiting (100 req/min)## 📁 Estructura del Proyecto

  - Protección CSRF

  - Logging mejorado```

  - Validación de configuraciónaws-ug/

├── amplify/                 # Configuración AWS Amplify Gen2

- **[DEBUG_GOOGLE_OAUTH.md](./security/DEBUG_GOOGLE_OAUTH.md)**  │   ├── auth/               # Recursos de autenticación

  Guía de troubleshooting para errores de Google OAuth (401 invalid_client, access_denied, etc).│   ├── data/               # Modelos de datos (futuro)

│   └── backend.ts          # Definición del backend

- **[GOOGLE_OAUTH_CHECKLIST.md](./security/GOOGLE_OAUTH_CHECKLIST.md)**  ├── src/

  Checklist de verificación paso a paso para configuración de Google OAuth con Cognito.│   ├── app/                # App Router de Next.js

│   ├── components/         # Componentes reutilizables

---│   ├── context/           # Context providers

│   ├── lib/               # Utilidades y configuración

### 🧪 [Testing](./testing/)│   └── middleware.ts      # Middleware de autenticación

Documentación de pruebas y testing del sistema.├── docs/                  # Documentación técnica

└── public/               # Archivos estáticos

- **[TESTING_CHECKLIST.md](./testing/TESTING_CHECKLIST.md)**  ```

  Checklist completo de 12 pruebas para verificar funcionalidad del sistema post-login.

## 🔄 Estado Actual

---

### ✅ Completado (Pilar 1)

### 🧹 [Limpieza](./cleanup/)- Sistema de autenticación completo

Documentación de procesos de limpieza y organización del proyecto.- Protección de rutas con middleware

- Gestión de sesiones segura

- **[LIMPIEZA_PROYECTO.md](./cleanup/LIMPIEZA_PROYECTO.md)**  - UI/UX funcional para auth flow

  Plan de limpieza del proyecto antes del refactoring.

### 🔄 En Desarrollo

- **[RESUMEN_LIMPIEZA.md](./cleanup/RESUMEN_LIMPIEZA.md)**  - Tests automatizados

  Resumen de archivos eliminados (40+ archivos, ~150KB liberados).- Sistema de eventos

- Panel de administración

---

## 📖 Cómo Usar Esta Documentación

### 📝 [Planificación](./planning/)

Planes de acción y roadmaps del proyecto.1. **Desarrolladores nuevos**: Empiecen por `auth-system.md`

2. **Code reviewers**: Revisen la arquitectura en cada pilar

- **[PLAN_DE_ACCION.md](./planning/PLAN_DE_ACCION.md)** ⭐  3. **DevOps**: Consulten las configuraciones de Amplify

  Plan maestro de 4 fases con código específico para cada implementación:4. **Testing**: Usen los diagramas de flujo para casos de prueba

  - ✅ Fase 1: Migración a server-side auth (COMPLETADA)

  - ✅ Fase 2: Mejoras de seguridad (COMPLETADA)---

  - ⏳ Fase 3: Arreglar tests (PENDIENTE)

  - ⏳ Fase 4: Optimización y documentación (PENDIENTE)**Última actualización**: October 2025  

**Versión del proyecto**: 0.1.0
---

### 🏗️ [Arquitectura](./auth-system.md)
Documentación técnica del sistema de autenticación.

- **[auth-system.md](./auth-system.md)**  
  Documentación detallada del sistema de autenticación (puede estar desactualizada post-refactoring).

---

### 🎤 [Sistema de Speakers](./SPEAKER_WORKFLOW_TECHNICAL.md)

Documentación completa del sistema de postulación para speakers.

- **[SPEAKER_WORKFLOW_TECHNICAL.md](./SPEAKER_WORKFLOW_TECHNICAL.md)** ⭐⭐⭐  
  **Documentación técnica completa del flujo de postulación de speakers:**
  - 🏗️ Arquitectura del sistema con diagramas
  - 📂 Todos los archivos involucrados explicados línea por línea
  - 🔄 Flujo detallado paso a paso (9 pasos completos)
  - 📧 2 emails automáticos (confirmación + aprobación)
  - ⏰ EventBridge Scheduler (5 min delay)
  - 📊 Monitoreo con CloudWatch Logs
  - 🐛 Troubleshooting completo
  - ✅ 99% IaC (Infrastructure as Code)
  
- **[SPEAKER_WORKFLOW_SETUP.md](./SPEAKER_WORKFLOW_SETUP.md)**  
  Guía de setup inicial e IaC (Infrastructure as Code) del sistema.

- **[SPEAKER_SYSTEM_SETUP.md](./SPEAKER_SYSTEM_SETUP.md)**  
  Guía de post-deploy setup y scripts de configuración.

---

## 🎯 Estado del Proyecto

### ✅ Completado (Fases 1, 2 y 3)

**Migración Server-Side:**
- ✅ Implementado `@aws-amplify/adapter-nextjs`
- ✅ Creado `/api/auth/session` endpoint
- ✅ Eliminado `token-sync.ts` (inseguro)
- ✅ Simplificado middleware de 72 líneas

**Seguridad:**
- ✅ MFA opcional (SMS + TOTP)
- ✅ Rate limiting (100 req/min por IP)
- ✅ CSRF tokens + cookies httpOnly
- ✅ Logging detallado con stack traces
- ✅ Validación de amplify_outputs.json

**OAuth Google:**
- ✅ Credenciales configuradas correctamente
- ✅ Client Secret corregido (estaba duplicado)
- ✅ URIs de redirect autorizadas
- ✅ Login funcionando correctamente

**Tests:**
- ✅ 95/95 tests pasando (100%)
- ✅ Tests de auth-context y navigation arreglados
- ✅ 21 tests de rate limiting
- ✅ 40 tests de CSRF protection
- ✅ Build sin errores
- ✅ Arreglado loop infinito en `/auth/callback`

---

### ⏳ Pendiente (Fase 4)

**Tests E2E:**
- ⏳ Re-habilitar 6 tests E2E pausados
- ⏳ Actualizar para nueva arquitectura server-side

**Fase 4 - Optimización:**
- ⏳ Optimizar token refresh logic
- ⏳ Agregar caching para session checks
- ⏳ Documentación completa de AUTHENTICATION.md
- ⏳ Actualizar README.md con nueva arquitectura

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Compilación** | ✅ SUCCESS |
| **Tests unitarios** | 95/95 (100%) |
| **Tests E2E** | 0/6 (pausados) |
| **Seguridad** | ⭐⭐⭐⭐⭐ Producción |
| **Archivos doc** | 9 archivos organizados |
| **Código eliminado** | ~150KB (40+ archivos) |
| **Tiempo invertido** | ~6-7 horas (Fases 1+2+3) |

---

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Iniciar dev server
npm run dev

# Compilar proyecto
npm run build

# Validar configuración
npm run validate
```

### Testing
```bash
# Ejecutar tests unitarios
npm test

# Tests con cobertura
npm run test:coverage

# Tests E2E (cuando se re-habiliten)
npm run test:e2e
```

### Amplify Sandbox
```bash
# Iniciar sandbox
npx ampx sandbox

# Eliminar sandbox
npx ampx sandbox delete

# Gestionar secrets
npx ampx sandbox secret list
npx ampx sandbox secret set SECRET_NAME
npx ampx sandbox secret get SECRET_NAME
```

### Scripts Personalizados
```bash
# Validar credenciales de Google OAuth
node scripts/test-google-oauth.js

# Validar configuración de Amplify
node scripts/validate-config.js
```

---

## 🔗 Enlaces Importantes

- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **AWS Cognito Console:** https://console.aws.amazon.com/cognito
- **Amplify Docs:** https://docs.amplify.aws/gen2/
- **Next.js 15 Docs:** https://nextjs.org/docs

---

## 📝 Notas para el Equipo

### Advertencias Normales (Ignorar)

Estos warnings son **esperados y seguros**:

```
SES Removing unpermitted intrinsics lockdown-install.js
Content-Security-Policy warnings (de Google/Cognito)
```

### Problemas Conocidos

1. **2 tests fallidos en auth-context.test.tsx**  
   Causa: Timing issues con `act()` en React Testing Library  
   Estado: Pendiente de arreglar en Fase 3

2. **6 tests E2E pausados**  
   Ubicación: `__tests__/paused-e2e/`  
   Razón: Requieren actualización post-refactoring  
   Estado: Se re-habilitarán en Fase 3

---

**Última revisión:** 9 de octubre de 2025  
**Versión:** 2.0.0 (Post Fase 2)
