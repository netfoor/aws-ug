'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Icono de acceso denegado */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Acceso Denegado
          </h2>
          
          <p className="mt-2 text-center text-sm text-gray-600">
            No tienes permisos suficientes para acceder a esta página.
          </p>

          {/* Información del usuario */}
          {isAuthenticated && user && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Información de tu cuenta:
              </h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Email:</span> {user.signInDetails?.loginId || 'No disponible'}
                </p>
                <p>
                  <span className="font-medium">Usuario ID:</span> {user.userId}
                </p>
              </div>
            </div>
          )}

          {/* Mensaje explicativo */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  ¿Por qué veo este mensaje?
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Esta página requiere permisos de administrador</li>
                    <li>Tu cuenta no tiene el rol necesario</li>
                    <li>Si crees que esto es un error, contacta al administrador</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Volver al Inicio
            </button>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cerrar Sesión
              </button>
            )}
          </div>

          {/* Información de contacto */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              ¿Necesitas ayuda?{' '}
              <a
                href="mailto:admin@awspuebla.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Contacta al administrador
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}