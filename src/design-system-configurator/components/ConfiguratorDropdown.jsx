import React, { useState } from 'react';
import Dropdown, { DropdownItem } from '../../design-system/molecules/Dropdown';
import Icon from '../../design-system/atoms/Icon';

const ConfiguratorDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  width = '120px',
  style = {},
  disabled = false,
  config = {},
  colors = {},
  getSurfaceStyle,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Fallback styles when styling functions are not provided
  const getFallbackSurfaceStyle = (variant) => {
    if (getSurfaceStyle) return getSurfaceStyle(variant);
    return {
      backgroundColor: variant === 'secondary' ? (colors?.surfaceSecondary || '#f8f9fa') : (colors?.surface || '#ffffff'),
      color: colors?.textPrimary || '#000000'
    };
  };

  const getFallbackTypographyStyle = (variant) => {
    if (getTypographyStyle) return getTypographyStyle(variant);
    return {
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.5'
    };
  };

  const getFallbackTextColorStyle = (variant) => {
    if (getTextColorStyle) return getTextColorStyle(variant);
    return {
      color: colors?.textPrimary || '#000000'
    };
  };

  const getFallbackBackgroundColorStyle = (variant) => {
    if (getBackgroundColorStyle) return getBackgroundColorStyle(variant);
    return {
      backgroundColor: variant === 'surfaceSecondary' ? (colors?.surfaceSecondary || '#f8f9fa') : (colors?.surface || '#ffffff')
    };
  };

  // Dropdown trigger component
  const trigger = (
    <div 
      className={`flex w-full items-center justify-between rounded-md p-2 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        ...getFallbackSurfaceStyle('secondary'),
        ...getFallbackTypographyStyle('body'),
        ...getFallbackTextColorStyle('primary'),
        border: `${config?.components?.buttons?.borderWidth || '0.5px'} solid ${colors?.border || '#e5e7eb'}`,
        '--tw-ring-color': `${colors?.primary || '#3b82f6'}33`,
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : { cursor: 'pointer' }),
        ...(!disabled && {
          ':hover': getFallbackBackgroundColorStyle('surfaceSecondary')
        })
      }}
    >
      <span className="flex-1 truncate text-sm">
        {selectedOption?.label || placeholder}
      </span>
      <Icon 
        name={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} 
        className={`transition-transform ${disabled ? 'opacity-50' : ''}`}
      />
    </div>
  );

  return (
    <Dropdown
      trigger={trigger}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width="auto"
      className="min-w-0"
      useMobileSheet={false}
      {...props}
    >
      {options.map(option => (
        <DropdownItem
          key={option.value}
          onClick={() => {
            if (!disabled) {
              onChange(option.value);
              setIsOpen(false);
            }
          }}
          style={{
            ...getFallbackSurfaceStyle('secondary'),
            ...getFallbackTextColorStyle('primary'),
            ...(selectedOption?.value === option.value ? getFallbackBackgroundColorStyle('surfaceSecondary') : {})
          }}
        >
          {option.label}
          {selectedOption?.value === option.value && (
            <Icon name="check" className="ml-auto text-primary" />
          )}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};

export default ConfiguratorDropdown; 