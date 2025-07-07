import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const breadcrumbVariants = cva(
  'flex items-center space-x-1 text-sm',
  {
    variants: {
      variant: {
        default: 'text-gray-500 dark:text-gray-400',
        muted: 'text-gray-400 dark:text-gray-500',
        accent: 'text-blue-600 dark:text-blue-400',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const breadcrumbItemVariants = cva(
  'flex items-center',
  {
    variants: {
      variant: {
        default: '',
        current: 'font-medium text-gray-900 dark:text-white',
        link: 'hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const breadcrumbSeparatorVariants = cva(
  'select-none',
  {
    variants: {
      variant: {
        default: 'text-gray-400 dark:text-gray-500',
        muted: 'text-gray-300 dark:text-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BreadcrumbProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof breadcrumbVariants> {
  children: React.ReactNode;
}

export interface BreadcrumbListProps extends React.HTMLAttributes<HTMLOListElement> {
  children: React.ReactNode;
}

export interface BreadcrumbItemProps
  extends React.HTMLAttributes<HTMLLIElement>,
    VariantProps<typeof breadcrumbItemVariants> {
  children: React.ReactNode;
}

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
}

export interface BreadcrumbSeparatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof breadcrumbSeparatorVariants> {
  children?: React.ReactNode;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <nav
        className={cn(breadcrumbVariants({ variant, size, className }))}
        aria-label="Breadcrumb"
        ref={ref}
        {...props}
      >
        {children}
      </nav>
    );
  }
);

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ol
        className={cn('flex items-center space-x-2', className)}
        ref={ref}
        {...props}
      >
        {children}
      </ol>
    );
  }
);

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <li
        className={cn(breadcrumbItemVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </li>
    );
  }
);

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <a
        className={cn(
          'hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </a>
    );
  }
);

const BreadcrumbSeparator = React.forwardRef<HTMLSpanElement, BreadcrumbSeparatorProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <span
        className={cn(breadcrumbSeparatorVariants({ variant, className }))}
        aria-hidden="true"
        ref={ref}
        {...props}
      >
        {children || '/'}
      </span>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';
BreadcrumbList.displayName = 'BreadcrumbList';
BreadcrumbItem.displayName = 'BreadcrumbItem';
BreadcrumbLink.displayName = 'BreadcrumbLink';
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbSeparator,
  breadcrumbVariants,
  breadcrumbItemVariants,
  breadcrumbSeparatorVariants 
}; 