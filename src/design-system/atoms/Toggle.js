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
          {...props}
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
