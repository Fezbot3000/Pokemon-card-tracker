import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const checkboxVariants = cva(
  'ring-offset-background focus-visible:ring-ring data-[state=checked]:text-primary-foreground peer size-4 shrink-0 rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
  {
    variants: {
      variant: {
        default: 'border-gray-300 bg-white text-gray-900 checked:border-blue-600 checked:bg-blue-600 dark:border-gray-600 dark:bg-black dark:text-white',
        error: 'border-red-500 bg-white text-gray-900 checked:border-red-600 checked:bg-red-600 dark:border-red-500 dark:bg-black dark:text-white',
        success: 'border-green-500 bg-white text-gray-900 checked:border-green-600 checked:bg-green-600 dark:border-green-500 dark:bg-black dark:text-white',
      },
      size: {
        sm: 'size-3',
        md: 'size-4',
        lg: 'size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof checkboxVariants> {
  error?: boolean;
  success?: boolean;
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant, size, error, success, label, description, id, ...props }, ref) => {
    // Determine variant based on state
    const computedVariant = error ? 'error' : success ? 'success' : variant;
    
    // Generate unique ID if not provided
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={checkboxId}
          className={cn(checkboxVariants({ variant: computedVariant, size, className }))}
          ref={ref}
          {...props}
        />
        {(label || description) && (
          <div className="grid gap-1.5 leading-none">
            {label && (
              <label
                htmlFor={checkboxId}
                className="cursor-pointer text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-white"
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

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants }; 