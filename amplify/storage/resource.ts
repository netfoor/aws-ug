import { defineStorage } from '@aws-amplify/backend';

/**
 * 🗄️ Amplify Storage Configuration
 * 
 * S3 bucket para:
 * - Cover images de eventos
 * - Avatares de usuarios
 * - Attachments de propuestas
 * - Speaker professional files (CV, photos)
 * 
 * Estructura:
 * - events/{eventId}/cover-{timestamp}.webp
 * - avatars/{userId}/avatar-{timestamp}.webp
 * - proposals/{proposalId}/attachment-{timestamp}.{ext}
 * - speakers/{userId}/photo/{timestamp}-{filename}
 * - speakers/{userId}/cv/{timestamp}-{filename}
 */
export const storage = defineStorage({
  name: 'awsugStorage',
  access: (allow) => ({
    // Cover images de eventos - PÚBLICO para lectura (sin autenticación), autenticados write
    // Nota: allow.guest + allow.authenticated es necesario para evitar 403
    'events/*': [
      allow.guest.to(['read']), // Lectura sin autenticación
      allow.authenticated.to(['read', 'write', 'delete']), // Usuario autenticado
      allow.groups(['ADMINS', 'SPEAKERS']).to(['read', 'write', 'delete']) // Roles específicos
    ],
    // Avatares - público read, owner write
    'avatars/{identity}/*': [
      allow.guest.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    // Propuestas - autenticado read, owner write
    'proposals/{identity}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    // 🎤 Speaker professional files (CV y fotos) 
    // PÚBLICO read para fotos de perfil, autenticados write durante aplicación
    'speakers/*': [
      allow.guest.to(['read']), // ← Agregar read público para fotos de perfil
      allow.authenticated.to(['read', 'write']), // ← Permite upload durante aplicación
      allow.groups(['MEMBERS', 'SPEAKERS', 'ADMINS']).to(['read', 'write', 'delete'])
    ]
  })
});
