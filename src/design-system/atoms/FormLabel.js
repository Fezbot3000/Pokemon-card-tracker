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
      className={`mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200 ${className}`}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
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
