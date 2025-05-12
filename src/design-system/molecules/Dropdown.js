import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { stripDebugProps } from '../../utils/stripDebugProps';

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
  ...props
}) => {
  // Internal state for controlled or uncontrolled usage
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Determine if we're using controlled or uncontrolled mode
  const controlled = isOpen !== undefined;
  const dropdownIsOpen = controlled ? isOpen : internalIsOpen;
  
  const handleOpenChange = (newIsOpen) => {
    if (!controlled) {
      setInternalIsOpen(newIsOpen);
    }
    if (onOpenChange) {
      onOpenChange(newIsOpen);
    }
  };
  
  const toggleDropdown = (e) => {
    e.stopPropagation();
    handleOpenChange(!dropdownIsOpen);
  };
  
  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
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
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef} {...stripDebugProps(props)}>
      {/* Trigger element */}
      <div onClick={toggleDropdown} className="cursor-pointer" {...stripDebugProps(props)}>
        {trigger}
      </div>
      
      {/* Dropdown menu */}
      {dropdownIsOpen && (
        <div 
          className={`absolute z-50 mt-1 ${widthClasses[width]} ${alignClasses[align]} 
                     bg-white dark:bg-[#1B2131] shadow-lg rounded-md 
                     border border-gray-200 dark:border-gray-700/50 py-1 scrollbar-hide`}
          style={{ 
            maxHeight: 'none', // Allow dropdown to grow as tall as needed
            overflowY: 'visible', // No vertical scroll
            overflowX: 'hidden',
            display: 'block'
          }}
          {...stripDebugProps(props)}
        >
          {children}
        </div>
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
  const baseClasses = 'flex items-center w-full px-4 py-2 text-sm text-left transition-colors truncate';
  const stateClasses = disabled 
    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1B2131] cursor-pointer';
  
  return (
    <button
      className={`${baseClasses} ${stateClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...stripDebugProps(props)}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span className="truncate w-full text-left">{children}</span>
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
    className={`my-1 border-t border-gray-200 dark:border-gray-700/50 ${className}`} 
    {...stripDebugProps(props)} 
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
};

DropdownItem.propTypes = {
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Dropdown;
