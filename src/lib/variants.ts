import { cva } from 'class-variance-authority';

/**
 * Button component variants
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600',
        destructive: 'bg-error-500 text-white hover:bg-error-600',
        outline:
          'border border-primary-500 text-primary-500 hover:bg-primary-50',
        secondary:
          'bg-transparent border border-text-primary text-text-primary hover:bg-surface-secondary',
        tertiary:
          'bg-transparent text-text-primary hover:bg-surface-secondary',
        ghost: 'hover:bg-surface-secondary hover:text-text-primary',
        link: 'text-primary-500 underline-offset-4 hover:underline',
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

/**
 * Modal component variants
 */
export const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center',
  {
    variants: {
      backdrop: {
        default: 'bg-black/50 backdrop-blur-sm',
        dark: 'bg-black/70 backdrop-blur-md',
        light: 'bg-white/20 backdrop-blur-sm',
      },
    },
    defaultVariants: {
      backdrop: 'default',
    },
  }
);

/**
 * Input component variants
 */
export const inputVariants = cva(
  'flex h-10 w-full rounded-md border bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-border focus:border-primary-500 focus:ring-primary-200',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-200',
        success:
          'border-success-500 focus:border-success-500 focus:ring-success-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Badge component variants
 */
export const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'hover:bg-primary/80 border-transparent bg-primary text-white',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
        destructive: 'hover:bg-error/80 border-transparent bg-error text-white',
        outline: 'text-foreground',
        success: 'hover:bg-success/80 border-transparent bg-success text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Card component variants
 */
export const cardVariants = cva(
  'bg-card text-card-foreground rounded-lg border shadow-sm',
  {
    variants: {
      variant: {
        default: 'border-border',
        outline: 'border-2 border-primary',
        ghost: 'border-transparent shadow-none',
      },
      size: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
