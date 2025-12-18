'use client';

import React from 'react';
import { Users, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface QuickStatsGridProps {
  newSpeakers: number;
  pendingProposals: number;
  draftEvents: number;
  upcomingCheckins: number;
  isLoading?: boolean;
}

/**
 * 📊 QuickStatsGrid
 * 
 * Grid de estadísticas rápidas para el dashboard del admin.
 * Muestra contadores de acciones pendientes con links directos.
 */
export function QuickStatsGrid({
  newSpeakers,
  pendingProposals,
  draftEvents,
  upcomingCheckins,
  isLoading = false,
}: QuickStatsGridProps) {
  const stats = [
    {
      label: 'Nuevos Speakers',
      value: newSpeakers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
      href: '/admin/speakers?filter=PENDING',
    },
    {
      label: 'Propuestas',
      value: pendingProposals,
      icon: MessageSquare,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300',
      href: '/admin/talk-proposals?filter=PENDING',
    },
    {
      label: 'Eventos Draft',
      value: draftEvents,
      icon: Calendar,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-300',
      href: '/admin/events?filter=DRAFT',
    },
    {
      label: 'Check-ins Hoy',
      value: upcomingCheckins,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300',
      href: '/admin/events',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-lg p-6 shadow-sm theme-transition">
            <div className="h-12 w-12 bg-secondary/30 rounded-lg animate-pulse mb-3"></div>
            <div className="h-8 w-16 bg-secondary/30 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 bg-secondary/30 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group bg-surface rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all theme-transition border border-border hover:border-accent/30"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.textColor}`} />
            </div>
            {stat.value > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full">
                {stat.value}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-text-primary">
              {stat.value}
            </span>
          </div>
          
          <p className="text-xs sm:text-sm text-text-secondary mt-1 line-clamp-1">
            {stat.label}
          </p>
          
          <div className="mt-2 sm:mt-3 flex items-center text-[10px] sm:text-xs text-accent group-hover:text-accent-dark transition-colors">
            <span className="hidden sm:inline">Ver detalles</span>
            <span className="sm:hidden">Ver</span>
            <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
