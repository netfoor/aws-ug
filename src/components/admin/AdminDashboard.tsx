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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-lg shadow p-3 md:p-4 animate-pulse theme-transition">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-secondary/30 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-3 bg-secondary/30 rounded w-16 mb-2"></div>
                <div className="h-6 bg-secondary/30 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Postulaciones',
      value: stats.total,
      icon: Users,
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-300',
      textColor: 'text-blue-700 dark:text-blue-100',
    },
    {
      title: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-300',
      textColor: 'text-yellow-700 dark:text-yellow-100',
    },
    {
      title: 'Aprobadas',
      value: stats.approved,
      icon: CheckCircle,
      bgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-300',
      textColor: 'text-green-700 dark:text-green-100',
    },
    {
      title: 'Rechazadas',
      value: stats.rejected,
      icon: XCircle,
      bgColor: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-300',
      textColor: 'text-red-700 dark:text-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Dashboard de Speakers
        </h2>
        <p className="text-text-secondary mt-1">
          Resumen de postulaciones y estadísticas
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-surface rounded-lg shadow hover:shadow-lg transition-all theme-transition p-3 md:p-4"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`${stat.bgColor} w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[10px] md:text-xs font-medium text-text-secondary truncate">
                    {stat.title}
                  </h3>
                  <p className={`text-xl md:text-2xl lg:text-3xl font-bold ${stat.textColor} leading-tight`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensaje si no hay postulaciones */}
      {stats.total === 0 && (
        <div className="bg-surface rounded-lg p-8 text-center theme-transition">
          <Users className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No hay postulaciones aún
          </h3>
          <p className="text-text-secondary">
            Las postulaciones de speakers aparecerán aquí cuando los usuarios las envíen.
          </p>
        </div>
      )}
    </div>
  );
}
