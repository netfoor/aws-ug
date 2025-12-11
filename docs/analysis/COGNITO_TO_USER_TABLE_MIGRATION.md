# 🔄 Análisis: Migración de Cognito Attributes a User Table

## 📋 Resumen Ejecutivo

**Problema Actual:**
- Sistema usa **dos fuentes de verdad** para datos de usuario: Cognito attributes y tabla User
- Cognito attributes se usan directamente en múltiples lugares
- Cuando usuario edita perfil, solo se actualiza User table
- Esto causa **inconsistencias** (ej: evento muestra "Fortino Romero" pero perfil dice "Fortino Mantilla")

**Solución Propuesta:**
- **User table** como única fuente de verdad después del primer login
- **Lambda Post-Authentication** para auto-crear/actualizar User en cada login
- **Formulario de primer login** para capturar información adicional requerida
- Refactorizar código para leer siempre de User table

---

## 🎯 Estrategia de Implementación

### Fase 1: Infraestructura (Lambda Post-Auth)
1. Crear Lambda que se ejecute después de cada autenticación exitosa
2. Lambda verifica si usuario existe en tabla User
3. Si no existe → crea registro desde Cognito attributes
4. Si existe → actualiza email si cambió en Cognito
5. Mantener sincronización mínima

### Fase 2: Formulario de Primer Login
1. Detectar si `User.profileCompleted === false`
2. Redirigir a `/onboarding` o mostrar modal
3. Capturar campos requeridos:
   - ✅ Nombre (givenName)
   - ✅ Apellidos (familyName)
   - ✅ Teléfono (phoneNumber)
   - ✅ Empresa/Organización (company)
   - ✅ Intereses en AWS (interests[])
   - ✅ Newsletter opt-in
4. Marcar `profileCompleted = true`
5. Continuar al dashboard

### Fase 3: Refactorización de Código
1. Crear hook centralizado: `useUserData()` que siempre lee de User table
2. Reemplazar todos los usos de `userAttributes` por datos de User table
3. Eliminar fallbacks a Cognito attributes
4. Actualizar componentes listados abajo

---

## 📂 Archivos que Usan Cognito Attributes

### 🔴 CRÍTICO - Usan attributes para nombres/emails en operaciones

#### 1. `/src/app/events/[slug]/page.tsx`
**Líneas:** 170-173
```typescript
const givenName = String(userAttributes?.['custom:givenName'] || '');
const familyName = String(userAttributes?.['custom:familyName'] || '');
const userEmail = String(userAttributes?.email || '');
const avatarUrl = userAttributes?.['custom:avatarUrl'] ? String(userAttributes['custom:avatarUrl']) : undefined;
```
**Uso:** Al registrarse a un evento (GOING), guarda `userName` en EventRegistration
**Problema:** Si usuario cambió nombre en perfil, guardará nombre viejo de Cognito
**Solución:** Leer de User table antes de crear EventRegistration

---

#### 2. `/src/app/speaker/propose-talk/page.tsx`
**Líneas:** 106-108, 112
```typescript
const givenName = userAttributes?.['given_name'] as string || 'Usuario';
const familyName = userAttributes?.['family_name'] as string || '';
const email = userAttributes?.['email'] as string || '';
// ...
speakerName: `${givenName} ${familyName}`.trim(),
```
**Uso:** Al crear propuesta de charla, guarda `speakerName` en TalkProposal
**Problema:** Mismo - nombre desactualizado en propuestas
**Solución:** Leer de User table

---

#### 3. `/src/app/admin/events/new/page.tsx`
**Líneas:** 267
```typescript
speakerName: speakerApp.email.split('@')[0], // Nombre del email hasta @
```
**Uso:** Al crear evento desde SpeakerApplication
**Problema:** Usa email como nombre temporal porque SpeakerApplication no tiene givenName/familyName
**Solución:** 
- Agregar `givenName` y `familyName` a SpeakerApplication
- O mejor: agregar `userId` a SpeakerApplication y hacer join con User table

---

### 🟡 IMPORTANTE - Display de nombres en UI

#### 4. `/src/app/profile/page.tsx`
**Líneas:** 71-77
```typescript
const displayName = profile?.givenName && profile?.familyName 
  ? `${profile.givenName} ${profile.familyName}`
  : userAttributes?.given_name 
    ? `${userAttributes.given_name} ${userAttributes.family_name || ''}`
    : user.signInDetails?.loginId?.split('@')[0] || 'Usuario';

const displayEmail = profile?.email || userAttributes?.email || user.signInDetails?.loginId || '';
```
**Uso:** Mostrar nombre en página de perfil
**Problema:** Fallbacks confusos, prioridad incorrecta
**Solución:** Solo leer de User table, sin fallbacks

---

#### 5. `/src/components/layout/Navigation.tsx`
**Líneas:** 18, 22, 105
```typescript
const { userAttributes } = useAuth();
const userRole = userAttributes?.['custom:role'] as string | undefined;
// ...
{user?.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
```
**Uso:** Avatar inicial y detección de role
**Problema:** Role debería venir de User table (ya existe `role` field)
**Solución:** Usar User.role en lugar de custom:role attribute

---

#### 6. `/src/app/dashboard/page.tsx`
**Líneas:** 47, 279, 286, 290
```typescript
: user.signInDetails?.loginId?.split('@')[0] || 'Usuario';
// Varios lugares usan loginId para mostrar nombre
```
**Uso:** Bienvenida y display de usuario en dashboard
**Solución:** Leer User.givenName

---

#### 7. `/src/app/page.tsx` (Homepage)
**Líneas:** 86, 91
```typescript
{user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
¡Bienvenido, {user.signInDetails?.loginId?.split('@')[0] || 'Usuario'}!
```
**Uso:** Avatar y saludo en landing
**Solución:** Usar User.givenName

---

### 🟢 BAJO - Solo verificación de role

#### 8. `/src/app/speaker/propose-talk/page.tsx`
**Líneas:** 44
```typescript
const role = userAttributes['custom:role'] as string | undefined;
```
**Uso:** Verificar que usuario sea SPEAKER antes de proponer charla
**Solución:** Usar User.role (AuthContext ya provee `isAdmin`, agregar `isSpeaker`)

---

## 🗄️ Cambios en Schema/Models

### User Model - Estado Actual
```typescript
User: a.model({
  id: a.id().required(),
  email: a.string().required(),
  givenName: a.string(),
  familyName: a.string(),
  phoneNumber: a.string(),
  company: a.string(),
  bio: a.string(),
  avatarUrl: a.string(),
  role: a.enum(['ADMIN', 'MEMBER', 'SPEAKER']),
  interests: a.string().array(),
  socialLinks: a.json(),
  newsletterOptIn: a.boolean().default(false),
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
})
```

### ✅ Campos Faltantes a Agregar
```typescript
User: a.model({
  // ... campos existentes ...
  
  // 🆕 Nuevos campos
  profileCompleted: a.boolean().default(false), // Para detectar primer login
  cognitoSyncedAt: a.datetime(), // Última sincronización con Cognito
  lastLoginAt: a.datetime(), // Último login exitoso
})
```

### SpeakerApplication - Cambio Propuesto
```typescript
SpeakerApplication: a.model({
  // ... campos existentes ...
  userId: a.string().required(),
  email: a.string().required(),
  
  // ❌ REMOVER - Ya no necesarios si tenemos userId
  // Estos campos viven en User table
  // givenName: a.string(),
  // familyName: a.string(),
  
  // ✅ MANTENER
  motivation: a.string().required(),
  topics: a.string().array(),
  status: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
})
```

**Nota:** Al tener `userId`, podemos hacer join con User para obtener nombre completo.

---

## 🔧 Hooks y Utilidades a Crear

### 1. `useUserData()` - Hook Centralizado
```typescript
// src/hooks/useUserData.ts
export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.userId) {
      loadUserData();
    }
  }, [user?.userId]);

  const loadUserData = async () => {
    const client = generateClient<Schema>();
    const { data } = await client.models.User.get({ id: user!.userId });
    setUserData(data);
    setIsLoading(false);
  };

  return { userData, isLoading, refetch: loadUserData };
}
```

### 2. Modificar `AuthContext` para incluir User data
```typescript
interface AuthContextType {
  user: AuthUser | null;
  userData: User | null; // 🆕 Agregar datos completos
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSpeaker: boolean; // 🆕 Agregar
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
```

### 3. Lambda Post-Authentication
```typescript
// amplify/functions/post-auth-sync/handler.ts
export const handler = async (event: PostAuthenticationTriggerEvent) => {
  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const givenName = event.request.userAttributes.given_name;
  const familyName = event.request.userAttributes.family_name;

  // Verificar si usuario existe
  const existingUser = await getUser(userId);

  if (!existingUser) {
    // Crear nuevo usuario
    await createUser({
      id: userId,
      email,
      givenName,
      familyName,
      role: 'MEMBER',
      profileCompleted: false, // 🚨 Importante: forzar onboarding
      cognitoSyncedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  } else {
    // Actualizar última conexión
    await updateUser(userId, {
      lastLoginAt: new Date().toISOString(),
      // Opcionalmente actualizar email si cambió
      email: email !== existingUser.email ? email : existingUser.email,
    });
  }

  return event;
};
```

---

## 📊 Plan de Migración por Prioridad

### 🔥 FASE 1: Infraestructura Base (1-2 días)
- [ ] Crear Lambda post-authentication
- [ ] Agregar campos a User model (profileCompleted, cognitoSyncedAt, lastLoginAt)
- [ ] Deploy y pruebas de Lambda
- [ ] Verificar que usuarios nuevos se crean automáticamente

### 🔥 FASE 2: Formulario Onboarding (1 día)
- [ ] Crear página `/onboarding` o modal
- [ ] Detectar `profileCompleted === false` en AuthContext
- [ ] Redirigir automáticamente después de login
- [ ] Capturar información requerida
- [ ] Marcar profileCompleted = true

### 🟡 FASE 3: Refactorización Alto Impacto (2-3 días)
- [ ] Modificar AuthContext para cargar User data
- [ ] Refactorizar `/events/[slug]/page.tsx` (registros)
- [ ] Refactorizar `/speaker/propose-talk/page.tsx` (propuestas)
- [ ] Refactorizar `/admin/events/new/page.tsx` (creación eventos)
- [ ] Actualizar SpeakerApplication para usar userId correctamente

### 🟢 FASE 4: UI y Display (1-2 días)
- [ ] Refactorizar `/profile/page.tsx`
- [ ] Refactorizar `Navigation.tsx`
- [ ] Refactorizar `dashboard/page.tsx`
- [ ] Refactorizar homepage (`page.tsx`)
- [ ] Eliminar todos los fallbacks a Cognito attributes

### ✅ FASE 5: Testing y Validación (1 día)
- [ ] Probar flujo completo de nuevo usuario
- [ ] Probar edición de perfil y verificar consistencia
- [ ] Probar creación de eventos con nombre correcto
- [ ] Probar registros a eventos
- [ ] Probar propuestas de charlas

---

## 🚨 Consideraciones Importantes

### 1. **Datos Existentes**
Los usuarios que ya existen en Cognito pero no en User table:
- Lambda los creará automáticamente en próximo login
- Marcar `profileCompleted = false` para que completen perfil

### 2. **Sincronización Email**
Si usuario cambia email en Cognito (Google OAuth, etc):
- Lambda actualizará email en User table automáticamente
- Mantener email siempre sincronizado

### 3. **Role Management**
Los roles se asignan desde Cognito Groups pero se reflejan en User.role:
- ADMIN group → User.role = 'ADMIN'
- SPEAKERS group → User.role = 'SPEAKER'
- Default → User.role = 'MEMBER'
- Lambda sincroniza role en cada login

### 4. **Migración de SpeakerApplication**
Registros actuales tienen solo `email`, no `userId`:
- Script de migración para poblar `userId` desde email
- Buscar usuario por email y asignar userId
- Si no existe, marcar como pendiente de migración

### 5. **Performance**
AuthContext carga User data en cada login:
- Cachear en Context para evitar re-fetches
- Usar `refetch()` solo cuando sea necesario
- Considerar React Query para cache avanzado

---

## 📝 Notas Finales

**¿Por qué no usar Cognito attributes directamente?**
1. **Inmutabilidad**: Cognito attributes son difíciles de cambiar (requiere admin SDK)
2. **Limitaciones**: No puedes agregar campos personalizados fácilmente
3. **Consistencia**: User table permite modelo de datos más rico y flexible
4. **Validación**: Mejor control sobre reglas de negocio

**¿Cuándo usar Cognito?**
- Solo para autenticación y autorización (grupos)
- Email de recuperación de contraseña
- Triggers de autenticación (pre/post auth)

**¿Cuándo usar User Table?**
- Toda la información de perfil
- Preferencias del usuario
- Historial y métricas
- Relaciones con otros modelos (eventos, propuestas, etc)

---

## 🎯 Resultado Esperado

Después de la migración:

✅ **Consistencia Total**: Un solo nombre en todo el sistema  
✅ **Flexibilidad**: Usuario puede cambiar su nombre sin problemas  
✅ **Mejor UX**: Formulario de onboarding captura info desde el inicio  
✅ **Mantenibilidad**: Código más limpio, una sola fuente de verdad  
✅ **Escalabilidad**: Fácil agregar nuevos campos a User table  

❌ **Eliminado**: Fallbacks confusos a Cognito attributes  
❌ **Eliminado**: Usar email como nombre temporal  
❌ **Eliminado**: Inconsistencias entre Cognito y DynamoDB  

---

**Fecha de Análisis:** 10 de diciembre, 2025  
**Autor:** GitHub Copilot + Fortino  
**Estado:** ✅ Análisis Completo - Listo para Implementación
