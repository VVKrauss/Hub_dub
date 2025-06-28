// src/shared/ui/Form/Form.tsx
import React, { ReactNode, forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Типы для полей формы
export interface FormFieldProps {
  children: ReactNode;
  className?: string;
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
}

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export interface FormErrorProps {
  children: ReactNode;
  className?: string;
}

export interface FormHelperTextProps {
  children: ReactNode;
  className?: string;
}

// Основной компонент поля формы
export const FormField = ({ children, className }: FormFieldProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
};

// Компонент лейбла
export const FormLabel = ({ children, required, className, ...props }: FormLabelProps) => {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

// Базовые стили для инпутов
const inputBaseStyles = [
  'w-full px-3 py-2 border rounded-lg shadow-sm',
  'bg-white dark:bg-dark-700',
  'text-gray-900 dark:text-white',
  'placeholder-gray-400 dark:placeholder-gray-500',
  'transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
];

const getInputStyles = (error?: string) => cn(
  inputBaseStyles,
  error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
);

// Компонент инпута
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, helperText, className, ...props }, ref) => {
    return (
      <div>
        <input
          ref={ref}
          className={cn(getInputStyles(error), className)}
          {...props}
        />
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

// Компонент textarea
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ error, helperText, className, rows = 4, ...props }, ref) => {
    return (
      <div>
        <textarea
          ref={ref}
          rows={rows}
          className={cn(getInputStyles(error), 'resize-vertical', className)}
          {...props}
        />
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Компонент селекта
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ error, helperText, children, className, ...props }, ref) => {
    return (
      <div>
        <select
          ref={ref}
          className={cn(getInputStyles(error), className)}
          {...props}
        >
          {children}
        </select>
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// Компонент чекбокса
export interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div>
        <div className="flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'h-4 w-4 text-primary-600 border-gray-300 rounded',
              'focus:ring-primary-500 focus:ring-2',
              'dark:border-gray-600 dark:bg-dark-700',
              error && 'border-red-300',
              className
            )}
            {...props}
          />
          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {label}
          </label>
        </div>
        {error && <FormError>{error}</FormError>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// Компонент группы радио-кнопок
export interface FormRadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormRadioGroupProps {
  name: string;
  options: FormRadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  className?: string;
}

export const FormRadioGroup = ({
  name,
  options,
  value,
  onChange,
  error,
  helperText,
  className,
}: FormRadioGroupProps) => {
  return (
    <div className={className}>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={option.disabled}
              className={cn(
                'h-4 w-4 text-primary-600 border-gray-300',
                'focus:ring-primary-500 focus:ring-2',
                'dark:border-gray-600 dark:bg-dark-700',
                error && 'border-red-300'
              )}
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && <FormError>{error}</FormError>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </div>
  );
};

// Компонент ошибки
export const FormError = ({ children, className }: FormErrorProps) => {
  return (
    <p className={cn('text-sm text-red-600 dark:text-red-400 mt-1', className)}>
      {children}
    </p>
  );
};

// Компонент вспомогательного текста
export const FormHelperText = ({ children, className }: FormHelperTextProps) => {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}>
      {children}
    </p>
  );
};

// Группировка компонентов для удобства использования
export const Form = {
  Field: FormField,
  Label: FormLabel,
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Checkbox: FormCheckbox,
  RadioGroup: FormRadioGroup,
  Error: FormError,
  HelperText: FormHelperText,
};

// Хук для управления состоянием формы
export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) => {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const setValue = React.useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Очищаем ошибку при изменении значения
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const setFieldError = React.useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = React.useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      // Валидация
      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }
      
      setErrors({});
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    setFieldError,
    clearErrors,
    reset,
    handleSubmit,
  };
};