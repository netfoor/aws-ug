'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Upload, FileText, Link as LinkIcon, Loader2, Check } from 'lucide-react';
import { getUrl } from 'aws-amplify/storage';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import {
  uploadSpeakerPhoto,
  uploadSpeakerCV,
  deleteSpeakerFile,
  validateLinkedInUrl,
  formatFileSize,
  EXPERTISE_AREAS,
} from '@/lib/speaker-uploads';

interface ProfessionalProfileFormProps {
  userId: string;
  initialData?: {
    speakerPhotoKey?: string;
    speakerCvKey?: string;
    linkedInUrl?: string;
    expertiseArea?: string;
  };
  onSave: (data: ProfessionalProfileData) => Promise<void>;
  onSkip?: () => void;
  showSkipButton?: boolean;
}

export interface ProfessionalProfileData {
  speakerPhotoKey?: string;
  speakerCvKey?: string;
  linkedInUrl?: string;
  expertiseArea?: string;
}

export default function ProfessionalProfileForm({
  userId,
  initialData,
  onSave,
  onSkip,
  showSkipButton = false,
}: ProfessionalProfileFormProps) {
  // Estado de archivos
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | undefined>(undefined);
  const [photoKey, setPhotoKey] = useState<string | undefined>(initialData?.speakerPhotoKey);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvKey, setCvKey] = useState<string | undefined>(initialData?.speakerCvKey);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProgress, setCvProgress] = useState(0);

  // Estado de campos
  const [linkedInUrl, setLinkedInUrl] = useState(initialData?.linkedInUrl || '');
  const [expertiseArea, setExpertiseArea] = useState<string>(initialData?.expertiseArea || '');

  // Estado general
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar URL firmada cuando photoKey cambie
  useEffect(() => {
    const loadPhotoSignedUrl = async () => {
      if (photoKey) {
        try {
          const urlResult = await getUrl({
            path: photoKey,
            options: {
              expiresIn: 3600, // 1 hour
            },
          });
          setPhotoSignedUrl(urlResult.url.toString());
        } catch (err) {
          console.warn('Error loading signed URL for photo:', err);
          setPhotoSignedUrl(undefined);
        }
      } else {
        setPhotoSignedUrl(undefined);
      }
    };

    loadPhotoSignedUrl();
  }, [photoKey]);

  // Handler para foto
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPhotoFile(file);

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Borrar foto vieja si existe (Sprint 2 - Tarea 3.2)
    if (photoKey) {
      await deleteSpeakerFile(photoKey);
    }

    // Upload automático
    setPhotoUploading(true);
    setPhotoProgress(0);

    const result = await uploadSpeakerPhoto(userId, file, (progress) => {
      setPhotoProgress(progress);
    });

    setPhotoUploading(false);

    if (result.success && result.key) {
      setPhotoKey(result.key);
    } else {
      setError(result.error || 'Error al subir la foto');
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  // Handler para CV
  async function handleCvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCvFile(file);

    // Borrar CV viejo si existe (Sprint 2 - Tarea 3.2)
    if (cvKey) {
      await deleteSpeakerFile(cvKey);
    }

    // Upload automático
    setCvUploading(true);
    setCvProgress(0);

    const result = await uploadSpeakerCV(userId, file, (progress) => {
      setCvProgress(progress);
    });

    setCvUploading(false);

    if (result.success && result.key) {
      setCvKey(result.key);
    } else {
      setError(result.error || 'Error al subir el CV');
      setCvFile(null);
    }
  }

  // Validar y guardar
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validar LinkedIn si se proporcionó
    if (linkedInUrl) {
      const validation = validateLinkedInUrl(linkedInUrl);
      if (!validation.valid) {
        setError(validation.error || 'URL de LinkedIn inválida');
        return;
      }
    }

    // Al menos CV o LinkedIn debe estar presente
    if (!cvKey && !linkedInUrl) {
      setError('Debes proporcionar tu CV o tu perfil de LinkedIn');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        speakerPhotoKey: photoKey,
        speakerCvKey: cvKey,
        linkedInUrl: linkedInUrl || undefined,
        expertiseArea: expertiseArea || undefined,
      });
    } catch (err) {
      console.error('Error saving professional profile:', err);
      setError('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit = (cvKey || linkedInUrl) && !photoUploading && !cvUploading && !isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-accent/10 rounded-lg">
          <Briefcase className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Perfil Profesional</h2>
          <p className="text-sm text-text-secondary">
            Completa tu información para destacar como speaker
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Foto Profesional */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label className="text-base font-semibold mb-3 sm:mb-4 block">
          📸 Foto Personal <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
        Sube una foto tuya que podamos utilizar para la promoción de tu participación en nuestros eventos. Esta imagen será parte de los <strong>materiales de publicidad y difusión en nuestras redes sociales y plataformas</strong>. Te recomendamos que sea una foto profesional y de alta calidad, que refleje tu mejor presentación.
        </p>
        <p className="text-xs text-amber-600 mb-3">
          📢 Tu foto se utilizará en nuestras redes sociales, página web y materiales promocionales del evento.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Preview */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            {photoPreview || photoSignedUrl ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview || photoSignedUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {photoUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/20 mx-auto sm:mx-0">
                <Upload className="w-8 h-8 text-text-secondary" />
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="flex-1">
            <input
              type="file"
              id="photo-upload"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoSelect}
              disabled={photoUploading}
              className="hidden"
            />
            <label htmlFor="photo-upload">
              <Button
                type="button"
                variant="outline"
                disabled={photoUploading}
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="cursor-pointer"
              >
                {photoUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo... {photoProgress}%
                  </>
                ) : photoFile ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Foto cargada
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Foto
                  </>
                )}
              </Button>
            </label>
            {photoFile && (
              <p className="text-xs text-text-secondary mt-2">
                {photoFile.name} ({formatFileSize(photoFile.size)})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CV */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label className="text-base font-semibold mb-3 sm:mb-4 block">
          💼 Trayectoria Profesional <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Elige cómo te gustaría compartir tu trayectoria profesional con nosotros. Puedes optar por 
          <strong> subir tu currículum vitae (CV) en formato PDF</strong> o <strong>proporcionar el enlace a tu perfil de LinkedIn</strong>. 
          Esta información será utilizada para presentarte adecuadamente durante el evento, destacando tus logros y experiencia.
        </p>
        <p className="text-xs text-amber-600 mb-4">
          ⚠️ Debes proporcionar al menos uno: CV o LinkedIn
        </p>

        <div className="space-y-4">
          {/* CV Upload */}
          <div>
            <input
              type="file"
              id="cv-upload"
              accept="application/pdf"
              onChange={handleCvSelect}
              disabled={cvUploading}
              className="hidden"
            />
            <label htmlFor="cv-upload">
              <Button
                type="button"
                variant="outline"
                disabled={cvUploading}
                onClick={() => document.getElementById('cv-upload')?.click()}
                className="cursor-pointer w-full"
              >
                {cvUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo... {cvProgress}%
                  </>
                ) : cvFile ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    {cvFile.name} ({formatFileSize(cvFile.size)})
                  </>
                ) : cvKey ? (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    CV ya cargado - Subir nuevo
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir CV (PDF)
                  </>
                )}
              </Button>
            </label>
          </div>

          {/* LinkedIn URL */}
          <div>
            <Label htmlFor="linkedin">Perfil de LinkedIn</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  id="linkedin"
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área de Especialización */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label htmlFor="expertiseArea" className="text-base font-semibold mb-3 sm:mb-4 block">
          🎯 Área de Especialización <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Selecciona el área en la que te especializas. Esta información nos ayudará a presentarte correctamente 
          y a organizar mejor los temas de nuestros eventos.
        </p>

        <select
          id="expertise"
          value={expertiseArea}
          onChange={(e) => setExpertiseArea(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
        >
          <option value="">Selecciona un área</option>
          {EXPERTISE_AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Perfil'
          )}
        </Button>

        {showSkipButton && onSkip && (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Omitir por ahora
          </Button>
        )}
      </div>
    </form>
  );
}
