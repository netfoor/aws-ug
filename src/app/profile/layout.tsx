// src/app/profile/layout.tsx

/**
 * Layout para rutas protegidas de perfil
 * Valida autenticación en el servidor antes de renderizar
 */

import { requireAuth } from '@/lib/auth/server-auth';

// Forzar renderizado dinámico porque usamos cookies para autenticación
export const dynamic = 'force-dynamic';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validar autenticación - redirige a /login si no está autenticado
  await requireAuth('/profile');

  return <>{children}</>;
}

