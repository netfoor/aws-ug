'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  User,
  MessageSquare,
  Tag,
  Award,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Briefcase,
  Phone,
  ExternalLink,
  FileText,
  Lightbulb,
  Clock,
  Users,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { SpeakerPhotoPreview } from './SpeakerPhotoPreview';
import { useDialog } from '@/hooks/useDialog';
import { DialogRenderer } from '@/components/ui/DialogRenderer';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { getUrl } from 'aws-amplify/storage';

const client = generateClient<Schema>();

type SpeakerApplication = Schema['SpeakerApplication']['type'];

interface SpeakerApplicationDetailProps {
  application: SpeakerApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (applicationId: string, userId: string) => Promise<void>;
  onReject: (applicationId: string, userId: string, reason: string) => Promise<void>;
}

/**
 * 🔍 SpeakerApplicationDetail
 * 
 * Modal con detalles completos de una postulación.
 * Permite aprobar o rechazar la postulación.
 */
export function SpeakerApplicationDetail({
  application,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: SpeakerApplicationDetailProps) {
  const { alert: showAlert, dialogState, handleClose: closeDialog, handleConfirm } = useDialog();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [linkedProposal, setLinkedProposal] = useState<Schema['TalkProposal']['type'] | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [downloadingCV, setDownloadingCV] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Helper para formatear fecha usando UTC (evita problemas de timezone)
  const formatProposedDateUTC = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    
    return `${day} de ${month} de ${year}`;
  };

  // Parse JSON fields
  const professionalProfile = application?.professionalProfile 
    ? (() => {
        try {
          return JSON.parse(application.professionalProfile as string);
        } catch (e) {
          console.error('Error parsing professionalProfile:', e);
          return null;
        }
      })()
    : null;

  const attachedProposal = application?.attachedProposal
    ? (() => {
        try {
          return JSON.parse(application.attachedProposal as string);
        } catch (e) {
          console.error('Error parsing attachedProposal:', e);
          return null;
        }
      })()
    : null;

  // Load linked TalkProposal if exists
  useEffect(() => {
    async function loadLinkedProposal() {
      if (!application?.hasAttachedProposal || !application?.id) return;

      setLoadingProposal(true);
      try {
        const { data: proposals } = await client.models.TalkProposal.list({
          filter: {
            userId: { eq: application.userId }
          }
        });

        // Find proposal created around the same time
        const linked = proposals.find(p => {
          const appTime = new Date(application.submittedAt || '').getTime();
          const propTime = new Date(p.submittedAt || '').getTime();
          return Math.abs(appTime - propTime) < 60000; // Within 1 minute
        });

        setLinkedProposal(linked || null);
      } catch (error) {
        console.error('Error loading linked proposal:', error);
      } finally {
        setLoadingProposal(false);
      }
    }

    if (isOpen) {
      loadLinkedProposal();
    }
  }, [application?.hasAttachedProposal, application?.id, application?.userId, application?.submittedAt, isOpen]);

  if (!isOpen || !application) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async () => {
    if (!application.id || !application.userId) {
      await showAlert('Error: Datos incompletos de la aplicación', { variant: 'danger' });
      return;
    }

    try {
      setIsApproving(true);
      await onApprove(application.id as string, application.userId as string);
      onClose();
    } catch (error) {
      console.error('Error al aprobar:', error);
      await showAlert('Error al aprobar la postulación', { variant: 'danger' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      await showAlert('Por favor proporciona una razón para el rechazo', { variant: 'warning' });
      return;
    }

    if (!application.id || !application.userId) {
      await showAlert('Error: Datos incompletos de la aplicación', { variant: 'danger' });
      return;
    }

    try {
      setIsRejecting(true);
      await onReject(application.id as string, application.userId as string, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error('Error al rechazar:', error);
      await showAlert('Error al rechazar la postulación', { variant: 'danger' });
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = application.status === 'PENDING';
  const isApproved = application.status === 'APPROVED';
  const isRejected = application.status === 'REJECTED';

  // Función para copiar al clipboard
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  // Función para abrir/expandir foto
  const handleViewPhoto = async () => {
    if (!professionalProfile?.photoKey) return;
    
    try {
      const result = await getUrl({
        path: professionalProfile.photoKey,
        options: {
          expiresIn: 3600,
        },
      });
      setPhotoPreviewUrl(result.url.toString());
      setShowPhotoModal(true);
    } catch (err) {
      console.error('Error loading photo:', err);
    }
  };

  // Función para descargar foto (desde el modal)
  const handleDownloadPhoto = async () => {
    if (!photoPreviewUrl || !professionalProfile?.photoKey) return;
    
    setDownloadingPhoto(true);
    try {
      // Descargar como blob para forzar descarga
      const response = await fetch(photoPreviewUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `speaker-photo-${professionalProfile.givenName || 'speaker'}-${professionalProfile.familyName || ''}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading photo:', err);
    } finally {
      setDownloadingPhoto(false);
    }
  };

  // Función para descargar CV
  const handleDownloadCV = async () => {
    if (!professionalProfile?.cvKey) return;
    
    setDownloadingCV(true);
    try {
      const result = await getUrl({
        path: professionalProfile.cvKey,
        options: {
          expiresIn: 3600,
        },
      });

      // Crear link temporal para descarga
      const link = document.createElement('a');
      link.href = result.url.toString();
      link.download = `CV-${professionalProfile.givenName || 'speaker'}-${professionalProfile.familyName || ''}-${Date.now()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading CV:', err);
    } finally {
      setDownloadingCV(false);
    }
  };

  // Componente para texto copiable
  const CopyableText = ({ text, fieldName, label }: { text: string; fieldName: string; label?: string }) => {
    const isCopied = copiedField === fieldName;
    return (
      <div className="flex items-center gap-2 group">
        <span className="text-text-primary flex-1">{text}</span>
        <button
          onClick={() => copyToClipboard(text, fieldName)}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary/30 rounded flex-shrink-0"
          title="Copiar"
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-text-secondary hover:text-accent" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-2 sm:p-4">
      <div className="min-h-full flex items-start justify-center py-4 sm:py-8">
        <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden theme-transition flex flex-col">
        {/* Header - Sticky */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {professionalProfile?.photoKey ? (
              <div className="flex-shrink-0">
                <SpeakerPhotoPreview 
                  photoKey={professionalProfile.photoKey}
                  speakerName={`${professionalProfile.givenName || ''} ${professionalProfile.familyName || ''}`.trim()}
                  size="sm"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                {application.email[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {professionalProfile ? `${professionalProfile.givenName} ${professionalProfile.familyName}` : application.email}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary truncate">
                {application.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-all theme-transition flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Status Badge */}
          <div className="mb-4">
            {isApproved && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold">Aprobada</span>
              </div>
            )}
            {isRejected && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
                <XCircle className="w-4 h-4" />
                <span className="font-semibold">Rechazada</span>
              </div>
            )}
            {isPending && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">Pendiente</span>
              </div>
            )}
          </div>

          {/* 🎯 PERFIL PROFESIONAL - LO MÁS IMPORTANTE PRIMERO */}
          {professionalProfile && (
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-text-primary text-lg">Perfil Profesional</h3>
                </div>
                {/* Botones de descarga */}
                <div className="flex gap-2">
                  {professionalProfile.photoKey && (
                    <button
                      onClick={handleViewPhoto}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Ver foto"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver Foto</span>
                    </button>
                  )}
                  {professionalProfile.cvKey && (
                    <button
                      onClick={handleDownloadCV}
                      disabled={downloadingCV}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      title="Descargar CV"
                    >
                      {downloadingCV ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">CV</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Photo - Clickable para expandir */}
                {professionalProfile.photoKey && (
                  <div className="flex-shrink-0 flex justify-center sm:justify-start">
                    <button
                      onClick={handleViewPhoto}
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click para ver foto completa"
                    >
                      <SpeakerPhotoPreview 
                        photoKey={professionalProfile.photoKey}
                        speakerName={`${professionalProfile.givenName || ''} ${professionalProfile.familyName || ''}`.trim()}
                        size="lg"
                      />
                    </button>
                  </div>
                )}

                {/* Info Principal */}
                <div className="flex-1 space-y-4">
                  {/* Nombre completo - Copiable */}
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Nombre completo</p>
                    <div className="text-xl sm:text-2xl font-bold text-text-primary">
                      <CopyableText 
                        text={`${professionalProfile.givenName || ''} ${professionalProfile.familyName || ''}`.trim()}
                        fieldName="fullName"
                      />
                    </div>
                  </div>

                  {/* Trabajo - Copiable */}
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Trabajo</p>
                    <div className="text-base sm:text-lg text-text-primary">
                      <CopyableText 
                        text={`${professionalProfile.jobTitle || 'N/A'} @ ${professionalProfile.company || 'N/A'}`}
                        fieldName="job"
                      />
                    </div>
                  </div>

                  {/* Email - Copiable */}
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Email</p>
                    <div className="text-sm sm:text-base text-text-primary">
                      <CopyableText 
                        text={application.email}
                        fieldName="email"
                      />
                    </div>
                  </div>

                  {/* Info adicional en grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {professionalProfile.phoneNumber && (
                      <div>
                        <p className="text-xs font-medium text-text-secondary mb-1">Teléfono</p>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <CopyableText 
                            text={professionalProfile.phoneNumber}
                            fieldName="phone"
                          />
                        </div>
                      </div>
                    )}

                    {professionalProfile.expertiseArea && (
                      <div>
                        <p className="text-xs font-medium text-text-secondary mb-1">Especialización</p>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <CopyableText 
                            text={professionalProfile.expertiseArea}
                            fieldName="expertise"
                          />
                        </div>
                      </div>
                    )}

                    {professionalProfile.linkedInUrl && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-text-secondary mb-1">LinkedIn</p>
                        <a 
                          href={professionalProfile.linkedInUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Ver perfil de LinkedIn
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 PROPUESTA ADJUNTA */}
          {application.hasAttachedProposal && attachedProposal && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-text-primary text-lg">Propuesta de Charla Adjunta</h3>
                </div>
                <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full">
                  CON PROPUESTA
                </div>
              </div>

              <div className="space-y-4">
                {/* Título - Copiable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-text-secondary">Título</p>
                    <button
                      onClick={() => copyToClipboard(attachedProposal.talkTitle || '', 'proposalTitle')}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-text-secondary hover:text-accent hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                      title="Copiar título"
                    >
                      {copiedField === 'proposalTitle' ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-text-primary mb-2">
                    {attachedProposal.talkTitle}
                  </p>
                </div>

                {/* Descripción - Copiable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-text-secondary">Descripción</p>
                    <button
                      onClick={() => copyToClipboard(attachedProposal.talkDescription || '', 'proposalDescription')}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-text-secondary hover:text-accent hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                      title="Copiar descripción"
                    >
                      {copiedField === 'proposalDescription' ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm sm:text-base text-text-secondary whitespace-pre-wrap">
                    {attachedProposal.talkDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-text-primary">{attachedProposal.duration} minutos</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="text-text-primary capitalize">{attachedProposal.targetAudience?.toLowerCase()}</span>
                  </div>

                  {attachedProposal.proposedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span className="text-text-primary">
                        {formatProposedDateUTC(attachedProposal.proposedDate)}
                      </span>
                    </div>
                  )}
                </div>

                {linkedProposal && (
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-medium">Estado:</span> {linkedProposal.status === 'PENDING' ? '⏳ Pendiente' : linkedProposal.status}
                      </div>
                      <a
                        href={`/admin/talk-proposals?id=${linkedProposal.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Ver Propuesta Completa
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {!linkedProposal && application.hasAttachedProposal && isApproved && (
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                    <div className="text-sm text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 rounded-lg p-3">
                      <span className="font-medium">💡 Nota:</span> Al aprobar esta aplicación, se creará automáticamente una TalkProposal basada en esta propuesta adjunta.
                    </div>
                  </div>
                )}

                {loadingProposal && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando propuesta vinculada...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivación - Copiable */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-text-primary">Motivación</h3>
              </div>
              <button
                onClick={() => copyToClipboard(application.motivation, 'motivation')}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-secondary/30 rounded transition-colors"
                title="Copiar motivación"
              >
                {copiedField === 'motivation' ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-background rounded-lg p-4 theme-transition">
              <p className="text-text-primary whitespace-pre-wrap text-sm sm:text-base">
                {application.motivation}
              </p>
            </div>
          </div>

          {/* Temas */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-text-primary">Temas de interés</h3>
              </div>
              {application.topics && application.topics.length > 0 && (
                <button
                  onClick={() => copyToClipboard(application.topics?.filter(Boolean).join(', ') || '', 'topics')}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-secondary/30 rounded transition-colors"
                  title="Copiar temas"
                >
                  {copiedField === 'topics' ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {application.topics?.map((topic: string | null, index: number) => (
                topic && (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-accent/20 text-accent rounded-full text-sm font-medium theme-transition"
                  >
                    {topic}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Experiencia - Copiable */}
          {application.experience && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-text-primary">Experiencia</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(application.experience || '', 'experience')}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-secondary/30 rounded transition-colors"
                  title="Copiar experiencia"
                >
                  {copiedField === 'experience' ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-background rounded-lg p-4 theme-transition">
                <p className="text-text-primary whitespace-pre-wrap text-sm sm:text-base">
                  {application.experience}
                </p>
              </div>
            </div>
          )}

          {/* Links a charlas anteriores */}
          {application.previousTalksLinks && application.previousTalksLinks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-text-primary">Charlas anteriores</h3>
              </div>
              <div className="space-y-2">
                {application.previousTalksLinks.map((link: string | null, index: number) => (
                  link && (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-background rounded-lg hover:bg-secondary/30 transition-all theme-transition"
                    >
                      <p className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                        {link}
                      </p>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Información adicional (menos relevante) - Al final */}
          <div className="mb-6 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Información adicional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">User ID</p>
                <p className="text-xs text-text-primary font-mono break-all">{application.userId}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Fecha de envío</p>
                <p className="text-xs text-text-primary">{formatDate(application.submittedAt)}</p>
              </div>
              {application.reviewedAt && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-1">Fecha de revisión</p>
                  <p className="text-xs text-text-primary">{formatDate(application.reviewedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Razón de rechazo (si fue rechazada) */}
          {isRejected && application.rejectionReason && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Razón de rechazo</h3>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.rejectionReason}
                </p>
              </div>
            </div>
          )}

          {/* Formulario de rechazo */}
          {isPending && showRejectForm && (
            <div className="mb-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <Label htmlFor="rejectionReason" className="text-gray-900 dark:text-gray-100">
                  Razón del rechazo
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explica brevemente por qué se rechaza esta postulación. Este mensaje será enviado al usuario."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones - Sticky */}
        {isPending && (
          <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0 bg-surface">
            {!showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isApproving}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  disabled={isRejecting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmar Rechazo
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {!isPending && (
          <div className="px-4 sm:px-6 py-4 border-t border-border flex justify-end flex-shrink-0 bg-surface">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cerrar
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Dialog Renderer */}
      <DialogRenderer
        state={dialogState}
        onClose={closeDialog}
        onConfirm={handleConfirm}
      />

      {/* Modal de vista previa de foto */}
      {showPhotoModal && photoPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 bg-surface rounded-t-lg border-b border-border">
              <h3 className="text-text-primary font-semibold">
                Foto de {professionalProfile?.givenName} {professionalProfile?.familyName}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPhoto}
                  disabled={downloadingPhoto}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {downloadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Descargando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setPhotoPreviewUrl(null);
                  }}
                  className="p-2 hover:bg-background rounded-full transition-all"
                >
                  <X className="w-5 h-5 text-text-primary" />
                </button>
              </div>
            </div>
            
            {/* Imagen */}
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4">
              <img
                src={photoPreviewUrl}
                alt={`Foto de ${professionalProfile?.givenName} ${professionalProfile?.familyName}`}
                className="max-w-full max-h-[calc(90vh-80px)] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

