import * as React from 'react';

// Simple dropdown without external dependencies to avoid import issues
export interface DropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ trigger, children, open, onOpenChange, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open || false);

    React.useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);

    const handleToggle = () => {
      const newOpen = !isOpen;
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    };

    const handleClose = () => {
      setIsOpen(false);
      onOpenChange?.(false);
    };

    React.useEffect(() => {
      if (isOpen) {
        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (ref && 'current' in ref && ref.current && !ref.current.contains(target)) {
            handleClose();
          }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen, ref]);

    return (
      <div className={`relative ${className || ''}`} ref={ref} {...props}>
        <div onClick={handleToggle} className="cursor-pointer">
          {trigger}
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
            {children}
          </div>
        )}
      </div>
    );
  }
);

const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ children, className, onClick, ...props }, ref) => {
    return (
      <div
        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white ${className || ''}`}
        onClick={onClick}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';
DropdownItem.displayName = 'DropdownItem';

export { Dropdown, DropdownItem }; 