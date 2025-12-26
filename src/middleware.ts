import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/dashboard', '/admin'];
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/access-denied', '/onboarding'];

// User Pool ID from amplify_outputs.json
const USER_POOL_ID = 'us-east-1_3pvovR78j';

function isProtectedByPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
}

/**
 * Verifica si existe una cookie de sesión de Cognito/Amplify
 * Solo verifica existencia y formato básico, NO valida JWT
 * La validación real se hace en Server Components
 */
function hasAuthCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }

  // Amplify Gen 2 con Next.js adapter puede usar diferentes formatos de cookies
  // Buscamos cookies que parezcan ser de autenticación:
  // 1. Cookies que contengan el User Pool ID
  // 2. Cookies que empiecen con patrones comunes de Cognito
  // 3. Cookies que contengan tokens JWT (tienen formato base64 con puntos)
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (!name || !value) continue;
    
    // Verificar si contiene User Pool ID
    if (name.includes(USER_POOL_ID) || value.includes(USER_POOL_ID)) {
      return true;
    }
    
    // Verificar patrones comunes de Cognito/Amplify
    if (
      name.includes('CognitoIdentityServiceProvider') ||
      name.includes('amplify') ||
      name.includes('auth') ||
      name.includes('token')
    ) {
      // Verificar que el valor tenga formato de token (base64 con puntos para JWT)
      if (value.length > 20 && (value.includes('.') || /^[A-Za-z0-9_-]+$/.test(value))) {
        return true;
      }
    }
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir rutas públicas, auth y API
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // 2. Proteger rutas privadas - Solo verificación ligera de cookie
  if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
    const cookieHeader = request.headers.get('cookie');
    const hasCookie = hasAuthCookie(cookieHeader);

    if (!hasCookie) {
      // No hay cookie de autenticación, redirigir a login
      return redirectToLogin(request, pathname);
    }

    // Hay cookie, permitir pasar a Server Components para validación real
    // La validación de JWT y grupos se hace en Server Components/API Routes
    return NextResponse.next();
  }

  return NextResponse.next();
}

function redirectToLogin(
  request: NextRequest,
  pathname: string,
  error?: string
) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnUrl', pathname);

  if (error) {
    loginUrl.searchParams.set('error', error);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
