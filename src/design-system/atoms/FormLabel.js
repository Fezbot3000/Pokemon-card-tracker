import React from 'react';
import PropTypes from 'prop-types';

/**
 * FormLabel Component
 * 
 * A consistent label for form fields with appropriate styling.
 */
const FormLabel = ({ children, htmlFor, required, className = '' }) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

FormLabel.propTypes = {
  children: PropTypes.node.isRequired,
  htmlFor: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string
};

export default FormLabel;
