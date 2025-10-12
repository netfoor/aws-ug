#!/usr/bin/env node

/**
 * Script para validar credenciales de Google OAuth
 * Hace llamadas REALES a la API de Google para verificar configuración
 */

const https = require('https');
const fs = require('fs');

// Leer credenciales
const envData = fs.readFileSync('.env', 'utf8');
const lines = envData.split('\n');
const env = {};
lines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const clientId = env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET;
const cognitoDomain = 'eda4ff2f2e021718a162.auth.us-east-1.amazoncognito.com';
const redirectUri = `https://${cognitoDomain}/oauth2/idpresponse`;

if (!clientId || !clientSecret) {
  console.error('❌ Error: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no encontrados en .env');
  process.exit(1);
}

console.log('\n🔍 Validando configuración de Google OAuth con llamadas REALES a la API\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 CONFIGURACIÓN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Client ID:      ${clientId}`);
console.log(`Client Secret:  ${clientSecret.substring(0, 15)}...`);
console.log(`Redirect URI:   ${redirectUri}\n`);

// Test 1: Generar URL de autorización
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Generar URL de Autorización');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const authParams = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email profile',
  state: 'test_' + Date.now(),
  access_type: 'offline'
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
console.log('✅ URL generada (primeros 150 chars):');
console.log(authUrl.substring(0, 150) + '...\n');

// Test 2: Hacer request real a Google
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Verificar que Google ACEPTA la configuración');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('⏳ Haciendo request REAL a Google OAuth endpoint...\n');

const url = new URL(authUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'HEAD', // Solo queremos los headers, no el body completo
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  timeout: 10000
};

const req = https.request(options, (res) => {
  console.log(`📡 Response Status: ${res.statusCode}`);
  console.log(`📋 Headers recibidos:`);
  Object.keys(res.headers).forEach(key => {
    if (key === 'location' || key === 'content-type' || key === 'set-cookie') {
      console.log(`   ${key}: ${res.headers[key]}`);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTADO DEL TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 301) {
    console.log('✅ ¡Google ACEPTA la configuración!');
    console.log('✅ El Client ID es válido');
    console.log('✅ La Redirect URI está autorizada\n');
    
    if (res.statusCode === 302 || res.statusCode === 301) {
      console.log(`📍 Google redirige a: ${res.headers.location || 'login page'}\n`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 CONFIGURACIÓN VÁLIDA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Si TODAVÍA recibes error "401 invalid_client" al hacer login:');
    console.log('   1. ❌ OAuth Consent Screen en "Testing" sin tu email');
    console.log('      Solución: https://console.cloud.google.com/apis/credentials/consent');
    console.log('                Agrega tu email en "Test users"\n');
    
    console.log('   2. ❌ Cognito tiene credenciales viejas cacheadas');
    console.log('      Solución: npx ampx sandbox delete && npx ampx sandbox\n');
    
    console.log('   3. ❌ Client Secret incorrecto en Amplify');
    console.log('      Solución: Verifica que el secret en Google Console coincida\n');
    
    console.log('💡 PRÓXIMO PASO:');
    console.log('   1. Ve a: https://console.cloud.google.com/apis/credentials/consent');
    console.log('   2. Si está en "Testing", agrega tu email en "Test users"');
    console.log('   3. Guarda y espera 30 segundos');
    console.log('   4. Prueba: npm run dev → http://localhost:3000/login\n');
    
  } else if (res.statusCode === 400) {
    console.log('❌ Google RECHAZA la configuración (400 Bad Request)');
    console.log('❌ Causas posibles:\n');
    console.log('   1. Client ID inválido o no existe en Google Console');
    console.log('   2. Redirect URI NO está autorizada en Google Console');
    console.log('   3. Proyecto de Google deshabilitado o eliminado\n');
    
    console.log('🔧 SOLUCIÓN:');
    console.log('   1. Ve a: https://console.cloud.google.com/apis/credentials');
    console.log('   2. Verifica que el Client ID sea EXACTAMENTE:');
    console.log(`      ${clientId}`);
    console.log('   3. Verifica que en "Authorized redirect URIs" esté:');
    console.log(`      ${redirectUri}`);
    console.log('   4. Guarda cambios y espera 2 minutos\n');
    
  } else if (res.statusCode === 401 || res.statusCode === 403) {
    console.log('❌ Google rechaza las credenciales (No autorizado)');
    console.log('❌ El Client ID o Client Secret son incorrectos\n');
    
    console.log('🔧 SOLUCIÓN:');
    console.log('   1. Ve a: https://console.cloud.google.com/apis/credentials');
    console.log('   2. Copia el Client ID y Client Secret correctos');
    console.log('   3. Actualiza .env con los valores correctos');
    console.log('   4. Actualiza Amplify secrets:');
    console.log('      npx ampx sandbox secret set GOOGLE_CLIENT_ID');
    console.log('      npx ampx sandbox secret set GOOGLE_CLIENT_SECRET\n');
    
  } else {
    console.log(`⚠️  Status code inesperado: ${res.statusCode}`);
    console.log('   Esto puede indicar un problema temporal de Google\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

req.on('error', (err) => {
  console.error('\n❌ Error al conectar con Google:', err.message);
  console.error('   Verifica tu conexión a internet\n');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('\n❌ Timeout al conectar con Google');
  console.error('   La request tardó más de 10 segundos\n');
  req.destroy();
  process.exit(1);
});

req.end();
