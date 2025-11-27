'use client';

import React from 'react';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface AdminDashboardProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

/**
 * 📊 AdminDashboard
 * 
 * Dashboard principal del panel de administración.
 * Muestra estadísticas de postulaciones de speakers.
 */
export function AdminDashboard({ stats, isLoading = false }: AdminDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Postulaciones',
      value: stats.total,
      icon: Users,
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-300',
      textColor: 'text-blue-900 dark:text-blue-100',
    },
    {
      title: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-300',
      textColor: 'text-yellow-900 dark:text-yellow-100',
    },
    {
      title: 'Aprobadas',
      value: stats.approved,
      icon: CheckCircle,
      bgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-300',
      textColor: 'text-green-900 dark:text-green-100',
    },
    {
      title: 'Rechazadas',
      value: stats.rejected,
      icon: XCircle,
      bgColor: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-300',
      textColor: 'text-red-900 dark:text-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard de Speakers
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Resumen de postulaciones y estadísticas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className={`${stat.bgColor} w-12 h-12 rounded-full flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </h3>
              <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mensaje si no hay postulaciones */}
      {stats.total === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No hay postulaciones aún
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Las postulaciones de speakers aparecerán aquí cuando los usuarios las envíen.
          </p>
        </div>
      )}
    </div>
  );
}
