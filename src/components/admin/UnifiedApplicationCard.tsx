'use client';

import React, { useState } from 'react';
import {
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
  Linkedin,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SpeakerPhotoPreview } from './SpeakerPhotoPreview';
import { SpeakerMediaPreview } from './SpeakerMediaPreview';
import { EventCreationWizard } from './EventCreationWizard';
import { useDialog } from '@/hooks/useDialog';
import { DialogRenderer } from '@/components/ui/DialogRenderer';
import type { Schema } from '../../../amplify/data/resource';

type SpeakerApplication = Schema['SpeakerApplication']['type'];

type WizardStep = 'pending' | 'speaker-approved' | 'event-created' | 'completed';

interface ApproveAllResult {
  talkProposalCreated?: boolean;
  talkProposalId?: string;
  statusCode?: number;
  message?: string;
}

interface UnifiedApplicationCardProps {
  application: SpeakerApplication;
  onApproveAll: (applicationId: string, userId: string) => Promise<ApproveAllResult>; // Retorna el result del API
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
  const { alert: showAlert, dialogState, handleClose, handleConfirm } = useDialog();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // 🧙‍♂️ Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('pending');
  const [talkProposalId, setTalkProposalId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // Helper para formatear fecha usando UTC (evita problemas de timezone)
  const formatProposedDateUTC = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    const weekday = date.toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' });
    
    return { day, month, year, weekday };
  };

  const handleApproveAll = async () => {
    if (!application.id || !application.userId) return;
    
    setIsProcessing(true);
    try {
      const result = await onApproveAll(application.id as string, application.userId as string);
      
      // Obtener el talkProposalId real del response
      if (result && result.talkProposalCreated && result.talkProposalId) {
        setTalkProposalId(result.talkProposalId);
        setWizardStep('speaker-approved');
        setIsExpanded(true); // Auto-expandir para mostrar wizard
      } else {
        // Si no se creó la propuesta, solo refrescar
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error al aprobar. Por favor intenta de nuevo.', { variant: 'danger' });
    } finally {
      setIsProcessing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEventCreated = (createdEventId: string, _published: boolean) => {
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
      await showAlert('Error al aprobar. Por favor intenta de nuevo.', { variant: 'danger' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      await showAlert('Por favor proporciona una razón para el rechazo', { variant: 'warning' });
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
      await showAlert('Error al rechazar. Por favor intenta de nuevo.', { variant: 'danger' });
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

  // Function to copy text to clipboard with visual feedback
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-surface rounded-lg border-2 border-accent/30 shadow-lg hover:shadow-xl transition-all theme-transition overflow-hidden">
      {/* Header - Siempre visible */}
      <div className="p-4 sm:p-6">
        {/* Mobile: Badge y tiempo primero */}
        <div className="flex items-start justify-between gap-2 mb-4 sm:hidden">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
            <Rocket className="w-3 h-3 flex-shrink-0" />
            PROPUESTA
          </span>
          <span className="text-[10px] text-text-secondary whitespace-nowrap">
            {formatDate(application.submittedAt)}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
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
                {/* Info compacta para móvil */}
                <div className="flex flex-col gap-1 text-xs sm:text-sm text-text-secondary">
                  {/* Puesto @ Empresa */}
                  {professionalProfile?.jobTitle && professionalProfile?.company ? (
                    <span className="truncate font-medium">
                      {professionalProfile.jobTitle} @ {professionalProfile.company}
                    </span>
                  ) : professionalProfile?.company ? (
                    <span className="flex items-center gap-1 truncate">
                      <Building className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{professionalProfile.company}</span>
                    </span>
                  ) : null}
                  
                  {/* Fila de contacto */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap mt-0.5">
                    {/* Email como icono en móvil, texto en desktop */}
                    <a 
                      href={`mailto:${application.email}`}
                      className="flex items-center justify-center p-1.5 rounded-lg hover:bg-accent/10 text-accent hover:text-accent-dark transition-colors"
                      title={application.email}
                    >
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="hidden sm:inline truncate max-w-[200px] ml-1.5">{application.email}</span>
                    </a>
                    
                    {/* Teléfono */}
                    {professionalProfile?.phoneNumber && (
                      <a 
                        href={`tel:${professionalProfile.phoneNumber}`}
                        className="flex items-center justify-center p-1.5 rounded-lg hover:bg-secondary/50 hover:text-text-primary transition-colors"
                        title={professionalProfile.phoneNumber}
                      >
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="hidden sm:inline ml-1.5">{professionalProfile.phoneNumber}</span>
                      </a>
                    )}
                    
                    {/* LinkedIn */}
                    {professionalProfile?.linkedInUrl && (
                      <a
                        href={professionalProfile.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        title="Ver LinkedIn"
                      >
                        <Linkedin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="hidden sm:inline text-xs ml-1.5">LinkedIn</span>
                      </a>
                    )}

                    {/* Media Preview Buttons */}
                    <SpeakerMediaPreview
                      photoKey={professionalProfile?.photoKey}
                      cvKey={professionalProfile?.cvKey}
                      speakerName={`${professionalProfile?.givenName || ''} ${professionalProfile?.familyName || ''}`.trim()}
                      size="compact"
                    />
                  </div>
                </div>
              </div>
              
              {/* Badges - Solo desktop */}
              <div className="hidden sm:flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 text-[10px] sm:text-xs font-bold rounded-full whitespace-nowrap">
                  <Rocket className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  PROPUESTA
                </span>
                <span className="text-[10px] sm:text-xs text-text-secondary whitespace-nowrap">
                  {formatDate(application.submittedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview de la propuesta - Ocupa todo el ancho */}
        {attachedProposal && (
          <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-accent/5 border border-accent/20 rounded-lg">
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
                  {attachedProposal.proposedDate && (() => {
                    const { day, month, year, weekday } = formatProposedDateUTC(attachedProposal.proposedDate);
                    return (
                      <span className="flex items-center gap-1 font-medium text-accent">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {weekday}, {day} de {month} de {year}
                      </span>
                    );
                  })()}
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
                  <span className="truncate">Aprobar</span>
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
            speakerApplicationId={application.id || undefined}
            talkTitle={attachedProposal.talkTitle}
            proposedDate={attachedProposal.proposedDate}
            duration={attachedProposal.duration}
            startTime={attachedProposal.startTime}
            endTime={attachedProposal.endTime}
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
                {professionalProfile.givenName && professionalProfile.familyName && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Nombre Completo:</span>
                      <p className="text-text-primary font-medium">
                        {`${professionalProfile.givenName} ${professionalProfile.familyName}`}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${professionalProfile.givenName} ${professionalProfile.familyName}`, 'fullName')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Nombre Completo"
                    >
                      {copiedField === 'fullName' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                )}
                {professionalProfile.company && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Empresa:</span>
                      <p className="text-text-primary font-medium">{professionalProfile.company}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(professionalProfile.company, 'company')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Empresa"
                    >
                      {copiedField === 'company' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                )}
                {professionalProfile.jobTitle && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Puesto:</span>
                      <p className="text-text-primary font-medium">{professionalProfile.jobTitle}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(professionalProfile.jobTitle, 'jobTitle')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Puesto"
                    >
                      {copiedField === 'jobTitle' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                )}
                {professionalProfile.expertiseArea && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Área de Expertise:</span>
                      <p className="text-text-primary font-medium">{professionalProfile.expertiseArea}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(professionalProfile.expertiseArea, 'expertiseArea')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Área de Expertise"
                    >
                      {copiedField === 'expertiseArea' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                )}
                {professionalProfile.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Teléfono:</span>
                      <p className="text-text-primary font-medium">{professionalProfile.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(professionalProfile.phoneNumber, 'phoneNumber')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Teléfono"
                    >
                      {copiedField === 'phoneNumber' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                )}
                {professionalProfile.linkedInUrl && (
                  <div className="flex items-center justify-between">
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
                    <button
                      onClick={() => copyToClipboard(professionalProfile.linkedInUrl, 'linkedInUrl')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar LinkedIn"
                    >
                      {copiedField === 'linkedInUrl' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
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
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-text-secondary">Título:</span>
                    <p className="text-text-primary font-medium">{attachedProposal.talkTitle}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(attachedProposal.talkTitle, 'talkTitle')}
                    className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                    title="Copiar Título"
                  >
                    {copiedField === 'talkTitle' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-accent" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-text-secondary">Descripción:</span>
                    <p className="text-text-primary">{attachedProposal.talkDescription}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(attachedProposal.talkDescription, 'talkDescription')}
                    className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                    title="Copiar Descripción"
                  >
                    {copiedField === 'talkDescription' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-accent" />
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Duración:</span>
                      <p className="text-text-primary font-medium">{attachedProposal.duration} minutos</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${attachedProposal.duration} minutos`, 'duration')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Duración"
                    >
                      {copiedField === 'duration' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-text-secondary">Audiencia:</span>
                      <p className="text-text-primary font-medium">
                        {targetAudienceLabels[attachedProposal.targetAudience] || attachedProposal.targetAudience}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(targetAudienceLabels[attachedProposal.targetAudience] || attachedProposal.targetAudience, 'targetAudience')}
                      className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      title="Copiar Audiencia"
                    >
                      {copiedField === 'targetAudience' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </div>
                  {attachedProposal.proposedDate && (() => {
                    const { day, month, year, weekday } = formatProposedDateUTC(attachedProposal.proposedDate);
                    const formattedDate = `${weekday}, ${day} de ${month} de ${year}`;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-text-secondary">Fecha Propuesta:</span>
                          <p className="text-text-primary font-medium">{formattedDate}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(formattedDate, 'proposedDate')}
                          className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                          title="Copiar Fecha Propuesta"
                        >
                          {copiedField === 'proposedDate' ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-accent" />
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Renderer */}
      <DialogRenderer
        state={dialogState}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
