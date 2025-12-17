/**
 * Auto-save utilities for form data
 */

/**
 * Debounced function type
 */
type DebouncedFunction<T extends (...args: never[]) => unknown> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

/**
 * Create a debounced version of a function
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function with cancel and flush methods
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFunction = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  };

  // Cancel pending execution
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  // Execute immediately with last args
  debouncedFunction.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debouncedFunction as DebouncedFunction<T>;
}

/**
 * Auto-save configuration
 */
export const AUTO_SAVE_CONFIG = {
  // Delay after user stops typing
  TYPING_DELAY: 2000, // 2 seconds
  
  // Delay for section changes (immediate)
  SECTION_CHANGE_DELAY: 0,
  
  // Delay for file uploads (immediate after success)
  FILE_UPLOAD_DELAY: 0,
  
  // Maximum auto-save frequency (prevent spam)
  MIN_SAVE_INTERVAL: 1000, // 1 second
} as const;

/**
 * Throttled auto-save to prevent excessive saves
 */
export function createThrottledAutoSave<T>(
  saveFunction: (data: T) => void,
  minInterval: number = AUTO_SAVE_CONFIG.MIN_SAVE_INTERVAL
) {
  let lastSaveTime = 0;
  let pendingData: T | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttledSave = (data: T) => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;

    pendingData = data;

    if (timeSinceLastSave >= minInterval) {
      // Can save immediately
      saveFunction(data);
      lastSaveTime = now;
      pendingData = null;
    } else {
      // Need to wait
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const remainingTime = minInterval - timeSinceLastSave;
      timeoutId = setTimeout(() => {
        if (pendingData) {
          saveFunction(pendingData);
          lastSaveTime = Date.now();
          pendingData = null;
        }
        timeoutId = null;
      }, remainingTime);
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingData = null;
  };

  const flush = () => {
    if (pendingData) {
      saveFunction(pendingData);
      lastSaveTime = Date.now();
      pendingData = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {
    save: throttledSave,
    cancel,
    flush
  };
}

/**
 * Create auto-save handler for form fields
 */
export function createAutoSaveHandler<T>(
  saveProgress: (section: number, data: T) => void,
  getCurrentSection: () => number,
  getCurrentData: () => T
) {
  // Create debounced save for typing
  const debouncedSave = debounce(() => {
    const section = getCurrentSection();
    const data = getCurrentData();
    saveProgress(section, data);
  }, AUTO_SAVE_CONFIG.TYPING_DELAY);

  // Create throttled save for frequent updates
  const throttledSave = createThrottledAutoSave((data: T) => {
    const section = getCurrentSection();
    saveProgress(section, data);
  });

  return {
    // For text input changes (debounced)
    onFieldChange: () => {
      debouncedSave();
    },
    
    // For section changes (immediate)
    onSectionChange: () => {
      debouncedSave.flush(); // Save current section immediately
      const section = getCurrentSection();
      const data = getCurrentData();
      saveProgress(section, data);
    },
    
    // For file uploads (immediate)
    onFileUpload: () => {
      const section = getCurrentSection();
      const data = getCurrentData();
      saveProgress(section, data);
    },
    
    // For manual save (immediate)
    saveNow: () => {
      debouncedSave.flush();
      throttledSave.flush();
    },
    
    // Cleanup
    cleanup: () => {
      debouncedSave.cancel();
      throttledSave.cancel();
    }
  };
}

/**
 * Convert Date objects to ISO strings for storage
 */
export function serializeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const serialized = { ...data };
  
  // Convert Date objects to ISO strings
  Object.keys(serialized).forEach(key => {
    if (serialized[key] instanceof Date) {
      serialized[key] = serialized[key].toISOString();
    }
    // Remove File objects (can't be serialized)
    else if (serialized[key] instanceof File) {
      delete serialized[key];
    }
  });
  
  return serialized;
}

/**
 * Convert ISO strings back to Date objects
 */
export function deserializeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const deserialized = { ...data };
  
  // Convert ISO strings back to Date objects for known date fields
  const dateFields = ['proposedDate'];
  
  dateFields.forEach(field => {
    if (deserialized[field] && typeof deserialized[field] === 'string') {
      try {
        deserialized[field] = new Date(deserialized[field]);
      } catch {
        // Invalid date string, remove field
        delete deserialized[field];
      }
    }
  });
  
  return deserialized;
}