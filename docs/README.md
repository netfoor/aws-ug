# AWS User Group Puebla - Documentación

Este directorio contiene la documentación técnica completa del proyecto AWS User Group Puebla.

## 📚 Índice de Documentación

### 🔐 Pilar 1: Sistema de Autenticación
- [**auth-system.md**](./auth-system.md) - Documentación completa del sistema de autenticación implementado con AWS Amplify Gen2

### 🚧 Próximos Pilares (En desarrollo)
- **Pilar 2**: Gestión de Eventos y Contenido
- **Pilar 3**: Sistema de Notificaciones y Newsletter
- **Pilar 4**: Panel de Administración
- **Pilar 5**: Integración con APIs Externas

## 🏗️ Arquitectura General

El proyecto está construido sobre **Next.js 15** con **AWS Amplify Gen2**, dividido en pilares modulares que permiten desarrollo y testing independiente.

### Stack Tecnológico Principal
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: AWS Amplify Gen2 (Cognito + Lambda + DynamoDB)
- **Autenticación**: AWS Cognito con OAuth2 (Google)
- **Estilos**: Tailwind CSS 4
- **Estado**: React Context API
- **Build**: Turbopack

## 📁 Estructura del Proyecto

```
aws-ug/
├── amplify/                 # Configuración AWS Amplify Gen2
│   ├── auth/               # Recursos de autenticación
│   ├── data/               # Modelos de datos (futuro)
│   └── backend.ts          # Definición del backend
├── src/
│   ├── app/                # App Router de Next.js
│   ├── components/         # Componentes reutilizables
│   ├── context/           # Context providers
│   ├── lib/               # Utilidades y configuración
│   └── middleware.ts      # Middleware de autenticación
├── docs/                  # Documentación técnica
└── public/               # Archivos estáticos
```

## 🔄 Estado Actual

### ✅ Completado (Pilar 1)
- Sistema de autenticación completo
- Protección de rutas con middleware
- Gestión de sesiones segura
- UI/UX funcional para auth flow

### 🔄 En Desarrollo
- Tests automatizados
- Sistema de eventos
- Panel de administración

## 📖 Cómo Usar Esta Documentación

1. **Desarrolladores nuevos**: Empiecen por `auth-system.md`
2. **Code reviewers**: Revisen la arquitectura en cada pilar
3. **DevOps**: Consulten las configuraciones de Amplify
4. **Testing**: Usen los diagramas de flujo para casos de prueba

---

**Última actualización**: October 2025  
**Versión del proyecto**: 0.1.0