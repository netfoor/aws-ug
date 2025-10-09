/**
 * Environment and Configuration Validator
 * 
 * Valida que todas las variables de entorno y configuraciones necesarias
 * estén presentes antes de iniciar la aplicación
 */

import fs from 'fs';
import path from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida que amplify_outputs.json existe y tiene la estructura correcta
 */
export function validateAmplifyConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Verificar que el archivo existe
    const configPath = path.join(process.cwd(), 'amplify_outputs.json');
    
    if (!fs.existsSync(configPath)) {
      errors.push('amplify_outputs.json not found. Run "npx ampx sandbox" to generate it.');
      return { valid: false, errors, warnings };
    }

    // Leer y parsear el archivo
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Validar campos requeridos de autenticación
    if (!config.auth) {
      errors.push('amplify_outputs.json missing "auth" configuration');
    } else {
      if (!config.auth.user_pool_id) {
        errors.push('Missing auth.user_pool_id in amplify_outputs.json');
      }
      if (!config.auth.user_pool_client_id) {
        errors.push('Missing auth.user_pool_client_id in amplify_outputs.json');
      }
      if (!config.auth.identity_pool_id) {
        warnings.push('Missing auth.identity_pool_id - some features may not work');
      }
      if (!config.auth.oauth) {
        warnings.push('Missing auth.oauth configuration - OAuth login may not work');
      } else {
        if (!config.auth.oauth.domain) {
          errors.push('Missing auth.oauth.domain - OAuth login will not work');
        }
        if (!config.auth.oauth.redirect_sign_in_uri) {
          errors.push('Missing auth.oauth.redirect_sign_in_uri');
        }
        if (!config.auth.oauth.redirect_sign_out_uri) {
          errors.push('Missing auth.oauth.redirect_sign_out_uri');
        }
      }
    }

    // Validar región de AWS
    if (!config.auth?.aws_region) {
      warnings.push('Missing aws_region in auth configuration');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };

  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push(`amplify_outputs.json is invalid JSON: ${error.message}`);
    } else {
      errors.push(`Error reading amplify_outputs.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return { valid: false, errors, warnings };
  }
}

/**
 * Valida variables de entorno opcionales pero recomendadas
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Variables opcionales pero recomendadas
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set. Defaulting to development mode.');
  }

  if (process.env.NODE_ENV === 'production') {
    // En producción, verificar que tengamos HTTPS
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      warnings.push('NEXTAUTH_URL should use HTTPS in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Ejecuta todas las validaciones y reporta los resultados
 */
export function validateConfiguration(): boolean {
  console.log('🔍 Validating configuration...\n');

  const amplifyResult = validateAmplifyConfig();
  const envResult = validateEnvironment();

  let hasErrors = false;

  // Reportar errores de Amplify
  if (amplifyResult.errors.length > 0) {
    console.error('❌ Amplify Configuration Errors:');
    amplifyResult.errors.forEach(error => console.error(`  - ${error}`));
    hasErrors = true;
  }

  // Reportar advertencias de Amplify
  if (amplifyResult.warnings.length > 0) {
    console.warn('\n⚠️  Amplify Configuration Warnings:');
    amplifyResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Reportar errores de entorno
  if (envResult.errors.length > 0) {
    console.error('\n❌ Environment Errors:');
    envResult.errors.forEach(error => console.error(`  - ${error}`));
    hasErrors = true;
  }

  // Reportar advertencias de entorno
  if (envResult.warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    envResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!hasErrors) {
    console.log('\n✅ Configuration validation passed!\n');
  } else {
    console.error('\n❌ Configuration validation failed. Please fix the errors above.\n');
  }

  return !hasErrors;
}
