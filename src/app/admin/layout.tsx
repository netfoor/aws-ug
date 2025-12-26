// src/app/admin/layout.tsx

/**
 * Layout para rutas de administración
 * Valida autenticación y permisos de admin en el servidor antes de renderizar
 */

import { requireAdmin } from '@/lib/auth/server-auth';

// Forzar renderizado dinámico porque usamos cookies para autenticación
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validar autenticación y permisos de admin
  // Redirige a /login si no está autenticado
  // Redirige a /access-denied si no es admin
  await requireAdmin('/admin');

  return <>{children}</>;
}

