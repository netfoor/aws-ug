'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useState } from 'react';

export default function Navigation() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y navegación principal */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center" data-testid="nav-link-home-logo">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AWS</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  UG Puebla
                </span>
              </div>
            </Link>

            {/* Enlaces de navegación */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                href="/"
                data-testid="nav-link-home"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Inicio
              </Link>
              
              {isAuthenticated && (
                <>
                  <Link
                    href="/profile"
                    data-testid="nav-link-profile"
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Perfil
                  </Link>
                  <Link
                    href="/dashboard"
                    data-testid="nav-link-dashboard"
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  data-testid="nav-link-admin"
                  className="text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Área de usuario */}
          <div className="flex items-center">
            {isLoading ? (
              <div className="animate-pulse flex items-center">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  data-testid="user-dropdown-button"
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    
                    {/* Información del usuario */}
                    <div className="hidden md:block text-left" data-testid="user-info">
                      <div className="text-sm font-medium text-gray-900" data-testid="user-email">
                        {user.signInDetails?.loginId?.split('@')[0] || 'Usuario'}
                      </div>
                      <div className="text-xs text-gray-500" data-testid="user-groups">
                        {isAdmin ? 'Administrador' : 'Usuario'}
                      </div>
                    </div>

                    {/* Icono de dropdown */}
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs text-gray-500 border-b">
                        {user.signInDetails?.loginId}
                      </div>
                      
                      <Link
                        href="/profile"
                        data-testid="dropdown-link-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Ver Perfil
                      </Link>
                      
                      <Link
                        href="/dashboard"
                        data-testid="dropdown-link-dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          data-testid="dropdown-link-admin"
                          className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Panel Admin
                        </Link>
                      )}

                      <div className="border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          data-testid="logout-button"
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  data-testid="nav-link-login"
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  data-testid="nav-link-join"
                >
                  Unirse
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cerrar dropdown al hacer click fuera */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          data-testid="dropdown-overlay"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  );
}