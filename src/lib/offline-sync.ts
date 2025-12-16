/**
 * Utilidades para manejo offline y sincronización de check-ins
 */

import { useState, useEffect } from 'react';
import { QRTokenData } from './qr-config';

export interface OfflineCheckIn {
  id: string;
  eventId: string;
  token: QRTokenData;
  timestamp: string;
  method: 'QR_SCAN' | 'MANUAL';
  adminId: string;
  synced: boolean;
}

export interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

const OFFLINE_STORAGE_KEY = 'awsug_offline_checkins';

export class OfflineSyncManager {
  /**
   * Almacena un check-in en localStorage para sincronización posterior
   */
  static storeCheckIn(checkIn: Omit<OfflineCheckIn, 'id' | 'synced'>): string {
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineCheckIn: OfflineCheckIn = {
      ...checkIn,
      id,
      synced: false,
    };

    const stored = this.getStoredCheckIns();
    stored.push(offlineCheckIn);
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(stored));
    return id;
  }

  /**
   * Obtiene todos los check-ins almacenados localmente
   */
  static getStoredCheckIns(): OfflineCheckIn[] {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline check-ins:', error);
      return [];
    }
  }

  /**
   * Obtiene solo los check-ins pendientes de sincronización
   */
  static getPendingCheckIns(): OfflineCheckIn[] {
    return this.getStoredCheckIns().filter(checkIn => !checkIn.synced);
  }

  /**
   * Marca un check-in como sincronizado
   */
  static markAsSynced(id: string): void {
    const stored = this.getStoredCheckIns();
    const index = stored.findIndex(checkIn => checkIn.id === id);
    
    if (index !== -1) {
      stored[index].synced = true;
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(stored));
    }
  }

  /**
   * Elimina check-ins sincronizados antiguos (más de 7 días)
   */
  static cleanupSyncedCheckIns(): void {
    const stored = this.getStoredCheckIns();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const filtered = stored.filter(checkIn => {
      if (checkIn.synced) {
        const checkInTime = new Date(checkIn.timestamp).getTime();
        return checkInTime > sevenDaysAgo;
      }
      return true; // Mantener los no sincronizados
    });

    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Obtiene el número de check-ins pendientes
   */
  static getPendingCount(): number {
    return this.getPendingCheckIns().length;
  }

  /**
   * Verifica si hay conexión a internet
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Limpia todos los datos offline (usar con cuidado)
   */
  static clearAllOfflineData(): void {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
  }
}

/**
 * Hook para detectar cambios en el estado de conexión
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

