#!/usr/bin/env node

/**
 * Pre-build validation script
 * Verifica que la configuración esté correcta antes de compilar
 */

// Cargar el validador usando ES modules
import path from 'path';
import fs from 'fs';

// Función para validar amplify_outputs.json
function validateAmplifyConfig() {
  const errors = [];
  const warnings = [];

  try {
    const configPath = path.join(process.cwd(), 'amplify_outputs.json');
    
    if (!fs.existsSync(configPath)) {
      errors.push('amplify_outputs.json not found. Run "npx ampx sandbox" to generate it.');
      return { valid: false, errors, warnings };
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.auth) {
      errors.push('amplify_outputs.json missing "auth" configuration');
    } else {
      if (!config.auth.user_pool_id) {
        errors.push('Missing auth.user_pool_id in amplify_outputs.json');
      }
      if (!config.auth.user_pool_client_id) {
        errors.push('Missing auth.user_pool_client_id in amplify_outputs.json');
      }
      if (!config.auth.oauth?.domain) {
        errors.push('Missing auth.oauth.domain - OAuth login will not work');
      }
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
      errors.push(`Error reading amplify_outputs.json: ${error.message}`);
    }
    
    return { valid: false, errors, warnings };
  }
}

// Ejecutar validación
console.log('🔍 1. Validating configuration before build...\n');

const result = validateAmplifyConfig();

if (result.errors.length > 0) {
  console.error('❌ Configuration Errors:');
  result.errors.forEach(error => console.error(`  - ${error}`));
  console.error('\n❌ Build aborted due to configuration errors.\n');
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('⚠️  Configuration Warnings:');
  result.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

console.log('✅ Configuration validation passed!\n');
process.exit(0);
