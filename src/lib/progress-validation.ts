/**
 * Progress validation utilities
 */

import { StoredProgressData } from '@/hooks/useSpeakerApplicationProgress';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Field validation rules
 */
const VALIDATION_RULES = {
  // Personal data
  givenName: {
    required: false,
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/
  },
  familyName: {
    required: false,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/
  },
  phoneNumber: {
    required: false,
    pattern: /^\+52\s\d{3}\s\d{3}\s\d{4}$/
  },
  
  // Professional data
  company: {
    required: false,
    maxLength: 100
  },
  jobTitle: {
    required: false,
    maxLength: 100
  },
  expertiseArea: {
    required: false,
    enum: [
      'Compute (EC2, Lambda, ECS)',
      'Storage (S3, EBS, EFS)',
      'Database (RDS, DynamoDB, Aurora)',
      'Networking (VPC, CloudFront, Route 53)',
      'Security (IAM, Cognito, WAF)',
      'DevOps (CodePipeline, CloudFormation, CDK)',
      'Analytics (Redshift, Athena, QuickSight)',
      'Machine Learning (SageMaker, Rekognition)',
      'IoT (IoT Core, Greengrass)',
      'Serverless (Lambda, API Gateway, Step Functions)',
      'Containers (ECS, EKS, Fargate)',
      'Migration (DMS, SMS, DataSync)',
      'Monitoring (CloudWatch, X-Ray)',
      'Cost Optimization',
      'Well-Architected Framework',
      'Otro'
    ]
  },
  photoKey: {
    required: false,
    maxLength: 500 // S3 key length limit
  },
  cvKey: {
    required: false,
    maxLength: 500 // S3 key length limit
  },
  linkedInUrl: {
    required: false,
    pattern: /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/
  },
  
  // Speaker application
  motivation: {
    required: false,
    maxLength: 1000,
    minLength: 10
  },
  experience: {
    required: false,
    maxLength: 1000,
    minLength: 10
  },
  topics: {
    required: false,
    maxItems: 10,
    minItems: 1
  },
  
  // Talk proposal
  talkTitle: {
    required: false,
    maxLength: 100,
    minLength: 5
  },
  talkDescription: {
    required: false,
    maxLength: 1000,
    minLength: 50
  },
  duration: {
    required: false,
    enum: [15, 30, 45, 60]
  },
  targetAudience: {
    required: false,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']
  },
  proposedDate: {
    required: false
  }
} as const;

/**
 * Validation rule interface
 */
interface ValidationRule {
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  enum?: readonly (string | number)[];
  maxItems?: number;
  minItems?: number;
}

/**
 * Validate a single field
 */
function validateField(
  fieldName: keyof StoredProgressData,
  value: unknown,
  rules: ValidationRule
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Skip validation if value is undefined/null/empty
  if (value === undefined || value === null || value === '') {
    return { errors, warnings };
  }
  
  // String validations
  if (typeof value === 'string') {
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} no puede tener más de ${rules.maxLength} caracteres`);
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      warnings.push(`${fieldName} debería tener al menos ${rules.minLength} caracteres`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} tiene un formato inválido`);
    }
  }
  
  // Array validations
  if (Array.isArray(value)) {
    if (rules.maxItems && value.length > rules.maxItems) {
      errors.push(`${fieldName} no puede tener más de ${rules.maxItems} elementos`);
    }
    
    if (rules.minItems && value.length < rules.minItems) {
      warnings.push(`${fieldName} debería tener al menos ${rules.minItems} elemento(s)`);
    }
  }
  
  // Enum validations
  if (rules.enum && !rules.enum.includes(value as string | number)) {
    errors.push(`${fieldName} tiene un valor no válido`);
  }
  
  // Number validations
  if (typeof value === 'number') {
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} debe ser uno de: ${rules.enum.join(', ')}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Validate progress data
 */
export function validateProgressData(data: StoredProgressData): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  // Validate each field
  Object.entries(data).forEach(([fieldName, value]) => {
    const fieldKey = fieldName as keyof StoredProgressData;
    const rules = VALIDATION_RULES[fieldKey] as ValidationRule | undefined;
    if (rules) {
      const { errors, warnings } = validateField(
        fieldKey,
        value,
        rules
      );
      allErrors.push(...errors);
      allWarnings.push(...warnings);
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validate section completeness
 */
export function validateSectionCompleteness(
  section: number,
  data: StoredProgressData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  switch (section) {
    case 1: // Personal data
      if (!data.phoneNumber) {
        errors.push('El teléfono es requerido');
      }
      if (!data.photoKey) {
        errors.push('La foto profesional es requerida');
      }
      break;
      
    case 2: // Professional profile
      if (!data.cvKey && !data.linkedInUrl) {
        errors.push('Debes proporcionar tu CV o perfil de LinkedIn');
      }
      break;
      
    case 3: // Work data
      if (!data.company) {
        errors.push('La empresa es requerida');
      }
      if (!data.jobTitle) {
        errors.push('El puesto de trabajo es requerido');
      }
      if (!data.expertiseArea) {
        errors.push('El área de especialización es requerida');
      }
      if (!data.motivation) {
        errors.push('La motivación es requerida');
      }
      if (!data.experience) {
        errors.push('La experiencia es requerida');
      }
      if (!data.topics || data.topics.length === 0) {
        errors.push('Debes agregar al menos un tema de interés');
      }
      break;
      
    case 4: // Talk proposal
      if (!data.talkTitle) {
        errors.push('El título de la charla es requerido');
      }
      if (!data.talkDescription) {
        errors.push('La descripción de la charla es requerida');
      }
      break;
      
    case 5: // Date selection
      if (!data.proposedDate) {
        errors.push('Debes seleccionar una fecha para la charla');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate overall progress percentage
 */
export function calculateProgressPercentage(data: StoredProgressData): number {
  const totalFields = Object.keys(VALIDATION_RULES).length;
  let completedFields = 0;
  
  Object.entries(data).forEach(([fieldName, value]) => {
    if (VALIDATION_RULES[fieldName as keyof StoredProgressData]) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          completedFields++;
        } else if (!Array.isArray(value)) {
          completedFields++;
        }
      }
    }
  });
  
  return Math.round((completedFields / totalFields) * 100);
}

/**
 * Get section progress status
 */
export function getSectionProgress(
  section: number,
  data: StoredProgressData
): 'empty' | 'partial' | 'complete' | 'invalid' {
  const validation = validateSectionCompleteness(section, data);
  
  if (validation.errors.length > 0) {
    return 'invalid';
  }
  
  // Check if section has any data
  const sectionFields = getSectionFields(section);
  const hasAnyData = sectionFields.some(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
  
  if (!hasAnyData) {
    return 'empty';
  }
  
  // Check if all required fields are complete
  const hasAllRequiredData = validation.isValid;
  
  return hasAllRequiredData ? 'complete' : 'partial';
}

/**
 * Get fields for a specific section
 */
function getSectionFields(section: number): (keyof StoredProgressData)[] {
  switch (section) {
    case 1:
      return ['givenName', 'familyName', 'phoneNumber', 'photoKey'];
    case 2:
      return ['cvKey', 'linkedInUrl'];
    case 3:
      return ['company', 'jobTitle', 'expertiseArea', 'motivation', 'experience', 'topics'];
    case 4:
      return ['talkTitle', 'talkDescription', 'duration', 'targetAudience'];
    case 5:
      return ['proposedDate'];
    default:
      return [];
  }
}

/**
 * Sanitize progress data (remove invalid values)
 */
export function sanitizeProgressData(data: StoredProgressData): StoredProgressData {
  const sanitized: StoredProgressData = {};
  
  Object.entries(data).forEach(([fieldName, value]) => {
    const key = fieldName as keyof StoredProgressData;
    const rules = VALIDATION_RULES[key] as ValidationRule | undefined;
    
    if (rules && value !== undefined && value !== null) {
      // Basic sanitization
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          (sanitized as Record<string, unknown>)[key] = trimmed;
        }
      } else if (Array.isArray(value)) {
        const filtered = value.filter(item => 
          typeof item === 'string' && item.trim().length > 0
        );
        if (filtered.length > 0) {
          (sanitized as Record<string, unknown>)[key] = filtered;
        }
      } else {
        (sanitized as Record<string, unknown>)[key] = value;
      }
    }
  });
  
  return sanitized;
}