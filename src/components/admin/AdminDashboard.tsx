'use client';

import React from 'react';
import { Users } from 'lucide-react';

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

  // Dashboard simplificado - solo mostrar si no hay postulaciones
  if (stats.total === 0) {
    return (
      <div className="bg-surface rounded-lg p-8 text-center theme-transition">
        <Users className="w-16 h-16 text-text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No hay postulaciones aún
        </h3>
        <p className="text-text-secondary">
          Las postulaciones de speakers aparecerán aquí cuando los usuarios las envíen.
        </p>
      </div>
    );
  }

  // Si hay postulaciones, no mostrar dashboard (minimalista)
  return null;
}
