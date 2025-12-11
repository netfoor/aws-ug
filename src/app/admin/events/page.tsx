'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { 
  Loader2, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const client = generateClient<Schema>();

type Event = Schema['Event']['type'];
type FilterStatus = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

/**
 * 🎯 Admin: Gestión de Eventos
 * 
 * Solo ADMINS pueden acceder.
 * Lista todos los eventos con opciones de publicar/cancelar/editar.
 */
export default function AdminEventsPage() {
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar permisos de admin
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && isAdmin) {
        loadEvents();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, isAdmin]);

  // Cargar eventos
  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, errors } = await client.models.Event.list();

      if (errors && errors.length > 0) {
        console.error('Errors loading events:', errors);
        setError('Error al cargar los eventos');
        return;
      }

      // Ordenar por fecha (más recientes primero)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateB - dateA;
      });

      setEvents(sorted);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Error al cargar los eventos');
    } finally {
      setIsLoading(false);
    }
  };

  // Publicar evento
  const handlePublish = async (eventId: string) => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, errors } = await client.models.Event.update({
        id: eventId,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
      });

      if (errors && errors.length > 0) {
        console.error('Errors publishing event:', errors);
        setError('Error al publicar el evento');
        return;
      }

      await loadEvents();
    } catch (err) {
      console.error('Error publishing event:', err);
      setError('Error al publicar el evento');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancelar evento
  const handleCancel = async (eventId: string) => {
    if (!confirm('¿Estás seguro de cancelar este evento?')) return;
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, errors } = await client.models.Event.update({
        id: eventId,
        status: 'CANCELLED',
      });

      if (errors && errors.length > 0) {
        console.error('Errors cancelling event:', errors);
        setError('Error al cancelar el evento');
        return;
      }

      await loadEvents();
    } catch (err) {
      console.error('Error cancelling event:', err);
      setError('Error al cancelar el evento');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrar eventos
  const filteredEvents = events.filter((event) => {
    if (filterStatus === 'ALL') return true;
    return event.status === filterStatus;
  });

  // Badge de estado
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Borrador
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3" />
            Publicado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Completado
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
          <Button variant="accent" onClick={() => window.location.href = '/dashboard'}>
            Volver al Dashboard
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
          {/* Título y descripción */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Gestión de Eventos
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base">
              Administra todos los eventos de la comunidad
            </p>
          </div>
          
          {/* Botones - responsive */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={loadEvents}
              disabled={isLoading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
              )}
              <span className="sm:inline hidden">Actualizar</span>
            </Button>
            
            <Link href="/admin/events/new" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo
              </Button>
            </Link>
            
            <Link href="/admin/talk-proposals" className="flex-1 sm:flex-initial">
              <Button variant="accent" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Crear desde Propuesta
              </Button>
            </Link>
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
            {(['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all theme-transition ${
                  filterStatus === status
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary hover:bg-secondary/30'
                }`}
              >
                {status === 'ALL' ? 'Todos' : 
                 status === 'DRAFT' ? 'Borradores' : 
                 status === 'PUBLISHED' ? 'Publicados' : 
                 status === 'CANCELLED' ? 'Cancelados' : 
                 'Completados'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de eventos */}
        {filteredEvents.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 text-center theme-transition">
            <Calendar className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No hay eventos
            </h3>
            <p className="text-text-secondary mb-6">
              {filterStatus === 'ALL' 
                ? 'Aún no hay eventos creados.' 
                : `No hay eventos con estado: ${filterStatus}`}
            </p>
            <Link href="/admin/talk-proposals">
              <Button variant="accent">
                <Plus className="w-4 h-4 mr-2" />
                Crear Evento desde Propuesta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-surface rounded-lg shadow hover:shadow-lg transition-all theme-transition p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text-primary mb-1 truncate">
                      {event.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Speaker: {event.speakerName}
                    </p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>

                {/* Descripción */}
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  {event.description}
                </p>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(event.startDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.goingCount || 0} registrados
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.topics?.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs theme-transition"
                    >
                      {topic}
                    </span>
                  ))}
                  {event.topics && event.topics.length > 3 && (
                    <span className="px-2 py-1 text-text-secondary text-xs">
                      +{event.topics.length - 3}
                    </span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <Link href={`/events/${event.slug}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </Link>

                  {event.status === 'DRAFT' && (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => event.id && handlePublish(event.id)}
                      disabled={isProcessing || !event.id}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Publicar
                    </Button>
                  )}

                  {event.status === 'PUBLISHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => event.id && handleCancel(event.id)}
                      disabled={isProcessing || !event.id}
                      className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1" />
                      )}
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
