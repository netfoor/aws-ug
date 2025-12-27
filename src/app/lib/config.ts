// src\app\lib\config.ts

import { Amplify } from 'aws-amplify';
import amplifyOutputs from '@/../amplify_outputs.json';

let isInitialized = false;

export const initializeAmplify = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (isInitialized) {
    return;
  }

  try {
    // Configure Amplify with secure, production-ready settings
    const config = {
      ...amplifyOutputs,
      // Enhanced Auth configuration for better security and middleware compatibility
      Auth: {
        Cognito: {
          ...amplifyOutputs.auth,
          // Configure cookie storage for authentication state persistence
          cookieStorage: {
            domain: window.location.hostname,
            path: '/',
            expires: 1, // 1 day for better security
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          }
          // Removed tokenCookieStorage with httpOnly as it's not supported from client-side
          // Our custom token-sync handles secure state management instead
        }
      }
    };

    Amplify.configure(config, { ssr: true });
    
    isInitialized = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Amplify configured successfully with secure settings');
    }
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
};
