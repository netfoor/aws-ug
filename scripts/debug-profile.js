/**
 * 🧪 Script de Debugging para Perfil de Usuario
 * 
 * Cómo usar:
 * 1. Abre http://localhost:3000/profile
 * 2. Abre DevTools Console (F12)
 * 3. Copia y pega este script completo
 * 4. Presiona Enter
 * 5. Verás un reporte completo del estado
 */

(async function debugProfile() {
  console.log('🔍 Iniciando debug de perfil...\n');
  
  // ============================================
  // 1. Verificar sesión de autenticación
  // ============================================
  console.log('1️⃣ Verificando sesión de autenticación...');
  try {
    const sessionResponse = await fetch('/api/auth/session');
    const session = await sessionResponse.json();
    
    console.log('✅ Sesión:', {
      isAuthenticated: session.isAuthenticated,
      groups: session.groups,
      expiresAt: new Date(session.expiresAt * 1000).toLocaleString()
    });
    
    if (!session.isAuthenticated) {
      console.error('❌ NO AUTENTICADO - Debes iniciar sesión primero');
      return;
    }
  } catch (error) {
    console.error('❌ Error obteniendo sesión:', error);
    return;
  }
  
  // ============================================
  // 2. Verificar grupos de Cognito
  // ============================================
  console.log('\n2️⃣ Verificando grupos de Cognito...');
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth/server');
    // Note: Esta parte solo funciona en Node.js, en browser usa la API de session
    console.log('⚠️ Los grupos se verificaron en el paso 1');
  } catch (error) {
    console.log('ℹ️ Grupos ya verificados via API');
  }
  
  // ============================================
  // 3. Verificar role calculado
  // ============================================
  console.log('\n3️⃣ Calculando role desde grupos...');
  const sessionResponse = await fetch('/api/auth/session');
  const session = await sessionResponse.json();
  const groups = session.groups || [];
  
  let role = 'MEMBER';
  if (groups.includes('ADMINS')) role = 'ADMIN';
  else if (groups.includes('SPEAKERS')) role = 'SPEAKER';
  
  console.log('✅ Role calculado:', role);
  console.log('📋 Lógica:');
  console.log('   - Grupos encontrados:', groups);
  console.log('   - Si incluye ADMINS → ADMIN');
  console.log('   - Si incluye SPEAKERS → SPEAKER');
  console.log('   - Si ninguno → MEMBER');
  
  // ============================================
  // 4. Verificar datos en localStorage/cookies
  // ============================================
  console.log('\n4️⃣ Verificando almacenamiento local...');
  const cookieKeys = document.cookie.split(';').map(c => c.trim().split('=')[0]);
  console.log('🍪 Cookies:', cookieKeys.filter(k => k.includes('Cognito') || k.includes('amplify')));
  
  const localStorageKeys = Object.keys(localStorage).filter(k => 
    k.includes('amplify') || k.includes('Cognito')
  );
  console.log('💾 LocalStorage:', localStorageKeys);
  
  // ============================================
  // 5. Simular query a DynamoDB
  // ============================================
  console.log('\n5️⃣ Probando consulta a DynamoDB...');
  console.log('⚠️ Para verificar DynamoDB, necesitas:');
  console.log('   1. Importar generateClient de aws-amplify/data');
  console.log('   2. Ejecutar client.models.User.list()');
  console.log('   3. O ir a AWS Console → DynamoDB → Tables');
  
  // ============================================
  // 6. Reporte final
  // ============================================
  console.log('\n📊 REPORTE FINAL:');
  console.log('═'.repeat(50));
  console.log(`✅ Autenticado: Sí`);
  console.log(`🎭 Role: ${role}`);
  console.log(`👥 Grupos: ${groups.join(', ') || 'Ninguno'}`);
  console.log(`⏰ Token expira: ${new Date(session.expiresAt * 1000).toLocaleString()}`);
  console.log('═'.repeat(50));
  
  console.log('\n🎯 Próximos pasos:');
  console.log('1. Ve a /profile');
  console.log('2. Click en "Editar Perfil"');
  console.log('3. Verifica que los campos se llenen');
  console.log('4. Edita algo y guarda');
  console.log('5. Revisa logs en console');
  console.log('6. Verifica en AWS Console → DynamoDB\n');
  
})();
