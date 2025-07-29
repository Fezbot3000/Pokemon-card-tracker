import React from 'react';
import PropTypes from 'prop-types';
import { Button, Icon } from '../../../design-system';

/**
 * ButtonSection - Displays button component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {Object} props.toggleStates - Toggle states for button examples
 * @param {Function} props.handleToggleChange - Handler for toggle changes
 */
const ButtonSection = ({ toggleStates, handleToggleChange }) => {
  /**
   * Renders a button example group
   * 
   * @param {string} title - Group title
   * @param {Array} buttons - Array of button configurations
   * @returns {JSX.Element} Button group
   */
  const renderButtonGroup = (title, buttons) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buttons.map((button, index) => (
          <div
            key={index}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="mb-3">
              <Button
                variant={button.variant}
                size={button.size}
                disabled={button.disabled}
                onClick={() => {/* console.log(`${button.variant} button clicked`) */}}
                className={button.className}
              >
                {button.icon && <Icon name={button.icon} className="w-4 h-4 mr-2" />}
                {button.text}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {button.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                variant="{button.variant}" size="{button.size}"
                {button.disabled ? ' disabled' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Renders interactive button examples
   * 
   * @returns {JSX.Element} Interactive examples
   */
  const renderInteractiveExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Interactive Examples
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Toggle with Label */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              With Label
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleChange('withLabel', !toggleStates.withLabel)}
            >
              {toggleStates.withLabel ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <Button
            variant="primary"
            disabled={!toggleStates.withLabel}
            onClick={() => {/* console.log('Interactive button clicked') */}}
          >
            Interactive Button
          </Button>
        </div>

        {/* Size Variations */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Size Variations
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Small</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleChange('small', !toggleStates.small)}
              >
                {toggleStates.small ? 'On' : 'Off'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Medium</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleChange('medium', !toggleStates.medium)}
              >
                {toggleStates.medium ? 'On' : 'Off'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Large</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleChange('large', !toggleStates.large)}
              >
                {toggleStates.large ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {toggleStates.small && (
              <Button size="sm" variant="primary">
                Small Button
              </Button>
            )}
            {toggleStates.medium && (
              <Button size="md" variant="primary">
                Medium Button
              </Button>
            )}
            {toggleStates.large && (
              <Button size="lg" variant="primary">
                Large Button
              </Button>
            )}
          </div>
        </div>

        {/* Disabled State */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Disabled State
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleChange('disabled', !toggleStates.disabled)}
            >
              {toggleStates.disabled ? 'Disabled' : 'Enabled'}
            </Button>
          </div>
          <Button
            variant="primary"
            disabled={toggleStates.disabled}
            onClick={() => {/* console.log('Button clicked') */}}
          >
            {toggleStates.disabled ? 'Disabled Button' : 'Enabled Button'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Buttons
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore button variations, sizes, and interactive states. Buttons are the primary 
          way users interact with the interface.
        </p>
      </div>

      {/* Primary Buttons */}
      {renderButtonGroup('Primary Buttons', [
        { variant: 'primary', size: 'md', text: 'Primary Button', label: 'Primary' },
        { variant: 'primary', size: 'md', text: 'Primary with Icon', label: 'Primary with Icon', icon: 'plus' },
        { variant: 'primary', size: 'md', text: 'Primary Disabled', label: 'Primary Disabled', disabled: true },
      ])}

      {/* Secondary Buttons */}
      {renderButtonGroup('Secondary Buttons', [
        { variant: 'secondary', size: 'md', text: 'Secondary Button', label: 'Secondary' },
        { variant: 'secondary', size: 'md', text: 'Secondary with Icon', label: 'Secondary with Icon', icon: 'settings' },
        { variant: 'secondary', size: 'md', text: 'Secondary Disabled', label: 'Secondary Disabled', disabled: true },
      ])}

      {/* Outline Buttons */}
      {renderButtonGroup('Outline Buttons', [
        { variant: 'outline', size: 'md', text: 'Outline Button', label: 'Outline' },
        { variant: 'outline', size: 'md', text: 'Outline with Icon', label: 'Outline with Icon', icon: 'download' },
        { variant: 'outline', size: 'md', text: 'Outline Disabled', label: 'Outline Disabled', disabled: true },
      ])}

      {/* Ghost Buttons */}
      {renderButtonGroup('Ghost Buttons', [
        { variant: 'ghost', size: 'md', text: 'Ghost Button', label: 'Ghost' },
        { variant: 'ghost', size: 'md', text: 'Ghost with Icon', label: 'Ghost with Icon', icon: 'heart' },
        { variant: 'ghost', size: 'md', text: 'Ghost Disabled', label: 'Ghost Disabled', disabled: true },
      ])}

      {/* Size Variations */}
      {renderButtonGroup('Size Variations', [
        { variant: 'primary', size: 'sm', text: 'Small Button', label: 'Small' },
        { variant: 'primary', size: 'md', text: 'Medium Button', label: 'Medium' },
        { variant: 'primary', size: 'lg', text: 'Large Button', label: 'Large' },
      ])}

      {/* Interactive Examples */}
      {renderInteractiveExamples()}

      {/* Usage Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Button Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Primary:</strong> Use for main actions and primary user flows
          </div>
          <div>
            <strong>Secondary:</strong> Use for secondary actions and alternative options
          </div>
          <div>
            <strong>Outline:</strong> Use for less prominent actions and form submissions
          </div>
          <div>
            <strong>Ghost:</strong> Use for subtle actions and navigation elements
          </div>
          <div>
            <strong>Sizes:</strong> Use consistent sizing within the same interface section
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• All buttons are keyboard accessible</div>
          <div>• Proper ARIA labels and roles implemented</div>
          <div>• Focus indicators visible for keyboard navigation</div>
          <div>• Disabled states clearly communicated to screen readers</div>
        </div>
      </div>
    </div>
  );
};

ButtonSection.propTypes = {
  toggleStates: PropTypes.object.isRequired,
  handleToggleChange: PropTypes.func.isRequired,
};

export default ButtonSection; 