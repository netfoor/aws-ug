'use client';

import { useOnboardingRedirect } from '@/hooks/useOnboardingRedirect';

/**
 * 🛡️ OnboardingGuard Component
 * 
 * Wrapper invisible que redirige a /onboarding si el usuario no ha completado su perfil.
 * Se agrega al layout principal para proteger toda la aplicación.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  useOnboardingRedirect();
  return <>{children}</>;
}
