//src\components\AmplifyClientProvider.tsx

'use client';

import React, { useEffect } from 'react';
import { initializeAmplify } from '@/app/lib/config';
import { setupTokenSync } from '@/lib/amplify/token-sync';

interface AmplifyClientProviderProps {
  children: React.ReactNode;
}

const AmplifyClientProvider: React.FC<AmplifyClientProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize Amplify configuration
    initializeAmplify();
    
    // Set up token synchronization to cookies for middleware access
    const cleanup = setupTokenSync();
    
    return () => {
      // Clean up token sync event listeners if needed
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  return <>{children}</>;
};

export default AmplifyClientProvider;
