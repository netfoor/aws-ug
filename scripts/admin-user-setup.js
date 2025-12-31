#!/usr/bin/env node

/**
 * Script para configurar usuario administrador
 *
 * USO:
 * 1. Primero hacer login en la aplicación con Google usando el email que quieres que sea admin
 * 2. Ejecutar: node scripts/admin-user-setup.js
 * 3. El script pedirá el email del usuario
 * 4. Agregará el usuario al grupo ADMINS
 * 5. Pedirá hacer re-login para que los cambios se apliquen
 *
 * NOTA: Es necesario hacer login primero porque el usuario debe existir en Cognito
 * antes de poder asignarle permisos de administrador.
 */

import { createInterface } from 'readline';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import outputs from '../amplify_outputs.json' assert { type: 'json' };

// Configurar cliente de Cognito
const cognitoClient = new CognitoIdentityProviderClient({
  region: outputs.auth.aws_region,
});

const USER_POOL_ID = outputs.auth.user_pool_id;

// Crear interfaz para leer input del usuario
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function findUserByEmail(email) {
  console.log(`🔍 Buscando usuario con email: ${email}`);

  try {
    const response = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }));

    if (!response.Users || response.Users.length === 0) {
      throw new Error(`Usuario con email ${email} no encontrado`);
    }

    const user = response.Users[0];
    console.log(`✅ Usuario encontrado: ${user.Username}`);
    return user;
  } catch (error) {
    console.error(`❌ Error al buscar usuario:`, error.message);
    throw error;
  }
}

async function addUserToAdminGroup(username) {
  console.log(`👑 Agregando usuario ${username} al grupo ADMINS...`);

  try {
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: 'ADMINS',
    }));

    console.log(`✅ Usuario ${username} agregado al grupo ADMINS exitosamente`);
  } catch (error) {
    console.error(`❌ Error al agregar usuario al grupo:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  👑 CONFIGURACIÓN DE USUARIO ADMINISTRADOR                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📋 INSTRUCCIONES:');
  console.log('1. Asegúrate de haber hecho login en http://localhost:3000 con Google');
  console.log('2. Usa el mismo email que usaste para el login');
  console.log('3. Después de este script, deberás hacer re-login para ver los cambios\n');

  try {
    // Pedir email del usuario
    const email = await question('📧 Ingresa el email del usuario administrador: ');

    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    // Buscar usuario
    const user = await findUserByEmail(email.trim());

    // Agregar al grupo ADMINS
    await addUserToAdminGroup(user.Username);

    console.log('\n🎉 ¡Configuración completada!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ve a http://localhost:3000');
    console.log('2. Cierra sesión si estás logueado');
    console.log('3. Vuelve a hacer login con el mismo email');
    console.log('4. Ahora deberías tener acceso a las funciones de administrador');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Sugerencias:');
    console.log('- Asegúrate de haber hecho login primero en la aplicación');
    console.log('- Verifica que el email sea correcto');
    console.log('- Confirma que Amplify sandbox esté corriendo');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});