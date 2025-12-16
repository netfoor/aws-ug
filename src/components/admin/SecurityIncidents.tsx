'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, User, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SecurityLogger, SecurityIncident, SecurityIncidentType } from '@/lib/security-logger';

interface SecurityIncidentsProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente para mostrar incidentes de seguridad a los administradores
 */
export default function SecurityIncidents({
  eventId,
  isOpen,
  onClose,
}: SecurityIncidentsProps) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [timeRange, setTimeRange] = useState<number>(24); // horas

  useEffect(() => {
    if (isOpen) {
      loadIncidents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, timeRange, eventId]);

  function loadIncidents() {
    const recentIncidents = SecurityLogger.getRecentIncidents(eventId, timeRange);
    setIncidents(recentIncidents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
      case 'LOW':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200';
    }
  };

  const getIncidentIcon = (type: SecurityIncidentType) => {
    switch (type) {
      case SecurityIncidentType.INVALID_SIGNATURE:
      case SecurityIncidentType.TAMPERED_TOKEN:
        return <Shield className="w-4 h-4 text-red-500" />;
      case SecurityIncidentType.DUPLICATE_SCAN:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case SecurityIncidentType.EXPIRED_TOKEN:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case SecurityIncidentType.WRONG_EVENT:
        return <Eye className="w-4 h-4 text-blue-500" />;
      case SecurityIncidentType.SUSPICIOUS_ACTIVITY:
        return <User className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getIncidentTypeLabel = (type: SecurityIncidentType) => {
    switch (type) {
      case SecurityIncidentType.INVALID_SIGNATURE:
        return 'Firma Inválida';
      case SecurityIncidentType.DUPLICATE_SCAN:
        return 'Uso Duplicado';
      case SecurityIncidentType.EXPIRED_TOKEN:
        return 'Token Expirado';
      case SecurityIncidentType.WRONG_EVENT:
        return 'Evento Incorrecto';
      case SecurityIncidentType.TAMPERED_TOKEN:
        return 'Token Alterado';
      case SecurityIncidentType.SUSPICIOUS_ACTIVITY:
        return 'Actividad Sospechosa';
      default:
        return 'Desconocido';
    }
  };

  const getIncidentStats = () => {
    const stats = {
      total: incidents.length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      low: incidents.filter(i => i.severity === 'LOW').length,
    };
    return stats;
  };

  if (!isOpen) return null;

  const stats = getIncidentStats();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-accent" />
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  Incidentes de Seguridad
                </h2>
                <p className="text-sm text-text-secondary">
                  Últimas {timeRange} horas - {stats.total} incidentes
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            <div className="text-center p-3 bg-surface-hover rounded-lg">
              <div className="text-lg font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-secondary">Total</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-lg font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-red-700 dark:text-red-300">Críticos</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{stats.high}</div>
              <div className="text-xs text-orange-700 dark:text-orange-300">Altos</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300">Medios</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.low}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Bajos</div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-text-secondary">Período:</span>
            <div className="flex gap-1">
              {[1, 6, 24, 72].map((hours) => (
                <Button
                  key={hours}
                  variant={timeRange === hours ? "accent" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(hours)}
                  className="text-xs"
                >
                  {hours === 1 ? '1h' : hours < 24 ? `${hours}h` : `${hours/24}d`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96 p-6">
          {incidents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="text-text-primary font-medium mb-1">
                  No hay incidentes de seguridad
                </p>
                <p className="text-sm text-text-secondary">
                  Todas las validaciones QR han sido exitosas en las últimas {timeRange} horas
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getIncidentIcon(incident.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-text-primary">
                            {getIncidentTypeLabel(incident.type)}
                          </h3>
                          <Badge 
                            variant="default" 
                            size="sm"
                            className={getSeverityColor(incident.severity)}
                          >
                            {incident.severity}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-text-secondary mb-2">
                          {incident.details}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(incident.timestamp).toLocaleString('es-MX')}
                          </span>
                          {incident.adminId && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Admin: {incident.adminId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface/95 backdrop-blur-sm border-t border-border p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Los incidentes se almacenan localmente y se limpian automáticamente después de 30 días
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  SecurityLogger.cleanupOldIncidents(7);
                  loadIncidents();
                }}
              >
                Limpiar Antiguos
              </Button>
              <Button variant="accent" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}