import React from 'react';
import PropTypes from 'prop-types';

/**
 * NumberField Component
 * 
 * A specialized input field for numerical values with formatting options.
 */
const NumberField = ({ 
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  prefix = '',
  suffix = '',
  disabled = false,
  required = false,
  min,
  max,
  step = 'any',
  error,
  className = '',
  ...props
}) => {
  // Handle numeric input with validation
  const handleChange = (e) => {
    const { value } = e.target;
    
    // Less restrictive validation to allow more input patterns
    // Allow empty string, valid numbers, and numbers being typed (like '3.')
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      onChange({
        ...e,
        target: {
          ...e.target,
          name,
          value: value === '' ? '' : value
        }
      });
    }
  };

  return (
    <div className="relative w-full">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
          {prefix}
        </span>
      )}
      <input
        id={id}
        name={name}
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`
          w-full px-3 py-2 
          ${prefix ? 'pl-7' : ''}
          ${suffix ? 'pr-10' : ''}
          border ${error ? 'border-red-500 dark:border-red-400' : 'border-[#ffffff33] dark:border-[#ffffff1a]'}
          rounded-lg bg-white dark:bg-[#0F0F0F] 
          text-gray-900 dark:text-white text-sm
          focus:outline-none focus:ring-2 focus:ring-[#E6185C]/20 focus:border-[#E6185C]
          disabled:opacity-60 disabled:cursor-not-allowed
          placeholder-gray-500 dark:placeholder-gray-400
          transition-colors
          ${className}
        `}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
          {suffix}
        </span>
      )}
      {/* Error message is handled by FormField */}
    </div>
  );
};

NumberField.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  error: PropTypes.string,
  className: PropTypes.string
};

export default NumberField;
