'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import QRTicket from './QRTicket';
import { QRTicketProps } from '@/lib/qr-config';

interface QRTicketModalProps extends QRTicketProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal para mostrar el QRTicket de manera elegante
 * Optimizado para móvil con overlay y animaciones suaves
 */
export default function QRTicketModal({
  isOpen,
  onClose,
  ...ticketProps
}: QRTicketModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header del modal */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Ticket Component */}
        <div className="bg-surface rounded-b-2xl">
          <QRTicket {...ticketProps} />
        </div>
      </div>
    </div>
  );
}