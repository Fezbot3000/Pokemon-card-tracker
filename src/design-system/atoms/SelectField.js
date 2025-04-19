import React from 'react';
import PropTypes from 'prop-types';
import FormLabel from './FormLabel'; // Assuming FormLabel is in the same directory

/**
 * SelectField Component
 *
 * Renders a styled HTML <select> element with a label.
 */
const SelectField = ({
  id,
  label,
  name,
  value,
  onChange,
  options = [], // Expects array of { value: string, label: string }
  required = false,
  disabled = false,
  className = '',
  placeholder, // Optional placeholder text
  error, // Optional error message/indicator
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
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={selectClasses}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
  ).isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
};

export default SelectField;
