'use client';

import { useAuth } from '@/context/auth-context';
import { useUserData, getFullName, getUserInitials } from '@/hooks/useUserData';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { userData } = useUserData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center" variant="elevated">
          <CardContent className="p-8">
            <div className="mx-auto h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso Restringido</h1>
            <p className="text-text-secondary mb-6">Debes iniciar sesión para acceder al dashboard.</p>
            <Button variant="accent" asChild>
              <Link href="/login?returnUrl=/dashboard">Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Obtener nombre desde User table
  const userName = getFullName(userData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      <div className="relative overflow-hidden">
        <TalaveraPattern variant="background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                ¡Hola, {userName}! 👋
              </h1>
              <p className="text-text-secondary flex items-center gap-2 flex-wrap">
                Bienvenido a tu dashboard
                {isAdmin && (
                  <Badge variant="accent" size="md">
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Administrador
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/profile">Ver Perfil</Link>
              </Button>
              {isAdmin && (
                <Button variant="accent" asChild>
                  <Link href="/admin">Panel Admin</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
          <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Estado</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {isAdmin ? 'Admin' : 'Activo'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-accent to-accent/70 rounded-xl flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Verificación</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {userData?.email ? 'Verificado' : 'Pendiente'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Eventos</p>
                  <p className="text-2xl font-bold text-text-primary">0</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                  <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-1">Asistencias</p>
                  <p className="text-2xl font-bold text-text-primary">0</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">Sin actividad reciente</h3>
                  <p className="text-text-secondary mb-4">Cuando participes en eventos, verás tu actividad aquí.</p>
                  <Button variant="accent" asChild>
                    <Link href="/eventos">Explorar Eventos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Próximos Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No hay eventos programados</h3>
                  <p className="text-text-secondary">¡Mantente atento! Pronto anunciaremos nuevos eventos.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card variant="talavera" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Acceso Rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/profile" className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-all group">
                  <div className="h-10 w-10 bg-accent/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Mi Perfil</p>
                    <p className="text-xs text-text-secondary">Gestionar información</p>
                  </div>
                </Link>

                <Link href="/eventos" className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-all group">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Eventos</p>
                    <p className="text-xs text-text-secondary">Explorar disponibles</p>
                  </div>
                </Link>

                <Link href="/comunidad" className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-all group">
                  <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Comunidad</p>
                    <p className="text-xs text-text-secondary">Conectar con miembros</p>
                  </div>
                </Link>

                {isAdmin && (
                  <Link href="/admin" className="flex items-center p-3 rounded-lg hover:bg-accent/10 transition-all group border-t border-border mt-2 pt-4">
                    <div className="h-10 w-10 bg-accent/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-accent">Panel Admin</p>
                      <p className="text-xs text-text-secondary">Gestión administrativa</p>
                    </div>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Tu Información</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center shadow-talavera">
                    <span className="text-white font-bold text-xl">
                      {getUserInitials(userData)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {getFullName(userData)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {userData?.email || user.signInDetails?.loginId}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Miembro desde</span>
                    <span className="text-text-primary font-medium">
                      {userData?.createdAt 
                        ? new Date(userData.createdAt).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
                        : 'Hoy'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Email verificado</span>
                    <Badge variant={userData?.email ? 'success' : 'warning'} size="sm">
                      {userData?.email ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
