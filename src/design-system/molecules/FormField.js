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
  additionalContent,
  additionalContentPosition = 'inline', // 'inline' or 'below'
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
      
      {additionalContentPosition === 'inline' ? (
        <div className="flex items-center gap-2">
          {type === 'number' ? (
            <NumberField 
              id={fieldId}
              prefix={prefix}
              suffix={suffix}
              required={required}
              className="flex-1"
              {...inputProps}
            />
          ) : (
            <TextField 
              id={fieldId}
              type={type}
              required={required}
              className="flex-1"
              {...inputProps}
            />
          )}
          
          {additionalContent}
        </div>
      ) : (
        <>
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
          
          {additionalContent && (
            <div className="mt-2 flex justify-end">
              {additionalContent}
            </div>
          )}
        </>
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
  suffix: PropTypes.string,
  additionalContent: PropTypes.node,
  additionalContentPosition: PropTypes.oneOf(['inline', 'below'])
};

export default FormField;
