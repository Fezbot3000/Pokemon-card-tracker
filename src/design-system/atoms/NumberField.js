import React from 'react';
import PropTypes from 'prop-types';
import './NumberField.css';

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
  const handleChange = e => {
    const { value } = e.target;

    // Less restrictive validation to allow more input patterns
    // Allow empty string, valid numbers, and numbers being typed (like '3.')
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      onChange({
        ...e,
        target: {
          ...e.target,
          name,
          value: value === '' ? '' : value,
        },
      });
    }
  };

  const inputClass = `number-field__input ${
    error ? 'number-field__input--error' : ''
  } ${prefix ? 'number-field__input--with-prefix' : ''} ${
    suffix ? 'number-field__input--with-suffix' : ''
  } ${className}`;

  return (
    <div className="number-field">
      {prefix && (
        <span className="number-field__prefix">
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
        className={inputClass}
        {...props}
      />
      {suffix && (
        <span className="number-field__suffix">
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
  className: PropTypes.string,
};

export default NumberField;
