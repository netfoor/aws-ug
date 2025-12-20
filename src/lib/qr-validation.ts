/**
 * Utilidades para validación avanzada de tokens QR con seguridad mejorada
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { QRTokenUtils } from './qr-config';
import { SecurityLogger, SecurityIncidentType } from './security-logger';

const client = generateClient<Schema>();

export interface QRValidationResult {
    isValid: boolean;
    error?: string;
    registration?: Schema['EventRegistration']['type'];
    event?: Schema['Event']['type'];
    securityIncident?: boolean;
    incidentType?: SecurityIncidentType;
}

export class QRValidator {
    /**
     * Valida completamente un token QR incluyendo verificaciones de seguridad y base de datos
     */
    static async validateToken(
        tokenString: string, 
        expectedEventId: string, 
        adminId?: string
    ): Promise<QRValidationResult> {
        try {
            // 1. Parsear el token y verificar firma criptográfica
            const tokenData = QRTokenUtils.parseToken(tokenString);
            if (!tokenData) {
                // Log incidente de seguridad
                await SecurityLogger.logIncident({
                    type: SecurityIncidentType.INVALID_SIGNATURE,
                    eventId: expectedEventId,
                    adminId,
                    tokenData: tokenString.substring(0, 50) + '...', // Solo primeros 50 chars
                    details: 'Token QR con formato inválido o firma criptográfica incorrecta',
                    severity: 'MEDIUM',
                });

                return {
                    isValid: false,
                    error: 'Código QR inválido o con firma incorrecta',
                    securityIncident: true,
                    incidentType: SecurityIncidentType.INVALID_SIGNATURE,
                };
            }

            // 2. Verificar que sea para el evento correcto
            if (!QRTokenUtils.isTokenForEvent(tokenData, expectedEventId)) {
                // Log incidente de seguridad
                await SecurityLogger.logIncident({
                    type: SecurityIncidentType.WRONG_EVENT,
                    eventId: expectedEventId,
                    adminId,
                    details: `Token QR del evento ${tokenData.eventId} escaneado en evento ${expectedEventId}`,
                    severity: 'LOW',
                });

                return {
                    isValid: false,
                    error: `Este código QR pertenece al evento ${tokenData.eventId}`,
                    securityIncident: true,
                    incidentType: SecurityIncidentType.WRONG_EVENT,
                };
            }

            // 3. Buscar el registro en la base de datos
            console.log('🔍 Looking for registration with ID:', tokenData.registrationId);
            const { data: registration } = await client.models.EventRegistration.get({
                id: tokenData.registrationId
            });

            console.log('📋 Registration found:', registration ? 'Yes' : 'No');
            if (registration) {
                console.log('📋 Registration details:', {
                    id: registration.id,
                    eventId: registration.eventId,
                    userId: registration.userId,
                    status: registration.status,
                    checkedIn: registration.checkedIn
                });
            }

            if (!registration) {
                console.error('❌ Registration not found. Token data:', tokenData);
                console.error('❌ Searched for ID:', tokenData.registrationId);
                
                // Detectar si es un ID temporal
                const isTemporaryId = tokenData.registrationId.startsWith('temp-');
                
                if (isTemporaryId) {
                    console.error('⚠️ TEMPORARY ID DETECTED! This QR code was generated with a temporary registration ID.');
                    console.error('⚠️ The user needs to regenerate their QR code from the event details page.');
                    
                    return {
                        isValid: false,
                        error: 'Este código QR es inválido. Por favor, genera un nuevo código QR desde los detalles del evento.'
                    };
                }
                
                // Try to find registration by other means for debugging
                try {
                    const { data: allRegistrations } = await client.models.EventRegistration.registrationsByEvent({
                        eventId: expectedEventId,
                    });
                    console.log('📊 Total registrations in event:', allRegistrations?.length || 0);
                    
                    if (allRegistrations && allRegistrations.length > 0) {
                        console.log('📊 Sample registration IDs:', allRegistrations.slice(0, 3).map(r => r.id));
                        
                        // Check if there's a registration for the same user
                        const userReg = allRegistrations.find(r => r.userId === tokenData.userId);
                        if (userReg) {
                            console.log('📊 Found registration for this user:', userReg.id);
                            console.log('⚠️ User has a valid registration but QR token has wrong registration ID');
                            console.log('⚠️ Expected:', userReg.id, 'Got:', tokenData.registrationId);
                            
                            return {
                                isValid: false,
                                error: 'Código QR desactualizado. Por favor, genera un nuevo código desde los detalles del evento.'
                            };
                        }
                    }
                } catch (debugError) {
                    console.error('Debug query failed:', debugError);
                }
                
                return {
                    isValid: false,
                    error: `Registro no encontrado (ID: ${tokenData.registrationId.substring(0, 8)}...)`
                };
            }

            // 4. Verificar que el token coincida (prevenir tokens alterados)
            if (registration.qrCodeToken !== tokenString) {
                // Log incidente crítico de seguridad
                await SecurityLogger.logIncident({
                    type: SecurityIncidentType.TAMPERED_TOKEN,
                    eventId: expectedEventId,
                    adminId,
                    details: `Token QR no coincide con el registro ${tokenData.registrationId}`,
                    severity: 'HIGH',
                });

                return {
                    isValid: false,
                    error: 'Token QR posiblemente alterado o inválido',
                    securityIncident: true,
                    incidentType: SecurityIncidentType.TAMPERED_TOKEN,
                };
            }

            // 5. Verificar que no haya hecho check-in previamente (prevenir uso duplicado)
            if (registration.checkedIn) {
                // Log intento de uso duplicado
                await SecurityLogger.logIncident({
                    type: SecurityIncidentType.DUPLICATE_SCAN,
                    eventId: expectedEventId,
                    adminId,
                    details: `Intento de check-in duplicado para registro ${tokenData.registrationId}. Check-in original: ${registration.checkedInAt}`,
                    severity: 'MEDIUM',
                });

                const checkedInDate = new Date(registration.checkedInAt || '').toLocaleString('es-MX');
                return {
                    isValid: false,
                    error: `Ya se realizó check-in el ${checkedInDate}`,
                    securityIncident: true,
                    incidentType: SecurityIncidentType.DUPLICATE_SCAN,
                };
            }

            // 6. Verificar que el estado sea GOING
            if (registration.status !== 'GOING') {
                return {
                    isValid: false,
                    error: 'El registro no está confirmado para asistir'
                };
            }

            // 7. Obtener datos del evento para verificar expiración
            const { data: event } = await client.models.Event.get({
                id: expectedEventId
            });

            if (!event) {
                return {
                    isValid: false,
                    error: 'Evento no encontrado'
                };
            }

            // 8. Verificar expiración del token
            const eventEndDate = new Date(event.endDate);
            if (QRTokenUtils.isTokenExpired(tokenData, eventEndDate)) {
                // Log token expirado
                await SecurityLogger.logIncident({
                    type: SecurityIncidentType.EXPIRED_TOKEN,
                    eventId: expectedEventId,
                    adminId,
                    details: `Token QR expirado escaneado. Evento terminó: ${eventEndDate.toLocaleString('es-MX')}`,
                    severity: 'LOW',
                });

                return {
                    isValid: false,
                    error: `El código QR expiró el ${new Date(eventEndDate.getTime() + 24 * 60 * 60 * 1000).toLocaleString('es-MX')}`,
                    securityIncident: true,
                    incidentType: SecurityIncidentType.EXPIRED_TOKEN,
                };
            }

            // 9. Verificar que el evento no haya sido cancelado
            if (event.status === 'CANCELLED') {
                return {
                    isValid: false,
                    error: 'El evento ha sido cancelado'
                };
            }

            // 10. Detectar actividad sospechosa
            if (adminId) {
                SecurityLogger.detectSuspiciousActivity(expectedEventId, adminId);
            }

            // Todo válido
            return {
                isValid: true,
                registration,
                event,
                securityIncident: false,
            };

        } catch (error) {
            console.error('Error validating QR token:', error);
            return {
                isValid: false,
                error: 'Error al validar el código QR'
            };
        }
    }

    /**
     * Realiza el check-in de un usuario validado
     */
    static async performCheckIn(
        registration: Schema['EventRegistration']['type'],
        adminId: string,
        method: 'QR_SCAN' | 'MANUAL' = 'QR_SCAN'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const now = new Date().toISOString();

            // Actualizar el registro con el check-in
            const updateData = {
                id: registration.id,
                checkedIn: true,
                checkedInAt: now,
                checkedInBy: adminId,
                checkInMethod: method,
            };

            const { data: updatedRegistration, errors } = await client.models.EventRegistration.update(updateData);

            if (errors || !updatedRegistration) {
                return {
                    success: false,
                    error: 'Error al actualizar el registro de check-in'
                };
            }

            // Actualizar el contador del evento
            if (registration.eventId) {
                const { data: event } = await client.models.Event.get({
                    id: registration.eventId
                });

                if (event) {
                    const eventUpdateData = {
                        id: registration.eventId,
                        checkedInCount: (event.checkedInCount || 0) + 1,
                    };

                    await client.models.Event.update(eventUpdateData);
                }
            }

            return { success: true };

        } catch (error) {
            console.error('Error performing check-in:', error);
            return {
                success: false,
                error: 'Error al realizar el check-in'
            };
        }
    }

    /**
     * Genera un nuevo token QR para un registro existente
     */
    static async regenerateToken(registrationId: string): Promise<{ success: boolean; token?: string; error?: string }> {
        try {
            const { data: registration } = await client.models.EventRegistration.get({
                id: registrationId
            });

            if (!registration) {
                return {
                    success: false,
                    error: 'Registro no encontrado'
                };
            }

            // Generar nuevo token
            if (!registration.eventId || !registration.userId || !registration.id) {
                return {
                    success: false,
                    error: 'Datos del registro incompletos'
                };
            }

            // Generar nuevo token
            const newToken = QRTokenUtils.generateToken({
                eventId: registration.eventId,
                userId: registration.userId,
                registrationId: registration.id,
            });

            // Actualizar el registro
            const updateData = {
                id: registrationId,
                qrCodeToken: newToken,
            };

            const { data: updatedRegistration, errors } = await client.models.EventRegistration.update(updateData);

            if (errors || !updatedRegistration) {
                return {
                    success: false,
                    error: 'Error al actualizar el token'
                };
            }

            return {
                success: true,
                token: newToken
            };

        } catch (error) {
            console.error('Error regenerating token:', error);
            return {
                success: false,
                error: 'Error al regenerar el token'
            };
        }
    }
}