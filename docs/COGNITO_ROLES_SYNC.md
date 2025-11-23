# 🔐 Sincronización de Roles: Cognito ↔️ DynamoDB

## 📋 Resumen

Este documento explica cómo funciona la sincronización de roles entre **AWS Cognito Groups** y el campo **`role`** en la tabla de **DynamoDB**.

---

## 🎯 Problema Original

Antes teníamos **DOS sistemas desconectados**:

### 1. **Grupos de Cognito** (Backend - AWS)
- Grupos definidos: `ADMINS`, `SPEAKERS`, `MEMBERS`
- Se gestionan manualmente en AWS Console
- Se usan para autorización de API/Data
- Vienen en el JWT token: `cognito:groups`

### 2. **Campo `role` en DynamoDB**
- Enum: `MEMBER`, `SPEAKER`, `ADMIN`
- Solo un campo de datos en la tabla `User`
- **NO tenía conexión automática con Cognito**
- Se establecía manualmente como `'MEMBER'` por defecto

### ❌ **Resultado:**
- Usuario en grupo "ADMINS" de Cognito → Frontend mostraba "MEMBER"
- Desincronización total entre permisos y UI
- Confusión sobre qué sistema era la fuente de verdad

---

## ✅ Solución Implementada

Ahora **los grupos de Cognito son la fuente de verdad**:

```
┌─────────────────────────────────────────────────────────┐
│                  FUENTE DE VERDAD                       │
│                 AWS Cognito Groups                      │
│           (asignados por administrador)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          │ getUserRoleFromCognito()
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    TRADUCCIÓN                           │
│  • Grupo "ADMINS"   → role = "ADMIN"                   │
│  • Grupo "SPEAKERS" → role = "SPEAKER"                 │
│  • Grupo "MEMBERS"  → role = "MEMBER"                  │
│  • Sin grupo        → role = "MEMBER" (default)        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  • useUserProfile hook usa Cognito                     │
│  • profile.role siempre refleja grupos actuales        │
│  • UI muestra el role correcto automáticamente         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (opcional)
┌─────────────────────────────────────────────────────────┐
│                   DYNAMODB                              │
│  • Se sincroniza al crear/actualizar perfil            │
│  • Útil para queries y auditoría                       │
│  • NO es la fuente de verdad                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación Técnica

### 1. **Nueva función helper** (`src/lib/amplify/auth.ts`)

```typescript
export async function getUserRoleFromCognito(): Promise<'ADMIN' | 'SPEAKER' | 'MEMBER'> {
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
  
  if (groups.includes('ADMINS')) return 'ADMIN';
  if (groups.includes('SPEAKERS')) return 'SPEAKER';
  return 'MEMBER';
}
```

**Qué hace:**
- Lee el JWT token del usuario autenticado
- Busca el claim `cognito:groups`
- Traduce el grupo de Cognito al enum de role
- **Prioridad:** ADMIN > SPEAKER > MEMBER

---

### 2. **Hook actualizado** (`src/hooks/useUserProfile.ts`)

```typescript
const fetchProfile = async () => {
  // ✅ Obtener role desde Cognito (fuente de verdad)
  const roleFromCognito = await getUserRoleFromCognito();
  
  const { data: userData } = await client.models.User.get({ id: user.userId });
  
  setProfile({
    ...userData,
    role: roleFromCognito  // ← Siempre desde Cognito
  });
};
```

**Qué hace:**
- Al cargar el perfil, **primero obtiene el role de Cognito**
- Usa los demás datos de DynamoDB (nombre, bio, etc.)
- El role mostrado **siempre refleja los grupos actuales** en Cognito

---

### 3. **Sincronización a DynamoDB**

```typescript
const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
  const roleFromCognito = await getUserRoleFromCognito();
  
  await client.models.User.update({
    ...updatedProfile,
    role: roleFromCognito  // ← Sincronizar a DynamoDB
  });
};
```

**Qué hace:**
- Cuando se guarda el perfil, **sincroniza el role de Cognito a DynamoDB**
- El usuario **NO puede editar su role** manualmente
- DynamoDB refleja el último role conocido (útil para auditoría)

---

## 🚀 Flujo de Usuario

### **Escenario 1: Usuario nuevo se registra**

1. Usuario inicia sesión con Google
2. Cognito lo crea (por defecto, sin grupo)
3. Frontend lee `cognito:groups` → vacío → `role = 'MEMBER'`
4. Al editar perfil, se crea registro en DynamoDB con `role: 'MEMBER'`

**Resultado:** ✅ Usuario ve "MEMBER" en su perfil

---

### **Escenario 2: Admin agrega usuario al grupo "ADMINS"**

1. Admin va a AWS Console → Cognito → Users
2. Selecciona usuario → Add to group → "ADMINS"
3. Usuario **necesita cerrar sesión y volver a iniciar**
4. Nuevo token JWT incluye `cognito:groups: ['ADMINS']`
5. Frontend lee `getUserRoleFromCognito()` → retorna `'ADMIN'`
6. Al cargar `/profile`, muestra "ADMIN"
7. Al editar perfil, se sincroniza `role: 'ADMIN'` a DynamoDB

**Resultado:** ✅ Usuario ve "ADMIN" en su perfil

---

### **Escenario 3: Admin remueve usuario del grupo**

1. Admin remueve usuario del grupo "ADMINS" en Cognito
2. Usuario **necesita cerrar sesión y volver a iniciar**
3. Nuevo token JWT **NO incluye** `cognito:groups`
4. Frontend lee `getUserRoleFromCognito()` → retorna `'MEMBER'`
5. Usuario ve "MEMBER" en su perfil

**Resultado:** ✅ Cambios en Cognito se reflejan automáticamente

---

## 🔑 Puntos Clave

### ✅ **Ventajas de este enfoque:**

1. **Una sola fuente de verdad:** Cognito groups
2. **Sincronización automática:** No requiere código adicional
3. **Seguro:** Usuario no puede cambiar su propio role
4. **Consistente:** Frontend siempre muestra el role actual
5. **Auditable:** DynamoDB guarda histórico

### ⚠️ **Consideraciones importantes:**

1. **Requiere refresh del token:** Cambios en grupos necesitan nuevo login
2. **Caché de 5 segundos:** El AuthContext tiene caché, pero no afecta
3. **Prioridad:** Si usuario está en múltiples grupos, ADMIN tiene prioridad

---

## 🧪 Cómo Probarlo

### **Test 1: Usuario normal**

```bash
1. Iniciar sesión con usuario nuevo
2. Ir a /profile
3. Verificar que muestre "MEMBER"
```

### **Test 2: Promover a ADMIN**

```bash
1. Ir a AWS Console → Cognito → User Pools
2. Seleccionar tu usuario
3. Tab "Group memberships" → Add to group → "ADMINS"
4. Cerrar sesión en la app
5. Volver a iniciar sesión
6. Ir a /profile
7. Verificar que muestre "ADMIN" y badge "🔑 Admin Access"
```

### **Test 3: Verificar sincronización a DynamoDB**

```bash
1. Después del Test 2
2. Editar perfil (cambiar bio, por ejemplo)
3. Ir a AWS Console → DynamoDB → Tables → User
4. Buscar tu usuario
5. Verificar que campo "role" = "ADMIN"
```

---

## 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/lib/amplify/auth.ts` | ✅ Agregada función `getUserRoleFromCognito()` |
| `src/hooks/useUserProfile.ts` | ✅ Hook lee role desde Cognito |
| `src/app/profile/page.tsx` | ✅ UI actualizada con badges y explicación |

---

## 🔮 Futuras Mejoras (Opcionales)

### **1. Lambda Trigger para auto-asignación**

Crear un Lambda que asigne automáticamente usuarios nuevos al grupo "MEMBERS":

```javascript
// Lambda: Cognito PostAuthentication Trigger
exports.handler = async (event) => {
  const userGroups = event.request.groupConfiguration.groupsToOverride || [];
  
  // Si no tiene grupos, agregarlo a MEMBERS
  if (userGroups.length === 0) {
    event.response.groupConfiguration.groupsToOverride = ['MEMBERS'];
  }
  
  return event;
};
```

### **2. Página de administración de usuarios**

Crear `/admin/users` donde los admins puedan:
- Ver todos los usuarios
- Asignar/remover grupos
- Ver qué grupos tiene cada usuario

### **3. Refresh automático del token**

Implementar un sistema que refresque el token cuando detecte cambios en grupos (requiere WebSocket o polling).

---

## ❓ Preguntas Frecuentes

**Q: ¿Por qué necesito cerrar sesión para ver los cambios?**  
A: Los grupos vienen en el JWT token. El token se genera al iniciar sesión y tiene validez de ~1 hora. Para obtener los nuevos grupos, necesitas un nuevo token.

**Q: ¿Puedo cambiar mi propio role desde el frontend?**  
A: No. El role viene de Cognito y solo los admins pueden modificar grupos en AWS Console.

**Q: ¿Qué pasa si el campo `role` en DynamoDB no coincide con Cognito?**  
A: El frontend **siempre** usa Cognito. El campo en DynamoDB se sincroniza automáticamente la próxima vez que edites tu perfil.

**Q: ¿Necesito eliminar el campo `role` de DynamoDB?**  
A: No es necesario. Es útil para queries y auditoría. Solo recuerda que **NO es la fuente de verdad**.

---

## 📚 Referencias

- [AWS Cognito User Pool Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [JWT Claims in Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)
- [Amplify Gen 2 Authorization](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/)
