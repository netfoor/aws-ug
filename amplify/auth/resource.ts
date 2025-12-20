import { defineAuth, secret } from '@aws-amplify/backend';
import { postAuthentication } from '../functions/post-authentication/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          profilePicture: 'picture',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'https://awspuebla.com/auth/callback',
        'https://www.awspuebla.com/auth/callback',
        'https://bringing-distributed-michigan-repeat.trycloudflare.com/auth/callback'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://awspuebla.com/',
        'https://www.awspuebla.com/',
        'https://bringing-distributed-michigan-repeat.trycloudflare.com/'
      ],
    }
  },
  // 🔐 PERMISOS: Permitir que Lambda PreTokenGeneration agregue usuarios a grupos
  access: (allow) => [
    allow.resource(postAuthentication).to(['addUserToGroup']),
  ],
  // Habilitar MFA (Multi-Factor Authentication)
  multifactor: {
    mode: 'OPTIONAL', // Los usuarios pueden elegir habilitar MFA
    sms: true,        // MFA por SMS
    totp: true,       // MFA por aplicación authenticator (Google Authenticator, etc)
  },
  userAttributes: {
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
  },
  groups: ['ADMINS', 'SPEAKERS', 'MEMBERS'],
  // Políticas de contraseña robustas
  accountRecovery: 'EMAIL_ONLY', // Solo email para recuperación (más seguro que SMS)

  // 🔐 TRIGGERS: Lambdas que se ejecutan en eventos de autenticación
  triggers: {
    // PreTokenGeneration: Se ejecuta ANTES de generar tokens JWT
    // ✅ FUNCIONA con Google OAuth (PostAuthentication NO funciona con OAuth)
    // Uso: Auto-asignar nuevos usuarios al grupo "MEMBERS"
    preTokenGeneration: postAuthentication,
  },
});
