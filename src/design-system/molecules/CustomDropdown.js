import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

/**
 * CustomDropdown - A reusable custom dropdown component that replaces native HTML select elements
 * Provides consistent styling, touch optimization, and accessibility features
 */
const CustomDropdown = ({
  value = '',
  options = [],
  placeholder = 'Select an option...',
  onSelect,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'md',
  fullWidth = true,
  required = false,
  label = '',
  error = '',
  name = '',
  id = '',
  showSearch = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ position: 'bottom', top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const portalRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the trigger container AND the portaled dropdown
      const isOutsideTrigger = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(event.target);
      
      if (isOutsideTrigger && isOutsidePortal) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position on scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      calculatePosition();
    };

    // Add scroll listeners for both window and any scrollable parents
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

    // Calculate dropdown position  
  const calculatePosition = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // approximate max height of dropdown
    
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    const position = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    
    setDropdownPosition({
      position,
      top: position === 'bottom' ? rect.bottom : rect.top - dropdownHeight,
      left: rect.left,
      width: rect.width
    });
  };

  // Open dropdown and calculate position
  const handleToggle = () => {
    if (disabled) return;
    
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const optionText = typeof option === 'string' ? option : (option.label || option.value || '');
    return optionText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle option selection
  const handleSelect = (selectedOption) => {
    const selectedValue = typeof selectedOption === 'string' ? selectedOption : selectedOption.value;
    onSelect?.(selectedValue, selectedOption);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return placeholder;
    
    const selectedOption = options.find(option => {
      const optionValue = typeof option === 'string' ? option : option.value;
      return optionValue === value;
    });
    
    if (selectedOption) {
      return typeof selectedOption === 'string' ? selectedOption : (selectedOption.label || selectedOption.value);
    }
    
    return value;
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleToggle();
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          handleToggle();
        }
        break;
      default:
        // No action needed for other keys
        break;
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'h-8 text-sm px-2',
    md: 'h-10 text-base px-3',
    lg: 'h-12 text-lg px-4'
  };

  // Variant styles
  const variantStyles = {
    default: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white',
    primary: 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100',
    danger: 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
  };

  const baseStyles = `
    relative flex items-center justify-between border rounded-lg cursor-pointer transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-600'}
    ${error ? 'border-red-500 dark:border-red-400' : ''}
    ${fullWidth ? 'w-full' : 'w-auto'}
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${className}
  `;

  const dropdownContent = (
    <div
      ref={portalRef}
      className="fixed z-[60000] bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 60000
      }}
    >
      {/* Search input for large option lists */}
      {showSearch && options.length > 5 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      )}
      
      {/* Options list */}
      <div>
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No options found
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : (option.label || option.value);
            const isSelected = optionValue === value;
            
            return (
              <button
                key={optionValue || index}
                type="button"
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}
                `}
                onClick={() => handleSelect(option)}
              >
                {optionLabel}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label
          htmlFor={id || name}
          className={`block text-sm font-medium mb-1 ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-white'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Dropdown trigger */}
      <div ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          className={baseStyles}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id || name}-error` : undefined}
          id={id || name}
          name={name}
          {...props}
        >
          <span className={`truncate flex-1 text-left ${!value ? 'text-gray-500 dark:text-gray-400' : ''}`}>
            {getDisplayText()}
          </span>
          
          {/* Dropdown arrow */}
          <svg 
            className={`ml-2 size-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p id={`${id || name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Portal dropdown */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
};

CustomDropdown.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string,
      })
    ])
  ).isRequired,
  placeholder: PropTypes.string,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'primary', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  error: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  showSearch: PropTypes.bool,
};

export default CustomDropdown; 