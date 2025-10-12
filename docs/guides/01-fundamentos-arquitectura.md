# Pilar 1: Fundamentos y Arquitectura Base

## 🎯 El Problema Real

Antes de escribir una línea de código, necesitamos entender qué estamos resolviendo.

### El Desafío de la Autenticación Moderna

No estamos construyendo un simple "login form". Estamos resolviendo:

1. **Identidad federada** - Los usuarios no quieren crear otra cuenta más
2. **Seguridad seria** - Tokens, CSRF, rate limiting, MFA
3. **Performance** - La app debe ser rápida, no hacer 20 llamadas API por minuto
4. **Developer Experience** - El código debe ser mantenible, testeable
5. **Escalabilidad** - Debe funcionar con 10 usuarios o 10,000

### ❌ Lo Que NO Queremos

```typescript
// 🚫 NUNCA hagas esto
const login = async (email: string, password: string) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }) // Passwords en plain text
  });
  
  localStorage.setItem('token', response.token); // XSS vulnerable
  setUser(response.user); // Sin validación
};
```

**Problemas**:
- ❌ Manejo manual de passwords (riesgo de seguridad)
- ❌ Tokens en localStorage (vulnerable a XSS)
- ❌ Sin refresh tokens
- ❌ Sin MFA
- ❌ Sin federación (Google, Facebook, etc.)

### ✅ Lo Que SÍ Queremos

Un sistema que:
- ✅ **Delega autenticación** a un proveedor confiable (Cognito)
- ✅ **Usa OAuth 2.0** para Google (el usuario confía en Google)
- ✅ **Tokens seguros** (HttpOnly cookies, automatic refresh)
- ✅ **Optimizado** (cache, debouncing, deduplication)
- ✅ **Testeable** (95 tests, 85% coverage)
- ✅ **Production-ready** (CSRF, rate limiting, secure headers)

---

## 🤔 Por Qué Este Stack (y No Otro)

### La Decisión: Next.js 15 + AWS Amplify Gen 2 + Cognito

Analicemos cada pieza:

### 1️⃣ **Next.js 15 (App Router)**

#### ¿Por qué Next.js y no...?

| Alternativa | Por qué NO |
|-------------|-----------|
| **Create React App** | No tiene SSR, no está mantenido activamente |
| **Vite + React** | Excelente, pero necesitamos SSR para SEO y performance |
| **Remix** | Muy bueno, pero menor ecosistema que Next.js |
| **SvelteKit** | Prometedor, pero nuestro equipo conoce React |

#### ¿Por qué App Router y no Pages Router?

```typescript
// ❌ Pages Router (viejo)
// pages/api/auth/session.ts
export default async function handler(req, res) {
  // Mezcla de lógica de routing y business logic
}

// ✅ App Router (nuevo)
// app/api/auth/session/route.ts
export async function GET(request: Request) {
  // Más limpio, mejor TypeScript, streaming nativo
}
```

**Ventajas del App Router**:
- ✅ React Server Components (menos JavaScript al cliente)
- ✅ Streaming (mejor performance percibida)
- ✅ Mejor TypeScript support
- ✅ Layout nesting (menos código duplicado)

**Trade-off**:
- ⚠️ Curva de aprendizaje más alta
- ⚠️ Algunas librerías aún no son totalmente compatibles

### 2️⃣ **AWS Amplify Gen 2**

#### ¿Por qué Amplify y no...?

| Alternativa | Por qué NO |
|-------------|-----------|
| **Firebase** | Vendor lock-in muy fuerte, menos control |
| **Supabase** | Excelente, pero no es AWS (cliente quiere AWS) |
| **Auth0** | Muy caro a escala, menos customizable |
| **Roll your own** | ¿Seguro? ¿Tienes equipo de seguridad? |

#### ¿Por qué Gen 2 y no Gen 1?

```typescript
// ❌ Amplify Gen 1 (CLI)
// Configuración en JSON, mezcla de archivos
{
  "auth": {
    "userPoolId": "us-east-1_XXX",
    // Configuración dispersa, difícil de versionar
  }
}

// ✅ Amplify Gen 2 (Code-first)
// amplify/auth/resource.ts
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!
      }
    }
  }
});
```

**Ventajas de Gen 2**:
- ✅ **Todo es código TypeScript** (versionable, reviewable)
- ✅ **Type-safe** (errores en compile time, no runtime)
- ✅ **Monorepo-friendly** (todo en un solo proyecto)
- ✅ **Mejor developer experience** (autocomplete, IntelliSense)

**Trade-off**:
- ⚠️ Documentación aún en desarrollo
- ⚠️ Comunidad más pequeña que Gen 1
- ⚠️ Algunas features de Gen 1 aún no portadas

### 3️⃣ **Amazon Cognito**

#### ¿Por qué Cognito?

**Lo que Cognito SÍ hace bien**:
- ✅ User pools (almacenamiento de usuarios)
- ✅ OAuth 2.0 / OIDC (Google, Facebook, etc.)
- ✅ Token management (access, refresh, ID tokens)
- ✅ MFA (TOTP, SMS)
- ✅ Password policies
- ✅ Scales automáticamente

**Lo que Cognito NO hace**:
- ❌ No maneja estado en tu frontend
- ❌ No optimiza llamadas API
- ❌ No provee UI components listos
- ❌ No hace CSRF protection
- ❌ No hace rate limiting (solo a nivel de API)

**Por eso necesitamos código custom** - lo veremos en los próximos pilares.

---

## 📁 Estructura del Proyecto (El "Por Qué" de Cada Archivo)

Vamos archivo por archivo, entendiendo su propósito:

```
aws-ug/
├── amplify/                    # 🔐 Backend Configuration
│   ├── auth/
│   │   └── resource.ts         # Cognito User Pool setup
│   ├── data/
│   │   └── resource.ts         # GraphQL schema (futuro)
│   ├── backend.ts              # Entry point del backend
│   └── package.json            # Dependencies del backend
│
├── src/
│   ├── app/                    # 🎨 Next.js App Router
│   │   ├── layout.tsx          # Root layout (AmplifyClientProvider)
│   │   ├── page.tsx            # Home page
│   │   ├── login/
│   │   │   └── page.tsx        # Login page (Google OAuth button)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx    # OAuth callback handler
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Protected route
│   │   └── api/
│   │       └── auth/
│   │           ├── session/
│   │           │   └── route.ts  # GET /api/auth/session
│   │           └── csrf/
│   │               └── route.ts  # GET /api/auth/csrf
│   │
│   ├── components/
│   │   ├── AmplifyClientProvider.tsx  # Configura Amplify en cliente
│   │   └── Navigation.tsx             # Nav bar con auth state
│   │
│   ├── context/
│   │   └── auth-context.tsx    # 🧠 Global auth state (CLAVE)
│   │
│   ├── lib/
│   │   ├── csrf.ts             # 🛡️ CSRF token generation/validation
│   │   ├── rate-limiter.ts     # 🛡️ Rate limiting logic
│   │   └── amplify/
│   │       └── config.ts       # Amplify client config
│   │
│   └── middleware.ts           # Next.js middleware (routing)
│
├── __tests__/                  # 🧪 Testing
│   ├── components/
│   │   ├── auth-context.test.tsx      # AuthContext tests
│   │   └── navigation.test.tsx        # Navigation tests
│   ├── lib/
│   │   ├── csrf.test.ts               # CSRF tests
│   │   └── rate-limiter.test.ts       # Rate limiter tests
│   └── e2e/
│       └── auth-flow.spec.ts          # E2E tests (Playwright)
│
├── amplify_outputs.json        # 🔧 Auto-generated (Amplify config)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript config
└── playwright.config.ts        # E2E testing config
```

### 🔍 Análisis de Archivos Clave

Vamos a profundizar en los más importantes:

#### 1. `amplify/auth/resource.ts` - La Base de Todo

**Propósito**: Define tu Cognito User Pool y OAuth providers.

**Por qué existe**: Amplify Gen 2 es "code-first". Todo se define en TypeScript.

**Ubicación**: `amplify/auth/resource.ts`

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile', 'openid']
      },
      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'https://tu-dominio.com/auth/callback'
      ],
      logoutUrls: [
        'http://localhost:3000',
        'https://tu-dominio.com'
      ]
    }
  }
});
```

**Decisiones técnicas**:
- ✅ **Environment variables** para secrets (nunca hardcodear)
- ✅ **Scopes mínimos** (`email`, `profile`, `openid`) - principio de menor privilegio
- ✅ **Múltiples callback URLs** - dev y prod

**⚠️ Posible mejora**:
```typescript
// 🤔 ¿Deberíamos agregar MFA aquí?
export const auth = defineAuth({
  // ... config existente
  multifactor: {
    mode: 'OPTIONAL',  // ¿O 'REQUIRED'?
    totp: true,
    sms: true
  }
});
```

**Trade-off**: MFA mejora seguridad pero complica UX. Discutir con el equipo.

---

#### 2. `src/app/layout.tsx` - El Punto de Entrada

**Propósito**: Root layout que envuelve toda la app.

**Por qué existe**: Next.js App Router requiere un layout raíz.

**Ubicación**: `src/app/layout.tsx`

```typescript
import { AmplifyClientProvider } from '@/components/AmplifyClientProvider';
import { AuthProvider } from '@/context/auth-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AmplifyClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AmplifyClientProvider>
      </body>
    </html>
  );
}
```

**Decisiones técnicas**:
- ✅ **Orden de providers**: AmplifyClientProvider primero (configura Amplify), luego AuthProvider (usa Amplify)
- ✅ **Client-side only**: Ambos providers tienen `'use client'` porque usan hooks de React

**🐛 Posible problema**:
```typescript
// ⚠️ ¿Qué pasa si AmplifyClientProvider falla?
// No tenemos error boundary aquí

// 💡 Mejora sugerida:
<ErrorBoundary fallback={<ErrorPage />}>
  <AmplifyClientProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </AmplifyClientProvider>
</ErrorBoundary>
```

---

#### 3. `src/context/auth-context.tsx` - El Cerebro del Sistema

**Propósito**: Global state de autenticación con optimizaciones de performance.

**Por qué existe**: Cognito/Amplify solo manejan tokens, no estado de UI.

**Ubicación**: `src/context/auth-context.tsx`

Este archivo es **LA PIEZA MÁS IMPORTANTE** del sistema. Vamos a analizarlo en detalle:

```typescript
'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useCallback,  // 🔑 Para function memoization
  useRef,       // 🔑 Para cache sin re-renders
  useMemo       // 🔑 Para context value memoization
} from 'react';

import { 
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  signOut
} from 'aws-amplify/auth';

import { Hub } from 'aws-amplify/utils';
```

**Decisiones técnicas en los imports**:

1. **`'use client'`** - ¿Por qué?
   - Amplify usa hooks de React (`useState`, `useEffect`)
   - Necesitamos acceso a `window` (para event listeners)
   - No puede ser Server Component

2. **Hooks específicos** - ¿Por qué estos y no otros?
   - `useCallback` - Evita recrear funciones en cada render (performance)
   - `useRef` - Cache sin causar re-renders (clave para optimizaciones)
   - `useMemo` - Context value estable (evita re-renders en consumidores)

3. **Amplify imports** - ¿Por qué estas funciones?
   - `getCurrentUser` - Obtiene user actual (si existe)
   - `fetchAuthSession` - Obtiene tokens (access, ID, refresh)
   - `signInWithRedirect` - Inicia OAuth flow con Google
   - `signOut` - Cierra sesión y limpia tokens
   - `Hub` - Event listener para cambios de auth state

**🤔 Pregunta**: ¿Por qué no usar `@aws-amplify/ui-react` (los componentes UI de Amplify)?

**Respuesta**: 
- ✅ Más control sobre UI/UX
- ✅ Más fácil de customizar
- ✅ Menos bundle size
- ❌ Más código para mantener

**Trade-off**: Código custom vs componentes pre-hechos. Elegimos control.

---

### Estado del Context

```typescript
interface AuthContextType {
  user: { userId: string; username: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

**Análisis de cada campo**:

| Campo | Tipo | Por qué existe | Posible mejora |
|-------|------|----------------|----------------|
| `user` | `{ userId, username } \| null` | Información mínima del usuario | 🤔 ¿Agregar `email`? ¿`roles`? |
| `isAuthenticated` | `boolean` | Para condicionales en UI (`if (isAuthenticated)`) | ✅ Suficiente |
| `isLoading` | `boolean` | Mostrar skeletons mientras se carga | ✅ Necesario para UX |
| `error` | `Error \| null` | Mostrar errores al usuario | 🤔 ¿Mejor un `{ code, message }`? |
| `login` | `() => Promise<void>` | Inicia OAuth con Google | ✅ Buena API |
| `logout` | `() => Promise<void>` | Cierra sesión | ✅ Buena API |
| `refreshUser` | `() => Promise<void>` | Refresca tokens/user | ⚠️ ¿Debería ser público? |

**🐛 Posible bug identificado**:

```typescript
// ⚠️ ¿Qué pasa si user cambia de cuenta sin logout?
// El cache de 5 segundos podría mostrar usuario incorrecto

// 💡 Solución: invalidate cache on Hub 'signedOut' event
```

---

## 🧱 Decisiones de Arquitectura Clave

### Decisión 1: Context API (no Zustand, no Redux)

**Razones**:
1. ✅ Nativo de React (no dependencies extra)
2. ✅ Suficiente para este caso de uso
3. ✅ Todos en el equipo conocen Context API

**Cuándo considerar alternativas**:
- ❌ Si necesitas DevTools avanzadas → Zustand
- ❌ Si necesitas time-travel debugging → Redux Toolkit
- ❌ Si el estado se vuelve muy complejo → Zustand + immer

### Decisión 2: Server Components + Client Components (híbrido)

**Patrón usado**:

```typescript
// ✅ Server Component (default en App Router)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // Puede hacer fetch en server-side
  const data = await fetchData();
  
  return (
    <div>
      {/* Client component para interactividad */}
      <UserProfile />
    </div>
  );
}

// ✅ Client Component (cuando necesitamos hooks/events)
// components/UserProfile.tsx
'use client';

export function UserProfile() {
  const { user } = useAuth(); // Hook solo funciona en client
  return <div>{user?.username}</div>;
}
```

**Regla**: Server por default, Client solo cuando sea necesario.

### Decisión 3: API Routes para operaciones sensibles

**Por qué**:

```typescript
// ❌ MAL - CSRF token generation en cliente
// components/Form.tsx
const csrfToken = generateRandomString(); // Predecible, inseguro

// ✅ BIEN - CSRF token en API route (server-side)
// app/api/auth/csrf/route.ts
export async function GET() {
  const token = crypto.randomBytes(32).toString('hex'); // Crypto seguro
  return NextResponse.json({ csrfToken: token });
}
```

**Beneficios**:
- ✅ Secrets nunca expuestos al cliente
- ✅ Validación en server-side
- ✅ Rate limiting en un solo lugar

---

## 🔄 Flujo de Datos Completo

Entendamos cómo viaja la información en este sistema:

### Escenario: Usuario hace login con Google

```
1. Usuario → Click "Login with Google"
   ↓
2. Client: login() ejecuta signInWithRedirect({ provider: 'Google' })
   ↓
3. Amplify → Redirect a Cognito Hosted UI
   ↓
4. Cognito → Redirect a Google OAuth
   ↓
5. Google → Usuario autoriza (email, profile)
   ↓
6. Google → Redirect a Cognito con authorization code
   ↓
7. Cognito → Exchange code por tokens (access, ID, refresh)
   ↓
8. Cognito → Redirect a /auth/callback?code=...
   ↓
9. Client: /auth/callback procesa callback
   ↓
10. Amplify Hub → Emite evento 'signedIn'
   ↓
11. AuthContext → Listener recibe evento
   ↓
12. AuthContext → refreshUser() obtiene user + session
   ↓
13. AuthContext → setUser(), setIsAuthenticated(true)
   ↓
14. Client → Redirect a /dashboard
   ↓
15. Dashboard → Renderiza (useAuth() devuelve user)
```

**Puntos críticos** donde pueden fallar:
- ⚠️ Step 4-6: Usuario cancela en Google
- ⚠️ Step 7: Cognito rechaza (invalid code, expired)
- ⚠️ Step 12: Network error al obtener user
- ⚠️ Step 14: Dashboard no accesible (permisos)

**Manejo de errores en cada punto** - veremos en Pilar 3.

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js App (Client Side)                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Pages      │  │ AuthContext  │  │  Components  │ │ │
│  │  │ (login, dash)│  │  (state)     │  │ (Navigation) │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Amplify Client Library                                 │ │
│  │  • signInWithRedirect()                                 │ │
│  │  • getCurrentUser()                                     │ │
│  │  • fetchAuthSession()                                   │ │
│  │  • signOut()                                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                     AWS Cloud                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Amazon Cognito                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  User Pool   │  │  OAuth 2.0   │  │   Google     │ │ │
│  │  │  (usuarios)  │  │  (tokens)    │  │  (provider)  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│            Next.js Server (API Routes)                       │
│  • /api/auth/session  (validación)                          │
│  • /api/auth/csrf     (tokens)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumen del Pilar 1

### Lo que aprendimos:

1. **El problema**: Autenticación moderna es complejo (seguridad, performance, DX)
2. **El stack**: Next.js 15 + Amplify Gen 2 + Cognito (y por qué cada pieza)
3. **La estructura**: Cada archivo tiene un propósito claro
4. **Las decisiones**: Context API, híbrido Server/Client, API routes para seguridad
5. **El flujo**: Cómo viaja la data desde click hasta dashboard

### Preguntas identificadas para futuros pilares:

- 🤔 ¿Cómo configuramos exactamente Cognito? → **Pilar 2**
- 🤔 ¿Cómo funciona AuthContext internamente? → **Pilar 3**
- 🤔 ¿Por qué esas optimizaciones específicas? → **Pilar 4**
- 🤔 ¿Cómo implementamos CSRF/rate limiting? → **Pilar 5**
- 🤔 ¿Cómo testeamos OAuth flow? → **Pilar 6**

### Posibles mejoras identificadas:

1. ✅ Agregar Error Boundary en root layout
2. ✅ Considerar MFA en Cognito config
3. ✅ Mejorar tipado de `error` en AuthContext
4. ✅ Invalidate cache on user change

---

## ✅ Checkpoint

Antes de continuar al Pilar 2, asegúrate de entender:

- [ ] Por qué elegimos este stack (y qué alternativas existen)
- [ ] Qué hace Cognito (y qué NO hace)
- [ ] Propósito de cada archivo principal
- [ ] Flujo completo de login (15 pasos)
- [ ] Trade-offs de nuestras decisiones

**¿Listo para el Pilar 2: Backend (Cognito + Amplify)?** 🚀

---

**Siguiente**: [Pilar 2: Configuración de Identidad (Backend)](./02-backend-cognito-amplify.md)
