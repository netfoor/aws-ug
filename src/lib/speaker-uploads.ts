/**
 * 📤 Speaker Uploads Utilities
 * 
 * Manejo de uploads de archivos para speakers:
 * - Fotos profesionales (JPG, PNG, WebP)
 * - CVs (PDF)
 * - Validación de tamaño y tipo
 * - Generación de keys únicos en S3
 */

import { uploadData } from 'aws-amplify/storage';

// Límites de archivos
export const FILE_LIMITS = {
  PHOTO: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  CV: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },
};

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * Valida un archivo antes de subirlo
 */
export function validateFile(
  file: File,
  type: 'PHOTO' | 'CV'
): { valid: boolean; error?: string } {
  const limits = FILE_LIMITS[type];

  // Validar tamaño
  if (file.size > limits.maxSize) {
    const maxMB = limits.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `El archivo es muy grande. Máximo ${maxMB}MB permitido.`,
    };
  }

  // Validar tipo MIME
  if (!limits.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Solo: ${limits.allowedExtensions.join(', ')}`,
    };
  }

  // Validar extensión
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !limits.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Extensión no permitida. Solo: ${limits.allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Genera un path único para S3
 * Formato: {type}/{timestamp}-{filename}
 * El prefix speakers/{userId}/ se maneja automáticamente por Amplify
 */
function generateFilePath(
  file: File,
  type: 'photo' | 'cv'
): string {
  const timestamp = Date.now();
  const sanitizedFilename = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');
  
  return `${type}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Sube foto profesional de speaker a S3
 */
export async function uploadSpeakerPhoto(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = validateFile(file, 'PHOTO');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generar path del archivo
    const filePath = generateFilePath(file, 'photo');
    
    // Path completo con prefix de usuario
    const fullPath = `speakers/${userId}/${filePath}`;

    // Subir a S3
    const result = await uploadData({
      path: fullPath,
      data: file,
      options: {
        contentType: file.type,
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (onProgress && totalBytes) {
            const progress = Math.round((transferredBytes / totalBytes) * 100);
            onProgress(progress);
          }
        },
      },
    }).result;

    return {
      success: true,
      key: fullPath,
      url: result.path, // Amplify Storage path
    };
  } catch (error) {
    console.error('Error uploading speaker photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir la foto',
    };
  }
}

/**
 * Sube CV de speaker a S3
 */
export async function uploadSpeakerCV(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = validateFile(file, 'CV');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generar path del archivo
    const filePath = generateFilePath(file, 'cv');
    
    // Path completo con prefix de usuario
    const fullPath = `speakers/${userId}/${filePath}`;

    // Subir a S3
    const result = await uploadData({
      path: fullPath,
      data: file,
      options: {
        contentType: 'application/pdf',
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (onProgress && totalBytes) {
            const progress = Math.round((transferredBytes / totalBytes) * 100);
            onProgress(progress);
          }
        },
      },
    }).result;

    return {
      success: true,
      key: fullPath,
      url: result.path,
    };
  } catch (error) {
    console.error('Error uploading speaker CV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir el CV',
    };
  }
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Valida URL de LinkedIn
 */
export function validateLinkedInUrl(url: string): { valid: boolean; error?: string } {
  if (!url) return { valid: true }; // Opcional

  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('linkedin.com')) {
      return {
        valid: false,
        error: 'Debe ser una URL de LinkedIn válida',
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'URL inválida',
    };
  }
}

/**
 * Lista de áreas de especialización predefinidas
 */
export const EXPERTISE_AREAS = [
  'Cloud Architecture',
  'DevOps & CI/CD',
  'Serverless',
  'Containers & Kubernetes',
  'AI & Machine Learning',
  'Data Engineering',
  'Security & Compliance',
  'IoT',
  'Databases',
  'Frontend Development',
  'Backend Development',
  'Full Stack',
  'Mobile Development',
  'Game Development',
  'Otro',
] as const;

export type ExpertiseArea = typeof EXPERTISE_AREAS[number];
