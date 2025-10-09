/**
 * CSRF Protection Utilities
 * 
 * Genera y valida tokens CSRF para proteger contra ataques Cross-Site Request Forgery
 * Los tokens se almacenan en cookies httpOnly y se verifican en headers
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Genera un token CSRF aleatorio seguro
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

/**
 * Obtiene el token CSRF de la cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_NAME);
  return token?.value || null;
}

/**
 * Establece el token CSRF en una cookie httpOnly
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 horas
  });
}

/**
 * Verifica que el token CSRF del header coincida con el de la cookie
 */
export async function verifyCSRFToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) {
    return false;
  }

  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    return false;
  }

  // Comparación timing-safe para prevenir timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    // Si las longitudes no coinciden, timingSafeEqual lanza error
    return false;
  }
}

/**
 * Obtiene o genera un token CSRF
 * Si no existe, lo crea y lo guarda en la cookie
 */
export async function ensureCSRFToken(): Promise<string> {
  let token = await getCSRFToken();
  
  if (!token) {
    token = generateCSRFToken();
    await setCSRFToken(token);
  }
  
  return token;
}
