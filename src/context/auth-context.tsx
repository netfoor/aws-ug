// src\context\auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AuthUser } from 'aws-amplify/auth';
import { 
  getCurrentUser, 
  signOut,
  signInWithHostedUI,
  createAuthListener,
  checkIsUserAdmin,
  getUserAttributes,
  getUserRoleFromCognito
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
 * Optimizado con debouncing y caching
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAttributes, setUserAttributes] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Cache y deduplicación
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  
  // Constantes de optimización - INCREASED cache duration to reduce re-renders
  const CACHE_DURATION = 30000; // 30 segundos de cache (era 5 segundos)
  const DEBOUNCE_DELAY = 1000; // 1 segundo de debounce (era 300ms)
  
  /**
   * Función para obtener el usuario y actualizar el estado
   * Optimizada con caching y deduplicación de requests
   */
  const refreshUser = useCallback(async () => {
    // Si ya hay un refresh en progreso, retornar esa promesa
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Si el cache es reciente (< 5 segundos), no refrescar
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < CACHE_DURATION && isAuthenticated) {
      return;
    }

    const promise = (async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        
        if (user) {
          // Extract user info with enhanced role management
          const isAdmin = await checkIsUserAdmin(user);
          const attributes = await getUserAttributes(user);
          const role = await getUserRoleFromCognito(user);
          
          // Enhanced logging for role management debugging
          console.log('🔐 Role Management Debug:', {
            userId: user.userId,
            isAdmin,
            roleFromCognito: role,
            customRoleAttribute: attributes?.['custom:role'],
            cognitoGroups: 'Check JWT token for cognito:groups'
          });
          
          // Override custom:role con el rol de Cognito groups (fuente de verdad)
          const updatedAttributes = attributes ? { ...attributes, 'custom:role': role } : null;
          
          // Validate role hierarchy consistency
          if (role === 'ADMIN' && !isAdmin) {
            console.warn('⚠️ Role inconsistency detected: role=ADMIN but isAdmin=false');
          }
          if (isAdmin && role !== 'ADMIN') {
            console.warn('⚠️ Role inconsistency detected: isAdmin=true but role!=ADMIN');
          }
          
          setUser(user);
          setIsAuthenticated(true);
          setIsAdmin(isAdmin);
          setUserAttributes(updatedAttributes);
          setError(null);
          lastRefreshTimeRef.current = Date.now();
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserAttributes(null);
          lastRefreshTimeRef.current = Date.now();
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
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [isAuthenticated]);

  /**
   * Efecto para cargar el usuario al inicio
   */  
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Efecto para manejar el foco de la ventana con debouncing
   */
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const debouncedRefreshUser = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshUser();
      }, DEBOUNCE_DELAY);
    };

    const handleFocus = () => {
      debouncedRefreshUser();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(debounceTimer);
    };
  }, [refreshUser]);

  /**
   * Configurar listeners para eventos de autenticación
   */
  useEffect(() => {
    const unsubscribe = createAuthListener((event) => {
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
          lastRefreshTimeRef.current = 0;
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
  }, [refreshUser]);

  /**
   * Función para iniciar sesión
   */  
  const login = useCallback(async (redirectUri?: string) => {
    try {
      // Verificar si ya está autenticado
      try {
        const authResult = await getCurrentUser();
        if (authResult) {
          return; // Ya está autenticado, no necesita login
        }
      } catch {
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
  }, []);

  /**
   * Función para cerrar sesión
   */
  const logout = useCallback(async () => {
    try {
      await signOut();
      
      // Clear authentication state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserAttributes(null);
      setError(null);
      
      // Limpiar cache y promesas pendientes
      lastRefreshTimeRef.current = 0;
      refreshPromiseRef.current = null;
    } catch (err) {
      setError(err as Error);
      // Log completo del error
      console.error('Error al cerrar sesión:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
    }
  }, []);

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
    refreshUser,
  }), [user, isAuthenticated, isLoading, isAdmin, userAttributes, error, login, logout, refreshUser]);

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
