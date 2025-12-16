'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { ArrowLeft, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/admin';
import { Badge } from '@/components/ui/Badge';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];


interface CheckInStats {
  total: number;
  checkedIn: number;
  pending: number;
  percentage: number;
}

export default function EventCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [stats, setStats] = useState<CheckInStats>({
    total: 0,
    checkedIn: 0,
    pending: 0,
    percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }

    if (eventId) {
      loadEventData();
      loadStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isAdmin, authLoading, router]);

  async function loadEventData() {
    try {
      setIsLoading(true);
      setError(null);

      const { data: eventData, errors } = await client.models.Event.get({ id: eventId });

      if (errors) {
        console.error('Error loading event:', errors);
        setError('Error al cargar el evento');
        return;
      }

      if (!eventData) {
        setError('Evento no encontrado');
        return;
      }

      setEvent(eventData);
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventId,
      });

      if (registrations) {
        const total = registrations.length;
        const checkedIn = registrations.filter(reg => reg.checkedIn).length;
        const pending = total - checkedIn;
        const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

        setStats({
          total,
          checkedIn,
          pending,
          percentage,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const handleCheckInSuccess = (attendeeName: string) => {
    // Actualizar estadísticas
    setStats(prev => ({
      ...prev,
      checkedIn: prev.checkedIn + 1,
      pending: prev.pending - 1,
      percentage: prev.total > 0 ? Math.round(((prev.checkedIn + 1) / prev.total) * 100) : 0,
    }));

    // Agregar a check-ins recientes
    setRecentCheckIns(prev => [attendeeName, ...prev.slice(0, 4)]);
  };

  const handleManualCheckIn = () => {
    setShowManualCheckIn(true);
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // El useEffect ya redirige
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {error || 'Evento no encontrado'}
          </h1>
          <p className="text-text-secondary mb-6">
            No se pudo cargar la información del evento.
          </p>
          <Button variant="accent" onClick={() => router.push('/admin/events')}>
            Volver a Eventos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Regresar
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary truncate">
                Check-in: {event.title}
              </h1>
              <p className="text-sm text-text-secondary">
                {formatEventDate(event.startDate)}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/events/${eventId}/attendees`)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Ver Lista
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panel Principal - Scanner */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  Scanner QR
                </h2>
                <p className="text-sm text-text-secondary">
                  Escanea los códigos QR de los asistentes para registrar su check-in
                </p>
              </div>
              
              <div className="p-4">
                <QRScanner
                  eventId={eventId}
                  onCheckInSuccess={handleCheckInSuccess}
                  onManualCheckIn={handleManualCheckIn}
                />
              </div>
            </div>
          </div>

          {/* Panel Lateral - Estadísticas */}
          <div className="space-y-6">
            {/* Estadísticas Generales */}
            <div className="bg-surface rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Estadísticas
              </h3>
              
              <div className="space-y-4">
                {/* Progreso */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-secondary">Progreso</span>
                    <span className="text-sm font-semibold text-text-primary">
                      {stats.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Números */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {stats.checkedIn}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Check-ins
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {stats.pending}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Pendientes
                    </div>
                  </div>
                </div>

                <div className="text-center p-3 bg-surface-hover rounded-lg">
                  <div className="text-2xl font-bold text-text-primary mb-1">
                    {stats.total}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Total Registrados
                  </div>
                </div>
              </div>
            </div>

            {/* Check-ins Recientes */}
            {recentCheckIns.length > 0 && (
              <div className="bg-surface rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Check-ins Recientes
                </h3>
                
                <div className="space-y-2">
                  {recentCheckIns.map((name, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800 dark:text-green-200 truncate">
                        {name}
                      </span>
                      <Badge variant="success" size="sm" className="ml-auto">
                        <Clock className="w-3 h-3 mr-1" />
                        Ahora
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información del Evento */}
            <div className="bg-surface rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Información del Evento
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-text-secondary">Ubicación:</span>
                  <p className="text-text-primary font-medium">
                    {event.isVirtual ? 'Virtual' : event.location || 'No especificada'}
                  </p>
                </div>
                
                {event.eventType && (
                  <div>
                    <span className="text-text-secondary">Tipo:</span>
                    <p className="text-text-primary font-medium">
                      {event.eventType}
                    </p>
                  </div>
                )}

                {!event.isUnlimited && event.maxAttendees && (
                  <div>
                    <span className="text-text-secondary">Capacidad:</span>
                    <p className="text-text-primary font-medium">
                      {event.maxAttendees} personas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Check-in Manual (placeholder) */}
      {showManualCheckIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Check-in Manual
            </h3>
            <p className="text-text-secondary mb-6">
              Esta funcionalidad se implementará en la siguiente tarea.
            </p>
            <Button
              variant="accent"
              onClick={() => setShowManualCheckIn(false)}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}