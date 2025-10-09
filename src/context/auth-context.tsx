// src\context\auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthUser } from 'aws-amplify/auth';
import { 
  getCurrentUser, 
  signOut,
  signInWithHostedUI,
  createAuthListener,
  checkIsUserAdmin,
  getUserAttributes
} from '@/lib/amplify/auth';

/**
 * Interfaces para el contexto de autenticación
 */
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
    userAttributes: Record<string, unknown> | null;
  error: Error | null;
  login: (redirectUri?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Props para el proveedor de autenticación
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

// Crear contexto sin valores predeterminados para detectar uso fuera del Provider
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Proveedor para el contexto de autenticación
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAttributes, setUserAttributes] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  /**
   * Función para obtener el usuario y actualizar el estado
   */  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      
      if (user) {
        // Extract user info
        const isAdmin = await checkIsUserAdmin(user);
        const attributes = await getUserAttributes(user);
        
        setUser(user);
        setIsAuthenticated(true);
        setIsAdmin(isAdmin);
        setUserAttributes(attributes);
        setError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserAttributes(null);
      }
    } catch (err) {
      // Log completo del error para debugging
      console.error('Error al refrescar el usuario:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
      // No cambiar el estado si ya estaba autenticado (podría ser un error temporal)
      if (!isAuthenticated) {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserAttributes(null);
        
        // Only set error for actual errors, not authentication failures
        const errorMessage = (err as Error).message;
        if (!errorMessage.includes('not authenticated') && 
            !errorMessage.includes('No credentials') &&
            !errorMessage.includes('User is not authenticated')) {
          setError(err as Error);
        } else {
          setError(null); // Clear error for normal unauthenticated state
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Efecto para cargar el usuario al inicio
   */  useEffect(() => {
    // Intentar cargar usuario inmediatamente al montar
    refreshUser();

    // También verificar al obtener el foco de la ventana (al volver a la pestaña)
    const handleFocus = () => {
      refreshUser();
    };

    window.addEventListener('focus', handleFocus);

    // Limpiar al desmontar
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  /**
   * Configurar listeners para eventos de autenticación
   */
  useEffect(() => {
    const unsubscribe = createAuthListener((event, payload) => {
      switch (event) {
        case 'signedIn':
          // Usuario inició sesión
          refreshUser();
          break;
        case 'signedOut':
          // Usuario cerró sesión
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserAttributes(null);
          break;
        case 'tokenRefresh':
          // Token refrescado, actualizar el usuario
          refreshUser();
          break;
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);  /**
   * Función para iniciar sesión
   */  
  const login = async (redirectUri?: string) => {
    try {
      // Verificar si ya está autenticado
      try {
        const authResult = await getCurrentUser();
        if (authResult) {
          return; // Ya está autenticado, no necesita login
        }
      } catch (authCheckError) {
        // Si getCurrentUser falla, significa que NO está autenticado
        // Continuar con el proceso de login
      }
      
      // Proceder con el login
      await signInWithHostedUI({ 
        redirectUri: redirectUri || window.location.origin
      });
    } catch (err) {
      // Solo establecer error si no es UserAlreadyAuthenticatedException
      if (err instanceof Error && 
          err.name !== 'UserAlreadyAuthenticatedException' && 
          !err.message?.includes('already authenticated')) {
        setError(err as Error);
        // Log completo del error
        console.error('Error al iniciar sesión:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          error: err,
        });
      }
      throw err; // Re-lanzar para que LoginButton pueda manejarlo
    }
  };

  /**
   * Función para cerrar sesión
   */
  const logout = async () => {
    try {
      await signOut();
      
      // Clear authentication state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserAttributes(null);
      setError(null);
    } catch (err) {
      setError(err as Error);
      // Log completo del error
      console.error('Error al cerrar sesión:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
    }
  };

  /**
   * Valores del contexto
   */
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    userAttributes,
    error,
    login,
    logout,
    refreshUser
  }), [user, isAuthenticated, isLoading, isAdmin, userAttributes, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
