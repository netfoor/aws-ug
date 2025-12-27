'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { NotificationList } from './NotificationList';

const client = generateClient<Schema>();

/**
 * 🔔 NotificationBell
 * 
 * Componente de campana de notificaciones con:
 * - Badge con contador de notificaciones no leídas
 * - Dropdown con lista de notificaciones
 * - Auto-refresh cada 30 segundos
 * - Marcado de leídas/no leídas
 * - Auto-refresh de sesión cuando se detecta cambio de rol
 */
export function NotificationBell() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Schema['Notification']['type'][]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar notificaciones
  const loadNotifications = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoading(true);

      const { data, errors } = await client.models.Notification.list({
        filter: {
          userId: { eq: user.userId },
        },
        limit: 20,
        selectionSet: ['id', 'userId', 'type', 'title', 'message', 'read', 'link', 'icon', 'createdAt', 'updatedAt', 'readAt', 'owner'],
      });

      if (errors && errors.length > 0) {
        console.error('Error loading notifications:', errors);
        return;
      }

      // Ordenar por fecha (más recientes primero)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setNotifications(sorted);
      setUnreadCount(sorted.filter((n) => !n.read).length);

      // 🔄 Auto-refresh de sesión si hay notificación de cambio de rol no leída
      const hasRoleChangeNotification = sorted.some(
        (n) => !n.read && (n.type === 'SPEAKER_APPROVED' || n.type === 'SPEAKER_REJECTED')
      );
      
      if (hasRoleChangeNotification && refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar notificaciones al montar y cada 30 segundos
  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Marcar notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      await client.models.Notification.update({
        id: notificationId,
        read: true,
        readAt: new Date().toISOString(),
      });

      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

      await Promise.all(
        unreadNotifications.map((n) =>
          client.models.Notification.update({
            id: n.id,
            read: true,
            readAt: new Date().toISOString(),
          })
        )
      );

      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // No mostrar si no está autenticado
  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-secondary/30 rounded-full transition-all theme-transition"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge con contador */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown / Modal Full-Screen */}
      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de notificaciones */}
          <div className="fixed inset-x-0 top-0 md:absolute md:right-0 md:left-auto md:top-auto mt-0 md:mt-2 w-full md:w-96 bg-surface rounded-none md:rounded-lg shadow-xl border-0 md:border border-border z-50 h-screen md:h-auto md:max-h-[80vh] overflow-hidden flex flex-col theme-transition animate-in slide-in-from-top md:slide-in-from-top-2 duration-300" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="text-lg font-semibold text-text-primary">
                Notificaciones
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-accent hover:underline"
                  >
                    Marcar todas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="md:hidden p-2 hover:bg-secondary/30 rounded-full transition-colors"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto safe-bottom">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-12 h-12 text-text-secondary/50 mb-3" />
                  <p className="text-sm text-text-secondary text-center">
                    No tienes notificaciones
                  </p>
                </div>
              ) : (
                <NotificationList
                  notifications={notifications}
                  onMarkAsRead={markAsRead}
                  onClose={() => setIsOpen(false)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
