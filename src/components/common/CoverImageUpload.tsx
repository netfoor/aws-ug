'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadData } from 'aws-amplify/storage';
import { optimizeImage, validateImageFile, createImagePreview, revokeImagePreview } from '@/lib/image-optimizer';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';

/**
 * 📸 CoverImageUpload - Componente reutilizable para subir imágenes de portada
 * 
 * Características:
 * - Validación de archivos (tipo, tamaño)
 * - Optimización automática a WebP
 * - Preview en tiempo real
 * - Upload a S3 con Amplify Storage
 * - Estados de loading y error
 * - Responsive y dark mode
 * 
 * Uso:
 * ```tsx
 * <CoverImageUpload
 *   eventId={eventId}
 *   currentImageUrl={existingUrl}
 *   onImageUploaded={(url) => console.log('Uploaded:', url)}
 *   onError={(error) => console.error(error)}
 *   disabled={isSubmitting}
 * />
 * ```
 */

interface CoverImageUploadProps {
  // ID del evento (para construir el path en S3)
  eventId?: string;
  
  // URL de imagen actual (para modo edición)
  currentImageUrl?: string | null;
  
  // Callbacks
  onImageUploaded?: (imageUrl: string) => void;
  onImageSelected?: (file: File, previewUrl: string) => void; // Para cuando solo se selecciona sin subir
  onImageRemoved?: () => void;
  onError?: (error: string) => void;
  
  // Configuración
  disabled?: boolean;
  autoUpload?: boolean; // Si true, sube automáticamente al seleccionar
  maxSizeMB?: number; // Tamaño máximo en MB
  compact?: boolean; // Modo compacto para espacios pequeños
  
  // Opciones de optimización
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export default function CoverImageUpload({
  eventId,
  currentImageUrl,
  onImageUploaded,
  onImageSelected,
  onImageRemoved,
  onError,
  disabled = false,
  autoUpload = false,
  maxSizeMB = 10,
  compact = false,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.85,
}: CoverImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Limpiar preview al desmontar
  React.useEffect(() => {
    return () => {
      if (previewUrl && !currentImageUrl) {
        revokeImagePreview(previewUrl);
      }
    };
  }, [previewUrl, currentImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsOptimizing(true);

    try {
      // 1. Validar archivo
      const validation = validateImageFile(file, maxSizeMB);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Imagen no válida';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsOptimizing(false);
        return;
      }

      // 2. Optimizar imagen
      const optimized = await optimizeImage(file, {
        maxWidth,
        maxHeight,
        quality,
        format: 'webp'
      });

      // 3. Crear preview
      const preview = createImagePreview(optimized);
      if (previewUrl && previewUrl !== currentImageUrl) {
        revokeImagePreview(previewUrl);
      }
      setPreviewUrl(preview);
      setSelectedFile(optimized);

      // 4. Callback de selección
      onImageSelected?.(optimized, preview);

      // 5. Auto-upload si está habilitado y tenemos eventId
      if (autoUpload && eventId) {
        await uploadImage(optimized);
      }

      setIsOptimizing(false);
    } catch (err) {
      console.error('Error procesando imagen:', err);
      const errorMsg = 'Error al procesar la imagen';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsOptimizing(false);
    }
  };

  const uploadImage = async (file: File = selectedFile!): Promise<string | null> => {
    if (!file) {
      const errorMsg = 'No hay archivo para subir';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    if (!eventId) {
      const errorMsg = 'Se requiere eventId para subir la imagen';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const fileName = `events/${eventId}/cover-${Date.now()}.webp`;
      
      const result = await uploadData({
        path: fileName,
        data: file,
        options: {
          contentType: 'image/webp',
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = Math.round((transferredBytes / totalBytes) * 100);
              setUploadProgress(progress);
            }
          }
        }
      }).result;
      
      // Callback de éxito
      const uploadedPath = result.path;
      onImageUploaded?.(uploadedPath);
      
      setIsUploading(false);
      return uploadedPath;
      
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      const errorMsg = 'Error al subir la imagen';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsUploading(false);
      return null;
    }
  };

  const handleRemove = useCallback(() => {
    if (previewUrl && previewUrl !== currentImageUrl) {
      revokeImagePreview(previewUrl);
    }
    setPreviewUrl(currentImageUrl || null);
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    onImageRemoved?.();
  }, [previewUrl, currentImageUrl, onImageRemoved]);

  const isProcessing = isOptimizing || isUploading;
  const hasPreview = !!previewUrl;
  const showUploadButton = !autoUpload && selectedFile && !isUploading;

  // ========================================
  // COMPACT MODE
  // ========================================
  if (compact) {
    return (
      <div className="space-y-3">
        {hasPreview ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isProcessing}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3 h-3" />
            </button>
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
                  <p className="text-xs">
                    {isOptimizing ? 'Procesando...' : `Subiendo... ${uploadProgress}%`}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Label htmlFor="coverImage-compact" className="cursor-pointer">
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-accent theme-transition">
              <Upload className="w-6 h-6 mx-auto text-text-secondary mb-1" />
              <p className="text-xs text-text-secondary">
                Subir imagen
              </p>
            </div>
          </Label>
        )}

        <input
          id="coverImage-compact"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || isProcessing}
          className="hidden"
        />

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {showUploadButton && (
          <Button
            type="button"
            size="sm"
            onClick={() => uploadImage()}
            disabled={disabled}
            className="w-full"
          >
            <Upload className="w-3 h-3 mr-1" />
            Subir
          </Button>
        )}
      </div>
    );
  }

  // ========================================
  // FULL MODE
  // ========================================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Imagen de portada</Label>
        {hasPreview && (
          <span className="text-xs text-text-secondary">
            {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Imagen actual'}
          </span>
        )}
      </div>

      {!hasPreview ? (
        <div>
          <Label htmlFor="coverImage" className="cursor-pointer">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent theme-transition">
              <div className="flex flex-col items-center gap-3">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-accent animate-spin" />
                    <p className="text-text-primary font-medium">
                      {isOptimizing ? 'Procesando imagen...' : 'Subiendo...'}
                    </p>
                    {isUploading && (
                      <div className="w-full max-w-xs">
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-text-secondary" />
                    <div>
                      <p className="text-text-primary font-medium">
                        Click para subir imagen de portada
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        JPG, PNG o WebP. Máximo {maxSizeMB}MB.
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        Se optimizará automáticamente a {maxWidth}x{maxHeight}px
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Label>
          <input
            id="coverImage"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="Cover preview"
            className="w-full h-64 object-cover rounded-lg border border-border"
          />
          
          {/* Overlay en hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg" />
          
          {/* Botones */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isProcessing}
              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
              <p className="text-white font-medium">
                {isOptimizing ? 'Procesando...' : 'Subiendo...'}
              </p>
              {isUploading && (
                <div className="w-48 mt-3">
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white mt-1 text-center">
                    {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          {selectedFile && !isProcessing && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs">
              Optimizada: {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Upload button (si no es auto-upload) */}
      {showUploadButton && (
        <Button
          type="button"
          variant="accent"
          onClick={() => uploadImage()}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <Upload className="w-4 h-4 mr-2" />
          Subir imagen a S3
        </Button>
      )}

      {/* Mensaje de imagen actual */}
      {currentImageUrl && !selectedFile && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Imagen actual cargada
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Selecciona una nueva imagen para reemplazarla
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
