// src/shared/ui/Button/Button.tsx
import React, { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const buttonVariants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md focus:ring-primary-500',
  secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white shadow-sm hover:shadow-md focus:ring-secondary-500',
  outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500',
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md focus:ring-red-500',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Базовые стили
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          
          // Вариант кнопки
          buttonVariants[variant],
          
          // Размер кнопки
          buttonSizes[size],
          
          // Полная ширина
          fullWidth && 'w-full',
          
          // Состояние загрузки
          loading && 'cursor-wait',
          
          // Дополнительные классы
          className
        )}
        {...props}
      >
        {/* Левая иконка или спиннер загрузки */}
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        
        {/* Текст кнопки */}
        <span className={loading ? 'opacity-70' : ''}>{children}</span>
        
        {/* Правая иконка (только если нет загрузки) */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Компонент группы кнопок
export interface ButtonGroupProps {
  children: ReactNode;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  className?: string;
}

export const ButtonGroup = ({ children, size, variant, className }: ButtonGroupProps) => {
  return (
    <div className={cn('inline-flex rounded-lg shadow-sm', className)} role="group">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === Button) {
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;
          
          return React.cloneElement(child as React.ReactElement<ButtonProps>, {
            size: child.props.size || size,
            variant: child.props.variant || variant,
            className: cn(
              child.props.className,
              // Убираем скругление между кнопками
              !isFirst && !isLast && 'rounded-none',
              isFirst && 'rounded-r-none',
              isLast && 'rounded-l-none',
              // Убираем левую границу у всех кнопок кроме первой
              !isFirst && 'border-l-0'
            ),
          });
        }
        return child;
      })}
    </div>
  );
};

// Компонент ссылки, стилизованной как кнопка
export interface ButtonLinkProps extends ButtonProps {
  href: string;
  external?: boolean;
}

export const ButtonLink = ({ href, external, children, ...buttonProps }: ButtonLinkProps) => {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a href={href} {...linkProps} className="inline-block">
      <Button {...buttonProps}>{children}</Button>
    </a>
  );
};