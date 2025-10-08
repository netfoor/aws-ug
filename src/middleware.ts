import { NextRequest, NextResponse } from 'next/server';
import { verifyTokens } from '@/lib/amplify/auth';
import { verifyTokensInMiddleware, isUserAdmin } from '@/lib/amplify/middleware-auth';

// Rutas que están protegidas y requieren autenticación en el middleware
const PROTECTED_ROUTES = ['/profile', '/dashboard'];

// Rutas que requieren permisos de administrador EN EL MIDDLEWARE
const ADMIN_ROUTES: string[] = [];

// Rutas públicas (no requieren autenticación en middleware)
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/access-denied'];

/**
 * Función para verificar si una ruta comienza con alguno de los prefijos dados
 */
function isProtectedByPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
}

/**
 * Middleware de Next.js enfocado únicamente en autenticación
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PERMITIR RUTAS PÚBLICAS Y AUTH CALLBACK
  if (PUBLIC_ROUTES.includes(pathname) || 
      pathname.startsWith('/auth/') ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }

  // 2. VERIFICAR AUTENTICACIÓN PARA RUTAS PROTEGIDAS
  try {
    if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
      // Use secure middleware-specific authentication verification
      const middlewareAuth = await verifyTokensInMiddleware(request);
      
      if (!middlewareAuth.isValid) {
        // Fall back to standard verification if middleware approach fails
        const standardAuth = await verifyTokens();
        
        if (!standardAuth.isValid) {
          // Construir URL de login con returnUrl
          const returnUrl = encodeURIComponent(pathname);
          const loginUrl = new URL(`/login?returnUrl=${returnUrl}`, request.url);
          
          return NextResponse.redirect(loginUrl);
        }
      }
      
      // Verificar permisos de administrador para rutas de administración
      if (isProtectedByPrefix(pathname, ADMIN_ROUTES)) {
        // Use the groups from our secure middleware auth
        const userGroups = middlewareAuth.isValid ? middlewareAuth.groups || [] : [];
        const hasAdminRole = isUserAdmin(userGroups);
        
        if (!hasAdminRole) {
          // Redirigir a página de acceso denegado
          const accessDeniedUrl = new URL('/access-denied', request.url);
          
          return NextResponse.redirect(accessDeniedUrl);
        }
      }
    }
    
    // Si pasa todas las verificaciones, permitir acceso
    return NextResponse.next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    
    // En caso de error, redirigir al login
    const loginUrl = new URL('/login?error=session_error', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Configuración para las rutas que deben pasar por el middleware
 */
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. Archivos estáticos (_next/static, favicon.ico, etc.)
     * 2. API routes (/api/*)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
