import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const selectVariants = cva(
  'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-black dark:text-white',
        error: 'border-red-500 bg-white text-gray-900 focus-visible:ring-red-500 dark:border-red-500 dark:bg-black dark:text-white',
        success: 'border-green-500 bg-white text-gray-900 focus-visible:ring-green-500 dark:border-green-500 dark:bg-black dark:text-white',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  error?: boolean;
  success?: boolean;
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, error, success, children, ...props }, ref) => {
    // Determine variant based on state
    const computedVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <select
        className={cn(selectVariants({ variant: computedVariant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

// Option component for better composition
export interface OptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

const Option = React.forwardRef<HTMLOptionElement, OptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <option
        className={cn('text-gray-900 dark:text-white bg-white dark:bg-black', className)}
        ref={ref}
        {...props}
      >
        {children}
      </option>
    );
  }
);

Option.displayName = 'Option';

export { Select, Option, selectVariants }; 