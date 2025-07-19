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
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ position: 'bottom', top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Process options to ensure consistent format
  const processedOptions = options.map(option => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return {
      value: option.value ?? option.label ?? option,
      label: option.label ?? option.value ?? option,
      disabled: option.disabled ?? false,
      ...option
    };
  });

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? processedOptions.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : processedOptions;

  // Find selected option
  const selectedOption = processedOptions.find(option => option.value === value);

  // Handle option selection
  const handleSelect = (option) => {
    if (option.disabled) return;
    
    setIsOpen(false);
    setSearchTerm('');
    
    if (onSelect) {
      // Create synthetic event for compatibility
      const syntheticEvent = {
        target: { value: option.value, name },
        currentTarget: { value: option.value, name }
      };
      onSelect(syntheticEvent, option);
    }
  };

  // Toggle dropdown
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus search input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'ghost':
        return 'border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800';
      case 'filled':
        return 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800';
      default:
        return 'border-gray-300 bg-white dark:border-gray-600 dark:bg-[#0F0F0F]';
    }
  };

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[36px] px-3 py-1 text-sm';
      case 'lg':
        return 'min-h-[48px] px-4 py-3 text-lg';
      default:
        return 'min-h-[44px] px-3 py-2'; // iOS-optimized default size
    }
  };

  const triggerClasses = `
    ${getSizeStyles()}
    ${getVariantStyles()}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-blue-500'}
    relative flex items-center justify-between rounded-lg border transition-colors
    focus:outline-none focus:ring-2 focus:ring-opacity-50
    text-gray-900 dark:text-white
    ${className}
  `.trim();

  // Calculate dropdown position to prevent clipping
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // Approximate max height
      const spacing = 2; // Small gap between button and dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      const position = spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
      
      setDropdownPosition({
        position,
        top: position === 'top' ? buttonRect.top - dropdownHeight - spacing : buttonRect.bottom + spacing,
        left: buttonRect.left,
        width: buttonRect.width
      });
    }
  }, [isOpen]);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        name={name}
        className={triggerClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        <span className={`truncate ${!selectedOption && placeholder ? 'text-gray-500 dark:text-gray-400' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        {/* Dropdown Arrow */}
        <svg
          className={`ml-2 size-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

              {/* Dropdown Menu - Portal to avoid clipping */}
        {isOpen && createPortal(
          <div 
            className="fixed z-[1000] rounded-lg border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-[#0F0F0F]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 1000,
            }}
          >
          {/* Search Input for large option lists */}
          {processedOptions.length > 8 && (
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  className={`
                    w-full text-left text-sm transition-all duration-200
                    min-h-[44px] flex items-center justify-between
                    px-4 py-3 mx-1 my-0.5 rounded-md
                    ${option.disabled 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                    ${option.value === value 
                      ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800' 
                      : 'text-gray-900 dark:text-white hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                >
                  <span className="truncate font-medium">{option.label}</span>
                  {option.value === value && (
                    <svg className="ml-3 size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Error Message */}
      {error && (
        <div id={`${id}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

CustomDropdown.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        disabled: PropTypes.bool,
      })
    ])
  ).isRequired,
  placeholder: PropTypes.string,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'ghost', 'filled']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  required: PropTypes.bool,
  label: PropTypes.string,
  error: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
};

export default CustomDropdown; 