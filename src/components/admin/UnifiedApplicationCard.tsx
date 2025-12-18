'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Clock,
  Users as UsersIcon,
  Briefcase,
  Phone,
  Building,
  ExternalLink,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  Rocket,
  CheckCircle,
  FileText,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SpeakerPhotoPreview } from './SpeakerPhotoPreview';
import { EventCreationWizard } from './EventCreationWizard';
import type { Schema } from '../../../amplify/data/resource';

type SpeakerApplication = Schema['SpeakerApplication']['type'];

type WizardStep = 'pending' | 'speaker-approved' | 'event-created' | 'completed';

interface UnifiedApplicationCardProps {
  application: SpeakerApplication;
  onApproveAll: (applicationId: string, userId: string) => Promise<any>; // Retorna el result del API
  onApproveSpeakerOnly: (applicationId: string, userId: string) => Promise<void>;
  onReject: (applicationId: string, userId: string, reason: string) => Promise<void>;
  onRefresh?: () => void; // Para refrescar el dashboard después de completar
}

/**
 * 🎯 UnifiedApplicationCard
 * 
 * Card expandible que muestra aplicación de speaker CON propuesta adjunta.
 * Permite aprobar todo en un solo flujo con wizard inline para crear evento.
 * 
 * Wizard Steps:
 * 1. pending → Botones de acción inicial
 * 2. speaker-approved → EventCreationWizard inline
 * 3. event-created → Confirmación final
 */
export function UnifiedApplicationCard({
  application,
  onApproveAll,
  onApproveSpeakerOnly,
  onReject,
  onRefresh,
}: UnifiedApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // 🧙‍♂️ Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('pending');
  const [talkProposalId, setTalkProposalId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  // Parse JSON fields
  const professionalProfile = application.professionalProfile
    ? (() => {
        try {
          return JSON.parse(application.professionalProfile as string);
        } catch {
          return null;
        }
      })()
    : null;

  const attachedProposal = application.attachedProposal
    ? (() => {
        try {
          return JSON.parse(application.attachedProposal as string);
        } catch {
          return null;
        }
      })()
    : null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleApproveAll = async () => {
    if (!application.id || !application.userId) return;
    
    setIsProcessing(true);
    try {
      console.log('🎯 Aprobando speaker y creando propuesta...');
      const result = await onApproveAll(application.id as string, application.userId as string);
      
      // Obtener el talkProposalId real del response
      if (result && result.talkProposalCreated && result.talkProposalId) {
        setTalkProposalId(result.talkProposalId);
        setWizardStep('speaker-approved');
        setIsExpanded(true); // Auto-expandir para mostrar wizard
        
        console.log('✅ Speaker aprobado, mostrando wizard de evento');
      } else {
        // Si no se creó la propuesta, solo refrescar
        console.warn('⚠️ No se creó TalkProposal automáticamente');
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al aprobar. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEventCreated = (createdEventId: string, published: boolean) => {
    console.log(`✅ Evento ${published ? 'publicado' : 'creado'}:`, createdEventId);
    setEventId(createdEventId);
    setWizardStep('event-created');
    
    // Refrescar dashboard después de 2 segundos
    setTimeout(() => {
      if (onRefresh) {
        onRefresh();
      }
    }, 2000);
  };

  const handleWizardCancel = () => {
    setWizardStep('speaker-approved');
    // No cancelamos la aprobación del speaker, solo cerramos el wizard
  };

  const handleApproveSpeakerOnly = async () => {
    if (!application.id || !application.userId) return;
    
    setIsProcessing(true);
    try {
      await onApproveSpeakerOnly(application.id as string, application.userId as string);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al aprobar. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón para el rechazo');
      return;
    }

    if (!application.id || !application.userId) return;

    setIsProcessing(true);
    try {
      await onReject(application.id as string, application.userId as string, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al rechazar. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const targetAudienceLabels: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
    ALL: 'Todos los niveles',
  };

  return (
    <div className="bg-surface rounded-lg border-2 border-accent/30 shadow-lg hover:shadow-xl transition-all theme-transition overflow-hidden">
      {/* Header - Siempre visible */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar/Photo */}
          <div className="flex-shrink-0">
            {professionalProfile?.photoKey ? (
              <SpeakerPhotoPreview
                photoKey={professionalProfile.photoKey}
                speakerName={`${professionalProfile.givenName || ''} ${professionalProfile.familyName || ''}`.trim()}
                size="md"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-white text-lg sm:text-2xl font-bold">
                {application.email[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-xl font-bold text-text-primary mb-1 truncate">
                  {professionalProfile
                    ? `${professionalProfile.givenName} ${professionalProfile.familyName}`
                    : application.email}
                </h3>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-text-secondary">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{application.email}</span>
                  </span>
                  {professionalProfile?.company && (
                    <span className="flex items-center gap-1 truncate">
                      <Building className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{professionalProfile.company}</span>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] sm:text-xs font-bold rounded-full whitespace-nowrap">
                  <Rocket className="w-3 h-3" />
                  PROPUESTA
                </span>
                <span className="text-[10px] sm:text-xs text-text-secondary whitespace-nowrap">
                  {formatDate(application.submittedAt)}
                </span>
              </div>
            </div>

            {/* Preview de la propuesta */}
            {attachedProposal && (
              <div className="mt-3 p-3 sm:p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold text-sm sm:text-base text-text-primary line-clamp-2">
                        {attachedProposal.talkTitle}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary line-clamp-2">
                      {attachedProposal.talkDescription}
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {attachedProposal.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{targetAudienceLabels[attachedProposal.targetAudience] || attachedProposal.targetAudience}</span>
                      </span>
                      {attachedProposal.proposedDate && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {new Date(attachedProposal.proposedDate).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 sm:p-2 hover:bg-accent/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label={isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones principales - Cambian según wizard step */}
        {wizardStep === 'pending' && !showRejectForm && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <Button
              variant="primary"
              onClick={handleApproveAll}
              disabled={isProcessing}
              className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm sm:text-base"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="truncate">Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  
                  <span className="truncate">Aprobar Todo</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleApproveSpeakerOnly}
              disabled={isProcessing}
              className="w-full sm:w-auto text-sm sm:text-base flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Solo Speaker
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              disabled={isProcessing}
              className="w-full sm:w-auto border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm sm:text-base flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
          </div>
        )}

        {/* 🧙‍♂️ Wizard de creación de evento - Step 2 */}
        {wizardStep === 'speaker-approved' && talkProposalId && attachedProposal && (
          <EventCreationWizard
            talkProposalId={talkProposalId}
            talkTitle={attachedProposal.talkTitle}
            proposedDate={attachedProposal.proposedDate}
            onEventCreated={handleEventCreated}
            onCancel={handleWizardCancel}
          />
        )}

        {/* ✅ Confirmación final - Step 3 */}
        {wizardStep === 'event-created' && (
          <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-2 border-green-300 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-full">
                <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-bold text-green-800 dark:text-green-200">¡Flujo Completado!</h4>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Speaker aprobado y evento creado exitosamente
                </p>
              </div>
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-1 mt-3">
              <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Speaker agregado al grupo SPEAKERS</p>
              <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> TalkProposal creada: {talkProposalId}</p>
              <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Evento creado: {eventId}</p>
            </div>
          </div>
        )}

        {/* Formulario de rechazo */}
        {showRejectForm && wizardStep === 'pending' && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Razón del rechazo:
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-text-primary theme-transition"
              placeholder="Explica brevemente por qué se rechaza esta aplicación..."
            />
            <div className="flex gap-3 mt-3">
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  'Confirmar Rechazo'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detalles expandibles */}
      {isExpanded && (
        <div className="border-t border-border p-6 bg-background/50">
          {/* Perfil Profesional */}
          {professionalProfile && (
            <div className="mb-6">
              <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" />
                Perfil Profesional
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {professionalProfile.jobTitle && (
                  <div>
                    <span className="text-text-secondary">Puesto:</span>
                    <p className="text-text-primary font-medium">{professionalProfile.jobTitle}</p>
                  </div>
                )}
                {professionalProfile.expertiseArea && (
                  <div>
                    <span className="text-text-secondary">Área de Expertise:</span>
                    <p className="text-text-primary font-medium">{professionalProfile.expertiseArea}</p>
                  </div>
                )}
                {professionalProfile.phoneNumber && (
                  <div>
                    <span className="text-text-secondary">Teléfono:</span>
                    <p className="text-text-primary font-medium">{professionalProfile.phoneNumber}</p>
                  </div>
                )}
                {professionalProfile.linkedInUrl && (
                  <div>
                    <span className="text-text-secondary">LinkedIn:</span>
                    <a
                      href={professionalProfile.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-dark flex items-center gap-1 font-medium"
                    >
                      Ver perfil <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivación y Experiencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-semibold text-text-primary mb-2">Motivación</h4>
              <p className="text-sm text-text-secondary bg-surface p-3 rounded-lg">
                {application.motivation}
              </p>
            </div>
            {application.experience && (
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Experiencia</h4>
                <p className="text-sm text-text-secondary bg-surface p-3 rounded-lg">
                  {application.experience}
                </p>
              </div>
            )}
          </div>

          {/* Temas de interés */}
          {application.topics && application.topics.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-text-primary mb-2">Temas de Interés</h4>
              <div className="flex flex-wrap gap-2">
                {application.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full border border-accent/20"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detalles completos de la propuesta */}
          {attachedProposal && (
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
              <h4 className="font-semibold text-text-primary mb-3">Detalles Completos de la Propuesta</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-text-secondary">Título:</span>
                  <p className="text-text-primary font-medium">{attachedProposal.talkTitle}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Descripción:</span>
                  <p className="text-text-primary">{attachedProposal.talkDescription}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-text-secondary">Duración:</span>
                    <p className="text-text-primary font-medium">{attachedProposal.duration} minutos</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Audiencia:</span>
                    <p className="text-text-primary font-medium">
                      {targetAudienceLabels[attachedProposal.targetAudience] || attachedProposal.targetAudience}
                    </p>
                  </div>
                  {attachedProposal.proposedDate && (
                    <div>
                      <span className="text-text-secondary">Fecha Propuesta:</span>
                      <p className="text-text-primary font-medium">
                        {new Date(attachedProposal.proposedDate).toLocaleDateString('es-MX', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
