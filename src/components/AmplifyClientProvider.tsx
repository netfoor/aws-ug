//src\components\AmplifyClientProvider.tsx

'use client';

import React, { useEffect } from 'react';
import { initializeAmplify } from '@/app/lib/config';

interface AmplifyClientProviderProps {
  children: React.ReactNode;
}

const AmplifyClientProvider: React.FC<AmplifyClientProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize Amplify configuration
    initializeAmplify();
  }, []);

  return <>{children}</>;
};

export default AmplifyClientProvider;
