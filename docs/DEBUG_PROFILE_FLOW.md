# 🐛 Debugging: Flujo de Perfil de Usuario

## 📋 ¿Qué acabamos de arreglar?

### **Problema 1: Formulario con campos vacíos**
❌ **Antes:** Al hacer click en "Editar Perfil", los campos salían vacíos
✅ **Ahora:** Los campos se llenan automáticamente con tus datos actuales

**Causa:** El `useEffect` no se ejecutaba cuando `profile` cambiaba

**Solución:**
```typescript
useEffect(() => {
  if (profile) {
    console.log('[EditProfileForm] Inicializando formulario con profile:', profile);
    setFormData({
      givenName: profile.givenName || '',
      // ... resto de los campos
    });
  }
}, [profile]); // ← Agregamos profile como dependencia
```

---

### **Problema 2: Sin logs ni feedback**
❌ **Antes:** No sabías si el guardado funcionaba o fallaba
✅ **Ahora:** Logs detallados en consola y mensajes en UI

**Logs agregados:**
- `[EditProfileForm] Inicializando formulario...`
- `[EditProfileForm] Guardando perfil...`
- `[useUserProfile] Guardando/Actualizando usuario en DynamoDB...`
- `[useUserProfile] ✅ Usuario guardado exitosamente`

---

### **Problema 3: Permisos de DynamoDB**
❌ **Antes:** Solo `allow.owner()` sin campo owner en el modelo
✅ **Ahora:** Agregado `allow.authenticated()` para que cualquier usuario autenticado pueda crear/editar su perfil

**Cambio en schema:**
```typescript
.authorization((allow) => [
  allow.guest().to(['read']),
  allow.groups(['ADMINS']).to(['create', 'update', 'delete', 'read']),
  allow.owner().to(['create', 'update', 'delete', 'read']),
  allow.authenticated().to(['create', 'update', 'read']), // ← NUEVO
])
```

---

## 🧪 **Cómo Probar Ahora**

### **Test 1: Verificar que el formulario se llena**

```bash
1. Abre http://localhost:3000/profile
2. Abre DevTools Console (F12)
3. Click en "Editar Perfil"
4. Busca en console: "[EditProfileForm] Inicializando formulario con profile:"
5. Verifica que los campos del formulario tienen tus datos
```

**✅ Éxito esperado:**
- Campos llenos con tu nombre, email, etc.
- Log en console mostrando el objeto `profile`

**❌ Si falla:**
- Campos vacíos → El profile no está cargando
- Revisa que `useUserProfile` esté funcionando

---

### **Test 2: Guardar cambios en el perfil**

```bash
1. Con el formulario abierto, edita un campo (ej: bio)
2. Click en "Guardar Cambios"
3. Observa los logs en console
4. Deberías ver mensaje de éxito en verde
```

**✅ Logs esperados:**
```
[EditProfileForm] Guardando perfil...
[EditProfileForm] Datos a enviar: { givenName: "...", familyName: "...", ... }
[useUserProfile] Guardando/Actualizando usuario en DynamoDB...
[useUserProfile] Obteniendo role desde Cognito...
[useUserProfile] Role desde Cognito: ADMIN
[useUserProfile] Usuario existente encontrado, actualizando...
[useUserProfile] ✅ Usuario guardado exitosamente
[EditProfileForm] ✅ Perfil guardado exitosamente
```

**❌ Si ves errores:**
- `Error updating profile: ...` → Ver el mensaje de error específico
- `Unauthorized` → Problema de permisos en Cognito/DynamoDB
- `Network error` → Problema de conexión con AppSync

---

### **Test 3: Verificar en DynamoDB**

```bash
1. Después de guardar exitosamente
2. Ve a AWS Console → DynamoDB → Tables
3. Busca la tabla "User-...-NONE"
4. Click en "Explore table items"
5. Deberías ver TU registro
```

**✅ Debe contener:**
- `id`: Tu Cognito User ID (sub)
- `givenName`: Tu nombre
- `familyName`: Tu apellido
- `email`: Tu email
- `role`: "ADMIN" (si estás en grupo ADMINS)
- Todos los demás campos que editaste

---

### **Test 4: Verificar role desde Cognito**

```bash
1. Ve a /profile (sin editar)
2. Observa el badge de role
3. Debería decir "ADMIN" (si estás en grupo ADMINS)
4. Debería aparecer badge "🔑 Admin Access"
```

**✅ Verificar:**
- Role correcto según tus grupos de Cognito
- Caja azul explicando que viene de Cognito
- Si cambias de grupo en Cognito → Cerrar sesión → Volver a iniciar → Debería actualizarse

---

## 🔍 **Logs a Buscar en Console**

### **Al cargar /profile:**
```
[AuthContext] Usuario autenticado: {userId: "...", username: "..."}
[useUserProfile] Cargando perfil para usuario: ...
[useUserProfile] Obteniendo role desde Cognito...
[useUserProfile] Role desde Cognito: ADMIN
```

### **Al abrir formulario de edición:**
```
[EditProfileForm] Montando componente
[EditProfileForm] Profile recibido: {...}
[EditProfileForm] Inicializando formulario con profile: {...}
```

### **Al guardar cambios:**
```
[EditProfileForm] Guardando perfil...
[EditProfileForm] Datos a enviar: {...}
[useUserProfile] Guardando/Actualizando usuario en DynamoDB...
[useUserProfile] Obteniendo role desde Cognito...
[useUserProfile] Role desde Cognito: ADMIN
[useUserProfile] Usuario existente encontrado, actualizando...
[useUserProfile] Datos a guardar: {...}
[useUserProfile] ✅ Usuario guardado exitosamente
[EditProfileForm] ✅ Perfil guardado exitosamente
```

---

## ❌ **Errores Comunes y Soluciones**

### **Error 1: "Usuario no autenticado"**
```
❌ Error: Usuario no autenticado
```
**Causa:** No hay sesión activa de Cognito
**Solución:** Cerrar sesión y volver a iniciar

---

### **Error 2: "Unauthorized to perform appsync:GraphQL"**
```
❌ Error updating profile: Unauthorized to perform appsync:GraphQL
```
**Causa:** Permisos insuficientes en DynamoDB
**Solución:** 
1. Verificar que hiciste `npx ampx sandbox` después de cambiar el schema
2. Verificar que el schema tiene `allow.authenticated()`

---

### **Error 3: "Cannot read properties of undefined (reading 'givenName')"**
```
❌ TypeError: Cannot read properties of undefined (reading 'givenName')
```
**Causa:** `profile` es `null` cuando el formulario intenta inicializarse
**Solución:** Ya arreglado con el `useEffect([profile])`

---

### **Error 4: Campos vacíos después de hacer click en "Editar"**
```
✅ Formulario se abre
❌ Pero todos los campos están vacíos
```
**Causa:** `profile` no está cargado aún o es `null`
**Verificar:**
1. Console log debe mostrar: `[EditProfileForm] Profile recibido: {...}`
2. Si muestra `null`, el problema está en `useUserProfile`

---

## 🔄 **Flujo Completo Esperado**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario va a /profile                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. useUserProfile.fetchProfile()                        │
│    - Obtiene role desde Cognito                         │
│    - Busca datos en DynamoDB                            │
│    - Combina ambos → profile                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. UI muestra perfil                                    │
│    - Badge con role desde Cognito                       │
│    - Datos de DynamoDB (nombre, bio, etc.)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Usuario click "Editar Perfil"                        │
│    - EditProfileForm recibe profile                     │
│    - useEffect llena formData                           │
│    - Campos se muestran llenos                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Usuario edita campos y guarda                        │
│    - handleSubmit() se ejecuta                          │
│    - Llama a updateProfile()                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 6. updateProfile() en useUserProfile                    │
│    - Obtiene role actual desde Cognito                  │
│    - Verifica si existe en DynamoDB                     │
│    - UPDATE o CREATE según corresponda                  │
│    - Incluye role desde Cognito                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 7. DynamoDB actualizado                                 │
│    ✅ Registro creado/actualizado                       │
│    ✅ Role sincronizado desde Cognito                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 8. UI actualizada                                       │
│    - Mensaje de éxito                                   │
│    - Vuelve a vista de perfil                           │
│    - Datos actualizados visibles                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 **Checklist Final**

Marca cada uno cuando funcione:

- [ ] **Formulario carga con datos existentes**
  - Campos no están vacíos
  - Logs muestran profile correcto

- [ ] **Guardar cambios funciona**
  - Mensaje de éxito aparece
  - No hay errores en console
  - Logs muestran "Usuario guardado exitosamente"

- [ ] **Registro aparece en DynamoDB**
  - AWS Console muestra el registro
  - Campos están llenos correctamente
  - Role coincide con grupo de Cognito

- [ ] **Role se sincroniza desde Cognito**
  - Badge muestra role correcto
  - Badge "🔑 Admin Access" aparece si eres admin
  - Campo `role` en DynamoDB coincide

- [ ] **Editar múltiples veces funciona**
  - Campos se llenan con datos previos
  - Cambios se guardan correctamente
  - No hay pérdida de datos

---

## 📞 **Si Algo Falla**

### **Paso 1: Captura los logs**
```bash
1. Abre Console (F12)
2. Tab "Console"
3. Reproduce el problema
4. Click derecho en console → "Save as..."
5. Guarda los logs
```

### **Paso 2: Verifica permisos de Cognito**
```bash
1. AWS Console → Cognito → User Pools
2. Tu user pool
3. Users → Tu usuario
4. Tab "Group memberships"
5. Deberías estar en al menos un grupo
```

### **Paso 3: Verifica la tabla DynamoDB**
```bash
1. AWS Console → DynamoDB → Tables
2. Busca "User-...-NONE"
3. Tab "Explore table items"
4. ¿Aparece tu registro?
```

### **Paso 4: Revisa errores de AppSync**
```bash
1. AWS Console → AppSync
2. Tu API
3. Tab "Queries"
4. Try a test query:

query MyQuery {
  listUsers {
    items {
      id
      givenName
      familyName
      email
      role
    }
  }
}
```

---

## 📚 **Archivos Relevantes**

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useUserProfile.ts` | Hook que maneja CRUD de perfil |
| `src/components/profile/EditProfileForm.tsx` | Formulario de edición |
| `src/app/profile/page.tsx` | Página de perfil |
| `src/lib/amplify/auth.ts` | Funciones de autenticación y role |
| `amplify/data/resource.ts` | Schema de DynamoDB |

---

¿Qué logs ves en la consola? ¿El formulario ahora se llena con tus datos? 🚀
