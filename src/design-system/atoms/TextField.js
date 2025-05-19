import React from 'react';
import PropTypes from 'prop-types';

/**
 * TextField Component
 * 
 * A consistent text input field with appropriate styling.
 */
const TextField = ({ 
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  error,
  className = '',
  multiline = false,
  rows = 3,
  ...props
}) => {
  const inputClasses = `
    w-full px-3 py-2 
    border ${error ? 'border-red-500 dark:border-red-400' : 'border-[#ffffff33] dark:border-[#ffffff1a]'}
    rounded-lg bg-white dark:bg-[#0F0F0F] 
    text-gray-900 dark:text-white text-sm
    focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)]
    disabled:opacity-60 disabled:cursor-not-allowed
    placeholder-gray-500 dark:placeholder-gray-400
    transition-colors
    ${className}
  `;

  return (
    <div className="w-full">
      {multiline ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
          {...props}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={inputClasses}
          {...props}
        />
      )}
      {/* Error message is handled by FormField */}
    </div>
  );
};

TextField.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
  multiline: PropTypes.bool,
  rows: PropTypes.number
};

export default TextField;
