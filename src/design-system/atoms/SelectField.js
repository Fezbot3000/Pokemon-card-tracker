import React from 'react';
import PropTypes from 'prop-types';
import FormLabel from './FormLabel'; // Assuming FormLabel is in the same directory

/**
 * SelectField Component
 *
 * Renders a styled HTML <select> element with a label.
 * Supports both options prop and direct children (option elements)
 */
const SelectField = ({
  id,
  label,
  name,
  value,
  onChange,
  options, // Expects array of { value: string, label: string }
  required = false,
  disabled = false,
  className = '',
  placeholder, // Optional placeholder text
  error, // Optional error message/indicator
  children, // Support direct option elements as children
  allowCustomOptions = false, // Allow user to add custom options
  onAddOption = null, // Callback for adding a new option
  ...props
}) => {
  const fieldId = id || `field-${name}`;
  const selectClasses = `
    w-full px-3 py-2
    border ${error ? 'border-red-500' : 'border-[#ffffff33] dark:border-[#ffffff1a]'}
    rounded-lg bg-white dark:bg-[#0F0F0F]
    text-gray-900 dark:text-white text-sm
    focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)]
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-colors
    appearance-none // Hide default arrow
    bg-no-repeat bg-right-center bg-[length:1.5em_1.5em]
    pr-8 // Add padding for custom arrow space
  `;

  // Handler for adding custom option
  const handleAddCustomOption = () => {
    const newOption = prompt('Enter new value:');
    if (newOption && newOption.trim() !== '') {
      if (onAddOption) {
        onAddOption(newOption.trim());
      }
      // Set the new value in the select
      const event = { target: { name, value: newOption.trim() } };
      onChange(event);
    }
  };

  const handleChange = (event) => {
    if (event.target.value === '__add_new__') {
      handleAddCustomOption();
    } else {
      onChange(event);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={fieldId} required={required}>
          {label}
        </FormLabel>
      )}
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={selectClasses}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {/* Render options from props if provided */}
          {options && options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {/* Or render children directly */}
          {children}
          {/* Add a special option for adding a new item */}
          {allowCustomOptions && <option value="__add_new__">+ Add new...</option>}
        </select>
        {/* Custom dropdown arrow */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
};

SelectField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  children: PropTypes.node,
  allowCustomOptions: PropTypes.bool,
  onAddOption: PropTypes.func,
};

export default SelectField;
