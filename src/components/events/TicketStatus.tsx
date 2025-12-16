'use client';

import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TicketStatusProps {
  status: 'loading' | 'not_registered' | 'has_ticket' | 'checked_in' | 'expired' | 'error';
  message?: string;
  onRegister?: () => void;
  onShowTicket?: () => void;
  onRegenerate?: () => void;
}

/**
 * Componente para mostrar el estado del ticket del usuario
 */
export default function TicketStatus({
  status,
  message,
  onRegister,
  onShowTicket,
  onRegenerate,
}: TicketStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent" />,
          title: 'Cargando...',
          description: 'Verificando tu registro',
          color: 'text-text-secondary',
          bgColor: 'bg-surface',
          action: null,
        };

      case 'not_registered':
        return {
          icon: <Ticket className="w-5 h-5" />,
          title: 'Regístrate al evento',
          description: 'Aún no te has registrado a este evento',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          action: onRegister && (
            <Button variant="accent" onClick={onRegister} size="sm">
              Registrarse
            </Button>
          ),
        };

      case 'has_ticket':
        return {
          icon: <Ticket className="w-5 h-5" />,
          title: 'Mi Ticket',
          description: 'Tu ticket está listo para el check-in',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          action: onShowTicket && (
            <Button variant="accent" onClick={onShowTicket} size="sm">
              Ver Ticket
            </Button>
          ),
        };

      case 'checked_in':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          title: '¡Check-in realizado!',
          description: 'Ya hiciste check-in en este evento',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          action: null,
        };

      case 'expired':
        return {
          icon: <Clock className="w-5 h-5" />,
          title: 'Ticket expirado',
          description: 'Tu ticket ha expirado',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          action: onRegenerate && (
            <Button variant="outline" onClick={onRegenerate} size="sm">
              Regenerar Ticket
            </Button>
          ),
        };

      case 'error':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'Error',
          description: message || 'Ocurrió un error al cargar tu ticket',
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          action: onRegenerate && (
            <Button variant="outline" onClick={onRegenerate} size="sm">
              Reintentar
            </Button>
          ),
        };

      default:
        return {
          icon: <XCircle className="w-5 h-5" />,
          title: 'Estado desconocido',
          description: 'No se pudo determinar el estado del ticket',
          color: 'text-text-secondary',
          bgColor: 'bg-surface',
          action: null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`rounded-xl p-4 border border-border ${config.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.color} mt-0.5`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${config.color} mb-1`}>
            {config.title}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            {config.description}
          </p>
          
          {config.action && (
            <div className="flex justify-start">
              {config.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}