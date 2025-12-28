'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationMapPreviewProps {
  location: string;
  locationMapsUrl?: string;
  locationAddress?: string;
  className?: string;
  showTitle?: boolean;
}

/**
 * Componente para mostrar preview del mapa de Google Maps
 * Renderiza un iframe con el mapa embebido mostrando el pin del lugar
 */
export default function LocationMapPreview({
  location,
  locationMapsUrl,
  locationAddress,
  className = '',
  showTitle = true,
}: LocationMapPreviewProps) {
  // Obtener URL para embeber el mapa
  // Google Maps bloquea el embedding de URLs normales (X-Frame-Options)
  // Debemos usar el formato ?q=...&output=embed que sí permite embedding
  const getEmbedUrl = (): string => {
    // Si hay una URL de Maps guardada, intentar usarla directamente
    // (aunque Google Maps generalmente bloquea el embedding de URLs compartidas)
    if (locationMapsUrl) {
      // Para URLs de maps.app.goo.gl o maps.google.com, usarlas directamente
      // El iframe de Google Maps puede manejar estas URLs
      return locationMapsUrl;
    }
    
    // Si no hay URL guardada, generar una basada en la ubicación
    // Prioridad: usar dirección si existe, sino nombre del lugar
    const query = locationAddress || location;
    
    // Usar el formato de embed con parámetros adicionales para minimizar elementos
    // Nota: El texto "View larger map" no se puede quitar completamente sin API key
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&iwloc=near`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-text-primary">Ubicación</h3>
        </div>
      )}

      {/* Información del lugar */}
      <div>
        <p className="text-text-primary font-medium mb-1">{location}</p>
        {locationAddress && (
          <p className="text-text-secondary text-sm mb-2">{locationAddress}</p>
        )}
      </div>

      {/* Mapa embebido - rectangular (más ancho que alto) */}
      <div className="w-full rounded-lg overflow-hidden border border-border shadow-sm bg-surface relative">
        <iframe
          src={getEmbedUrl()}
          width="100%"
          height="250"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
          title={`Mapa de ${location}`}
        />
        {/* Nota: El texto "View larger map" es parte del iframe de Google Maps y no se puede quitar
            sin usar la API de Google Maps Embed (requiere API key). Esto es una limitación de Google Maps. */}
      </div>

      {/* Link para abrir en Maps (temporalente oculto)
      <a
        href={getMapsLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-accent hover:underline text-sm font-medium"
      >
        Abrir en Google Maps
        <ExternalLink className="w-4 h-4" />
      </a>
      */}
    </div>
  );
}
