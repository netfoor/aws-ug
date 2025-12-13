'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import Image from 'next/image';
import { Loader2, UserPlus, Search, Filter, CheckCircle, XCircle, Clock, Mail, Shield, Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];
type RegistrationType = Schema['EventRegistration']['type'];
type UserType = Schema['User']['type'];

interface AttendeeWithDetails {
  registration: RegistrationType;
  user: UserType | null;
  role: 'SPEAKER' | 'HOST' | 'MEMBER';
}

export default function AttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [attendees, setAttendees] = useState<AttendeeWithDetails[]>([]);
  const [hosts, setHosts] = useState<UserType[]>([]);
  const [speaker, setSpeaker] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'GOING' | 'NOT_GOING' | 'WAITLIST'>('ALL');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (eventId && isAdmin) {
      loadEventAndAttendees();
    }
  }, [eventId, isAdmin]);

  async function loadEventAndAttendees() {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar evento
      const { data: eventData, errors: eventErrors } = await client.models.Event.get({ id: eventId });
      
      if (eventErrors || !eventData) {
        setError('Evento no encontrado');
        return;
      }

      setEvent(eventData);

      // Cargar speaker
      if (eventData.speakerId) {
        const { data: speakerData } = await client.models.User.get({ id: eventData.speakerId });
        if (speakerData) {
          setSpeaker(speakerData);
        }
      }

      // Cargar hosts (admins)
      const { data: adminsData } = await client.models.User.list({
        filter: { role: { eq: 'ADMIN' } }
      });
      if (adminsData) {
        setHosts(adminsData);
      }

      // Cargar registros del evento
      const { data: registrations } = await client.models.EventRegistration.list({
        filter: { eventId: { eq: eventId } }
      });

      if (registrations) {
        // Cargar detalles de cada usuario registrado
        const attendeesWithDetails = await Promise.all(
          registrations.map(async (reg) => {
            const { data: userData } = await client.models.User.get({ id: reg.userId });
            return {
              registration: reg,
              user: userData,
              role: 'MEMBER' as const
            };
          })
        );

        setAttendees(attendeesWithDetails);
      }
    } catch (err) {
      console.error('Error loading attendees:', err);
      setError('Error al cargar los invitados');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAttendee = () => {
    // TODO: Implementar modal para agregar invitados
    console.log('Agregar invitado');
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'GOING':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'NOT_GOING':
        return (
          <Badge variant="default" size="sm">
            <XCircle className="w-3 h-3 mr-1" />
            No asiste
          </Badge>
        );
      case 'WAITLIST':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Lista de espera
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredAttendees = attendees.filter((attendee) => {
    // Filtrar por status
    if (filterStatus !== 'ALL' && attendee.registration.status !== filterStatus) {
      return false;
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = attendee.registration.userName?.toLowerCase() || '';
      const userEmail = attendee.registration.userEmail?.toLowerCase() || '';
      return userName.includes(query) || userEmail.includes(query);
    }

    return true;
  });

  const stats = {
    total: attendees.length + (speaker ? 1 : 0) + hosts.length,
    going: attendees.filter(a => a.registration.status === 'GOING').length,
    waitlist: attendees.filter(a => a.registration.status === 'WAITLIST').length,
    checkedIn: attendees.filter(a => a.registration.checkedIn).length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando invitados...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Error</h1>
          <p className="text-text-secondary mb-6">{error || 'Evento no encontrado'}</p>
          <Button variant="accent" onClick={() => router.back()}>
            Regresar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Regresar</span>
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Lista de Invitados</h1>
              <p className="text-sm text-text-secondary">{event.title}</p>
            </div>
            <Button variant="accent" size="sm" onClick={handleAddAttendee}>
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-secondary">Total</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.going}</div>
              <div className="text-xs text-text-secondary">Confirmados</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.checkedIn}</div>
              <div className="text-xs text-text-secondary">Check-in</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.waitlist}</div>
              <div className="text-xs text-text-secondary">En espera</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text-primary"
          >
            <option value="ALL">Todos</option>
            <option value="GOING">Confirmados</option>
            <option value="WAITLIST">Lista de espera</option>
            <option value="NOT_GOING">No asisten</option>
          </select>
        </div>

        {/* Speaker Section */}
        {speaker && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Speaker</h2>
            </div>
            
            <div className="bg-surface rounded-xl p-4 flex items-center gap-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                {speaker.avatarUrl ? (
                  <Image
                    src={speaker.avatarUrl}
                    alt={`${speaker.givenName} ${speaker.familyName}`}
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {speaker.givenName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-text-primary">
                    {speaker.givenName} {speaker.familyName}
                  </p>
                  <Badge variant="accent" size="sm">Speaker</Badge>
                </div>
                <p className="text-sm text-text-secondary">{speaker.email}</p>
              </div>

              <a
                href={`mailto:${speaker.email}`}
                className="text-text-secondary hover:text-accent transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}

        {/* Hosts Section */}
        {hosts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                Hosts ({hosts.length})
              </h2>
            </div>
            
            <div className="space-y-2">
              {hosts.map((host) => (
                <div key={host.id} className="bg-surface rounded-xl p-4 flex items-center gap-4">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {host.avatarUrl ? (
                      <Image
                        src={host.avatarUrl}
                        alt={`${host.givenName} ${host.familyName}`}
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {host.givenName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-text-primary">
                        {host.givenName} {host.familyName}
                      </p>
                      <Badge variant="warning" size="sm">Host</Badge>
                    </div>
                    <p className="text-sm text-text-secondary">{host.email}</p>
                  </div>

                  <a
                    href={`mailto:${host.email}`}
                    className="text-text-secondary hover:text-accent transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Invitados ({filteredAttendees.length})
            </h2>
          </div>

          {filteredAttendees.length === 0 ? (
            <div className="bg-surface rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-text-secondary" />
              </div>
              <p className="text-text-secondary mb-4">
                {searchQuery ? 'No se encontraron resultados' : 'Aún no hay invitados registrados'}
              </p>
              <Button variant="accent" size="sm" onClick={handleAddAttendee}>
                Agregar invitado
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttendees.map((attendee) => (
                <div key={attendee.registration.id} className="bg-surface rounded-xl p-4 flex items-center gap-4">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {attendee.user?.avatarUrl ? (
                      <Image
                        src={attendee.user.avatarUrl}
                        alt={attendee.registration.userName || 'User'}
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {attendee.registration.userName?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">
                      {attendee.registration.userName}
                    </p>
                    <p className="text-sm text-text-secondary truncate">
                      {attendee.registration.userEmail}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(attendee.registration.status)}
                    {attendee.registration.checkedIn && (
                      <Badge variant="success" size="sm">
                        ✓ Check-in
                      </Badge>
                    )}
                    <a
                      href={`mailto:${attendee.registration.userEmail}`}
                      className="text-text-secondary hover:text-accent transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
