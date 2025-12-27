/**
 * Hook personalizado para manejar el estado y funcionalidad del scanner QR
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScannerState, QRTokenData, QRTokenUtils, CameraUtils } from '@/lib/qr-config';

// Type for QR Scanner instance
interface QRScannerInstance {
  start(): Promise<void>;
  stop(): void;
  destroy(): void;
  setCamera(facingModeOrDeviceId: string): Promise<void>;
}

interface UseQRScannerOptions {
  eventId?: string;
  onCheckIn?: (tokenString: string) => Promise<void>;
  onError: (error: string) => void;
  onScanSuccess?: (qrData: QRTokenData) => void;
}

interface UseQRScannerReturn {
  scannerState: ScannerState;
  isScanning: boolean;
  hasCamera: boolean;
  availableCameras: Array<{ id: string; label: string }>;
  currentCamera: string;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  resetScanner: () => void;
  switchCamera: (cameraId: string) => Promise<void>;
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
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCamera, setCurrentCamera] = useState<string>('environment'); // 'environment' = back camera

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QRScannerInstance | null>(null); // QrScanner instance
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkCameraAvailability = async () => {
    try {
      // Importación dinámica para evitar errores en SSR
      const QrScanner = (await import('qr-scanner')).default;
      const cameraAvailable = await QrScanner.hasCamera();

      if (cameraAvailable) {
        // Listar cámaras disponibles
        try {
          const cameras = await QrScanner.listCameras(true);
          setAvailableCameras(cameras);

          // Buscar cámara trasera por defecto usando utilidades
          const backCamera = cameras.find(camera => CameraUtils.isBackCamera(camera.label));

          if (backCamera) {
            setCurrentCamera(backCamera.id);
          } else {
            // Si no encuentra cámara trasera por etiqueta, usar 'environment' como fallback
            setCurrentCamera('environment');
          }
        } catch (error) {
          console.warn('Could not list cameras, using default:', error);
          setCurrentCamera('environment');
        }
      }

      setHasCamera(cameraAvailable);
      setScannerState(cameraAvailable ? ScannerState.READY : ScannerState.NO_CAMERA);
    } catch (error) {
      console.error('Error checking camera availability:', error);
      setHasCamera(false);
      setScannerState(ScannerState.ERROR);
      onError('No se pudo verificar la disponibilidad de la cámara');
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
        onError('El código QR no tiene un formato válido');
        setScannerState(ScannerState.SCANNING);
        return;
      }

      // Validar que sea para el evento correcto
      if (eventId && !QRTokenUtils.isTokenForEvent(token, eventId)) {
        onError('Este código QR pertenece a otro evento');
        setScannerState(ScannerState.SCANNING);
        return;
      }

      // Callback de éxito del scan (antes del check-in)
      if (onScanSuccess) {
        onScanSuccess(token);
      }

      // Procesar el check-in
      if (onCheckIn) {
        await onCheckIn(tokenString);
      }

      // Breve pausa antes de continuar escaneando
      setTimeout(() => {
        setScannerState(ScannerState.SCANNING);
      }, 1500);

    } catch (error) {
      console.error('Error processing QR result:', error);
      onError('Error al procesar el check-in');
      setScannerState(ScannerState.SCANNING);
    }

    // Limpiar el token procesado después de un tiempo
    setTimeout(() => {
      processedTokensRef.current.delete(tokenString);
    }, 5000);
  }, [eventId, onCheckIn, onError, onScanSuccess]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !hasCamera) {
      onError('No hay cámara disponible');
      return;
    }

    try {
      setScannerState(ScannerState.INITIALIZING);

      // Importación dinámica
      const QrScanner = (await import('qr-scanner')).default;

      // Convertir currentCamera al formato esperado por QrScanner
      const getPreferredCamera = (): "front" | "back" | undefined => {
        if (currentCamera === 'user') return 'front';
        if (currentCamera === 'environment') return 'back';

        // Si es un ID específico, determinar si es frontal o trasera
        const currentCameraInfo = availableCameras.find(c => c.id === currentCamera);
        if (currentCameraInfo) {
          if (CameraUtils.isFrontCamera(currentCameraInfo.label)) return 'front';
          if (CameraUtils.isBackCamera(currentCameraInfo.label)) return 'back';
        }

        // Por defecto, usar cámara trasera
        return 'back';
      };

      // Crear nueva instancia del scanner
      scannerRef.current = new QrScanner(
        videoRef.current,
        processQRResult,
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 3,
          preferredCamera: getPreferredCamera(),
        }
      ) as QRScannerInstance;

      await scannerRef.current.start();

      // Si currentCamera es un ID específico (no 'user' o 'environment'), configurarlo después del start
      if (currentCamera !== 'user' && currentCamera !== 'environment') {
        try {
          await scannerRef.current.setCamera(currentCamera);
        } catch (cameraError) {
          console.warn('Could not set specific camera, using default:', cameraError);
        }
      }

      setIsScanning(true);
      setScannerState(ScannerState.SCANNING);

    } catch (error) {
      console.error('Error starting scanner:', error);
      setIsScanning(false);
      setScannerState(ScannerState.ERROR);

      // Determinar el tipo de error específico
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError('Acceso a la cámara denegado');
        } else if (error.name === 'NotFoundError') {
          onError('No se encontró ninguna cámara');
        } else {
          onError(`Error al iniciar el scanner: ${error.message}`);
        }
      }
    }
  }, [hasCamera, processQRResult, onError, currentCamera, availableCameras]);

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

  const switchCamera = useCallback(async (cameraId: string) => {
    try {
      if (scannerRef.current && isScanning) {
        // Si está escaneando, cambiar la cámara directamente
        await scannerRef.current.setCamera(cameraId);
        setCurrentCamera(cameraId);
      } else {
        // Si no está escaneando, solo actualizar la cámara para el próximo inicio
        setCurrentCamera(cameraId);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      onError('No se pudo cambiar la cámara');
    }
  }, [isScanning, onError]);

  return {
    scannerState,
    isScanning,
    hasCamera,
    availableCameras,
    currentCamera,
    startScanning,
    stopScanning,
    resetScanner,
    switchCamera,
    videoRef,
  };
}