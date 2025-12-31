
/*
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Datos de ejemplo
const eventTitle = 'AWS User Group Puebla - Evento de Prueba y el tecto puede ser mas largo aqui';
const eventDate = '2025-12-31T10:00:00';
const eventLocation = 'Centro de Convenciones, Puebla';
const userName = 'Juan Pérez';

// Función para formatear fecha
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

// Generar QR de ejemplo (simulado con un cuadrado negro)
const generateQRCanvas = () => {
  const qrCanvas = createCanvas(500, 500);
  const ctx = qrCanvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 500, 500);
  return qrCanvas;
};

async function generateTicketExample() {
  try {
    // Crear canvas principal
    const canvas = createCanvas(800, 1200);
    const ctx = canvas.getContext('2d');

    // Cargar plantilla (asumiendo que existe)
    const templatePath = path.join(__dirname, '..', 'public', 'qr', 'ticket-template.png');
    if (fs.existsSync(templatePath)) {
      const templateImage = await loadImage(templatePath);
      ctx.drawImage(templateImage, 0, 0, 800, 1200);
    } else {
      console.log('Plantilla no encontrada, usando fondo blanco');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1200);
    }

    // Dibujar QR
    const qrCanvas = generateQRCanvas();
    ctx.drawImage(qrCanvas, 150, 225, 500, 500);

    // Configurar texto
    ctx.fillStyle = '#071637';
    ctx.textAlign = 'center';

    // Título
    ctx.font = 'bold 24px Arial';
    ctx.fillText(eventTitle, 400, 775);

    // Fecha
    ctx.font = '16px Arial';
    ctx.fillText(formatDate(eventDate), 400, 805);

    // Ubicación
    ctx.fillText(eventLocation, 400, 835);

    // Usuario
    ctx.fillText(userName, 400, 865);

    // Instrucciones
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('Presenta este código en el evento para hacer check-in', 400, 895);

    // Guardar imagen
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '..', 'example-ticket.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Ejemplo generado en: ${outputPath}`);
  } catch (err) {
    console.error('Error generando ejemplo:', err);
  }
}

generateTicketExample();

*/