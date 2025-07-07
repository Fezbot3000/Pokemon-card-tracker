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
          <div className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-black">
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
        className={`cursor-pointer px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 ${className || ''}`}
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