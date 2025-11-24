import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda PreTokenGeneration Trigger
 * 
 * PROPÓSITO:
 * - Auto-asignar nuevos usuarios al grupo "MEMBERS"
 * - Funciona con Google OAuth (PostAuthentication NO funciona con OAuth)
 * 
 * PERMISOS:
 * - Necesita cognito-idp:AdminAddUserToGroup
 * - Se otorgan en backend.ts usando CDK
 */
export const postAuthentication = defineFunction({
  name: 'post-authentication',
  entry: './handler.ts',
  resourceGroupName: 'auth', // ✅ Asignamos al stack de auth para evitar circular dependency
});
