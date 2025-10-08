'use client';

import { useAuth } from '@/context/auth-context';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function Home() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">AWS User Group</span>
            <span className="block text-blue-600">Puebla</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Únete a la comunidad de desarrolladores y profesionales de AWS en Puebla. 
            Aprende, comparte y crece junto a nosotros.
          </p>
        </div>

        {/* Estado de autenticación */}
        {isLoading ? (
          <div className="flex justify-center mb-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mb-12">
            {isAuthenticated && user ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-lg">
                        {user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        ¡Bienvenido de vuelta, {user.signInDetails?.loginId?.split('@')[0] || 'Usuario'}!
                      </h2>
                      <p className="text-sm text-gray-500">
                        {isAdmin ? 'Administrador' : 'Miembro de la comunidad'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Mi Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Mi Perfil
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Únete a nuestra comunidad
                </h2>
                <p className="text-gray-500 mb-4">
                  Accede a eventos exclusivos, recursos y conecta con otros profesionales de AWS.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Características principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-medium text-gray-900">Comunidad</h3>
            <p className="mt-2 text-base text-gray-500">
              Conecta con desarrolladores y arquitectos de soluciones AWS en Puebla.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-medium text-gray-900">Aprendizaje</h3>
            <p className="mt-2 text-base text-gray-500">
              Accede a workshops, charlas técnicas y recursos educativos sobre AWS.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-md bg-blue-500 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-medium text-gray-900">Eventos</h3>
            <p className="mt-2 text-base text-gray-500">
              Participa en meetups, hackathons y conferencias sobre tecnología AWS.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white">
                ¿Listo para formar parte de la comunidad?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Únete a nosotros y acelera tu carrera en la nube de AWS.
              </p>
              <div className="mt-8">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Ir al Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Únete Ahora
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Demo de funcionalidades */}
        {isAuthenticated && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Explora las funcionalidades
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/profile"
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Mi Perfil</h3>
                    <p className="text-gray-500">Gestiona tu información personal y configuración</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard"
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Dashboard</h3>
                    <p className="text-gray-500">Tu centro de control personal</p>
                  </div>
                </div>
              </Link>

              {isAdmin && (
                <Link
                  href="/access-denied"
                  className="block p-6 bg-red-50 rounded-lg border border-red-200 hover:border-red-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-red-900">Probar Access Denied</h3>
                      <p className="text-red-600">Demo de página de acceso denegado</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
