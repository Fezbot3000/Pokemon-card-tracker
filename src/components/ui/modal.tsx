import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  {
    variants: {
      backdrop: {
        default: 'bg-black/50 backdrop-blur-sm',
        dark: 'bg-black/70 backdrop-blur-md',
        light: 'bg-black/40 backdrop-blur-sm',
        solid: 'bg-black/60 backdrop-blur-md',
      },
    },
    defaultVariants: {
      backdrop: 'default',
    },
  }
);

const modalContentVariants = cva(
  'relative max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-black',
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        xl: 'w-full max-w-xl',
        '2xl': 'w-full max-w-2xl',
        '3xl': 'w-full max-w-3xl',
        '4xl': 'w-full max-w-4xl',
        '5xl': 'w-full max-w-5xl',
        '6xl': 'w-full max-w-6xl',
        '7xl': 'w-full max-w-7xl',
        full: 'size-full max-w-full',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants>,
    VariantProps<typeof modalContentVariants> {
  isOpen: boolean;
  onClose: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  title?: string;
  children: React.ReactNode;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      backdrop,
      size,
      isOpen,
      onClose,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      title,
      children,
      ...props
    },
    ref
  ) => {
    // Handle escape key press
    React.useEffect(() => {
      if (!closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, closeOnEscape]);

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(modalVariants({ backdrop, className }))}
        onClick={closeOnOverlayClick ? onClose : undefined}
        {...props}
      >
        <div
          className={cn(modalContentVariants({ size }))}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, modalVariants, modalContentVariants };
