'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

function LoginPageContent() {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || '/';

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(returnUrl);
    }
  }, [isAuthenticated, isLoading, returnUrl, router]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoginLoading(true);
      await login(returnUrl);
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
    } finally {
      setIsLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="text-center">
          <LoadingSpinner size="xl" variant="accent" className="mx-auto mb-4" />
          <p className="text-text-secondary">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <TalaveraPattern variant="background" />
      <div className="absolute top-10 right-10 opacity-10">
        <TalaveraPattern variant="corner" size="lg" animate />
      </div>
      <div className="absolute bottom-10 left-10 opacity-10">
        <TalaveraPattern variant="corner" size="lg" animate />
      </div>

      <Card className="max-w-md w-full relative z-10 animate-fade-in" variant="elevated">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-accent to-accent/70 rounded-2xl flex items-center justify-center mb-6 shadow-talavera-lg">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              Bienvenido
            </h2>
            <p className="text-text-secondary">
              AWS User Group Puebla
            </p>
            {returnUrl !== '/' && (
              <p className="mt-3 text-xs text-text-secondary bg-secondary/50 px-3 py-2 rounded-lg">
                Serás redirigido a: <span className="font-medium">{returnUrl}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-slide-down">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error al iniciar sesión
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {error.message || 'Ocurrió un error inesperado'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoginLoading}
            variant="accent"
            size="lg"
            className="w-full mb-6 shadow-talavera-lg"
          >
            {isLoginLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-text-secondary">Beneficios de unirte</span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-accent mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Acceso a eventos exclusivos de AWS</span>
            </div>
            <div className="flex items-start">
              <svg className="h-5 w-5 text-accent mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Networking con profesionales certificados</span>
            </div>
            <div className="flex items-start">
              <svg className="h-5 w-5 text-accent mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Recursos educativos y materiales de eventos</span>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-text-secondary">
            Al iniciar sesión, aceptas nuestros{' '}
            <a href="#" className="font-medium text-accent hover:text-accent/80 transition-colors">
              términos de servicio
            </a>{' '}
            y{' '}
            <a href="#" className="font-medium text-accent hover:text-accent/80 transition-colors">
              política de privacidad
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
