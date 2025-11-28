'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Calendar, MessageSquare, Megaphone, ExternalLink } from 'lucide-react';
import type { Schema } from '../../../amplify/data/resource';

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
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {notifications.map((notification) => {
        const hasLink = notification.link && notification.link.trim() !== '';

        const NotificationContent = (
          <div
            className={`p-4 transition-colors ${
              !notification.read
                ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {notification.title}
                  </h4>
                  
                  {/* Indicador de no leída */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {notification.message}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
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
