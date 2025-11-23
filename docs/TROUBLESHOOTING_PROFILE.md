# 🔧 Troubleshooting: Perfil de Usuario

## 🐛 Problema: El formulario no guarda datos en DynamoDB

### Síntomas:
- ✅ Usuario autenticado
- ✅ Formulario se muestra
- ❌ Al editar y guardar, no aparece en DynamoDB
- ❌ Los campos del formulario aparecen vacíos al abrir edición
- ❌ No hay logs en consola

---

## 🔍 Diagnóstico Realizado

### 1. **Problema encontrado: `useState` inicial no se actualiza**

**Código original (MALO):**
```tsx
const [formData, setFormData] = useState<Partial<UserProfile>>({
  givenName: profile?.givenName || '',  // ← profile es null al inicio
  // ...
});
```

**¿Por qué falla?**
- `useState` solo se ejecuta **una vez** cuando el componente se monta
- En ese momento, `profile` todavía es `null` (se está cargando async)
- Resultado: todos los campos quedan vacíos `''`

**Solución (BUENO):**
```tsx
// Inicializar vacío
const [formData, setFormData] = useState<Partial<UserProfile>>({
  givenName: '',
  // ...
});

// Sincronizar cuando profile cambia
useEffect(() => {
  if (profile) {
    setFormData({
      givenName: profile.givenName || '',
      // ...
    });
  }
}, [profile]);
```

---

### 2. **Problema encontrado: Falta de logs de debugging**

**Antes:**
- No sabíamos si `updateProfile` se estaba llamando
- No sabíamos si había errores
- No sabíamos qué datos se estaban enviando

**Después:**
- ✅ Logs en `EditProfileForm.handleSubmit`
- ✅ Logs en `useUserProfile.updateProfile`
- ✅ Logs en cada paso del proceso (GET, CREATE, UPDATE)
- ✅ Mensajes de error visibles en la UI

---

### 3. **Problema potencial: Permisos de DynamoDB**

**Configuración de autorización:**
```typescript
.authorization((allow) => [
  allow.guest().to(['read']),                        // ← Invitados solo leen
  allow.groups(['ADMINS']).to(['create', 'update', 'delete', 'read']),
  allow.owner().to(['create', 'update', 'delete', 'read']),  // ← Owner = id del registro
  allow.authenticated().to(['create', 'read']),     // ← NUEVO: Autenticados pueden crear
])
```

**¿Cómo funciona `allow.owner()`?**
- Amplify compara el **`id` del registro** con el **`sub` del usuario** (userId)
- Para que funcione, el `id` del registro debe ser igual al `userId` de Cognito
- En nuestro código: `id: user.userId` ✅

---

## 📋 Checklist de Verificación

### Antes de guardar el perfil:

1. **¿El usuario está autenticado?**
   ```typescript
   // En consola del navegador:
   await (await fetch('/api/auth/session')).json()
   // Debe retornar: { isAuthenticated: true, groups: [...] }
   ```

2. **¿Tienes el userId?**
   ```typescript
   // En useUserProfile:
   console.log('User ID:', user?.userId)
   // Debe mostrar algo como: "12345678-1234-1234-1234-123456789012"
   ```

3. **¿El formulario tiene datos?**
   ```typescript
   // En EditProfileForm:
   console.log('Form data:', formData)
   // Debe mostrar: { givenName: "...", email: "...", ... }
   ```

### Durante el guardado:

4. **¿Se está llamando a updateProfile?**
   ```
   Buscar en consola: "🔄 useUserProfile.updateProfile: Iniciando actualización..."
   ```

5. **¿Qué datos se están enviando?**
   ```
   Buscar en consola: "📋 Datos a actualizar: {...}"
   ```

6. **¿Hay errores?**
   ```
   Buscar en consola: "❌" o errores en rojo
   ```

### Después del guardado:

7. **¿Se guardó exitosamente?**
   ```
   Buscar en consola: "✅ Usuario creado:" o "✅ Usuario actualizado:"
   ```

8. **¿Aparece en DynamoDB?**
   - Ve a AWS Console → DynamoDB → Tables → User-xxx
   - Busca por el `id` (debe ser tu userId)

---

## 🚀 Cómo Probar el Flujo Completo

### Test 1: Ver logs en el navegador

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Limpia la consola (click en 🚫)
4. Ve a `/profile` y click en "Editar Perfil"
5. **Deberías ver:**
   ```
   📝 EditProfileForm: Cargando datos del perfil: {...}
   ```

6. Llena los campos y click en "Guardar"
7. **Deberías ver:**
   ```
   📤 EditProfileForm: Intentando guardar perfil...
   📋 Datos del formulario: {...}
   📋 Perfil actualizado a enviar: {...}
   🔄 useUserProfile.updateProfile: Iniciando actualización...
   👤 User ID: 12345678-...
   📋 Datos a actualizar: {...}
   🎭 Role desde Cognito: ADMIN
   🔍 Buscando usuario existente en DynamoDB...
   📦 Usuario existente: NO
   ➕ Creando nuevo usuario...
   ✅ Usuario creado: {...}
   ✅ useUserProfile.updateProfile: Perfil actualizado exitosamente
   ✅ Perfil guardado exitosamente en DynamoDB
   ```

### Test 2: Verificar en DynamoDB

1. Ve a AWS Console
2. DynamoDB → Tables
3. Busca la tabla: `User-[hash]-NONE`
4. Tab "Explore table items"
5. **Deberías ver:**
   - Un item con `id` = tu userId
   - Campos: givenName, familyName, email, role, etc.

### Test 3: Editar perfil existente

1. Ve a `/profile` → "Editar Perfil"
2. Los campos **deberían estar llenos** con tus datos
3. Cambia algo (ej: bio)
4. Guarda
5. **Deberías ver en consola:**
   ```
   📦 Usuario existente: SÍ
   ✏️ Actualizando usuario existente...
   ✅ Usuario actualizado: {...}
   ```

---

## ❌ Errores Comunes y Soluciones

### Error: "Usuario no autenticado"
**Causa:** No hay `user.userId`  
**Solución:** Verifica que estés autenticado y refesca la sesión

### Error: "Access Denied" o "Unauthorized"
**Causa:** El usuario no tiene permisos para crear/actualizar  
**Solución:** 
- Verifica que estés autenticado (no guest)
- Verifica los permisos en `amplify/data/resource.ts`
- Redeploya: `npx ampx sandbox`

### Error: "Required field missing"
**Causa:** Faltan campos requeridos (givenName, familyName, email)  
**Solución:** Asegúrate que el formulario tenga estos campos llenos

### Los campos aparecen vacíos al editar
**Causa:** El `useEffect` no se está ejecutando  
**Solución:** Ya corregido con el useEffect que sincroniza `profile` → `formData`

### No se ve nada en DynamoDB
**Causa:** 
1. El save falló silenciosamente
2. Estás mirando la tabla incorrecta
3. El userId no es el correcto

**Solución:**
1. Revisa los logs de consola
2. Verifica que la tabla sea `User-[hash]-NONE` (no otra)
3. Busca por el `id` exacto (tu userId)

---

## 🔮 Próximos Pasos (Opcionales)

### 1. **Refrescar automáticamente después de guardar**
```typescript
const success = await updateProfile(updatedProfile);
if (success) {
  await refetch(); // ← Recargar datos de DynamoDB
  onSuccess?.();
}
```

### 2. **Validación de campos**
```typescript
if (!formData.givenName || !formData.familyName || !formData.email) {
  setSaveError('Nombre, apellido y email son requeridos');
  return;
}
```

### 3. **Deshabilitar edición del email**
El email debería venir de Cognito y no ser editable:
```tsx
<Input
  type="email"
  value={formData.email || ''}
  disabled // ← No editable
  className="bg-gray-100"
/>
```

---

## 📚 Referencias

- [Amplify Data Authorization](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/)
- [DynamoDB Console](https://console.aws.amazon.com/dynamodbv2)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
