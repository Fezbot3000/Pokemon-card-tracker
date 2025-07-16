import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../../design-system';

// Modern UI Components - Import directly from files with explicit extensions
import { Select, Option } from '../../../components/ui/select.tsx';
import { Checkbox } from '../../../components/ui/checkbox.tsx';
import { Radio, RadioGroup } from '../../../components/ui/radio.tsx';
import { Switch } from '../../../components/ui/switch.tsx';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../components/ui/tabs.tsx';
import {
  FormField as ModernFormField,
  FormItem,
  FormLabel as ModernFormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../../../components/ui/form-field.tsx';
import { Input as ModernInput } from '../../../components/ui/input.tsx';
import { Label as ModernLabel } from '../../../components/ui/label.tsx';

/**
 * ModernFormsSection - Displays modern form component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectValue - Select field value
 * @param {Object} props.checkboxes - Checkbox states
 * @param {string} props.radioValue - Radio button value
 * @param {Object} props.switchStates - Switch states
 * @param {string} props.activeModernTab - Active tab value
 * @param {string} props.modernInputValue - Modern input value
 * @param {string} props.modernInputError - Modern input error
 * @param {Function} props.handleSelectChange - Handler for select changes
 * @param {Function} props.handleCheckboxChange - Handler for checkbox changes
 * @param {Function} props.handleRadioChange - Handler for radio changes
 * @param {Function} props.handleSwitchChange - Handler for switch changes
 * @param {Function} props.handleModernTabChange - Handler for tab changes
 * @param {Function} props.handleModernInputChange - Handler for modern input changes
 */
const ModernFormsSection = ({
  selectValue,
  checkboxes,
  radioValue,
  switchStates,
  activeModernTab,
  modernInputValue,
  modernInputError,
  handleSelectChange,
  handleCheckboxChange,
  handleRadioChange,
  handleSwitchChange,
  handleModernTabChange,
  handleModernInputChange,
}) => {
  /**
   * Renders a modern form example
   * 
   * @param {string} title - Example title
   * @param {JSX.Element} element - Form element
   * @param {string} description - Example description
   * @returns {JSX.Element} Form example
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
   * Renders select field examples
   * 
   * @returns {JSX.Element} Select examples
   */
  const renderSelectExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select Fields
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderFormExample(
          'Basic Select',
          <Select value={selectValue} onValueChange={handleSelectChange}>
            <Option value="">Select an option</Option>
            <Option value="option1">Option 1</Option>
            <Option value="option2">Option 2</Option>
            <Option value="option3">Option 3</Option>
          </Select>,
          'Standard select dropdown with options'
        )}
        
        {renderFormExample(
          'Select with Label',
          <div className="space-y-2">
            <ModernLabel htmlFor="select-with-label">Choose an option</ModernLabel>
            <Select value={selectValue} onValueChange={handleSelectChange}>
              <Option value="">Select an option</Option>
              <Option value="option1">Option 1</Option>
              <Option value="option2">Option 2</Option>
              <Option value="option3">Option 3</Option>
            </Select>
          </div>,
          'Select with descriptive label'
        )}
      </div>
    </div>
  );

  /**
   * Renders checkbox examples
   * 
   * @returns {JSX.Element} Checkbox examples
   */
  const renderCheckboxExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Checkboxes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFormExample(
          'Basic Checkbox',
          <Checkbox
            checked={checkboxes.basic}
            onCheckedChange={(checked) => handleCheckboxChange('basic', checked)}
          />,
          'Simple checkbox input'
        )}
        
        {renderFormExample(
          'Checkbox with Label',
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={checkboxes.withLabel}
              onCheckedChange={(checked) => handleCheckboxChange('withLabel', checked)}
            />
            <ModernLabel htmlFor="checkbox-with-label">Accept terms and conditions</ModernLabel>
          </div>,
          'Checkbox with associated label'
        )}
        
        {renderFormExample(
          'Checkbox with Error',
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={checkboxes.error}
                onCheckedChange={(checked) => handleCheckboxChange('error', checked)}
              />
              <ModernLabel htmlFor="checkbox-error">Required field</ModernLabel>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">This field is required</p>
          </div>,
          'Checkbox with error state'
        )}
        
        {renderFormExample(
          'Checkbox with Success',
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={checkboxes.success}
              onCheckedChange={(checked) => handleCheckboxChange('success', checked)}
            />
            <ModernLabel htmlFor="checkbox-success">Email notifications</ModernLabel>
          </div>,
          'Checkbox in success state'
        )}
      </div>
    </div>
  );

  /**
   * Renders radio button examples
   * 
   * @returns {JSX.Element} Radio examples
   */
  const renderRadioExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Radio Buttons
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderFormExample(
          'Basic Radio Group',
          <RadioGroup value={radioValue} onValueChange={handleRadioChange}>
            <div className="flex items-center space-x-2">
              <Radio value="option1" id="radio1" />
              <ModernLabel htmlFor="radio1">Option 1</ModernLabel>
            </div>
            <div className="flex items-center space-x-2">
              <Radio value="option2" id="radio2" />
              <ModernLabel htmlFor="radio2">Option 2</ModernLabel>
            </div>
            <div className="flex items-center space-x-2">
              <Radio value="option3" id="radio3" />
              <ModernLabel htmlFor="radio3">Option 3</ModernLabel>
            </div>
          </RadioGroup>,
          'Radio button group with multiple options'
        )}
        
        {renderFormExample(
          'Radio with Description',
          <RadioGroup value={radioValue} onValueChange={handleRadioChange}>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Radio value="option1" id="radio-desc1" />
                <div>
                  <ModernLabel htmlFor="radio-desc1">Free Plan</ModernLabel>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Basic features included</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Radio value="option2" id="radio-desc2" />
                <div>
                  <ModernLabel htmlFor="radio-desc2">Pro Plan</ModernLabel>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Advanced features included</p>
                </div>
              </div>
            </div>
          </RadioGroup>,
          'Radio buttons with descriptive text'
        )}
      </div>
    </div>
  );

  /**
   * Renders switch examples
   * 
   * @returns {JSX.Element} Switch examples
   */
  const renderSwitchExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Switches
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFormExample(
          'Basic Switch',
          <Switch
            checked={switchStates.basic}
            onCheckedChange={(checked) => handleSwitchChange('basic', checked)}
          />,
          'Simple toggle switch'
        )}
        
        {renderFormExample(
          'Switch with Label',
          <div className="flex items-center space-x-2">
            <Switch
              checked={switchStates.withLabel}
              onCheckedChange={(checked) => handleSwitchChange('withLabel', checked)}
            />
            <ModernLabel htmlFor="switch-with-label">Enable notifications</ModernLabel>
          </div>,
          'Switch with associated label'
        )}
        
        {renderFormExample(
          'Switch with Success State',
          <div className="flex items-center space-x-2">
            <Switch
              checked={switchStates.success}
              onCheckedChange={(checked) => handleSwitchChange('success', checked)}
            />
            <ModernLabel htmlFor="switch-success">Auto-save enabled</ModernLabel>
          </div>,
          'Switch in success state'
        )}
        
        {renderFormExample(
          'Switch with Danger State',
          <div className="flex items-center space-x-2">
            <Switch
              checked={switchStates.danger}
              onCheckedChange={(checked) => handleSwitchChange('danger', checked)}
            />
            <ModernLabel htmlFor="switch-danger">Delete account</ModernLabel>
          </div>,
          'Switch in danger state'
        )}
      </div>
    </div>
  );

  /**
   * Renders tabs examples
   * 
   * @returns {JSX.Element} Tabs examples
   */
  const renderTabsExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Tabs
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {renderFormExample(
          'Basic Tabs',
          <Tabs value={activeModernTab} onValueChange={handleModernTabChange}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="p-4 border border-gray-200 dark:border-gray-700 rounded-b">
              <p>Content for tab 1</p>
            </TabsContent>
            <TabsContent value="tab2" className="p-4 border border-gray-200 dark:border-gray-700 rounded-b">
              <p>Content for tab 2</p>
            </TabsContent>
            <TabsContent value="tab3" className="p-4 border border-gray-200 dark:border-gray-700 rounded-b">
              <p>Content for tab 3</p>
            </TabsContent>
          </Tabs>,
          'Tab navigation with content panels'
        )}
      </div>
    </div>
  );

  /**
   * Renders modern form field examples
   * 
   * @returns {JSX.Element} Form field examples
   */
  const renderFormFieldExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Modern Form Fields
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderFormExample(
          'Basic Form Field',
          <ModernFormField>
            <FormItem>
              <ModernFormLabel>Email</ModernFormLabel>
              <FormControl>
                <ModernInput
                  type="email"
                  placeholder="Enter your email"
                  value={modernInputValue}
                  onChange={(e) => handleModernInputChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>
                We'll never share your email with anyone else.
              </FormDescription>
            </FormItem>
          </ModernFormField>,
          'Form field with label, input, and description'
        )}
        
        {renderFormExample(
          'Form Field with Error',
          <ModernFormField>
            <FormItem>
              <ModernFormLabel>Username</ModernFormLabel>
              <FormControl>
                <ModernInput
                  type="text"
                  placeholder="Enter username"
                  value={modernInputValue}
                  onChange={(e) => handleModernInputChange(e.target.value)}
                />
              </FormControl>
              {modernInputError && (
                <FormMessage>{modernInputError}</FormMessage>
              )}
            </FormItem>
          </ModernFormField>,
          'Form field with error message display'
        )}
      </div>
    </div>
  );

  /**
   * Renders form submission example
   * 
   * @returns {JSX.Element} Form submission example
   */
  const renderFormSubmissionExample = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Complete Form Example
      </h3>
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <ModernFormField>
            <FormItem>
              <ModernFormLabel>Full Name</ModernFormLabel>
              <FormControl>
                <ModernInput
                  type="text"
                  placeholder="Enter your full name"
                  value={modernInputValue}
                  onChange={(e) => handleModernInputChange(e.target.value)}
                />
              </FormControl>
            </FormItem>
          </ModernFormField>

          <ModernFormField>
            <FormItem>
              <ModernFormLabel>Email</ModernFormLabel>
              <FormControl>
                <ModernInput
                  type="email"
                  placeholder="Enter your email"
                />
              </FormControl>
            </FormItem>
          </ModernFormField>

          <ModernFormField>
            <FormItem>
              <ModernFormLabel>Plan</ModernFormLabel>
              <FormControl>
                <Select value={selectValue} onValueChange={handleSelectChange}>
                  <Option value="">Select a plan</Option>
                  <Option value="free">Free</Option>
                  <Option value="pro">Pro</Option>
                  <Option value="enterprise">Enterprise</Option>
                </Select>
              </FormControl>
            </FormItem>
          </ModernFormField>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={checkboxes.withLabel}
                onCheckedChange={(checked) => handleCheckboxChange('withLabel', checked)}
              />
              <ModernLabel>I agree to the terms and conditions</ModernLabel>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={switchStates.withLabel}
                onCheckedChange={(checked) => handleSwitchChange('withLabel', checked)}
              />
              <ModernLabel>Send me marketing emails</ModernLabel>
            </div>
          </div>

          <Button type="submit" variant="primary">
            Submit Form
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Modern Forms
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore modern form components built with the latest UI patterns and best practices. 
          These components provide enhanced user experience and accessibility.
        </p>
      </div>

      {/* Select Examples */}
      {renderSelectExamples()}

      {/* Checkbox Examples */}
      {renderCheckboxExamples()}

      {/* Radio Examples */}
      {renderRadioExamples()}

      {/* Switch Examples */}
      {renderSwitchExamples()}

      {/* Tabs Examples */}
      {renderTabsExamples()}

      {/* Form Field Examples */}
      {renderFormFieldExamples()}

      {/* Complete Form Example */}
      {renderFormSubmissionExample()}

      {/* Usage Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Modern Form Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Form Structure:</strong> Use consistent form field patterns with labels and descriptions
          </div>
          <div>
            <strong>Validation:</strong> Provide clear error messages and success states
          </div>
          <div>
            <strong>Accessibility:</strong> Ensure proper ARIA labels and keyboard navigation
          </div>
          <div>
            <strong>Responsive Design:</strong> Forms should work well on all screen sizes
          </div>
          <div>
            <strong>User Feedback:</strong> Provide immediate feedback for user interactions
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• All form elements are keyboard navigable</div>
          <div>• Proper ARIA labels and descriptions implemented</div>
          <div>• Error states are announced to screen readers</div>
          <div>• Focus management follows WCAG guidelines</div>
        </div>
      </div>
    </div>
  );
};

ModernFormsSection.propTypes = {
  selectValue: PropTypes.string.isRequired,
  checkboxes: PropTypes.object.isRequired,
  radioValue: PropTypes.string.isRequired,
  switchStates: PropTypes.object.isRequired,
  activeModernTab: PropTypes.string.isRequired,
  modernInputValue: PropTypes.string.isRequired,
  modernInputError: PropTypes.string.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
  handleRadioChange: PropTypes.func.isRequired,
  handleSwitchChange: PropTypes.func.isRequired,
  handleModernTabChange: PropTypes.func.isRequired,
  handleModernInputChange: PropTypes.func.isRequired,
};

export default ModernFormsSection; 