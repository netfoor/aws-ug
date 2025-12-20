'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Loader2, Users, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useQRScanner } from '@/hooks/useQRScanner';
import { ScannerState, QRTokenData, CameraUtils } from '@/lib/qr-config';
import { QRValidator } from '@/lib/qr-validation';
// import { SecurityLogger } from '@/lib/security-logger';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';

const client = generateClient<Schema>();

interface QRScannerProps {
  eventId: string;
  onCheckInSuccess?: (attendeeName: string) => void;
  onManualCheckIn?: () => void;
}

interface ScanResult {
  type: 'success' | 'error' | 'warning';
  message: string;
  attendeeName?: string;
  timestamp: Date;
}

/**
 * Componente QRScanner para administradores
 * Permite escanear códigos QR y realizar check-ins automáticamente
 */
export default function QRScanner({ 
  eventId, 
  onCheckInSuccess,
  onManualCheckIn 
}: QRScannerProps) {
  const { user } = useAuth();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [checkInCount, setCheckInCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hook del scanner QR
  const {
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
  } = useQRScanner({
    eventId,
    onCheckIn: handleCheckIn,
    onError: handleScanError,
    onScanSuccess: handleScanSuccess,
  });

  // Cargar contador inicial de check-ins
  useEffect(() => {
    loadCheckInCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadCheckInCount() {
    try {
      const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
        eventId: eventId,
      });

      if (registrations) {
        const checkedInCount = registrations.filter(reg => reg.checkedIn).length;
        setCheckInCount(checkedInCount);
      }
    } catch (error) {
      console.error('Error loading check-in count:', error);
    }
  }

  async function handleCheckIn(tokenString: string): Promise<void> {
    setIsProcessing(true);
    
    try {
      console.log('🔍 Processing QR token:', tokenString.substring(0, 100) + '...');
      console.log('📍 Event ID:', eventId);
      
      // Usar el validador mejorado con seguridad
      const validationResult = await QRValidator.validateToken(
        tokenString, 
        eventId, 
        user?.userId
      );

      console.log('✅ Validation result:', validationResult);

      if (!validationResult.isValid) {
        // Reproducir sonido de error
        playErrorSound();
        
        // Manejar incidentes de seguridad
        if (validationResult.securityIncident) {
          addScanResult({
            type: 'error',
            message: `🚨 ${validationResult.error}`,
            timestamp: new Date(),
          });
        } else {
          addScanResult({
            type: 'warning',
            message: validationResult.error || 'Token inválido',
            timestamp: new Date(),
          });
        }
        return;
      }

      const { registration } = validationResult;
      if (!registration) {
        throw new Error('Registro no encontrado después de validación');
      }

      // Realizar check-in usando el validador
      const checkInResult = await QRValidator.performCheckIn(
        registration,
        user?.userId || 'unknown',
        'QR_SCAN'
      );

      if (!checkInResult.success) {
        throw new Error(checkInResult.error || 'Error al realizar check-in');
      }

      // Éxito
      const attendeeName = registration.userName || 'Usuario';
      addScanResult({
        type: 'success',
        message: `✅ Check-in exitoso para ${attendeeName}!`,
        attendeeName,
        timestamp: new Date(),
      });

      setCheckInCount(prev => prev + 1);
      
      if (onCheckInSuccess) {
        onCheckInSuccess(attendeeName);
      }

      // Reproducir sonido de éxito
      playSuccessSound();

    } catch (error) {
      console.error('Error during check-in:', error);
      addScanResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleScanSuccess(token: QRTokenData) {
    // Este callback se ejecuta cuando se escanea exitosamente un QR
    // pero antes del check-in. Útil para feedback inmediato.
    console.log('QR escaneado exitosamente:', token);
  }

  function handleScanError(error: string) {
    addScanResult({
      type: 'error',
      message: error,
      timestamp: new Date(),
    });
    playErrorSound();
  }

  function addScanResult(result: ScanResult) {
    setScanResults(prev => [result, ...prev.slice(0, 4)]); // Mantener solo los últimos 5
  }

  function playSuccessSound() {
    try {
      // Crear un beep de éxito usando Web Audio API
      const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Silenciar errores de audio
      console.warn('No se pudo reproducir sonido:', error);
    }
  }

  function playErrorSound() {
    try {
      // Crear un beep de error (tono descendente)
      const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Tono descendente para indicar error
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      console.warn('No se pudo reproducir sonido de error:', error);
    }
  }

  const getScannerStateMessage = () => {
    switch (scannerState) {
      case ScannerState.INITIALIZING:
        return 'Inicializando cámara...';
      case ScannerState.READY:
        return 'Presiona "Iniciar Scanner" para comenzar';
      case ScannerState.SCANNING:
        return 'Apunta la cámara hacia el código QR';
      case ScannerState.PROCESSING:
        return 'Procesando código QR...';
      case ScannerState.NO_CAMERA:
        return 'No se detectó cámara en este dispositivo';
      case ScannerState.ERROR:
        return 'Error con la cámara';
      default:
        return 'Estado desconocido';
    }
  };

  const getScannerStateIcon = () => {
    switch (scannerState) {
      case ScannerState.INITIALIZING:
      case ScannerState.PROCESSING:
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case ScannerState.READY:
        return <Camera className="w-6 h-6" />;
      case ScannerState.SCANNING:
        return <Zap className="w-6 h-6 text-green-500" />;
      case ScannerState.NO_CAMERA:
      case ScannerState.ERROR:
        return <CameraOff className="w-6 h-6 text-red-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-surface rounded-2xl overflow-hidden">
      {/* Header con estadísticas */}
      <div className="bg-accent/10 p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">Check-ins</span>
          </div>
          <div className="text-xl font-bold text-accent">
            {checkInCount}
          </div>
        </div>
      </div>

      {/* Video Scanner */}
      <div className="relative">
        <div className="aspect-square bg-black overflow-hidden">
          {hasCamera ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-text-secondary">
                <CameraOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Cámara no disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Overlay de estado */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-surface rounded-lg p-3 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-xs text-text-primary">Procesando...</p>
            </div>
          </div>
        )}
      </div>

      {/* Estado del scanner */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-text-secondary">
            {getScannerStateIcon()}
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-primary font-medium">
              {getScannerStateMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {!isScanning ? (
            <Button
              variant="accent"
              onClick={startScanning}
              disabled={!hasCamera || scannerState === ScannerState.INITIALIZING}
              className="flex items-center justify-center gap-2 text-sm py-2"
            >
              <Camera className="w-4 h-4" />
              Iniciar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={stopScanning}
              className="flex items-center justify-center gap-2 text-sm py-2"
            >
              <CameraOff className="w-4 h-4" />
              Detener
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onManualCheckIn}
            className="flex items-center justify-center gap-2 text-sm py-2"
          >
            <Users className="w-4 h-4" />
            Manual
          </Button>
        </div>

        {/* Controles adicionales */}
        <div className="flex gap-2">
          {scannerState === ScannerState.ERROR && (
            <Button
              variant="ghost"
              onClick={resetScanner}
              className="flex-1 text-xs py-1"
            >
              Reiniciar
            </Button>
          )}

          {/* Simple camera toggle - only show if multiple cameras available */}
          {availableCameras.length > 1 && (
            <Button
              variant="ghost"
              onClick={() => {
                const currentCameraInfo = availableCameras.find(c => c.id === currentCamera);
                const isCurrentlyBack = currentCamera === 'environment' || 
                  (currentCameraInfo && CameraUtils.isBackCamera(currentCameraInfo.label));
                
                if (isCurrentlyBack) {
                  // Switch to front
                  const frontCamera = availableCameras.find(c => CameraUtils.isFrontCamera(c.label));
                  if (frontCamera) switchCamera(frontCamera.id);
                  else switchCamera('user'); // fallback
                } else {
                  // Switch to back
                  const backCamera = availableCameras.find(c => CameraUtils.isBackCamera(c.label));
                  if (backCamera) switchCamera(backCamera.id);
                  else switchCamera('environment'); // fallback
                }
              }}
              className="flex-1 text-xs py-1 flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Cambiar</span>
            </Button>
          )}
        </div>


      </div>

      {/* Resultados recientes */}
      {scanResults.length > 0 && (
        <div className="border-t border-border">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Actividad Reciente
            </h3>
            <div className="space-y-2">
              {scanResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    result.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : result.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {result.type === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {result.type === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    {result.type === 'error' && (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      result.type === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : result.type === 'warning'
                        ? 'text-amber-800 dark:text-amber-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {result.message}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}