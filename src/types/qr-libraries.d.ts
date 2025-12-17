// Type definitions for QR libraries

declare module 'qrious' {
  interface QRiousOptions {
    background?: string;
    backgroundAlpha?: number;
    element?: HTMLCanvasElement | HTMLImageElement;
    foreground?: string;
    foregroundAlpha?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    mime?: string;
    padding?: number;
    size?: number;
    value?: string;
  }

  class QRious {
    constructor(options?: QRiousOptions);
    
    background: string;
    backgroundAlpha: number;
    element: HTMLCanvasElement | HTMLImageElement;
    foreground: string;
    foregroundAlpha: number;
    level: 'L' | 'M' | 'Q' | 'H';
    mime: string;
    padding: number;
    size: number;
    value: string;
    
    toDataURL(mime?: string): string;
  }

  export = QRious;
}

declare module 'qr-scanner' {
  interface QrScannerOptions {
    highlightScanRegion?: boolean;
    highlightCodeOutline?: boolean;
    overlay?: HTMLDivElement;
    onDecodeError?: (error: Error) => void;
    calculateScanRegion?: (video: HTMLVideoElement) => {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    preferredCamera?: 'front' | 'back';
    maxScansPerSecond?: number;
  }

  interface ScanResult {
    data: string;
    cornerPoints: Array<{ x: number; y: number }>;
  }

  class QrScanner {
    constructor(
      video: HTMLVideoElement,
      onDecode: (result: ScanResult) => void,
      options?: QrScannerOptions
    );

    static scanImage(
      imageOrFileOrBlobOrUrl: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | OffscreenCanvas | File | Blob | URL | string,
      options?: {
        scanRegion?: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        qrEngine?: unknown;
        canvas?: HTMLCanvasElement;
        disallowCanvasResizing?: boolean;
        alsoTryWithoutScanRegion?: boolean;
      }
    ): Promise<ScanResult>;

    static hasCamera(): Promise<boolean>;
    static listCameras(requestLabels?: boolean): Promise<Array<{ id: string; label: string }>>;

    start(): Promise<void>;
    stop(): void;
    pause(): void;
    setCamera(facingModeOrDeviceId: string): Promise<void>;
    turnFlashOn(): Promise<void>;
    turnFlashOff(): Promise<void>;
    destroy(): void;

    hasFlash: boolean;
    isFlashOn: boolean;
    preferredCamera: string;
  }

  export = QrScanner;
}