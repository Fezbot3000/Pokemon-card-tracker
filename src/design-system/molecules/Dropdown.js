import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BottomSheet from './BottomSheet';

/**
 * Dropdown component
 *
 * A reusable dropdown menu component with customizable trigger and content
 */
const Dropdown = ({
  trigger,
  children,
  isOpen,
  onOpenChange,
  className = '',
  width = 'auto',
  align = 'left',
  title = '',
  useMobileSheet = true,
  ...props
}) => {
  // Internal state for controlled or uncontrolled usage
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const dropdownRef = useRef(null);

  // Detect mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640); // Tailwind 'sm' breakpoint
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Determine if we're using controlled or uncontrolled mode
  const controlled = isOpen !== undefined;
  const dropdownIsOpen = controlled ? isOpen : internalIsOpen;

  const handleOpenChange = useCallback(newIsOpen => {
    if (!controlled) {
      setInternalIsOpen(newIsOpen);
    }
    if (onOpenChange) {
      onOpenChange(newIsOpen);
    }
  }, [controlled, onOpenChange]); // Fix: Wrap in useCallback to prevent effect re-runs

  const toggleDropdown = e => {
    e.stopPropagation();
    handleOpenChange(!dropdownIsOpen);
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleOpenChange(false);
      }
    };

    if (dropdownIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownIsOpen, handleOpenChange]);

  // Width classes for the dropdown menu
  const widthClasses = {
    auto: 'min-w-[180px]',
    sm: 'w-48',
    md: 'w-56',
    lg: 'w-64',
    xl: 'w-72',
    full: 'w-full',
  };

  // Alignment classes for dropdown positioning
  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  // Render different UI for mobile and desktop
  return (
    <div className={`relative ${className}`} ref={dropdownRef} {...props}>
      {/* Trigger element */}
      <div onClick={toggleDropdown} className="cursor-pointer">
        {trigger}
      </div>

      {/* Desktop Dropdown Menu */}
      {dropdownIsOpen && !isMobileView && (
        <div
          className={`absolute z-50 mt-1 ${widthClasses[width]} ${alignClasses[align]} dark:border-gray-700/50 scrollbar-hide rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:bg-[#0F0F0F]`}
          style={{
            maxHeight: 'none', // Allow dropdown to grow as tall as needed
            overflowY: 'visible', // No vertical scroll
            overflowX: 'hidden',
            display: 'block',
          }}
          {...props}
        >
          {children}
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {useMobileSheet && isMobileView && (
        <BottomSheet
          isOpen={dropdownIsOpen}
          onClose={() => handleOpenChange(false)}
          title={title || 'Select Option'}
        >
          <div className="space-y-2 px-2 py-1">
            {React.Children.map(children, child => {
              // Skip dividers in bottom sheet
              if (child.type === DropdownDivider) return null;

              // Clone DropdownItem elements with mobile styling
              if (child.type === DropdownItem) {
                // Check if this item is selected (has bg-gray-100 or dark:bg-black in its className)
                const isSelected =
                  child.props.className &&
                  (child.props.className.includes('bg-gray-100') ||
                    child.props.className.includes('dark:bg-black'));

                // Preserve the original children to keep any icons or additional content
                const originalChildren = child.props.children;

                return React.cloneElement(child, {
                  className: `text-center rounded-lg py-3 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white font-semibold'
                      : 'bg-white dark:bg-[#0F0F0F] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  } 
                    hover:opacity-90 ${child.props.className || ''}`
                    .replace('bg-gray-100', '')
                    .replace('dark:bg-black', ''),
                  onClick: () => {
                    if (child.props.onClick) {
                      child.props.onClick();
                    }
                    handleOpenChange(false);
                  },
                  // Keep the original children to preserve any icons
                  children: originalChildren,
                });
              }

              return child;
            })}

            {/* Cancel Button */}
            <button
              onClick={() => handleOpenChange(false)}
              className="mt-3 block w-full rounded-lg border border-gray-700 bg-[#0F0F0F] px-4 py-3 text-center text-sm font-semibold text-gray-300 hover:opacity-90"
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

/**
 * Dropdown Item component
 *
 * Used within Dropdown for individual menu items
 */
export const DropdownItem = ({
  children,
  icon,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'flex items-center w-full px-4 py-2 text-sm text-left transition-colors truncate';
  const stateClasses = disabled
    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#0F0F0F] cursor-pointer';

  return (
    <button
      className={`${baseClasses} ${stateClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span className="w-full truncate text-left">{children}</span>
    </button>
  );
};

/**
 * Dropdown Divider component
 *
 * Used to separate groups of items within a dropdown
 */
export const DropdownDivider = ({ className = '', ...props }) => (
  <div
    className={`dark:border-gray-700/50 my-1 border-t border-gray-200 ${className}`}
    {...props}
  />
);

Dropdown.propTypes = {
  trigger: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool,
  onOpenChange: PropTypes.func,
  className: PropTypes.string,
  width: PropTypes.oneOf(['auto', 'sm', 'md', 'lg', 'xl', 'full']),
  align: PropTypes.oneOf(['left', 'right', 'center']),
  title: PropTypes.string,
  useMobileSheet: PropTypes.bool,
};

DropdownItem.propTypes = {
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Dropdown;
