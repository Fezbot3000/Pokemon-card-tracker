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
  error,
  ...inputProps
}) => {
  const fieldId = id || `field-${inputProps.name}`;
  const hasError = !!error;

  return (
    <div
      className={`form-field w-full ${className} ${hasError ? 'error' : ''}`}
    >
      {label && (
        <FormLabel htmlFor={fieldId} required={required}>
          {label}
          {required && <span className="required">*</span>}
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
              error={error}
              {...inputProps}
            />
          ) : (
            <TextField
              id={fieldId}
              type={type}
              required={required}
              className="flex-1"
              error={error}
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
            <div className="mt-2 flex justify-end">{additionalContent}</div>
          )}
        </>
      )}
      {error && (
        <div className="mt-1 text-xs text-red-500 dark:text-red-400">
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
