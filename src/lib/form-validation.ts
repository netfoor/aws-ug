/**
 * 🔍 Comprehensive Form Validation
 * 
 * Unified validation rules for the speaker application workflow
 * Includes validation for personal data, professional profile, and talk proposals
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

// Phone number validation - supports international numbers using libphonenumber
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone || phone.trim().length === 0) {
    errors.push('El número de teléfono es requerido');
    return { valid: false, errors };
  }

  const cleanPhone = phone.trim();

  // Try to parse as international format first
  try {
    // Try with international format (if user provided +52, +51, etc.)
    if (cleanPhone.startsWith('+')) {
      if (!isValidPhoneNumber(cleanPhone)) {
        errors.push('El número telefónico internacional no es válido. Ej: +52 222 123 4567 o +51 999 888 777');
      }
    } else {
      // Try as Mexican number (default country)
      if (!isValidPhoneNumber(cleanPhone, 'MX')) {
        // If not valid as Mexican, try detecting country from the number itself
        // This handles cases like user entering a valid number without country code
        if (!isValidPhoneNumber('+52' + cleanPhone, 'MX')) {
          errors.push('El número de teléfono no es válido. Puedes usar: 55 1234 5678 (México) o +52 (México), +51 (Perú), +50 (Costa Rica), etc.');
        }
      }
    }
  } catch {
    errors.push('El número de teléfono tiene un formato inválido');
  }

  return { valid: errors.length === 0, errors };
}

// Phone number normalization - converts to standard international format
export function normalizePhoneNumber(phone: string): string {
  if (!phone || !phone.trim()) return '';

  const cleanPhone = phone.trim();

  try {
    // Try to parse as international (with +)
    if (cleanPhone.startsWith('+')) {
      const parsed = parsePhoneNumber(cleanPhone);
      return parsed?.number || cleanPhone;
    }

    // Try as Mexican number
    const parsed = parsePhoneNumber(cleanPhone, 'MX');
    if (parsed) {
      return parsed.number; // Returns in E.164 format: +52...
    }

    // If parsing fails, try adding +52 (Mexican default)
    const mxParsed = parsePhoneNumber('+52' + cleanPhone, 'MX');
    if (mxParsed) {
      return mxParsed.number;
    }

    // Last resort: just clean up and add + if missing
    let normalized = cleanPhone.replace(/[\s\-\(\)]/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    return normalized;
  } catch {
    // Return cleaned version if parsing fails
    let normalized = cleanPhone.replace(/[\s\-\(\)]/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+52' + normalized;
    }
    return normalized;
  }
}

// Email validation (enhanced)
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push('El email es requerido');
    return { valid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('El formato del email no es válido');
  }

  if (email.length > 254) {
    errors.push('El email es muy largo (máximo 254 caracteres)');
  }

  return { valid: errors.length === 0, errors };
}

// Name validation
export function validateName(name: string, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push(`${fieldName} es requerido`);
    return { valid: false, errors };
  }

  if (name.trim().length < 2) {
    errors.push(`${fieldName} debe tener al menos 2 caracteres`);
  }

  if (name.length > 50) {
    errors.push(`${fieldName} no puede exceder 50 caracteres`);
  }

  // Only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-']+$/.test(name)) {
    errors.push(`${fieldName} solo puede contener letras, espacios, guiones y apostrofes`);
  }

  return { valid: errors.length === 0, errors };
}

// Company validation
export function validateCompany(company: string): ValidationResult {
  const errors: string[] = [];

  if (!company || company.trim().length === 0) {
    errors.push('La empresa es requerida');
    return { valid: false, errors };
  }

  if (company.trim().length < 2) {
    errors.push('El nombre de la empresa debe tener al menos 2 caracteres');
  }

  if (company.length > 100) {
    errors.push('El nombre de la empresa no puede exceder 100 caracteres');
  }

  return { valid: errors.length === 0, errors };
}

// Job title validation
export function validateJobTitle(jobTitle: string): ValidationResult {
  const errors: string[] = [];

  if (!jobTitle || jobTitle.trim().length === 0) {
    errors.push('El puesto de trabajo es requerido');
    return { valid: false, errors };
  }

  if (jobTitle.trim().length < 2) {
    errors.push('El puesto debe tener al menos 2 caracteres');
  }

  if (jobTitle.length > 100) {
    errors.push('El puesto no puede exceder 100 caracteres');
  }

  return { valid: errors.length === 0, errors };
}

// Text area validation (motivation, experience, description)
export function validateTextArea(
  text: string,
  fieldName: string,
  minLength: number = 50,
  maxLength: number = 2000
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push(`${fieldName} es requerido`);
    return { valid: false, errors };
  }

  const trimmedLength = text.trim().length;

  if (trimmedLength < minLength) {
    errors.push(`${fieldName} debe tener al menos ${minLength} caracteres (actual: ${trimmedLength})`);
  }

  if (text.length > maxLength) {
    errors.push(`${fieldName} no puede exceder ${maxLength} caracteres (actual: ${text.length})`);
  }

  // Warning for very short descriptions
  if (trimmedLength < minLength * 1.5 && trimmedLength >= minLength) {
    warnings.push(`${fieldName} es un poco corto. Considera agregar más detalles.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Talk title validation
export function validateTalkTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('El título de la charla es requerido');
    return { valid: false, errors };
  }

  if (title.trim().length < 10) {
    errors.push('El título debe tener al menos 10 caracteres');
  }

  if (title.length > 150) {
    errors.push('El título no puede exceder 150 caracteres');
  }

  // Warning for very long titles
  if (title.length > 100) {
    warnings.push('El título es un poco largo. Considera hacerlo más conciso.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Topics validation
export function validateTopics(topics: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!topics || topics.length === 0) {
    errors.push('Debes agregar al menos un tema de interés');
    return { valid: false, errors };
  }

  // Filter out empty topics
  const validTopics = topics.filter(topic => topic && topic.trim().length > 0);

  if (validTopics.length === 0) {
    errors.push('Debes agregar al menos un tema válido');
    return { valid: false, errors };
  }

  if (validTopics.length > 10) {
    errors.push('No puedes agregar más de 10 temas');
  }

  // Validate each topic (más flexible, sin mínimo de caracteres)
  validTopics.forEach((topic, index) => {
    if (topic.length > 50) {
      errors.push(`El tema ${index + 1} no puede exceder 50 caracteres`);
    }
  });

  // Warning for too few topics
  if (validTopics.length < 3) {
    warnings.push('Considera agregar más temas para mostrar tu versatilidad');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Duration validation
export function validateDuration(duration: number): ValidationResult {
  const errors: string[] = [];

  const allowedDurations = [15, 30, 45, 60];

  if (!allowedDurations.includes(duration)) {
    errors.push('La duración debe ser 15, 30, 45 o 60 minutos');
  }

  return { valid: errors.length === 0, errors };
}

// Date validation
export function validateProposedDate(date: Date | null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!date) {
    errors.push('Debes seleccionar una fecha para tu charla');
    return { valid: false, errors };
  }

  // Normalize dates to start of day (midnight) for accurate comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);

  if (selectedDate < oneWeekFromNow) {
    errors.push('La fecha debe ser al menos una semana en el futuro');
  }

  if (selectedDate > sixMonthsFromNow) {
    warnings.push('La fecha está muy lejos en el futuro. Considera una fecha más cercana.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// File validation (enhanced from existing)
export function validateFileUpload(
  file: File | null,
  fileType: 'photo' | 'cv',
  required: boolean = true
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    if (required) {
      errors.push(`${fileType === 'photo' ? 'La foto profesional' : 'El CV'} es requerido`);
    }
    return { valid: !required, errors };
  }

  // File size limits
  const maxSizes = {
    photo: 10 * 1024 * 1024, // 10MB
    cv: 5 * 1024 * 1024      // 5MB
  };

  if (file.size > maxSizes[fileType]) {
    const maxMB = maxSizes[fileType] / (1024 * 1024);
    errors.push(`El archivo es muy grande. Máximo ${maxMB}MB permitido`);
  }

  // File type validation (enhanced)
  const allowedTypes = {
    photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    cv: ['application/pdf']
  };

  if (!allowedTypes[fileType].includes(file.type)) {
    const extensions = fileType === 'photo' ? 'JPG, PNG, WebP' : 'PDF';
    errors.push(`Tipo de archivo no permitido. Solo se permiten archivos ${extensions}`);
  }

  // File name validation (enhanced)
  if (file.name.length > 100) {
    errors.push('El nombre del archivo es muy largo (máximo 100 caracteres)');
  }

  if (file.name.length < 3) {
    errors.push('El nombre del archivo es muy corto (mínimo 3 caracteres)');
  }

  // Check for suspicious file names
  if (/[<>:"/\\|?*]/.test(file.name)) {
    errors.push('El nombre del archivo contiene caracteres no permitidos');
  }

  // Check for proper file extension
  const expectedExtensions = {
    photo: ['.jpg', '.jpeg', '.png', '.webp'],
    cv: ['.pdf']
  };

  const hasValidExtension = expectedExtensions[fileType].some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    const extensions = expectedExtensions[fileType].join(', ');
    errors.push(`El archivo debe tener una extensión válida: ${extensions}`);
  }

  // Warnings for file optimization
  if (fileType === 'photo' && file.size > 2 * 1024 * 1024) {
    warnings.push('La foto es grande. Considera optimizarla para mejorar la velocidad de carga.');
  }

  if (fileType === 'cv' && file.size > 2 * 1024 * 1024) {
    warnings.push('El CV es grande. Considera optimizarlo para mejorar la velocidad de carga.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// LinkedIn URL validation (enhanced)
export function validateLinkedInUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url || url.trim().length === 0) {
    return { valid: true, errors }; // LinkedIn is optional if CV is provided
  }

  // Basic URL format
  try {
    const urlObj = new URL(url);

    // Must be LinkedIn domain
    if (!urlObj.hostname.includes('linkedin.com')) {
      errors.push('La URL debe ser de LinkedIn (linkedin.com)');
    }

    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      errors.push('La URL debe usar HTTPS');
    }

    // Must be a profile URL
    if (!urlObj.pathname.includes('/in/')) {
      errors.push('La URL debe ser un perfil de LinkedIn (debe contener /in/)');
    }

  } catch {
    errors.push('La URL de LinkedIn no es válida');
  }

  return { valid: errors.length === 0, errors };
}

// Comprehensive form validation
export interface UnifiedFormData {
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber: string;
  company: string;
  jobTitle: string;
  expertiseArea: string;
  photoFile: File | null;
  photoKey: string | null;
  cvFile: File | null;
  cvKey: string | null;
  linkedInUrl: string;
  motivation: string;
  experience: string;
  topics: string[];
  talkTitle: string;
  talkDescription: string;
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate: Date | null;
}

export function validateFormSection(
  formData: UnifiedFormData,
  section: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (section) {
    case 1: // Personal Data
      {
        const nameValidation = validateName(formData.givenName, 'El nombre');
        errors.push(...nameValidation.errors);

        const lastNameValidation = validateName(formData.familyName, 'El apellido');
        errors.push(...lastNameValidation.errors);

        const emailValidation = validateEmail(formData.email);
        errors.push(...emailValidation.errors);

        const phoneValidation = validatePhoneNumber(formData.phoneNumber);
        errors.push(...phoneValidation.errors);

        // Photo is mandatory for professional profile
        const photoValidation = validateFileUpload(formData.photoFile, 'photo', !formData.photoKey);
        errors.push(...photoValidation.errors);
        if (photoValidation.warnings) warnings.push(...photoValidation.warnings);
      }
      break;

    case 2: // Professional Profile
      {
        // Either CV (uploaded OR selected) or LinkedIn is required for professional profile completion
        // Sprint 2: cvFile ahora significa "preparado para subir", no necesariamente subido
        const hasCVorLinkedIn = formData.cvKey || formData.cvFile || formData.linkedInUrl;
        
        if (!hasCVorLinkedIn) {
          errors.push('Debes proporcionar tu CV o tu perfil de LinkedIn para completar tu perfil profesional');
        } else {
          // Validate CV if provided (either uploaded or selected)
          if (formData.cvFile || formData.cvKey) {
            const cvValidation = validateFileUpload(formData.cvFile, 'cv', !formData.cvKey);
            errors.push(...cvValidation.errors);
            if (cvValidation.warnings) warnings.push(...cvValidation.warnings);
          }

          // Validate LinkedIn if provided
          if (formData.linkedInUrl) {
            const linkedInValidation = validateLinkedInUrl(formData.linkedInUrl);
            errors.push(...linkedInValidation.errors);
            if (linkedInValidation.warnings) warnings.push(...linkedInValidation.warnings);
          }
        }
      }
      break;

    case 3: // Work Data & Speaker Application (más flexible)
      {
        // Validaciones opcionales y más flexibles
        if (formData.company && formData.company.trim().length > 0) {
          if (formData.company.length > 100) {
            errors.push('El nombre de la empresa no puede exceder 100 caracteres');
          }
        }

        if (formData.jobTitle && formData.jobTitle.trim().length > 0) {
          if (formData.jobTitle.length > 100) {
            errors.push('El puesto no puede exceder 100 caracteres');
          }
        }

        // Área de especialización es opcional ahora
        // No hay validación requerida

        // Preguntas opcionales - solo validar si tienen contenido
        if (formData.motivation && formData.motivation.trim().length > 0) {
          if (formData.motivation.length > 1000) {
            errors.push('La motivación no puede exceder 1000 caracteres');
          }
        }

        if (formData.experience && formData.experience.trim().length > 0) {
          if (formData.experience.length > 1500) {
            errors.push('La experiencia no puede exceder 1500 caracteres');
          }
        }

        // Temas de interés - validación más flexible
        if (formData.topics && formData.topics.length > 0) {
          const validTopics = formData.topics.filter(topic => topic && topic.trim().length > 0);

          if (validTopics.length > 10) {
            errors.push('No puedes agregar más de 10 temas');
          }

          // Validar cada tema (sin mínimo de caracteres)
          validTopics.forEach((topic, index) => {
            if (topic.length > 50) {
              errors.push(`El tema ${index + 1} no puede exceder 50 caracteres`);
            }
          });
        }
      }
      break;

    case 4: // Talk Proposal (MANDATORY - cannot skip)
      {
        // Talk proposal is mandatory for speaker application
        const titleValidation = validateTalkTitle(formData.talkTitle);
        errors.push(...titleValidation.errors);
        if (titleValidation.warnings) warnings.push(...titleValidation.warnings);

        const descriptionValidation = validateTextArea(formData.talkDescription, 'La descripción de la charla', 0, 3000);
        errors.push(...descriptionValidation.errors);
        if (descriptionValidation.warnings) warnings.push(...descriptionValidation.warnings);

        const durationValidation = validateDuration(formData.duration);
        errors.push(...durationValidation.errors);

        if (!formData.targetAudience) {
          errors.push('Debes seleccionar la audiencia objetivo');
        }

        // Additional validation to ensure talk proposal is complete
        if (!formData.talkTitle && !formData.talkDescription) {
          errors.push('La propuesta de charla es obligatoria. No puedes omitir esta sección.');
        }
      }
      break;

    case 5: // Date Selection
      {
        const dateValidation = validateProposedDate(formData.proposedDate);
        errors.push(...dateValidation.errors);
        if (dateValidation.warnings) warnings.push(...dateValidation.warnings);
      }
      break;

    case 6: // Optional Questions
      {
        // Todas las preguntas son opcionales, solo validar formato si se proporcionan
        if (formData.motivation && formData.motivation.trim().length > 0) {
          if (formData.motivation.length > 1000) {
            errors.push('La motivación no puede exceder 1000 caracteres');
          }
        }

        if (formData.experience && formData.experience.trim().length > 0) {
          if (formData.experience.length > 1500) {
            errors.push('La experiencia no puede exceder 1500 caracteres');
          }
        }

        // Temas de interés - validación flexible
        if (formData.topics && formData.topics.length > 0) {
          const validTopics = formData.topics.filter(topic => topic && topic.trim().length > 0);
          
          if (validTopics.length > 10) {
            errors.push('No puedes agregar más de 10 temas');
          }
          
          validTopics.forEach((topic, index) => {
            if (topic.length > 50) {
              errors.push(`El tema ${index + 1} no puede exceder 50 caracteres`);
            }
          });
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Enhanced validation for complete form submission
export function validateCompleteForm(formData: UnifiedFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate all sections
  for (let section = 1; section <= 6; section++) {
    const sectionValidation = validateFormSection(formData, section);
    errors.push(...sectionValidation.errors);
    if (sectionValidation.warnings) warnings.push(...sectionValidation.warnings);
  }

  // Cross-section validations

  // Ensure professional profile is complete before allowing talk proposal
  const hasPhoto = formData.photoKey || formData.photoFile;
  const hasProfessionalInfo = formData.cvKey || formData.cvFile || formData.linkedInUrl; // Sprint 2: incluir cvFile

  if (!hasPhoto || !hasProfessionalInfo) {
    errors.push('Debes completar tu perfil profesional (foto y CV/LinkedIn) antes de proponer una charla');
  }

  // Ensure talk proposal is mandatory and complete
  const hasTalkProposal = formData.talkTitle && formData.talkDescription && formData.duration && formData.targetAudience;

  if (!hasTalkProposal) {
    errors.push('La propuesta de charla es obligatoria. Todos los speakers deben proponer al menos una charla.');
  }

  // Las preguntas de speaker application ahora son opcionales
  // Solo validamos que si se proporcionan, estén bien formateadas (ya validado en sección 3)

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Validation for professional profile completion (Requirements 4.1, 4.2, 4.3)
export function validateProfessionalProfileCompletion(formData: UnifiedFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Professional photo is required (Requirement 4.1)
  if (!formData.photoKey && !formData.photoFile) {
    errors.push('La foto profesional es requerida para completar tu perfil');
  }

  // Either CV (uploaded OR selected) or LinkedIn is required (Requirement 4.2)
  // Sprint 2: cvFile significa "preparado para subir"
  if (!formData.cvKey && !formData.cvFile && !formData.linkedInUrl) {
    errors.push('Debes proporcionar tu CV o perfil de LinkedIn para completar tu perfil profesional');
  }

  // Work information is now optional
  // Solo validamos formato si se proporciona (ya validado en sección 3)

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Validation for specialization area
export function validateSpecializationArea(formData: UnifiedFormData): ValidationResult {
  const errors: string[] = [];

  // Specialization area is not optional, but must be provided
  if (!formData.expertiseArea || formData.expertiseArea.trim().length === 0) {
    errors.push('El área de especialización es requerida');
  } else if (formData.expertiseArea.length > 100) {
    errors.push('El área de especialización no puede exceder 100 caracteres');
  }
  return {
    valid: errors.length === 0,
    errors 
  };
}

// Validation to ensure talk proposal cannot be skipped (Requirements 2.1, 2.2)
export function validateMandatoryTalkProposal(formData: UnifiedFormData): ValidationResult {
  const errors: string[] = [];

  // Talk proposal is mandatory (Requirement 2.1, 2.2)
  if (!formData.talkTitle) {
    errors.push('El título de la charla es obligatorio. No puedes omitir la propuesta de charla.');
  }

  if (!formData.talkDescription) {
    errors.push('La descripción de la charla es obligatoria. No puedes omitir la propuesta de charla.');
  }

  if (!formData.duration) {
    errors.push('La duración de la charla es obligatoria.');
  }

  if (!formData.targetAudience) {
    errors.push('La audiencia objetivo es obligatoria.');
  }

  // La fecha se valida en la sección 5, no aquí

  return {
    valid: errors.length === 0,
    errors
  };
}