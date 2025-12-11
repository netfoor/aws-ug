'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  User,
  ArrowLeft,
  Share2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Event = Schema['Event']['type'];
type EventRegistration = Schema['EventRegistration']['type'];

/**
 * 📅 Página Pública: Detalle de Evento
 * 
 * Vista completa de un evento individual con:
 * - Información del speaker
 * - Fecha, ubicación, descripción
 * - Botones GOING/NOT_GOING para registrarse
 * - Lista de asistentes confirmados
 */
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user, userAttributes, isAuthenticated, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de registro del usuario
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Lista de asistentes
  const [attendees, setAttendees] = useState<EventRegistration[]>([]);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  
  // Cover image URL pública
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadEventDetails();
    }
  }, [slug, user]);

  const loadEventDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const client = generateClient<Schema>();

      // 1. Buscar evento por slug
      const { data: events, errors: eventErrors } = await client.models.Event.eventBySlug({
        slug: slug,
      });

      if (eventErrors || !events || events.length === 0) {
        setError('Evento no encontrado');
        setIsLoading(false);
        return;
      }

      const eventData = events[0];
      setEvent(eventData);

      // 1.5. Cargar cover image URL si existe
      if (eventData.coverImageUrl) {
        try {
          const urlResult = await getUrl({
            path: eventData.coverImageUrl,
            options: {
              expiresIn: 3600 // 1 hora
            }
          });
          setCoverImageUrl(urlResult.url.toString());
        } catch (err) {
          console.warn('Error obteniendo URL de cover image:', err);
        }
      }

      // 2. Cargar registros del evento (asistentes)
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventData.id!,
      });

      if (registrations) {
        // Filtrar solo los que van (GOING)
        const going = registrations.filter((r: EventRegistration) => r.status === 'GOING');
        setAttendees(going);

        // Buscar registro del usuario actual
        if (user?.userId) {
          const myRegistration = registrations.find((r: EventRegistration) => r.userId === user.userId);
          setUserRegistration(myRegistration || null);
        }
      }

    } catch (err) {
      console.error('Error cargando evento:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (status: 'GOING' | 'NOT_GOING') => {
    if (!isAuthenticated || !user || !event) {
      router.push('/auth/signin');
      return;
    }

    try {
      setIsRegistering(true);
      const client = generateClient<Schema>();

      // Si ya tiene registro, actualizar
      if (userRegistration) {
        await client.models.EventRegistration.update({
          id: userRegistration.id,
          status: status,
        });

        console.log(`✅ Registro actualizado a ${status}`);

        // 🔔 Notificación de cambio de estado
        try {
          await client.models.Notification.create({
            userId: user.userId,
            type: status === 'GOING' ? 'NEW_EVENT' : 'COMMENT',
            title: status === 'GOING' ? '✅ Registro confirmado' : '❌ Registro cancelado',
            message: status === 'GOING' 
              ? `Te esperamos en "${event.title}"`
              : `Has cancelado tu asistencia a "${event.title}"`,
            read: false,
            link: `/events/${event.slug}`,
            icon: status === 'GOING' ? '🎟️' : '🚫',
            createdAt: new Date().toISOString(),
            owner: user.userId,
          });
          console.log('✅ Notificación de cambio enviada');
        } catch (notifError) {
          console.warn('⚠️ Error creando notificación (no crítico):', notifError);
        }

      } else {
        // Crear nuevo registro
        const qrToken = `${event.id}-${user.userId}-${Date.now()}`;
        const givenName = String(userAttributes?.['custom:givenName'] || '');
        const familyName = String(userAttributes?.['custom:familyName'] || '');
        const userEmail = String(userAttributes?.email || '');
        const avatarUrl = userAttributes?.['custom:avatarUrl'] ? String(userAttributes['custom:avatarUrl']) : undefined;
        
        await client.models.EventRegistration.create({
          eventId: event.id!,
          userId: user.userId,
          status: status,
          userName: `${givenName} ${familyName}`.trim(),
          userEmail: userEmail,
          userAvatar: avatarUrl,
          qrCodeToken: qrToken,
          registeredAt: new Date().toISOString(),
          checkedIn: false,
          owner: user.userId,
        });

        console.log(`✅ Nuevo registro creado: ${status}`);

        // 🔔 Notificación de nuevo registro
        if (status === 'GOING') {
          try {
            await client.models.Notification.create({
              userId: user.userId,
              type: 'NEW_EVENT',
              title: '🎉 ¡Registro confirmado!',
              message: `Te has registrado para "${event.title}". Revisa los detalles del evento y marca tu calendario.`,
              read: false,
              link: `/events/${event.slug}`,
              icon: '🎟️',
              createdAt: new Date().toISOString(),
              owner: user.userId,
            });
            console.log('✅ Notificación de registro enviada');
          } catch (notifError) {
            console.warn('⚠️ Error creando notificación (no crítico):', notifError);
          }
        }

        // 📊 Actualizar contadores del evento
        try {
          const currentGoingCount = event.goingCount ?? 0;
          const currentNotGoingCount = event.notGoingCount ?? 0;
          const newCount = status === 'GOING' ? currentGoingCount + 1 : currentNotGoingCount + 1;
          
          await client.models.Event.update({
            id: event.id,
            goingCount: status === 'GOING' ? newCount : currentGoingCount,
            notGoingCount: status === 'NOT_GOING' ? newCount : currentNotGoingCount,
          });
          console.log(`✅ Contador actualizado: ${status} = ${newCount}`);
        } catch (updateError) {
          console.warn('⚠️ Error actualizando contadores (no crítico):', updateError);
        }
      }

      // Recargar datos
      await loadEventDetails();

    } catch (err) {
      console.error('Error al registrarse:', err);
      setError('Error al registrar tu asistencia. Intenta de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a', { locale: es });
    } catch {
      return dateString;
    }
  };

  const isEventPast = () => {
    if (!event?.endDate) return false;
    return new Date(event.endDate) < new Date();
  };

  const isEventFull = () => {
    if (!event || event.isUnlimited) return false;
    if (!event.maxAttendees) return false;
    return attendees.length >= event.maxAttendees;
  };

  const canRegister = () => {
    if (!isAuthenticated) return false;
    if (isEventPast()) return false;
    if (event?.status !== 'PUBLISHED') return false;
    return true;
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando evento...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {error || 'Evento no encontrado'}
          </h1>
          <p className="text-text-secondary mb-6">
            El evento que buscas no existe o no está disponible.
          </p>
          <Link href="/events">
            <Button variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver todos los eventos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPast = isEventPast();
  const isFull = isEventFull();
  const isGoing = userRegistration?.status === 'GOING';
  const isNotGoing = userRegistration?.status === 'NOT_GOING';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/events" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary theme-transition mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a eventos</span>
          </Link>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Image (si existe) */}
        {coverImageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img 
              src={coverImageUrl} 
              alt={event.title}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Título y Estado */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-text-primary">
              {event.title}
            </h1>
            
            {isPast && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Finalizado
              </span>
            )}
            {!isPast && event.status === 'PUBLISHED' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Próximamente
              </span>
            )}
          </div>

          {/* Tipo de evento */}
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
              {event.eventType}
            </span>
            {event.topics && event.topics.map((topic, idx) => (
              <span key={idx} className="px-2 py-1 bg-surface-secondary rounded text-sm">
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Información del Speaker */}
        <div className="bg-surface rounded-lg p-6 mb-6 border border-border">
          <div className="flex items-start gap-4">
            {event.speakerAvatar ? (
              <img 
                src={event.speakerAvatar} 
                alt={event.speakerName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {event.speakerName}
              </h3>
              <p className="text-text-secondary text-sm mb-2">{event.speakerEmail}</p>
              {event.speakerBio && (
                <p className="text-text-secondary text-sm">{event.speakerBio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Detalles del Evento */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Fecha */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Fecha</p>
                <p className="font-medium text-text-primary">{formatDate(event.startDate)}</p>
              </div>
            </div>
          </div>

          {/* Horario */}
          <div className="bg-surface rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Horario</p>
                <p className="font-medium text-text-primary">
                  {formatTime(event.startDate)} - {formatTime(event.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-surface rounded-lg p-4 border border-border md:col-span-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-text-secondary">Ubicación</p>
                <p className="font-medium text-text-primary">{event.location}</p>
                {event.locationAddress && (
                  <p className="text-sm text-text-secondary mt-1">{event.locationAddress}</p>
                )}
                {event.isVirtual && event.virtualLink && (
                  <a 
                    href={event.virtualLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Unirse al evento virtual
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Capacidad */}
          <div className="bg-surface rounded-lg p-4 border border-border md:col-span-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-text-secondary">Asistentes confirmados</p>
                <p className="font-medium text-text-primary">
                  {attendees.length} {event.maxAttendees && !event.isUnlimited ? `/ ${event.maxAttendees}` : ''} personas
                  {isFull && <span className="text-red-500 ml-2">(Cupo lleno)</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-surface rounded-lg p-6 mb-6 border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Acerca de este evento</h2>
          <div className="prose prose-sm max-w-none text-text-secondary">
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>
        </div>

        {/* Botones de Registro */}
        {canRegister() && (
          <div className="bg-surface rounded-lg p-6 mb-6 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              ¿Asistirás a este evento?
            </h3>
            
            {!isAuthenticated ? (
              <div className="text-center py-4">
                <p className="text-text-secondary mb-4">Inicia sesión para registrarte</p>
                <Link href="/auth/signin">
                  <Button variant="primary">Iniciar Sesión</Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  variant={isGoing ? 'primary' : 'outline'}
                  onClick={() => handleRegister('GOING')}
                  disabled={isRegistering || (isFull && !isGoing)}
                  className="flex-1"
                >
                  {isRegistering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isGoing ? 'Confirmado ✓' : isFull ? 'Cupo lleno' : 'Voy a asistir'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleRegister('NOT_GOING')}
                  disabled={isRegistering}
                  className={`flex-1 ${isNotGoing ? 'border-red-500 text-red-500 hover:bg-red-50' : ''}`}
                >
                  {isRegistering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <XCircle className="w-4 h-4 mr-2" />
                  {isNotGoing ? 'No asistiré' : 'No puedo asistir'}
                </Button>
              </div>
            )}

            {userRegistration && (
              <p className="text-sm text-text-secondary mt-3 text-center">
                {isGoing && '¡Genial! Nos vemos en el evento 🎉'}
                {isNotGoing && 'Entendido, será para la próxima 👋'}
              </p>
            )}
          </div>
        )}

        {isPast && (
          <div className="bg-surface rounded-lg p-6 mb-6 border border-border text-center">
            <p className="text-text-secondary">Este evento ya finalizó</p>
          </div>
        )}

        {/* Lista de Asistentes */}
        {attendees.length > 0 && (
          <div className="bg-surface rounded-lg p-6 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Asistentes confirmados ({attendees.length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {attendees.slice(0, showAllAttendees ? attendees.length : 8).map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-2">
                  {attendee.userAvatar ? (
                    <img 
                      src={attendee.userAvatar} 
                      alt={attendee.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <span className="text-sm text-text-primary truncate">{attendee.userName}</span>
                </div>
              ))}
            </div>

            {attendees.length > 8 && (
              <button
                onClick={() => setShowAllAttendees(!showAllAttendees)}
                className="text-primary hover:underline text-sm mt-4"
              >
                {showAllAttendees ? 'Ver menos' : `Ver todos (${attendees.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
