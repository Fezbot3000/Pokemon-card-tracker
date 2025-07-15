import { useState } from 'react';
import { useTheme } from '../../design-system';
import { useComponentNavigation } from './useComponentNavigation';
import { useColorCustomizer } from './useColorCustomizer';

/**
 * Main custom hook for Component Library state management
 * 
 * @returns {Object} Complete component library state and handlers
 */
export const useComponentLibrary = () => {
  const { theme, toggleTheme } = useTheme();
  const navigation = useComponentNavigation();
  const colorCustomizer = useColorCustomizer();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCardDetailsModalOpen, setIsCardDetailsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Form element states
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [errorNumber, setErrorNumber] = useState('');

  // Dropdown states
  const [dropdownIsOpen, setDropdownIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Select an option');

  // Toggle states
  const [toggleStates, setToggleStates] = useState({
    default: false,
    withLabel: true,
    small: false,
    medium: true,
    large: false,
    disabled: true,
  });

  // Sold items state
  const [soldItems, setSoldItems] = useState([]);

  // Modern form component states
  const [selectValue, setSelectValue] = useState('');
  const [checkboxes, setCheckboxes] = useState({
    basic: false,
    withLabel: true,
    error: false,
    success: true,
  });
  const [radioValue, setRadioValue] = useState('option1');
  const [switchStates, setSwitchStates] = useState({
    basic: false,
    withLabel: true,
    success: false,
    danger: true,
  });
  const [activeModernTab, setActiveModernTab] = useState('tab1');
  const [modernInputValue, setModernInputValue] = useState('');
  const [modernInputError, setModernInputError] = useState('');

  // Mock handlers for component examples
  const handleMockLogin = ({ email, password, rememberMe }) => {
    console.log('Mock login:', { email, password, rememberMe });
    setIsLoginModalOpen(false);
  };

  const handleMockSignUpClick = () => {
    console.log('Mock sign up clicked');
  };

  const handleMockForgotPasswordClick = () => {
    console.log('Mock forgot password clicked');
  };

  const handleMockGoogleLogin = () => {
    console.log('Mock Google login clicked');
  };

  const handleMockAppleLogin = () => {
    console.log('Mock Apple login clicked');
  };

  // Toggle state handlers
  const handleToggleChange = (key, value) => {
    setToggleStates(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Form state handlers
  const handleTextChange = (value) => {
    setTextValue(value);
    setErrorText(value.length < 3 ? 'Text must be at least 3 characters' : '');
  };

  const handleNumberChange = (value) => {
    setNumberValue(value);
    setErrorNumber(value < 0 ? 'Number must be positive' : '');
  };

  // Dropdown handlers
  const handleDropdownToggle = () => {
    setDropdownIsOpen(!dropdownIsOpen);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setDropdownIsOpen(false);
  };

  // Modern form handlers
  const handleSelectChange = (value) => {
    setSelectValue(value);
  };

  const handleCheckboxChange = (key, value) => {
    setCheckboxes(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRadioChange = (value) => {
    setRadioValue(value);
  };

  const handleSwitchChange = (key, value) => {
    setSwitchStates(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleModernTabChange = (value) => {
    setActiveModernTab(value);
  };

  const handleModernInputChange = (value) => {
    setModernInputValue(value);
    setModernInputError(value.length < 3 ? 'Input must be at least 3 characters' : '');
  };

  return {
    // Theme
    theme,
    toggleTheme,
    
    // Navigation
    ...navigation,
    
    // Color customization
    ...colorCustomizer,
    
    // Modal states
    isModalOpen,
    setIsModalOpen,
    isCardDetailsModalOpen,
    setIsCardDetailsModalOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    
    // Form states
    textValue,
    numberValue,
    errorText,
    errorNumber,
    handleTextChange,
    handleNumberChange,
    
    // Dropdown states
    dropdownIsOpen,
    selectedItem,
    handleDropdownToggle,
    handleItemSelect,
    
    // Toggle states
    toggleStates,
    handleToggleChange,
    
    // Sold items
    soldItems,
    setSoldItems,
    
    // Modern form states
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
    
    // Mock handlers
    handleMockLogin,
    handleMockSignUpClick,
    handleMockForgotPasswordClick,
    handleMockGoogleLogin,
    handleMockAppleLogin,
  };
}; 