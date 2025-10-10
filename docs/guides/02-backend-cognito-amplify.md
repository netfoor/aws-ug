# Pilar 2: Configuración de Identidad (Backend)

## 🎯 Lo Que Vamos a Construir

En este pilar, vamos a destripar **línea por línea** la configuración de nuestro backend de autenticación:

1. Cómo Amplify Gen 2 define recursos con TypeScript
2. Cada parámetro de Cognito y por qué existe
3. Google OAuth: setup completo y flujo de autorización
4. Secretos: dónde viven, cómo se manejan
5. El archivo mágico: `amplify_outputs.json`

**No vamos a copiar/pegar código**. Vamos a **entender cada decisión**.

---

## 📂 Estructura del Backend

```
amplify/
├── auth/
│   └── resource.ts         # 🔐 Definición de Cognito User Pool
├── data/
│   └── resource.ts         # 📊 GraphQL schema (comentado, futuro)
├── backend.ts              # 🎯 Entry point - conecta todo
├── package.json            # Dependencies del backend
└── tsconfig.json           # TypeScript config
```

**Flujo de ejecución**:
```
1. backend.ts → imports auth resource
2. auth/resource.ts → define Cognito config
3. Amplify CLI → lee estos archivos
4. Amplify → despliega a AWS
5. Amplify → genera amplify_outputs.json
```

---

## 🔍 Archivo 1: `backend.ts` - El Orquestador

**Ubicación**: `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
// import { data } from './data/resource'; // Comentado para futuro

defineBackend({
  auth  // Solo auth por ahora
});
```

### Análisis Línea por Línea

#### Línea 1: `import { defineBackend }`
```typescript
import { defineBackend } from '@aws-amplify/backend';
```

**¿Qué es `defineBackend`?**
- Es una función que **registra recursos** de AWS
- Type-safe: TypeScript valida en compile-time
- Genera CloudFormation automáticamente

**¿Qué hace exactamente?**
```typescript
// Internamente (simplificado)
function defineBackend(resources: BackendResources) {
  // 1. Valida configuración
  validateResources(resources);
  
  // 2. Genera CloudFormation templates
  const cfnTemplates = generateCloudFormation(resources);
  
  // 3. Despliega a AWS
  deploToAWS(cfnTemplates);
  
  // 4. Genera amplify_outputs.json
  generateOutputs(resources);
}
```

**Alternativas consideradas**:
| Opción | Por qué NO |
|--------|-----------|
| **CDK directo** | Muy verbose, más código boilerplate |
| **Terraform** | Otro lenguaje (HCL), no type-safe con TypeScript |
| **Serverless Framework** | Menos integración con Amplify ecosystem |

---

#### Línea 2: `import { auth }`
```typescript
import { auth } from './auth/resource';
```

**Por qué importar y no inline?**
```typescript
// ❌ Opción 1: Inline (malo)
defineBackend({
  auth: defineAuth({ /* toda la config aquí */ })
});

// ✅ Opción 2: Modular (bueno)
import { auth } from './auth/resource';
defineBackend({ auth });
```

**Beneficios de modularidad**:
- ✅ Separation of concerns
- ✅ Más fácil de testear
- ✅ Reutilizable (múltiples backends)
- ✅ Mejor organización en monorepo

---

#### Línea 3: `// import { data }`
```typescript
// import { data } from './data/resource';
```

**¿Por qué comentado?**

Estamos construyendo **incrementalmente**. Fases:

```
Fase 1 (actual): Auth ✅
Fase 2 (futura): Data (GraphQL API)
Fase 3 (futura): Storage (S3)
Fase 4 (futura): Functions (Lambdas)
```

**🔮 Cómo se vería con data**:
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

defineBackend({
  auth,
  data  // GraphQL API conectada con Cognito
});

// Amplify automáticamente:
// - Conecta data con auth (authorization rules)
// - Genera GraphQL client type-safe
// - Setup AppSync API
```

**💡 Buena práctica**: Mantener comentados features futuras como documentación.

---

## 🔐 Archivo 2: `auth/resource.ts` - El Corazón

**Ubicación**: `amplify/auth/resource.ts`

Este archivo es **EL MÁS IMPORTANTE** del backend. Cada línea cuenta.

```typescript
import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          profilePicture: 'picture',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'https://awspuebla.com/auth/callback',
        'https://www.awspuebla.com/auth/callback'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://awspuebla.com/',
        'https://www.awspuebla.com/'
      ],
    }
  },
  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true,
  },
  userAttributes: {
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
  },
  groups: ['ADMINS', 'SPEAKERS', 'MEMBERS'],
  accountRecovery: 'EMAIL_ONLY',
});
```

Vamos a analizar **cada sección** en profundidad.

---

### Sección 1: Imports

```typescript
import { defineAuth, secret } from '@aws-amplify/backend';
```

#### ¿Qué es `defineAuth`?

Función que crea un Cognito User Pool con configuración type-safe.

**Firma simplificada**:
```typescript
function defineAuth(config: AuthConfig): AuthResource {
  // Valida configuración
  // Genera CloudFormation para Cognito
  // Retorna resource para usar en defineBackend
}
```

#### ¿Qué es `secret`?

**Crítico**: Función para manejar secretos de forma segura.

```typescript
// ❌ NUNCA hagas esto
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: 'hardcoded-client-id', // ¡EXPUESTO EN GIT!
        clientSecret: 'hardcoded-secret', // ¡MEGA PELIGRO!
      }
    }
  }
});

// ✅ Correcto
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),      // Lee de AWS Secrets Manager
        clientSecret: secret('GOOGLE_CLIENT_SECRET'), // Encriptado, rotable
      }
    }
  }
});
```

**¿Dónde viven estos secretos?**

```
1. Desarrollo (sandbox):
   → .env.local (local)
   → AWS Secrets Manager (cuando despliegas sandbox)

2. Producción:
   → AWS Secrets Manager exclusivamente
   → Encriptados con KMS
   → Rotación automática posible
```

**Flujo de secretos**:
```
1. Developer: npx ampx sandbox secret set GOOGLE_CLIENT_ID
2. Amplify: Guarda en AWS Secrets Manager
3. CloudFormation: Lee secreto durante deploy
4. Cognito: Usa secreto para configurar Google OAuth
5. Secreto: NUNCA se expone en código o logs
```

---

### Sección 2: `loginWith` - Métodos de Autenticación

```typescript
loginWith: {
  email: true,
  externalProviders: { /* ... */ }
}
```

#### `email: true`

**¿Qué significa?**
- Los usuarios pueden registrarse con email/password
- Email es el username (no hay username separado)

**Alternativas**:
```typescript
// Opción 1: Solo email (actual)
loginWith: { email: true }

// Opción 2: Solo phone
loginWith: { phone: true }

// Opción 3: Ambos
loginWith: { 
  email: true,
  phone: true 
}

// Opción 4: Username customizado
loginWith: { 
  email: false,
  username: {
    caseSensitive: false,
    requiredAttributes: ['email']
  }
}
```

**¿Por qué elegimos `email: true`?**
- ✅ UX familiar (todos usan email)
- ✅ Recuperación fácil (password reset por email)
- ✅ Menos fricción que username único
- ❌ Posible spam si no validamos bien

**Trade-off**: Simplicidad vs flexibilidad. Elegimos simplicidad.

---

### Sección 3: Google OAuth - Configuración Completa

```typescript
externalProviders: {
  google: {
    clientId: secret('GOOGLE_CLIENT_ID'),
    clientSecret: secret('GOOGLE_CLIENT_SECRET'),
    scopes: ['openid', 'email', 'profile'],
    attributeMapping: {
      email: 'email',
      givenName: 'given_name',
      familyName: 'family_name',
      profilePicture: 'picture',
    },
  },
  // ...
}
```

#### ¿Qué es Google OAuth 2.0?

**Flujo simplificado**:
```
1. Usuario: "Quiero entrar con Google"
2. Tu app: Redirect a Google
3. Google: "¿Permitir acceso a tu email y perfil?"
4. Usuario: "Sí"
5. Google: Te da un authorization code
6. Tu app: Intercambia code por tokens
7. Tu app: Usa tokens para obtener info del usuario
```

#### `clientId` y `clientSecret`

**¿De dónde salen?**

Google Cloud Console → Crear proyecto → OAuth 2.0 credentials

```
Google Cloud Console
├── Project: "aws-ug-auth"
├── APIs & Services
│   └── Credentials
│       └── Create OAuth 2.0 Client ID
│           ├── Application type: Web application
│           ├── Name: "AWS UG Production"
│           ├── Authorized redirect URIs:
│           │   ├── https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
│           │   └── http://localhost:3000/auth/callback (dev)
│           └── Credentials generated:
│               ├── Client ID: 1234567890-abc.apps.googleusercontent.com
│               └── Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE**: El redirect URI de Cognito es generado por AWS, no lo eliges tú.

**¿Cómo obtenerlo?**
```bash
# Después de primer deploy
npx ampx sandbox

# Amplify muestra en consola:
# OAuth redirect URI: https://xxxxx.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**Entonces**:
1. Deploy sandbox (sin Google OAuth funcional aún)
2. Copy redirect URI de Amplify
3. Agregar en Google Cloud Console
4. Re-deploy sandbox
5. ✅ Google OAuth funciona

---

#### `scopes` - Permisos que Pedimos

```typescript
scopes: ['openid', 'email', 'profile']
```

**¿Qué es un scope?**

Permisos que le pedimos al usuario para acceder a su info de Google.

| Scope | Qué incluye | Por qué lo necesitamos |
|-------|-------------|------------------------|
| `openid` | ID único del usuario | Identificación estándar OAuth |
| `email` | Email verificado por Google | Login, comunicación |
| `profile` | Nombre, foto, locale | Personalización de UI |

**Scopes disponibles (no usados)**:
```typescript
// Podríamos pedir más, pero no lo hacemos (principio de menor privilegio)
scopes: [
  'openid',
  'email', 
  'profile',
  // 'https://www.googleapis.com/auth/calendar',  // ❌ No necesitamos calendars
  // 'https://www.googleapis.com/auth/drive',     // ❌ No necesitamos Drive
  // 'https://www.googleapis.com/auth/contacts'   // ❌ No necesitamos contactos
]
```

**Regla de oro**: Pide solo lo que necesitas. Más scopes = más fricción para el usuario.

---

#### `attributeMapping` - Mapeo de Atributos

```typescript
attributeMapping: {
  email: 'email',
  givenName: 'given_name',
  familyName: 'family_name',
  profilePicture: 'picture',
}
```

**¿Por qué existe esto?**

Google devuelve datos en formato OpenID Connect. Necesitamos mapearlos a atributos de Cognito.

**Flujo de datos**:
```
1. Google devuelve JWT (ID Token):
{
  "sub": "1234567890",
  "email": "user@gmail.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}

2. attributeMapping dice: "Toma 'given_name' de Google y guárdalo como 'givenName' en Cognito"

3. Cognito User Pool almacena:
{
  "sub": "google_1234567890",
  "email": "user@gmail.com",
  "givenName": "John",
  "familyName": "Doe",
  "picture": "https://..."
}
```

**¿Por qué no son iguales?**

- Google usa `given_name` (snake_case, estándar OpenID)
- Cognito prefiere `givenName` (camelCase, estándar AWS)
- `attributeMapping` hace la traducción

**🐛 Posible bug**:
```typescript
// ⚠️ ¿Qué pasa si Google no devuelve 'given_name'?
// (puede pasar si el usuario no tiene nombre en su perfil)

// 💡 Mejora sugerida:
userAttributes: {
  givenName: {
    required: false,  // ← Cambiar a false
    mutable: true,
  }
}
```

---

### Sección 4: Callback URLs - Rutas de Retorno

```typescript
callbackUrls: [
  'http://localhost:3000/auth/callback',
  'https://awspuebla.com/auth/callback',
  'https://www.awspuebla.com/auth/callback'
],
logoutUrls: [
  'http://localhost:3000/',
  'https://awspuebla.com/',
  'https://www.awspuebla.com/'
]
```

#### ¿Qué son Callback URLs?

**Después del login con Google**, Google redirige al usuario a una de estas URLs con un authorization code.

**Flujo**:
```
1. Usuario → Click "Login with Google"
2. App → Redirect a Google
3. Google → Usuario autoriza
4. Google → Redirect a http://localhost:3000/auth/callback?code=ABCDEF
              └─────────────────────────────────┬──────────────────────┘
                                    Debe estar en callbackUrls
5. App → Procesa code, obtiene tokens
```

**⚠️ Seguridad crítica**:
```typescript
// Si no está en la lista, Google RECHAZA el redirect
// Esto previene ataques de phishing

// ❌ Atacante intenta:
google.com/oauth?redirect_uri=https://evil.com/steal-tokens

// ✅ Google valida:
if (!callbackUrls.includes('https://evil.com/steal-tokens')) {
  throw new Error('Redirect URI not allowed');
}
```

#### ¿Por qué 3 URLs?

```typescript
callbackUrls: [
  'http://localhost:3000/auth/callback',      // ← Dev local
  'https://awspuebla.com/auth/callback',      // ← Producción sin www
  'https://www.awspuebla.com/auth/callback'   // ← Producción con www
]
```

**Razón**: Ambos dominios (con y sin `www`) deben funcionar.

**Alternativa**: Redirect permanente de `www` a dominio principal.

```typescript
// next.config.ts
module.exports = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.awspuebla.com' }],
        destination: 'https://awspuebla.com/:path*',
        permanent: true,
      },
    ];
  },
};

// Entonces solo necesitas:
callbackUrls: [
  'http://localhost:3000/auth/callback',
  'https://awspuebla.com/auth/callback'  // Solo uno
]
```

**Trade-off**: Simplicidad (múltiples URLs) vs configuración (redirect en Next.js).

---

### Sección 5: MFA (Multi-Factor Authentication)

```typescript
multifactor: {
  mode: 'OPTIONAL',
  sms: true,
  totp: true,
}
```

#### ¿Qué es MFA?

Segundo factor de autenticación después del password.

**Flujo con MFA**:
```
1. Usuario: email + password ✅
2. Cognito: "Envía código SMS" o "Abre Google Authenticator"
3. Usuario: Ingresa código de 6 dígitos
4. Cognito: Valida código ✅
5. Usuario: Autenticado completamente
```

#### `mode: 'OPTIONAL'`

**Opciones disponibles**:
```typescript
// Opción 1: Deshabilitado (menos seguro)
multifactor: {
  mode: 'OFF'
}

// Opción 2: Opcional (actual, balance)
multifactor: {
  mode: 'OPTIONAL'  // Usuario elige si activar MFA
}

// Opción 3: Requerido (máxima seguridad, más fricción)
multifactor: {
  mode: 'REQUIRED'  // Todos deben usar MFA
}
```

**¿Por qué `OPTIONAL`?**
- ✅ No forzamos MFA a todos (menos fricción)
- ✅ Usuarios avanzados pueden activarlo
- ✅ Admins pueden requerirlo por grupo
- ❌ Usuarios normales probablemente no lo activan

**🎯 Estrategia recomendada**:
```typescript
// Config actual
mode: 'OPTIONAL'

// Luego en código:
if (user.groups.includes('ADMINS')) {
  // Forzar MFA para admins
  requireMFA(user);
}
```

#### `sms: true` vs `totp: true`

**SMS MFA**:
```
✅ Más familiar para usuarios
✅ No requiere app adicional
❌ Menos seguro (SIM swapping attacks)
❌ Cuesta dinero (AWS SNS charges)
```

**TOTP MFA** (Time-based One-Time Password):
```
✅ Más seguro (offline, no interceptable)
✅ Gratis (sin SMS charges)
❌ Requiere app (Google Authenticator, Authy)
❌ Menos familiar para usuarios no-técnicos
```

**Nuestra decisión**: Ofrecer ambos, dejar que el usuario elija.

**💰 Costos**:
```
SMS: ~$0.00645 por mensaje (depende de país)
TOTP: Gratis

Si tienes 1000 usuarios con SMS MFA:
1000 users × 2 logins/day × 30 days × $0.00645 = ~$387/mes solo en SMS
```

**💡 Mejora sugerida**: Incentivar TOTP sobre SMS.

---

### Sección 6: User Attributes - Datos del Usuario

```typescript
userAttributes: {
  givenName: {
    required: true,
    mutable: true,
  },
  familyName: {
    required: true,
    mutable: true,
  },
  email: {
    required: true,
    mutable: true,
  },
  phoneNumber: {
    required: false,
    mutable: true,
  },
}
```

#### ¿Qué son User Attributes?

Campos personalizados que almacenas para cada usuario en Cognito.

**Atributos estándar disponibles** (no todos usados):
```typescript
// Estándar de Cognito (OIDC compliant)
{
  email,           // ✅ Usamos
  email_verified,  // Auto-managed por Cognito
  phone_number,    // ✅ Usamos (opcional)
  given_name,      // ✅ Usamos (givenName)
  family_name,     // ✅ Usamos (familyName)
  middle_name,     // ❌ No usamos
  nickname,        // ❌ No usamos
  preferred_username, // ❌ No usamos
  profile,         // ❌ No usamos
  picture,         // ❌ No almacenamos (viene de Google)
  website,         // ❌ No usamos
  gender,          // ❌ No usamos (privacidad)
  birthdate,       // ❌ No usamos (privacidad)
  zoneinfo,        // ❌ No usamos
  locale,          // ❌ No usamos
  updated_at,      // Auto-managed por Cognito
  
  // Custom attributes (si necesitamos)
  'custom:role',
  'custom:organization',
  'custom:preferences'
}
```

**Regla de oro**: Solo pide lo que realmente necesitas.

#### `required: true` vs `required: false`

```typescript
givenName: {
  required: true,  // ← Usuario DEBE proporcionar
  mutable: true,
}

phoneNumber: {
  required: false, // ← Usuario PUEDE proporcionar (opcional)
  mutable: true,
}
```

**¿Cuándo usar `required: true`?**
- Datos críticos para la app (nombre para mostrar)
- Requeridos legalmente (términos y condiciones)
- Necesarios para funcionalidad core

**¿Cuándo usar `required: false`?**
- Nice-to-have pero no bloqueante
- Privacidad (teléfono, dirección)
- Features opcionales (MFA por SMS requiere phone)

**🐛 Problema identificado**:
```typescript
// Tenemos:
givenName: { required: true }

// Pero Google OAuth puede NO devolver given_name
// Si el usuario de Google no tiene nombre configurado

// 💡 Solución:
givenName: {
  required: false,  // ← Cambiar
  mutable: true,
}

// Y en UI:
if (!user.givenName) {
  // Pedir nombre en onboarding
  redirectTo('/complete-profile');
}
```

#### `mutable: true` - ¿Modificable?

```typescript
email: {
  required: true,
  mutable: true,  // ← Usuario puede cambiar su email
}
```

**Opciones**:
```typescript
// Opción 1: Mutable (actual)
email: { mutable: true }  
// Usuario puede cambiar email
// Útil si se equivocaron al registrarse

// Opción 2: Immutable
email: { mutable: false }
// Email nunca cambia después de registro
// Más seguro (auditoría), menos flexible
```

**Trade-off**: Flexibilidad vs seguridad.

**Caso de uso inmutable**:
```typescript
'custom:userId': {
  required: true,
  mutable: false  // ← ID único, nunca cambia
}
```

---

### Sección 7: Groups - Roles y Permisos

```typescript
groups: ['ADMINS', 'SPEAKERS', 'MEMBERS']
```

#### ¿Qué son los Groups de Cognito?

Collections de usuarios con permisos específicos.

**Cómo se usan**:
```typescript
// 1. Cognito almacena grupos
User: john@example.com
Groups: ['ADMINS', 'SPEAKERS']

// 2. Grupos van en el ID Token
{
  "sub": "google_123",
  "cognito:groups": ["ADMINS", "SPEAKERS"],
  "email": "john@example.com"
}

// 3. Frontend lee grupos
const { user } = useAuth();
if (user.groups?.includes('ADMINS')) {
  // Mostrar panel de admin
}

// 4. Backend valida grupos (AppSync, Lambda)
if (!context.groups.includes('ADMINS')) {
  throw new Error('Forbidden');
}
```

#### Precedence - Orden de Importancia

```typescript
// En amplify_outputs.json (generado automáticamente)
groups: [
  { "ADMINS": { "precedence": 0 } },    // ← Más alto
  { "SPEAKERS": { "precedence": 1 } },
  { "MEMBERS": { "precedence": 2 } }    // ← Más bajo
]
```

**¿Para qué sirve precedence?**

Si un usuario está en múltiples grupos, precedence define cuál "gana".

**Ejemplo**:
```typescript
// Usuario en 2 grupos
User: jane@example.com
Groups: ['ADMINS', 'SPEAKERS']

// Cognito resuelve:
Primary Group: ADMINS (precedence 0 < 1)

// Útil para IAM roles:
if (user.primaryGroup === 'ADMINS') {
  // Asignar IAM role de admin
}
```

**🤔 ¿Necesitamos precedence?**

Depende. Si solo usas grupos para autorización simple (if/else), no.

Si usas IAM roles diferentes por grupo, sí.

---

### Sección 8: Account Recovery

```typescript
accountRecovery: 'EMAIL_ONLY'
```

**¿Qué es Account Recovery?**

Método para resetear password olvidado.

**Opciones disponibles**:
```typescript
// Opción 1: Solo email (actual, más seguro)
accountRecovery: 'EMAIL_ONLY'

// Opción 2: Solo SMS
accountRecovery: 'PHONE_NUMBER_ONLY'

// Opción 3: Email preferido, SMS backup
accountRecovery: 'EMAIL_AND_PHONE_WITHOUT_MFA'
```

**¿Por qué `EMAIL_ONLY`?**
- ✅ Más seguro que SMS (no hay SIM swapping)
- ✅ Gratis (no hay costo de SMS)
- ✅ Más rápido (email instantáneo)
- ❌ Requiere acceso a email

**Flujo de recuperación**:
```
1. Usuario: "Olvidé mi contraseña"
2. Cognito: Envía email con código
3. Email: "Tu código de recuperación: 123456"
4. Usuario: Ingresa código + nueva contraseña
5. Cognito: Valida código, actualiza contraseña
```

**⚠️ Seguridad**: El código expira en 1 hora (configurable).

---

## 📄 Archivo Generado: `amplify_outputs.json`

**Ubicación**: `amplify_outputs.json` (raíz del proyecto)

### ¿Qué es este archivo?

**Generado automáticamente** por Amplify después de deploy.

**Propósito**: Configuración del cliente (frontend) para conectar con AWS.

```json
{
  "auth": {
    "user_pool_id": "us-east-1_vr8oRZfP7",
    "aws_region": "us-east-1",
    "user_pool_client_id": "5c7fhqqe4raqnuabr2b7g84du8",
    "identity_pool_id": "us-east-1:55f472f0-171d-4533-afe8-31663925704c",
    "mfa_methods": ["SMS", "TOTP"],
    "groups": [
      { "ADMINS": { "precedence": 0 } },
      { "SPEAKERS": { "precedence": 1 } },
      { "MEMBERS": { "precedence": 2 } }
    ],
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_numbers": true,
      "require_symbols": true,
      "require_uppercase": true
    },
    "oauth": {
      "identity_providers": ["GOOGLE"],
      "redirect_sign_in_uri": [
        "http://localhost:3000/auth/callback",
        "https://awspuebla.com/auth/callback",
        "https://www.awspuebla.com/auth/callback"
      ],
      "redirect_sign_out_uri": [
        "http://localhost:3000/",
        "https://awspuebla.com/",
        "https://www.awspuebla.com/"
      ],
      "scopes": ["openid", "email", "profile"]
    }
  }
}
```

### Análisis de Campos Clave

#### `user_pool_id`
```json
"user_pool_id": "us-east-1_vr8oRZfP7"
```

**¿Qué es?**: ID único de tu Cognito User Pool en AWS.

**¿Dónde se usa?**
```typescript
// src/components/AmplifyClientProvider.tsx
import outputs from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';

Amplify.configure(outputs); // ← Lee user_pool_id

// Luego en llamadas API:
const user = await getCurrentUser();
// Amplify usa user_pool_id internamente para saber qué User Pool consultar
```

#### `user_pool_client_id`
```json
"user_pool_client_id": "5c7fhqqe4raqnuabr2b7g84du8"
```

**¿Qué es?**: ID de la "app client" dentro del User Pool.

**User Pool vs App Client**:
```
User Pool (us-east-1_vr8oRZfP7)
├── App Client 1: Web (5c7fhqqe4raqnuabr2b7g84du8) ← Este
├── App Client 2: Mobile (otro ID)
└── App Client 3: Admin Panel (otro ID)
```

**¿Por qué múltiples app clients?**
- Diferentes configuraciones por plataforma
- Diferentes OAuth settings
- Diferentes token expiration times

#### `identity_pool_id`
```json
"identity_pool_id": "us-east-1:55f472f0-171d-4533-afe8-31663925704c"
```

**⚠️ Concepto avanzado**: Cognito Identity Pool (diferente de User Pool).

**User Pool vs Identity Pool**:
| User Pool | Identity Pool |
|-----------|---------------|
| Autenticación (quién eres) | Autorización (qué puedes hacer) |
| Almacena usuarios | No almacena usuarios |
| Maneja login/password | Maneja IAM roles |
| Genera tokens JWT | Genera credentials de AWS |

**Flujo completo**:
```
1. User Pool → Login → JWT tokens
2. Identity Pool → Exchange JWT for AWS credentials
3. AWS credentials → Acceso a S3, DynamoDB, etc.
```

**En nuestro caso**: Solo usamos User Pool (autenticación). Identity Pool se crea automáticamente pero no lo usamos activamente... todavía.

---

### ⚠️ Seguridad de `amplify_outputs.json`

**❓ ¿Es seguro commitear este archivo en Git?**

**Respuesta corta**: Sí.

**Respuesta larga**:
```typescript
// Este archivo NO contiene secretos
// ✅ OK para Git:
{
  "user_pool_id": "us-east-1_vr8oRZfP7",      // Público
  "user_pool_client_id": "5c7fhqqe...",       // Público
  "aws_region": "us-east-1"                   // Público
}

// ❌ NO OK para Git (pero no están aquí):
{
  "GOOGLE_CLIENT_SECRET": "GOCSPX-xxxx",      // ← Secreto
  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI",   // ← Secreto
}
```

**Secretos reales están en**:
- AWS Secrets Manager (prod)
- `.env.local` (dev, en .gitignore)

---

## 🔑 Manejo de Secretos - Deep Dive

### ¿Dónde Viven los Secretos?

```
Desarrollo Local:
├── .env.local (gitignored)
│   ├── GOOGLE_CLIENT_ID=xxx
│   └── GOOGLE_CLIENT_SECRET=yyy
└── npx ampx sandbox
    └── Lee .env.local
    └── Sube a AWS Secrets Manager (sandbox)

Producción:
└── AWS Secrets Manager exclusivamente
    ├── arn:aws:secretsmanager:us-east-1:123:secret:GOOGLE_CLIENT_ID
    └── arn:aws:secretsmanager:us-east-1:123:secret:GOOGLE_CLIENT_SECRET
```

### Comandos para Manejar Secretos

```bash
# Desarrollo: Set secret en sandbox
npx ampx sandbox secret set GOOGLE_CLIENT_ID

# Producción: Set secret en branch
npx ampx sandbox secret set GOOGLE_CLIENT_ID --branch main

# Listar secretos
npx ampx sandbox secret list

# Eliminar secret
npx ampx sandbox secret remove GOOGLE_CLIENT_ID
```

### Rotación de Secretos

**¿Qué pasa si Google client secret se compromete?**

```bash
# 1. Generar nuevo secret en Google Cloud Console
# (Google te da nuevo client secret)

# 2. Actualizar en AWS
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
# Pega el nuevo valor

# 3. Re-deploy
npx ampx sandbox

# 4. Verificar funcionamiento
# Login con Google debe funcionar

# 5. Revocar secret viejo en Google
# (En Google Cloud Console)
```

**⏱️ Tiempo de downtime**: ~30 segundos (durante re-deploy).

**💡 Mejora futura**: Zero-downtime rotation con múltiples secrets activos simultáneamente.

---

## 🎯 Resumen del Pilar 2

### Lo que aprendimos:

1. **Amplify Gen 2 estructura** - `backend.ts` orquesta, `auth/resource.ts` define
2. **Cognito User Pool** - Cada parámetro tiene un propósito (y trade-offs)
3. **Google OAuth setup** - ClientID, ClientSecret, Scopes, AttributeMapping
4. **MFA** - OPTIONAL balance entre seguridad y UX
5. **User Attributes** - Solo pedir lo necesario
6. **Groups** - ADMINS, SPEAKERS, MEMBERS con precedence
7. **Secretos** - AWS Secrets Manager, rotación, nunca hardcodear
8. **amplify_outputs.json** - Generado automáticamente, OK para Git

### Decisiones técnicas clave:

| Decisión | Razón | Trade-off |
|----------|-------|-----------|
| `email: true` | UX familiar | Menos flexible que username |
| `scopes: ['openid', 'email', 'profile']` | Mínimo necesario | No podemos pedir más datos después |
| `multifactor.mode: 'OPTIONAL'` | Balance seguridad/UX | Usuarios probablemente no activan MFA |
| `givenName.required: true` | Necesitamos nombre para UI | Google puede no devolverlo → 🐛 |
| `accountRecovery: 'EMAIL_ONLY'` | Más seguro que SMS | Requiere acceso a email |
| 3 callback URLs | Soporte www y sin www | Más simple que redirect en Next.js |

### Bugs identificados:

1. 🐛 `givenName` required pero Google puede no devolverlo
2. 🐛 Falta validación si user no completa perfil
3. 🤔 Identity Pool creado pero no usado activamente

### Mejoras sugeridas:

1. ✅ Cambiar `givenName.required` a `false`
2. ✅ Agregar flujo de onboarding para completar perfil
3. ✅ Incentivar TOTP sobre SMS (costos)
4. ✅ Implementar redirect de www → domain principal
5. ✅ Zero-downtime secret rotation

---

## ✅ Checkpoint

Antes de continuar al Pilar 3, asegúrate de entender:

- [ ] Diferencia entre User Pool e Identity Pool
- [ ] Cómo funcionan los secretos (secret() function)
- [ ] Flujo OAuth: clientId, clientSecret, redirect URI
- [ ] Por qué cada user attribute (required vs optional)
- [ ] Cómo se generan grupos y precedence
- [ ] Seguridad de amplify_outputs.json

**Próximo paso**: ¿Listo para el Pilar 3: Estado Global de Autenticación (Frontend)?

Ahí vamos a destripar `AuthContext` línea por línea, entender las optimizaciones de performance (debouncing, caching, deduplication), y ver cómo conecta todo con Cognito.

---

**Siguiente**: [Pilar 3: Estado Global de Autenticación (Frontend)](./03-estado-global-frontend.md)
