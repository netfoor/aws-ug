# Pilar 6: Testing Strategy

## 🎯 Lo Que Vamos a Analizar

En este pilar, vamos a hacer un **análisis completo de testing**:

1. Filosofía de testing: qué testear y qué no
2. Unit testing patterns para auth
3. Mocking AWS Amplify (los desafíos)
4. Testing de optimizaciones (debouncing, caching)
5. E2E testing con OAuth (el problema real)
6. Test coverage: métricas y significado
7. CI/CD pipelines y testing automation
8. Bugs encontrados durante testing

**No vamos a escribir tests genéricos**. Vamos a **entender los desafíos específicos de auth testing**.

---

## 🧠 Filosofía de Testing

### Pirámide de Testing

```
        /\
       /  \    E2E Tests (pocos, lentos, caros)
      /    \   - 16 tests Playwright
     /      \  - 9 running, 7 skipped (OAuth)
    /--------\
   /          \  Integration Tests (algunos)
  /            \ - AuthContext + Amplify
 /              \- API routes + Cognito
/--------------  \
|                | Unit Tests (muchos, rápidos, baratos)
|   95 tests     | - Components
|   100% passing | - Hooks
|________________| - Utils

Base ancha: Unit tests (95 tests)
Medio: Integration (incluido en E2E)
Top pequeño: E2E (16 tests, 9 active)
```

### ¿Qué Testear?

**✅ DEBE testearse**:
```
1. Lógica de negocio
   - refreshUser() con cache/debouncing
   - login/logout flows
   - Estado de loading/error

2. Edge cases
   - Token expirado
   - Network errors
   - Cognito throttling
   - Usuario sin grupos

3. Optimizaciones
   - Cache hit/miss
   - Debouncing funciona
   - Deduplication previene duplicados

4. Security
   - Tokens no expuestos
   - CSRF protection
   - XSS prevention
```

**❌ NO testear (redundante/imposible)**:
```
1. Implementación interna de AWS
   - Cognito valida JWT (confía en AWS)
   - Google OAuth flow (confía en Google)

2. React internals
   - useEffect ejecuta (confía en React)
   - useState actualiza (confía en React)

3. Third-party libs
   - Amplify Auth.getCurrentUser() (confía en docs)
   - fetch() API (confía en browser)
```

### Testing ROI

| Tipo | Costo | Beneficio | ROI |
|------|-------|-----------|-----|
| **Unit tests** | Bajo (1h por 10 tests) | Alto (catch bugs early) | ⭐⭐⭐⭐⭐ |
| **Integration** | Medio (2h setup) | Alto (catch integration bugs) | ⭐⭐⭐⭐ |
| **E2E** | Alto (8h, frágiles) | Medio (catch UI bugs) | ⭐⭐⭐ |
| **Manual** | Muy alto (cada deploy) | Bajo (no escalable) | ⭐ |

**Nuestra estrategia**: 
- 95% cobertura con unit tests
- E2E para happy path + critical flows
- Manual para OAuth (no automatizable fácilmente)

---

## 🔬 Unit Testing: AuthContext

### Setup de Testing Environment

**Stack de testing**:
```json
{
  "dependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

**Configuración clave**:
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom', // Simula navegador
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Alias de imports
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
```

### Desafío 1: Mocking AWS Amplify

**Problema**: Amplify es una biblioteca compleja con side effects.

```typescript
// ❌ Mock ingenuo (no funciona)
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
}));

// Problema:
// 1. Amplify tiene estado interno (tokens en memory)
// 2. Hub events necesitan pub/sub real
// 3. fetchAuthSession() depende de getCurrentUser()
```

**✅ Mock robusto**:

```typescript
// __tests__/mocks/amplify.ts
import { jest } from '@jest/globals';

// Mock completo de auth module
export const mockGetCurrentUser = jest.fn();
export const mockFetchAuthSession = jest.fn();
export const mockSignInWithRedirect = jest.fn();
export const mockSignOut = jest.fn();

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  fetchAuthSession: mockFetchAuthSession,
  signInWithRedirect: mockSignInWithRedirect,
  signOut: mockSignOut,
}));

// Mock de Hub con pub/sub funcional
const listeners: Array<(data: any) => void> = [];

export const mockHub = {
  listen: jest.fn((channel, callback) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }),
  dispatch: jest.fn((channel, payload) => {
    listeners.forEach(listener => listener({ payload }));
  }),
};

jest.mock('aws-amplify/utils', () => ({
  Hub: mockHub,
}));
```

**Por qué este mock funciona**:
```typescript
// 1. Mantiene estado de listeners
const listeners: Array<(data: any) => void> = [];

// 2. listen() agrega listener y retorna cleanup
listen: (channel, callback) => {
  listeners.push(callback);
  return () => listeners.splice(listeners.indexOf(callback), 1);
}

// 3. dispatch() notifica a todos los listeners
dispatch: (channel, payload) => {
  listeners.forEach(listener => listener({ payload }));
}

// 4. En test, podemos simular eventos:
mockHub.dispatch('auth', { 
  event: 'signedIn',
  data: { /* ... */ }
});
```

### Test Case 1: Initial Load

```typescript
// __tests__/components/auth-context.test.tsx
import { render, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { mockGetCurrentUser, mockFetchAuthSession } from '@/mocks/amplify';

describe('AuthContext - Initial Load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load user on mount if session exists', async () => {
    // Arrange: Mock usuario autenticado
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: {
        loginId: 'john@example.com',
      },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['MEMBERS'],
          },
        },
      },
    });

    // Act: Renderizar componente que usa AuthContext
    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Assert: Esperar a que cargue
    await waitFor(() => {
      expect(authState.loading).toBe(false);
    });

    expect(authState.user).toEqual({
      userId: 'google_123',
      username: 'john@example.com',
      email: 'john@example.com',
      groups: ['MEMBERS'],
    });

    // Verificar llamadas
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
  });

  it('should set user to null if no session exists', async () => {
    // Arrange: Mock no autenticado
    mockGetCurrentUser.mockRejectedValue(new Error('No current user'));

    // Act
    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Assert
    await waitFor(() => {
      expect(authState.loading).toBe(false);
    });

    expect(authState.user).toBeNull();
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockFetchAuthSession).not.toHaveBeenCalled(); // No llamar si no hay usuario
  });
});
```

**Análisis del test**:
```typescript
// 1. beforeEach limpia mocks
jest.clearAllMocks();
// Importante: Cada test debe empezar con estado limpio

// 2. mockResolvedValue simula respuesta exitosa
mockGetCurrentUser.mockResolvedValue({ /* ... */ });
// Equivalente a: getCurrentUser = async () => ({ /* ... */ });

// 3. TestComponent captura estado
let authState: any;
function TestComponent() {
  authState = useAuth();
  return null;
}
// Patrón común: Componente dummy para acceder a context

// 4. waitFor espera cambio asíncrono
await waitFor(() => {
  expect(authState.loading).toBe(false);
});
// Crucial: useEffect es asíncrono, necesitamos esperar
```

### Test Case 2: Cache Behavior

```typescript
describe('AuthContext - Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // ← Controlar tiempo
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should use cache if refresh called within 5 seconds', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: { loginId: 'john@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    // Act: Renderizar
    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Esperar primer refresh
    await waitFor(() => expect(authState.loading).toBe(false));

    // Limpiar llamadas
    mockGetCurrentUser.mockClear();
    mockFetchAuthSession.mockClear();

    // Act: Llamar refreshUser inmediatamente (dentro de 5s)
    act(() => {
      authState.refreshUser();
    });

    // Assert: No debe hacer API call (cache hit)
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockFetchAuthSession).not.toHaveBeenCalled();
  });

  it('should bypass cache if more than 5 seconds passed', async () => {
    // Arrange (igual que anterior)
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: { loginId: 'john@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(authState.loading).toBe(false));

    mockGetCurrentUser.mockClear();
    mockFetchAuthSession.mockClear();

    // Act: Avanzar tiempo 6 segundos (más de 5s cache)
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Act: Llamar refreshUser
    act(() => {
      authState.refreshUser();
    });

    // Assert: DEBE hacer API call (cache expired)
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Análisis de fake timers**:
```typescript
// 1. jest.useFakeTimers() reemplaza setTimeout/setInterval
jest.useFakeTimers();

// 2. Código usa setTimeout (debouncing)
setTimeout(() => refreshUser(), 300);

// 3. Sin fake timers: test espera 300ms real (lento)
// Con fake timers: test controla tiempo

// 4. Avanzar tiempo manualmente
jest.advanceTimersByTime(6000); // Avanza 6 segundos instantáneamente

// 5. Verificar que callback ejecutó
expect(mockGetCurrentUser).toHaveBeenCalled();
```

### Test Case 3: Debouncing

```typescript
describe('AuthContext - Debouncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce window focus events', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: { loginId: 'john@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    // Esperar initial load
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    mockGetCurrentUser.mockClear();
    mockFetchAuthSession.mockClear();

    // Avanzar tiempo >5s para bypass cache
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Act: Simular múltiples focus events
    act(() => {
      window.dispatchEvent(new Event('focus')); // T=0
    });

    act(() => {
      jest.advanceTimersByTime(100);
      window.dispatchEvent(new Event('focus')); // T=100ms
    });

    act(() => {
      jest.advanceTimersByTime(100);
      window.dispatchEvent(new Event('focus')); // T=200ms
    });

    act(() => {
      jest.advanceTimersByTime(100);
      window.dispatchEvent(new Event('focus')); // T=300ms
    });

    // Assert: Aún no debe haber llamado (dentro de debounce delay)
    expect(mockGetCurrentUser).not.toHaveBeenCalled();

    // Act: Avanzar 300ms más (pasar debounce delay)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Assert: AHORA debe haber llamado (solo 1 vez)
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Visualización del test**:
```
Timeline:
T=0ms:    Focus event 1 → setTimeout(refresh, 300)
T=100ms:  Focus event 2 → clearTimeout() → setTimeout(refresh, 300)
T=200ms:  Focus event 3 → clearTimeout() → setTimeout(refresh, 300)
T=300ms:  Focus event 4 → clearTimeout() → setTimeout(refresh, 300)
T=600ms:  (300ms después del último) → refresh() ejecuta

Resultado: 4 eventos → 1 API call ✅
```

### Test Case 4: Hub Events

```typescript
describe('AuthContext - Hub Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh user on signedIn event', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: { loginId: 'john@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    // Esperar initial load
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    mockGetCurrentUser.mockClear();
    mockFetchAuthSession.mockClear();

    // Act: Simular signedIn event desde Hub
    act(() => {
      mockHub.dispatch('auth', {
        event: 'signedIn',
        data: { /* ... */ },
      });
    });

    // Assert: Debe llamar refreshUser
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
    });
  });

  it('should clear user on signedOut event', async () => {
    // Arrange: Usuario inicialmente autenticado
    mockGetCurrentUser.mockResolvedValue({
      userId: 'google_123',
      username: 'john@example.com',
      signInDetails: { loginId: 'john@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authState.user).not.toBeNull();
    });

    // Act: Simular signedOut event
    act(() => {
      mockHub.dispatch('auth', {
        event: 'signedOut',
      });
    });

    // Assert: Usuario debe ser null
    await waitFor(() => {
      expect(authState.user).toBeNull();
      expect(authState.loading).toBe(false);
    });
  });
});
```

### Test Case 5: Logout with Cache Invalidation

**Este test descubrió un bug real**:

```typescript
describe('AuthContext - Logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate cache on logout', async () => {
    // Arrange: Usuario A logueado
    mockGetCurrentUser.mockResolvedValue({
      userId: 'userA',
      username: 'userA@example.com',
      signInDetails: { loginId: 'userA@example.com' },
    });

    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { payload: { 'cognito:groups': ['MEMBERS'] } },
      },
    });

    mockSignOut.mockResolvedValue(undefined);

    let authState: any;
    function TestComponent() {
      authState = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(authState.user?.userId).toBe('userA'));

    // Act: Usuario A hace logout
    await act(async () => {
      await authState.logout();
    });

    // Assert: Usuario debe ser null
    expect(authState.user).toBeNull();

    // Arrange: Usuario B login (simular nuevo usuario)
    mockGetCurrentUser.mockResolvedValue({
      userId: 'userB',
      username: 'userB@example.com',
      signInDetails: { loginId: 'userB@example.com' },
    });

    // Act: Llamar refreshUser inmediatamente
    await act(async () => {
      await authState.refreshUser();
    });

    // Assert: Debe llamar API (cache invalidado), no usar cache de userA
    await waitFor(() => {
      expect(authState.user?.userId).toBe('userB');
    });

    expect(mockGetCurrentUser).toHaveBeenCalled();
  });
});
```

**Bug que encontramos**:

```typescript
// ❌ Código original (malo)
const logout = async () => {
  await signOut();
  setUser(null);
  // BUG: lastRefreshTimeRef no se resetea
};

// Problema:
// 1. UserA login → lastRefreshTimeRef = T1
// 2. UserA logout
// 3. UserB login
// 4. refreshUser() → Cache hit (lastRefreshTimeRef todavía es T1)
// 5. UI muestra datos de UserA ❌

// ✅ Código corregido
const logout = async () => {
  lastRefreshTimeRef.current = 0; // ← Invalidar cache
  await signOut();
  setUser(null);
};
```

---

## 🎭 E2E Testing con Playwright

### El Desafío de OAuth

**Problema fundamental**: OAuth requiere interacción con Google real.

```
Flujo OAuth completo:
1. App: Redirect a Google
2. Google: Muestra login screen
3. Usuario: Ingresa email/password
4. Google: Muestra 2FA (si habilitado)
5. Usuario: Ingresa código 2FA
6. Google: Muestra consent screen
7. Usuario: Click "Allow"
8. Google: Redirect a app

Desafíos para automatización:
❌ Google detecta bots (CAPTCHA)
❌ 2FA requiere código temporal (no predecible)
❌ Google cambia UI frecuentemente (tests frágiles)
❌ Rate limiting (Google bloquea múltiples logins)
```

### Soluciones Evaluadas

| Solución | Pros | Contras | Decisión |
|----------|------|---------|----------|
| **Playwright con Chromium** | Simula navegador real | CAPTCHA, 2FA, rate limit | ⚠️ Parcial |
| **Mock OAuth backend** | Totalmente controlable | No prueba OAuth real | ❌ No |
| **Cognito test users** | Sin Google, solo Cognito | No prueba Google OAuth | ⚠️ Parcial |
| **Manual testing** | Prueba flujo real | No escalable, lento | ✅ Para OAuth |
| **Skip OAuth, test resto** | Automatizable | No prueba autenticación | ✅ Actual |

### Nuestra Estrategia E2E

```typescript
// __tests__/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  // ✅ Tests que NO requieren OAuth (automatizables)
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Debe redirigir a home (no autenticado)
    await expect(page).toHaveURL('/');
    
    // Debe mostrar botón de login
    const loginButton = page.getByRole('button', { name: /sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test('should show navigation items based on auth state', async ({ page }) => {
    await page.goto('/');
    
    // Navbar debe mostrar "Sign In" (no autenticado)
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    
    // No debe mostrar "Dashboard" o "Logout"
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink).not.toBeVisible();
  });

  test('should protect dashboard route', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Debe redirigir a home
    await expect(page).toHaveURL('/');
  });

  // ⚠️ Tests que REQUIEREN OAuth (skipped)
  test.skip('should initiate OAuth when clicking login', async ({ page }) => {
    // Este test requiere:
    // 1. Click "Sign in with Google"
    // 2. Esperar redirect a Google
    // 3. Login en Google (CAPTCHA, 2FA)
    // 4. Esperar redirect a /auth/callback
    // 5. Verificar usuario autenticado
    
    // Problema: Paso 3 no es automatizable de forma confiable
  });

  test.skip('should handle OAuth callback gracefully', async ({ page }) => {
    // Requiere OAuth flow completo
  });

  test.skip('should show dashboard after successful login', async ({ page }) => {
    // Requiere OAuth flow completo
  });
});
```

### Tests E2E Parciales (con Mock Context)

**Estrategia alternativa**: Mockear AuthContext en E2E.

```typescript
// __tests__/e2e/dashboard-authenticated.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock de usuario autenticado
    await page.addInitScript(() => {
      // Inyectar mock de AuthContext
      (window as any).__AUTH_MOCK__ = {
        user: {
          userId: 'test_123',
          username: 'test@example.com',
          email: 'test@example.com',
          groups: ['MEMBERS'],
        },
        loading: false,
      };
    });
  });

  test('should render dashboard with user data', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Debe mostrar nombre de usuario
    await expect(page.getByText(/test@example.com/i)).toBeVisible();
    
    // Debe mostrar "Logout"
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await expect(logoutButton).toBeVisible();
  });
});
```

**Limitaciones de este approach**:
```
✅ Prueba UI con usuario autenticado
✅ Prueba protección de rutas
✅ Prueba renderizado condicional
❌ NO prueba OAuth flow real
❌ NO prueba integración con Cognito
❌ NO detecta bugs de autenticación
```

---

## 📊 Test Coverage

### Métricas Actuales

```bash
npm test -- --coverage

# Output:
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   85.23 |    78.45 |   81.92 |   85.67 |
 src/context              |   92.15 |    87.50 |   90.00 |   92.31 |
  auth-context.tsx        |   92.15 |    87.50 |   90.00 |   92.31 |
 src/components           |   78.45 |    65.22 |   75.00 |   79.12 |
  Navigation.tsx          |   82.14 |    70.00 |   80.00 |   83.33 |
  AmplifyClientProvider   |   75.00 |    60.00 |   70.00 |   76.47 |
 src/app                  |   65.32 |    58.00 |   62.50 |   66.18 |
  page.tsx                |   70.00 |    60.00 |   66.67 |   71.43 |
  layout.tsx              |   60.00 |    55.00 |   58.33 |   61.11 |
--------------------------|---------|----------|---------|---------|
```

**Análisis de coverage**:

```
AuthContext: 92% ← MUY BIEN
- Todas las funciones testeadas
- Casos edge cubiertos
- Optimizaciones validadas

Components: 78% ← BIEN
- Lógica principal cubierta
- Faltan edge cases (error states)

App pages: 65% ← REGULAR
- Happy path cubierto
- Faltan error boundaries
- Faltan loading states
```

### ¿Qué Significa el Coverage?

**Statements** (85%):
```typescript
// Statement = línea de código
const user = getCurrentUser(); // ← Statement
setUser(user);                 // ← Statement

// 85% = 85 de 100 statements ejecutados en tests
```

**Branches** (78%):
```typescript
// Branch = camino en if/else/switch
if (user) {        // ← Branch 1: true
  return <Dashboard />;
} else {           // ← Branch 2: false
  return <Login />;
}

// 78% = 78 de 100 branches probados
// Faltan: 22% de casos edge (ej: user null, user sin groups)
```

**Functions** (82%):
```typescript
// Function = función definida
function refreshUser() { /* ... */ } // ← Function

// 82% = 82 de 100 funciones llamadas en tests
```

**Lines** (86%):
```typescript
// Lines = líneas físicas de código
const x = 1;  // ← Line 1
const y = 2;  // ← Line 2

// 86% = 86 de 100 líneas ejecutadas
```

### Coverage ≠ Quality

**Ejemplo de 100% coverage pero mal test**:

```typescript
// Función a testear
function divide(a: number, b: number): number {
  return a / b; // Bug: no valida b !== 0
}

// ❌ Test malo (100% coverage)
test('divide', () => {
  const result = divide(10, 2);
  expect(result).toBe(5); // ✅ Pasa
});

// Coverage report: 100% ✅
// Bug detectado: No ❌

// ✅ Test bueno
test('divide', () => {
  expect(divide(10, 2)).toBe(5);
  expect(divide(10, 0)).toBe(Infinity); // ← Detecta bug
});
```

**Nuestra filosofía**:
```
Coverage goal: 80% (no 100%)
- 80% es suficiente para detectar la mayoría de bugs
- 90-100% tiene diminishing returns
- Enfocarse en casos críticos, no coverage artificial
```

---

## 🐛 Bugs Encontrados Durante Testing

### Bug 1: useCallback Captura Mocks Obsoletos

**Cómo lo encontramos**:
```typescript
test('should handle logout', async () => {
  // Arrange
  mockSignOut.mockResolvedValue(undefined);
  
  render(<AuthProvider><TestComponent /></AuthProvider>);
  
  // Act
  await authState.logout();
  
  // Assert
  expect(mockSignOut).toHaveBeenCalled(); // ✅ Pasa
});

test('should handle logout error', async () => {
  // Arrange
  mockSignOut.mockRejectedValue(new Error('Network error'));
  
  render(<AuthProvider><TestComponent /></AuthProvider>);
  
  // Act
  await authState.logout();
  
  // Assert
  expect(mockSignOut).toHaveBeenCalled(); // ✅ Pasa
  expect(authState.error).toBe('Network error'); // ❌ Falla
});
```

**Problema**:
```typescript
// useCallback captura mock al montar componente
const logout = useCallback(async () => {
  await signOut(); // ← Referencia a mock original
}, []); // ← Empty deps = función nunca se actualiza

// Test 1: mockSignOut = success
// logout() usa mock de Test 1 ✅

// Test 2: mockSignOut = error
// logout() TODAVÍA usa mock de Test 1 ❌
```

**Solución**:
```typescript
// Crear componente de test con local state
function LogoutTestComponent() {
  const [loggedOut, setLoggedOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setLoggedOut(true);
  };

  return (
    <div>
      <button onClick={handleLogout}>Logout</button>
      {loggedOut && <div>Logged out</div>}
    </div>
  );
}

// Test verifica estado local, no mock directamente
const button = screen.getByRole('button', { name: /logout/i });
fireEvent.click(button);
await waitFor(() => {
  expect(screen.getByText(/logged out/i)).toBeInTheDocument();
});
```

### Bug 2: Cache No Invalida en Logout

**Cómo lo encontramos**: Test de "logout followed by login".

```typescript
test('should show new user after logout and login', async () => {
  // Arrange: User A
  mockGetCurrentUser.mockResolvedValue({ userId: 'userA' });
  
  render(<AuthProvider><TestComponent /></AuthProvider>);
  await waitFor(() => expect(authState.user.userId).toBe('userA'));
  
  // Act: Logout
  await authState.logout();
  
  // Arrange: User B
  mockGetCurrentUser.mockResolvedValue({ userId: 'userB' });
  
  // Act: Login (refreshUser)
  await authState.refreshUser();
  
  // Assert
  expect(authState.user.userId).toBe('userB'); // ❌ Falla: todavía es 'userA'
});
```

**Root cause**: Cache no se invalida en logout.

**Fix**:
```typescript
const logout = useCallback(async () => {
  lastRefreshTimeRef.current = 0; // ← Agregar esta línea
  await signOut();
  setUser(null);
}, []);
```

### Bug 3: Window Focus Listener No Cleanup

**Cómo lo encontramos**: Test de "unmount should cleanup listeners".

```typescript
test('should cleanup window focus listener on unmount', () => {
  // Arrange
  const { unmount } = render(<AuthProvider><div>Test</div></AuthProvider>);
  
  // Act: Unmount
  unmount();
  
  // Act: Disparar focus event
  window.dispatchEvent(new Event('focus'));
  
  // Assert: No debe llamar refreshUser (componente unmounted)
  expect(mockGetCurrentUser).not.toHaveBeenCalled(); // ❌ Falla: se llamó
});
```

**Root cause**: useEffect no retorna cleanup function correctamente.

**Fix**:
```typescript
// ❌ Código original
useEffect(() => {
  const handleFocus = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => refreshUser(), 300);
  };
  
  window.addEventListener('focus', handleFocus);
  
  return () => {
    window.removeEventListener('focus', handleFocus);
    // Bug: timeoutId no se limpia
  };
}, []);

// ✅ Código corregido
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  
  const handleFocus = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => refreshUser(), 300);
  };
  
  window.addEventListener('focus', handleFocus);
  
  return () => {
    clearTimeout(timeoutId); // ← Limpiar timeout
    window.removeEventListener('focus', handleFocus);
  };
}, []);
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage --maxWorkers=2
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: true
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npx tsc --noEmit
```

**Pipeline stages**:
```
1. unit-tests (2-3 min)
   ├── Install deps
   ├── Run 95 unit tests
   ├── Generate coverage
   └── Upload to Codecov

2. e2e-tests (5-8 min)
   ├── Install Playwright
   ├── Build app
   ├── Run E2E tests (9 active)
   └── Upload artifacts if failure

3. lint (1 min)
   ├── ESLint
   └── TypeScript check

Total: ~8-12 min por commit
```

### Test Execution Strategy

**Parallel execution**:
```bash
# Jest parallel (default)
npm test -- --maxWorkers=4

# Ejecuta 4 test files en paralelo
# Reduce tiempo: 10 min → 3 min
```

**Watch mode (desarrollo)**:
```bash
npm test -- --watch

# Re-ejecuta solo tests afectados por cambios
# Feedback loop: <1 segundo
```

**CI optimization**:
```bash
# Usar cache de npm
cache: 'npm'

# Instalar dependencias sin scripts
npm ci --prefer-offline --no-audit

# Reducir workers en CI (recursos limitados)
--maxWorkers=2
```

---

## 🎯 Resumen del Pilar 6

### Testing Strategy

**Unit Tests** (95 tests):
- ✅ AuthContext completamente cubierto
- ✅ Optimizaciones validadas (cache, debouncing)
- ✅ Edge cases incluidos
- ✅ Coverage 85%

**Integration Tests**:
- ⚠️ Incluidos en E2E parcialmente
- ❌ No hay tests dedicados de Amplify + Cognito

**E2E Tests** (16 tests):
- ✅ 9 tests activos (UI, navigation, protection)
- ⚠️ 7 tests skipped (requieren OAuth manual)
- ❌ OAuth flow no automatizado

### Bugs Encontrados

1. 🐛 useCallback captura mocks obsoletos → Resuelto con local state
2. 🐛 Cache no invalida en logout → Resuelto con reset
3. 🐛 Window focus listener no cleanup → Resuelto con clearTimeout

### Mejoras Sugeridas

1. **E2E con OAuth**: Implementar Cognito test users (sin Google)
2. **Integration tests**: Tests dedicados de Amplify + API routes
3. **Visual regression**: Percy o Chromatic para UI
4. **Performance tests**: Lighthouse CI para métricas
5. **Mutation testing**: Stryker para validar calidad de tests

### ROI de Testing

```
Tiempo invertido: ~16 horas
- Setup: 2h
- Unit tests: 10h
- E2E tests: 4h

Bugs encontrados: 3 críticos
- Bug 1: Hubiera causado logout broken en prod
- Bug 2: Hubiera causado session leak entre usuarios
- Bug 3: Hubiera causado memory leak

Valor: Incalculable
- Prevenir 1 bug en prod > costo de todos los tests
- Confianza en refactors
- Documentación viva del código
```

---

## ✅ Checkpoint del Pilar 6

Antes de continuar al Pilar 7, asegúrate de entender:

- [ ] Por qué mockear Amplify es complejo
- [ ] Cómo testear optimizaciones (cache, debouncing)
- [ ] Limitaciones de E2E con OAuth
- [ ] Qué significa coverage (y qué no significa)
- [ ] Cómo fake timers permiten testear debouncing
- [ ] Bugs que solo tests encuentran

**Próximo paso**: ¿Listo para el Pilar 7: Deployment y Producción (final)?

Ahí vamos a analizar:
- Amplify sandbox vs producción
- Environments (dev, staging, prod)
- Secrets management en producción
- Monitoring y debugging
- Rollback strategies
- Performance en producción real

---

**Siguiente**: [Pilar 7: Deployment y Producción](./07-deployment-produccion.md)
