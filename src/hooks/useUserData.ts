'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

type User = Schema['User']['type'];

/**
 * 🎯 Hook: useUserData
 * 
 * Hook centralizado que SIEMPRE lee datos del usuario desde la tabla User.
 * Esta es la ÚNICA fuente de verdad para datos de usuario.
 * 
 * ❌ NO usar userAttributes de Cognito directamente
 * ✅ USAR este hook en su lugar
 * 
 * Retorna:
 * - userData: Datos completos del usuario desde DynamoDB
 * - isLoading: Estado de carga
 * - error: Error si ocurre
 * - refetch: Función para recargar datos
 * 
 * Uso:
 * ```tsx
 * const { userData, isLoading } = useUserData();
 * 
 * if (isLoading) return <Loading />;
 * 
 * return <div>{userData?.givenName} {userData?.familyName}</div>
 * ```
 */
export function useUserData() {
  const { user, isAuthenticated } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    if (!user?.userId) {
      setUserData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, errors } = await client.models.User.get({ id: user.userId });

      if (errors && errors.length > 0) {
        console.error('Error cargando datos de usuario:', errors);
        setError('No se pudieron cargar los datos del usuario');
        return;
      }

      if (!data) {
        console.warn('Usuario no encontrado en tabla User:', user.userId);
        setError('Usuario no encontrado');
        return;
      }

      setUserData(data);
      console.log('✅ Datos de usuario cargados desde User table:', data);

    } catch (err) {
      console.error('Error en useUserData:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      setUserData(null);
      setIsLoading(false);
    }
  }, [user?.userId, isAuthenticated]);

  return {
    userData,
    isLoading,
    error,
    refetch: loadUserData,
  };
}

/**
 * 🎨 Helper: Obtener nombre completo del usuario
 */
export function getFullName(userData: User | null): string {
  if (!userData) return 'Usuario';
  
  const { givenName, familyName } = userData;
  
  if (givenName && familyName) {
    return `${givenName} ${familyName}`.trim();
  }
  
  if (givenName) return givenName;
  if (familyName) return familyName;
  
  return 'Usuario';
}

/**
 * 🎨 Helper: Obtener iniciales del usuario
 */
export function getUserInitials(userData: User | null): string {
  if (!userData) return 'U';
  
  const { givenName, familyName } = userData;
  
  const firstInitial = givenName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = familyName?.charAt(0)?.toUpperCase() || '';
  
  return (firstInitial + lastInitial) || 'U';
}
