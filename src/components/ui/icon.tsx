import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const iconVariants = cva('material-icons transition-colors', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    color: {
      default: 'text-gray-600 dark:text-gray-300',
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-400 dark:text-gray-500',
      success: 'text-green-500 dark:text-green-400',
      danger: 'text-red-500 dark:text-red-400',
      warning: 'text-yellow-500 dark:text-yellow-400',
      info: 'text-blue-500 dark:text-blue-400',
      white: 'text-white',
      muted: 'text-gray-500 dark:text-gray-400',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'default',
  },
});

export interface IconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof iconVariants> {
  name: string;
  'data-component-name'?: string;
}

const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      name,
      size,
      color,
      className,
      'data-component-name': dataComponentName,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(iconVariants({ size, color, className }))}
        {...props}
      >
        {name}
      </span>
    );
  }
);

Icon.displayName = 'Icon';

export { Icon, iconVariants };
