'use client';

import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, isAdmin, userAttributes } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando perfil...</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso Restringido</h1>
            <p className="text-text-secondary mb-6">Debes iniciar sesión para ver tu perfil.</p>
            <Button variant="accent" asChild>
              <Link href="/login?returnUrl=/profile">Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      <div className="relative overflow-hidden">
        <TalaveraPattern variant="background" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">Mi Perfil</h1>
              <p className="text-text-secondary">Gestiona tu información personal y configuración</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Volver al Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="elevated" className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información Personal
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="h-24 w-24 bg-gradient-to-br from-accent to-accent/70 rounded-2xl flex items-center justify-center shadow-talavera-lg">
                    <span className="text-white font-bold text-3xl">
                      {user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary">
                      {userAttributes?.given_name && userAttributes?.family_name
                        ? `${userAttributes.given_name} ${userAttributes.family_name}`
                        : user.signInDetails?.loginId?.split('@')[0] || 'Usuario'
                      }
                    </h3>
                    <p className="text-text-secondary">{user.signInDetails?.loginId}</p>
                    {isAdmin && (
                      <Badge variant="accent" size="md" className="mt-2">
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Administrador
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                    <div className="text-text-primary font-medium">
                      {(userAttributes?.email as string) || user?.signInDetails?.loginId || 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Nombre</label>
                    <div className="text-text-primary font-medium">
                      {userAttributes?.given_name ? String(userAttributes.given_name) : 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Apellido</label>
                    <div className="text-text-primary font-medium">
                      {userAttributes?.family_name ? String(userAttributes.family_name) : 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Teléfono</label>
                    <div className="text-text-primary font-medium">
                      {(typeof userAttributes?.phone_number === 'string' ? userAttributes.phone_number : null) || 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">ID de Usuario</label>
                    <div className="text-text-primary font-mono text-sm bg-secondary/50 px-3 py-2 rounded-lg">
                      {user.userId}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Estado</label>
                    <Badge variant={userAttributes?.email_verified ? 'success' : 'warning'} size="md">
                      {userAttributes?.email_verified ? '✓ Verificado' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Información de Sesión
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Proveedor</label>
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-text-primary font-medium">Google OAuth</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Última actualización</label>
                    <div className="text-text-primary font-medium">
                      {userAttributes?.updated_at 
                        ? new Date(Number(userAttributes.updated_at) * 1000).toLocaleDateString('es-MX')
                        : 'No disponible'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="talavera" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <button className="w-full text-left px-4 py-3 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-all flex items-center gap-3 group">
                  <div className="h-8 w-8 bg-accent/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Editar perfil
                </button>
                
                <button className="w-full text-left px-4 py-3 text-sm font-medium text-text-primary hover:bg-secondary/50 rounded-lg transition-all flex items-center gap-3 group">
                  <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  Cambiar contraseña
                </button>
                
                <button className="w-full text-left px-4 py-3 text-sm font-medium text-text-primary hover:bg-secondary/50 rounded-lg transition-all flex items-center gap-3 group">
                  <div className="h-8 w-8 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  Notificaciones
                </button>
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Estado de la Cuenta</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${userAttributes?.email_verified ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                    <span className="text-sm font-medium text-text-primary">Email verificado</span>
                  </div>
                  <Badge variant={userAttributes?.email_verified ? 'success' : 'warning'} size="sm">
                    {userAttributes?.email_verified ? 'Activo' : 'Pendiente'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                    <span className="text-sm font-medium text-text-primary">Autenticación 2FA</span>
                  </div>
                  <Badge variant="default" size="sm">Inactivo</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-text-primary">Perfil completado</span>
                  </div>
                  <Badge variant="success" size="sm">100%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
