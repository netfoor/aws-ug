# Plan de Acción - Correcciones del Sistema de Autenticación

## 🎯 OBJETIVO
Llevar el sistema de autenticación a un estado production-ready en 3-5 días de trabajo.

---

## 📅 FASE 1: CORRECCIONES CRÍTICAS (Día 1-2)

### ✅ Tarea 1.1: Eliminar Token Sync Inseguro

**Archivos a modificar:**
- `src/lib/amplify/token-sync.ts` - ELIMINAR
- `src/components/AmplifyClientProvider.tsx` - Actualizar
- `src/context/auth-context.tsx` - Actualizar

**Cambios:**

```typescript
// src/components/AmplifyClientProvider.tsx
'use client';

import React, { useEffect } from 'react';
import { initializeAmplify } from '@/app/lib/config';

interface AmplifyClientProviderProps {
  children: React.ReactNode;
}

const AmplifyClientProvider: React.FC<AmplifyClientProviderProps> = ({ children }) => {
  useEffect(() => {
    initializeAmplify();
  }, []);

  return <>{children}</>;
};

export default AmplifyClientProvider;
```

```typescript
// src/context/auth-context.tsx - Remover imports y llamadas a token-sync
// ELIMINAR:
import { clearAuthCookies } from '@/lib/amplify/token-sync';

// ELIMINAR en logout:
if (typeof window !== 'undefined') {
  clearAuthCookies();
}
```

---

### ✅ Tarea 1.2: Implementar Server-Side Auth

**Archivos a crear:**

```typescript
// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';

export async function GET(request: NextRequest) {
  try {
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { request },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          
          if (!session.tokens?.accessToken) {
            return {
              isAuthenticated: false,
              groups: [],
              expiresAt: 0
            };
          }
          
          const groups = session.tokens.accessToken.payload['cognito:groups'] as string[] || [];
          const exp = session.tokens.accessToken.payload.exp || 0;
          
          return {
            isAuthenticated: true,
            groups,
            expiresAt: exp
          };
        } catch (error) {
          return {
            isAuthenticated: false,
            groups: [],
            expiresAt: 0
          };
        }
      }
    });

    return NextResponse.json(authenticated);
  } catch (error) {
    return NextResponse.json({
      isAuthenticated: false,
      groups: [],
      expiresAt: 0
    });
  }
}
```

```typescript
// src/lib/amplify/server-utils.ts
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import config from '@/../amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
  config
});
```

---

### ✅ Tarea 1.3: Simplificar Middleware

**Archivo:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/dashboard', '/admin'];
const ADMIN_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/access-denied'];

function isProtectedByPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir rutas públicas
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // 2. Verificar autenticación para rutas protegidas
  if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
    try {
      // Llamar al API route para verificar sesión
      const sessionUrl = new URL('/api/auth/session', request.url);
      const sessionResponse = await fetch(sessionUrl, {
        headers: {
          cookie: request.headers.get('cookie') || ''
        }
      });

      if (!sessionResponse.ok) {
        const loginUrl = new URL(`/login?returnUrl=${encodeURIComponent(pathname)}`, request.url);
        return NextResponse.redirect(loginUrl);
      }

      const { isAuthenticated, groups } = await sessionResponse.json();

      if (!isAuthenticated) {
        const loginUrl = new URL(`/login?returnUrl=${encodeURIComponent(pathname)}`, request.url);
        return NextResponse.redirect(loginUrl);
      }

      // 3. Verificar permisos de admin
      if (isProtectedByPrefix(pathname, ADMIN_ROUTES)) {
        const isAdmin = Array.isArray(groups) && groups.includes('ADMINS');
        
        if (!isAdmin) {
          const accessDeniedUrl = new URL('/access-denied', request.url);
          return NextResponse.redirect(accessDeniedUrl);
        }
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Error en middleware:', error);
      const loginUrl = new URL('/login?error=session_error', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

### ✅ Tarea 1.4: Arreglar Manejo de Errores en AuthContext

**Archivo:** `src/context/auth-context.tsx`

```typescript
// Mejorar refreshUser
const refreshUser = async () => {
  try {
    setIsLoading(true);
    const user = await getCurrentUser();
    
    if (user) {
      const [isAdminResult, attributes] = await Promise.all([
        checkIsUserAdmin(user),
        getUserAttributes(user)
      ]);
      
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(isAdminResult);
      setUserAttributes(attributes);
      setError(null);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserAttributes(null);
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error al refrescar el usuario:', error);
    
    // Solo setear error si NO es un error esperado de "no autenticado"
    const isExpectedAuthError = /not authenticated|no credentials|no current user/i.test(error.message);
    
    if (!isAuthenticated) {
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserAttributes(null);
      
      if (!isExpectedAuthError) {
        setError(error);
      } else {
        setError(null);
      }
    }
  } finally {
    setIsLoading(false);
  }
};
```

---

### ✅ Tarea 1.5: Actualizar Configuración de Amplify

**Archivo:** `src/app/lib/config.ts`

```typescript
import { Amplify } from 'aws-amplify';
import amplifyOutputs from '@/../amplify_outputs.json';

let isInitialized = false;

export const initializeAmplify = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (isInitialized) {
    return;
  }

  try {
    Amplify.configure(amplifyOutputs, { 
      ssr: true 
    });
    
    isInitialized = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Amplify configured successfully');
    }
  } catch (error) {
    console.error('Error configuring Amplify:', error);
    throw error;
  }
};
```

---

## 📅 FASE 2: MEJORAS DE SEGURIDAD (Día 3)

### ✅ Tarea 2.1: Habilitar MFA

**Archivo:** `amplify/auth/resource.ts`

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
  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true
  }
});
```

---

### ✅ Tarea 2.2: Agregar Rate Limiting

```typescript
// src/lib/rate-limiter.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count };
}

// Limpiar registros viejos cada 5 minutos
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
}
```

```typescript
// Usar en API route
import { rateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const { success, remaining } = rateLimit(ip, 10, 60000);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // ... resto del código
}
```

---

### ✅ Tarea 2.3: Agregar Validación de Variables de Entorno

```typescript
// src/lib/env.ts
const requiredEnvVars = {
  // No hay variables públicas requeridas si usamos amplify_outputs.json
  // Pero podemos validar el archivo
} as const;

export function validateEnv() {
  try {
    const amplifyConfig = require('@/../amplify_outputs.json');
    
    if (!amplifyConfig.auth?.user_pool_id) {
      throw new Error('Missing Amplify configuration: user_pool_id');
    }
    
    if (!amplifyConfig.auth?.user_pool_client_id) {
      throw new Error('Missing Amplify configuration: user_pool_client_id');
    }
    
    return true;
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw error;
  }
}
```

```typescript
// Llamar en src/app/layout.tsx
import { validateEnv } from '@/lib/env';

if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
```

---

## 📅 FASE 3: ARREGLAR TESTS (Día 4)

### ✅ Tarea 3.1: Actualizar Auth Context Tests

```typescript
// __tests__/components/auth-context.test.tsx
describe('AuthProvider', () => {
  const mockAuthFunctions = require('@/lib/amplify/auth');

  beforeEach(() => {
    setupTestMocks();
    
    // Configurar mocks por defecto para evitar errores
    mockAuthFunctions.getCurrentUser.mockResolvedValue(null);
    mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
    mockAuthFunctions.getUserAttributes.mockResolvedValue(null);
    mockAuthFunctions.createAuthListener.mockReturnValue(jest.fn());
    mockAuthFunctions.signOut.mockResolvedValue(undefined);
    mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    mockAuthFunctions.getCurrentUser.mockRejectedValue(
      new Error('User not authenticated')
    );
    
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
  });

  // ... resto de tests
});
```

---

### ✅ Tarea 3.2: Eliminar Tests de Archivos Mock

Los archivos en `__tests__/mocks/` no deberían ejecutarse como tests. Asegurar que:

```
__tests__/mocks/auth-mocks.ts    ✅ (sin .test)
__tests__/mocks/js-cookie.ts     ✅ (sin .test)
__tests__/mocks/request-mocks.ts ✅ (sin .test)
```

Si Jest los está ejecutando, actualizar `jest.config.js`:

```javascript
module.exports = {
  // ... configuración existente
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '!**/__tests__/mocks/**',  // Excluir carpeta mocks
    '!**/__tests__/utils/**'   // Excluir carpeta utils
  ],
};
```

---

## 📅 FASE 4: OPTIMIZACIÓN Y DOCUMENTACIÓN (Día 5)

### ✅ Tarea 4.1: Optimizar verifyTokens

```typescript
// src/lib/amplify/auth.ts
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 60000; // 1 minuto

export async function verifyTokens(): Promise<{
  isValid: boolean;
  tokens?: unknown;
  error?: Error;
}> {
  try {
    const authSession = await fetchAuthSession();
    
    if (authSession.tokens?.idToken && authSession.tokens?.accessToken) {
      const accessToken = authSession.tokens.accessToken;
      const exp = accessToken.payload.exp;
      
      if (!exp) {
        return { 
          isValid: false, 
          error: new Error('Token is missing expiration time') 
        };
      }
      
      const expirationTime = exp * 1000;
      const now = Date.now();
      const expiresInMs = expirationTime - now;
      
      // Si está expirado
      if (expiresInMs <= 0) {
        return { isValid: false };
      }
      
      // Si expira en menos de 5 minutos Y no se ha refrescado recientemente
      if (expiresInMs < 300000 && (now - lastRefreshTime) > REFRESH_COOLDOWN) {
        try {
          lastRefreshTime = now;
          const refreshedSession = await fetchAuthSession({ forceRefresh: true });
          
          if (!refreshedSession.tokens?.idToken || !refreshedSession.tokens?.accessToken) {
            return { isValid: false };
          }
          
          return {
            isValid: true,
            tokens: refreshedSession.tokens
          };
        } catch (refreshError) {
          // Si falla el refresh, aún podemos usar el token actual si no ha expirado
          if (expiresInMs > 0) {
            return {
              isValid: true,
              tokens: authSession.tokens
            };
          }
          
          return {
            isValid: false,
            error: refreshError instanceof Error 
              ? refreshError 
              : new Error('Token refresh failed')
          };
        }
      }
      
      return {
        isValid: true,
        tokens: authSession.tokens
      };
    }
    
    return { isValid: false };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error : new Error('Token verification failed')
    };
  }
}
```

---

### ✅ Tarea 4.2: Agregar Documentación

Crear `docs/AUTHENTICATION.md`:

```markdown
# Sistema de Autenticación

## Arquitectura

El sistema usa:
- AWS Cognito para gestión de usuarios
- AWS Amplify Gen 2 para integración
- Next.js 15 App Router
- OAuth 2.0 con Google

## Flujo de Autenticación

1. Usuario hace clic en "Login con Google"
2. Se redirige al Hosted UI de Cognito
3. Usuario autoriza en Google
4. Google redirige a Cognito
5. Cognito redirige a `/auth/callback`
6. Aplicación procesa el callback y almacena tokens
7. Usuario es redirigido a la ruta solicitada

## Protección de Rutas

El middleware protege rutas automáticamente:
- `/profile` - Requiere autenticación
- `/dashboard` - Requiere autenticación
- `/admin` - Requiere autenticación + grupo ADMINS

## Uso en Componentes

\`\`\`tsx
import { useAuth } from '@/context/auth-context';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Hello {user.username}</div>;
}
\`\`\`
```

---

## 📝 CHECKLIST DE VALIDACIÓN

Después de implementar todos los cambios:

### Funcionalidad:
- [ ] Login con Google funciona
- [ ] Logout funciona correctamente
- [ ] Refresh de tokens es automático
- [ ] Rutas protegidas redirigen a login
- [ ] Admin routes solo accesibles para admins
- [ ] Callback page maneja errores correctamente

### Seguridad:
- [ ] No hay información sensible en cookies del cliente
- [ ] MFA está habilitado
- [ ] Rate limiting funciona
- [ ] No hay console.logs en producción
- [ ] Variables de entorno validadas

### Tests:
- [ ] Todos los unit tests pasan
- [ ] Tests de integración pasan
- [ ] E2E tests con Playwright pasan

### Performance:
- [ ] No hay verificaciones redundantes
- [ ] Token refresh tiene cooldown
- [ ] Middleware es rápido (<100ms)

---

## 🚀 COMANDOS PARA EJECUTAR

```bash
# 1. Instalar dependencias nuevas
npm install @aws-amplify/adapter-nextjs

# 2. Eliminar archivos obsoletos
rm src/lib/amplify/token-sync.ts
rm src/lib/amplify/middleware-auth.ts

# 3. Ejecutar tests
npm run test

# 4. Build para verificar
npm run build

# 5. Deploy a Amplify (cuando esté listo)
npx amplify sandbox --once
git add .
git commit -m "feat: implement secure server-side authentication"
git push
```

---

## 📊 ESTIMACIÓN DE TIEMPO

| Fase | Tareas | Tiempo Estimado |
|------|--------|----------------|
| Fase 1 | Correcciones críticas | 2 días |
| Fase 2 | Seguridad | 1 día |
| Fase 3 | Tests | 1 día |
| Fase 4 | Optimización | 1 día |
| **TOTAL** | | **5 días** |

---

## ⚠️ NOTAS IMPORTANTES

1. **Backup antes de cambios:** Hacer commit del código actual
2. **Testing en desarrollo:** Probar cada fase antes de continuar
3. **No saltar fases:** Cada fase depende de la anterior
4. **Documentar cambios:** Actualizar README.md con nuevas instrucciones

---

¿Listo para empezar? 🚀
