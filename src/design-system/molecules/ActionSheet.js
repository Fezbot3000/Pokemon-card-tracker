import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BottomSheet from './BottomSheet';

/**
 * ActionSheet component
 * 
 * A reusable action sheet component that follows the filter action sheet styling pattern.
 * Uses BottomSheet for mobile and regular dropdown for desktop.
 */
const ActionSheet = ({
  trigger,
  children,
  isOpen,
  onOpenChange,
  className = '',
  width = 'auto',
  align = 'left',
  title = '',
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
  const actionSheetIsOpen = controlled ? isOpen : internalIsOpen;

  const handleOpenChange = useCallback(newIsOpen => {
    if (!controlled) {
      setInternalIsOpen(newIsOpen);
    }
    if (onOpenChange) {
      onOpenChange(newIsOpen);
    }
  }, [controlled, onOpenChange]);

  const toggleActionSheet = e => {
    e.stopPropagation();
    handleOpenChange(!actionSheetIsOpen);
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleOpenChange(false);
      }
    };

    if (actionSheetIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionSheetIsOpen, handleOpenChange]);

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef} {...props}>
      {/* Trigger element */}
      <div onClick={toggleActionSheet} className="cursor-pointer">
        {trigger}
      </div>

      {/* Desktop Dropdown Menu */}
      {actionSheetIsOpen && !isMobileView && (
        <div
          className={`absolute z-50 mt-1 ${widthClasses[width]} ${alignClasses[align]} dark:border-gray-700/50 scrollbar-hide rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:bg-[#0F0F0F]`}
          style={{
            maxHeight: 'none',
            overflowY: 'visible',
            overflowX: 'hidden',
            display: 'block',
          }}
          {...props}
        >
          {children}
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobileView && (
        <BottomSheet
          isOpen={actionSheetIsOpen}
          onClose={() => handleOpenChange(false)}
          title={title || 'Select Option'}
        >
          <div className="flex h-full flex-col">
            {/* Scrollable Content Area */}
            <div 
              className="scrollbar-hide grow overflow-y-auto space-y-2 px-2 py-1"
              style={{ maxHeight: 'calc(85vh - 130px)' }}
            >
              {React.Children.map(children, child => {
                // Skip dividers in bottom sheet
                if (child.type === ActionSheetDivider) return null;

                // Clone ActionSheetItem elements with mobile styling
                if (child.type === ActionSheetItem) {
                  // Check if this item is selected by various methods
                  const hasSelectedClasses = child.props.className &&
                    (child.props.className.includes('bg-gray-100') ||
                     child.props.className.includes('dark:bg-black') ||
                     child.props.className.includes('bg-blue-50') ||
                     child.props.className.includes('dark:bg-blue-900'));
                  
                  // Check if item has a check icon
                  const hasCheckIcon = React.Children.toArray(child.props.children).some(grandchild => 
                    grandchild && 
                    grandchild.props && 
                    (grandchild.props.name === 'check' || 
                     (grandchild.type && grandchild.type.name === 'svg'))
                  );
                  
                  const isSelected = hasSelectedClasses || hasCheckIcon;

                  // Preserve the original children to keep any icons or additional content
                  const originalChildren = child.props.children;

                  return React.cloneElement(child, {
                    className: `text-center rounded-lg py-3 ${
                      isSelected
                        ? 'bg-primary-gradient text-white font-semibold'
                        : 'bg-white dark:bg-[#000000] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    } 
                      hover:opacity-90 ${child.props.className || ''}`
                      .replace('bg-gray-100', '')
                      .replace('dark:bg-black', '')
                      .replace('bg-blue-50', '')
                      .replace('text-blue-600', '')
                      .replace('shadow-sm', '')
                      .replace('ring-1', '')
                      .replace('ring-blue-200', '')
                      .replace('dark:bg-blue-900/30', '')
                      .replace('dark:text-blue-400', '')
                      .replace('dark:ring-blue-800', ''),
                    onClick: () => {
                      if (child.props.onClick) {
                        child.props.onClick();
                      }
                      handleOpenChange(false);
                    },
                    // Update children to change tick color for selected items
                    children: isSelected ? React.Children.map(originalChildren, grandchild => {
                      // If this is an SVG (tick icon), make it white
                      if (grandchild && grandchild.type === 'svg') {
                        return React.cloneElement(grandchild, {
                          className: 'ml-3 size-4 shrink-0 text-white'
                        });
                      }
                      // If this is a div containing an SVG, update the SVG inside
                      if (grandchild && grandchild.type === 'div' && grandchild.props.children) {
                        const updatedChildren = React.Children.map(grandchild.props.children, greatGrandchild => {
                          if (greatGrandchild && greatGrandchild.type === 'svg') {
                            return React.cloneElement(greatGrandchild, {
                              className: 'ml-3 size-4 shrink-0 text-white'
                            });
                          }
                          return greatGrandchild;
                        });
                        return React.cloneElement(grandchild, {
                          children: updatedChildren
                        });
                      }
                      return grandchild;
                    }) : originalChildren,
                  });
                }

                return child;
              })}
            </div>
            
            {/* Fixed Cancel Button */}
            <div className="sticky inset-x-0 bottom-0 mt-2 border-t border-gray-700 bg-white dark:bg-[#000000] pt-2">
              <button
                onClick={() => handleOpenChange(false)}
                className="mb-2 block w-full rounded-lg border border-gray-700 bg-[#000000] px-4 py-3 text-center text-sm font-semibold text-gray-300 hover:opacity-90"
              >
                Cancel
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

/**
 * ActionSheet Item component
 * 
 * Used within ActionSheet for individual menu items
 */
export const ActionSheetItem = ({
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
 * ActionSheet Divider component
 * 
 * Used to separate groups of items within an action sheet
 */
export const ActionSheetDivider = ({ className = '', ...props }) => (
  <div
    className={`dark:border-gray-700/50 my-1 border-t border-gray-200 ${className}`}
    {...props}
  />
);

ActionSheet.propTypes = {
  trigger: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool,
  onOpenChange: PropTypes.func,
  className: PropTypes.string,
  width: PropTypes.oneOf(['auto', 'sm', 'md', 'lg', 'xl', 'full']),
  align: PropTypes.oneOf(['left', 'right', 'center']),
  title: PropTypes.string,
};

ActionSheetItem.propTypes = {
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ActionSheet;