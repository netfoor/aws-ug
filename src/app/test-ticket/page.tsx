'use client';

import React from 'react';
import { QRTicket } from '@/components/events';

/**
 * Página de prueba temporal para verificar el componente QRTicket
 */
export default function TestTicketPage() {
  const mockProps = {
    eventId: 'test-event-id',
    userId: 'test-user-id',
    registrationId: 'test-registration-id',
    qrToken: JSON.stringify({
      eventId: 'test-event-id',
      userId: 'test-user-id',
      registrationId: 'test-registration-id',
      timestamp: Date.now(),
    }),
    eventTitle: 'AWS User Group Puebla - Introducción a Lambda',
    eventDate: new Date().toISOString(),
    eventLocation: 'Centro de Convenciones Puebla',
    userName: 'Usuario de Prueba',
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Prueba de Ticket QR</h1>
        <QRTicket {...mockProps} />
      </div>
    </div>
  );
}