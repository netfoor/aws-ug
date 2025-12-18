'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  MessageSquare, 
  Calendar,
  Clock,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Schema } from '../../../amplify/data/resource';

type SpeakerApplication = Schema['SpeakerApplication']['type'];
type TalkProposal = Schema['TalkProposal']['type'];
type Event = Schema['Event']['type'];

interface ActionTimelineProps {
  pendingSpeakers: SpeakerApplication[];
  pendingProposals: TalkProposal[];
  draftEvents: Event[];
  onViewSpeaker?: (application: SpeakerApplication) => void;
  isLoading?: boolean;
}

/**
 * ⏰ ActionTimeline
 * 
 * Timeline unificada de todas las acciones pendientes.
 * Muestra speakers, propuestas y eventos que requieren atención del admin.
 */
export function ActionTimeline({
  pendingSpeakers,
  pendingProposals,
  draftEvents,
  onViewSpeaker,
  isLoading = false,
}: ActionTimelineProps) {
  // Combinar y ordenar todos los items por fecha
  const allItems = [
    ...pendingSpeakers.map(s => ({
      type: 'speaker' as const,
      data: s,
      date: new Date(s.submittedAt || 0),
      priority: s.hasAttachedProposal ? 1 : 2, // Con propuesta = alta prioridad
    })),
    ...pendingProposals.map(p => ({
      type: 'proposal' as const,
      data: p,
      date: new Date(p.submittedAt || 0),
      priority: 3,
    })),
    ...draftEvents.map(e => ({
      type: 'event' as const,
      data: e,
      date: new Date(e.createdAt || 0),
      priority: 4,
    })),
  ].sort((a, b) => {
    // Primero por prioridad, luego por fecha
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.date.getTime() - a.date.getTime();
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-lg p-6 shadow-sm theme-transition">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-secondary/30 rounded-lg animate-pulse flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-5 w-48 bg-secondary/30 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-secondary/30 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-32 bg-secondary/30 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-12 text-center shadow-sm theme-transition">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          ¡Todo al día!
        </h3>
        <p className="text-text-secondary">
          No hay acciones pendientes en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allItems.map((item, index) => {
        if (item.type === 'speaker') {
          const speaker = item.data as SpeakerApplication;
          const hasProposal = speaker.hasAttachedProposal;
          
          return (
            <div
              key={`speaker-${speaker.id}-${index}`}
              className={`bg-surface rounded-lg p-6 shadow-sm hover:shadow-md transition-all theme-transition border ${
                hasProposal ? 'border-amber-300 dark:border-amber-700' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg flex-shrink-0 ${
                  hasProposal 
                    ? 'bg-amber-100 dark:bg-amber-900/30' 
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Users className={`w-6 h-6 ${
                    hasProposal 
                      ? 'text-amber-700 dark:text-amber-400' 
                      : 'text-blue-700 dark:text-blue-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {hasProposal && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full">
                            ⭐ PRIORIDAD
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-text-primary">
                          {hasProposal ? 'Aplicación Completa con Propuesta' : 'Nueva Aplicación de Speaker'}
                        </h3>
                      </div>
                      <p className="text-text-primary font-medium mb-1">
                        {speaker.email}
                      </p>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                        {speaker.motivation}
                      </p>
                      {hasProposal && speaker.attachedProposal && (() => {
                        try {
                          const proposal = JSON.parse(speaker.attachedProposal as string);
                          return (
                            <div className="flex items-center gap-2 text-sm text-accent">
                              <MessageSquare className="w-4 h-4" />
                              <span className="font-medium">{proposal.talkTitle}</span>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                    
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {formatTimeAgo(item.date)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {onViewSpeaker && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewSpeaker(speaker)}
                        className="text-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalles
                      </Button>
                    )}
                    <Link href="/admin/speakers">
                      <Button variant="outline" size="sm" className="text-sm">
                        Ir a Gestión
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (item.type === 'proposal') {
          const proposal = item.data as TalkProposal;
          
          return (
            <div
              key={`proposal-${proposal.id}-${index}`}
              className="bg-surface rounded-lg p-6 shadow-sm hover:shadow-md transition-all theme-transition border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-purple-700 dark:text-purple-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        Nueva Propuesta de Charla
                      </h3>
                      <p className="text-text-primary font-medium mb-1">
                        {proposal.title}
                      </p>
                      <p className="text-sm text-text-secondary mb-2">
                        Por: {proposal.speakerName}
                      </p>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {proposal.description}
                      </p>
                    </div>
                    
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {formatTimeAgo(item.date)}
                    </span>
                  </div>
                  
                  <Link href="/admin/talk-proposals">
                    <Button variant="outline" size="sm" className="text-sm mt-3">
                      Revisar Propuesta
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        }

        if (item.type === 'event') {
          const event = item.data as Event;
          
          return (
            <div
              key={`event-${event.id}-${index}`}
              className="bg-surface rounded-lg p-6 shadow-sm hover:shadow-md transition-all theme-transition border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                  <Calendar className="w-6 h-6 text-orange-700 dark:text-orange-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs font-bold rounded-full">
                          BORRADOR
                        </span>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {event.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-secondary mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(event.startDate || '').toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{event.speakerName}</span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {formatTimeAgo(item.date)}
                    </span>
                  </div>
                  
                  <Link href="/admin/events">
                    <Button variant="outline" size="sm" className="text-sm mt-3">
                      Publicar Evento
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
