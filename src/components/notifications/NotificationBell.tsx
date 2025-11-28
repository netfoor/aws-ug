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
 */
export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
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
        selectionSet: ['id', 'userId', 'type', 'title', 'message', 'read', 'link', 'icon', 'createdAt', 'readAt', 'owner'],
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
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de notificaciones */}
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
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
