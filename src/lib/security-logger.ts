/**
 * Sistema de logging de incidentes de seguridad para QR
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export enum SecurityIncidentType {
  INVALID_SIGNATURE = 'invalid_signature',
  DUPLICATE_SCAN = 'duplicate_scan',
  EXPIRED_TOKEN = 'expired_token',
  WRONG_EVENT = 'wrong_event',
  TAMPERED_TOKEN = 'tampered_token',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export interface SecurityIncident {
  id?: string;
  type: SecurityIncidentType;
  eventId: string;
  tokenData?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class SecurityLogger {
  /**
   * Registra un incidente de seguridad
   */
  static async logIncident(incident: Omit<SecurityIncident, 'id' | 'timestamp'>): Promise<void> {
    try {
      const incidentData: SecurityIncident = {
        ...incident,
        timestamp: new Date().toISOString(),
      };

      // Log en consola para desarrollo
      console.warn('🚨 Security Incident:', incidentData);

      // En producción, aquí se enviaría a un servicio de logging
      // Por ahora, almacenamos en localStorage para debugging
      this.storeIncidentLocally(incidentData);

      // Notificar a administradores si es crítico
      if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
        await this.notifyAdmins(incidentData);
      }

    } catch (error) {
      console.error('Error logging security incident:', error);
    }
  }

  /**
   * Almacena incidente localmente para debugging
   */
  private static storeIncidentLocally(incident: SecurityIncident): void {
    try {
      const existingIncidents = JSON.parse(
        localStorage.getItem('qr_security_incidents') || '[]'
      );
      
      existingIncidents.push(incident);
      
      // Mantener solo los últimos 100 incidentes
      if (existingIncidents.length > 100) {
        existingIncidents.splice(0, existingIncidents.length - 100);
      }
      
      localStorage.setItem('qr_security_incidents', JSON.stringify(existingIncidents));
    } catch (error) {
      console.error('Error storing incident locally:', error);
    }
  }

  /**
   * Notifica a administradores sobre incidentes críticos
   */
  private static async notifyAdmins(incident: SecurityIncident): Promise<void> {
    try {
      // Obtener lista de administradores
      const { data: admins } = await client.models.User.list({
        filter: { role: { eq: 'ADMIN' } }
      });

      if (!admins || admins.length === 0) {
        return;
      }

      // En producción, aquí se enviarían notificaciones push, emails, etc.
      console.warn(`🚨 CRITICAL SECURITY ALERT: ${incident.type} - ${incident.details}`);
      
      // Por ahora, solo loggeamos la alerta
      console.warn(`Admins to notify: ${admins.map(admin => admin.email).join(', ')}`);

    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * Obtiene incidentes recientes para un evento
   */
  static getRecentIncidents(eventId: string, hours: number = 24): SecurityIncident[] {
    try {
      const incidents = JSON.parse(
        localStorage.getItem('qr_security_incidents') || '[]'
      ) as SecurityIncident[];

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      return incidents.filter(incident => 
        incident.eventId === eventId &&
        new Date(incident.timestamp) > cutoffTime
      );
    } catch (error) {
      console.error('Error getting recent incidents:', error);
      return [];
    }
  }

  /**
   * Detecta patrones sospechosos de actividad
   */
  static detectSuspiciousActivity(eventId: string, adminId: string): boolean {
    const recentIncidents = this.getRecentIncidents(eventId, 1); // Última hora
    
    // Detectar múltiples intentos de tokens inválidos
    const invalidAttempts = recentIncidents.filter(incident => 
      incident.adminId === adminId &&
      (incident.type === SecurityIncidentType.INVALID_SIGNATURE ||
       incident.type === SecurityIncidentType.TAMPERED_TOKEN)
    );

    if (invalidAttempts.length >= 5) {
      this.logIncident({
        type: SecurityIncidentType.SUSPICIOUS_ACTIVITY,
        eventId,
        adminId,
        details: `${invalidAttempts.length} intentos de tokens inválidos en la última hora`,
        severity: 'HIGH',
      });
      return true;
    }

    return false;
  }

  /**
   * Limpia incidentes antiguos
   */
  static cleanupOldIncidents(daysToKeep: number = 30): void {
    try {
      const incidents = JSON.parse(
        localStorage.getItem('qr_security_incidents') || '[]'
      ) as SecurityIncident[];

      const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const recentIncidents = incidents.filter(incident => 
        new Date(incident.timestamp) > cutoffTime
      );

      localStorage.setItem('qr_security_incidents', JSON.stringify(recentIncidents));
    } catch (error) {
      console.error('Error cleaning up old incidents:', error);
    }
  }
}

// Tipos de mensajes de error mejorados
export const SECURITY_ERROR_MESSAGES = {
  [SecurityIncidentType.INVALID_SIGNATURE]: 'Código QR con firma inválida detectado',
  [SecurityIncidentType.DUPLICATE_SCAN]: 'Intento de uso duplicado de código QR',
  [SecurityIncidentType.EXPIRED_TOKEN]: 'Código QR expirado escaneado',
  [SecurityIncidentType.WRONG_EVENT]: 'Código QR de otro evento detectado',
  [SecurityIncidentType.TAMPERED_TOKEN]: 'Código QR posiblemente alterado',
  [SecurityIncidentType.SUSPICIOUS_ACTIVITY]: 'Actividad sospechosa detectada',
} as const;