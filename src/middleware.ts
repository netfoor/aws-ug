import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/dashboard', '/admin'];
const ADMIN_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/access-denied', '/onboarding'];

function isProtectedByPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
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

  // 2. Proteger rutas privadas
  if (isProtectedByPrefix(pathname, PROTECTED_ROUTES)) {
    try {
      const sessionUrl = new URL('/api/auth/session', request.url);

      const sessionResponse = await fetch(sessionUrl, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (!sessionResponse.ok) {
        return redirectToLogin(request, pathname);
      }

      const { isAuthenticated, groups } = await sessionResponse.json();

      if (!isAuthenticated) {
        return redirectToLogin(request, pathname);
      }

      // 3. Validar permisos de admin
      if (isProtectedByPrefix(pathname, ADMIN_ROUTES)) {
        const isAdmin = Array.isArray(groups) && groups.includes('ADMINS');

        if (!isAdmin) {
          return NextResponse.redirect(
            new URL('/access-denied', request.url)
          );
        }
      }

      return NextResponse.next();
    } catch {
      return redirectToLogin(request, pathname, 'session_error');
    }
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
