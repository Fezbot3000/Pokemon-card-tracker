import React from 'react';
import PropTypes from 'prop-types';

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
  // Define sizes
  const sizes = {
    sm: {
      toggle: 'w-8 h-4',
      circle: 'w-3 h-3',
      translate: 'translate-x-4',
      text: 'text-sm'
    },
    md: {
      toggle: 'w-11 h-6',
      circle: 'w-5 h-5',
      translate: 'translate-x-5',
      text: 'text-base'
    },
    lg: {
      toggle: 'w-14 h-7',
      circle: 'w-6 h-6',
      translate: 'translate-x-7',
      text: 'text-lg'
    }
  };

  const currentSize = sizes[size] || sizes.md;
  
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          id={id}
          name={name}
          {...props}
        />
        <div
          className={`${currentSize.toggle} ${checked ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777]' : 'bg-gray-200 dark:bg-gray-700'} 
                      rounded-full transition-colors duration-200 ease-in-out`}
        />
        <div
          className={`absolute top-0.5 left-0.5 ${currentSize.circle} bg-white rounded-full 
                      shadow transform transition-transform duration-200 ease-in-out
                      ${checked ? currentSize.translate : 'translate-x-0'}`}
        />
      </div>
      {label && (
        <span className={`ml-3 ${currentSize.text} text-gray-900 dark:text-gray-100`}>
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
  className: PropTypes.string
};

export default Toggle;
