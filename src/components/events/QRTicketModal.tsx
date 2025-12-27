'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import QRTicket from './QRTicket';
import { QRTicketProps } from '@/lib/qr-config';
import { useScreenBrightness } from '@/hooks/useScreenBrightness';

interface QRTicketModalProps extends QRTicketProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de pantalla completa para mostrar el QR ticket
 * Directo sin transición, optimizado para móvil
 */
export default function QRTicketModal({
  isOpen,
  onClose,
  ...ticketProps
}: QRTicketModalProps) {
  // Hook para controlar brillo automáticamente
  useScreenBrightness({ enabled: isOpen });

  // Activar pantalla completa automáticamente
  useEffect(() => {
    if (!isOpen) return;

    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
      }
    };

    enterFullscreen();

    // Cleanup: salir de pantalla completa al cerrar
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Mi Ticket</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 hover:bg-surface-hover rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* QR Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <QRTicket {...ticketProps} isFullscreen={true} />
        </div>
      </div>
    </div>
  );
}