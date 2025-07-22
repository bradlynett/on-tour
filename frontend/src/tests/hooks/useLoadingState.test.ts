import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useApiLoading, useFormLoading, useFileUploadLoading, useTripGenerationLoading } from '../../hooks/useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with empty loading states', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.loadingStates).toEqual({});
    expect(result.current.isAnyLoading()).toBe(false);
    expect(result.current.getLoadingOperations()).toEqual([]);
    expect(result.current.getErrorOperations()).toEqual([]);
  });

  it('should start and stop loading for an operation', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading('test-operation');
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: true,
      error: null,
      success: false
    });
    expect(result.current.isAnyLoading()).toBe(true);

    act(() => {
      result.current.stopLoading('test-operation');
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: false,
      error: null,
      success: true,
      startTime: expect.any(Number),
      duration: expect.any(Number)
    });
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setError('test-operation', 'Something went wrong');
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: false,
      error: 'Something went wrong',
      success: false,
      startTime: undefined,
      duration: undefined
    });
  });

  it('should track progress when enabled', () => {
    const { result } = renderHook(() => useLoadingState({ trackProgress: true }));

    act(() => {
      result.current.startLoading('test-operation');
      result.current.updateProgress('test-operation', 50);
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: true,
      error: null,
      success: false,
      progress: 50
    });
  });

  it('should auto-reset loading states after delay', () => {
    const { result } = renderHook(() => useLoadingState({ autoReset: true, resetDelay: 1000 }));

    act(() => {
      result.current.startLoading('test-operation');
      result.current.stopLoading('test-operation');
    });

    expect(result.current.getLoadingState('test-operation').isLoading).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.loadingStates).toEqual({});
  });

  it('should not auto-reset when disabled', () => {
    const { result } = renderHook(() => useLoadingState({ autoReset: false }));

    act(() => {
      result.current.startLoading('test-operation');
      result.current.stopLoading('test-operation');
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.getLoadingState('test-operation').isLoading).toBe(false);
    expect(result.current.loadingStates).not.toEqual({});
  });

  it('should reset specific operations', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading('operation1');
      result.current.startLoading('operation2');
      result.current.resetOperation('operation1');
    });

    expect(result.current.getLoadingState('operation1')).toEqual({
      isLoading: false,
      error: null,
      success: false
    });
    expect(result.current.getLoadingState('operation2').isLoading).toBe(true);
  });

  it('should reset all operations', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading('operation1');
      result.current.startLoading('operation2');
      result.current.resetAll();
    });

    expect(result.current.loadingStates).toEqual({});
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('should handle withLoading wrapper correctly', async () => {
    const { result } = renderHook(() => useLoadingState());

    const mockAsyncFn = jest.fn().mockResolvedValue('success');

    await act(async () => {
      const testResult = await result.current.withLoading('test-operation', mockAsyncFn);
      expect(testResult).toBe('success');
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: false,
      error: null,
      success: true,
      startTime: expect.any(Number),
      duration: expect.any(Number)
    });
  });

  it('should handle withLoading errors correctly', async () => {
    const { result } = renderHook(() => useLoadingState());

    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      try {
        await result.current.withLoading('test-operation', mockAsyncFn);
      } catch (error: any) {
        expect(error.message).toBe('Test error');
      }
    });

    expect(result.current.getLoadingState('test-operation')).toEqual({
      isLoading: false,
      error: 'Test error',
      success: false,
      startTime: expect.any(Number),
      duration: expect.any(Number)
    });
  });

  it('should handle progress updates in withLoading', async () => {
    const { result } = renderHook(() => useLoadingState({ trackProgress: true }));

    const mockAsyncFn = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'success';
    });

    const onProgress = jest.fn();

    act(() => {
      result.current.withLoading('test-operation', mockAsyncFn, onProgress);
    });

    // Wait for progress updates
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onProgress).toHaveBeenCalled();
    expect(result.current.getLoadingState('test-operation').progress).toBeGreaterThan(0);
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useLoadingState({ onError }));

    act(() => {
      result.current.setError('test-operation', 'Test error');
    });

    expect(onError).toHaveBeenCalledWith('Test error');
  });

  it('should call onSuccess callback when operation succeeds', () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useLoadingState({ onSuccess }));

    act(() => {
      result.current.startLoading('test-operation');
      result.current.stopLoading('test-operation');
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});

describe('useApiLoading', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useApiLoading());

    act(() => {
      result.current.startLoading('test');
      result.current.stopLoading('test');
    });

    // Should auto-reset after 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.loadingStates).toEqual({});
  });
});

describe('useFormLoading', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useFormLoading());

    act(() => {
      result.current.startLoading('test');
      result.current.stopLoading('test');
    });

    // Should not auto-reset
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.loadingStates).not.toEqual({});
  });
});

describe('useFileUploadLoading', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useFileUploadLoading());

    expect(result.current.loadingStates).toEqual({});
  });
});

describe('useTripGenerationLoading', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useTripGenerationLoading());

    expect(result.current.loadingStates).toEqual({});
  });
}); 