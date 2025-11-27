'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import type { Schema } from '../../../amplify/data/resource';

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
              {application.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Detalle de Postulación
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {application.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{application.userId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{application.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de envío</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(application.submittedAt)}</p>
              </div>
            </div>

            {application.reviewedAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de revisión</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(application.reviewedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Motivación */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Motivación</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {application.motivation}
              </p>
            </div>
          </div>

          {/* Temas */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Temas de interés</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {application.topics?.map((topic: string | null, index: number) => (
                topic && (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium"
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
                <Award className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Experiencia</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.experience}
                </p>
              </div>
            </div>
          )}

          {/* Links a charlas anteriores */}
          {application.previousTalksLinks && application.previousTalksLinks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Charlas anteriores</h3>
              </div>
              <div className="space-y-2">
                {application.previousTalksLinks.map((link: string | null, index: number) => (
                  link && (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
