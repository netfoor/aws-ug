'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, Lightbulb, Clock, Users, CheckCircle, XCircle, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const client = generateClient<Schema>();

type TalkProposal = Schema['TalkProposal']['type'];

/**
 * 🎤 Mis Propuestas - Página para speakers
 * 
 * Muestra todas las propuestas de charlas del speaker actual.
 */
export default function MyProposalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [proposals, setProposals] = useState<TalkProposal[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Mostrar mensaje de éxito si viene de crear propuesta
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      loadProposals();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadProposals = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, errors } = await client.models.TalkProposal.list({
        filter: {
          userId: { eq: user.userId },
        },
      });

      if (errors && errors.length > 0) {
        console.error('Errors loading proposals:', errors);
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
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3" />
            En revisión
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
            Evento publicado
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Mis Propuestas de Charlas
            </h1>
            <p className="text-text-secondary">
              Gestiona tus propuestas enviadas
            </p>
          </div>
          <Button
            variant="accent"
            onClick={() => router.push('/speaker/propose-talk')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Propuesta
          </Button>
        </div>

        {/* Success message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg theme-transition">
            <p className="text-green-800 dark:text-green-200 font-semibold">
              ✅ ¡Propuesta enviada exitosamente! Los admins la revisarán pronto.
            </p>
          </div>
        )}

        {/* Lista */}
        {proposals.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 text-center theme-transition">
            <Lightbulb className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No tienes propuestas aún
            </h3>
            <p className="text-text-secondary mb-6">
              Comparte tu conocimiento con la comunidad
            </p>
            <Button
              variant="accent"
              onClick={() => router.push('/speaker/propose-talk')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primera propuesta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-surface rounded-lg shadow hover:shadow-lg transition-all theme-transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-text-primary mb-2">
                      {proposal.title}
                    </h3>
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {proposal.description}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {getStatusBadge(proposal.status)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {proposal.duration} minutos
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {proposal.targetAudience === 'ALL' ? 'Todos los niveles' : proposal.targetAudience}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Enviada: {formatDate(proposal.submittedAt)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {proposal.topics?.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs theme-transition"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {proposal.status === 'REJECTED' && proposal.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Razón del rechazo:</strong> {proposal.rejectionReason}
                    </p>
                  </div>
                )}

                {proposal.status === 'EVENT_CREATED' && proposal.eventId && (
                  <div className="mt-4">
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => router.push(`/events/${proposal.eventId}`)}
                    >
                      Ver Evento Publicado
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
