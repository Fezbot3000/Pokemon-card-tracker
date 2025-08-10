import React from 'react';
import PropTypes from 'prop-types';
import FormLabel from '../atoms/FormLabel';
import TextField from '../atoms/TextField';
import NumberField from '../atoms/NumberField';
import './FormField.css';

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
  error,
  ...inputProps
}) => {
  const fieldId = id || `field-${inputProps.name}`;
  const hasError = !!error;

  return (
    <div
      className={`form-field ${hasError ? 'form-field--error' : ''} ${className}`}
    >
      {label && (
        <FormLabel htmlFor={fieldId} required={required}>
          {label}
        </FormLabel>
      )}

      {additionalContentPosition === 'inline' ? (
        <div className="form-field__inline-wrapper">
          <div className="form-field__input-wrapper">
            {type === 'number' ? (
              <NumberField
                id={fieldId}
                prefix={prefix}
                suffix={suffix}
                required={required}
                error={error}
                {...inputProps}
              />
            ) : (
              <TextField
                id={fieldId}
                type={type}
                required={required}
                error={error}
                {...inputProps}
              />
            )}
          </div>
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
              error={error}
              {...inputProps}
            />
          ) : (
            <TextField
              id={fieldId}
              type={type}
              required={required}
              error={error}
              {...inputProps}
            />
          )}

          {additionalContent && (
            <div className="form-field__additional-content">{additionalContent}</div>
          )}
        </>
      )}
      {error && (
        <div className="form-field__error">
          {error}
        </div>
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
  additionalContentPosition: PropTypes.oneOf(['inline', 'below']),
  error: PropTypes.string,
};

export default FormField;
