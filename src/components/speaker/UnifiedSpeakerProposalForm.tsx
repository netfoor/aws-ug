'use client';

import React, { useState } from 'react';
import { Loader2, User, Briefcase, Lightbulb, Calendar, FileText, Upload, LinkIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import LastThursdaySelector from './LastThursdaySelector';
import { uploadSpeakerPhoto, uploadSpeakerCV, validateLinkedInUrl, EXPERTISE_AREAS, formatFileSize } from '@/lib/speaker-uploads';

interface UnifiedFormData {
  // Datos personales (ya en User table, solo para display)
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber: string;
  
  // Perfil profesional
  company: string;
  jobTitle: string;
  expertiseArea: string;
  
  // Archivos
  photoFile: File | null;
  photoKey: string | null;
  cvFile: File | null;
  cvKey: string | null;
  linkedInUrl: string;
  
  // Speaker Application
  motivation: string;
  experience: string;
  topics: string[];
  
  // Talk Proposal
  talkTitle: string;
  talkDescription: string;
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate: Date | null;
}

interface UnifiedSpeakerProposalFormProps {
  userId: string;
  userEmail: string;
  userName: string;
  onSubmit: (data: UnifiedFormData) => Promise<void>;
  onCancel: () => void;
}

export default function UnifiedSpeakerProposalForm({
  userId,
  userEmail,
  userName,
  onSubmit,
  onCancel,
}: UnifiedSpeakerProposalFormProps) {
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<UnifiedFormData>({
    givenName: userName.split(' ')[0] || '',
    familyName: userName.split(' ').slice(1).join(' ') || '',
    email: userEmail,
    phoneNumber: '',
    company: '',
    jobTitle: '',
    expertiseArea: '',
    photoFile: null,
    photoKey: null,
    cvFile: null,
    cvKey: null,
    linkedInUrl: '',
    motivation: '',
    experience: '',
    topics: [],
    talkTitle: '',
    talkDescription: '',
    duration: 45,
    targetAudience: 'ALL',
    proposedDate: null,
  });

  // Upload states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProgress, setCvProgress] = useState(0);

  // Topic input
  const [topicInput, setTopicInput] = useState('');

  // Handle photo selection
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setPhotoUploading(true);
    setPhotoProgress(0);

    const result = await uploadSpeakerPhoto(userId, file, (progress) => {
      setPhotoProgress(progress);
    });

    setPhotoUploading(false);

    if (result.success && result.key) {
      setFormData({ ...formData, photoFile: file, photoKey: result.key });
    } else {
      setError(result.error || 'Error al subir la foto');
      setPhotoPreview(null);
    }
  }

  // Handle CV selection
  async function handleCvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCvUploading(true);
    setCvProgress(0);

    const result = await uploadSpeakerCV(userId, file, (progress) => {
      setCvProgress(progress);
    });

    setCvUploading(false);

    if (result.success && result.key) {
      setFormData({ ...formData, cvFile: file, cvKey: result.key });
    } else {
      setError(result.error || 'Error al subir el CV');
    }
  }

  // Add topic
  function handleAddTopic() {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData({ ...formData, topics: [...formData.topics, topicInput.trim()] });
      setTopicInput('');
    }
  }

  // Remove topic
  function handleRemoveTopic(topic: string) {
    setFormData({ ...formData, topics: formData.topics.filter((t) => t !== topic) });
  }

  // Validate section
  function validateSection(section: number): boolean {
    setError(null);

    switch (section) {
      case 1: // Datos personales
        if (!formData.phoneNumber) {
          setError('El teléfono es requerido');
          return false;
        }
        if (!formData.photoKey) {
          setError('Debes subir tu foto profesional');
          return false;
        }
        return true;

      case 2: // Trayectoria profesional
        if (!formData.cvKey && !formData.linkedInUrl) {
          setError('Debes proporcionar tu CV o tu perfil de LinkedIn');
          return false;
        }
        if (formData.linkedInUrl) {
          const validation = validateLinkedInUrl(formData.linkedInUrl);
          if (!validation.valid) {
            setError(validation.error || 'URL de LinkedIn inválida');
            return false;
          }
        }
        return true;

      case 3: // Datos de trabajo
        if (!formData.company) {
          setError('La empresa es requerida');
          return false;
        }
        if (!formData.jobTitle) {
          setError('El puesto es requerido');
          return false;
        }
        if (!formData.expertiseArea) {
          setError('El área de especialización es requerida');
          return false;
        }
        if (!formData.motivation) {
          setError('La motivación es requerida');
          return false;
        }
        if (!formData.experience) {
          setError('La experiencia es requerida');
          return false;
        }
        if (formData.topics.length === 0) {
          setError('Debes agregar al menos un tema de interés');
          return false;
        }
        return true;

      case 4: // Propuesta de charla
        if (!formData.talkTitle) {
          setError('El título de la charla es requerido');
          return false;
        }
        if (!formData.talkDescription) {
          setError('La descripción es requerida');
          return false;
        }
        return true;

      case 5: // Fecha
        if (!formData.proposedDate) {
          setError('Debes seleccionar una fecha');
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  // Next section
  function handleNext() {
    if (validateSection(currentSection)) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Previous section
  function handlePrevious() {
    setCurrentSection(currentSection - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Submit
  async function handleSubmit() {
    if (!validateSection(currentSection)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Error al enviar el formulario. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Progress indicator
  const progress = (currentSection / 5) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Sección {currentSection} de 5
          </span>
          <span className="text-sm font-medium text-accent">
            {Math.round(progress)}% completado
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Section 1: Datos Personales */}
      {currentSection === 1 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Datos Personales</h2>
              <p className="text-sm text-text-secondary">
                En esta sección, te pedimos que ingreses tu información personal básica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="givenName">Nombre *</Label>
              <Input
                id="givenName"
                value={formData.givenName}
                onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div>
              <Label htmlFor="familyName">Apellidos *</Label>
              <Input
                id="familyName"
                value={formData.familyName}
                onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                placeholder="Pérez García"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phoneNumber">Móvil *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+52 222 123 4567"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-100 dark:bg-gray-800"
            />
          </div>

          {/* Foto Personal */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              📸 Foto Personal <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-text-secondary mb-4">
              Sube una foto tuya que podamos utilizar para la <strong>promoción de tu participación en nuestros eventos</strong>. 
              Esta imagen será parte de los materiales de publicidad y difusión en nuestras redes sociales y plataformas.
            </p>

            <div className="flex items-start gap-4">
              {photoPreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-accent">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  {photoUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/20">
                  <Upload className="w-8 h-8 text-text-secondary" />
                </div>
              )}

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
                    ) : formData.photoKey ? (
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
                <p className="text-xs text-text-secondary mt-2">
                  JPG, PNG o WebP. Máximo 10MB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Trayectoria Profesional */}
      {currentSection === 2 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Trayectoria Profesional</h2>
              <p className="text-sm text-text-secondary">
                Elige cómo compartir tu trayectoria profesional con nosotros.
              </p>
            </div>
          </div>

          {/* CV Upload */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Subir CV (PDF)</Label>
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
                ) : formData.cvKey ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    {formData.cvFile?.name} ({formatFileSize(formData.cvFile?.size || 0)})
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

          {/* O separador */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-text-secondary font-medium">O</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* LinkedIn URL */}
          <div>
            <Label htmlFor="linkedin" className="text-base font-semibold mb-2 block">
              Perfil de LinkedIn
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  id="linkedin"
                  type="url"
                  value={formData.linkedInUrl}
                  onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Debes proporcionar al menos uno: CV o LinkedIn
            </p>
          </div>
        </div>
      )}

      {/* Section 3: Datos de Trabajo + Motivación */}
      {currentSection === 3 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Datos de Trabajo</h2>
              <p className="text-sm text-text-secondary">
                Cuéntanos más sobre tu experiencia laboral y motivación.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Empresa *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="AWS, Microsoft, etc."
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">Puesto de trabajo *</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="Solutions Architect, DevOps Engineer, etc."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expertiseArea">Área de especialización *</Label>
            <select
              id="expertiseArea"
              value={formData.expertiseArea}
              onChange={(e) => setFormData({ ...formData, expertiseArea: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary"
            >
              <option value="">Selecciona un área</option>
              {EXPERTISE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="motivation">Motivación *</Label>
            <Textarea
              id="motivation"
              value={formData.motivation}
              onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
              placeholder="¿Por qué quieres ser speaker en AWS User Group Puebla?"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="experience">Experiencia previa *</Label>
            <Textarea
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="Cuéntanos sobre tu experiencia dando charlas, webinars, o compartiendo conocimiento"
              rows={4}
            />
          </div>

          <div>
            <Label>Temas de interés (tecnologías AWS) *</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                placeholder="Ej: Lambda, ECS, S3..."
              />
              <Button type="button" variant="outline" onClick={handleAddTopic}>
                Agregar
              </Button>
            </div>
            {formData.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm flex items-center gap-2"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(topic)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Propuesta de Tema */}
      {currentSection === 4 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Lightbulb className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Propuesta de Tema</h2>
              <p className="text-sm text-text-secondary">
                ¡Este es el momento para compartir tu idea!
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="talkTitle">Título de la Plática *</Label>
            <Input
              id="talkTitle"
              value={formData.talkTitle}
              onChange={(e) => setFormData({ ...formData, talkTitle: e.target.value })}
              placeholder="Ej: Arquitecturas Serverless con AWS Lambda"
            />
          </div>

          <div>
            <Label htmlFor="talkDescription">Breve descripción del tema *</Label>
            <Textarea
              id="talkDescription"
              value={formData.talkDescription}
              onChange={(e) => setFormData({ ...formData, talkDescription: e.target.value })}
              placeholder="Describe de qué tratará tu charla, qué aprenderán los asistentes, y por qué es relevante..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duración de la Plática (minutos) *</Label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <div>
              <Label htmlFor="targetAudience">Nivel del público *</Label>
              <select
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary"
              >
                <option value="ALL">Todos los niveles</option>
                <option value="BEGINNER">Principiante</option>
                <option value="INTERMEDIATE">Intermedio</option>
                <option value="ADVANCED">Avanzado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Elección de Fecha */}
      {currentSection === 5 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Elección de Fecha</h2>
              <p className="text-sm text-text-secondary">
                Selecciona la fecha que mejor se adapte a tu disponibilidad.
              </p>
            </div>
          </div>

          <LastThursdaySelector
            selectedDate={formData.proposedDate}
            onDateSelect={(date) => setFormData({ ...formData, proposedDate: date })}
            disabled={false}
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-4 mt-8">
        {currentSection > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isSubmitting}
            className="flex-1"
          >
            ← Anterior
          </Button>
        )}

        {currentSection === 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}

        {currentSection < 5 ? (
          <Button
            type="button"
            variant="accent"
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1"
          >
            Siguiente →
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.proposedDate}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              '✅ Enviar Propuesta Completa'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
