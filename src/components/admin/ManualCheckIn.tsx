'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, User, Mail, CheckCircle, XCircle, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';

const client = generateClient<Schema>();

type RegistrationType = Schema['EventRegistration']['type'];
type UserType = Schema['User']['type'];

interface AttendeeWithDetails {
  registration: RegistrationType;
  user: UserType | null;
  role: 'SPEAKER' | 'HOST' | 'MEMBER';
}

interface ManualCheckInProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onCheckInSuccess: (attendeeName: string) => void;
}

/**
 * Componente para realizar check-in manual de asistentes
 * Permite buscar por nombre o email y hacer check-in sin QR
 */
export default function ManualCheckIn({
  eventId,
  isOpen,
  onClose,
  onCheckInSuccess,
}: ManualCheckInProps) {
  const { user: currentUser } = useAuth();
  const [attendees, setAttendees] = useState<AttendeeWithDetails[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar asistentes cuando se abre el modal
  useEffect(() => {
    if (isOpen && eventId) {
      loadAttendees();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  // Filtrar asistentes basado en la búsqueda
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAttendees(attendees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = attendees.filter(attendee => {
      const userName = attendee.registration.userName?.toLowerCase() || '';
      const userEmail = attendee.registration.userEmail?.toLowerCase() || '';
      const fullName = attendee.user 
        ? `${attendee.user.givenName} ${attendee.user.familyName}`.toLowerCase()
        : '';

      return userName.includes(query) || 
             userEmail.includes(query) || 
             fullName.includes(query);
    });

    setFilteredAttendees(filtered);
  }, [searchQuery, attendees]);

  async function loadAttendees() {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar registros del evento
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventId,
      });

      if (!registrations) {
        setAttendees([]);
        return;
      }

      // Cargar detalles de usuarios para cada registro
      const attendeesWithDetails: AttendeeWithDetails[] = [];

      for (const registration of registrations) {
        if (registration.status === 'GOING') {
          let user: UserType | null = null;
          
          if (registration.userId) {
            const { data: userData } = await client.models.User.get({ 
              id: registration.userId 
            });
            user = userData;
          }

          attendeesWithDetails.push({
            registration,
            user,
            role: 'MEMBER', // Por defecto, se puede mejorar con lógica adicional
          });
        }
      }

      setAttendees(attendeesWithDetails);
    } catch (err) {
      console.error('Error loading attendees:', err);
      setError('Error al cargar la lista de asistentes');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualCheckIn(attendee: AttendeeWithDetails) {
    if (!attendee.registration.id || !currentUser?.userId) {
      setError('Error: información faltante para el check-in');
      return;
    }

    try {
      setIsProcessing(attendee.registration.id);
      setError(null);

      // Verificar si ya hizo check-in
      if (attendee.registration.checkedIn) {
        setError('Este asistente ya hizo check-in');
        return;
      }

      // Realizar check-in manual
      const { errors } = await client.models.EventRegistration.update({
        id: attendee.registration.id,
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: currentUser.userId,
        checkInMethod: 'MANUAL',
      });

      if (errors) {
        console.error('Error updating registration:', errors);
        setError('Error al realizar el check-in');
        return;
      }

      // Actualizar el estado local
      setAttendees(prev => prev.map(a => 
        a.registration.id === attendee.registration.id
          ? {
              ...a,
              registration: {
                ...a.registration,
                checkedIn: true,
                checkedInAt: new Date().toISOString(),
                checkedInBy: currentUser.userId,
                checkInMethod: 'MANUAL',
              }
            }
          : a
      ));

      // Notificar éxito
      const attendeeName = attendee.registration.userName || 
                          (attendee.user ? `${attendee.user.givenName} ${attendee.user.familyName}` : 'Usuario');
      
      onCheckInSuccess(attendeeName);

      // Limpiar búsqueda para mostrar el resultado
      setSearchQuery('');

    } catch (err) {
      console.error('Error during manual check-in:', err);
      setError('Error al procesar el check-in manual');
    } finally {
      setIsProcessing(null);
    }
  }

  const getAttendeeDisplayName = (attendee: AttendeeWithDetails) => {
    if (attendee.user) {
      return `${attendee.user.givenName} ${attendee.user.familyName}`;
    }
    return attendee.registration.userName || 'Usuario sin nombre';
  };

  const getAttendeeEmail = (attendee: AttendeeWithDetails) => {
    return attendee.user?.email || attendee.registration.userEmail || 'Sin email';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">Check-in Manual</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-sm text-text-secondary mt-2">
            Busca y selecciona asistentes para hacer check-in manual
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-border">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
                <p className="text-sm text-text-secondary">Cargando asistentes...</p>
              </div>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
                <p className="text-text-primary font-medium mb-1">
                  {searchQuery ? 'No se encontraron asistentes' : 'No hay asistentes registrados'}
                </p>
                <p className="text-sm text-text-secondary">
                  {searchQuery ? 'Intenta con otro término de búsqueda' : 'Los asistentes aparecerán aquí cuando se registren'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.registration.id}
                  className="p-4 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-10 h-10 flex-shrink-0">
                        {attendee.user?.avatarUrl ? (
                          <Image
                            src={attendee.user.avatarUrl}
                            alt={getAttendeeDisplayName(attendee)}
                            fill
                            className="object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {getAttendeeDisplayName(attendee).charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-text-primary truncate">
                            {getAttendeeDisplayName(attendee)}
                          </h3>
                          {attendee.registration.checkedIn && (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Check-in
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-text-secondary">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{getAttendeeEmail(attendee)}</span>
                        </div>

                        {attendee.registration.checkedIn && attendee.registration.checkedInAt && (
                          <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Check-in: {new Date(attendee.registration.checkedInAt).toLocaleString('es-MX')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 ml-3">
                      {attendee.registration.checkedIn ? (
                        <Badge variant="success" size="md">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completado
                        </Badge>
                      ) : (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleManualCheckIn(attendee)}
                          disabled={isProcessing === attendee.registration.id}
                          className="flex items-center gap-2"
                        >
                          {isProcessing === attendee.registration.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Check-in
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface/95 backdrop-blur-sm border-t border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {filteredAttendees.filter(a => a.registration.checkedIn).length} de {filteredAttendees.length} con check-in
            </span>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}