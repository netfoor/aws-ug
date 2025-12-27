'use client';

import React, { useState } from 'react';
import { MapPin, ExternalLink, Check } from 'lucide-react';

// Lugares predefinidos más comunes
const PREDEFINED_LOCATIONS = [
  {
    id: 'default',
    name: "Italiann's Puebla San Francisco",
    mapsUrl: 'https://maps.app.goo.gl/HzQmzCJQmiMSM23o6',
  },
  // Puedes agregar más lugares aquí cuando los tengas
];

interface LocationSelectorProps {
  value: {
    location: string;
    locationAddress?: string;
    locationMapsUrl?: string;
  };
  onChange: (value: {
    location: string;
    locationAddress?: string;
    locationMapsUrl?: string;
  }) => void;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Componente para seleccionar ubicación con lugares predefinidos
 * Permite seleccionar un lugar predefinido o pegar una URL de Google Maps
 */
export default function LocationSelector({
  value,
  onChange,
  required = false,
  disabled = false,
}: LocationSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMapsUrl, setCustomMapsUrl] = useState(value.locationMapsUrl || '');
  const [customLocation, setCustomLocation] = useState(value.location || '');

  // Extraer coordenadas o place ID de la URL de Maps para el embed
  const getEmbedUrl = (mapsUrl: string): string | null => {
    if (!mapsUrl) return null;

    // Formato: https://maps.app.goo.gl/xxxxx
    // O: https://www.google.com/maps/place/...
    // O: https://www.google.com/maps/@lat,lng,zoom
    try {
      // Si es un short URL de goo.gl, necesitamos expandirlo o usar el formato embed
      // Para embed, podemos usar: https://www.google.com/maps/embed?pb=...
      // Pero la forma más simple es usar el iframe de Google Maps con la URL completa
      
      // Convertir maps.app.goo.gl a formato embed
      if (mapsUrl.includes('maps.app.goo.gl')) {
        // Usar la URL directamente en un iframe (Google Maps lo maneja)
        return mapsUrl;
      }
      
      // Si ya es una URL de maps.google.com, usarla directamente
      if (mapsUrl.includes('google.com/maps')) {
        return mapsUrl;
      }

      return mapsUrl;
    } catch {
      return null;
    }
  };

  const handleSelectPredefined = (location: typeof PREDEFINED_LOCATIONS[0]) => {
    onChange({
      location: location.name,
      locationMapsUrl: location.mapsUrl,
      locationAddress: undefined, // Se puede mantener si ya existe
    });
    setShowCustomInput(false);
    setCustomMapsUrl('');
    setCustomLocation('');
  };

  const handleUseCustom = () => {
    setShowCustomInput(true);
  };

  const handleCustomSubmit = () => {
    if (!customLocation.trim()) {
      return;
    }

    onChange({
      location: customLocation.trim(),
      locationMapsUrl: customMapsUrl.trim() || undefined,
      locationAddress: undefined,
    });
  };

  const handleClear = () => {
    onChange({
      location: '',
      locationMapsUrl: undefined,
      locationAddress: undefined,
    });
    setShowCustomInput(false);
    setCustomMapsUrl('');
    setCustomLocation('');
  };

  const selectedPredefined = PREDEFINED_LOCATIONS.find(
    loc => loc.mapsUrl === value.locationMapsUrl
  );

  return (
    <div className="space-y-3">
      {/* Lugares Predefinidos */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Seleccionar lugar predefinido
        </label>
        <div className="space-y-2">
          {PREDEFINED_LOCATIONS.map((location) => {
            const isSelected = selectedPredefined?.id === location.id;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => handleSelectPredefined(location)}
                disabled={disabled}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50 bg-surface'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      isSelected ? 'text-accent' : 'text-text-secondary'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${
                        isSelected ? 'text-accent' : 'text-text-primary'
                      }`}>
                        {location.name}
                      </p>
                      <a
                        href={location.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-text-secondary hover:text-accent flex items-center gap-1 mt-1"
                      >
                        Ver en Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Opción: Usar lugar personalizado */}
      {!showCustomInput ? (
        <button
          type="button"
          onClick={handleUseCustom}
          disabled={disabled}
          className="w-full p-3 rounded-lg border border-border hover:border-accent/50 bg-surface text-text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Usar otro lugar
        </button>
      ) : (
        <div className="p-4 border border-border rounded-lg bg-surface space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nombre del lugar *
            </label>
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Ej: WeWork Angelópolis"
              disabled={disabled}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              URL de Google Maps (opcional)
            </label>
            <input
              type="url"
              value={customMapsUrl}
              onChange={(e) => setCustomMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/xxxxx o https://maps.google.com/..."
              disabled={disabled}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary text-sm"
            />
            <p className="text-xs text-text-secondary mt-1">
              Pega la URL completa de Google Maps del lugar
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={disabled || !customLocation.trim()}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Usar este lugar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomMapsUrl('');
                setCustomLocation('');
              }}
              disabled={disabled}
              className="px-4 py-2 bg-background border border-border text-text-primary rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Preview del lugar seleccionado */}
      {value.location && (
        <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1">
              <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {value.location}
                </p>
                {value.locationMapsUrl && (
                  <a
                    href={value.locationMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline flex items-center gap-1 mt-1"
                  >
                    Ver en Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Campo oculto para el formulario (si se necesita) */}
      <input
        type="hidden"
        value={value.location}
        required={required}
      />
    </div>
  );
}

