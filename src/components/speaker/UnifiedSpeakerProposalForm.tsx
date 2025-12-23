'use client';

import React, { useState, useCallback } from 'react';
import { User, Briefcase, Lightbulb, Calendar, FileText, Upload, LinkIcon, Check, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import DateSelector from '@/components/common/DateSelector';
import { uploadSpeakerPhoto, uploadSpeakerCV, EXPERTISE_AREAS, formatFileSize } from '@/lib/speaker-uploads';
import {
  validateFormSection,
  validateCompleteForm,
  validateProfessionalProfileCompletion,
  validateMandatoryTalkProposal,
  validateSpecializationArea,
  type UnifiedFormData as ValidationFormData
} from '@/lib/form-validation';

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
  userPhone?: string;
  userCompany?: string;
  userJobTitle?: string;
  onSubmit: (data: UnifiedFormData) => Promise<void>;
  onCancel: () => void;
}

export default function UnifiedSpeakerProposalForm({
  userId,
  userEmail,
  userName,
  userPhone,
  userCompany,
  userJobTitle,
  onSubmit,
  onCancel,
}: UnifiedSpeakerProposalFormProps) {
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Form data - pre-fill from User table
  const [formData, setFormData] = useState<UnifiedFormData>({
    givenName: userName.split(' ')[0] || '',
    familyName: userName.split(' ').slice(1).join(' ') || '',
    email: userEmail,
    phoneNumber: userPhone || '+52 ',
    company: userCompany || '',
    jobTitle: userJobTitle || '',
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
      setFormData(prev => ({ ...prev, photoFile: file, photoKey: result.key || null }));
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
      setFormData(prev => ({ ...prev, cvFile: file, cvKey: result.key || null }));
    } else {
      setError(result.error || 'Error al subir el CV');
    }
  }

  // Handle phone change with +52 auto-format
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Si está vacío o solo tiene +, resetear a +52
    if (value === '' || value === '+') {
      setFormData(prev => ({ ...prev, phoneNumber: '+52 ' }));
      return;
    }

    // Asegurar que siempre empiece con +52
    if (!value.startsWith('+52')) {
      value = '+52 ' + value.replace(/^\+?52?\s?/, '');
    }

    // Asegurar espacio después de +52
    if (value.startsWith('+52') && value[3] !== ' ') {
      value = '+52 ' + value.substring(3);
    }

    setFormData(prev => ({ ...prev, phoneNumber: value }));
  }, []);

  // Add topic
  const handleAddTopic = useCallback(() => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData(prev => ({ ...prev, topics: [...prev.topics, topicInput.trim()] }));
      setTopicInput('');
    }
  }, [topicInput, formData.topics]);

  // Remove topic
  const handleRemoveTopic = useCallback((topic: string) => {
    setFormData(prev => ({ ...prev, topics: prev.topics.filter((t) => t !== topic) }));
  }, []);

  // Enhanced validation using the comprehensive validation system
  function validateSection(section: number): boolean {
    setError(null);
    setValidationWarnings([]);

    const validation = validateFormSection(formData as ValidationFormData, section);

    if (!validation.valid) {
      setError(validation.errors[0]); // Show first error
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    // Set warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    // Additional validation for professional profile completion before talk proposal
    if (section === 3) {
      const profileValidation = validateProfessionalProfileCompletion(formData as ValidationFormData);
      if (!profileValidation.valid) {
        setError('Debes completar tu perfil profesional antes de continuar con la aplicación como speaker');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

    // Ensure talk proposal cannot be skipped (section 4 is mandatory)
    if (section === 4) {
      const talkValidation = validateMandatoryTalkProposal(formData as ValidationFormData);
      if (!talkValidation.valid) {
        setError(talkValidation.errors[0]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

      // Validate specialization area is assigned
    if (section === 3) {
      const specializationValidation = validateSpecializationArea(formData as ValidationFormData);
      if (!specializationValidation.valid) {
        setError(specializationValidation.errors[0]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

    return true;
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
    // Validate current section first
    if (!validateSection(currentSection)) return;

    // Validate complete form before submission
    const completeValidation = validateCompleteForm(formData as ValidationFormData);
    if (!completeValidation.valid) {
      setError(completeValidation.errors[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
  const progress = (currentSection / 6) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Sección {currentSection} de 6
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

        {/* Section validation indicators */}
        <div className="overflow-x-auto mt-3 scrollbar-hide">
          <div className="flex justify-between items-center text-xs min-w-max px-2" style={{ minWidth: '480px' }}>
            {[1, 2, 3, 4, 5, 6].map((sectionNum) => {
              const sectionValidation = validateFormSection(formData as ValidationFormData, sectionNum);
              const isComplete = sectionValidation.valid;
              const isCurrent = sectionNum === currentSection;

              return (
                <div
                  key={sectionNum}
                  className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrent
                    ? 'bg-accent/20 text-accent font-medium'
                    : isComplete
                      ? 'text-green-600'
                      : 'text-gray-400'
                    }`}
                >
                  {isComplete ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <div className={`w-3 h-3 rounded-full border-2 ${isCurrent ? 'border-accent' : 'border-gray-300'
                      }`} />
                  )}
                  <span>
                    {sectionNum === 1 && 'Personal'}
                    {sectionNum === 2 && 'Perfil'}
                    {sectionNum === 3 && 'Trabajo'}
                    {sectionNum === 4 && 'Charla*'}
                    {sectionNum === 5 && 'Fecha'}
                    {sectionNum === 6 && 'Opcional'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-red-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-800 dark:text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* 
     

      Validation warnings 
      {validationWarnings.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 text-amber-600 mt-0.5">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-800 dark:text-amber-200 font-medium mb-1">Sugerencias:</p>
              <ul className="text-amber-700 dark:text-amber-300 text-sm space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
 */}
      {/* Section 1: Datos Personales */}
      {currentSection === 1 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Datos Personales</h2>
              <div className="text-sm text-text-secondary">
                En esta sección, te pedimos que ingreses tu información personal básica. Estos datos nos ayudarán a conocerte mejor y poder contactarte para coordinar tu participación.
                <br></br>
                
                <p className="mt-2 warning-text text-sm text-yellow-700 dark:text-red-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="inline w-4 h-4 mr-1 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Toda la información será tratada con confidencialidad.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="givenName">Nombre *</Label>
              <Input
                id="givenName"
                value={formData.givenName}
                onChange={(e) => setFormData(prev => ({ ...prev, givenName: e.target.value }))}
                placeholder="Juan"
              />
            </div>
            <div>
              <Label htmlFor="familyName">Apellidos *</Label>
              <Input
                id="familyName"
                value={formData.familyName}
                onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
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
              onChange={handlePhoneChange}
              placeholder="+52 222 123 4567"
            />
          </div>

          <div>
            <Label htmlFor="email">Email de contacto para esta aplicación *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={userEmail}
            />
            <p className="text-xs text-text-secondary mt-1">
              Este email se usará para notificaciones relacionadas con tu aplicación como speaker.
              Puedes usar tu email principal o uno alternativo donde prefieras recibir estas comunicaciones.
            </p>
          </div>

          {/* Foto Personal */}
          <div>
            <Label className="text-base font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent" />
              Foto Personal <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-text-secondary mb-4">
              Sube una foto tuya que podamos utilizar para la promoción de tu participación en nuestros eventos. Esta imagen será parte de los <strong>materiales de publicidad y difusión en nuestras redes sociales y plataformas</strong>. Te recomendamos que sea una foto profesional y de alta calidad, que refleje tu mejor presentación.
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
                      <span className="text-sm">Subiendo... {photoProgress}%</span>
                      </>
                    ) : formData.photoKey ? (
                      <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">Foto cargada</span>
                      </>
                    ) : (
                      <>
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="text-sm">Seleccionar Foto</span>
                      </>
                    )}
                  </Button>
                </label>
                <p className="text-xs text-text-secondary mt-2">
                  JPG, PNG o WebP. Máximo 10MB
                </p>
                {formData.photoFile && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {formData.photoFile.name} ({formatFileSize(formData.photoFile.size)})
                  </p>
                )}
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
                <br />Esta información será utilizada para presentarte adecuadamente durante el evento, destacando tus logros y experiencia
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
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-amber-600">
                ⚠️ Debes proporcionar al menos uno: CV o LinkedIn
              </p>
              <p className="text-xs text-text-secondary mt-1">
                PDF únicamente. Máximo 5MB
              </p>
            </div>
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
                Cuéntanos más sobre tu experiencia laboral y el rol que desempeñas en tu empresa o proyecto. Queremos conocer tu perfil profesional y cómo te vinculas con la tecnología de AWS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="AWS, Google, BUAP, Freelance, etc."
              />
              <p className="text-xs text-text-secondary mt-1">(empresa, universidad, independiente)</p>
            </div>
            <div>
              <Label htmlFor="jobTitle">Puesto de trabajo</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Solutions Architect, DevOps Engineer, Estudiante de TI, etc."
              />
            </div>
          </div>
            <div>
            <Label htmlFor="expertiseArea">Área de especialización <span className="text-red-500"></span></Label>
            <select
              id="expertiseArea"
              value={formData.expertiseArea}
              onChange={(e) => setFormData(prev => ({ ...prev, expertiseArea: e.target.value }))}
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
              <h2 className="text-2xl font-bold text-text-primary">
                Propuesta de Tema <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-text-secondary">
                <strong>¡Este es el momento para compartir tu idea!</strong> <br />
                En esta sección, te invitamos a detallar el tema que te gustaría presentar en nuestros eventos.
                Queremos conocer la propuesta de tu charla, su enfoque y cómo beneficiará a la comunidad.
                No olvides incluir una breve descripción del tema, su relevancia para AWS y los puntos clave que cubrirás.
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="talkTitle">Título de la Plática *</Label>
            <Input
              id="talkTitle"
              value={formData.talkTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, talkTitle: e.target.value }))}
              placeholder="Ej: Arquitecturas Serverless con AWS Lambda"
            />
          </div>

          <div>
            <Label htmlFor="talkDescription">Breve descripción del tema *</Label>
            <Textarea
              id="talkDescription"
              value={formData.talkDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, talkDescription: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }))}
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

          <DateSelector
            selectedDate={formData.proposedDate}
            onDateSelect={(date) => setFormData(prev => ({ ...prev, proposedDate: date }))}
            disabled={false}
            adminMode={false}
          />
        </div>
      )}

      {/* Section 6: Preguntas Opcionales */}
      {currentSection === 6 && (
        <div className="bg-surface rounded-lg p-6 shadow theme-transition space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent/10 rounded-lg">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Cuéntanos más sobre ti</h2>
              <p className="text-sm text-text-secondary">
                Estas preguntas son completamente opcionales, pero nos ayudan a conocerte mejor y personalizar tu experiencia como speaker.
              </p>
            </div>
          </div>

          {/* Mensaje de invitación 
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-blue-600 mt-0.5">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
            </div>
          </div>
*/}
          <div className="space-y-6">
            <div>
              <Label htmlFor="motivation">¿Por qué quieres ser speaker?</Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                placeholder="Comparte tu motivación para ser parte de AWS User Group Puebla como speaker..."
                rows={4}
              />
              <p className="text-xs text-text-secondary mt-1">
                Opcional - Nos ayuda a entender tus objetivos y cómo podemos apoyarte
              </p>
            </div>

            <div>
              <Label htmlFor="experience">Experiencia previa</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="Cuéntanos sobre tu experiencia dando charlas, webinars, workshops, o compartiendo conocimiento..."
                rows={4}
              />
              <p className="text-xs text-text-secondary mt-1">
                Opcional - Incluye tanto experiencia formal como informal (meetups, equipos de trabajo, etc.)
              </p>
            </div>

            <div>
              <Label>Temas de interés en AWS</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  placeholder="Ej: Lambda, ECS, S3, IA, ML, DevOps..."
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
              <p className="text-xs text-text-secondary mt-1">
                Opcional - Nos ayuda a sugerir temas futuros y conectarte con otros speakers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8">
        {currentSection > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isSubmitting}
            className="flex-1 w-full sm:w-auto"
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
            className="flex-1 w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}

        {currentSection < 6 ? (
          <Button
            type="button"
            variant="accent"
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 w-full sm:w-auto"
          >
            <span className="hidden sm:inline">
              {currentSection === 5 ? 'Siguiente →' : 'Siguiente →'}
            </span>
            <span className="sm:hidden">
              Siguiente →
            </span>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.proposedDate}
              className="flex-1 w-full sm:w-auto order-2 sm:order-1"
            >
              <span className="hidden sm:inline">Omitir y Enviar</span>
              <span className="sm:hidden">Omitir y Enviar</span>
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.proposedDate}
              className="flex-1 w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Enviando...</span>
                  <span className="sm:hidden">Enviando...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">✅ Enviar Propuesta Completa</span>
                  <span className="sm:hidden">Enviar</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
