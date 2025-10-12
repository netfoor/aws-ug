import { NextRequest, NextResponse } from 'next/server';

// Rutas protegidas que requieren autenticación
const PROTECTED_ROUTES = ['/profile', '/dashboard', '/admin'];

// Rutas que requieren permisos de administrador
const ADMIN_ROUTES = ['/admin'];

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/access-denied'];

/**
 * Verifica si una ruta comienza con alguno de los prefijos dados
 */
function isProtectedByPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
}

/**
 * Middleware de Next.js para autenticación
 * Usa API route para verificación server-side segura
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir rutas públicas y archivos estáticos
  if (PUBLIC_ROUTES.includes(pathname) || 
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Verificar autenticación para rutas protegidas
  if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
    try {
      // Llamar al API route para verificar sesión de forma segura
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

      // 3. Verificar permisos de admin si es necesario
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

/**
 * Configuración para las rutas que deben pasar por el middleware
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
