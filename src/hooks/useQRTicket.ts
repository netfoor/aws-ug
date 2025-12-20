/**
 * Hook personalizado para manejar la lógica del ticket QR
 */

import { useState, useEffect, useCallback } from 'react';
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

  const fetchRegistration = useCallback(async () => {
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
        
        if (userRegistration) {
          // Verificar si el token es válido y si el registrationId en el token coincide con el ID real
          if (userRegistration.qrCodeToken) {
            try {
              const tokenData = QRTokenUtils.parseToken(userRegistration.qrCodeToken);
              
              // Si el token es válido pero el registrationId es temporal o no coincide, regenerar
              if (tokenData) {
                const isTemporaryId = tokenData.registrationId.startsWith('temp-');
                const idMismatch = tokenData.registrationId !== userRegistration.id;
                
                if (isTemporaryId || idMismatch) {
                  console.warn('⚠️ Detected invalid or temporary token, auto-regenerating...');
                  console.log('Token registrationId:', tokenData.registrationId);
                  console.log('Actual registration ID:', userRegistration.id);
                  
                  // Regenerar el token automáticamente
                  const newToken = QRTokenUtils.generateToken({
                    eventId,
                    userId,
                    registrationId: userRegistration.id || '',
                  });
                  
                  // Actualizar el registro
                  await client.models.EventRegistration.update({
                    id: userRegistration.id || '',
                    qrCodeToken: newToken,
                  });
                  
                  console.log('✅ Token auto-regenerated successfully');
                  
                  // Actualizar el objeto local con el nuevo token
                  userRegistration.qrCodeToken = newToken;
                }
              }
            } catch (tokenError) {
              // Si el token no es válido, regenerar automáticamente
              console.warn('⚠️ Invalid token detected, auto-regenerating...', tokenError);
              
              const newToken = QRTokenUtils.generateToken({
                eventId,
                userId,
                registrationId: userRegistration.id || '',
              });
              
              await client.models.EventRegistration.update({
                id: userRegistration.id || '',
                qrCodeToken: newToken,
              });
              
              console.log('✅ Token auto-regenerated successfully');
              userRegistration.qrCodeToken = newToken;
            }
          } else if (userRegistration.id) {
            // Si no hay token, generar uno nuevo
            console.log('📝 No token found, generating new one...');
            
            const newToken = QRTokenUtils.generateToken({
              eventId,
              userId,
              registrationId: userRegistration.id,
            });
            
            await client.models.EventRegistration.update({
              id: userRegistration.id,
              qrCodeToken: newToken,
            });
            
            console.log('✅ Token generated successfully');
            userRegistration.qrCodeToken = newToken;
          }
        }
        
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
  }, [eventId, userId]);

  useEffect(() => {
    if (eventId && userId) {
      fetchRegistration();
    }
  }, [eventId, userId, fetchRegistration]);

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