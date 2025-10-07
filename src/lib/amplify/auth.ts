// src\lib\amplify\auth.ts

/**
 * Verificación de tokens para autenticación con Amplify
 * Implementación optimizada para Next.js que soporta tanto el cliente como el servidor
 */
import { fetchAuthSession, signOut, signInWithRedirect, getCurrentUser as amplifyGetCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import type { AuthUser } from 'aws-amplify/auth';

/**
 * Verifica si hay tokens de autenticación válidos
 * @returns Objeto con el resultado de la verificación
 */
export async function verifyTokens(): Promise<{
  isValid: boolean;
  tokens?: any;
  error?: Error;
}> {
  try {
    // Try to get auth session from cache
    const authSession = await fetchAuthSession();
    
    // Check if tokens exist
    if (authSession.tokens?.idToken && authSession.tokens?.accessToken) {
      // Extract token info to verify expiration
      try {
        const accessToken = authSession.tokens.accessToken;
        const exp = accessToken.payload.exp;
        
        if (!exp) {
          return { isValid: false, error: new Error('Token is missing expiration time') };
        }
        
        const expirationTime = exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const expiresInMs = expirationTime - now;
        
        // If token is expired or will expire in less than 5 minutes, try to refresh
        if (expiresInMs < 300000) { // 5 minutes in milliseconds
          try {
            // Force refresh tokens
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
      } catch (tokenInfoError) {
        // Error getting token info, continue with the existing tokens
      }
      
      // If we got here, tokens are valid
      return {
        isValid: true,
        tokens: authSession.tokens
      };
    }
    
    // No tokens found
    return { isValid: false };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error : new Error('Token verification failed')
    };
  }
}

/**
 * Procesa un error de JWT y determina si es necesario cerrar sesión
 * @param error Error a procesar
 * @returns true si el usuario fue desconectado
 */
export async function handleAuthError(error: any): Promise<boolean> {
  if (!error) return false;
  
  // Convert to string to check for common auth errors
  const errorString = String(error);
  
  // Check for specific JWT errors that indicate invalid auth state
  const authErrors = [
    'jwt expired',
    'invalid token',
    'No current user',
    'The user is not authenticated',
    'jwt malformed',
    'invalid signature',
    'No cached claims'
  ];
  
  const isAuthError = authErrors.some(errMsg => 
    errorString.toLowerCase().includes(errMsg.toLowerCase())
  );
  
  if (isAuthError) {
    try {
      await signOut();
      return true;
    } catch (signOutError) {
      console.error('Error signing out after auth error:', signOutError);
      return false;
    }
  }
  
  return false;
}

// Export signOut directly from aws-amplify/auth
export { signOut };

/**
 * Gets the current authenticated user
 * @returns User object if authenticated
 */
export async function getCurrentUser() {
  try {
    return await amplifyGetCurrentUser();
  } catch (error) {
    return null;
  }
}

/**
 * Signs in using the Cognito Hosted UI
 * @param options Options for sign in
 * @returns Promise that resolves when sign in completes
 */
export async function signInWithHostedUI(options?: { redirectUri?: string }) {
  // Convert old-style redirectUri to customState which is used in the new API
  const signInOptions = options?.redirectUri 
    ? { customState: options.redirectUri }
    : {};
  
  return signInWithRedirect(signInOptions);
}

/**
 * Creates an auth event listener
 * @param callback Function to call when auth events occur
 * @returns Unsubscribe function
 */
export function createAuthListener(callback: (event: string, data: any) => void) {
  return Hub.listen('auth', (data) => {
    const { payload } = data;
    callback(payload.event, payload);
  });
}

// Helper functions for auth context
async function checkIsUserAdmin(user: AuthUser): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];
    return Array.isArray(groups) && groups.includes('ADMINS');
  } catch (error) {
    return false;
  }
}

async function getUserAttributes(user: AuthUser): Promise<Record<string, any> | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.payload || null;
  } catch (error) {
    return null;
  }
}

// Export utility functions for auth context
export { checkIsUserAdmin, getUserAttributes };
