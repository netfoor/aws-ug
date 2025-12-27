'use client';

import { useState } from 'react';
import { Briefcase, Upload, FileText, Link as LinkIcon, Loader2, Check, AlertCircle } from 'lucide-react';
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

interface SpeakerProfileEditorProps {
  userId: string;
  currentData: {
    speakerPhotoKey?: string;
    speakerCvKey?: string;
    linkedInUrl?: string;
    expertiseArea?: string;
    company?: string;
    jobTitle?: string;
  };
  onSave: (data: SpeakerProfileData) => Promise<void>;
  onCancel?: () => void;
}

export interface SpeakerProfileData {
  speakerPhotoKey?: string;
  speakerCvKey?: string;
  linkedInUrl?: string;
  expertiseArea?: string;
  company?: string;
  jobTitle?: string;
}

/**
 * 🎤 Editor de Perfil Profesional para Speakers
 * 
 * Componente optimizado para EDITAR perfil existente.
 * Muestra datos actuales y permite actualizarlos.
 * Diseñado para speakers que ya completaron su perfil inicial.
 */
export default function SpeakerProfileEditor({
  userId,
  currentData,
  onSave,
  onCancel,
}: SpeakerProfileEditorProps) {
  // Estado de archivos
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState<string | undefined>(currentData.speakerPhotoKey);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvKey, setCvKey] = useState<string | undefined>(currentData.speakerCvKey);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProgress, setCvProgress] = useState(0);

  // Estado de campos
  const [linkedInUrl, setLinkedInUrl] = useState(currentData.linkedInUrl || '');
  const [expertiseArea, setExpertiseArea] = useState<string>(currentData.expertiseArea || '');
  const [company, setCompany] = useState(currentData.company || '');
  const [jobTitle, setJobTitle] = useState(currentData.jobTitle || '');

  // Estado general
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handler para foto
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);
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
      setSuccessMessage('Foto actualizada correctamente');
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
    setSuccessMessage(null);
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
      setSuccessMessage('CV actualizado correctamente');
    } else {
      setError(result.error || 'Error al subir el CV');
      setCvFile(null);
    }
  }

  // Validar y guardar
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

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

    // Foto es requerida
    if (!photoKey) {
      setError('La foto profesional es requerida');
      return;
    }

    // Área de especialización es requerida
    if (!expertiseArea) {
      setError('El área de especialización es requerida');
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        speakerPhotoKey: photoKey,
        speakerCvKey: cvKey,
        linkedInUrl: linkedInUrl || undefined,
        expertiseArea: expertiseArea || undefined,
        company: company || undefined,
        jobTitle: jobTitle || undefined,
      });
      
      setSuccessMessage('¡Perfil actualizado exitosamente!');
      
      // Auto-cerrar después de 2 segundos si hay onCancel
      if (onCancel) {
        setTimeout(() => {
          onCancel();
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving professional profile:', err);
      setError('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit = photoKey && (cvKey || linkedInUrl) && expertiseArea && !photoUploading && !cvUploading && !isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-accent/10 rounded-lg">
          <Briefcase className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Editar Perfil Profesional</h2>
          <p className="text-sm text-text-secondary">
            Actualiza tu información como speaker
          </p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Foto Profesional */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label className="text-base font-semibold mb-3 sm:mb-4 block">
          📸 Foto Personal <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Esta foto se utilizará en nuestras redes sociales, página web y materiales promocionales del evento.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Preview */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            {photoPreview || (photoKey && currentData.speakerPhotoKey) ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview || `/api/s3-proxy?key=${currentData.speakerPhotoKey}`}
                  alt="Foto actual"
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
              id="photo-upload-edit"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoSelect}
              disabled={photoUploading}
              className="hidden"
            />
            <label htmlFor="photo-upload-edit">
              <Button
                type="button"
                variant="outline"
                disabled={photoUploading}
                onClick={() => document.getElementById('photo-upload-edit')?.click()}
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
                    Nueva foto cargada
                  </>
                ) : currentData.speakerPhotoKey ? (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Cambiar Foto
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Foto
                  </>
                )}
              </Button>
            </label>
            {photoFile && (
              <p className="text-xs text-text-secondary mt-2">
                {photoFile.name} ({formatFileSize(photoFile.size)})
              </p>
            )}
            {!photoFile && currentData.speakerPhotoKey && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Foto actual cargada
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CV y LinkedIn */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label className="text-base font-semibold mb-3 sm:mb-4 block">
          💼 Trayectoria Profesional <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Actualiza tu CV o perfil de LinkedIn. Debes proporcionar al menos uno.
        </p>

        <div className="space-y-4">
          {/* CV Upload */}
          <div>
            <input
              type="file"
              id="cv-upload-edit"
              accept="application/pdf"
              onChange={handleCvSelect}
              disabled={cvUploading}
              className="hidden"
            />
            <label htmlFor="cv-upload-edit">
              <Button
                type="button"
                variant="outline"
                disabled={cvUploading}
                onClick={() => document.getElementById('cv-upload-edit')?.click()}
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
                    CV actual - Cambiar
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir CV (PDF)
                  </>
                )}
              </Button>
            </label>
            {!cvFile && currentData.speakerCvKey && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                CV actual cargado
              </p>
            )}
          </div>

          {/* LinkedIn URL */}
          <div>
            <Label htmlFor="linkedin-edit">Perfil de LinkedIn</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  id="linkedin-edit"
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  className="pl-10"
                />
              </div>
            </div>
            {linkedInUrl && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                LinkedIn configurado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Área de Especialización */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label htmlFor="expertiseArea-edit" className="text-base font-semibold mb-3 sm:mb-4 block">
          🎯 Área de Especialización <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Tu área principal de especialización en tecnología AWS.
        </p>

        <select
          id="expertiseArea-edit"
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

      {/* Información Laboral (Opcional) */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 shadow theme-transition">
        <Label className="text-base font-semibold mb-3 sm:mb-4 block">
          🏢 Información Laboral (Opcional)
        </Label>
        <p className="text-sm text-text-secondary mb-4">
          Ayúdanos a conocer más sobre tu experiencia profesional.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="company-edit">Empresa</Label>
            <Input
              id="company-edit"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ej: AWS, Microsoft, Google"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="jobTitle-edit">Puesto de Trabajo</Label>
            <Input
              id="jobTitle-edit"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ej: Cloud Solutions Architect"
              maxLength={100}
            />
          </div>
        </div>
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
              Guardando cambios...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
