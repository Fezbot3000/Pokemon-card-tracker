import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const tabsVariants = cva(
  'bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-md p-1',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 dark:bg-gray-800',
        pills: 'border-b border-gray-200 bg-transparent dark:border-gray-700',
        underline: 'bg-transparent',
      },
      size: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const tabsTriggerVariants = cva(
  'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
  {
    variants: {
      variant: {
        default: 'text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:text-gray-400 dark:data-[state=active]:bg-black dark:data-[state=active]:text-white',
        pills: 'rounded-md text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:text-gray-400 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-white',
        underline: 'rounded-none border-b-2 border-transparent bg-transparent text-gray-600 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:text-gray-400 dark:data-[state=active]:text-blue-400',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const tabsContentVariants = cva(
  'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: '',
        pills: 'mt-4',
        underline: 'mt-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {
  children: React.ReactNode;
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tabsTriggerVariants> {
  value: string;
  children: React.ReactNode;
}

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsContentVariants> {
  value: string;
  children: React.ReactNode;
}

const TabsContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
} | undefined>(undefined);

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, variant, size, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [currentValue, setCurrentValue] = React.useState(value || defaultValue || '');

    React.useEffect(() => {
      if (value !== undefined) {
        setCurrentValue(value);
      }
    }, [value]);

    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setCurrentValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, variant: variant || undefined, size: size || undefined }}>
        <div className={cn('', className)} ref={ref} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const computedVariant = variant || (context?.variant ?? 'default');
    const computedSize = size || (context?.size ?? 'md');

    return (
      <div
        className={cn(tabsVariants({ variant: computedVariant, size: computedSize, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant, size, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const computedVariant = variant || (context?.variant ?? 'default');
    const computedSize = size || (context?.size ?? 'md');
    const isActive = context?.value === value;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      context?.onValueChange?.(value);
    };

    return (
      <button
        type="button"
        className={cn(tabsTriggerVariants({ variant: computedVariant, size: computedSize, className }))}
        data-state={isActive ? 'active' : 'inactive'}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, variant, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const computedVariant = variant || context?.variant || 'default';
    const isActive = context?.value === value;

    if (!isActive) return null;

    return (
      <div
        className={cn(tabsContentVariants({ variant: computedVariant, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsVariants, tabsTriggerVariants, tabsContentVariants }; 