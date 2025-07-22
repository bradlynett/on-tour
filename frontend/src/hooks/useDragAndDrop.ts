import { useState, useCallback } from 'react';
import api from '../config/api';

interface DraggableItem {
  id: number;
  priority: number;
  [key: string]: any;
}

interface UseDragAndDropOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  enableOptimisticUpdates?: boolean;
}

export const useDragAndDrop = <T extends DraggableItem>(
  items: T[],
  options: UseDragAndDropOptions = {}
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [originalItems, setOriginalItems] = useState<T[]>(items);

  const {
    onSuccess,
    onError,
    enableOptimisticUpdates = true
  } = options;

  // Update original items when items prop changes
  if (JSON.stringify(originalItems) !== JSON.stringify(items)) {
    setOriginalItems([...items]);
  }

  const handleDragStart = useCallback((draggedId: number) => {
    setIsDragging(true);
    setDragError(null);
    console.log('Drag started for item:', draggedId);
  }, []);

  const handleDragEnd = useCallback(async (draggedId: number, dropIndex: number) => {
    setIsDragging(false);
    
    // Reorder items
    const reorderedItems = Array.from(items);
    const draggedItem = reorderedItems.find(item => item.id === draggedId);
    
    if (!draggedItem) {
      setDragError('Dragged item not found');
      return;
    }

    const currentIndex = reorderedItems.findIndex(item => item.id === draggedId);
    reorderedItems.splice(currentIndex, 1);
    
    // Clamp drop index to valid range
    const clampedDropIndex = Math.max(0, Math.min(dropIndex, reorderedItems.length));
    reorderedItems.splice(clampedDropIndex, 0, draggedItem);
    
    // Update priorities
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      priority: index + 1
    }));

    // Prepare bulk updates for API
    const bulkUpdates = updatedItems.map(item => ({
      id: item.id,
      priority: item.priority
    }));

    // Optimistic update
    if (enableOptimisticUpdates) {
      // This will be handled by the parent component
      return {
        updatedItems,
        bulkUpdates,
        success: true
      };
    }

    // Non-optimistic update
    return api.put('/users/interests/bulk-priority', { updates: bulkUpdates })
      .then(response => {
        if (response.data.success) {
          console.log('Bulk update successful:', response.data.data);
          onSuccess?.(response.data.data);
          return {
            updatedItems,
            bulkUpdates,
            success: true
          };
        } else {
          throw new Error(response.data.message);
        }
      })
      .catch(error => {
        console.error('Bulk update failed:', error);
        setDragError(error.message);
        onError?.(error);
        return {
          updatedItems: originalItems,
          bulkUpdates: [],
          success: false,
          error
        };
      });
  }, [items, originalItems, enableOptimisticUpdates, onSuccess, onError]);

  const handleDrop = useCallback(async (draggedId: number, dropIndex: number) => {
    try {
      const result = await handleDragEnd(draggedId, dropIndex);
      return result;
    } catch (error: any) {
      console.error('Drop operation failed:', error);
      setDragError(error.message || 'Unknown error occurred');
      onError?.(error);
      return {
        updatedItems: originalItems,
        bulkUpdates: [],
        success: false,
        error
      };
    }
  }, [handleDragEnd, originalItems, onError]);

  const resetError = useCallback(() => {
    setDragError(null);
  }, []);

  return {
    isDragging,
    dragError,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    resetError
  };
};

// Utility function to calculate drop index from mouse position
export const calculateDropIndex = (
  mouseY: number,
  containerTop: number,
  itemHeight: number = 60
): number => {
  return Math.floor((mouseY - containerTop) / itemHeight);
};

// Utility function to validate drag-and-drop operation
export const validateDragOperation = (
  draggedId: number,
  dropIndex: number,
  items: DraggableItem[]
): { isValid: boolean; error?: string } => {
  if (!draggedId || draggedId <= 0) {
    return { isValid: false, error: 'Invalid dragged item ID' };
  }

  if (dropIndex < 0 || dropIndex > items.length) {
    return { isValid: false, error: 'Invalid drop position' };
  }

  const draggedItem = items.find(item => item.id === draggedId);
  if (!draggedItem) {
    return { isValid: false, error: 'Dragged item not found' };
  }

  return { isValid: true };
}; 