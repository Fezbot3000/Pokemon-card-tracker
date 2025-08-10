import React from 'react';
import PropTypes from 'prop-types';
import './TextField.css';

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
  const inputClass = `text-field__input ${
    error ? 'text-field__input--error' : ''
  } ${multiline ? 'text-field__input--multiline' : ''} ${className}`;

  return (
    <div className="text-field">
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
          className={inputClass}
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
          className={inputClass}
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
  rows: PropTypes.number,
};

export default TextField;
