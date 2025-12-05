'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Calendar, MessageSquare, Megaphone, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/Button';

type Notification = Schema['Notification']['type'];

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onClose: () => void;
}

/**
 * 📋 NotificationList
 * 
 * Lista de notificaciones con:
 * - Iconos por tipo de notificación
 * - Fecha relativa (hace X minutos)
 * - Indicador de leído/no leído
 * - Link a detalles (si aplica)
 */
export function NotificationList({
  notifications,
  onMarkAsRead,
  onClose,
}: NotificationListProps) {
  const { refreshUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Refrescar sesión del usuario (forzar re-login)
  const handleRefreshSession = async (notificationId: string) => {
    setIsRefreshing(true);
    
    const confirmed = confirm(
      '🔄 Para activar tus nuevos permisos, necesitas cerrar sesión y volver a iniciar.\n\n¿Continuar?'
    );
    
    if (!confirmed) {
      setIsRefreshing(false);
      return;
    }
    
    try {
      // Marcar como leída antes de hacer logout
      onMarkAsRead(notificationId);
      
      // Esperar un momento para que se guarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Hacer logout - esto redirigirá automáticamente a /login
      window.location.href = '/logout';
    } catch (error) {
      console.error('Error refreshing session:', error);
      alert('❌ Error al cerrar sesión. Intenta manualmente desde el menú.');
      setIsRefreshing(false);
    }
  };

  // Obtener icono según tipo de notificación
  const getIcon = (type: string | null | undefined, icon: string | null | undefined) => {
    // Si hay emoji/icono personalizado, usarlo
    if (icon) {
      return <span className="text-2xl">{icon}</span>;
    }

    // Iconos por tipo
    switch (type) {
      case 'SPEAKER_APPROVED':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'SPEAKER_REJECTED':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'NEW_SPEAKER_APPLICATION':
        return <FileText className="w-6 h-6 text-indigo-500" />;
      case 'NEW_EVENT':
        return <Calendar className="w-6 h-6 text-blue-500" />;
      case 'COMMENT':
        return <MessageSquare className="w-6 h-6 text-purple-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-6 h-6 text-orange-500" />;
      default:
        return <Megaphone className="w-6 h-6 text-gray-500" />;
    }
  };

  // Formatear fecha relativa
  const getRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Ahora';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="divide-y divide-border">
      {notifications.map((notification) => {
        const hasLink = notification.link && notification.link.trim() !== '';

        const NotificationContent = (
          <div
            className={`p-4 transition-all theme-transition ${
              !notification.read
                ? 'bg-accent/10 hover:bg-accent/20'
                : 'hover:bg-secondary/30'
            } ${hasLink ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (!notification.read && notification.id) {
                onMarkAsRead(notification.id);
              }
            }}
          >
            <div className="flex gap-3">
              {/* Icono */}
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type, notification.icon)}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm font-semibold ${
                    !notification.read
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                  }`}>
                    {notification.title}
                  </h4>
                  
                  {/* Indicador de no leída */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>

                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {notification.message}
                </p>

                {/* Botón de Refrescar Sesión para notificaciones de cambio de rol */}
                {!notification.read && notification.type === 'SPEAKER_APPROVED' && notification.id && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const confirmed = confirm('🔄 Para activar tus nuevos permisos de speaker, necesitas cerrar sesión y volver a iniciar.\\n\\n¿Cerrar sesión ahora?');
                      
                      if (confirmed) {
                        setIsRefreshing(true);
                        try {
                          // Marcar como leída
                          onMarkAsRead(notification.id!);
                          // Esperar un momento
                          await new Promise(resolve => setTimeout(resolve, 500));
                          // Hacer logout (esto redirigirá a Cognito Hosted UI)
                          await logout();
                        } catch (error) {
                          console.error('Error logging out:', error);
                          setIsRefreshing(false);
                        }
                      }
                    }}
                    disabled={isRefreshing}
                    className="mt-3 w-full text-xs"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Cerrando sesión...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Activar Permisos (Re-login)
                      </>
                    )}
                  </Button>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-text-secondary opacity-75">
                    {getRelativeTime(notification.createdAt)}
                  </span>

                  {hasLink && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      Ver detalles
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

        // Si tiene link, wrappear en Link
        if (hasLink) {
          return (
            <Link
              key={notification.id}
              href={notification.link!}
              onClick={onClose}
            >
              {NotificationContent}
            </Link>
          );
        }

        // Si no tiene link, renderizar solo el contenido
        return (
          <div key={notification.id}>
            {NotificationContent}
          </div>
        );
      })}
    </div>
  );
}
