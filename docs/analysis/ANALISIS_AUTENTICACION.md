# Análisis Completo del Sistema de Autenticación
## AWS User Group Puebla - Next.js + AWS Amplify + Cognito

**Fecha:** 8 de Octubre, 2025  
**Analista:** GitHub Copilot  
**Alcance:** Sistema de autenticación completo

---

## 📊 RESUMEN EJECUTIVO

### Estado General: ⚠️ NECESITA MEJORAS

El proyecto tiene una **base sólida** pero presenta **varios problemas críticos** que deben ser resueltos antes de producción:

- ✅ **Buenas configuraciones:** Amplify correctamente configurado, OAuth con Google funcional
- ⚠️ **Problemas de seguridad moderados:** Enfoque de token sync es discutible pero implementado correctamente
- ❌ **Problemas de arquitectura:** Múltiples verificaciones redundantes, falta de manejo consistente de errores
- ❌ **Tests fallando:** Varios tests no pasan, lo que indica desalineación entre código y expectativas
- ⚠️ **Código duplicado:** Lógica repetida en múltiples lugares

---

## 🔍 ANÁLISIS DETALLADO POR ÁREA

### 1. CONFIGURACIÓN DE AWS AMPLIFY ✅ (BIEN)

#### ✅ Lo que está bien:

**amplify/auth/resource.ts:**
```typescript
- ✓ Configuración correcta de OAuth con Google
- ✓ Atributos de usuario bien definidos (email, givenName, familyName)
- ✓ Grupos correctamente definidos (ADMINS, SPEAKERS, MEMBERS)
- ✓ Uso correcto de secret() para credenciales sensibles
- ✓ CallbackUrls y LogoutUrls correctamente configuradas
```

**amplify_outputs.json:**
```typescript
- ✓ User Pool y App Client correctamente configurados
- ✓ Identity Pool para acceso federado
- ✓ Política de contraseñas robusta (8 chars, mayúsculas, números, símbolos)
- ✓ OAuth scopes apropiados
```

#### ⚠️ Mejoras recomendadas:

1. **Habilitar MFA:** Actualmente está en `NONE`, debería ser al menos `OPTIONAL`
2. **Agregar más providers:** Solo Google configurado, considerar agregar más opciones

---

### 2. IMPLEMENTACIÓN DE AUTENTICACIÓN ⚠️ (NECESITA MEJORAS)

#### ❌ PROBLEMAS CRÍTICOS:

##### 2.1. Arquitectura de Token Sync - INSEGURA Y REDUNDANTE

**Archivo:** `src/lib/amplify/token-sync.ts`

**Problema:**
```typescript
// Está guardando información del usuario en cookies sin httpOnly
Cookies.set('user_info', JSON.stringify(userInfo), cookieOptions);
Cookies.set('user_groups', JSON.stringify(userGroups), cookieOptions);
```

**Riesgos:**
- ❌ Cookies accesibles desde JavaScript del cliente (XSS vulnerability)
- ❌ Información duplicada entre localStorage (Amplify) y cookies
- ❌ Posibilidad de desincronización
- ❌ No hay firma digital para prevenir tampering

**Solución recomendada:**
```typescript
// OPCIÓN 1: Usar Route Handlers de Next.js (RECOMENDADO)
// Crear API routes que verifiquen la sesión en el servidor
// /app/api/auth/session/route.ts

import { fetchAuthSession } from 'aws-amplify/auth/server';

export async function GET(request: Request) {
  const session = await fetchAuthSession({ 
    request 
  });
  
  return Response.json({
    isAuthenticated: !!session.tokens,
    userGroups: session.tokens?.accessToken.payload['cognito:groups'] || []
  });
}

// En el middleware:
export async function middleware(request: NextRequest) {
  // Verificar con el API route
  const sessionResponse = await fetch(new URL('/api/auth/session', request.url));
  const { isAuthenticated, userGroups } = await sessionResponse.json();
  // ... resto de lógica
}
```

**OPCIÓN 2 (Mejor):** Usar Amplify Server-Side con cookies httpOnly
```typescript
// Amplify Gen 2 soporta cookies httpOnly en el servidor
// Configurar en config.ts
import { createServerRunner } from '@aws-amplify/adapter-nextjs';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig
});
```

##### 2.2. Middleware con Doble Verificación - REDUNDANTE

**Archivo:** `src/middleware.ts`

**Problema:**
```typescript
// Verifica dos veces la autenticación
const middlewareAuth = await verifyTokensInMiddleware(request);

if (!middlewareAuth.isValid) {
  // Fall back to standard verification
  const standardAuth = await verifyTokens();  // ❌ SEGUNDA VERIFICACIÓN
  // ...
}
```

**Por qué es un problema:**
- Ralentiza cada request
- `verifyTokens()` no debería funcionar en middleware (no tiene acceso a localStorage)
- Lógica confusa y difícil de mantener

**Solución:**
```typescript
// Eliminar la doble verificación
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
    const auth = await verifyTokensInMiddleware(request);
    
    if (!auth.isValid) {
      const loginUrl = new URL(`/login?returnUrl=${pathname}`, request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verificar admin solo si es ruta admin
    if (isProtectedByPrefix(pathname, ADMIN_ROUTES) && !isUserAdmin(auth.groups || [])) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }
  
  return NextResponse.next();
}
```

##### 2.3. Auth Context - Manejo de Errores Inconsistente

**Archivo:** `src/context/auth-context.tsx`

**Problemas:**

```typescript
// 1. Console.error sin el error completo
console.error('Error al refrescar el usuario');  // ❌ No muestra el error real

// 2. Lógica de error confusa
if (!errorMessage.includes('not authenticated') && 
    !errorMessage.includes('No credentials') &&
    !errorMessage.includes('User is not authenticated')) {
  setError(err as Error);
} else {
  setError(null); // ❌ ¿Por qué limpiar el error aquí?
}
```

**Solución:**
```typescript
} catch (err) {
  const error = err as Error;
  console.error('Error al refrescar el usuario:', error);
  
  // Solo setear error si NO es un error de "no autenticado"
  const isAuthError = /not authenticated|no credentials|user is not authenticated/i.test(error.message);
  
  if (!isAuthenticated && !isAuthError) {
    setError(error);
  }
}
```

##### 2.4. verifyTokens() - Lógica de Refresh Cuestionable

**Archivo:** `src/lib/amplify/auth.ts`

**Problema:**
```typescript
// Refresca tokens si expiran en menos de 5 minutos
if (expiresInMs < 300000) { // 5 minutes
  const refreshedSession = await fetchAuthSession({ forceRefresh: true });
  // ...
}
```

**Problemas:**
- ❌ Esto se ejecuta en CADA llamada cuando el token está cerca de expirar
- ❌ Puede causar múltiples refreshes simultáneos
- ❌ No hay rate limiting ni debouncing

**Solución:**
```typescript
// Implementar cache y rate limiting
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
        return { isValid: false, error: new Error('Token is missing expiration time') };
      }
      
      const expirationTime = exp * 1000;
      const now = Date.now();
      const expiresInMs = expirationTime - now;
      
      // Solo refrescar si:
      // 1. Expira en menos de 5 minutos
      // 2. No se ha refrescado en el último minuto
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
          return {
            isValid: false,
            error: refreshError instanceof Error ? refreshError : new Error('Token refresh failed')
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

### 3. COMPONENTES Y PÁGINAS ⚠️ (ACEPTABLE)

#### ✅ Lo que está bien:

1. **Uso correcto de Suspense:** En login y callback pages
2. **Loading states:** Bien implementados
3. **Error handling UI:** Buenos mensajes de error para el usuario
4. **Responsive design:** Buen uso de Tailwind

#### ⚠️ Problemas:

##### 3.1. AmplifyClientProvider ejecuta lógica en cliente

**Archivo:** `src/components/AmplifyClientProvider.tsx`

```typescript
useEffect(() => {
  initializeAmplify();  // ✅ OK
  const cleanup = setupTokenSync();  // ❌ PROBLEMA
  // ...
}, []);
```

**Problema:** `setupTokenSync()` debería ser opcional o removido si se implementa la solución del servidor.

##### 3.2. Callback page con lógica frágil

**Archivo:** `src/app/auth/callback/page.tsx`

```typescript
// Depende de sessionStorage que puede fallar
const storedReturnUrl = sessionStorage.getItem('auth_return_url');
```

**Mejor implementación:**
```typescript
// Usar URL parameter en lugar de sessionStorage
const returnUrl = searchParams.get('returnUrl') || '/dashboard';
```

---

### 4. TESTS ❌ (CRÍTICO - MUCHOS FALLAN)

#### Problemas encontrados:

1. **Tests de archivos mock fallan:**
```
FAIL __tests__/mocks/js-cookie.ts
FAIL __tests__/mocks/auth-mocks.ts
FAIL __tests__/mocks/request-mocks.ts
```
**Causa:** Los archivos mock no deberían tener extensión `.test.ts`

2. **auth-context.test.tsx falla:**
```
console.error: Error al refrescar el usuario
```
**Causa:** Los mocks no están configurados correctamente para el useEffect inicial

3. **Warning de act():**
```
Warning: An update to AuthProvider inside a test was not wrapped in act(...)
```
**Causa:** State updates asíncronos no están envueltos en `act()`

#### Soluciones:

**1. Renombrar archivos mock:**
```bash
# Estos no deberían tener tests, solo exports
__tests__/mocks/js-cookie.ts  # ✅ Correcto (no tiene .test)
__tests__/mocks/auth-mocks.ts  # ✅ Correcto
```

**2. Arreglar setup de mocks:**
```typescript
// En auth-context.test.tsx
beforeEach(() => {
  setupTestMocks();
  
  // Mock default behavior para evitar errores en useEffect
  mockAuthFunctions.getCurrentUser.mockResolvedValue(null);
  mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
  mockAuthFunctions.getUserAttributes.mockResolvedValue(null);
  mockAuthFunctions.createAuthListener.mockReturnValue(jest.fn());
});
```

**3. Envolver state updates en act():**
```typescript
await act(async () => {
  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
});
```

---

### 5. CONFIGURACIÓN DE NEXT.JS ✅ (BIEN)

#### ✅ Lo que está bien:

1. **next.config.ts:** Configuración básica correcta
2. **middleware matcher:** Bien configurado para excluir archivos estáticos
3. **Layout:** SSR habilitado correctamente con `suppressHydrationWarning`

#### ⚠️ Sugerencias:

**Agregar variables de entorno:**
```typescript
// .env.local
NEXT_PUBLIC_AMPLIFY_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_DtFFyTxqq
NEXT_PUBLIC_USER_POOL_CLIENT_ID=gk06sdd4ocdic3j6igt4opopd
```

**Agregar validación:**
```typescript
// src/lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_AMPLIFY_REGION',
  'NEXT_PUBLIC_USER_POOL_ID',
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

---

## 🔒 ANÁLISIS DE SEGURIDAD

### 🔴 VULNERABILIDADES CRÍTICAS:

1. **Cookies sin httpOnly flag**
   - **Riesgo:** XSS attacks pueden robar información del usuario
   - **Solución:** Usar server-side cookies con httpOnly

2. **No hay CSRF protection**
   - **Riesgo:** Cross-Site Request Forgery
   - **Solución:** Implementar CSRF tokens para mutaciones

3. **Token sync sin firma digital**
   - **Riesgo:** Cookies pueden ser modificadas en el cliente
   - **Solución:** Firmar cookies o usar httpOnly

### 🟡 VULNERABILIDADES MODERADAS:

1. **Console.error expone información**
   - Mejor usar un logger con niveles de producción

2. **No hay rate limiting**
   - Agregar rate limiting para login y refresh

3. **Secrets en código**
   - Aunque se usan `secret()`, asegurar que no estén en git

---

## 📋 CHECKLIST PARA PRODUCCIÓN

### Seguridad:
- [ ] Implementar cookies httpOnly
- [ ] Agregar CSRF protection
- [ ] Habilitar MFA (al menos OPTIONAL)
- [ ] Implementar rate limiting
- [ ] Remover console.logs en producción
- [ ] Validar todas las variables de entorno
- [ ] Configurar CORS correctamente
- [ ] Implementar Content Security Policy (CSP)

### Rendimiento:
- [ ] Eliminar verificaciones redundantes en middleware
- [ ] Implementar caching para session checks
- [ ] Optimizar token refresh logic
- [ ] Agregar monitoring (CloudWatch, Sentry)

### Tests:
- [ ] Arreglar todos los tests fallidos
- [ ] Agregar tests E2E con Playwright
- [ ] Agregar tests de integración
- [ ] Configurar CI/CD con tests

### Código:
- [ ] Remover código duplicado
- [ ] Mejorar manejo de errores
- [ ] Agregar tipos TypeScript más estrictos
- [ ] Documentar funciones complejas
- [ ] Implementar logging estructurado

---

## 🎯 PRIORIDADES RECOMENDADAS

### 🔴 CRÍTICO (Hacer ANTES de producción):

1. **Reimplementar token sync** usando server-side approach
2. **Arreglar middleware** para eliminar verificaciones redundantes
3. **Habilitar MFA** en Cognito
4. **Arreglar tests fallidos**
5. **Implementar httpOnly cookies**

### 🟡 IMPORTANTE (Hacer DESPUÉS de crítico):

1. Agregar rate limiting
2. Implementar CSRF protection
3. Mejorar error handling y logging
4. Agregar monitoring y alertas
5. Optimizar performance

### 🟢 MEJORAS (Cuando haya tiempo):

1. Agregar más providers OAuth (GitHub, Facebook)
2. Implementar refresh token rotation
3. Agregar analytics
4. Mejorar UX con progressive enhancement
5. Agregar PWA features

---

## 💡 RECOMENDACIONES FINALES

### ¿El código actual funciona?
**Sí**, pero tiene problemas de seguridad y arquitectura que deben resolverse.

### ¿Es seguro para producción?
**No en su estado actual**. Necesita las mejoras críticas mencionadas.

### ¿Sigue las mejores prácticas de Amplify y Next.js?
**Parcialmente**. La configuración de Amplify es buena, pero la implementación del middleware y token sync NO sigue las mejores prácticas.

### ¿Qué hacer primero?

**OPCIÓN 1 - Rápida (1-2 días):**
1. Desactivar token sync completamente
2. Hacer que todas las rutas protegidas sean Client Components
3. Verificar autenticación solo en el cliente
4. Arreglar tests

**OPCIÓN 2 - Correcta (3-5 días):**
1. Implementar server-side authentication con Route Handlers
2. Usar cookies httpOnly firmadas
3. Eliminar token sync
4. Reimplementar middleware correctamente
5. Arreglar tests

**RECOMIENDO OPCIÓN 2** para un producto de calidad.

---

## 📚 RECURSOS ÚTILES

- [Amplify Gen 2 Server-Side Auth](https://docs.amplify.aws/nextjs/build-a-backend/auth/set-up-auth/)
- [Next.js Middleware Best Practices](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [AWS Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/security-best-practices.html)
- [Next.js Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)

---

## ✅ CONCLUSIÓN

El proyecto tiene una **base sólida** pero necesita **refactorización significativa** en el sistema de autenticación antes de producción. Los problemas principales son:

1. Arquitectura de token sync insegura
2. Verificaciones redundantes en middleware
3. Tests fallidos
4. Falta de protecciones de seguridad básicas

**Tiempo estimado para producción:** 1-2 semanas de trabajo enfocado.

**Nivel de riesgo actual:** 🟡 MEDIO-ALTO

Con las correcciones propuestas, este puede ser un sistema de autenticación robusto y seguro.
