'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, ShieldAlert, Lightbulb, Clock, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import Label from '@/components/ui/label';
import CreateEventModal from '@/components/CreateEventModal';

const client = generateClient<Schema>();

type TalkProposal = Schema['TalkProposal']['type'];
type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EVENT_CREATED';

/**
 * 🎯 Admin: Gestión de Propuestas de Charlas
 * 
 * Solo ADMINS pueden acceder.
 * Lista todas las propuestas de charlas con opciones de aprobar/rechazar.
 */
export default function TalkProposalsAdminPage() {
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [proposals, setProposals] = useState<TalkProposal[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [selectedProposal, setSelectedProposal] = useState<TalkProposal | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar permisos de admin
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && isAdmin) {
        loadProposals();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, isAdmin]);

  // Cargar propuestas
  const loadProposals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, errors } = await client.models.TalkProposal.list();

      if (errors && errors.length > 0) {
        console.error('Errors loading proposals:', errors);
        setError('Error al cargar las propuestas');
        return;
      }

      // Ordenar por fecha (más recientes primero)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });

      setProposals(sorted);
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError('Error al cargar las propuestas');
    } finally {
      setIsLoading(false);
    }
  };

  // Aprobar propuesta
  const handleApprove = async (proposalId: string) => {
    if (!user) return;

    setIsProcessing(true);
    try {
      // Encontrar la propuesta para obtener datos del speaker
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        setError('Propuesta no encontrada');
        return;
      }

      const { errors } = await client.models.TalkProposal.update({
        id: proposalId,
        status: 'APPROVED',
        reviewedBy: user.userId,
        reviewedAt: new Date().toISOString(),
      });

      if (errors && errors.length > 0) {
        console.error('Errors approving proposal:', errors);
        setError('Error al aprobar la propuesta');
        return;
      }

      // 🔔 Notificar al speaker
      try {
        await client.models.Notification.create({
          userId: proposal.userId,
          type: 'NEW_EVENT',
          title: '✅ ¡Propuesta aprobada!',
          message: `Tu propuesta "${proposal.title}" ha sido aprobada. Pronto la convertiremos en un evento.`,
          read: false,
          link: '/speaker/my-proposals',
          icon: '🎉',
          createdAt: new Date().toISOString(),
            owner: proposal.userId,
          });
        } catch {
          // No bloquear si falla la notificación
        }      // Recargar lista
      await loadProposals();
      setSelectedProposal(null);
    } catch (err) {
      console.error('Error approving proposal:', err);
      setError('Error al aprobar la propuesta');
    } finally {
      setIsProcessing(false);
    }
  };

  // Rechazar propuesta
  const handleReject = async () => {
    if (!selectedProposal || !user || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const { errors } = await client.models.TalkProposal.update({
        id: selectedProposal.id,
        status: 'REJECTED',
        reviewedBy: user.userId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
      });

      if (errors && errors.length > 0) {
        console.error('Errors rejecting proposal:', errors);
        setError('Error al rechazar la propuesta');
        return;
      }

      // 🔔 Notificar al speaker sobre el rechazo
      try {
        await client.models.Notification.create({
          userId: selectedProposal.userId,
          type: 'COMMENT',
          title: '❌ Propuesta no aprobada',
          message: `Tu propuesta "${selectedProposal.title}" no fue aprobada. Razón: ${rejectionReason.trim()}`,
          read: false,
          link: '/speaker/my-proposals',
          icon: '💬',
          createdAt: new Date().toISOString(),
          owner: selectedProposal.userId,
        });
      } catch (notifyError) {
        console.warn('⚠️ Error al notificar speaker (no crítico):', notifyError);
      }

      // Recargar lista
      await loadProposals();
      setSelectedProposal(null);
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      setError('Error al rechazar la propuesta');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrar propuestas
  const filteredProposals = proposals.filter((proposal) => {
    if (filterStatus === 'ALL') return true;
    return proposal.status === filterStatus;
  });

  // Badge de estado
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3" />
            Aprobada
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3" />
            Rechazada
          </span>
        );
      case 'EVENT_CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Calendar className="w-3 h-3" />
            Evento Creado
          </span>
        );
      default:
        return null;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // No es admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Acceso Denegado
          </h1>
          <p className="text-text-secondary mb-6">
            No tienes permisos para acceder a esta página.
          </p>
          <Button variant="accent" onClick={() => window.location.href = '/'}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      {/* Header */}
      <div className="bg-surface border-b border-border theme-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Propuestas de Charlas
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base">
              Gestión de propuestas de speakers
            </p>
          </div>
          
          {/* Botón - responsive */}
          <div className="mt-4">
            <Button
              onClick={loadProposals}
              disabled={isLoading}
              variant="accent"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 16h5v5"/>
                  </svg>
                  Actualizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg theme-transition">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 bg-surface rounded-lg p-4 shadow theme-transition">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EVENT_CREATED'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all theme-transition ${
                  filterStatus === status
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary hover:bg-secondary/30'
                }`}
              >
                {status === 'ALL' ? 'Todas' : 
                 status === 'PENDING' ? 'Pendientes' : 
                 status === 'APPROVED' ? 'Aprobadas' : 
                 status === 'REJECTED' ? 'Rechazadas' : 
                 'Con Evento'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de propuestas */}
        {filteredProposals.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 text-center theme-transition">
            <Lightbulb className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No hay propuestas
            </h3>
            <p className="text-text-secondary">
              {filterStatus === 'ALL' 
                ? 'Aún no hay propuestas de charlas.' 
                : `No hay propuestas con estado: ${filterStatus}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-surface rounded-lg shadow hover:shadow-lg transition-all theme-transition p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text-primary mb-1 truncate">
                      {proposal.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Por: {proposal.speakerName}
                    </p>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>

                {/* Descripción */}
                <p className="text-sm text-text-secondary mb-4 line-clamp-3">
                  {proposal.description}
                </p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-xs text-text-secondary mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {proposal.duration} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {proposal.targetAudience === 'ALL' ? 'Todos' : proposal.targetAudience}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(proposal.submittedAt)}
                  </div>
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {proposal.topics?.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs theme-transition"
                    >
                      {topic}
                    </span>
                  ))}
                  {proposal.topics && proposal.topics.length > 3 && (
                    <span className="px-2 py-1 text-text-secondary text-xs">
                      +{proposal.topics.length - 3}
                    </span>
                  )}
                </div>

                {/* Acciones */}
                {proposal.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowRejectModal(true);
                      }}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => proposal.id && handleApprove(proposal.id)}
                      disabled={isProcessing || !proposal.id}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Aprobar
                    </Button>
                  </div>
                )}

                {proposal.status === 'APPROVED' && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setShowCreateEventModal(true);
                    }}
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Crear Evento
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de rechazo */}
      {showRejectModal && selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6 theme-transition">
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Rechazar Propuesta
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Propuesta: <strong>{selectedProposal.title}</strong>
            </p>

            <div className="mb-6">
              <Label htmlFor="reason">Razón del rechazo *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica brevemente por qué se rechaza esta propuesta..."
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedProposal(null);
                }}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    Rechazar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear evento */}
      {showCreateEventModal && selectedProposal && (
        <CreateEventModal
          proposal={selectedProposal}
          isOpen={showCreateEventModal}
          onClose={() => {
            setShowCreateEventModal(false);
            setSelectedProposal(null);
          }}
          onSuccess={() => {
            loadProposals(); // Recargar lista para ver el nuevo estado
          }}
        />
      )}
    </div>
  );
}
