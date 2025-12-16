/**
 * Hook personalizado para manejar la lógica del ticket QR
 */

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { QRTokenUtils } from '@/lib/qr-config';

const client = generateClient<Schema>();

type EventRegistration = Schema['EventRegistration']['type'];

interface UseQRTicketOptions {
  eventId: string;
  userId: string;
}

interface UseQRTicketReturn {
  registration: EventRegistration | null;
  isLoading: boolean;
  error: string | null;
  hasTicket: boolean;
  isExpired: boolean;
  hasValidToken: boolean;
  refetch: () => Promise<void>;
  regenerateToken: () => Promise<void>;
}

export function useQRTicket({ eventId, userId }: UseQRTicketOptions): UseQRTicketReturn {
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar el registro del usuario para este evento
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventId,
      });

      if (registrations && registrations.length > 0) {
        // Filtrar por userId ya que la query solo filtra por eventId
        const userRegistration = registrations.find(reg => reg.userId === userId);
        setRegistration(userRegistration || null);
      } else {
        setRegistration(null);
      }
    } catch (err) {
      console.error('Error fetching registration:', err);
      setError('Error al cargar el ticket');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && userId) {
      fetchRegistration();
    }
  }, [eventId, userId]);

  // Verificar si el token QR es válido
  const hasValidToken = (() => {
    if (!registration?.qrCodeToken) return false;
    
    try {
      const tokenData = QRTokenUtils.parseToken(registration.qrCodeToken);
      return !!tokenData;
    } catch {
      return false;
    }
  })();

  // Verificar si el usuario tiene un ticket válido
  const hasTicket = registration?.status === 'GOING' && hasValidToken;

  // Verificar si el ticket está expirado
  const isExpired = (() => {
    if (!registration?.qrCodeToken || !hasValidToken) return false;
    
    try {
      const tokenData = QRTokenUtils.parseToken(registration.qrCodeToken);
      if (!tokenData) return true;

      // Para verificar expiración necesitamos la fecha del evento
      // Por ahora, asumimos que no está expirado si el token es válido
      // Esta lógica se puede mejorar cuando tengamos acceso a la fecha del evento
      return false;
    } catch {
      return true;
    }
  })();

  // Función para regenerar el token QR
  const regenerateToken = async () => {
    if (!registration || !eventId || !userId) {
      setError('No se puede regenerar el token: información faltante');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generar nuevo token
      const newToken = QRTokenUtils.generateToken({
        eventId,
        userId,
        registrationId: registration.id || '',
      });

      // Actualizar el registro
      const { errors: updateErrors } = await client.models.EventRegistration.update({
        id: registration.id || '',
        qrCodeToken: newToken,
      });

      if (updateErrors) {
        console.error('Error updating token:', updateErrors);
        setError('Error al regenerar el código QR');
        return;
      }

      // Refrescar los datos
      await fetchRegistration();
    } catch (err) {
      console.error('Error regenerating token:', err);
      setError('Error al regenerar el código QR');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    registration,
    isLoading,
    error,
    hasTicket,
    isExpired,
    hasValidToken,
    refetch: fetchRegistration,
    regenerateToken,
  };
}