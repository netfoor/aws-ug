'use client';

import { useEffect, useRef } from 'react';

interface UseScreenBrightnessOptions {
  enabled: boolean;
  targetBrightness?: number;
}

// Type definitions for experimental screen brightness API
interface ScreenWithBrightness extends Screen {
  brightness?: number;
}

interface WakeLockAPI {
  request: (type: 'screen') => Promise<WakeLockSentinel>;
}

interface NavigatorWithWakeLock {
  wakeLock?: WakeLockAPI;
}

/**
 * Hook para controlar el brillo de pantalla automáticamente
 * Funciona principalmente en dispositivos móviles con soporte nativo
 */
export function useScreenBrightness({
  enabled,
  targetBrightness = 1.0
}: UseScreenBrightnessOptions) {
  const originalBrightnessRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const setupBrightnessAndWakeLock = async () => {
      try {
        // 1. Intentar controlar brillo (funciona en algunos navegadores móviles)
        if ('screen' in navigator) {
          const screen = navigator.screen as ScreenWithBrightness;

          // Guardar brillo original
          if (screen.brightness !== undefined && originalBrightnessRef.current === null) {
            originalBrightnessRef.current = screen.brightness;
          }

          // Establecer brillo máximo
          if (screen.brightness !== undefined) {
            screen.brightness = targetBrightness;
          }
        }

        // 2. Mantener pantalla encendida (Wake Lock API)
        if ('wakeLock' in navigator) {
          try {
            const navigatorWithWakeLock = navigator as unknown as NavigatorWithWakeLock;
            wakeLockRef.current = await navigatorWithWakeLock.wakeLock!.request('screen');
            console.log('Wake lock activated');
          } catch (wakeLockError) {
            console.log('Wake lock not supported or denied:', wakeLockError);
          }
        }

        // 3. Fallback: CSS para maximizar brillo visual
        document.documentElement.style.setProperty('--ticket-brightness', '1.5');
        document.documentElement.style.setProperty('--ticket-contrast', '1.2');

      } catch (error) {
        console.log('Brightness control setup failed:', error);
      }
    };

    setupBrightnessAndWakeLock();

    // Cleanup function
    return () => {
      // Restaurar brillo original
      if (originalBrightnessRef.current !== null) {
        try {
          if ('screen' in navigator) {
            const screen = navigator.screen as ScreenWithBrightness;
            if (screen.brightness !== undefined) {
              screen.brightness = originalBrightnessRef.current;
            }
          }
        } catch (error) {
          console.log('Could not restore brightness:', error);
        }
      }

      // Liberar wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released');
      }

      // Remover CSS personalizado
      document.documentElement.style.removeProperty('--ticket-brightness');
      document.documentElement.style.removeProperty('--ticket-contrast');
    };
  }, [enabled, targetBrightness]);

  return {
    isSupported: 'screen' in navigator || 'wakeLock' in navigator,
  };
}