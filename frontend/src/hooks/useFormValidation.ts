import { useState, useCallback, useRef, useEffect } from 'react';

export type ValidationRule = 
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom'
  | 'password'
  | 'confirmPassword'
  | 'phone'
  | 'url'
  | 'number'
  | 'positive'
  | 'date'
  | 'futureDate';

export interface ValidationConfig {
  rule: ValidationRule;
  value?: any;
  message?: string;
  customValidator?: (value: any, formData?: any) => boolean | string;
}

export interface FieldValidation {
  [fieldName: string]: ValidationConfig[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationState {
  errors: ValidationError[];
  isValid: boolean;
  isDirty: boolean;
  touched: { [fieldName: string]: boolean };
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  showErrorsImmediately?: boolean;
  debounceMs?: number;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialData: T,
  validationSchema: FieldValidation,
  options: UseFormValidationOptions = {}
) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    showErrorsImmediately = false,
    debounceMs = 300
  } = options;

  const [formData, setFormData] = useState<T>(initialData);
  const [validationState, setValidationState] = useState<FormValidationState>({
    errors: [],
    isValid: true,
    isDirty: false,
    touched: {}
  });

  const debounceTimeouts = useRef<{ [fieldName: string]: NodeJS.Timeout }>({});

  // Validation rules
  const validationRules = {
    required: (value: any): boolean => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },

    email: (value: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },

    minLength: (value: string, min: number): boolean => {
      return value.length >= min;
    },

    maxLength: (value: string, max: number): boolean => {
      return value.length <= max;
    },

    pattern: (value: string, pattern: string | RegExp): boolean => {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      return regex.test(value);
    },

    password: (value: string): boolean => {
      // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(value);
    },

    confirmPassword: (value: string, formData: any, fieldName: string): boolean => {
      const passwordField = fieldName.replace('Confirm', '');
      return value === formData[passwordField];
    },

    phone: (value: string): boolean => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    },

    url: (value: string): boolean => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },

    number: (value: any): boolean => {
      return !isNaN(Number(value)) && value !== '';
    },

    positive: (value: number): boolean => {
      return Number(value) > 0;
    },

    date: (value: string): boolean => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },

    futureDate: (value: string): boolean => {
      const date = new Date(value);
      const now = new Date();
      return date > now;
    }
  };

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any): ValidationError[] => {
    const fieldValidations = validationSchema[fieldName];
    if (!fieldValidations) return [];

    const errors: ValidationError[] = [];

    for (const validation of fieldValidations) {
      let isValid = true;
      let errorMessage = validation.message || `Invalid ${fieldName}`;

      switch (validation.rule) {
        case 'required':
          isValid = validationRules.required(value);
          errorMessage = validation.message || `${fieldName} is required`;
          break;

        case 'email':
          isValid = validationRules.email(value);
          errorMessage = validation.message || 'Invalid email format';
          break;

        case 'minLength':
          isValid = validationRules.minLength(value, validation.value);
          errorMessage = validation.message || `${fieldName} must be at least ${validation.value} characters`;
          break;

        case 'maxLength':
          isValid = validationRules.maxLength(value, validation.value);
          errorMessage = validation.message || `${fieldName} must be no more than ${validation.value} characters`;
          break;

        case 'pattern':
          isValid = validationRules.pattern(value, validation.value);
          errorMessage = validation.message || `Invalid ${fieldName} format`;
          break;

        case 'password':
          isValid = validationRules.password(value);
          errorMessage = validation.message || 'Password must be at least 8 characters with uppercase, lowercase, and number';
          break;

        case 'confirmPassword':
          isValid = validationRules.confirmPassword(value, formData, fieldName);
          errorMessage = validation.message || 'Passwords do not match';
          break;

        case 'phone':
          isValid = validationRules.phone(value);
          errorMessage = validation.message || 'Invalid phone number format';
          break;

        case 'url':
          isValid = validationRules.url(value);
          errorMessage = validation.message || 'Invalid URL format';
          break;

        case 'number':
          isValid = validationRules.number(value);
          errorMessage = validation.message || `${fieldName} must be a number`;
          break;

        case 'positive':
          isValid = validationRules.positive(value);
          errorMessage = validation.message || `${fieldName} must be positive`;
          break;

        case 'date':
          isValid = validationRules.date(value);
          errorMessage = validation.message || 'Invalid date format';
          break;

        case 'futureDate':
          isValid = validationRules.futureDate(value);
          errorMessage = validation.message || 'Date must be in the future';
          break;

        case 'custom':
          if (validation.customValidator) {
            const result = validation.customValidator(value, formData);
            if (typeof result === 'string') {
              isValid = false;
              errorMessage = result;
            } else {
              isValid = result;
            }
          }
          break;
      }

      if (!isValid) {
        errors.push({ field: fieldName, message: errorMessage });
      }
    }

    return errors;
  }, [validationSchema, formData]);

  // Validate all fields
  const validateForm = useCallback((): ValidationError[] => {
    const allErrors: ValidationError[] = [];

    Object.keys(validationSchema).forEach(fieldName => {
      const fieldErrors = validateField(fieldName, formData[fieldName]);
      allErrors.push(...fieldErrors);
    });

    return allErrors;
  }, [validationSchema, validateField, formData]);

  // Update validation state
  const updateValidationState = useCallback((errors: ValidationError[], touched?: { [fieldName: string]: boolean }) => {
    setValidationState(prev => ({
      ...prev,
      errors,
      isValid: errors.length === 0,
      touched: touched || prev.touched
    }));
  }, []);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    // Mark as dirty
    setValidationState(prev => ({ ...prev, isDirty: true }));

    // Clear existing debounce timeout
    if (debounceTimeouts.current[fieldName]) {
      clearTimeout(debounceTimeouts.current[fieldName]);
    }

    // Debounced validation
    if (validateOnChange) {
      debounceTimeouts.current[fieldName] = setTimeout(() => {
        const fieldErrors = validateField(fieldName, value);
        const currentErrors = validationState.errors.filter(error => error.field !== fieldName);
        const newErrors = [...currentErrors, ...fieldErrors];
        
        updateValidationState(newErrors);
      }, debounceMs);
    }
  }, [validateOnChange, validateField, debounceMs, validationState.errors, updateValidationState]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setValidationState(prev => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: true }
    }));

    if (validateOnBlur) {
      const fieldErrors = validateField(fieldName, formData[fieldName]);
      const currentErrors = validationState.errors.filter(error => error.field !== fieldName);
      const newErrors = [...currentErrors, ...fieldErrors];
      
      updateValidationState(newErrors);
    }
  }, [validateOnBlur, validateField, formData, validationState.errors, updateValidationState]);

  // Handle form submission
  const handleSubmit = useCallback((onSubmit: (data: T) => void | Promise<void>) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (validateOnSubmit) {
        const errors = validateForm();
        updateValidationState(errors);

        if (errors.length > 0) {
          return false;
        }
      }

      try {
        await onSubmit(formData);
        return true;
      } catch (error) {
        console.error('Form submission error:', error);
        return false;
      }
    };
  }, [validateOnSubmit, validateForm, updateValidationState, formData]);

  // Reset form
  const resetForm = useCallback((newData?: T) => {
    const data = newData || initialData;
    setFormData(data);
    setValidationState({
      errors: [],
      isValid: true,
      isDirty: false,
      touched: {}
    });

    // Clear debounce timeouts
    Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
    debounceTimeouts.current = {};
  }, [initialData]);

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | null => {
    const error = validationState.errors.find(error => error.field === fieldName);
    return error ? error.message : null;
  }, [validationState.errors]);

  // Check if field is valid
  const isFieldValid = useCallback((fieldName: string): boolean => {
    return !validationState.errors.some(error => error.field === fieldName);
  }, [validationState.errors]);

  // Check if field has been touched
  const isFieldTouched = useCallback((fieldName: string): boolean => {
    return validationState.touched[fieldName] || false;
  }, [validationState.touched]);

  // Should show field error
  const shouldShowFieldError = useCallback((fieldName: string): boolean => {
    if (showErrorsImmediately) return true;
    return isFieldTouched(fieldName) || validationState.isDirty;
  }, [showErrorsImmediately, isFieldTouched, validationState.isDirty]);

  // Set field value
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    handleFieldChange(fieldName, value);
  }, [handleFieldChange]);

  // Set multiple field values
  const setFieldValues = useCallback((values: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...values }));
    setValidationState(prev => ({ ...prev, isDirty: true }));
  }, []);

  // Clear field errors
  const clearFieldErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      const newErrors = validationState.errors.filter(error => error.field !== fieldName);
      updateValidationState(newErrors);
    } else {
      updateValidationState([]);
    }
  }, [validationState.errors, updateValidationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return {
    formData,
    validationState,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    getFieldError,
    isFieldValid,
    isFieldTouched,
    shouldShowFieldError,
    setFieldValue,
    setFieldValues,
    clearFieldErrors,
    validateField,
    validateForm
  };
};

// Predefined validation schemas
export const commonValidations = {
  email: [
    { rule: 'required' as const, message: 'Email is required' },
    { rule: 'email' as const, message: 'Invalid email format' }
  ],
  
  password: [
    { rule: 'required' as const, message: 'Password is required' },
    { rule: 'minLength' as const, value: 8, message: 'Password must be at least 8 characters' },
    { rule: 'password' as const, message: 'Password must contain uppercase, lowercase, and number' }
  ],
  
  confirmPassword: [
    { rule: 'required' as const, message: 'Please confirm your password' },
    { rule: 'confirmPassword' as const, message: 'Passwords do not match' }
  ],
  
  phone: [
    { rule: 'phone' as const, message: 'Invalid phone number format' }
  ],
  
  required: (fieldName: string) => [
    { rule: 'required' as const, message: `${fieldName} is required` }
  ],
  
  minLength: (fieldName: string, min: number) => [
    { rule: 'minLength' as const, value: min, message: `${fieldName} must be at least ${min} characters` }
  ],
  
  maxLength: (fieldName: string, max: number) => [
    { rule: 'maxLength' as const, value: max, message: `${fieldName} must be no more than ${max} characters` }
  ]
}; 