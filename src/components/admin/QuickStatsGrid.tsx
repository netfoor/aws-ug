'use client';

import React from 'react';
import { Users, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getIconColors, type IconColorVariant } from '@/lib/iconColorUtils';

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
      colorVariant: 'blue' as IconColorVariant,
      href: '/admin/speakers?filter=PENDING',
    },
    {
      label: 'Propuestas',
      value: pendingProposals,
      icon: MessageSquare,
      colorVariant: 'purple' as IconColorVariant,
      href: '/admin/talk-proposals?filter=PENDING',
    },
    {
      label: 'Eventos Draft',
      value: draftEvents,
      icon: Calendar,
      colorVariant: 'orange' as IconColorVariant,
      href: '/admin/events?filter=DRAFT',
    },
    {
      label: 'Check-ins Hoy',
      value: upcomingCheckins,
      icon: CheckCircle,
      colorVariant: 'green' as IconColorVariant,
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
      {stats.map((stat) => {
        const { bgColor, textColor } = getIconColors(stat.colorVariant);
        
        return (
        <Link
          key={stat.label}
          href={stat.href}
          className="group bg-surface rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all theme-transition border border-border hover:border-accent/30"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className={`p-2 sm:p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${textColor}`} />
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
        );
      })}
    </div>
  );
}
