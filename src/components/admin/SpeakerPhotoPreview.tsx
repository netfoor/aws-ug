'use client';

import React, { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { User, Loader2 } from 'lucide-react';

interface SpeakerPhotoPreviewProps {
  photoKey: string | null | undefined;
  speakerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 📸 SpeakerPhotoPreview
 * 
 * Muestra la foto del speaker obtenida de S3
 * Con fallback a avatar genérico si no hay foto
 */
export function SpeakerPhotoPreview({ 
  photoKey, 
  speakerName = 'Speaker',
  size = 'md' 
}: SpeakerPhotoPreviewProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  useEffect(() => {
    async function loadPhoto() {
      if (!photoKey) {
        setError(true);
        return;
      }

      setIsLoading(true);
      setError(false);

      try {
        const result = await getUrl({
          path: photoKey,
          options: {
            expiresIn: 3600, // 1 hora
          },
        });
        
        setPhotoUrl(result.url.toString());
      } catch (err) {
        console.error('Error loading speaker photo:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhoto();
  }, [photoKey]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-secondary/50 flex items-center justify-center border-2 border-border`}>
        <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
      </div>
    );
  }

  // Error or no photo - show fallback
  if (error || !photoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-white text-2xl font-bold border-2 border-accent shadow-lg`}>
        {speakerName ? speakerName[0].toUpperCase() : <User className="w-8 h-8" />}
      </div>
    );
  }

  // Photo loaded successfully
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-accent shadow-lg`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={`Foto de ${speakerName}`}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
