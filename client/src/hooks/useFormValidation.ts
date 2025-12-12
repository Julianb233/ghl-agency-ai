import { useState, useCallback } from 'react';

export interface ValidationRule<T = any> {
  required?: boolean | string;
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  validate?: (value: T) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface TouchedFields {
  [key: string]: boolean;
}

/**
 * useFormValidation - Custom hook for form validation
 *
 * Provides form validation logic with error tracking and field touch state.
 *
 * @example
 * const schema = {
 *   email: {
 *     required: 'Email is required',
 *     pattern: {
 *       value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
 *       message: 'Invalid email format'
 *     }
 *   },
 *   password: {
 *     required: 'Password is required',
 *     minLength: { value: 8, message: 'Password must be at least 8 characters' }
 *   }
 * };
 *
 * const { errors, touched, validate, validateField, setTouched, reset } =
 *   useFormValidation(schema);
 *
 * // Validate single field on blur
 * <Input onBlur={() => validateField('email', formData.email)} />
 *
 * // Validate all fields on submit
 * const handleSubmit = () => {
 *   if (validate(formData)) {
 *     // Submit form
 *   }
 * };
 */
export function useFormValidation(schema: ValidationSchema) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  /**
   * Validate a single field value against its rules
   */
  const validateField = useCallback(
    (fieldName: string, value: any): string | undefined => {
      const rules = schema[fieldName];
      if (!rules) return undefined;

      // Required check
      if (rules.required) {
        if (value === undefined || value === null || value === '') {
          const message = typeof rules.required === 'string'
            ? rules.required
            : `${fieldName} is required`;
          return message;
        }
      }

      // Skip other validations if value is empty and not required
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      // Min value check (for numbers)
      if (rules.min !== undefined && typeof value === 'number') {
        const min = typeof rules.min === 'object' ? rules.min.value : rules.min;
        const message = typeof rules.min === 'object'
          ? rules.min.message
          : `Minimum value is ${min}`;
        if (value < min) return message;
      }

      // Max value check (for numbers)
      if (rules.max !== undefined && typeof value === 'number') {
        const max = typeof rules.max === 'object' ? rules.max.value : rules.max;
        const message = typeof rules.max === 'object'
          ? rules.max.message
          : `Maximum value is ${max}`;
        if (value > max) return message;
      }

      // Min length check (for strings)
      if (rules.minLength !== undefined && typeof value === 'string') {
        const minLength = typeof rules.minLength === 'object'
          ? rules.minLength.value
          : rules.minLength;
        const message = typeof rules.minLength === 'object'
          ? rules.minLength.message
          : `Minimum length is ${minLength} characters`;
        if (value.length < minLength) return message;
      }

      // Max length check (for strings)
      if (rules.maxLength !== undefined && typeof value === 'string') {
        const maxLength = typeof rules.maxLength === 'object'
          ? rules.maxLength.value
          : rules.maxLength;
        const message = typeof rules.maxLength === 'object'
          ? rules.maxLength.message
          : `Maximum length is ${maxLength} characters`;
        if (value.length > maxLength) return message;
      }

      // Pattern check (regex)
      if (rules.pattern && typeof value === 'string') {
        const isPatternObject = typeof rules.pattern === 'object' && 'value' in rules.pattern;
        const pattern = isPatternObject
          ? (rules.pattern as { value: RegExp; message: string }).value
          : rules.pattern as RegExp;
        const message = isPatternObject
          ? (rules.pattern as { value: RegExp; message: string }).message
          : `Invalid format for ${fieldName}`;
        if (!pattern.test(value)) return message;
      }

      // Custom validation function
      if (rules.validate) {
        const result = rules.validate(value);
        if (typeof result === 'string') return result;
        if (result === false) return `Invalid value for ${fieldName}`;
      }

      return undefined;
    },
    [schema]
  );

  /**
   * Validate a single field and update errors state
   */
  const validateFieldAndUpdate = useCallback(
    (fieldName: string, value: any) => {
      const error = validateField(fieldName, value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });
      setTouched((prev) => ({ ...prev, [fieldName]: true }));
      return !error;
    },
    [validateField]
  );

  /**
   * Validate all fields in the form data
   * Returns true if valid, false otherwise
   */
  const validate = useCallback(
    (formData: Record<string, any>): boolean => {
      const newErrors: ValidationErrors = {};
      const newTouched: TouchedFields = {};

      Object.keys(schema).forEach((fieldName) => {
        const error = validateField(fieldName, formData[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        }
        newTouched[fieldName] = true;
      });

      setErrors(newErrors);
      setTouched(newTouched);

      return Object.keys(newErrors).length === 0;
    },
    [schema, validateField]
  );

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Clear errors for a specific field
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Mark a field as touched
   */
  const touchField = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  return {
    errors,
    touched,
    validate,
    validateField: validateFieldAndUpdate,
    setTouched,
    touchField,
    clearFieldError,
    reset,
    hasErrors: Object.keys(errors).length > 0,
  };
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  url: {
    value: /^https?:\/\/.+/,
    message: 'Please enter a valid URL starting with http:// or https://',
  },
  phone: {
    value: /^\+?[\d\s-()]+$/,
    message: 'Please enter a valid phone number',
  },
  alphanumeric: {
    value: /^[a-zA-Z0-9]+$/,
    message: 'Only letters and numbers are allowed',
  },
  noWhitespace: {
    value: /^\S+$/,
    message: 'Whitespace is not allowed',
  },
};
