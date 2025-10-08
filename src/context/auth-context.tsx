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
  userAttributes: Record<string, any> | null;
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

// Crear contexto con valores predeterminados
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  userAttributes: null,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

/**
 * Proveedor para el contexto de autenticación
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAttributes, setUserAttributes] = useState<Record<string, any> | null>(null);
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
      console.error('Error al refrescar el usuario');
      // No cambiar el estado si ya estaba autenticado (podría ser un error temporal)
      if (!isAuthenticated) {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserAttributes(null);
        setError(err as Error);
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
   */  const login = async (redirectUri?: string) => {
    try {
      // Si ya está autenticado, no es necesario iniciar sesión de nuevo
      const authResult = await getCurrentUser();
      if (authResult) {
        return; // La función LoginButton manejará la redirección
      }
      
      await signInWithHostedUI({ 
        redirectUri: redirectUri || window.location.origin
      });
    } catch (err) {
      // Solo establecer error si no es UserAlreadyAuthenticatedException
      if (err instanceof Error && 
          err.name !== 'UserAlreadyAuthenticatedException' && 
          !err.message?.includes('already authenticated')) {
        setError(err as Error);
        console.error('Error al iniciar sesión');
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
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserAttributes(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error al cerrar sesión:', err);
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
