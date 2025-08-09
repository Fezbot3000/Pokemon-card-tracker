import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BottomSheet from './BottomSheet';
import './Dropdown.css';

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



  // Render different UI for mobile and desktop
  return (
    <div className={`dropdown ${className}`} ref={dropdownRef} {...props}>
      {/* Trigger element */}
      <div onClick={toggleDropdown} className="dropdown__trigger">
        {trigger}
      </div>

      {/* Desktop Dropdown Menu */}
      {dropdownIsOpen && !isMobileView && (
        <div
          className={`dropdown__menu dropdown__menu--${width} dropdown__menu--${align}`}
          style={{
            maxHeight: 'none', // Allow dropdown to grow as tall as needed
            overflowY: 'visible', // No vertical scroll
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
          <div className="dropdown--mobile dropdown__content">
            {React.Children.map(children, child => {
              // Skip dividers in bottom sheet
              if (child.type === DropdownDivider) return null;

              // Clone DropdownItem elements with standard styling
              if (child.type === DropdownItem) {
                return React.cloneElement(child, {
                  onClick: () => {
                    if (child.props.onClick) {
                      child.props.onClick();
                    }
                    handleOpenChange(false);
                  },
                });
              }

              return child;
            })}

            {/* Cancel Button */}
            <button
              onClick={() => handleOpenChange(false)}
              className="dropdown__cancel-button"
            >
              Close
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
  const itemClass = [
    'dropdown-item',
    disabled ? 'dropdown-item--disabled' : 'dropdown-item--enabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={itemClass}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="dropdown-item__icon">{icon}</span>}
      <span className="dropdown-item__content">{children}</span>
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
    className={`dropdown-divider ${className}`}
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
