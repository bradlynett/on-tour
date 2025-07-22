import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  progress?: number;
  startTime?: number;
  duration?: number;
}

export interface LoadingStateManager {
  [key: string]: LoadingState;
}

export interface UseLoadingStateOptions {
  autoReset?: boolean;
  resetDelay?: number;
  trackProgress?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const {
    autoReset = true,
    resetDelay = 3000,
    trackProgress = false,
    onError,
    onSuccess
  } = options;

  const [loadingStates, setLoadingStates] = useState<LoadingStateManager>({});
  const resetTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Set loading state for a specific operation
  const setLoading = useCallback((operation: string, isLoading: boolean, error?: string, progress?: number) => {
    setLoadingStates(prev => {
      const currentState = prev[operation] || {
        isLoading: false,
        error: null,
        success: false
      };

      const newState: LoadingState = {
        isLoading,
        error: error || null,
        success: !isLoading && !error,
        progress: trackProgress ? progress : undefined,
        startTime: isLoading ? Date.now() : currentState.startTime,
        duration: !isLoading ? (currentState.startTime ? Date.now() - currentState.startTime : undefined) : undefined
      };

      // Clear existing reset timeout
      if (resetTimeouts.current[operation]) {
        clearTimeout(resetTimeouts.current[operation]);
        delete resetTimeouts.current[operation];
      }

      // Set auto-reset timeout
      if (autoReset && !isLoading) {
        resetTimeouts.current[operation] = setTimeout(() => {
          setLoadingStates(prev => {
            const { [operation]: _, ...rest } = prev;
            return rest;
          });
          delete resetTimeouts.current[operation];
        }, resetDelay);
      }

      // Call callbacks
      if (error && onError) {
        onError(error);
      }
      if (newState.success && onSuccess) {
        onSuccess();
      }

      return {
        ...prev,
        [operation]: newState
      };
    });
  }, [autoReset, resetDelay, trackProgress, onError, onSuccess]);

  // Start loading for an operation
  const startLoading = useCallback((operation: string) => {
    setLoading(operation, true);
  }, [setLoading]);

  // Stop loading with success
  const stopLoading = useCallback((operation: string) => {
    setLoading(operation, false);
  }, [setLoading]);

  // Stop loading with error
  const setError = useCallback((operation: string, error: string) => {
    setLoading(operation, false, error);
  }, [setLoading]);

  // Update progress for an operation
  const updateProgress = useCallback((operation: string, progress: number) => {
    setLoadingStates(prev => {
      const currentState = prev[operation];
      if (!currentState || !currentState.isLoading) return prev;

      return {
        ...prev,
        [operation]: {
          ...currentState,
          progress: Math.min(100, Math.max(0, progress))
        }
      };
    });
  }, []);

  // Reset a specific operation
  const resetOperation = useCallback((operation: string) => {
    setLoadingStates(prev => {
      const { [operation]: _, ...rest } = prev;
      return rest;
    });

    if (resetTimeouts.current[operation]) {
      clearTimeout(resetTimeouts.current[operation]);
      delete resetTimeouts.current[operation];
    }
  }, []);

  // Reset all operations
  const resetAll = useCallback(() => {
    setLoadingStates({});
    Object.values(resetTimeouts.current).forEach(timeout => clearTimeout(timeout));
    resetTimeouts.current = {};
  }, []);

  // Get loading state for an operation
  const getLoadingState = useCallback((operation: string): LoadingState => {
    return loadingStates[operation] || {
      isLoading: false,
      error: null,
      success: false
    };
  }, [loadingStates]);

  // Check if any operation is loading
  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  // Get all loading operations
  const getLoadingOperations = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.isLoading)
      .map(([operation, state]) => ({ operation, ...state }));
  }, [loadingStates]);

  // Get all error operations
  const getErrorOperations = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.error)
      .map(([operation, state]) => ({ operation, ...state }));
  }, [loadingStates]);

  // Async wrapper for operations
  const withLoading = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>,
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    try {
      startLoading(operation);
      
      if (trackProgress && onProgress) {
        // Simulate progress updates for long-running operations
        const progressInterval = setInterval(() => {
          const currentState = loadingStates[operation];
          if (currentState && currentState.isLoading) {
            const currentProgress = currentState.progress || 0;
            const newProgress = Math.min(90, currentProgress + Math.random() * 10);
            updateProgress(operation, newProgress);
            onProgress(newProgress);
          }
        }, 500);

        try {
          const result = await asyncFn();
          clearInterval(progressInterval);
          updateProgress(operation, 100);
          stopLoading(operation);
          return result;
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      } else {
        const result = await asyncFn();
        stopLoading(operation);
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(operation, errorMessage);
      throw error;
    }
  }, [startLoading, stopLoading, setError, updateProgress, trackProgress, loadingStates]);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    setError,
    updateProgress,
    resetOperation,
    resetAll,
    getLoadingState,
    isAnyLoading,
    getLoadingOperations,
    getErrorOperations,
    withLoading
  };
};

// Specialized hooks for common operations
export const useApiLoading = () => {
  return useLoadingState({
    autoReset: true,
    resetDelay: 5000,
    onError: (error) => console.error('API Error:', error)
  });
};

export const useFormLoading = () => {
  return useLoadingState({
    autoReset: false,
    trackProgress: false
  });
};

export const useFileUploadLoading = () => {
  return useLoadingState({
    autoReset: true,
    resetDelay: 2000,
    trackProgress: true
  });
};

export const useTripGenerationLoading = () => {
  return useLoadingState({
    autoReset: false,
    trackProgress: true,
    onSuccess: () => console.log('Trip generation completed successfully')
  });
}; 