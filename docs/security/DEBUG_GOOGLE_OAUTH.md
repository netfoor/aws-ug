# Debug: Google OAuth Error 401 invalid_client

## Error Observado
```
GET /auth/callback?error_description=Google+Error+-+401+invalid_client+Unauthorized
&state=9vCAT7L591NWEx5M1ENqlaiUHyJ9C8si
&error=invalid_request
```

## Causa del Error

El error **401 invalid_client** de Google OAuth significa una de estas 3 cosas:

### 1. ❌ Client ID o Client Secret Incorrectos
- El GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Amplify no coinciden con Google Console
- Solución: Re-verificar credenciales

### 2. ❌ Redirect URIs No Autorizados
- La URL de callback no está autorizada en Google Console
- Cognito domain: `eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com`
- Callback esperado: `https://eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

### 3. ❌ Credenciales de Desarrollo vs Producción
- Usando credenciales de desarrollo pero llamando desde dominio diferente

---

## ✅ Pasos para Arreglar

### Paso 1: Verificar Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Selecciona tu proyecto
3. Click en tu "OAuth 2.0 Client ID"
4. Verifica:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://awspuebla.com
https://www.awspuebla.com
```

**Authorized redirect URIs:**
```
https://eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
http://localhost:3000/auth/callback
https://awspuebla.com/auth/callback
https://www.awspuebla.com/auth/callback
```

⚠️ **IMPORTANTE:** La URI de Cognito es **OBLIGATORIA**:
```
https://eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Paso 2: Verificar Client ID y Secret

En Google Console, copia:
- **Client ID**: Algo como `123456789-abc.apps.googleusercontent.com`
- **Client Secret**: Algo como `GOCSPX-abc123xyz789`

### Paso 3: Actualizar Secrets en Amplify

```bash
# Eliminar secrets existentes
npx ampx sandbox secret remove GOOGLE_CLIENT_ID
npx ampx sandbox secret remove GOOGLE_CLIENT_SECRET

# Agregar nuevos (te pedirá el valor)
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

**Alternativamente (más rápido):**
```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID --value "TU_CLIENT_ID_AQUI"
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET --value "TU_CLIENT_SECRET_AQUI"
```

### Paso 4: Redesplegar Sandbox

```bash
npx ampx sandbox delete
npx ampx sandbox
```

Esto recreará el Cognito User Pool con las credenciales correctas.

---

## 🔍 Verificación Rápida

**Comando para ver qué Client ID está usando Amplify:**
```bash
npx ampx sandbox secret get GOOGLE_CLIENT_ID
```

**Comparar con Google Console:**
1. Ve a https://console.cloud.google.com/apis/credentials
2. Click en tu OAuth 2.0 Client
3. Copia el "Client ID"
4. Compara con el valor de Amplify

**Si NO coinciden** → Esa es la causa del error

---

## 📋 Checklist de Verificación

- [ ] Client ID en Google Console coincide con Amplify secret
- [ ] Client Secret en Google Console coincide con Amplify secret
- [ ] Redirect URI de Cognito está en "Authorized redirect URIs"
- [ ] OAuth consent screen está configurado (usuarios de prueba agregados si está en testing)
- [ ] Sandbox está corriendo (`npx ampx sandbox`)

---

## 🚀 Solución Rápida (Si tienes las credenciales a la mano)

```bash
# 1. Actualizar secrets
npx ampx sandbox secret set GOOGLE_CLIENT_ID --value "123456789-abc.apps.googleusercontent.com"
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET --value "GOCSPX-abc123xyz789"

# 2. Reiniciar sandbox (aplica cambios)
npx ampx sandbox delete
npx ampx sandbox

# 3. Esperar a que esté listo
# Buscar: "Deployed resources."

# 4. Probar login de nuevo
npm run dev
```

---

## ⚠️ Nota Importante: OAuth Consent Screen

Si tu app está en modo **Testing** en Google Console:
- Solo usuarios agregados a "Test users" pueden hacer login
- Agregar tu email en: Google Console → OAuth consent screen → Test users

Si necesitas que cualquiera pueda hacer login:
- Cambiar a modo **Production** (requiere verificación de Google)
- O agregar emails manualmente a Test users

---

## 🔗 Enlaces Útiles

- Google Console Credentials: https://console.cloud.google.com/apis/credentials
- Amplify Auth Docs: https://docs.amplify.aws/gen2/build-a-backend/auth/
- Cognito Google Setup: https://docs.aws.amazon.com/cognito/latest/developerguide/google.html
