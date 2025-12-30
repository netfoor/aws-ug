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
 * Usa Google Maps Embed API (no bloqueada por X-Frame-Options)
 */
export default function LocationMapPreview({
  location,
  locationMapsUrl,
  locationAddress,
  className = '',
  showTitle = true,
}: LocationMapPreviewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Generar query para Google Maps Embed API
  const getEmbedQuery = (): string => {
    // Prioridad: dirección > nombre del lugar
    return locationAddress || location;
  };

  // Link para abrir en Google Maps en nueva pestaña
  const getMapsLink = (): string => {
    if (locationMapsUrl) return locationMapsUrl;
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
  };

  if (!apiKey) {
    console.warn('Google Maps API key no configurada');
    return null;
  }

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

      {/* Mapa embebido usando Google Maps Embed API */}
      <div className="w-full rounded-lg overflow-hidden border border-border shadow-sm bg-surface">
        <iframe
          width="100%"
          height="300"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={`Mapa de ${location}`}
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(getEmbedQuery())}&zoom=15`}
        />
      </div>

      {/* Link para abrir en Google Maps en nueva pestaña */}
      <a
        href={getMapsLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-accent hover:underline text-sm font-medium"
      >
        Abrir ubicación en Google Maps
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}


