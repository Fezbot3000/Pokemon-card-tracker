import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const radioVariants = cva(
  'peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
  {
    variants: {
      variant: {
        default: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white checked:bg-blue-600 checked:border-blue-600',
        error: 'border-red-500 dark:border-red-500 bg-white dark:bg-black text-gray-900 dark:text-white checked:bg-red-600 checked:border-red-600',
        success: 'border-green-500 dark:border-green-500 bg-white dark:bg-black text-gray-900 dark:text-white checked:bg-green-600 checked:border-green-600',
      },
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof radioVariants> {
  error?: boolean;
  success?: boolean;
  label?: string;
  description?: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, variant, size, error, success, label, description, id, ...props }, ref) => {
    // Determine variant based on state
    const computedVariant = error ? 'error' : success ? 'success' : variant;
    
    // Generate unique ID if not provided
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          id={radioId}
          className={cn(radioVariants({ variant: computedVariant, size, className }))}
          ref={ref}
          {...props}
        />
        {(label || description) && (
          <div className="grid gap-1.5 leading-none">
            {label && (
              <label
                htmlFor={radioId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-white cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// RadioGroup component for better composition
export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        className={cn(
          'grid gap-2',
          orientation === 'horizontal' ? 'grid-flow-col auto-cols-max' : 'grid-flow-row',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup, radioVariants }; 