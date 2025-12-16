/**
 * Hook personalizado para manejar el estado y funcionalidad del scanner QR
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScannerState, ScannerError, QRTokenData, QRTokenUtils } from '@/lib/qr-config';

interface UseQRScannerOptions {
  eventId?: string;
  onCheckIn?: (token: QRTokenData) => Promise<void>;
  onError: (error: string) => void;
  onScanSuccess?: (qrData: string) => void;
}

interface UseQRScannerReturn {
  scannerState: ScannerState;
  isScanning: boolean;
  hasCamera: boolean;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  resetScanner: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useQRScanner({
  eventId,
  onCheckIn,
  onError,
  onScanSuccess,
}: UseQRScannerOptions): UseQRScannerReturn {
  const [scannerState, setScannerState] = useState<ScannerState>(ScannerState.INITIALIZING);
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null); // QrScanner instance
  const processedTokensRef = useRef<Set<string>>(new Set()); // Para evitar duplicados

  // Verificar disponibilidad de cámara al montar
  useEffect(() => {
    checkCameraAvailability();
    return () => {
      // Cleanup al desmontar
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      // Importación dinámica para evitar errores en SSR
      const QrScanner = (await import('qr-scanner')).default;
      const cameraAvailable = await QrScanner.hasCamera();
      
      setHasCamera(cameraAvailable);
      setScannerState(cameraAvailable ? ScannerState.READY : ScannerState.NO_CAMERA);
    } catch (error) {
      console.error('Error checking camera availability:', error);
      setHasCamera(false);
      setScannerState(ScannerState.ERROR);
      onError(ScannerError.NO_CAMERA_FOUND, 'No se pudo verificar la disponibilidad de la cámara');
    }
  };

  const processQRResult = useCallback(async (result: { data: string }) => {
    const tokenString = result.data;
    
    // Evitar procesar el mismo token múltiples veces
    if (processedTokensRef.current.has(tokenString)) {
      return;
    }
    
    processedTokensRef.current.add(tokenString);
    setScannerState(ScannerState.PROCESSING);
    
    try {
      // Parsear el token
      const token = QRTokenUtils.parseToken(tokenString);
      if (!token) {
        onError(ScannerError.INVALID_TOKEN, 'El código QR no tiene un formato válido');
        setScannerState(ScannerState.SCANNING);
        return;
      }

      // Validar que sea para el evento correcto
      if (!QRTokenUtils.isTokenForEvent(token, eventId)) {
        onError(ScannerError.WRONG_EVENT, 'Este código QR pertenece a otro evento');
        setScannerState(ScannerState.SCANNING);
        return;
      }

      // Callback de éxito del scan (antes del check-in)
      if (onScanSuccess) {
        onScanSuccess(token);
      }

      // Procesar el check-in
      await onCheckIn(token);
      
      // Breve pausa antes de continuar escaneando
      setTimeout(() => {
        setScannerState(ScannerState.SCANNING);
      }, 1500);
      
    } catch (error) {
      console.error('Error processing QR result:', error);
      onError(ScannerError.NETWORK_ERROR, 'Error al procesar el check-in');
      setScannerState(ScannerState.SCANNING);
    }
    
    // Limpiar el token procesado después de un tiempo
    setTimeout(() => {
      processedTokensRef.current.delete(tokenString);
    }, 5000);
  }, [eventId, onCheckIn, onError, onScanSuccess]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !hasCamera) {
      onError(ScannerError.NO_CAMERA_FOUND, 'No hay cámara disponible');
      return;
    }

    try {
      setScannerState(ScannerState.INITIALIZING);
      
      // Importación dinámica
      const QrScanner = (await import('qr-scanner')).default;
      
      // Crear nueva instancia del scanner
      scannerRef.current = new QrScanner(
        videoRef.current,
        processQRResult,
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 3,
          preferredCamera: 'back',
        }
      );

      await scannerRef.current.start();
      setIsScanning(true);
      setScannerState(ScannerState.SCANNING);
      
    } catch (error) {
      console.error('Error starting scanner:', error);
      setIsScanning(false);
      setScannerState(ScannerState.ERROR);
      
      // Determinar el tipo de error específico
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError(ScannerError.NO_CAMERA_PERMISSION, 'Acceso a la cámara denegado');
        } else if (error.name === 'NotFoundError') {
          onError(ScannerError.NO_CAMERA_FOUND, 'No se encontró ninguna cámara');
        } else {
          onError(ScannerError.NETWORK_ERROR, `Error al iniciar el scanner: ${error.message}`);
        }
      }
    }
  }, [hasCamera, processQRResult, onError]);

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanning(false);
      setScannerState(ScannerState.READY);
    }
  }, []);

  const resetScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    processedTokensRef.current.clear();
    setScannerState(hasCamera ? ScannerState.READY : ScannerState.NO_CAMERA);
  }, [hasCamera]);

  return {
    scannerState,
    isScanning,
    hasCamera,
    startScanning,
    stopScanning,
    resetScanner,
    videoRef,
  };
}