'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    // Usar una flag para prevenir ejecuciones múltiples
    let isMounted = true;
    
    const handleCallback = async () => {
      try {
        // Verificar si hay errores en los parámetros de la URL
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('OAuth Error:', error, errorDescription);
          if (isMounted) {
            setCallbackError(errorDescription || 'Error al autenticar');
            setIsProcessing(false);
          }
          return;
        }

        // Obtener la returnUrl desde sessionStorage (guardada durante el login)
        let returnUrl = '/dashboard'; // Default seguro
        
        try {
          const storedReturnUrl = sessionStorage.getItem('auth_return_url');
          if (storedReturnUrl && storedReturnUrl.startsWith('/')) {
            returnUrl = storedReturnUrl;
            // Limpiar el storage después de usar
            sessionStorage.removeItem('auth_return_url');
          }
        } catch (e) {
          // Si hay error accediendo sessionStorage, usar default
          console.warn('Error accessing sessionStorage:', e);
        }

        // Refrescar la información del usuario para asegurar que el contexto esté actualizado
        await refreshUser();

        // Esperar un poco para que el estado se actualice
        setTimeout(() => {
          if (isMounted) {
            setIsProcessing(false);
            // Siempre redirigir después del callback exitoso
            router.push(returnUrl);
          }
        }, 1000);

      } catch (err) {
        console.error('Error processing callback:', err);
        if (isMounted) {
          setCallbackError('Error al procesar la autenticación');
          setIsProcessing(false);
        }
      }
    };

    handleCallback();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  // Mostrar error si hay uno
  if (callbackError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Error al Autenticar
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {callbackError}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver al Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras se procesa
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Procesando Autenticación
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isProcessing ? 'Verificando credenciales...' : 'Redirigiendo...'}
          </p>
          
          {/* Indicador de progreso */}
          <div className="mt-8">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: isProcessing ? '60%' : '100%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}