# Checklist de Diagnóstico Google OAuth

## ✅ Verificaciones Completadas

- [x] URI de Cognito en Google Console: `https://eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- [x] Client ID coincide: `22523759999-vn1gqjrvvn7817lp1idjn7elr9ovv76j.apps.googleusercontent.com`
- [x] Client Secret configurado en Amplify

## ❓ Verificaciones Pendientes

### 1. OAuth Consent Screen - Estado y Test Users

Ve a: **https://console.cloud.google.com/apis/credentials/consent**

**Verifica:**

- [ ] ¿El "Publishing status" es **"Testing"** o **"In production"**?
  - Si es **Testing**: Solo usuarios en "Test users" pueden hacer login
  - Si es **In production**: Cualquiera con cuenta Google puede hacer login

- [ ] Si está en **Testing**, ¿tu email está agregado en "Test users"?
  - Click en **"ADD USERS"**
  - Agregar: tu-email@gmail.com

### 2. Verificar que el Client ID sea del Proyecto Correcto

Ve a: **https://console.cloud.google.com/apis/credentials**

**Verifica:**

- [ ] En la esquina superior izquierda, ¿qué proyecto está seleccionado?
- [ ] El Client ID `22523759999-vn1gqjrvvn7817lp1idjn7elr9ovv76j` está en ESE proyecto?
- [ ] Las URIs de redirect están en ESE mismo Client ID?

### 3. Client Secret Correcto

Ve a: **https://console.cloud.google.com/apis/credentials**

- [ ] Click en el Client ID `22523759999-vn1gqjrvvn7817lp1idjn7elr9ovv76j`
- [ ] Verifica que el **Client Secret** mostrado sea: `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`
- [ ] Si NO coincide, copia el correcto y actualiza:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET --value "EL_SECRETO_CORRECTO"
```

### 4. APIs Habilitadas

Ve a: **https://console.cloud.google.com/apis/library**

Verifica que estas APIs estén **HABILITADAS**:

- [ ] **Google+ API** (o "People API")
- [ ] **Google Identity Toolkit API**

Si no están habilitadas:
1. Busca "Google+ API"
2. Click en "ENABLE"

### 5. Scopes Configurados

En el OAuth Consent Screen, verifica que estos scopes estén agregados:

- [ ] `.../auth/userinfo.email`
- [ ] `.../auth/userinfo.profile`
- [ ] `openid`

---

## 🔄 Si Todo Está Correcto y Sigue Fallando

### Opción A: Crear Nuevas Credenciales

A veces las credenciales de Google se "corrompen". Crear nuevas:

1. Ve a: **https://console.cloud.google.com/apis/credentials**
2. Click en **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: "AWS UG - New"
5. Authorized redirect URIs:
   ```
   https://eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   http://localhost:3000/auth/callback
   ```
6. Click **"CREATE"**
7. Copiar nuevo Client ID y Client Secret
8. Actualizar en Amplify:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID --value "NUEVO_CLIENT_ID"
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET --value "NUEVO_CLIENT_SECRET"
npx ampx sandbox delete
npx ampx sandbox
```

### Opción B: Verificar Logs de Cognito

```bash
# Ver logs del User Pool para más detalles
aws cognito-idp describe-user-pool --user-pool-id us-east-1_DtFFyTxqq --region us-east-1
```

---

## 🎯 Próximo Paso Inmediato

**Verifica el OAuth Consent Screen:**

1. Ve a: https://console.cloud.google.com/apis/credentials/consent
2. Si está en **"Testing"**, click en **"ADD USERS"**
3. Agrega tu email de Google
4. Guarda
5. Intenta login de nuevo

Si eso no funciona, crea nuevas credenciales (Opción A arriba).
