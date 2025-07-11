import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-sm hover:opacity-90',
        destructive:
          'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white shadow-sm hover:opacity-90',
        outline:
          'border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
        secondary:
          'border-0.5 border-gray-700 dark:border-gray-300 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white',
        tertiary:
          'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white',
        ghost:
          'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText = 'Loading...',
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="-ml-1 mr-3 size-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={cn(children ? 'mr-2' : '')}>{leftIcon}</span>
            )}
            {children}
            {rightIcon && (
              <span className={cn(children ? 'ml-2' : '')}>{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
