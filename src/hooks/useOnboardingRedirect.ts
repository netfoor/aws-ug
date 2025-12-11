'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * 🎯 Hook: useOnboardingRedirect
 * 
 * Redirige automáticamente a /onboarding si:
 * 1. El usuario está autenticado
 * 2. profileCompleted === false
 * 3. No está ya en la página de onboarding
 * 
 * Uso: Agregar en el layout principal o páginas protegidas
 */
export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // No hacer nada si está cargando o no hay usuario
    if (authLoading || !user) return;

    // No redirigir si ya está en onboarding o en páginas públicas
    const publicPaths = ['/onboarding', '/login', '/auth/callback', '/'];
    if (publicPaths.includes(pathname)) return;

    // Verificar estado de onboarding
    const checkOnboarding = async () => {
      try {
        const { data: userData } = await client.models.User.get({ id: user.userId });
        
        if (userData && !userData.profileCompleted) {
          console.log('🔄 Usuario no ha completado onboarding, redirigiendo...');
          router.push('/onboarding');
        }
      } catch (err) {
        console.error('Error verificando onboarding:', err);
      }
    };

    checkOnboarding();
  }, [user, authLoading, pathname, router]);
}
