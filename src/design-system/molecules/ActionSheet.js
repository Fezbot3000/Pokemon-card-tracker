import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BottomSheet from './BottomSheet';
import './ActionSheet.css';

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
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

  // Handle animations for desktop dropdown
  useEffect(() => {
    if (actionSheetIsOpen && !isMobileView) {
      // Opening: render immediately and start enter animation
      setShouldRender(true);
      setIsAnimating(true);
    } else if (!actionSheetIsOpen && !isMobileView && shouldRender) {
      // Closing: start exit animation
      setIsAnimating(true);
      // Will stop rendering after animation completes
    } else if (isMobileView) {
      // Mobile uses BottomSheet's own animation logic
      setShouldRender(false);
      setIsAnimating(false);
    }
  }, [actionSheetIsOpen, isMobileView, shouldRender]);

  // Handle animation completion
  const handleAnimationEnd = useCallback(() => {
    if (!actionSheetIsOpen && !isMobileView) {
      // Animation finished for closing - stop rendering
      setShouldRender(false);
    }
    setIsAnimating(false);
  }, [actionSheetIsOpen, isMobileView]);

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



  return (
    <div className={`action-sheet ${className}`} ref={dropdownRef} {...props}>
      {/* Trigger element */}
      <div onClick={toggleActionSheet} className="action-sheet__trigger">
        {trigger}
      </div>

      {/* Desktop Dropdown Menu */}
      {shouldRender && !isMobileView && (
        <div
          className={`action-sheet__dropdown action-sheet__dropdown--${width} action-sheet__dropdown--${align} ${
            actionSheetIsOpen ? 'animate-actionsheet-enter' : 'animate-actionsheet-exit'
          }`}
          style={{
            maxHeight: 'none',
            overflowY: 'visible',
            overflowX: 'hidden',
            display: 'block',
          }}
          onAnimationEnd={handleAnimationEnd}
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
          <div className="action-sheet--mobile action-sheet__content">
            {/* Scrollable Content Area */}
            <div 
              className="action-sheet__scroll-area"
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
                    className: `action-sheet-item ${
                      isSelected
                        ? 'action-sheet-item--selected'
                        : 'action-sheet-item--default'
                    } ${child.props.className || ''}`,
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
                          className: 'action-sheet-item__icon--selected'
                        });
                      }
                      // If this is a div containing an SVG, update the SVG inside
                      if (grandchild && grandchild.type === 'div' && grandchild.props.children) {
                        const updatedChildren = React.Children.map(grandchild.props.children, greatGrandchild => {
                          if (greatGrandchild && greatGrandchild.type === 'svg') {
                            return React.cloneElement(greatGrandchild, {
                              className: 'action-sheet-item__icon--selected'
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
            <div className="action-sheet__cancel-wrapper">
              <button
                onClick={() => handleOpenChange(false)}
                className="action-sheet__cancel-button"
              >
                Close
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
  const itemClass = [
    'action-sheet-item',
    disabled ? 'action-sheet-item--disabled' : 'action-sheet-item--enabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={itemClass}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="action-sheet-item__icon">{icon}</span>}
      <span className="action-sheet-item__content">{children}</span>
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
    className={`action-sheet-divider ${className}`}
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