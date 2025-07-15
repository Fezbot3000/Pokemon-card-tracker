import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const selectVariants = cva(
  'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer relative',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-black dark:text-white dark:hover:bg-gray-900',
        error:
          'border-red-500 bg-white text-gray-900 focus-visible:ring-red-500 hover:bg-red-50 dark:border-red-500 dark:bg-black dark:text-white dark:hover:bg-red-900/20',
        success:
          'border-green-500 bg-white text-gray-900 focus-visible:ring-green-500 hover:bg-green-50 dark:border-green-500 dark:bg-black dark:text-white dark:hover:bg-green-900/20',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base min-h-[44px]', // iOS optimized
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface OptionProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size' | 'onChange'>,
    VariantProps<typeof selectVariants> {
  error?: boolean;
  success?: boolean;
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ 
    className, 
    variant, 
    size, 
    error, 
    success, 
    children, 
    value, 
    onChange, 
    placeholder = 'Select an option...',
    disabled = false,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(value || '');
    const selectRef = React.useRef<HTMLDivElement>(null);

    // Determine variant based on state
    const computedVariant = error ? 'error' : success ? 'success' : variant;

    // Extract options from children
    const options = React.Children.toArray(children).filter(
      (child): child is React.ReactElement<OptionProps> =>
        React.isValidElement(child) && child.type === Option
    );

    // Find selected option
    const selectedOption = options.find(option => option.props.value === selectedValue);
    const displayText = selectedOption?.props.children || placeholder;

    // Handle option selection
    const handleOptionSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Update selected value when value prop changes
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    return (
      <div className="relative w-full" ref={selectRef}>
        <div
          ref={ref}
          className={cn(
            selectVariants({ variant: computedVariant, size, className }),
            'justify-between items-center',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          {...props}
        >
          <span className={cn(
            'truncate',
            !selectedOption && 'text-gray-500 dark:text-gray-400'
          )}>
            {displayText}
          </span>
          <svg
            className={cn(
              'w-4 h-4 transition-transform duration-200 ml-2 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Custom dropdown menu */}
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-black">
            <div className="py-1">
              {options.map((option) => (
                <div
                  key={option.props.value}
                  className={cn(
                    'px-3 py-2 text-sm cursor-pointer transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    option.props.value === selectedValue && 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                    option.props.disabled && 'opacity-50 cursor-not-allowed',
                    size === 'lg' && 'py-3 min-h-[44px] flex items-center' // iOS optimization for large size
                  )}
                  onClick={() => {
                    if (!option.props.disabled) {
                      handleOptionSelect(option.props.value);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{option.props.children}</span>
                    {option.props.value === selectedValue && (
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Option component for better composition
const Option = React.forwardRef<HTMLDivElement, OptionProps>(
  ({ children, value, disabled, ...props }, ref) => {
    // This component is used for composing the select options
    // The actual rendering is handled by the Select component
    return null;
  }
);

Option.displayName = 'Option';

export { Select, Option, selectVariants };
