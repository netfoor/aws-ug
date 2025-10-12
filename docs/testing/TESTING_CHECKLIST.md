# Checklist de Pruebas Post-Login

## ✅ Pruebas Básicas

### 1. Login Exitoso
- [ ] Ir a `/login`
- [ ] Click en "Sign in with Google"
- [ ] Autenticar con Google
- [ ] Llegar a `/dashboard` automáticamente
- [ ] Ver nombre de usuario en el menú

### 2. Navegación Autenticado
- [ ] Ir a `/profile` - Debería mostrar tu información
- [ ] Ir a `/dashboard` - Debería mostrar el dashboard
- [ ] Ir a `/` - Debería funcionar normalmente

### 3. Protección de Rutas
- [ ] Logout
- [ ] Intentar ir a `/dashboard` directamente
- [ ] Debería redirigir a `/login`
- [ ] Después de login, regresar a `/dashboard`

### 4. Admin (si aplica)
- [ ] Ir a `/profile` y verificar si estás en grupo "ADMINS"
- [ ] Si SÍ eres admin: `/admin` debería funcionar
- [ ] Si NO eres admin: `/admin` → `/access-denied`

### 5. Logout
- [ ] Click en "Logout"
- [ ] Regresar a `/`
- [ ] Intentar ir a `/profile` → Debería redirigir a `/login`

---

## 🔐 Pruebas de Seguridad

### 6. Rate Limiting
- [ ] Abrir DevTools → Network tab
- [ ] Ir a `/dashboard`
- [ ] Ver request a `/api/auth/session`
- [ ] Verificar headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99` (o menor)
  - `X-RateLimit-Reset: [timestamp]`

### 7. Server-Side Tokens
- [ ] Abrir DevTools → Application → Cookies
- [ ] Verificar que NO hay cookies con nombres como:
  - `amplify_access_token`
  - `amplify_id_token`
  - `amplify_refresh_token`
- [ ] Solo deberían existir cookies httpOnly de Cognito

### 8. CSRF Token
- [ ] Ir a: `http://localhost:3000/api/auth/csrf`
- [ ] Deberías ver JSON con:
  ```json
  {
    "csrfToken": "...",
    "message": "CSRF token generated successfully"
  }
  ```

---

## 🎨 Pruebas de UI

### 9. Menú de Navegación
**Sin login:**
- [ ] Muestra: Home, Login, "Sign in with Google"

**Con login (usuario normal):**
- [ ] Muestra: Home, Dashboard, Profile, Logout
- [ ] NO muestra: Admin

**Con login (admin):**
- [ ] Muestra: Home, Dashboard, Profile, Admin, Logout

### 10. Página de Callback
- [ ] Login con Google
- [ ] En `/auth/callback` debería mostrar:
  - Spinner de carga
  - Texto: "Procesando Autenticación..."
  - Barra de progreso
- [ ] NO debería haber loop infinito (máximo 1 segundo de loading)

---

## 🐛 Pruebas de Errores

### 11. Error de OAuth (simulado)
- [ ] Ir a: `/auth/callback?error=access_denied&error_description=User cancelled`
- [ ] Debería mostrar:
  - Icono de error rojo
  - Mensaje: "User cancelled"
  - Botón "Volver al Login"

### 12. Sesión Expirada
- [ ] Estar logueado
- [ ] Esperar 60 minutos (o forzar logout desde Cognito Console)
- [ ] Intentar ir a `/dashboard`
- [ ] Debería redirigir a `/login`

---

## 📊 Resultado Esperado

✅ **12/12 pruebas pasando** = Sistema funcionando correctamente  
⚠️ **10-11/12 pasando** = Minor issues, pero funcional  
❌ **<10/12 pasando** = Hay problemas que arreglar

---

## 🎯 Próximos Pasos Después de Pruebas

Si TODO funciona:
1. ✅ Marcar "Probar autenticación" como completado
2. ✅ Hacer commit de los cambios
3. ⏭️ Continuar con Fase 3: Arreglar tests
4. ⏭️ Fase 4: Re-habilitar tests E2E

Si algo NO funciona:
1. 📝 Documentar qué prueba falló
2. 🔍 Revisar logs del navegador (DevTools Console)
3. 🔍 Revisar logs del servidor (terminal de npm run dev)
4. 🛠️ Arreglar el issue específico
