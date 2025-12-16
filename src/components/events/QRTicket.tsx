'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, Calendar, MapPin, User, Clock, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QRTicketProps, DEFAULT_QR_OPTIONS } from '@/lib/qr-config';

/**
 * Componente QRTicket - Muestra el ticket con código QR para un evento
 * Optimizado para dispositivos móviles con funcionalidad de descarga
 */
export default function QRTicket({
  eventId,
  userId,
  registrationId,
  qrToken,
  eventTitle,
  eventDate,
  eventLocation,
  userName,
}: QRTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar el código QR cuando el componente se monta
  useEffect(() => {
    generateQRCode();
  }, [qrToken]);

  const generateQRCode = async () => {
    if (!canvasRef.current || !qrToken) return;

    try {
      setIsGenerating(true);
      setError(null);

      // Importación dinámica para evitar errores en SSR
      const QRious = (await import('qrious')).default;

      const qr = new QRious({
        element: canvasRef.current,
        value: qrToken,
        size: DEFAULT_QR_OPTIONS.size,
        level: DEFAULT_QR_OPTIONS.level,
        background: DEFAULT_QR_OPTIONS.background,
        foreground: DEFAULT_QR_OPTIONS.foreground,
        padding: DEFAULT_QR_OPTIONS.padding,
      });

      setQrGenerated(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Error al generar el código QR');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!canvasRef.current || !qrGenerated) return;

    try {
      // Crear un canvas más grande para la descarga con información adicional
      const downloadCanvas = document.createElement('canvas');
      const ctx = downloadCanvas.getContext('2d');
      if (!ctx) return;

      // Configurar el canvas de descarga (más grande para incluir texto)
      const padding = 40;
      const qrSize = 300;
      const textHeight = 200;
      downloadCanvas.width = qrSize + (padding * 2);
      downloadCanvas.height = qrSize + textHeight + (padding * 2);

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

      // Dibujar el QR code
      ctx.drawImage(canvasRef.current, padding, padding, qrSize, qrSize);

      // Configurar texto
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      // Título del evento
      ctx.font = 'bold 18px Arial';
      ctx.fillText(eventTitle, downloadCanvas.width / 2, qrSize + padding + 30);
      
      // Información del evento
      ctx.font = '14px Arial';
      ctx.fillText(`📅 ${formatDate(eventDate)}`, downloadCanvas.width / 2, qrSize + padding + 55);
      ctx.fillText(`📍 ${eventLocation}`, downloadCanvas.width / 2, qrSize + padding + 75);
      ctx.fillText(`👤 ${userName}`, downloadCanvas.width / 2, qrSize + padding + 95);
      
      // Instrucciones
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText('Presenta este código en el evento para hacer check-in', downloadCanvas.width / 2, qrSize + padding + 120);

      // Descargar la imagen
      const link = document.createElement('a');
      link.download = `ticket-${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-surface rounded-2xl p-6 text-center border border-border">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❌</span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Error</h3>
        <p className="text-text-secondary mb-4">{error}</p>
        <Button variant="outline" onClick={generateQRCode} size="sm">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-surface rounded-2xl overflow-hidden shadow-lg border border-border">
      {/* Header del ticket */}
      <div className="bg-gradient-to-r from-accent to-primary p-6 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Ticket Digital</span>
        </div>
        <h2 className="text-xl font-bold mb-1">AWS User Group Puebla</h2>
        <p className="text-sm opacity-90">Tu pase de entrada</p>
      </div>

      {/* Contenido principal */}
      <div className="p-6">
        {/* Información del evento */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-text-primary mb-4 line-clamp-2">
            {eventTitle}
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-center gap-2 text-text-secondary">
              <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{formatDate(eventDate)}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-text-secondary">
              <Clock className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{formatTime(eventDate)}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-text-secondary">
              <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="line-clamp-1">{eventLocation}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-text-secondary">
              <User className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="font-medium">{userName}</span>
            </div>
          </div>
        </div>

        {/* Código QR */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-white rounded-xl shadow-inner border-2 border-dashed border-border">
            {isGenerating ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm text-text-secondary">Generando QR...</p>
                </div>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="block mx-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            )}
          </div>
          
          {qrGenerated && (
            <p className="text-xs text-text-secondary mt-3 px-4">
              Presenta este código QR al llegar al evento para hacer check-in rápidamente
            </p>
          )}
        </div>

        {/* Botón de descarga */}
        {qrGenerated && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={downloadQRCode}
              className="w-full"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Ticket
            </Button>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Consejos para el check-in:
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Asegúrate de tener buena iluminación</li>
              <li>• Mantén el código QR limpio y visible</li>
              <li>• Llega unos minutos antes del evento</li>
              <li>• Ten tu identificación lista por si es necesaria</li>
            </ul>
          </div>
        </div>

        {/* Footer con ID del ticket */}
        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="text-xs text-text-secondary">
            ID: {registrationId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}