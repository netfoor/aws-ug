'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QRTicketProps, DEFAULT_QR_OPTIONS } from '@/lib/qr-config';

/**
 * Componente QRTicket - Muestra el ticket con código QR para un evento
 * Optimizado para dispositivos móviles con funcionalidad de descarga
 */
interface ExtendedQRTicketProps extends QRTicketProps {
  isFullscreen?: boolean;
}

export default function QRTicket({
  qrToken,
  eventTitle,
  eventDate,
  eventLocation,
  userName,
  isFullscreen = false,
}: ExtendedQRTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateQRCode = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Importación dinámica para evitar errores en SSR
      const QRious = (await import('qrious')).default;

      const qrSize = isFullscreen ? 350 : DEFAULT_QR_OPTIONS.size;

      // Verificar que el canvas esté disponible
      if (!canvasRef.current) {
        throw new Error('Canvas element not available');
      }

      // Custom padding values - UNIFORM PADDING ON ALL SIDES
      const uniformPadding = 10; // Change this value to adjust padding for all sides
      const paddingTop = uniformPadding;
      const paddingBottom = uniformPadding;
      const paddingLeft = uniformPadding;
      const paddingRight = uniformPadding;

      // Create temporary canvas for QR generation
      const tempCanvas = document.createElement('canvas');
      new QRious({
        element: tempCanvas,
        value: qrToken,
        size: qrSize,
        level: 'H',
        background: '#FFFFFF',
        foreground: '#000000',
        padding: 0, // No internal padding from library
      });

      // DEBUGGING: Analyze QRious library margins
      // Declare margin variables outside the if block to avoid scope issues
      let topMargin = 0, bottomMargin = 0, leftMargin = 0, rightMargin = 0;

      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Scan from top
        for (let y = 0; y < tempCanvas.height; y++) {
          let foundNonWhite = false;
          for (let x = 0; x < tempCanvas.width; x++) {
            const idx = (y * tempCanvas.width + x) * 4;
            if (data[idx] < 255 || data[idx + 1] < 255 || data[idx + 2] < 255) {
              foundNonWhite = true;
              break;
            }
          }
          if (foundNonWhite) {
            topMargin = y;
            break;
          }
        }

        // Scan from left
        for (let x = 0; x < tempCanvas.width; x++) {
          let foundNonWhite = false;
          for (let y = 0; y < tempCanvas.height; y++) {
            const idx = (y * tempCanvas.width + x) * 4;
            if (data[idx] < 255 || data[idx + 1] < 255 || data[idx + 2] < 255) {
              foundNonWhite = true;
              break;
            }
          }
          if (foundNonWhite) {
            leftMargin = x;
            break;
          }
        }

        // Scan from bottom
        for (let y = tempCanvas.height - 1; y >= 0; y--) {
          let foundNonWhite = false;
          for (let x = 0; x < tempCanvas.width; x++) {
            const idx = (y * tempCanvas.width + x) * 4;
            if (data[idx] < 255 || data[idx + 1] < 255 || data[idx + 2] < 255) {
              foundNonWhite = true;
              break;
            }
          }
          if (foundNonWhite) {
            bottomMargin = tempCanvas.height - 1 - y;
            break;
          }
        }

        // Scan from right
        for (let x = tempCanvas.width - 1; x >= 0; x--) {
          let foundNonWhite = false;
          for (let y = 0; y < tempCanvas.height; y++) {
            const idx = (y * tempCanvas.width + x) * 4;
            if (data[idx] < 255 || data[idx + 1] < 255 || data[idx + 2] < 255) {
              foundNonWhite = true;
              break;
            }
          }
          if (foundNonWhite) {
            rightMargin = tempCanvas.width - 1 - x;
            break;
          }
        }

      }

      // Setup main canvas with custom padding
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Use the detected margins from the debugging code above
      const actualQRWidth = qrSize - rightMargin;
      const actualQRHeight = qrSize - bottomMargin;

      // Set canvas dimensions including padding (using actual QR size without library margins)
      canvasRef.current.width = actualQRWidth + paddingLeft + paddingRight;
      canvasRef.current.height = actualQRHeight + paddingTop + paddingBottom;

      // Fill background (only if there's padding, otherwise skip)
      if (paddingTop > 0 || paddingBottom > 0 || paddingLeft > 0 || paddingRight > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // Draw QR code with precise cropping based on detected margins

      ctx.drawImage(
        tempCanvas,
        leftMargin, topMargin, // Source start (crop from detected margins)
        actualQRWidth, actualQRHeight, // Source size (crop out detected margins)
        paddingLeft, paddingTop, // Destination position
        actualQRWidth, actualQRHeight // Destination size (actual QR without library margins)
      );

      // Dar un momento para que se renderice
      setTimeout(() => {
        setQrGenerated(true);
        setIsGenerating(false);
      }, 100);

    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Error al generar el código QR');
      setIsGenerating(false);
    }
  }, [qrToken, isFullscreen]);

  // Generar el código QR cuando el componente se monta
  useEffect(() => {
    if (!qrToken) {
      setError('Token QR no disponible');
      setIsGenerating(false);
      return;
    }

    // Esperar un poco más para que el canvas esté completamente listo
    const timer = setTimeout(() => {
      generateQRCode();
    }, 300);

    return () => clearTimeout(timer);
  }, [qrToken, generateQRCode]);

  const downloadQRCode = () => {
    if (!canvasRef.current || !qrGenerated) return;

    try {
      // Crear un canvas más grande para la descarga
      const downloadCanvas = document.createElement('canvas');
      const ctx = downloadCanvas.getContext('2d');
      if (!ctx) return;

      // Configurar el canvas de descarga
      downloadCanvas.width = 800;
      downloadCanvas.height = 1200;

      // Función para dividir texto en líneas si es largo
      const wrapText = (text: string, maxWidth: number, font: string) => {
        ctx.font = font;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        return lines;
      };

      // Cargar la plantilla de Canva
      const templateImage = new Image();
      templateImage.src = '/qr/ticket-template.png';
      templateImage.onload = () => {
        // Dibujar la plantilla como fondo
        ctx.drawImage(templateImage, 0, 0, downloadCanvas.width, downloadCanvas.height);

        // Dibujar el QR code
        if (!canvasRef.current) return;
        ctx.drawImage(canvasRef.current, 150, 225, 500, 500);

        // Configurar texto
        ctx.fillStyle = '#071637';
        ctx.textAlign = 'center';

        // Título del evento (con wrapping)
        const titleLines = wrapText(eventTitle, 600, 'bold 24px Arial');
        let yPos = 775;
        titleLines.forEach(line => {
          ctx.font = 'bold 24px Arial';
          ctx.fillText(line, downloadCanvas.width / 2, yPos);
          yPos += 30; // Espacio entre líneas
        });

        // Información del evento
        ctx.font = '16px Arial';
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

        ctx.fillText(formatDate(eventDate), downloadCanvas.width / 2, yPos + 30);
        ctx.fillText(eventLocation, downloadCanvas.width / 2, yPos + 60);
        ctx.fillText(userName, downloadCanvas.width / 2, yPos + 90);

        // Instrucciones
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText('Presenta este código en el evento para hacer check-in', downloadCanvas.width / 2, yPos + 140);

        // Descargar la imagen
        const link = document.createElement('a');
        link.download = `ticket-${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
      };
      templateImage.onerror = () => {
        console.error('Error loading template image');
      };
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
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
    <div className={`mx-auto ${isFullscreen ? 'w-full' : 'max-w-md'} bg-surface ${isFullscreen ? '' : 'rounded-2xl overflow-hidden shadow-lg border border-border'}`}>
      {/* Contenido principal - solo QR */}
      <div className="p-6">
        {/* Código QR centrado */}
        <div className={`text-center ${isFullscreen ? 'mb-8' : 'mb-6'}`}>
          <div className="inline-block bg-white rounded-xl shadow-lg border border-gray-200 relative p-4">
            {/* Spinner overlay */}
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Generando QR...</p>
                </div>
              </div>
            )}

            {/* Canvas simple */}
            <canvas
              ref={canvasRef}
              className={`block mx-auto bg-white ${isGenerating ? 'opacity-0' : 'opacity-100'}`}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Mensaje en pantalla completa */}
          {isFullscreen && !isGenerating && (
            <p className="text-xl font-medium text-text-primary mt-6">
              Presenta este código para hacer check-in
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
      </div>
    </div>
  );
}