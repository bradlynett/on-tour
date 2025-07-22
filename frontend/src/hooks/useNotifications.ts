import { useState, useCallback, useRef, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

export interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseNotificationsOptions {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    maxNotifications = 5,
    defaultDuration = 5000,
    position = 'top-right'
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add notification
  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const {
      duration = defaultDuration,
      persistent = false,
      action
    } = options;

    const id = generateId();
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: persistent ? undefined : duration,
      persistent,
      action,
      timestamp: new Date()
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      
      // Limit number of notifications
      if (newNotifications.length > maxNotifications) {
        newNotifications.splice(maxNotifications);
      }
      
      return newNotifications;
    });

    // Set auto-dismiss timeout
    if (!persistent && duration > 0) {
      timeouts.current[id] = setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [defaultDuration, maxNotifications, generateId]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // Clear timeout
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    Object.values(timeouts.current).forEach(timeout => clearTimeout(timeout));
    timeouts.current = {};
  }, []);

  // Clear notifications by type
  const clearByType = useCallback((type: NotificationType) => {
    setNotifications(prev => {
      const filtered = prev.filter(notification => notification.type !== type);
      
      // Clear timeouts for removed notifications
      prev.forEach(notification => {
        if (notification.type === type && timeouts.current[notification.id]) {
          clearTimeout(timeouts.current[notification.id]);
          delete timeouts.current[notification.id];
        }
      });
      
      return filtered;
    });
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((title: string, message: string, options?: NotificationOptions) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const error = useCallback((title: string, message: string, options?: NotificationOptions) => {
    return addNotification('error', title, message, options);
  }, [addNotification]);

  const warning = useCallback((title: string, message: string, options?: NotificationOptions) => {
    return addNotification('warning', title, message, options);
  }, [addNotification]);

  const info = useCallback((title: string, message: string, options?: NotificationOptions) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  // API error handler
  const handleApiError = useCallback((error: any, title = 'API Error') => {
    const message = error?.response?.data?.message || error?.message || 'An unexpected error occurred';
    return addNotification('error', title, message, { persistent: true });
  }, [addNotification]);

  // Success handler for common operations
  const handleSuccess = useCallback((operation: string, details?: string) => {
    const message = details || `${operation} completed successfully`;
    return addNotification('success', 'Success', message);
  }, [addNotification]);

  // Loading completion handler
  const handleLoadingComplete = useCallback((operation: string, success: boolean, error?: string) => {
    if (success) {
      handleSuccess(operation);
    } else if (error) {
      addNotification('error', `${operation} Failed`, error);
    }
  }, [handleSuccess, addNotification]);

  // Get notifications by type
  const getByType = useCallback((type: NotificationType) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Get notification count by type
  const getCountByType = useCallback((type: NotificationType) => {
    return notifications.filter(notification => notification.type === type).length;
  }, [notifications]);

  // Check if there are any notifications
  const hasNotifications = useCallback(() => {
    return notifications.length > 0;
  }, [notifications]);

  // Check if there are any errors
  const hasErrors = useCallback(() => {
    return notifications.some(notification => notification.type === 'error');
  }, [notifications]);

  // Update notification
  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id ? { ...notification, ...updates } : notification
    ));
  }, []);

  // Pause auto-dismiss for a notification
  const pauseNotification = useCallback((id: string) => {
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  // Resume auto-dismiss for a notification
  const resumeNotification = useCallback((id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.persistent && notification.duration) {
      timeouts.current[id] = setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  }, [notifications, removeNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return {
    notifications,
    position,
    addNotification,
    removeNotification,
    clearAll,
    clearByType,
    success,
    error,
    warning,
    info,
    handleApiError,
    handleSuccess,
    handleLoadingComplete,
    getByType,
    getCountByType,
    hasNotifications,
    hasErrors,
    updateNotification,
    pauseNotification,
    resumeNotification
  };
};

// Specialized notification hooks
export const useToastNotifications = () => {
  return useNotifications({
    maxNotifications: 3,
    defaultDuration: 3000,
    position: 'top-right'
  });
};

export const useBannerNotifications = () => {
  return useNotifications({
    maxNotifications: 2,
    defaultDuration: 8000,
    position: 'top-center'
  });
};

export const useErrorNotifications = () => {
  const notifications = useNotifications({
    maxNotifications: 3,
    defaultDuration: 0, // Persistent by default
    position: 'top-right'
  });

  return {
    ...notifications,
    showError: notifications.error,
    clearErrors: () => notifications.clearByType('error'),
    hasErrors: notifications.hasErrors
  };
}; 