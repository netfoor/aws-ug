// src/lib/auth/server-auth.ts

/**
 * Server-side authentication utilities for Next.js App Router
 * 
 * These helpers validate JWT tokens and user groups in Server Components
 * and API Routes using the proper Next.js context.
 * 
 * IMPORTANT: These functions MUST be called from Server Components or API Routes,
 * NOT from Edge Runtime (middleware) or Client Components.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';

export interface AuthSession {
  isAuthenticated: boolean;
  userId?: string;
  groups: string[];
  email?: string;
  expiresAt?: number;
}

export interface AuthCheckResult {
  session: AuthSession;
  redirect?: never;
}

/**
 * Obtiene la sesión de autenticación del usuario actual
 * Retorna información sobre autenticación y grupos
 * 
 * @returns Información de sesión o null si no está autenticado
 */
export async function getServerSession(): Promise<AuthSession | null> {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        try {
          const authSession = await fetchAuthSession(contextSpec);

          if (!authSession.tokens?.accessToken) {
            return null;
          }

          const accessToken = authSession.tokens.accessToken;
          const idToken = authSession.tokens.idToken;

          // Extraer grupos del access token
          const groups = (accessToken.payload['cognito:groups'] as string[]) || [];

          // Extraer información del usuario del id token
          const userId = idToken?.payload.sub as string | undefined;
          const email = idToken?.payload.email as string | undefined;

          // Extraer expiración
          const expiresAt = accessToken.payload.exp as number | undefined;

          return {
            isAuthenticated: true,
            userId,
            groups,
            email,
            expiresAt,
          };
        } catch (error) {
          console.error('Error fetching auth session:', error);
          return null;
        }
      },
    });

    return session;
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}

/**
 * Verifica si el usuario está autenticado
 * 
 * @returns true si está autenticado, false en caso contrario
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return session?.isAuthenticated ?? false;
}

/**
 * Verifica si el usuario pertenece a un grupo específico
 * 
 * @param groupName - Nombre del grupo a verificar (ej: 'ADMINS', 'SPEAKERS')
 * @returns true si el usuario pertenece al grupo
 */
export async function hasGroup(groupName: string): Promise<boolean> {
  const session = await getServerSession();
  if (!session?.isAuthenticated) {
    return false;
  }
  return session.groups.includes(groupName);
}

/**
 * Verifica si el usuario es administrador
 * 
 * @returns true si el usuario pertenece al grupo ADMINS
 */
export async function isAdmin(): Promise<boolean> {
  return hasGroup('ADMINS');
}

/**
 * Requiere autenticación - redirige a login si no está autenticado
 * 
 * @param returnUrl - URL a la que redirigir después del login (opcional)
 * @returns Información de sesión si está autenticado
 * @throws Redirige a /login si no está autenticado
 */
export async function requireAuth(returnUrl?: string): Promise<AuthSession> {
  const session = await getServerSession();

  if (!session || !session.isAuthenticated) {
    const loginUrl = `/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;
    redirect(loginUrl);
  }

  return session;
}

/**
 * Requiere que el usuario pertenezca a un grupo específico
 * Redirige a /access-denied si no tiene el grupo requerido
 * 
 * @param groupName - Nombre del grupo requerido
 * @param returnUrl - URL a la que redirigir después del login si no está autenticado
 * @returns Información de sesión si tiene el grupo requerido
 * @throws Redirige a /login si no está autenticado, o /access-denied si no tiene el grupo
 */
export async function requireGroup(
  groupName: string,
  returnUrl?: string
): Promise<AuthSession> {
  const session = await requireAuth(returnUrl);

  if (!session.groups.includes(groupName)) {
    redirect('/access-denied');
  }

  return session;
}

/**
 * Requiere permisos de administrador
 * Redirige a /access-denied si no es admin
 * 
 * @param returnUrl - URL a la que redirigir después del login si no está autenticado
 * @returns Información de sesión si es admin
 * @throws Redirige a /login si no está autenticado, o /access-denied si no es admin
 */
export async function requireAdmin(returnUrl?: string): Promise<AuthSession> {
  return requireGroup('ADMINS', returnUrl);
}

/**
 * Obtiene la sesión de autenticación sin redirigir
 * Útil para componentes que necesitan mostrar contenido diferente según autenticación
 * 
 * @returns Información de sesión o null si no está autenticado
 */
export async function getSessionOrNull(): Promise<AuthSession | null> {
  return getServerSession();
}

