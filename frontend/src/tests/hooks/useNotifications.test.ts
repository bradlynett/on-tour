import { renderHook, act } from '@testing-library/react';
import { useNotifications, useToastNotifications, useBannerNotifications, useErrorNotifications } from '../../hooks/useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.hasNotifications()).toBe(false);
    expect(result.current.hasErrors()).toBe(false);
  });

  it('should add a notification', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Operation completed');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual({
      id: expect.any(String),
      type: 'success',
      title: 'Success',
      message: 'Operation completed',
      duration: 5000,
      persistent: false,
      timestamp: expect.any(Date)
    });
  });

  it('should add different notification types', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.success('Success', 'Operation completed');
      result.current.error('Error', 'Something went wrong');
      result.current.warning('Warning', 'Please check your input');
      result.current.info('Info', 'Here is some information');
    });

    expect(result.current.notifications).toHaveLength(4);
    expect(result.current.notifications.map(n => n.type)).toEqual(['success', 'error', 'warning', 'info']);
  });

  it('should auto-dismiss notifications after duration', () => {
    const { result } = renderHook(() => useNotifications({ defaultDuration: 2000 }));

    act(() => {
      result.current.addNotification('success', 'Success', 'Test message');
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should not auto-dismiss persistent notifications', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('error', 'Error', 'Critical error', { persistent: true });
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('should remove notification by id', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test 1');
      result.current.addNotification('error', 'Error', 'Test 2');
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear notifications by type', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test 1');
      result.current.addNotification('error', 'Error', 'Test 2');
      result.current.addNotification('success', 'Success 2', 'Test 3');
      result.current.clearByType('success');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
  });

  it('should handle API errors correctly', () => {
    const { result } = renderHook(() => useNotifications());

    const mockError = {
      response: {
        data: { message: 'API Error Message' },
        status: 400
      }
    };

    act(() => {
      result.current.handleApiError(mockError, 'API Error');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual({
      id: expect.any(String),
      type: 'error',
      title: 'API Error',
      message: 'API Error Message',
      persistent: true,
      timestamp: expect.any(Date)
    });
  });

  it('should handle success operations', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.handleSuccess('User Registration', 'Account created successfully');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual({
      id: expect.any(String),
      type: 'success',
      title: 'Success',
      message: 'User Registration completed successfully',
      timestamp: expect.any(Date)
    });
  });

  it('should handle loading completion', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.handleLoadingComplete('Trip Generation', true);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('success');

    act(() => {
      result.current.clearAll();
      result.current.handleLoadingComplete('Trip Generation', false, 'Failed to generate trip');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
  });

  it('should get notifications by type', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test 1');
      result.current.addNotification('error', 'Error', 'Test 2');
      result.current.addNotification('success', 'Success 2', 'Test 3');
    });

    const successNotifications = result.current.getByType('success');
    expect(successNotifications).toHaveLength(2);
    expect(successNotifications.every(n => n.type === 'success')).toBe(true);
  });

  it('should get notification count by type', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test 1');
      result.current.addNotification('error', 'Error', 'Test 2');
      result.current.addNotification('success', 'Success 2', 'Test 3');
    });

    expect(result.current.getCountByType('success')).toBe(2);
    expect(result.current.getCountByType('error')).toBe(1);
    expect(result.current.getCountByType('warning')).toBe(0);
  });

  it('should check for notifications and errors', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.hasNotifications()).toBe(false);
    expect(result.current.hasErrors()).toBe(false);

    act(() => {
      result.current.addNotification('success', 'Success', 'Test');
    });

    expect(result.current.hasNotifications()).toBe(true);
    expect(result.current.hasErrors()).toBe(false);

    act(() => {
      result.current.addNotification('error', 'Error', 'Test error');
    });

    expect(result.current.hasNotifications()).toBe(true);
    expect(result.current.hasErrors()).toBe(true);
  });

  it('should update notification', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification('info', 'Info', 'Original message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.updateNotification(notificationId, { message: 'Updated message' });
    });

    expect(result.current.notifications[0].message).toBe('Updated message');
  });

  it('should pause and resume notification auto-dismiss', () => {
    const { result } = renderHook(() => useNotifications({ defaultDuration: 2000 }));

    act(() => {
      result.current.addNotification('info', 'Info', 'Test message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.pauseNotification(notificationId);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.resumeNotification(notificationId);
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should handle notification actions', () => {
    const { result } = renderHook(() => useNotifications());
    const mockAction = jest.fn();

    act(() => {
      result.current.addNotification('info', 'Info', 'Test message', {
        action: { label: 'Retry', onClick: mockAction }
      });
    });

    expect(result.current.notifications[0].action).toEqual({
      label: 'Retry',
      onClick: mockAction
    });
  });

  it('should limit maximum notifications', () => {
    const { result } = renderHook(() => useNotifications({ maxNotifications: 2 }));

    act(() => {
      result.current.addNotification('info', 'Info 1', 'Test 1');
      result.current.addNotification('info', 'Info 2', 'Test 2');
      result.current.addNotification('info', 'Info 3', 'Test 3');
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].title).toBe('Info 3');
    expect(result.current.notifications[1].title).toBe('Info 2');
  });
});

describe('useToastNotifications', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useToastNotifications());

    act(() => {
      result.current.addNotification('success', 'Success', 'Test message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].duration).toBe(3000);
  });
});

describe('useBannerNotifications', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useBannerNotifications());

    act(() => {
      result.current.addNotification('warning', 'Warning', 'Test message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].duration).toBe(8000);
  });
});

describe('useErrorNotifications', () => {
  it('should have correct default configuration', () => {
    const { result } = renderHook(() => useErrorNotifications());

    act(() => {
      result.current.showError('Error', 'Test error message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].persistent).toBe(true);
    expect(result.current.hasErrors()).toBe(true);
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorNotifications());

    act(() => {
      result.current.showError('Error 1', 'Test 1');
      result.current.addNotification('success', 'Success', 'Test success');
      result.current.showError('Error 2', 'Test 2');
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.hasErrors()).toBe(false);
  });
}); 