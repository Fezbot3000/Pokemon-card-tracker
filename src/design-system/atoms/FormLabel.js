import React from 'react';
import PropTypes from 'prop-types';
import './FormLabel.css';

/**
 * FormLabel Component
 *
 * A consistent label for form fields with appropriate styling.
 */
const FormLabel = ({ children, htmlFor, required, className = '' }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`form-label ${className}`}
    >
      {children}
      {required && <span className="form-label__required">*</span>}
    </label>
  );
};

FormLabel.propTypes = {
  children: PropTypes.node.isRequired,
  htmlFor: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};

export default FormLabel;
