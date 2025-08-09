import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './CustomDropdown.css';

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

  // Build button classes
  const buttonClasses = [
    'dropdown__trigger',
    `dropdown__trigger--${size}`,
    `dropdown__trigger--${variant}`,
    isOpen && 'dropdown__trigger--open',
    disabled && 'dropdown__trigger--disabled',
    error && 'dropdown__trigger--error',
    !fullWidth && 'dropdown__trigger--auto-width'
  ].filter(Boolean).join(' ');

  const dropdownContent = (
    <div
      ref={portalRef}
      className="dropdown__menu"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 60000
      }}
    >
      {/* Search input for large option lists */}
      {showSearch && options.length > 5 && (
        <div className="dropdown__search">
          <input
            ref={inputRef}
            type="text"
            className="dropdown__search-input"
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
          <div className="dropdown__no-options">
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
                className={`dropdown__option ${isSelected ? 'dropdown__option--selected' : ''}`}
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
    <div className={`dropdown ${disabled ? 'dropdown--disabled' : ''} ${error ? 'dropdown--error' : ''} ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id || name}
          className="dropdown__label"
        >
          {label}
          {required && <span className="dropdown__required">*</span>}
        </label>
      )}

      {/* Dropdown trigger */}
      <div ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          className={buttonClasses}
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
          <span className={`dropdown__value ${!value ? 'dropdown__placeholder' : ''}`}>
            {getDisplayText()}
          </span>
          
          {/* Dropdown arrow */}
          <svg 
            className={`dropdown__chevron ${isOpen ? 'dropdown__chevron--open' : ''}`} 
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
        <p id={`${id || name}-error`} className="dropdown__error">
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
