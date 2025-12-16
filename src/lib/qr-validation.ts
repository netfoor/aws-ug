/**
 * Utilidades para validación avanzada de tokens QR
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { QRTokenData, QRTokenUtils } from './qr-config';

const client = generateClient<Schema>();

export interface QRValidationResult {
    isValid: boolean;
    error?: string;
    registration?: Schema['EventRegistration']['type'];
    event?: Schema['Event']['type'];
}

export class QRValidator {
    /**
     * Valida completamente un token QR incluyendo verificaciones de base de datos
     */
    static async validateToken(tokenString: string, expectedEventId: string): Promise<QRValidationResult> {
        try {
            // 1. Parsear el token
            const tokenData = QRTokenUtils.parseToken(tokenString);
            if (!tokenData) {
                return {
                    isValid: false,
                    error: 'Token QR inválido o corrupto'
                };
            }

            // 2. Verificar que sea para el evento correcto
            if (!QRTokenUtils.isTokenForEvent(tokenData, expectedEventId)) {
                return {
                    isValid: false,
                    error: 'Este código QR pertenece a otro evento'
                };
            }

            // 3. Buscar el registro en la base de datos
            const { data: registration } = await client.models.EventRegistration.get({
                id: tokenData.registrationId
            });

            if (!registration) {
                return {
                    isValid: false,
                    error: 'Registro no encontrado'
                };
            }

            // 4. Verificar que el token coincida
            if (registration.qrCodeToken !== tokenString) {
                return {
                    isValid: false,
                    error: 'Token QR no coincide con el registro'
                };
            }

            // 5. Verificar que no haya hecho check-in previamente
            if (registration.checkedIn) {
                return {
                    isValid: false,
                    error: `Ya se realizó check-in el ${new Date(registration.checkedInAt || '').toLocaleString('es-MX')}`
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
                return {
                    isValid: false,
                    error: 'El código QR ha expirado'
                };
            }

            // 9. Verificar que el evento no haya sido cancelado
            if (event.status === 'CANCELLED') {
                return {
                    isValid: false,
                    error: 'El evento ha sido cancelado'
                };
            }

            // Todo válido
            return {
                isValid: true,
                registration,
                event
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
            } as any; // Temporal fix para tipos de Amplify

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
                    } as any; // Temporal fix para tipos de Amplify

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
            } as any; // Temporal fix para tipos de Amplify

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