import React from 'react';
import PropTypes from 'prop-types';
import FormLabel from '../atoms/FormLabel';
import TextField from '../atoms/TextField';
import NumberField from '../atoms/NumberField';

/**
 * FormField Component
 * 
 * A combined component that includes a label and an input field.
 */
const FormField = ({ 
  id,
  label,
  type = 'text',
  required = false,
  className = '',
  prefix,
  suffix,
  ...inputProps
}) => {
  const fieldId = id || `field-${inputProps.name}`;
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={fieldId} required={required}>
          {label}
        </FormLabel>
      )}
      
      {type === 'number' ? (
        <NumberField 
          id={fieldId}
          prefix={prefix}
          suffix={suffix}
          required={required}
          {...inputProps}
        />
      ) : (
        <TextField 
          id={fieldId}
          type={type}
          required={required}
          {...inputProps}
        />
      )}
    </div>
  );
};

FormField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  type: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  prefix: PropTypes.string,
  suffix: PropTypes.string
};

export default FormField;
