'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '@/../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import Image from 'next/image';
// import Link from 'next/link'; // Unused import
import { Calendar, Clock, MapPin, Share2, Plus, Mail, Loader2, Users, Tag, ClipboardList, MessageSquare, Edit, UserPlus, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QRTicketModal, TicketStatus } from '@/components/events';
import { useQRTicket } from '@/hooks';
import { getIconColors } from '@/lib/iconColorUtils';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];
type UserType = Schema['User']['type'];

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [speaker, setSpeaker] = useState<UserType | null>(null);
  const [admins, setAdmins] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Hook para manejar el ticket QR del usuario
  const {
    registration,
    isLoading: ticketLoading,
    error: ticketError,
    hasTicket,
    hasValidToken,
    regenerateToken,
  } = useQRTicket({
    eventId: event?.id || '',
    userId: user?.userId || '',
  });

  useEffect(() => {
    if (slug) {
      loadEventDetails();
      loadAdmins();
    }
  }, [slug]);

  async function loadEventDetails() {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar evento por slug
      const { data: events, errors } = await client.models.Event.list({
        filter: { slug: { eq: slug } }
      });

      if (errors && errors.length > 0) {
        console.error('Error loading event:', errors);
        setError('Error al cargar el evento');
        return;
      }

      if (!events || events.length === 0) {
        setError('Evento no encontrado');
        return;
      }

      const eventData = events[0];
      setEvent(eventData);

      // Cargar cover image URL
      if (eventData.coverImageUrl) {
        loadCoverImage(eventData.coverImageUrl);
      }

      // Cargar datos del speaker
      if (eventData.speakerId) {
        const { data: speakerData } = await client.models.User.get({ id: eventData.speakerId });
        if (speakerData) {
          setSpeaker(speakerData);
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCoverImage(imagePath: string) {
    try {
      const urlResult = await getUrl({
        path: imagePath,
        options: {
          expiresIn: 3600 // 1 hora
        }
      });
      setCoverImageUrl(urlResult.url.toString());
    } catch (err) {
      console.warn('Error loading cover image URL:', err);
      setCoverImageUrl(null);
    }
  }

  async function loadAdmins() {
    try {
      const { data: users } = await client.models.User.list({
        filter: { role: { eq: 'ADMIN' } }
      });
      
      if (users) {
        setAdmins(users);
      }
    } catch (err) {
      console.error('Error loading admins:', err);
    }
  }

  const handleRegister = () => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=/events/${slug}/register`);
    } else {
      router.push(`/events/${slug}/register`);
    }
  };

  const handleContact = () => {
    if (event?.speakerEmail) {
      window.location.href = `mailto:${event.speakerEmail}`;
    }
  };

  const handleShowTicket = () => {
    setShowTicketModal(true);
  };

  const handleRegenerateTicket = async () => {
    try {
      await regenerateToken();
    } catch (error) {
      console.error('Error regenerating ticket:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: url,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Copiar al clipboard
      navigator.clipboard.writeText(url);
      alert('Link copiado al clipboard');
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    
    // Generar link de Google Calendar
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {error || 'Evento no encontrado'}
          </h1>
          <p className="text-text-secondary mb-6">
            El evento que buscas no existe o ha sido eliminado.
          </p>
          <Button variant="accent" onClick={() => router.push('/events')}>
            Ver todos los eventos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Regresar</span>
        </button>
      </div>

      {/* Cover Image */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="relative w-full h-[45vh] bg-surface rounded-3xl overflow-hidden">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={event.title}
            fill
            className="object-cover rounded-b-3xl"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary/20 rounded-b-3xl">
            <Calendar className="w-20 h-20 text-accent/50" />
          </div>
        )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Event Title */}
        <div className="bg-transparent p-6 mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-3 break-words">
            {event.title}
          </h1>
          
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm capitalize">{formatDate(event.startDate)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-text-secondary mb-4">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {formatTime(event.startDate)} - {formatTime(event.endDate)}
            </span>
          </div>

          {/* Event Type Badge */}
          {event.eventType && (
            <Badge variant="accent" size="md" className="mb-4">
              {event.eventType}
            </Badge>
          )}

          {/* Action Buttons */}
          {isAdmin ? (
            /* Admin Buttons */
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => router.push(`/admin/events/${event.id}/checkin`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-accent" />
                </div>
                <span className="text-xs font-medium text-text-primary">Check-in</span>
              </button>

              <button
                onClick={() => router.push(`/admin/events/${event.id}/questions`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
              >
                <div className={`w-10 h-10 rounded-full ${getIconColors('blue').bgColor} flex items-center justify-center`}>
                  <MessageSquare className={`w-5 h-5 ${getIconColors('blue').textColor}`} />
                </div>
                <span className="text-xs font-medium text-text-primary">Preguntas</span>
              </button>

              <button
                onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
              >
                <div className={`w-10 h-10 rounded-full ${getIconColors('orange').bgColor} flex items-center justify-center`}>
                  <Edit className={`w-5 h-5 ${getIconColors('orange').textColor}`} />
                </div>
                <span className="text-xs font-medium text-text-primary">Editar</span>
              </button>

              <button
                onClick={() => router.push(`/admin/events/${event.id}/attendees`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
              >
                <div className={`w-10 h-10 rounded-full ${getIconColors('purple').bgColor} flex items-center justify-center`}>
                  <UserPlus className={`w-5 h-5 ${getIconColors('purple').textColor}`} />
                </div>
                <span className="text-xs font-medium text-text-primary">Invitados</span>
              </button>
            </div>
          ) : (
            /* Member Buttons */
            <div className="grid grid-cols-4 gap-3">
            <button
              onClick={hasTicket ? handleShowTicket : handleRegister}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                {hasTicket ? (
                  <Ticket className="w-5 h-5 text-accent" />
                ) : (
                  <Users className="w-5 h-5 text-accent" />
                )}
              </div>
              <span className="text-xs font-medium text-text-primary">
                {hasTicket ? 'Mi Ticket' : 'Registro'}
              </span>
            </button>

            <button
              onClick={handleContact}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${getIconColors('blue').bgColor} flex items-center justify-center`}>
                <Mail className={`w-5 h-5 ${getIconColors('blue').textColor}`} />
              </div>
              <span className="text-xs font-medium text-text-primary">Contacto</span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${getIconColors('green').bgColor} flex items-center justify-center`}>
                <Share2 className={`w-5 h-5 ${getIconColors('green').textColor}`} />
              </div>
              <span className="text-xs font-medium text-text-primary">Compartir</span>
            </button>

            <button
              onClick={handleAddToCalendar}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-hover hover:bg-border transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${getIconColors('purple').bgColor} flex items-center justify-center`}>
                <Plus className={`w-5 h-5 ${getIconColors('purple').textColor}`} />
              </div>
              <span className="text-xs font-medium text-text-primary">Agregar</span>
            </button>
          </div>
          )}

          {/* Capacity Info */}
          {!event.isUnlimited && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Asistentes confirmados</span>
                <span className="font-semibold text-text-primary">
                  {event.goingCount || 0}
                  {event.maxAttendees && ` / ${event.maxAttendees}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Topics */}
        {event.topics && event.topics.length > 0 && (
          <div className="bg-transparent p-6 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Temas</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.topics.map((topic, index) => (
                <Badge key={index} variant="primary" size="sm">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="bg-transparent p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Ubicación</h2>
          </div>
          
          {event.isVirtual ? (
            <div>
              <p className="text-text-secondary mb-2">Evento Virtual</p>
              {event.virtualLink && (
                <a
                  href={event.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline text-sm"
                >
                  Unirse al evento →
                </a>
              )}
            </div>
          ) : (
            <div>
              <p className="text-text-primary font-medium mb-2">{event.location}</p>
              {event.locationAddress && (
                <p className="text-text-secondary text-sm mb-3">{event.locationAddress}</p>
              )}
              {event.locationAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-accent hover:underline text-sm"
                >
                  Ver en Google Maps →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Speaker */}
        {speaker && (
          <div className="bg-transparent p-6 mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Speaker</h2>
            
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                {speaker.avatarUrl ? (
                  <Image
                    src={speaker.avatarUrl}
                    alt={event.speakerName}
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {event.speakerName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-1">
                  {event.speakerName}
                </h3>
                {speaker.jobTitle && (
                  <p className="text-sm text-text-secondary mb-2">{speaker.jobTitle}</p>
                )}
                {event.speakerBio && (
                  <p className="text-sm text-text-secondary mb-3">{event.speakerBio}</p>
                )}
                
                {/* Social Links */}
                {speaker.socialLinks && (
                  <div className="flex gap-3">
                    {Object.entries(speaker.socialLinks as Record<string, string>).map(([platform, url]) => {
                      if (!url) return null;
                      return (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-secondary hover:text-accent transition-colors"
                          title={platform}
                        >
                          <span className="text-xl">
                            {platform === 'linkedin' && '💼'}
                            {platform === 'twitter' && '🐦'}
                            {platform === 'github' && '💻'}
                            {platform === 'website' && '🌐'}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Organizers (Admins) */}
        {admins.length > 0 && (
          <div className="bg-transparent p-6 mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Organizado por AWS UG Puebla
            </h2>
            
            <div className="space-y-3">
              <p className="text-sm text-text-secondary mb-3">Leaders</p>
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    {admin.avatarUrl ? (
                      <Image
                        src={admin.avatarUrl}
                        alt={`${admin.givenName} ${admin.familyName}`}
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {admin.givenName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {admin.givenName} {admin.familyName}
                    </p>
                    {admin.jobTitle && (
                      <p className="text-xs text-text-secondary">{admin.jobTitle}</p>
                    )}
                  </div>
                  
                  {/* Admin Social Links */}
                  {admin.socialLinks && (
                    <div className="flex gap-2">
                      {Object.entries(admin.socialLinks as Record<string, string>).map(([platform, url]) => {
                        if (!url) return null;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-secondary hover:text-accent transition-colors text-sm"
                          >
                            {platform === 'linkedin' && '💼'}
                            {platform === 'twitter' && '🐦'}
                            {platform === 'github' && '💻'}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About Event */}
        <div className="bg-transparent p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Acerca del evento
          </h2>
          <p className="text-text-secondary whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">
            {event.description}
          </p>
        </div>

        {/* Ticket Status for authenticated users */}
        {isAuthenticated && !isAdmin && (
          <div className="bg-transparent p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Estado de tu registro
            </h2>
            <TicketStatus
              status={
                ticketLoading
                  ? 'loading'
                  : ticketError
                  ? 'error'
                  : registration?.checkedIn
                  ? 'checked_in'
                  : registration && !hasValidToken
                  ? 'error'
                  : hasTicket
                  ? 'has_ticket'
                  : 'not_registered'
              }
              message={
                ticketError || 
                (registration && !hasValidToken ? 'Tu código QR es inválido y necesita ser regenerado' : undefined)
              }
              onRegister={handleRegister}
              onShowTicket={handleShowTicket}
              onRegenerate={handleRegenerateTicket}
            />
          </div>
        )}
      </div>

      {/* QR Ticket Modal */}
      {hasTicket && hasValidToken && registration && event && (
        <QRTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          eventId={event.id || ''}
          userId={user?.userId || ''}
          registrationId={registration.id || ''}
          qrToken={registration.qrCodeToken || ''}
          eventTitle={event.title}
          eventDate={event.startDate}
          eventLocation={event.location || ''}
          userName={registration.userName || 'Usuario'}
        />
      )}
    </div>
  );
}
