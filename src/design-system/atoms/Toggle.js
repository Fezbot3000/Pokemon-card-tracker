import React from 'react';
import PropTypes from 'prop-types';
import './Toggle.css';

/**
 * Toggle Switch Component
 *
 * A customizable toggle switch for boolean inputs.
 */
const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  label,
  id,
  name,
  size = 'md',
  className = '',
  labelPosition,
  ...props
}) => {
  const toggleClass = `toggle ${disabled ? 'toggle--disabled' : ''} ${className}`;
  const trackClass = `toggle__track toggle__track--${size} ${
    checked ? 'toggle__track--checked' : 'toggle__track--unchecked'
  }`;
  const circleClass = `toggle__circle toggle__circle--${size} ${
    checked ? 'toggle__circle--checked' : ''
  }`;
  const labelClass = `toggle__label toggle__label--${size}`;

  // Filter out non-DOM props to prevent React warnings
  const inputProps = Object.keys(props).reduce((acc, key) => {
    // Only include props that are valid for input elements
    const validInputProps = [
      'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-invalid',
      'aria-required', 'aria-checked', 'aria-disabled', 'aria-readonly',
      'data-*', 'tabIndex', 'autoFocus', 'form', 'required', 'readOnly',
      'placeholder', 'maxLength', 'minLength', 'pattern', 'title'
    ];
    
    if (validInputProps.includes(key) || key.startsWith('data-') || key.startsWith('aria-')) {
      acc[key] = props[key];
    }
    return acc;
  }, {});

  return (
    <label className={toggleClass}>
      <div className="toggle__wrapper">
        <input
          type="checkbox"
          className="toggle__input"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          id={id}
          name={name}
          {...inputProps}
        />
        <div className={trackClass} />
        <div className={circleClass} />
      </div>
      {label && (
        <span className={labelClass}>
          {label}
        </span>
      )}
    </label>
  );
};

Toggle.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.node,
  id: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default Toggle;
