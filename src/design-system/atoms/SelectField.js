import React from 'react';
import PropTypes from 'prop-types';
import FormLabel from './FormLabel';
import './SelectField.css';

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
  testId, // Extract testId to handle it properly
  ...props
}) => {
  const fieldId = id || `field-${name}`;
  const selectClass = `select-field__select ${
    error ? 'select-field__select--error' : ''
  }`;

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

  const handleChange = event => {
    if (event.target.value === '__add_new__') {
      handleAddCustomOption();
    } else {
      onChange(event);
    }
  };

  return (
    <div className={`select-field ${className}`}>
      {label && (
        <FormLabel htmlFor={fieldId} required={required}>
          {label}
        </FormLabel>
      )}
      <div className="select-field__wrapper">
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={selectClass}
          data-testid={testId}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {/* Render options from props if provided */}
          {options &&
            options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          {/* Or render children directly */}
          {children}
          {/* Add a special option for adding a new item */}
          {allowCustomOptions && (
            <option value="__add_new__">+ Add new...</option>
          )}
        </select>
        {/* Custom dropdown arrow */}
        <span className="select-field__arrow">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {error && (
          <p className="select-field__error">{error}</p>
        )}
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
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
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
  testId: PropTypes.string,
};

export default SelectField;
