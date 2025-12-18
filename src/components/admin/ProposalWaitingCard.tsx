'use client';

import React, { useState } from 'react';
import { MessageSquare, User, Mail, Building, Lightbulb } from 'lucide-react';
import { EventCreationWizard } from './EventCreationWizard';
import type { Schema } from '../../../amplify/data/resource';

type TalkProposal = Schema['TalkProposal']['type'];
type SpeakerApplication = Schema['SpeakerApplication']['type'];

interface ProposalWaitingCardProps {
  proposal: TalkProposal;
  speakerApp?: SpeakerApplication;
  onEventCreated: (eventId: string, published: boolean) => void;
  onRefresh?: () => void;
}

/**
 * Card para propuestas esperando creación de evento
 * Muestra el wizard directamente, sin necesidad de aprobar de nuevo
 */
export function ProposalWaitingCard({
  proposal,
  speakerApp,
  onEventCreated,
  onRefresh,
}: ProposalWaitingCardProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);

  const handleEventCreated = (eventId: string, published: boolean) => {
    console.log(`✅ Evento ${published ? 'publicado' : 'creado'}:`, eventId);
    setEventCreated(true);
    onEventCreated(eventId, published);
    
    // Refrescar dashboard después de 2 segundos
    setTimeout(() => {
      if (onRefresh) {
        onRefresh();
      }
    }, 2000);
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  // Parse professional profile si existe
  const professionalProfile = speakerApp?.professionalProfile
    ? (() => {
        try {
          return JSON.parse(speakerApp.professionalProfile as string);
        } catch {
          return null;
        }
      })()
    : null;

  if (eventCreated) {
    return (
      <div className="bg-surface rounded-lg border-2 border-green-300 dark:border-green-700 shadow-lg p-4 sm:p-5 theme-transition">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎉</span>
          <div>
            <h4 className="font-bold text-green-800 dark:text-green-200">¡Evento Creado!</h4>
            <p className="text-sm text-green-600 dark:text-green-400">
              La propuesta ha sido aprobada y el evento ha sido creado exitosamente
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all theme-transition overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-bold rounded-full">
                ESPERANDO EVENTO
              </span>
            </div>
            <h3 className="font-semibold text-text-primary mb-1 text-base sm:text-lg">{proposal.title}</h3>
            
            {/* Info del speaker */}
            <div className="flex flex-col gap-1 text-xs sm:text-sm text-text-secondary mt-2">
              {professionalProfile && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{professionalProfile.givenName} {professionalProfile.familyName}</span>
                </div>
              )}
              
              {professionalProfile?.jobTitle && professionalProfile?.company && (
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {professionalProfile.jobTitle} @ {professionalProfile.company}
                  </span>
                </div>
              )}
              
              {speakerApp?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{speakerApp.email}</span>
                </div>
              )}
            </div>

            {/* Descripción de la propuesta */}
            {!showWizard && proposal.description && (
              <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <div className="flex items-start gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-text-secondary line-clamp-2">
                    {proposal.description}
                  </p>
                </div>
              </div>
            )}
            
            {/* Info status */}
            {!showWizard && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-medium">
                💡 Speaker aprobado - Propuesta guardada - Click para crear evento
              </p>
            )}
          </div>
        </div>

        {/* Botón o Wizard */}
        {!showWizard ? (
          <button
            onClick={() => setShowWizard(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Continuar - Crear Evento
          </button>
        ) : (
          <EventCreationWizard
            talkProposalId={proposal.id as string}
            talkTitle={proposal.title}
            proposedDate={proposal.proposedDate || undefined}
            onEventCreated={handleEventCreated}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
