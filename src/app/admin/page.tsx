'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * /admin redirect page
 * Redirects to the new dashboard page
 */
export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [isAdmin, isLoading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirigiendo...</p>
      </div>
    </div>
  );
}