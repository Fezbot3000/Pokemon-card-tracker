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
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Dropdown trigger component
  const trigger = (
    <div 
      className={`flex w-full items-center justify-between rounded-md p-2 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
      }`}
      style={{
        minWidth: width,
        ...style
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
          className={selectedOption?.value === option.value ? 'bg-gray-100 dark:bg-gray-800' : ''}
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