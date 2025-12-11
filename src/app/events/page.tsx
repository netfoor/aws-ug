'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

type Event = Schema['Event']['type'];

/**
 * 📅 Página Pública: Lista de Eventos
 * 
 * Muestra todos los eventos publicados de la comunidad.
 * Accesible para todos (guest y authenticated).
 */
export default function EventsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PUBLISHED' | 'UPCOMING'>('PUBLISHED');
  
  // Map de eventId -> coverImageUrl pública
  const [coverImageUrls, setCoverImageUrls] = useState<Record<string, string>>({});
  
  // Map de eventId -> contador real de asistentes
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    if (typeof window === 'undefined') return; // Solo ejecutar en cliente
    
    try {
      setIsLoading(true);
      setError(null);

      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Event.list();

      if (errors && errors.length > 0) {
        console.error('Errors loading events:', errors);
        setError('Error al cargar los eventos');
        return;
      }

      // Filtrar solo eventos públicos y publicados (guest no debe ver drafts)
      const publicEvents = data.filter(
        (event) => event.isPublic && event.status === 'PUBLISHED'
      );

      // Ordenar por fecha de inicio (próximos primero)
      const sorted = [...publicEvents].sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateA - dateB;
      });

      setEvents(sorted);
      
      // Cargar URLs de cover images
      loadCoverImages(sorted);
      
      // Cargar contadores reales de asistentes
      loadAttendeeCounts(sorted);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Error al cargar los eventos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCoverImages = async (eventsList: Event[]) => {
    const urls: Record<string, string> = {};
    
    await Promise.all(
      eventsList.map(async (event) => {
        if (event.coverImageUrl && event.id) {
          try {
            const urlResult = await getUrl({
              path: event.coverImageUrl,
              options: {
                expiresIn: 3600 // 1 hora
              }
            });
            urls[event.id] = urlResult.url.toString();
          } catch (err) {
            console.warn(`Error obteniendo URL de cover para evento ${event.id}:`, err);
          }
        }
      })
    );
    
    setCoverImageUrls(urls);
  };

  const loadAttendeeCounts = async (eventsList: Event[]) => {
    const client = generateClient<Schema>();
    const counts: Record<string, number> = {};
    
    await Promise.all(
      eventsList.map(async (event) => {
        if (event.id) {
          try {
            const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
              eventId: event.id,
            });
            
            // Contar solo los que confirmaron asistencia (status === 'GOING')
            const goingCount = registrations?.filter((r) => r.status === 'GOING').length || 0;
            counts[event.id] = goingCount;
          } catch (err) {
            console.warn(`Error obteniendo registros para evento ${event.id}:`, err);
            counts[event.id] = 0;
          }
        }
      })
    );
    
    setAttendeeCounts(counts);
  };

  // Filtrar eventos por búsqueda
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === '' ||
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.speakerName?.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    const eventDate = new Date(event.startDate || 0);

    const matchesFilter =
      filterStatus === 'ALL' ||
      (filterStatus === 'PUBLISHED' && event.status === 'PUBLISHED') ||
      (filterStatus === 'UPCOMING' && eventDate > now);

    return matchesSearch && matchesFilter;
  });

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha por definir';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calcular duración
  const getDuration = (startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} min`;
    return `${Math.round(diffMinutes / 60)} h`;
  };

  // Badge de estado
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Calendar className="w-3 h-3" />
            Publicado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 dark:from-blue-700 dark:via-purple-700 dark:to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Eventos de la Comunidad
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Descubre charlas, workshops y meetups sobre AWS y tecnología
            </p>

            {/* Búsqueda */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="mb-6 bg-surface rounded-lg p-4 shadow theme-transition">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-text-secondary" />
            <span className="font-semibold text-text-primary">Filtrar:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-accent text-white'
                  : 'bg-background text-text-secondary hover:bg-secondary/30'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('PUBLISHED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'PUBLISHED'
                  ? 'bg-accent text-white'
                  : 'bg-background text-text-secondary hover:bg-secondary/30'
              }`}
            >
              Publicados
            </button>
            <button
              onClick={() => setFilterStatus('UPCOMING')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'UPCOMING'
                  ? 'bg-accent text-white'
                  : 'bg-background text-text-secondary hover:bg-secondary/30'
              }`}
            >
              Próximos
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Lista de eventos */}
        {filteredEvents.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 text-center theme-transition">
            <Calendar className="w-16 h-16 text-text-secondary/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No hay eventos disponibles
            </h3>
            <p className="text-text-secondary mb-6">
              {searchQuery
                ? 'Intenta con otra búsqueda'
                : 'Aún no hay eventos publicados. ¡Pronto habrá nuevos eventos de la comunidad!'}
            </p>
            {isAuthenticated && (
              <Link href="/speaker/propose-talk">
                <Button variant="accent">
                  Proponer una Charla
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const now = new Date();
              const eventDate = new Date(event.startDate || 0);
              const isPast = eventDate < now;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group"
                >
                  <div className="bg-surface rounded-lg shadow hover:shadow-xl transition-all theme-transition overflow-hidden h-full flex flex-col">
                    {/* Cover Image */}
                    {event.id && coverImageUrls[event.id] ? (
                      <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={coverImageUrls[event.id]}
                          alt={event.title || 'Evento'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-accent/50" />
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="p-6 flex-1 flex flex-col">
                      {/* Badge de estado */}
                      <div className="mb-3">{getStatusBadge(event.status)}</div>

                      {/* Título */}
                      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Speaker */}
                      <p className="text-sm text-text-secondary mb-3">
                        Por: <span className="font-semibold">{event.speakerName}</span>
                      </p>

                      {/* Descripción */}
                      <p className="text-sm text-text-secondary mb-4 line-clamp-3 flex-1">
                        {event.description}
                      </p>

                      {/* Metadata */}
                      <div className="space-y-2 text-sm text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span className={isPast ? 'line-through opacity-60' : ''}>
                            {formatDate(event.startDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>
                            {getDuration(event.startDate, event.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-accent" />
                          <span>
                            {attendeeCounts[event.id!] || 0} asistente{attendeeCounts[event.id!] !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Topics */}
                      {event.topics && event.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {event.topics.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs"
                            >
                              {topic}
                            </span>
                          ))}
                          {event.topics.length > 3 && (
                            <span className="px-2 py-1 text-text-secondary text-xs">
                              +{event.topics.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA para speakers */}
        {isAuthenticated && (
          <div className="mt-12 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-8 text-center border border-accent/20">
            <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              ¿Quieres dar una charla?
            </h3>
            <p className="text-text-secondary mb-6">
              Comparte tu conocimiento con la comunidad AWS Puebla
            </p>
            <Link href="/speaker/propose-talk">
              <Button variant="accent" size="lg">
                Proponer Charla
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
