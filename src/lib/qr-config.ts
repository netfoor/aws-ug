/**
 * Configuración y utilidades para las librerías QR
 */

// Configuración por defecto para QRious (generación de QR)
export const DEFAULT_QR_OPTIONS = {
  size: 256,
  level: 'M' as const, // Error correction level
  background: '#ffffff',
  foreground: '#000000',
  padding: 10,
  mime: 'image/png',
} as const;

// Configuración por defecto para QR Scanner
export const DEFAULT_SCANNER_OPTIONS = {
  highlightScanRegion: true,
  highlightCodeOutline: true,
  maxScansPerSecond: 5,
  preferredCamera: 'back' as const,
} as const;

// Estructura del token QR
export interface QRTokenData {
  eventId: string;
  userId: string;
  registrationId: string;
  timestamp: number;
  signature?: string; // Para validación futura
}

// Utilidades para tokens QR
export class QRTokenUtils {
  // Clave secreta para firmar tokens (en producción debería venir de variables de entorno)
  private static readonly SECRET_KEY = 'aws-ug-qr-secret-2024';

  /**
   * Genera un token QR a partir de los datos del registro con firma criptográfica
   */
  static generateToken(data: Omit<QRTokenData, 'timestamp' | 'signature'>): string {
    const tokenData: QRTokenData = {
      ...data,
      timestamp: Date.now(),
    };
    
    // Generar firma criptográfica
    tokenData.signature = this.generateSignature(tokenData);
    
    return JSON.stringify(tokenData);
  }

  /**
   * Genera una firma criptográfica para el token
   */
  private static generateSignature(tokenData: Omit<QRTokenData, 'signature'>): string {
    // Crear string para firmar
    const dataToSign = `${tokenData.eventId}:${tokenData.userId}:${tokenData.registrationId}:${tokenData.timestamp}`;
    
    // Generar hash simple (en producción usar crypto más robusto)
    let hash = 0;
    const combined = dataToSign + this.SECRET_KEY;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Verifica la firma criptográfica de un token
   */
  static verifySignature(tokenData: QRTokenData): boolean {
    if (!tokenData.signature) {
      return false;
    }
    
    const expectedSignature = this.generateSignature({
      eventId: tokenData.eventId,
      userId: tokenData.userId,
      registrationId: tokenData.registrationId,
      timestamp: tokenData.timestamp,
    });
    
    return tokenData.signature === expectedSignature;
  }

  /**
   * Parsea un token QR y valida su estructura y firma
   */
  static parseToken(token: string): QRTokenData | null {
    try {
      // Verificar si el token está vacío o es inválido
      if (!token || typeof token !== 'string' || token.trim() === '') {
        return null;
      }

      // Intentar parsear como JSON
      const data = JSON.parse(token) as QRTokenData;
      
      // Validar que tenga los campos requeridos
      if (!data.eventId || !data.userId || !data.registrationId || !data.timestamp) {
        console.warn('QR token missing required fields:', data);
        return null;
      }

      // Verificar firma criptográfica
      if (!this.verifySignature(data)) {
        console.warn('QR token signature verification failed:', data);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error parsing QR token:', error);
      return null;
    }
  }

  /**
   * Valida si un token QR está expirado
   * Los tokens expiran 24 horas después del evento
   */
  static isTokenExpired(token: QRTokenData, eventEndDate: Date): boolean {
    const expirationDate = new Date(eventEndDate.getTime() + 24 * 60 * 60 * 1000); // +24 horas
    
    return Date.now() > expirationDate.getTime();
  }

  /**
   * Valida si un token pertenece al evento correcto
   */
  static isTokenForEvent(token: QRTokenData, eventId: string): boolean {
    return token.eventId === eventId;
  }
}

// Tipos para los componentes
export interface QRTicketProps {
  eventId: string;
  userId: string;
  registrationId: string;
  qrToken: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  userName: string;
}

export interface QRScannerProps {
  eventId: string;
  onCheckIn: (token: QRTokenData) => Promise<void>;
  onError: (error: string) => void;
  onScanSuccess?: (token: QRTokenData) => void;
}

// Estados del scanner
export enum ScannerState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  SCANNING = 'scanning',
  PROCESSING = 'processing',
  ERROR = 'error',
  NO_CAMERA = 'no_camera',
}

// Tipos de errores del scanner
export enum ScannerError {
  NO_CAMERA_PERMISSION = 'no_camera_permission',
  NO_CAMERA_FOUND = 'no_camera_found',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_ALREADY_USED = 'token_already_used',
  WRONG_EVENT = 'wrong_event',
  NETWORK_ERROR = 'network_error',
}

// Mensajes de error localizados
export const ERROR_MESSAGES = {
  [ScannerError.NO_CAMERA_PERMISSION]: 'No se pudo acceder a la cámara. Por favor, permite el acceso en la configuración del navegador.',
  [ScannerError.NO_CAMERA_FOUND]: 'No se encontró ninguna cámara en este dispositivo.',
  [ScannerError.INVALID_TOKEN]: 'El código QR no es válido o está dañado.',
  [ScannerError.TOKEN_EXPIRED]: 'Este código QR ha expirado.',
  [ScannerError.TOKEN_ALREADY_USED]: 'Este código QR ya fue utilizado para hacer check-in.',
  [ScannerError.WRONG_EVENT]: 'Este código QR pertenece a otro evento.',
  [ScannerError.NETWORK_ERROR]: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
} as const;