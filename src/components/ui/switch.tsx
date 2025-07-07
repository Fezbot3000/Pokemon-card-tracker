import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const switchVariants = cva(
  'focus-visible:ring-ring focus-visible:ring-offset-background data-[state=unchecked]:bg-input peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
  {
    variants: {
      variant: {
        default: 'bg-gray-200 checked:bg-blue-600 data-[state=checked]:bg-blue-600 dark:bg-gray-700',
        success: 'bg-gray-200 checked:bg-green-600 data-[state=checked]:bg-green-600 dark:bg-gray-700',
        warning: 'bg-gray-200 checked:bg-yellow-600 data-[state=checked]:bg-yellow-600 dark:bg-gray-700',
        danger: 'bg-gray-200 checked:bg-red-600 data-[state=checked]:bg-red-600 dark:bg-gray-700',
      },
      size: {
        sm: 'h-4 w-7',
        md: 'h-5 w-9',
        lg: 'h-6 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const switchThumbVariants = cva(
  'bg-background pointer-events-none block rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
  {
    variants: {
      size: {
        sm: 'size-3 data-[state=checked]:translate-x-3',
        md: 'size-4 data-[state=checked]:translate-x-4',
        lg: 'size-5 data-[state=checked]:translate-x-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  label?: string;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, variant, size, label, description, onCheckedChange, id, onChange, ...props }, ref) => {
    // Generate unique ID if not provided
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="checkbox"
            id={switchId}
            className="sr-only"
            ref={ref}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={switchId}
            className={cn(switchVariants({ variant, size, className }))}
          >
            <span className={cn(switchThumbVariants({ size }), 'bg-white dark:bg-black')} />
          </label>
        </div>
        {(label || description) && (
          <div className="grid gap-1.5 leading-none">
            {label && (
              <label
                htmlFor={switchId}
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

Switch.displayName = 'Switch';

export { Switch, switchVariants }; 