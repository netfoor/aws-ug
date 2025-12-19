/**
 * 📊 Profile Completion Utilities
 * 
 * Utilidades para calcular el porcentaje de completitud del perfil profesional de speakers
 */

import type { UserProfile } from '@/hooks/useUserProfile';

export interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

/**
 * Campos requeridos para un perfil profesional completo
 */
const REQUIRED_FIELDS = {
  speakerPhotoKey: 'Foto profesional',
  speakerCvKey: 'CV',
  linkedInUrl: 'LinkedIn',
  expertiseArea: 'Área de especialización',
  company: 'Empresa',
  // jobTitle: 'Puesto de trabajo', // Opcional por ahora
} as const;

/**
 * Calcula la completitud del perfil profesional de un speaker
 * 
 * Nota: CV o LinkedIn son alternativos (solo uno es requerido)
 */
export function calculateProfileCompleteness(profile: UserProfile | null): ProfileCompleteness {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: Object.values(REQUIRED_FIELDS),
      isComplete: false,
    };
  }

  const missingFields: string[] = [];
  let completedCount = 0;
  const totalRequired = Object.keys(REQUIRED_FIELDS).length - 1; // -1 porque CV o LinkedIn son alternativos

  // Foto profesional
  if (profile.speakerPhotoKey) {
    completedCount++;
  } else {
    missingFields.push(REQUIRED_FIELDS.speakerPhotoKey);
  }

  // CV o LinkedIn (al menos uno)
  if (profile.speakerCvKey || profile.linkedInUrl) {
    completedCount++;
  } else {
    missingFields.push('CV o LinkedIn');
  }

  // Área de especialización
  if (profile.expertiseArea) {
    completedCount++;
  } else {
    missingFields.push(REQUIRED_FIELDS.expertiseArea);
  }

  // Empresa
  if (profile.company) {
    completedCount++;
  } else {
    missingFields.push(REQUIRED_FIELDS.company);
  }

  const percentage = Math.round((completedCount / totalRequired) * 100);
  const isComplete = percentage === 100;

  return {
    percentage,
    missingFields,
    isComplete,
  };
}

/**
 * Verifica si el perfil está listo para proponer charlas
 * Requiere: foto, (CV o LinkedIn), expertise
 * Company es opcional pero recomendado
 */
export function canProposeTalk(profile: UserProfile | null): { allowed: boolean; reason?: string } {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No se encontró el perfil',
    };
  }

  // Verificar foto
  if (!profile.speakerPhotoKey) {
    return {
      allowed: false,
      reason: 'Necesitas subir una foto profesional',
    };
  }

  // Verificar CV o LinkedIn
  if (!profile.speakerCvKey && !profile.linkedInUrl) {
    return {
      allowed: false,
      reason: 'Necesitas proporcionar tu CV o perfil de LinkedIn',
    };
  }

  // Verificar área de especialización
  if (!profile.expertiseArea) {
    return {
      allowed: false,
      reason: 'Necesitas seleccionar tu área de especialización',
    };
  }

  // Company es recomendado pero no obligatorio
  // Si falta, permitir pero mostrar advertencia en otro lugar

  return { allowed: true };
}

/**
 * Genera mensaje descriptivo de completitud
 */
export function getCompletenessMessage(completeness: ProfileCompleteness): string {
  if (completeness.isComplete) {
    return '¡Tu perfil está completo!';
  }

  if (completeness.percentage >= 75) {
    return 'Casi listo! Solo faltan algunos detalles';
  }

  if (completeness.percentage >= 50) {
    return 'Vas por buen camino, completa tu perfil';
  }

  return 'Completa tu perfil profesional para destacar como speaker';
}
