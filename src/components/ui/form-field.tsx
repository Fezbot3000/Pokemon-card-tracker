import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const formFieldVariants = cva(
  'space-y-2',
  {
    variants: {
      variant: {
        default: '',
        inline: 'flex items-center space-x-4 space-y-0',
        compact: 'space-y-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const formMessageVariants = cva(
  'text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'text-gray-600 dark:text-gray-400',
        error: 'text-red-600 dark:text-red-400',
        success: 'text-green-600 dark:text-green-400',
        warning: 'text-yellow-600 dark:text-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  children: React.ReactNode;
}

export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export interface FormMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof formMessageVariants> {
  children?: React.ReactNode;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        className={cn(formFieldVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('space-y-2', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-white',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
    );
  }
);

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('relative', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, variant, children, ...props }, ref) => {
    if (!children) return null;
    
    return (
      <p
        className={cn(formMessageVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormField.displayName = 'FormField';
FormItem.displayName = 'FormItem';
FormLabel.displayName = 'FormLabel';
FormControl.displayName = 'FormControl';
FormDescription.displayName = 'FormDescription';
FormMessage.displayName = 'FormMessage';

export { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage,
  formFieldVariants,
  formMessageVariants 
}; 