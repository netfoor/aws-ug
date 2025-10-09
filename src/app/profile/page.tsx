'use client';

import { useAuth } from '@/context/auth-context';
import Navigation from '@/components/Navigation';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, isAdmin, userAttributes } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Acceso Restringido
            </h1>
            <p className="mt-2 text-gray-600">
              Debes iniciar sesión para ver tu perfil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tu información personal y configuración de cuenta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información Principal */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Información Personal
                </h2>
              </div>
              
              <div className="px-6 py-4 space-y-6">
                {/* Avatar y nombre */}
                <div className="flex items-center space-x-6">
                  <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-2xl">
                      {user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-900">
                      {userAttributes?.given_name && userAttributes?.family_name
                        ? `${userAttributes.given_name} ${userAttributes.family_name}`
                        : user.signInDetails?.loginId?.split('@')[0] || 'Usuario'
                      }
                    </h3>
                    <p className="text-gray-500">
                      {user.signInDetails?.loginId}
                    </p>
                    {isAdmin && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                        Administrador
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalles del usuario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {(userAttributes?.email as string) || user?.signInDetails?.loginId || 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {userAttributes?.given_name ? String(userAttributes.given_name) : 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Apellido
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {userAttributes?.family_name ? String(userAttributes.family_name) : 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Teléfono
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {(typeof userAttributes?.phone_number === 'string' ? userAttributes.phone_number : null) || 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ID de Usuario
                    </label>
                    <div className="mt-1 text-sm text-gray-500 font-mono">
                      {user.userId}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Verificado
                    </label>
                    <div className="mt-1">
                      {userAttributes?.email_verified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información técnica */}
            <div className="mt-8 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Información de Sesión
                </h2>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Proveedor de autenticación
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {userAttributes?.identities ? 'Google OAuth' : 'Cognito'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Última actualización de token
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {userAttributes?.updated_at 
                        ? new Date(Number(userAttributes.updated_at) * 1000).toLocaleString()
                        : 'No disponible'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Acciones
                </h2>
              </div>
              
              <div className="px-6 py-4 space-y-3">
                <button className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                  Editar perfil
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                  Cambiar contraseña
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                  Configurar notificaciones
                </button>
              </div>
            </div>

            {/* Estado de la cuenta */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Estado de la Cuenta
                </h2>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Email verificado</span>
                  <div className={`h-2 w-2 rounded-full ${
                    userAttributes?.email_verified ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Autenticación 2FA</span>
                  <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Perfil completado</span>
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}