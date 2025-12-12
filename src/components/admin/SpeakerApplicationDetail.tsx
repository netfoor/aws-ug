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
  Building,
  ExternalLink,
  FileText,
  Lightbulb,
  Clock,
  Users,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { SpeakerPhotoPreview } from './SpeakerPhotoPreview';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

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
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [linkedProposal, setLinkedProposal] = useState<Schema['TalkProposal']['type'] | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

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
      alert('Error: Datos incompletos de la aplicación');
      return;
    }

    try {
      setIsApproving(true);
      await onApprove(application.id as string, application.userId as string);
      onClose();
    } catch (error) {
      console.error('Error al aprobar:', error);
      alert('Error al aprobar la postulación');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona una razón para el rechazo');
      return;
    }

    if (!application.id || !application.userId) {
      alert('Error: Datos incompletos de la aplicación');
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
      alert('Error al rechazar la postulación');
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = application.status === 'PENDING';
  const isApproved = application.status === 'APPROVED';
  const isRejected = application.status === 'REJECTED';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden theme-transition">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-white text-xl font-bold">
              {application.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Detalle de Postulación
              </h2>
              <p className="text-sm text-text-secondary">
                {application.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-all theme-transition"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Status Badge */}
          <div className="mb-6">
            {isApproved && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Postulación Aprobada</span>
              </div>
            )}
            {isRejected && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Postulación Rechazada</span>
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-secondary">User ID</p>
                <p className="text-sm text-text-primary font-mono">{application.userId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-secondary">Email</p>
                <p className="text-sm text-text-primary">{application.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-secondary">Fecha de envío</p>
                <p className="text-sm text-text-primary">{formatDate(application.submittedAt)}</p>
              </div>
            </div>

            {application.reviewedAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-text-secondary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-secondary">Fecha de revisión</p>
                  <p className="text-sm text-text-primary">{formatDate(application.reviewedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* 🆕 PERFIL PROFESIONAL */}
          {professionalProfile && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-text-primary text-lg">Perfil Profesional</h3>
              </div>

              <div className="flex gap-6">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <SpeakerPhotoPreview 
                    photoKey={professionalProfile.photoKey}
                    speakerName={`${professionalProfile.givenName || ''} ${professionalProfile.familyName || ''}`.trim()}
                    size="lg"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-lg font-bold text-text-primary">
                      {professionalProfile.givenName} {professionalProfile.familyName}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {professionalProfile.jobTitle || 'N/A'} @ {professionalProfile.company || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {professionalProfile.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span className="text-text-primary">{professionalProfile.phoneNumber}</span>
                      </div>
                    )}

                    {professionalProfile.expertiseArea && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <span className="text-text-primary">{professionalProfile.expertiseArea}</span>
                      </div>
                    )}

                    {professionalProfile.linkedInUrl && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <LinkIcon className="w-4 h-4 text-blue-600" />
                        <a 
                          href={professionalProfile.linkedInUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Ver perfil de LinkedIn
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {professionalProfile.cvKey && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-text-secondary">
                          CV disponible (Key: {professionalProfile.cvKey.split('/').pop()})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 PROPUESTA ADJUNTA */}
          {application.hasAttachedProposal && attachedProposal && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-text-primary text-lg">Propuesta de Charla Adjunta</h3>
                </div>
                <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full">
                  CON PROPUESTA
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-text-primary mb-1">
                    {attachedProposal.talkTitle}
                  </p>
                  <p className="text-sm text-text-secondary">
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
                        {new Date(attachedProposal.proposedDate).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {linkedProposal && (
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                    <a
                      href={`/admin/talk-proposals?id=${linkedProposal.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Ver Propuesta Completa
                      <ExternalLink className="w-4 h-4" />
                    </a>
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

          {/* Motivación */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-text-primary">Motivación</h3>
            </div>
            <div className="bg-background rounded-lg p-4 theme-transition">
              <p className="text-text-primary whitespace-pre-wrap">
                {application.motivation}
              </p>
            </div>
          </div>

          {/* Temas */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-text-primary">Temas de interés</h3>
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

          {/* Experiencia */}
          {application.experience && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-text-primary">Experiencia</h3>
              </div>
              <div className="bg-background rounded-lg p-4 theme-transition">
                <p className="text-text-primary whitespace-pre-wrap">
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

        {/* Footer con acciones */}
        {isPending && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            {!showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isApproving}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700"
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
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
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
          <div className="px-6 py-4 border-t border-border flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
