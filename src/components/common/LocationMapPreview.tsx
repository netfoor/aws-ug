'use client';

import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

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
    // Prioridad: usar dirección si existe, sino nombre del lugar
    const query = locationAddress || location;
    
    // Usar el formato de embed con parámetros adicionales para minimizar elementos
    // Nota: El texto "View larger map" no se puede quitar completamente sin API key
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&iwloc=near`;
  };

  // URL para abrir en Google Maps - usar URL directa si existe, sino crear una simple
  const getMapsLink = (): string => {
    // Si hay URL de Maps guardada, usarla directamente
    if (locationMapsUrl) {
      return locationMapsUrl;
    }
    
    // Si no, crear URL de búsqueda simple (sin api=1 que puede causar problemas)
    const query = locationAddress || location;
    return `https://www.google.com/maps/search/?query=${encodeURIComponent(query)}`;
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
