import React from 'react';
import PropTypes from 'prop-types';
import { 
  FormLabel, 
  TextField, 
  NumberField, 
  ImageUpload, 
  Toggle,
  Button 
} from '../../../design-system';

/**
 * FormElementsSection - Displays form element component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {string} props.textValue - Text field value
 * @param {number} props.numberValue - Number field value
 * @param {string} props.errorText - Text field error
 * @param {string} props.errorNumber - Number field error
 * @param {Function} props.handleTextChange - Handler for text changes
 * @param {Function} props.handleNumberChange - Handler for number changes
 * @param {Object} props.toggleStates - Toggle states
 * @param {Function} props.handleToggleChange - Handler for toggle changes
 */
const FormElementsSection = ({
  textValue,
  numberValue,
  errorText,
  errorNumber,
  handleTextChange,
  handleNumberChange,
  toggleStates,
  handleToggleChange,
}) => {
  /**
   * Renders a form element example
   * 
   * @param {string} title - Example title
   * @param {JSX.Element} element - Form element
   * @param {string} description - Example description
   * @returns {JSX.Element} Form element example
   */
  const renderFormExample = (title, element, description) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {title}
      </h4>
      <div className="mb-3">
        {element}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );

  /**
   * Renders text field variations
   * 
   * @returns {JSX.Element} Text field examples
   */
  const renderTextFieldExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Text Fields
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFormExample(
          'Basic Text Field',
          <TextField
            value={textValue}
            onChange={handleTextChange}
            placeholder="Enter text..."
            label="Text Input"
          />,
          'Standard text input with label and placeholder'
        )}
        
        {renderFormExample(
          'Text Field with Error',
          <TextField
            value={textValue}
            onChange={handleTextChange}
            placeholder="Enter text..."
            label="Text Input"
            error={errorText}
          />,
          'Text input with validation error display'
        )}
        
        {renderFormExample(
          'Required Text Field',
          <TextField
            value={textValue}
            onChange={handleTextChange}
            placeholder="Enter text..."
            label="Required Text Input"
            required
          />,
          'Required field with validation indicator'
        )}
        
        {renderFormExample(
          'Disabled Text Field',
          <TextField
            value="Disabled value"
            onChange={() => {}}
            placeholder="Enter text..."
            label="Disabled Text Input"
            disabled
          />,
          'Disabled state for read-only content'
        )}
        
        {renderFormExample(
          'Text Field with Icon',
          <TextField
            value={textValue}
            onChange={handleTextChange}
            placeholder="Search..."
            label="Search Input"
            icon="search"
          />,
          'Text input with leading icon'
        )}
        
        {renderFormExample(
          'Large Text Field',
          <TextField
            value={textValue}
            onChange={handleTextChange}
            placeholder="Enter text..."
            label="Large Text Input"
            size="lg"
          />,
          'Large size variant for prominent inputs'
        )}
      </div>
    </div>
  );

  /**
   * Renders number field variations
   * 
   * @returns {JSX.Element} Number field examples
   */
  const renderNumberFieldExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Number Fields
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFormExample(
          'Basic Number Field',
          <NumberField
            value={numberValue}
            onChange={handleNumberChange}
            placeholder="0"
            label="Number Input"
          />,
          'Standard number input with label'
        )}
        
        {renderFormExample(
          'Number Field with Error',
          <NumberField
            value={numberValue}
            onChange={handleNumberChange}
            placeholder="0"
            label="Number Input"
            error={errorNumber}
          />,
          'Number input with validation error'
        )}
        
        {renderFormExample(
          'Number Field with Min/Max',
          <NumberField
            value={numberValue}
            onChange={handleNumberChange}
            placeholder="0"
            label="Number Input (0-100)"
            min={0}
            max={100}
          />,
          'Number input with range constraints'
        )}
        
        {renderFormExample(
          'Currency Number Field',
          <NumberField
            value={numberValue}
            onChange={handleNumberChange}
            placeholder="0.00"
            label="Price"
            prefix="$"
            decimals={2}
          />,
          'Number input with currency formatting'
        )}
        
        {renderFormExample(
          'Percentage Number Field',
          <NumberField
            value={numberValue}
            onChange={handleNumberChange}
            placeholder="0"
            label="Percentage"
            suffix="%"
            max={100}
          />,
          'Number input with percentage suffix'
        )}
        
        {renderFormExample(
          'Disabled Number Field',
          <NumberField
            value={42}
            onChange={() => {}}
            placeholder="0"
            label="Disabled Number Input"
            disabled
          />,
          'Disabled number input state'
        )}
      </div>
    </div>
  );

  /**
   * Renders toggle variations
   * 
   * @returns {JSX.Element} Toggle examples
   */
  const renderToggleExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Toggles
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFormExample(
          'Basic Toggle',
          <Toggle
            checked={toggleStates.default}
            onChange={(checked) => handleToggleChange('default', checked)}
            label="Basic Toggle"
          />,
          'Simple toggle switch'
        )}
        
        {renderFormExample(
          'Toggle with Description',
          <Toggle
            checked={toggleStates.withLabel}
            onChange={(checked) => handleToggleChange('withLabel', checked)}
            label="Notifications"
            description="Receive email notifications"
          />,
          'Toggle with descriptive text'
        )}
        
        {renderFormExample(
          'Disabled Toggle',
          <Toggle
            checked={toggleStates.disabled}
            onChange={(checked) => handleToggleChange('disabled', checked)}
            label="Disabled Toggle"
            disabled
          />,
          'Disabled toggle state'
        )}
        
        {renderFormExample(
          'Small Toggle',
          <Toggle
            checked={toggleStates.small}
            onChange={(checked) => handleToggleChange('small', checked)}
            label="Small Toggle"
            size="sm"
          />,
          'Small size variant'
        )}
        
        {renderFormExample(
          'Large Toggle',
          <Toggle
            checked={toggleStates.large}
            onChange={(checked) => handleToggleChange('large', checked)}
            label="Large Toggle"
            size="lg"
          />,
          'Large size variant'
        )}
        
        {renderFormExample(
          'Toggle with Icon',
          <Toggle
            checked={toggleStates.medium}
            onChange={(checked) => handleToggleChange('medium', checked)}
            label="Dark Mode"
            icon="moon"
          />,
          'Toggle with contextual icon'
        )}
      </div>
    </div>
  );

  /**
   * Renders image upload examples
   * 
   * @returns {JSX.Element} Image upload examples
   */
  const renderImageUploadExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Image Upload
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderFormExample(
          'Basic Image Upload',
          <ImageUpload
            onImageSelect={(file) => console.log('Image selected:', file)}
            label="Upload Image"
            accept="image/*"
          />,
          'Standard image upload with drag & drop'
        )}
        
        {renderFormExample(
          'Image Upload with Preview',
          <ImageUpload
            onImageSelect={(file) => console.log('Image selected:', file)}
            label="Upload with Preview"
            accept="image/*"
            showPreview
            maxSize={5 * 1024 * 1024} // 5MB
          />,
          'Image upload with preview and size limit'
        )}
        
        {renderFormExample(
          'Multiple Image Upload',
          <ImageUpload
            onImageSelect={(files) => console.log('Images selected:', files)}
            label="Upload Multiple Images"
            accept="image/*"
            multiple
            maxFiles={5}
          />,
          'Multiple image upload with file limit'
        )}
        
        {renderFormExample(
          'Disabled Image Upload',
          <ImageUpload
            onImageSelect={() => {}}
            label="Disabled Upload"
            accept="image/*"
            disabled
          />,
          'Disabled upload state'
        )}
      </div>
    </div>
  );

  /**
   * Renders form validation examples
   * 
   * @returns {JSX.Element} Validation examples
   */
  const renderValidationExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Form Validation
      </h3>
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-3">
          Real-time Validation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TextField
              value={textValue}
              onChange={handleTextChange}
              placeholder="Enter at least 3 characters..."
              label="Text Validation"
              error={errorText}
            />
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {errorText ? 'Error: ' + errorText : 'Valid input'}
            </p>
          </div>
          <div>
            <NumberField
              value={numberValue}
              onChange={handleNumberChange}
              placeholder="Enter positive number..."
              label="Number Validation"
              error={errorNumber}
            />
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {errorNumber ? 'Error: ' + errorNumber : 'Valid input'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Form Elements
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore form input components and their variations. Form elements are the building 
          blocks for user data collection and interaction.
        </p>
      </div>

      {/* Text Field Examples */}
      {renderTextFieldExamples()}

      {/* Number Field Examples */}
      {renderNumberFieldExamples()}

      {/* Toggle Examples */}
      {renderToggleExamples()}

      {/* Image Upload Examples */}
      {renderImageUploadExamples()}

      {/* Validation Examples */}
      {renderValidationExamples()}

      {/* Form Element Anatomy */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Form Element Anatomy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">Label</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Label</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Descriptive text for the field</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">Input</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Input Field</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">User data entry area</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">Icon</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Icon</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Visual indicator or action</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">Error</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Error State</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Validation feedback</p>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Form Element Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Labels:</strong> Always provide clear, descriptive labels for all form fields
          </div>
          <div>
            <strong>Validation:</strong> Provide real-time feedback for user input errors
          </div>
          <div>
            <strong>Placeholders:</strong> Use helpful placeholder text to guide user input
          </div>
          <div>
            <strong>Accessibility:</strong> Ensure all form elements are keyboard navigable
          </div>
          <div>
            <strong>Consistency:</strong> Use consistent styling and behavior across all form elements
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• All form elements are keyboard accessible</div>
          <div>• Proper ARIA labels and descriptions implemented</div>
          <div>• Error states are announced to screen readers</div>
          <div>• Focus indicators visible for keyboard navigation</div>
        </div>
      </div>
    </div>
  );
};

FormElementsSection.propTypes = {
  textValue: PropTypes.string.isRequired,
  numberValue: PropTypes.number.isRequired,
  errorText: PropTypes.string.isRequired,
  errorNumber: PropTypes.string.isRequired,
  handleTextChange: PropTypes.func.isRequired,
  handleNumberChange: PropTypes.func.isRequired,
  toggleStates: PropTypes.object.isRequired,
  handleToggleChange: PropTypes.func.isRequired,
};

export default FormElementsSection; 