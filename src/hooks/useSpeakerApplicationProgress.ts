'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Interface for stored progress data
 * Based on UnifiedFormData but with serializable types only
 */
export interface StoredProgressData {
  // Personal data
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  
  // Professional data
  company?: string;
  jobTitle?: string;
  expertiseArea?: string;
  photoKey?: string;
  cvKey?: string;
  linkedInUrl?: string;
  
  // Speaker application
  motivation?: string;
  experience?: string;
  topics?: string[];
  
  // Talk proposal
  talkTitle?: string;
  talkDescription?: string;
  duration?: number;
  targetAudience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate?: string; // ISO string instead of Date
}

/**
 * Complete progress storage structure
 */
export interface ApplicationProgress {
  userId: string;
  currentSection: number;
  formData: StoredProgressData;
  lastSaved: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  version: string; // For future compatibility
}

/**
 * Hook for managing speaker application progress in localStorage
 */
export function useSpeakerApplicationProgress(userId: string) {
  const [hasProgress, setHasProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Constants
  const STORAGE_KEY = `speaker-application-progress-${userId}`;
  const PROGRESS_VERSION = '1.0.0';
  const EXPIRY_DAYS = 10;

  /**
   * Check if localStorage is available
   */
  const isLocalStorageAvailable = useCallback((): boolean => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Generate expiry date
   */
  const getExpiryDate = useCallback((): string => {
    const date = new Date();
    date.setDate(date.getDate() + EXPIRY_DAYS);
    return date.toISOString();
  }, []);

  /**
   * Validate progress data structure
   */
  const validateProgress = useCallback((progress: unknown): progress is ApplicationProgress => {
    if (!progress || typeof progress !== 'object' || progress === null) {
      return false;
    }
    
    const p = progress as Record<string, unknown>;
    
    return (
      typeof p.userId === 'string' &&
      typeof p.currentSection === 'number' &&
      typeof p.formData === 'object' &&
      p.formData !== null &&
      typeof p.lastSaved === 'string' &&
      typeof p.expiresAt === 'string' &&
      typeof p.version === 'string' &&
      p.userId === userId
    );
  }, [userId]);

  /**
   * Check if progress is expired
   */
  const isExpired = useCallback((progress: ApplicationProgress): boolean => {
    const expiryDate = new Date(progress.expiresAt);
    return new Date() > expiryDate;
  }, []);

  /**
   * Save progress to localStorage
   */
  const saveProgress = useCallback((
    section: number, 
    data: StoredProgressData
  ): void => {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available, cannot save progress');
      return;
    }

    try {
      const progress: ApplicationProgress = {
        userId,
        currentSection: section,
        formData: data,
        lastSaved: new Date().toISOString(),
        expiresAt: getExpiryDate(),
        version: PROGRESS_VERSION
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      setHasProgress(true);
      
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [userId, isLocalStorageAvailable, getExpiryDate, STORAGE_KEY]);

  /**
   * Load progress from localStorage
   */
  const loadProgress = useCallback((): ApplicationProgress | null => {
    if (!isLocalStorageAvailable()) {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const progress = JSON.parse(stored);
      
      // Validate structure
      if (!validateProgress(progress)) {
        console.warn('Invalid progress data structure, clearing');
        clearProgress();
        return null;
      }

      // Check expiry
      if (isExpired(progress)) {
        clearProgress();
        return null;
      }

      // Check version compatibility
      if (progress.version !== PROGRESS_VERSION) {
        clearProgress();
        return null;
      }

      return progress;
    } catch (error) {
      console.error('Error loading progress:', error);
      clearProgress(); // Clear corrupted data
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocalStorageAvailable, validateProgress, isExpired, STORAGE_KEY]);

  /**
   * Clear progress from localStorage
   */
  const clearProgress = useCallback((): void => {
    if (!isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasProgress(false);
    } catch (error) {
      console.error('Error clearing progress:', error);
    }
  }, [isLocalStorageAvailable, STORAGE_KEY]);

  /**
   * Get time since last save (for UI display)
   */
  const getTimeSinceLastSave = useCallback((progress: ApplicationProgress): string => {
    const lastSaved = new Date(progress.lastSaved);
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''} atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    } else if (diffMins > 0) {
      return `${diffMins} minuto${diffMins > 1 ? 's' : ''} atrás`;
    } else {
      return 'Hace un momento';
    }
  }, []);

  /**
   * Get days until expiration
   */
  const getDaysUntilExpiration = useCallback((progress: ApplicationProgress): number => {
    const expiryDate = new Date(progress.expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, []);

  /**
   * Cleanup expired progress on mount
   */
  useEffect(() => {
    const checkAndCleanup = () => {
      setIsLoading(true);
      
      const progress = loadProgress();
      setHasProgress(progress !== null);
      
      setIsLoading(false);
    };

    checkAndCleanup();
  }, [loadProgress]);

  /**
   * Cleanup expired entries from other users (housekeeping)
   */
  const cleanupExpiredEntries = useCallback((): void => {
    if (!isLocalStorageAvailable()) {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      const progressKeys = keys.filter(key => key.startsWith('speaker-application-progress-'));
      
      progressKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const progress = JSON.parse(stored);
            if (progress.expiresAt && new Date(progress.expiresAt) < new Date()) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, [isLocalStorageAvailable]);

  // Run cleanup on mount
  useEffect(() => {
    cleanupExpiredEntries();
  }, [cleanupExpiredEntries]);

  return {
    // State
    hasProgress,
    isLoading,
    
    // Actions
    saveProgress,
    loadProgress,
    clearProgress,
    
    // Utilities
    getTimeSinceLastSave,
    getDaysUntilExpiration,
    isLocalStorageAvailable: isLocalStorageAvailable(),
    
    // Constants
    EXPIRY_DAYS
  };
}