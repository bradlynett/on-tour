import { renderHook, act } from '@testing-library/react';
import { useFormValidation, commonValidations } from '../../hooks/useFormValidation';

describe('useFormValidation', () => {
  const mockValidationSchema = {
    email: commonValidations.email,
    password: commonValidations.password,
    confirmPassword: commonValidations.confirmPassword,
    name: commonValidations.required('Name'),
    phone: commonValidations.phone,
    age: [
      { rule: 'number' as const, message: 'Age must be a number' },
      { rule: 'positive' as const, message: 'Age must be positive' }
    ],
    website: [
      { rule: 'url' as const, message: 'Invalid URL format' }
    ],
    futureDate: [
      { rule: 'futureDate' as const, message: 'Date must be in the future' }
    ]
  };

  const initialData = {
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    age: '',
    website: '',
    futureDate: ''
  };

  it('should initialize with empty form data and validation state', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    expect(result.current.formData).toEqual(initialData);
    expect(result.current.validationState.errors).toEqual([]);
    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.isDirty).toBe(false);
    expect(result.current.validationState.touched).toEqual({});
  });

  it('should handle field changes', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('name', 'John Doe');
    });

    expect(result.current.formData.name).toBe('John Doe');
    expect(result.current.validationState.isDirty).toBe(true);
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('name', '');
      result.current.handleFieldBlur('name');
    });

    expect(result.current.getFieldError('name')).toBe('Name is required');
    expect(result.current.isFieldValid('name')).toBe(false);
  });

  it('should validate email format', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
      result.current.handleFieldBlur('email');
    });

    expect(result.current.getFieldError('email')).toBe('Invalid email format');
    expect(result.current.isFieldValid('email')).toBe(false);

    act(() => {
      result.current.handleFieldChange('email', 'valid@email.com');
      result.current.handleFieldBlur('email');
    });

    expect(result.current.getFieldError('email')).toBeNull();
    expect(result.current.isFieldValid('email')).toBe(true);
  });

  it('should validate password requirements', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('password', 'weak');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.getFieldError('password')).toBe('Password must be at least 8 characters with uppercase, lowercase, and number');
    expect(result.current.isFieldValid('password')).toBe(false);

    act(() => {
      result.current.handleFieldChange('password', 'StrongPass123');
      result.current.handleFieldBlur('password');
    });

    expect(result.current.getFieldError('password')).toBeNull();
    expect(result.current.isFieldValid('password')).toBe(true);
  });

  it('should validate password confirmation', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('password', 'StrongPass123');
      result.current.handleFieldChange('confirmPassword', 'DifferentPass123');
      result.current.handleFieldBlur('confirmPassword');
    });

    expect(result.current.getFieldError('confirmPassword')).toBe('Passwords do not match');
    expect(result.current.isFieldValid('confirmPassword')).toBe(false);

    act(() => {
      result.current.handleFieldChange('confirmPassword', 'StrongPass123');
      result.current.handleFieldBlur('confirmPassword');
    });

    expect(result.current.getFieldError('confirmPassword')).toBeNull();
    expect(result.current.isFieldValid('confirmPassword')).toBe(true);
  });

  it('should validate phone number format', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('phone', 'invalid-phone');
      result.current.handleFieldBlur('phone');
    });

    expect(result.current.getFieldError('phone')).toBe('Invalid phone number format');
    expect(result.current.isFieldValid('phone')).toBe(false);

    act(() => {
      result.current.handleFieldChange('phone', '+1234567890');
      result.current.handleFieldBlur('phone');
    });

    expect(result.current.getFieldError('phone')).toBeNull();
    expect(result.current.isFieldValid('phone')).toBe(true);
  });

  it('should validate number fields', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('age', 'not-a-number');
      result.current.handleFieldBlur('age');
    });

    expect(result.current.getFieldError('age')).toBe('Age must be a number');
    expect(result.current.isFieldValid('age')).toBe(false);

    act(() => {
      result.current.handleFieldChange('age', '25');
      result.current.handleFieldBlur('age');
    });

    expect(result.current.getFieldError('age')).toBeNull();
    expect(result.current.isFieldValid('age')).toBe(true);
  });

  it('should validate positive numbers', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('age', '-5');
      result.current.handleFieldBlur('age');
    });

    expect(result.current.getFieldError('age')).toBe('Age must be positive');
    expect(result.current.isFieldValid('age')).toBe(false);

    act(() => {
      result.current.handleFieldChange('age', '25');
      result.current.handleFieldBlur('age');
    });

    expect(result.current.getFieldError('age')).toBeNull();
    expect(result.current.isFieldValid('age')).toBe(true);
  });

  it('should validate URL format', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('website', 'not-a-url');
      result.current.handleFieldBlur('website');
    });

    expect(result.current.getFieldError('website')).toBe('Invalid URL format');
    expect(result.current.isFieldValid('website')).toBe(false);

    act(() => {
      result.current.handleFieldChange('website', 'https://example.com');
      result.current.handleFieldBlur('website');
    });

    expect(result.current.getFieldError('website')).toBeNull();
    expect(result.current.isFieldValid('website')).toBe(true);
  });

  it('should validate future dates', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    act(() => {
      result.current.handleFieldChange('futureDate', pastDate.toISOString().split('T')[0]);
      result.current.handleFieldBlur('futureDate');
    });

    expect(result.current.getFieldError('futureDate')).toBe('Date must be in the future');
    expect(result.current.isFieldValid('futureDate')).toBe(false);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    act(() => {
      result.current.handleFieldChange('futureDate', futureDate.toISOString().split('T')[0]);
      result.current.handleFieldBlur('futureDate');
    });

    expect(result.current.getFieldError('futureDate')).toBeNull();
    expect(result.current.isFieldValid('futureDate')).toBe(true);
  });

  it('should validate form on submission', async () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));
    const mockOnSubmit = jest.fn();

    act(() => {
      result.current.handleFieldChange('name', '');
      result.current.handleFieldChange('email', 'invalid-email');
    });

    const submitHandler = result.current.handleSubmit(mockOnSubmit);
    await act(async () => {
      await submitHandler();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(result.current.validationState.errors).toHaveLength(2);
    expect(result.current.validationState.isValid).toBe(false);
  });

  it('should submit form when valid', async () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));
    const mockOnSubmit = jest.fn();

    act(() => {
      result.current.handleFieldChange('name', 'John Doe');
      result.current.handleFieldChange('email', 'john@example.com');
      result.current.handleFieldChange('password', 'StrongPass123');
      result.current.handleFieldChange('confirmPassword', 'StrongPass123');
    });

    const submitHandler = result.current.handleSubmit(mockOnSubmit);
    await act(async () => {
      await submitHandler();
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      ...initialData,
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123'
    });
    expect(result.current.validationState.isValid).toBe(true);
  });

  it('should reset form', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('name', 'John Doe');
      result.current.handleFieldBlur('name');
    });

    expect(result.current.formData.name).toBe('John Doe');
    expect(result.current.validationState.isDirty).toBe(true);
    expect(result.current.validationState.touched.name).toBe(true);

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData).toEqual(initialData);
    expect(result.current.validationState.errors).toEqual([]);
    expect(result.current.validationState.isDirty).toBe(false);
    expect(result.current.validationState.touched).toEqual({});
  });

  it('should reset form with new data', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));
    const newData = { ...initialData, name: 'Jane Doe', email: 'jane@example.com' };

    act(() => {
      result.current.resetForm(newData);
    });

    expect(result.current.formData).toEqual(newData);
  });

  it('should clear field errors', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('name', '');
      result.current.handleFieldBlur('name');
    });

    expect(result.current.getFieldError('name')).toBe('Name is required');

    act(() => {
      result.current.clearFieldErrors('name');
    });

    expect(result.current.getFieldError('name')).toBeNull();
    expect(result.current.validationState.errors).toHaveLength(0);
  });

  it('should clear all field errors', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.handleFieldChange('name', '');
      result.current.handleFieldChange('email', 'invalid');
      result.current.handleFieldBlur('name');
      result.current.handleFieldBlur('email');
    });

    expect(result.current.validationState.errors).toHaveLength(2);

    act(() => {
      result.current.clearFieldErrors();
    });

    expect(result.current.validationState.errors).toHaveLength(0);
  });

  it('should set field values', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.setFieldValue('name', 'John Doe');
    });

    expect(result.current.formData.name).toBe('John Doe');
    expect(result.current.validationState.isDirty).toBe(true);
  });

  it('should set multiple field values', () => {
    const { result } = renderHook(() => useFormValidation(initialData, mockValidationSchema));

    act(() => {
      result.current.setFieldValues({ name: 'John Doe', email: 'john@example.com' });
    });

    expect(result.current.formData.name).toBe('John Doe');
    expect(result.current.formData.email).toBe('john@example.com');
    expect(result.current.validationState.isDirty).toBe(true);
  });

  it('should show field errors when showErrorsImmediately is true', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockValidationSchema, { showErrorsImmediately: true })
    );

    act(() => {
      result.current.handleFieldChange('name', '');
    });

    expect(result.current.shouldShowFieldError('name')).toBe(true);
    expect(result.current.getFieldError('name')).toBe('Name is required');
  });

  it('should not show field errors until touched when showErrorsImmediately is false', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockValidationSchema, { showErrorsImmediately: false })
    );

    act(() => {
      result.current.handleFieldChange('name', '');
    });

    expect(result.current.shouldShowFieldError('name')).toBe(false);
    expect(result.current.getFieldError('name')).toBe('Name is required');

    act(() => {
      result.current.handleFieldBlur('name');
    });

    expect(result.current.shouldShowFieldError('name')).toBe(true);
  });

  it('should debounce validation on change', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => 
      useFormValidation(initialData, mockValidationSchema, { debounceMs: 300 })
    );

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    // Should not have error immediately
    expect(result.current.getFieldError('email')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should have error after debounce
    expect(result.current.getFieldError('email')).toBe('Invalid email format');

    jest.useRealTimers();
  });
});

describe('commonValidations', () => {
  it('should provide email validation', () => {
    expect(commonValidations.email).toEqual([
      { rule: 'required', message: 'Email is required' },
      { rule: 'email', message: 'Invalid email format' }
    ]);
  });

  it('should provide password validation', () => {
    expect(commonValidations.password).toEqual([
      { rule: 'required', message: 'Password is required' },
      { rule: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
      { rule: 'password', message: 'Password must contain uppercase, lowercase, and number' }
    ]);
  });

  it('should provide confirmPassword validation', () => {
    expect(commonValidations.confirmPassword).toEqual([
      { rule: 'required', message: 'Please confirm your password' },
      { rule: 'confirmPassword', message: 'Passwords do not match' }
    ]);
  });

  it('should provide phone validation', () => {
    expect(commonValidations.phone).toEqual([
      { rule: 'phone', message: 'Invalid phone number format' }
    ]);
  });

  it('should provide required validation with custom field name', () => {
    const requiredValidation = commonValidations.required('Custom Field');
    expect(requiredValidation).toEqual([
      { rule: 'required', message: 'Custom Field is required' }
    ]);
  });

  it('should provide minLength validation', () => {
    const minLengthValidation = commonValidations.minLength('Username', 3);
    expect(minLengthValidation).toEqual([
      { rule: 'minLength', value: 3, message: 'Username must be at least 3 characters' }
    ]);
  });

  it('should provide maxLength validation', () => {
    const maxLengthValidation = commonValidations.maxLength('Description', 500);
    expect(maxLengthValidation).toEqual([
      { rule: 'maxLength', value: 500, message: 'Description must be no more than 500 characters' }
    ]);
  });
}); 