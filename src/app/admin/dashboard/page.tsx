'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { QuickStatsGrid } from '@/components/admin/QuickStatsGrid';
import { UnifiedApplicationCard } from '@/components/admin/UnifiedApplicationCard';
import { ProposalWaitingCard } from '@/components/admin/ProposalWaitingCard';
import { ActionTimeline } from '@/components/admin/ActionTimeline';
import { useDialog } from '@/hooks/useDialog';
import { DialogRenderer } from '@/components/ui/DialogRenderer';
import { Loader2, Home, TrendingUp, AlertCircle, Clipboard, Mic, MessageSquare, Calendar, Plus, Clock } from 'lucide-react';
import Link from 'next/link';
import { getIconColors } from '@/lib/iconColorUtils';

const client = generateClient<Schema>();

type SpeakerApplication = Schema['SpeakerApplication']['type'];
type TalkProposal = Schema['TalkProposal']['type'];
type Event = Schema['Event']['type'];

/**
 * 🏠 Admin Command Center - Dashboard Principal
 * 
 * Vista unificada de todas las acciones pendientes.
 * Permite gestionar speakers, propuestas y eventos desde un solo lugar.
 * 
 * FLUJO OPTIMIZADO:
 * - Aplicaciones con propuesta: 1 clic para aprobar todo
 * - Vista rápida de stats
 * - Timeline de acciones urgentes
 */
export default function AdminDashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { alert: showAlert, dialogState, handleClose, handleConfirm } = useDialog();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [speakerApplications, setSpeakerApplications] = useState<SpeakerApplication[]>([]);
  const [talkProposals, setTalkProposals] = useState<TalkProposal[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // Modal/view state
  const [selectedApplication, setSelectedApplication] = useState<SpeakerApplication | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  // Load all data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all data in parallel
      const [speakersResult, proposalsResult, eventsResult] = await Promise.all([
        client.models.SpeakerApplication.list({ limit: 1000 }),
        client.models.TalkProposal.list({ limit: 1000 }),
        client.models.Event.list({ limit: 1000 }),
      ]);

      if (speakersResult.errors?.length) {
        console.error('Errors loading speakers:', speakersResult.errors);
      }
      if (proposalsResult.errors?.length) {
        console.error('Errors loading proposals:', proposalsResult.errors);
      }
      if (eventsResult.errors?.length) {
        console.error('Errors loading events:', eventsResult.errors);
      }

      setSpeakerApplications(speakersResult.data || []);
      setTalkProposals(proposalsResult.data || []);
      setEvents(eventsResult.data || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && !authLoading) {
      loadDashboardData();
    }
  }, [isAdmin, authLoading, loadDashboardData]);

  // Calculate stats
  const pendingSpeakers = speakerApplications.filter(s => s.status === 'PENDING');
  const applicationsWithProposal = pendingSpeakers.filter(s => s.hasAttachedProposal);
  
  // Propuestas pendientes de evento (PENDING sin eventId, esperando que el wizard las apruebe y cree evento)
  const proposalsWaitingForEvent = talkProposals.filter(p => 
    p.status === 'PENDING' && !p.eventId
  );
  const pendingProposals = talkProposals.filter(p => p.status === 'PENDING');
  const draftEvents = events.filter(e => e.status === 'DRAFT');
  
  // Check-ins today (events happening today that are published)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const upcomingCheckins = events.filter(e => {
    if (e.status !== 'PUBLISHED') return false;
    const eventDate = new Date(e.startDate || '');
    return eventDate >= today && eventDate < tomorrow;
  }).length;

  // Handle approve all (speaker + proposal + event)
  const handleApproveAll = async (applicationId: string, userId: string) => {
    try {
      console.log('🎯 Aprobando todo:', { applicationId, userId });

      const response = await fetch('/api/admin/approve-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          userId,
          approvedBy: user?.userId || 'admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al procesar la aprobación');
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      // Retornar el talkProposalId para que el wizard lo use
      return result;
    } catch (error) {
      console.error('Error:', error);
      await showAlert(`Error al aprobar: ${error instanceof Error ? error.message : 'Error desconocido'}`, { variant: 'danger' });
      throw error;
    }
  };

  // Handle approve speaker only
  const handleApproveSpeakerOnly = async (applicationId: string, userId: string) => {
    try {
      console.log('🎯 Aprobando solo speaker:', { applicationId, userId });

      const response = await fetch('/api/admin/approve-speaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          userId,
          approvedBy: user?.userId || 'admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al aprobar el speaker');
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      await showAlert('Speaker aprobado correctamente.\n\nSe ha enviado un email de notificación.', { variant: 'success' });

      // Reload data
      await loadDashboardData();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error:', error);
      await showAlert(`Error al aprobar: ${error instanceof Error ? error.message : 'Error desconocido'}`, { variant: 'danger' });
      throw error;
    }
  };

  // Handle reject
  const handleReject = async (applicationId: string, userId: string, reason: string) => {
    try {
      console.log('❌ Rechazando aplicación:', { applicationId, userId, reason });

      const response = await fetch('/api/admin/reject-speaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          userId,
          rejectionReason: reason,
          rejectedBy: user?.userId || 'admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al rechazar la aplicación');
      }

      await showAlert('Aplicación rechazada.\n\nSe ha enviado un email con el feedback.', { variant: 'success' });

      // Reload data
      await loadDashboardData();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error:', error);
      await showAlert(`Error al rechazar: ${error instanceof Error ? error.message : 'Error desconocido'}`, { variant: 'danger' });
      throw error;
    }
  };

  if (authLoading || (isLoading && !error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${getIconColors('accent').bgColor}`}>
              <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${getIconColors('accent').textColor}`} />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-text-primary">
                Administrador
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                Dashboard de gestión
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <span>Resumen</span>
          </h2>
          <QuickStatsGrid
            newSpeakers={pendingSpeakers.length}
            pendingProposals={pendingProposals.length}
            draftEvents={draftEvents.length}
            upcomingCheckins={upcomingCheckins}
            isLoading={isLoading}
          />
        </div>

        {/* Priority: Applications with Proposals */}
        {applicationsWithProposal.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                <span className="text-xl sm:text-2xl">⭐</span>
                <span className="hidden sm:inline">Aplicaciones Completas</span>
                <span className="sm:hidden">Prioridad</span>
              </h2>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-bold rounded-full">
                {applicationsWithProposal.length}
              </span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {applicationsWithProposal.map((app) => (
                <UnifiedApplicationCard
                  key={app.id}
                  application={app}
                  onApproveAll={handleApproveAll}
                  onApproveSpeakerOnly={handleApproveSpeakerOnly}
                  onReject={handleReject}
                  onRefresh={loadDashboardData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Propuestas esperando evento - Speakers ya aprobados */}
        {proposalsWaitingForEvent.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="hidden sm:inline">Esperando Creación de Evento</span>
                <span className="sm:hidden">En Progreso</span>
              </h2>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs sm:text-sm font-bold rounded-full">
                {proposalsWaitingForEvent.length}
              </span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {proposalsWaitingForEvent.map((proposal) => {
                // Buscar la aplicación del speaker correspondiente
                const speakerApp = speakerApplications.find(app => app.userId === proposal.userId);
                
                if (!speakerApp) return null;
                
                return (
                  <ProposalWaitingCard
                    key={proposal.id}
                    proposal={proposal}
                    speakerApp={speakerApp}
                    onEventCreated={(eventId, published) => {
                      console.log(`✅ Evento ${published ? 'publicado' : 'creado'}: ${eventId}`);
                      loadDashboardData();
                    }}
                    onRefresh={loadDashboardData}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Action Timeline - Solo mostrar cuando hay eventos en borrador */}
        {draftEvents.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="hidden sm:inline">Eventos en Borrador</span>
              <span className="sm:hidden">Borradores</span>
            </h2>
            <ActionTimeline
              pendingSpeakers={[]} // No mostrar speakers aquí, ya están en otras secciones
              pendingProposals={[]} // No mostrar propuestas aquí, ya están en otras secciones
              draftEvents={draftEvents}
              onViewSpeaker={(app) => setSelectedApplication(app)}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Quick Access Links */}
        <div className="bg-surface rounded-lg p-4 sm:p-6 shadow-sm theme-transition">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-accent" />
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Link
              href="/admin/speakers"
              className="group p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-center"
            >
              <div className="mb-1 sm:mb-2 flex justify-center">
                <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-text-primary">Speakers</div>
            </Link>
            <Link
              href="/admin/talk-proposals"
              className="group p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-center"
            >
              <div className="mb-1 sm:mb-2 flex justify-center">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-text-primary">Propuestas</div>
            </Link>
            <Link
              href="/admin/events"
              className="group p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors text-center"
            >
              <div className="mb-1 sm:mb-2 flex justify-center">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-text-primary">Eventos</div>
            </Link>
            <Link
              href="/admin/events/new"
              className="group p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors text-center"
            >
              <div className="mb-1 sm:mb-2 flex justify-center">
                <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-text-primary line-clamp-1">Crear</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal for selected speaker (if needed) */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <UnifiedApplicationCard
                application={selectedApplication}
                onApproveAll={handleApproveAll}
                onApproveSpeakerOnly={handleApproveSpeakerOnly}
                onReject={handleReject}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
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
