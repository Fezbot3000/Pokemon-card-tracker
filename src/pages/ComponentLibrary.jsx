import React, { useState, useEffect } from 'react';
import {
  // Atoms
  Button,
  Icon,
  Text,
  CardImage,
  AmountLabel,
  Toast,
  toastService,
  FormLabel,
  TextField,
  NumberField,
  ImageUpload,
  ColorSwatch,
  GradientSwatch,
  Toggle,

  // Molecules
  Dropdown,
  DropdownItem,
  DropdownDivider,
  Modal,
  FormField,
  ColorCategory,
  ColorCustomizer,
  ComponentSection,
  LoginModal,
  SoldItemsView,
  SettingsModal,

  // Components
  Header,
  StatisticsSummary,
  SearchToolbar,
  Card,
  CardDetailsModal,

  // Hooks
  useTheme,
} from '../design-system';

import {
  baseColors,
  lightTheme,
  darkTheme,
  semanticColors,
  gradients,
} from '../design-system/styles/colors';

// Modern UI Components - Import directly from files with explicit extensions
import { Select, Option } from '../components/ui/select.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import { Radio, RadioGroup } from '../components/ui/radio.tsx';
import { Switch } from '../components/ui/switch.tsx';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../components/ui/tabs.tsx';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb.tsx';
import {
  FormField as ModernFormField,
  FormItem,
  FormLabel as ModernFormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../components/ui/form-field.tsx';
import { Input as ModernInput } from '../components/ui/input.tsx';
import { Label as ModernLabel } from '../components/ui/label.tsx';
import { Container } from '../components/ui/container.tsx';
import { Grid } from '../components/ui/grid.tsx';
import { Stack, HStack, VStack } from '../components/ui/stack.tsx';

// Helper function to convert RGB to Hex
const rgbToHex = rgb => {
  // Handle non-string inputs
  if (!rgb || typeof rgb !== 'string') return '#000000';

  // If it's already a hex color, return it
  if (rgb.startsWith('#')) return rgb;

  // Extract the RGB values
  const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);

    // Convert to hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  // If the format is not recognized, return a default color
  return '#000000';
};

// Create a flattened color map for the color customizer
const colorMap = {
  // Primary colors
  Primary: rgbToHex(baseColors.primaryDefault || ''),
  'Primary Hover': rgbToHex(baseColors.primaryHover || ''),
  'Primary Light': rgbToHex(baseColors.primaryLight || ''),
  'Primary Dark': rgbToHex(baseColors.primaryDark || ''),

  // Light mode colors
  'Light Background Primary': rgbToHex(lightTheme.backgroundPrimary || ''),
  'Light Text Secondary': rgbToHex(lightTheme.textSecondary || ''),
  'Light Background Tertiary': rgbToHex(lightTheme.backgroundTertiary || ''),
  'Light Text Tertiary': rgbToHex(lightTheme.textTertiary || ''),

  // Dark mode colors
  'Dark Background Primary': rgbToHex(darkTheme.backgroundPrimary || ''),
  'Dark Background Secondary': rgbToHex(darkTheme.backgroundSecondary || ''),
  'Dark Text Secondary': rgbToHex(darkTheme.textSecondary || ''),
  'Dark Text Tertiary': rgbToHex(darkTheme.textTertiary || ''),
};

const ComponentLibrary = () => {
  const [activeTab, setActiveTab] = useState('atomic');
  const [activeSection, setActiveSection] = useState('colors');
  const [customColors, setCustomColors] = useState({});
  const [toggleStates, setToggleStates] = useState({
    default: false,
    withLabel: true,
    small: false,
    medium: true,
    large: false,
    disabled: true,
  });
  const { theme, toggleTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCardDetailsModalOpen, setIsCardDetailsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // State for form elements section
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [errorNumber, setErrorNumber] = useState('');

  // State for dropdown section
  const [dropdownIsOpen, setDropdownIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Select an option');

  // State for SoldItemsView example
  const [soldItems, setSoldItems] = useState([]);

  // State for SettingsModal example
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // State for modern form components
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

  useEffect(() => {
    Object.entries(customColors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(`--${variable}`, value);
    });
  }, [customColors]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        if (['atomic', 'composite'].includes(hash)) {
          setActiveTab(hash);
        } else if (
          [
            'colors',
            'buttons',
            'cards',
            'form-elements',
            'icons',
            'toggle',
            'dropdown',
            'toast',
          ].includes(hash)
        ) {
          setActiveTab('atomic');
          setActiveSection(hash);
        } else if (
          [
            'header',
            'modal',
            'card-details-modal',
            'statistics-summary',
            'search-toolbar',
            'login-modal',
            'sold-items-view',
            'settings-modal',
          ].includes(hash)
        ) {
          setActiveTab('composite');
          setActiveSection(hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Handle initial hash

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    // Set custom CSS variables for the component library
    const customColors = {
      '--primary-color': '#E6185C',
      '--secondary-color': '#4318FF',
      '--accent-color': '#05CD99',
      '--background-light': '#FFFFFF',
      '--background-dark': '#000000',
      '--content-light': '#FFFFFF',
      '--content-dark': '#000000',
      '--text-light': '#1A1A1A',
      '--text-dark': '#FFFFFF',
    };

    Object.entries(customColors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });

    // Apply dark mode class to body for the component library
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#000000';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
    }

    return () => {
      // Clean up custom styles when component unmounts
      Object.keys(customColors).forEach(variable => {
        document.documentElement.style.removeProperty(variable);
      });
      document.body.style.backgroundColor = '';
    };
  }, [theme]);

  const handleSaveColor = (variable, value) => {
    setCustomColors(prev => ({
      ...prev,
      [variable]: value,
    }));
  };

  const handleToggleChange = key => {
    setToggleStates(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Mock handlers for demos
  const handleCardSave = card => {
    // // LoggingService.info('Card saved:', card);
  };

  const handleCardDelete = card => {
    // // LoggingService.info('Card deleted:', card);
  };

  // State for LoginModal example
  const [loginError, setLoginError] = useState(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Mock login handler for demo
  const handleMockLogin = ({ email, password, rememberMe }) => {
    setIsLoginLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (password === 'password') {
        // Simulate success
        setIsLoginModalOpen(false);
      } else {
        // Simulate failure
        setLoginError('Invalid email or password. Try "password".');
      }
      setIsLoginLoading(false);
    }, 1500); // Simulate network delay
  };

  // Mock handlers for other login-related actions
  const handleMockSignUpClick = () => {
    // // LoggingService.info('Sign up clicked');
  };

  const handleMockForgotPasswordClick = () => {
    // // LoggingService.info('Forgot password clicked');
  };

  const handleMockGoogleLogin = () => {
    setIsLoginLoading(true);
    setTimeout(() => {
      setIsLoginModalOpen(false);
      setIsLoginLoading(false);
    }, 1500);
  };

  const handleMockAppleLogin = () => {
    setIsLoginLoading(true);
    setTimeout(() => {
      setIsLoginModalOpen(false);
      setIsLoginLoading(false);
    }, 1500);
  };

  // Navigation items for sidebar
  const atomicNavItems = [
    { id: 'colors', label: 'Colors' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'cards', label: 'Cards' },
    { id: 'form-elements', label: 'Form Elements' },
    { id: 'modern-forms', label: 'Modern Forms' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'icons', label: 'Icons' },
    { id: 'toggle', label: 'Toggle' },
    { id: 'dropdown', label: 'Dropdown' },
    { id: 'toast', label: 'Toast Notifications' },
    { id: 'integration-tests', label: 'Integration Tests' },
  ];

  const compositeNavItems = [
    { id: 'header', label: 'Header' },
    { id: 'modal', label: 'Modal' },
    { id: 'login-modal', label: 'Login Modal' },
    { id: 'card-details-modal', label: 'Card Details Modal' },
    { id: 'statistics-summary', label: 'Statistics Summary' },
    { id: 'search-toolbar', label: 'Search Toolbar' },
    { id: 'sold-items-view', label: 'Sold Items View' },
    { id: 'settings-modal', label: 'Settings Modal' },
  ];

  // Render section functions
  const renderColorSystemSection = () => {
    return (
      <div className="space-y-8">
        <div className="max-w-4xl">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
            Color System
          </h2>
          <p className="mb-8 text-gray-700 dark:text-gray-300">
            The Pokemon Card Tracker uses a carefully crafted color palette to
            create a cohesive visual language. Colors are organized into
            functional groups: primary brand colors, backgrounds, and text
            colors.
          </p>
        </div>

        {/* Light Mode Theme */}
        <ColorCategory title="Light Mode">
          <ColorSwatch
            key="light-bg-primary"
            colorValue={baseColors.lightBackgroundPrimary}
            name="Light Background Primary"
          />
          <ColorSwatch
            key="light-bg-tertiary"
            colorValue={baseColors.lightBackgroundTertiary}
            name="Light Background Tertiary"
          />
          <ColorSwatch
            key="light-text-secondary"
            colorValue={baseColors.lightTextSecondary}
            name="Light Text Secondary"
          />
          <ColorSwatch
            key="light-text-tertiary"
            colorValue={baseColors.lightTextTertiary}
            name="Light Text Tertiary"
          />
        </ColorCategory>

        {/* Dark Mode Theme */}
        <ColorCategory title="Dark Mode">
          <ColorSwatch
            key="dark-bg-primary"
            colorValue={baseColors.darkBackgroundPrimary}
            name="Dark Background Primary"
          />
          <ColorSwatch
            key="dark-bg-secondary"
            colorValue={baseColors.darkBackgroundSecondary}
            name="Dark Background Secondary"
          />
          <ColorSwatch
            key="dark-text-secondary"
            colorValue={baseColors.darkTextSecondary}
            name="Dark Text Secondary"
          />
          <ColorSwatch
            key="dark-text-tertiary"
            colorValue={baseColors.darkTextTertiary}
            name="Dark Text Tertiary"
          />
        </ColorCategory>

        {/* Primary Colors */}
        <ColorCategory title="Primary Palette">
          <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div
              className="flex h-24 items-center justify-center text-white"
              style={{ background: gradients.primary }}
            >
              <span className="px-2 text-center font-mono text-sm">
                Gradient
              </span>
            </div>
            <div className="bg-white p-2 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Primary Default
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Red to Pink gradient
              </p>
            </div>
          </div>
          <ColorSwatch
            key="primary-hover"
            colorValue={baseColors.primaryHover}
            name="Primary Hover"
          />
          <ColorSwatch
            key="primary-light"
            colorValue={baseColors.primaryLight}
            name="Primary Light"
          />
          <ColorSwatch
            key="primary-dark"
            colorValue={baseColors.primaryDark}
            name="Primary Dark"
          />
        </ColorCategory>

        {/* Color Customizer */}
        <div className="mt-12">
          <ColorCustomizer
            colorMap={colorMap}
            onSave={handleSaveColor}
            customColors={customColors}
          />
        </div>
      </div>
    );
  };

  const renderButtonSection = () => (
    <ComponentSection id="buttons" title="Buttons">
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Standard button variants for different actions and emphasis levels.
      </p>

      {/* Standard Variants */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Primary
          </h4>
          <Button variant="primary">Primary Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Secondary
          </h4>
          <Button variant="secondary">Secondary Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Outline
          </h4>
          <Button variant="outline">Outline Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Text
          </h4>
          <Button variant="text">Text Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Danger
          </h4>
          <Button variant="danger">Danger Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Success
          </h4>
          <Button variant="success">Success Action</Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Icon
          </h4>
          <Button variant="icon" aria-label="Add Item">
            <Icon name="add" />
          </Button>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-gray-800 dark:text-gray-200">
            Disabled
          </h4>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </div>

      {/* Sizes */}
      <h3 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-white">
        Sizes
      </h3>
      <div className="mb-8 flex items-center space-x-4">
        <Button size="sm">Small</Button>
        <Button size="md">Medium (Default)</Button>
        <Button size="lg">Large</Button>
      </div>

      {/* With Icons */}
      <h3 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-white">
        With Icons
      </h3>
      <div className="mb-8 flex items-center space-x-4">
        <Button iconLeft={<Icon name="favorite" />}>Icon Left</Button>
        <Button iconRight={<Icon name="arrow_forward" />}>Icon Right</Button>
        <Button
          variant="primary"
          iconLeft={<Icon name="cloud_upload" color="white" />}
          size="lg"
        >
          Upload
        </Button>
      </div>

      {/* Full Width */}
      <h3 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-white">
        Full Width
      </h3>
      <div className="mb-8">
        <Button fullWidth>Full Width Button</Button>
      </div>

      {/* Tab Navigation Style Example */}
      <h3 className="mb-4 mt-8 text-xl font-semibold text-gray-900 dark:text-white">
        Tab Navigation Style Example
      </h3>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        Demonstrates the styling used for active/inactive tabs, often achieved
        by applying conditional classes to standard buttons based on state
        (e.g., like the 'Cards'/'Sold Items' toggle in the Header).
      </p>
      <div className="mb-8 flex w-max overflow-hidden rounded-full bg-gray-100 p-1 dark:bg-gray-800">
        {/* Example of Active Tab Style */}
        <Button
          className="flex items-center rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-1 text-white" // Active styles applied directly
        >
          <Icon name="style" className="mr-1" color="white" />
          <span>Active Tab</span>
        </Button>
        {/* Example of Inactive Tab Style */}
        <Button
          variant="text" // Use text variant for base styling
          className="flex items-center rounded-full px-4 py-1 text-gray-700 dark:text-gray-300" // Standard inactive styles
        >
          <Icon name="inventory_2" className="mr-1" />
          <span>Inactive Tab</span>
        </Button>
      </div>
    </ComponentSection>
  );

  const renderCardSection = () => (
    <div id="cards" className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Cards
      </h2>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Container-style Card */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            Container Card
          </h3>
          <Card
            style={{
              backgroundColor: customColors['--card-background-color'],
              borderColor: customColors['--card-border-color'],
            }}
          >
            <Card.Header
              style={{ color: customColors['--card-header-text-color'] }}
            >
              Card Header
            </Card.Header>
            <Card.Body
              style={{ color: customColors['--card-body-text-color'] }}
            >
              This is an example card component. It can be used to display
              information in a clean, contained way.
            </Card.Body>
            <Card.Footer
              style={{ color: customColors['--card-footer-text-color'] }}
            >
              Card Footer
            </Card.Footer>
          </Card>
        </div>

        {/* Pokemon Card Style */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            Pokemon Card
          </h3>
          <Card
            card={{
              name: 'Charizard',
              set: 'Base Set',
              number: '4/102',
              currentValueAUD: 500,
              investmentAUD: 350,
            }}
            cardImage="https://assets.pokemon.com/assets/cms2/img/cards/web/SM10/SM10_EN_1.png"
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card with Profit */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            Card with Profit
          </h3>
          <Card
            card={{
              name: 'Pikachu',
              set: 'Vivid Voltage',
              number: '25/185',
              currentValueAUD: 120,
              investmentAUD: 80,
            }}
          />
        </div>

        {/* Card with Loss */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            Card with Loss
          </h3>
          <Card
            card={{
              name: 'Mewtwo',
              set: 'Shining Legends',
              number: '39/73',
              currentValueAUD: 75,
              investmentAUD: 100,
            }}
          />
        </div>
      </div>

      <ColorCustomizer
        componentName="Card"
        colorVariables={{
          'Background Color': 'var(--card-background-color, #FFFFFF)',
          'Border Color': 'var(--card-border-color, #E5E7EB)',
          'Header Text Color': 'var(--card-header-text-color, #1F2937)',
          'Body Text Color': 'var(--card-body-text-color, #374151)',
          'Footer Text Color': 'var(--card-footer-text-color, #6B7280)',
        }}
        availableColors={colorMap}
        onSave={(variable, value) => handleSaveColor('card', variable, value)}
      />
    </div>
  );

  const renderFormElementsSection = () => {
    return (
      <ComponentSection title="Form Elements" id="form-elements">
        <div className="space-y-8">
          {/* Text Fields */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Text Fields
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="default-text">Default</FormLabel>
                <TextField
                  id="default-text"
                  placeholder="Enter text"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                />
              </div>

              <div>
                <FormLabel htmlFor="disabled-text">Disabled</FormLabel>
                <TextField
                  id="disabled-text"
                  placeholder="Disabled field"
                  disabled
                />
              </div>

              <div>
                <FormLabel htmlFor="error-text">With Error</FormLabel>
                <TextField
                  id="error-text"
                  placeholder="Enter text"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  error={errorText}
                />
                <button
                  className="mt-2 text-sm text-[#E6185C]"
                  onClick={() =>
                    setErrorText(errorText ? '' : 'This field has an error')
                  }
                >
                  Toggle Error
                </button>
              </div>

              <div>
                <FormLabel htmlFor="with-icon">With Icon</FormLabel>
                <TextField
                  id="with-icon"
                  placeholder="Search..."
                  icon="search"
                />
              </div>
            </div>
          </div>

          {/* Number Fields */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Number Fields
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="default-number">Default</FormLabel>
                <NumberField
                  id="default-number"
                  placeholder="Enter number"
                  value={numberValue}
                  onChange={e => setNumberValue(e.target.value)}
                />
              </div>

              <div>
                <FormLabel htmlFor="disabled-number">Disabled</FormLabel>
                <NumberField
                  id="disabled-number"
                  placeholder="Disabled field"
                  disabled
                />
              </div>

              <div>
                <FormLabel htmlFor="error-number">With Error</FormLabel>
                <NumberField
                  id="error-number"
                  placeholder="Enter number"
                  value={numberValue}
                  onChange={e => setNumberValue(e.target.value)}
                  error={errorNumber}
                />
                <button
                  className="mt-2 text-sm text-[#E6185C]"
                  onClick={() =>
                    setErrorNumber(errorNumber ? '' : 'This field has an error')
                  }
                >
                  Toggle Error
                </button>
              </div>

              <div>
                <FormLabel htmlFor="currency-number">Currency</FormLabel>
                <NumberField
                  id="currency-number"
                  placeholder="0.00"
                  prefix="$"
                  decimalScale={2}
                  fixedDecimalScale
                />
              </div>
            </div>
          </div>

          {/* Form Labels */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Form Labels
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="default-label">Default Label</FormLabel>
                <TextField id="default-label" placeholder="Field with label" />
              </div>

              <div>
                <FormLabel htmlFor="required-label" required>
                  Required Label
                </FormLabel>
                <TextField id="required-label" placeholder="Required field" />
              </div>

              <div>
                <FormLabel
                  htmlFor="with-help"
                  helpText="This is some helpful text"
                >
                  Label with Help Text
                </FormLabel>
                <TextField id="with-help" placeholder="Field with help text" />
              </div>

              <div>
                <FormLabel htmlFor="disabled-label" disabled>
                  Disabled Label
                </FormLabel>
                <TextField
                  id="disabled-label"
                  placeholder="Field with disabled label"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Props Tables */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Form Element Props
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Component
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Prop
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                  <tr>
                    <td
                      className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                      rowSpan="4"
                    >
                      TextField
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      value
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Current value of the input
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      onChange
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      function
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      required
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Called when input value changes
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      error
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Error message to display
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      disabled
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      boolean
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      false
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Whether the input is disabled
                    </td>
                  </tr>

                  <tr>
                    <td
                      className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                      rowSpan="5"
                    >
                      NumberField
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      value
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      number|string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Current value of the input
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      onChange
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      function
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      required
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Called when input value changes
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      prefix
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Prefix to display before the number (e.g. $)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      decimalScale
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      number
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Number of decimal places to display
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      error
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Error message to display
                    </td>
                  </tr>

                  <tr>
                    <td
                      className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                      rowSpan="3"
                    >
                      FormLabel
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      required
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      boolean
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Whether to show a required indicator
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      helpText
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Help text to display below the label
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      disabled
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      boolean
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      false
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Whether the label is disabled
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ComponentSection>
    );
  };

  const renderIconSection = () => {
    // Common Material Icons used in the application
    const iconNames = [
      'add',
      'remove',
      'edit',
      'delete',
      'check',
      'close',
      'search',
      'filter',
      'sort',
      'menu',
      'settings',
      'info',
      'warning',
      'error',
      'help',
      'home',
      'person',
      'people',
      'style',
      'sell',
      'upload',
      'download',
      'refresh',
      'expand_more',
      'expand_less',
      'arrow_back',
      'arrow_forward',
      'dark_mode',
      'light_mode',
      'visibility',
      'visibility_off',
      'favorite',
      'favorite_border',
      'star',
      'star_border',
      'attach_money',
      'trending_up',
      'trending_down',
    ];

    return (
      <ComponentSection title="Icons" id="icons">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Available Icons
            </h3>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              The application uses Material Icons. Here are the most commonly
              used icons:
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {iconNames.map(name => (
                <div
                  key={name}
                  className="flex flex-col items-center rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-[#0F0F0F] dark:hover:bg-gray-700"
                >
                  <Icon
                    name={name}
                    className="mb-2 text-2xl text-gray-900 dark:text-white"
                  />
                  <span className="text-center text-xs text-gray-500 dark:text-gray-400">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Icon Sizes
            </h3>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col items-center">
                <Icon
                  name="style"
                  size="xs"
                  className="mb-2 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  xs
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Icon
                  name="style"
                  size="sm"
                  className="mb-2 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  sm
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Icon
                  name="style"
                  size="md"
                  className="mb-2 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  md (default)
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Icon
                  name="style"
                  size="lg"
                  className="mb-2 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  lg
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Icon
                  name="style"
                  size="xl"
                  className="mb-2 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  xl
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Icon Props
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Prop
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Default
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      name
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      required
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Name of the Material Icon
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      size
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      'md'
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Size of the icon: 'xs', 'sm', 'md', 'lg', 'xl'
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      className
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      string
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      ''
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Additional CSS classes
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ComponentSection>
    );
  };

  const renderToggleSection = () => (
    <ComponentSection title="Toggle" id="toggle">
      <div className="space-y-8">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Toggle Sizes
          </h3>
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                Small
              </span>
              <Toggle
                size="sm"
                checked={toggleStates.small}
                onChange={() => handleToggleChange('small')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                Medium (default)
              </span>
              <Toggle
                size="md"
                checked={toggleStates.medium}
                onChange={() => handleToggleChange('medium')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                Large
              </span>
              <Toggle
                size="lg"
                checked={toggleStates.large}
                onChange={() => handleToggleChange('large')}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Toggle States
          </h3>
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                Default
              </span>
              <Toggle
                checked={toggleStates.default}
                onChange={() => handleToggleChange('default')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                With Label
              </span>
              <Toggle
                label="Toggle me"
                checked={toggleStates.withLabel}
                onChange={() => handleToggleChange('withLabel')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                Disabled
              </span>
              <Toggle
                disabled
                checked={toggleStates.disabled}
                onChange={() => handleToggleChange('disabled')}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Toggle Props
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Prop
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Default
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    checked
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether the toggle is checked
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onChange
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    required
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Function called when toggle state changes
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    disabled
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether the toggle is disabled
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    label
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    node
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Label text to display next to the toggle
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    size
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    'md'
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Size of the toggle: 'sm', 'md', or 'lg'
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    className
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    ''
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Additional CSS classes
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderDropdownSection = () => (
    <ComponentSection title="Dropdown" id="dropdown">
      <div className="space-y-8">
        {/* Basic Dropdown */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Basic Dropdown
          </h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <Dropdown
                trigger={
                  <button className="flex w-40 items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>{selectedItem}</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                width="auto"
                align="left"
              >
                <DropdownItem onClick={() => setSelectedItem('Option 1')}>
                  Option 1
                </DropdownItem>
                <DropdownItem onClick={() => setSelectedItem('Option 2')}>
                  Option 2
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => setSelectedItem('Option 3')}>
                  Option 3
                </DropdownItem>
              </Dropdown>
            </div>

            <div>
              <Dropdown
                trigger={
                  <button className="flex items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>Actions</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                width="auto"
                align="left"
              >
                <DropdownItem
                  icon={<Icon name="edit" size="sm" />}
                  onClick={() => {}}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  icon={<Icon name="delete" size="sm" />}
                  onClick={() => {}}
                >
                  Delete
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem
                  icon={<Icon name="download" size="sm" />}
                  onClick={() => {}}
                >
                  Export
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Controlled Dropdown */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Controlled Dropdown
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Dropdown
                trigger={
                  <button className="flex w-40 items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>Controlled</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                isOpen={dropdownIsOpen}
                onOpenChange={setDropdownIsOpen}
                width="auto"
                align="left"
              >
                <DropdownItem onClick={() => {}}>Item 1</DropdownItem>
                <DropdownItem onClick={() => {}}>Item 2</DropdownItem>
              </Dropdown>

              <button
                className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                onClick={() => setDropdownIsOpen(!dropdownIsOpen)}
              >
                Toggle Dropdown
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Current state: {dropdownIsOpen ? 'Open' : 'Closed'}
            </div>
          </div>
        </div>

        {/* Dropdown Alignment */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Dropdown Alignment
          </h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Left Aligned (Default)
              </p>
              <Dropdown
                trigger={
                  <button className="flex w-40 items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>Left</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                align="left"
              >
                <DropdownItem onClick={() => {}}>Item 1</DropdownItem>
                <DropdownItem onClick={() => {}}>Item 2</DropdownItem>
              </Dropdown>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Center Aligned
              </p>
              <Dropdown
                trigger={
                  <button className="flex w-40 items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>Center</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                align="center"
              >
                <DropdownItem onClick={() => {}}>Item 1</DropdownItem>
                <DropdownItem onClick={() => {}}>Item 2</DropdownItem>
              </Dropdown>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Right Aligned
              </p>
              <Dropdown
                trigger={
                  <button className="flex w-40 items-center justify-between rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <span>Right</span>
                    <Icon name="expand_more" className="ml-2" />
                  </button>
                }
                align="right"
              >
                <DropdownItem onClick={() => {}}>Item 1</DropdownItem>
                <DropdownItem onClick={() => {}}>Item 2</DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Props Table */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Dropdown Props
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Component
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Prop
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                <tr>
                  <td
                    className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                    rowSpan="5"
                  >
                    Dropdown
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    trigger
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    node
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    required
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Element that triggers the dropdown
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    isOpen
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Controls the open state (controlled mode)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onOpenChange
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Called when open state changes
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    width
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    'auto'
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Width of dropdown: 'auto', 'sm', 'md', 'lg', 'xl', 'full'
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    align
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    'left'
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Alignment: 'left', 'center', 'right'
                  </td>
                </tr>

                <tr>
                  <td
                    className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                    rowSpan="3"
                  >
                    DropdownItem
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    icon
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    node
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Icon to display before text
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onClick
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Click handler for the item
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    disabled
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether the item is disabled
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderToastSection = () => {
    const showSuccessToast = () => {
      toastService.success('Operation completed successfully!');
    };

    const showErrorToast = () => {
      toastService.error('An error occurred. Please try again.');
    };

    const showInfoToast = () => {
      toastService.info('New update is available.');
    };

    const showWarningToast = () => {
      toastService.warning('This action cannot be undone.');
    };

    const showLoadingToast = () => {
      const loadingId = toastService.loading('Loading data...');
      // Simulate a delayed operation
      setTimeout(() => {
        toastService.update(loadingId, 'Data loaded successfully!', {
          type: 'success',
          icon: <Icon name="check_circle" color="white" />,
          duration: 3000,
        });
      }, 2000);
    };

    const showPersistentToast = () => {
      const toastId = toastService.info(
        'This toast will stay until dismissed.',
        {
          duration: Infinity,
          icon: <Icon name="notifications" color="white" />,
        }
      );
    };

    return (
      <ComponentSection title="Toast Notifications" id="toast">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Toast notifications provide brief messages about app processes. They
          should be non-intrusive and automatically disappear after a short time
          unless they require user action.
        </p>

        <div className="space-y-6">
          {/* Toast Examples */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              Toast Types
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={showSuccessToast} variant="primary">
                Success Toast
              </Button>
              <Button onClick={showErrorToast} variant="error">
                Error Toast
              </Button>
              <Button onClick={showInfoToast} variant="secondary">
                Info Toast
              </Button>
              <Button onClick={showWarningToast} variant="warning">
                Warning Toast
              </Button>
            </div>
          </div>

          {/* Interactive Toasts */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              Interactive Toasts
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={showLoadingToast} variant="primary">
                Loading → Success Toast
              </Button>
              <Button onClick={showPersistentToast} variant="secondary">
                Persistent Toast
              </Button>
              <Button
                onClick={() => toastService.dismissAll()}
                variant="outline"
              >
                Dismiss All Toasts
              </Button>
            </div>
          </div>

          {/* Code Example */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              Usage Examples
            </h3>
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <pre className="overflow-auto text-sm text-gray-800 dark:text-gray-200">
                {`// Import the toast service
import { toastService } from '../../design-system';

// Display different types of toasts
toastService.success('Operation completed successfully!');
toastService.error('An error occurred. Please try again.');
toastService.info('New update is available.');
toastService.warning('This action cannot be undone.');

// Loading toast that updates when complete
const loadingId = toastService.loading('Loading data...');
// Later update the toast
toastService.update(loadingId, 'Data loaded successfully!', {
  type: 'success',
  icon: <Icon name="check_circle" color="white" />,
  duration: 3000
});

// Dismiss toasts
toastService.dismiss(toastId); // Dismiss a specific toast
toastService.dismissAll(); // Dismiss all toasts`}
              </pre>
            </div>
          </div>
        </div>

        {/* Include the Toast component to enable the notifications */}
        <Toast position="bottom-right" />
      </ComponentSection>
    );
  };

  const renderHeaderSection = () => (
    <ComponentSection title="Header" id="header">
      <div className="space-y-6">
        {/* Full Header with Collection and View Toggle */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <Header
            selectedCollection="Default Collection"
            collections={['Default Collection', 'Rare Cards', 'PSA Graded']}
            onCollectionChange={collection => {
              /* Collection changed */
            }}
            currentView="cards"
            onViewChange={view => {
              /* View changed */
            }}
            onSettingsClick={() => {
              /* Settings clicked */
            }}
          />
        </div>

        {/* Header Props Table */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Header Props
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Prop
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Default
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    selectedCollection
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    'Default Collection'
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    The currently selected collection name
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    collections
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    array
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    []
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Array of collection names or objects
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onCollectionChange
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Called when collection is changed
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    currentView
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Current view ('cards' or 'sold-items')
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onViewChange
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Called when view is changed
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    onSettingsClick
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    function
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Called when settings button is clicked
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    hideCollectionSelector
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether to hide the collection selector
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    isComponentLibrary
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether the header is being rendered in the component
                    library
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderModalSection = () => {
    return (
      <ComponentSection id="modal" title="Modal">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          A reusable modal dialog component with customizable content.
        </p>

        {/* Display the Modal directly without a button click */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Modal Example
          </h3>

          {/* Using the Modal component with showModal={false} to display it inline */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Modal
              isOpen={true}
              onClose={() => {
                /* Close clicked */
              }}
              title="Example Modal"
              showOverlay={false} // Don't show the overlay
              showAsStatic={true} // Show as a static component, not a true modal
            >
              <div className="p-6">
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  This is an example of modal content. In a real implementation,
                  this would appear as a popup.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      /* Cancel clicked */
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      /* Confirm clicked */
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </ComponentSection>
    );
  };

  const renderCardDetailsModalSection = () => {
    return (
      <div id="card-details-modal" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Card Details Modal
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          A specialized modal for displaying and editing card details.
        </p>

        {/* Display CardDetailsModal directly without requiring a button click */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Card Details Modal Example
          </h3>

          {/* Using the CardDetailsModal component displayed inline */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <CardDetailsModal
              isOpen={true}
              onClose={() => {
                /* Close clicked */
              }}
              card={{
                id: '123',
                name: 'Charizard',
                set: 'Base Set',
                number: '4/102',
                condition: 'Near Mint',
                purchasePrice: 350,
                currentValue: 500,
                quantity: 1,
                imageUrl:
                  'https://assets.pokemon.com/assets/cms2/img/cards/web/SWSH45/SWSH45_EN_TG01.png',
              }}
              onSave={card => {
                // // LoggingService.info('Card saved:', card);
              }}
              onDelete={card => {
                // // LoggingService.info('Card deleted:', card);
              }}
              showAsStatic={true} // Add a prop to show it as a static display rather than modal
            />
          </div>
        </div>
      </div>
    );
  };

  const renderLoginModalSection = () => {
    return (
      <ComponentSection id="login-modal" title="Login Modal">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          A comprehensive login form matching the live design, with support for
          email/password login, social login options, and links for signup and
          password recovery.
        </p>

        {/* Display LoginModal directly without requiring a button click */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Login Modal Example
          </h3>

          {/* Using the LoginModal component with showModal={false} to display it inline */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <LoginModal
              isOpen={true}
              onClose={() => {
                /* Close clicked */
              }}
              onLoginSubmit={handleMockLogin}
              onSignUpClick={handleMockSignUpClick}
              onForgotPasswordClick={handleMockForgotPasswordClick}
              onGoogleLogin={handleMockGoogleLogin}
              onAppleLogin={handleMockAppleLogin}
              isLoading={isLoginLoading}
              showModal={false} // Don't render as a modal, just show the content
            />
          </div>
        </div>
      </ComponentSection>
    );
  };

  const renderSettingsModalSection = () => {
    // Mock collections for the SettingsModal demo
    const mockCollections = [
      'All Cards',
      'Base Set',
      'Base Set 2',
      'Team Rocket',
      'Gym Heroes',
      'Gym Challenge',
      'Neo Genesis',
    ];
    const mockUserData = {
      displayName: 'Demo User',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      mobileNumber: '555-123-4567',
      address: '123 Pokemon St\nPallet Town, Kanto 12345',
      companyName: 'Pokemon Traders Inc.',
    };

    return (
      <ComponentSection id="settings-modal" title="Settings Modal">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          A modal component for managing user settings, collections, and profile
          information.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-black">
            <h3 className="mb-4 text-base font-medium">Example</h3>

            <div className="flex items-center justify-center">
              <Button
                variant="primary"
                onClick={() => setIsSettingsModalOpen(true)}
              >
                Open Settings Modal
              </Button>

              <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                collections={mockCollections}
                selectedCollection={mockCollections[0]}
                onRenameCollection={(oldName, newName) => {
                  // // LoggingService.info(`Rename collection from ${oldName} to ${newName}`);
                  toastService.success(`Collection renamed to "${newName}"`);
                }}
                onDeleteCollection={name => {
                  // // LoggingService.info(`Delete collection ${name}`);
                  toastService.success(`Collection "${name}" deleted`);
                }}
                onImportCollection={() => {
                  /* Import collection */
                }}
                onImportBaseData={() => {
                  /* Import base data */
                }}
                userData={mockUserData}
                onSignOut={() => {
                  /* Sign out */
                }}
                onResetData={() => {
                  /* Reset data */
                }}
                onStartTutorial={() => {
                  /* Start tutorial */
                }}
                onImportAndCloudMigrate={() => {
                  /* Import and cloud migrate */
                }}
                onUploadImagesFromZip={() => {
                  /* Upload images from zip */
                }}
                onImportSoldItemsFromZip={() => {
                  /* Import sold items from zip */
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium">Usage</h3>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
              {`import { SettingsModal } from '../design-system';

// In your component
const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

// Render
<SettingsModal
  isOpen={isSettingsModalOpen}
  onClose={() => setIsSettingsModalOpen(false)}
  collections={collections}
  selectedCollection={selectedCollection}
  onRenameCollection={handleRenameCollection}
  onDeleteCollection={handleDeleteCollection}
  onImportCollection={handleImportCollection}
  onImportBaseData={handleImportBaseData}
  userData={currentUser}
  onSignOut={handleSignOut}
/>`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium">Props</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Prop
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Default
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      isOpen
                    </td>
                    <td className="px-4 py-2 text-sm">boolean</td>
                    <td className="px-4 py-2 text-sm">-</td>
                    <td className="px-4 py-2 text-sm">
                      Whether the modal is open
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      onClose
                    </td>
                    <td className="px-4 py-2 text-sm">function</td>
                    <td className="px-4 py-2 text-sm">-</td>
                    <td className="px-4 py-2 text-sm">
                      Function to close the modal
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      collections
                    </td>
                    <td className="px-4 py-2 text-sm">string[]</td>
                    <td className="px-4 py-2 text-sm">[]</td>
                    <td className="px-4 py-2 text-sm">
                      Array of available collection names
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      selectedCollection
                    </td>
                    <td className="px-4 py-2 text-sm">string</td>
                    <td className="px-4 py-2 text-sm">-</td>
                    <td className="px-4 py-2 text-sm">
                      Currently selected collection
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-medium text-primary">
                      userData
                    </td>
                    <td className="px-4 py-2 text-sm">object</td>
                    <td className="px-4 py-2 text-sm">null</td>
                    <td className="px-4 py-2 text-sm">
                      User data object containing profile information
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ComponentSection>
    );
  };

  const renderSoldItemsViewSection = () => {
    // Sample sold items data for demonstration
    const exampleSoldItems = [
      {
        id: 'invoice1',
        buyer: 'John Doe',
        dateSold: '2024-02-15',
        cards: [
          {
            id: 'card1',
            card: 'Charizard',
            player: 'Holo Rare',
            slabSerial: 'abc123',
            investmentAUD: 150,
            finalValueAUD: 350,
            finalProfitAUD: 200,
          },
          {
            id: 'card2',
            card: 'Blastoise',
            player: 'Base Set',
            slabSerial: 'def456',
            investmentAUD: 100,
            finalValueAUD: 220,
            finalProfitAUD: 120,
          },
        ],
        totalInvestment: 250,
        totalSale: 570,
        totalProfit: 320,
      },
      {
        id: 'invoice2',
        buyer: 'Jane Smith',
        dateSold: '2024-01-05',
        cards: [
          {
            id: 'card3',
            card: 'Pikachu',
            player: 'Promo Card',
            slabSerial: 'ghi789',
            investmentAUD: 50,
            finalValueAUD: 45,
            finalProfitAUD: -5,
          },
        ],
        totalInvestment: 50,
        totalSale: 45,
        totalProfit: -5,
      },
      {
        id: 'invoice3',
        buyer: 'Alice Brown',
        dateSold: '2023-07-20',
        cards: [
          {
            id: 'card4',
            card: 'Mewtwo',
            player: 'Legendary',
            slabSerial: 'jkl012',
            investmentAUD: 200,
            finalValueAUD: 350,
            finalProfitAUD: 150,
          },
          {
            id: 'card5',
            card: 'Venusaur',
            player: 'Base Set',
            slabSerial: 'mno345',
            investmentAUD: 120,
            finalValueAUD: 180,
            finalProfitAUD: 60,
          },
        ],
        totalInvestment: 320,
        totalSale: 530,
        totalProfit: 210,
      },
    ];

    // Mock function to get card image URLs (would come from database in real app)
    const getCardImageUrl = card => {
      // For demo purposes, return a placeholder image based on the card name
      const cardName = card.card
        ? card.card.toLowerCase().replace(/[^a-z0-9]/g, '')
        : '';
      return `https://placehold.co/200x280/1B2131/FFFFFF?text=${cardName}`;
    };

    // Mock function for printing an invoice
    const handlePrintInvoice = invoice => {
      // // LoggingService.info('Print invoice:', invoice);
      toastService.info(`Printing invoice for ${invoice.buyer}`);
    };

    return (
      <ComponentSection id="sold-items-view" title="Sold Items View">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          A component for displaying sold Pokemon cards organized by financial
          year and invoice. Features collapsible sections, profit calculations,
          and invoice printing capabilities.
        </p>

        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Sold Items View Example
          </h3>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <SoldItemsView
              items={exampleSoldItems}
              getCardImageUrl={getCardImageUrl}
              onPrintInvoice={handlePrintInvoice}
              formatDate={dateStr => new Date(dateStr).toLocaleDateString()}
            />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Usage
          </h3>
          <div className="overflow-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <pre className="text-sm text-gray-900 dark:text-gray-300">
              {`// Import component
import { SoldItemsView } from '../design-system';
import LoggingService from '../services/LoggingService';

// In your component
return (
  <SoldItemsView 
    items={soldCards}
    getCardImageUrl={(card) => card.imageUrl || fallbackImage}
    onPrintInvoice={handlePrintInvoice}
    formatDate={(dateStr) => new Date(dateStr).toLocaleDateString()}
  />
);`}
            </pre>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
            Props
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-200 p-2 text-left dark:border-gray-800">
                  Prop
                </th>
                <th className="border border-gray-200 p-2 text-left dark:border-gray-800">
                  Type
                </th>
                <th className="border border-gray-200 p-2 text-left dark:border-gray-800">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  items
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Array
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Array of sold items grouped by invoice. Each invoice should
                  have an ID, buyer, date sold, and cards array.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  getCardImageUrl
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function that takes a card object and returns its image URL.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  onPrintInvoice
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function called when the print button is clicked. Receives the
                  invoice object.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  formatDate
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Function to format date strings for display.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  className
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  String
                </td>
                <td className="border border-gray-200 p-2 dark:border-gray-800">
                  Additional CSS classes to apply to the component.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ComponentSection>
    );
  };

  const renderStatisticsSummarySection = () => (
    <ComponentSection title="Statistics Summary" id="statistics-summary">
      <div className="space-y-6">
        {/* Light Mode Statistics Summary */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Light Mode
          </h3>
          <StatisticsSummary
            statistics={[
              { label: 'PAID', value: 1000, formattedValue: '$1.00K' },
              { label: 'VALUE', value: 2000, formattedValue: '$2.00K' },
              {
                label: 'PROFIT',
                value: 1000,
                formattedValue: '$1.00K',
                isProfit: true,
              },
              { label: 'CARDS', value: 1, icon: 'style' },
            ]}
          />
        </div>

        {/* Dark Mode Statistics Summary */}
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-black p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-white">Dark Mode</h3>
          <div className="rounded-lg bg-[#0F0F0F]">
            <StatisticsSummary
              statistics={[
                { label: 'PAID', value: 1000, formattedValue: '$1.00K' },
                { label: 'VALUE', value: 2000, formattedValue: '$2.00K' },
                {
                  label: 'PROFIT',
                  value: 1000,
                  formattedValue: '$1.00K',
                  isProfit: true,
                },
                { label: 'CARDS', value: 1, icon: 'style' },
              ]}
            />
          </div>
        </div>

        {/* Negative Profit Example */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            With Negative Profit
          </h3>
          <StatisticsSummary
            statistics={[
              { label: 'PAID', value: 3000, formattedValue: '$3.00K' },
              { label: 'VALUE', value: 2000, formattedValue: '$2.00K' },
              {
                label: 'PROFIT',
                value: -1000,
                formattedValue: '-$1.00K',
                isProfit: true,
              },
              { label: 'CARDS', value: 1, icon: 'style' },
            ]}
          />
        </div>

        {/* Props Table */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Statistics Summary Props
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-[#0F0F0F]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Prop
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Default
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-[#0F0F0F]">
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    array
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    []
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Array of statistic objects to display
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics[].label
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    required
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Label for the statistic
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics[].value
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    number|string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    required
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Value of the statistic
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics[].formattedValue
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Pre-formatted value to display
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics[].isProfit
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    boolean
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    false
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Whether this statistic represents profit (green/red
                    coloring)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    statistics[].icon
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Optional icon name to display
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    className
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    string
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    ''
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Additional CSS classes
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderSearchToolbarSection = () => (
    <div id="search-toolbar" className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Search Toolbar
      </h2>

      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-[#0F0F0F]">
        <SearchToolbar
          onSearch={() => {}}
          onFilterChange={() => {}}
          onSortChange={() => {}}
        />
      </div>
    </div>
  );

  // Modern UI Components Render Functions
  const renderModernFormsSection = () => (
    <ComponentSection title="Modern Forms" id="modern-forms">
      <div className="space-y-8">
        {/* Select Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Select
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <ModernLabel>Basic Select</ModernLabel>
              <Select value={selectValue} onValueChange={setSelectValue}>
                <Option value="">Choose an option</Option>
                <Option value="option1">Option 1</Option>
                <Option value="option2">Option 2</Option>
                <Option value="option3">Option 3</Option>
              </Select>
            </div>
            <div className="space-y-2">
              <ModernLabel>Small Select</ModernLabel>
              <Select
                size="sm"
                value={selectValue}
                onValueChange={setSelectValue}
              >
                <Option value="">Choose an option</Option>
                <Option value="small1">Small 1</Option>
                <Option value="small2">Small 2</Option>
              </Select>
            </div>
            <div className="space-y-2">
              <ModernLabel>Large Select</ModernLabel>
              <Select
                size="lg"
                value={selectValue}
                onValueChange={setSelectValue}
              >
                <Option value="">Choose an option</Option>
                <Option value="large1">Large 1</Option>
                <Option value="large2">Large 2</Option>
              </Select>
            </div>
          </div>
        </div>

        {/* Checkbox Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Checkbox
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Checkbox
              checked={checkboxes.basic}
              onCheckedChange={checked =>
                setCheckboxes(prev => ({ ...prev, basic: checked }))
              }
              label="Basic checkbox"
            />
            <Checkbox
              checked={checkboxes.withLabel}
              onCheckedChange={checked =>
                setCheckboxes(prev => ({ ...prev, withLabel: checked }))
              }
              label="With description"
              description="This checkbox has a description"
            />
            <Checkbox
              checked={checkboxes.error}
              onCheckedChange={checked =>
                setCheckboxes(prev => ({ ...prev, error: checked }))
              }
              label="Error state"
              error
            />
            <Checkbox
              checked={checkboxes.success}
              onCheckedChange={checked =>
                setCheckboxes(prev => ({ ...prev, success: checked }))
              }
              label="Success state"
              success
            />
          </div>
        </div>

        {/* Radio Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Radio Groups
          </h3>
          <RadioGroup>
            <Radio
              name="example"
              value="option1"
              checked={radioValue === 'option1'}
              onChange={() => setRadioValue('option1')}
              label="Option 1"
            />
            <Radio
              name="example"
              value="option2"
              checked={radioValue === 'option2'}
              onChange={() => setRadioValue('option2')}
              label="Option 2"
              description="This option has a description"
            />
            <Radio
              name="example"
              value="option3"
              checked={radioValue === 'option3'}
              onChange={() => setRadioValue('option3')}
              label="Option 3"
            />
          </RadioGroup>
        </div>

        {/* Switch Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Switch
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Switch
              checked={switchStates.basic}
              onCheckedChange={checked =>
                setSwitchStates(prev => ({ ...prev, basic: checked }))
              }
              label="Basic switch"
            />
            <Switch
              checked={switchStates.withLabel}
              onCheckedChange={checked =>
                setSwitchStates(prev => ({ ...prev, withLabel: checked }))
              }
              label="With description"
              description="This switch has a description"
            />
            <Switch
              checked={switchStates.success}
              onCheckedChange={checked =>
                setSwitchStates(prev => ({ ...prev, success: checked }))
              }
              label="Success variant"
              variant="success"
            />
            <Switch
              checked={switchStates.danger}
              onCheckedChange={checked =>
                setSwitchStates(prev => ({ ...prev, danger: checked }))
              }
              label="Danger variant"
              variant="danger"
            />
          </div>
        </div>

        {/* Form Field Composition */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Form Field Composition
          </h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ModernFormField>
              <FormItem>
                <ModernFormLabel required>Email address</ModernFormLabel>
                <FormControl>
                  <ModernInput
                    type="email"
                    placeholder="Enter your email"
                    value={modernInputValue}
                    onChange={e => setModernInputValue(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  We'll never share your email with anyone else.
                </FormDescription>
              </FormItem>
            </ModernFormField>

            <ModernFormField>
              <FormItem>
                <ModernFormLabel required>Password</ModernFormLabel>
                <FormControl>
                  <ModernInput
                    type="password"
                    placeholder="Enter your password"
                    error={!!modernInputError}
                    onChange={e => {
                      if (e.target.value.length < 8) {
                        setModernInputError(
                          'Password must be at least 8 characters'
                        );
                      } else {
                        setModernInputError('');
                      }
                    }}
                  />
                </FormControl>
                <FormMessage variant="error">{modernInputError}</FormMessage>
              </FormItem>
            </ModernFormField>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderNavigationSection = () => (
    <ComponentSection title="Navigation" id="navigation">
      <div className="space-y-8">
        {/* Tabs Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Tabs
          </h3>
          <div className="space-y-6">
            <Tabs value={activeModernTab} onValueChange={setActiveModernTab}>
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                  <h4 className="mb-2 font-medium">Tab 1 Content</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    This is the content for tab 1.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="tab2">
                <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                  <h4 className="mb-2 font-medium">Tab 2 Content</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    This is the content for tab 2.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="tab3">
                <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                  <h4 className="mb-2 font-medium">Tab 3 Content</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    This is the content for tab 3.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Breadcrumb Component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Breadcrumb
          </h3>
          <div className="space-y-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Collection</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem variant="current">Card Details</BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Layout Components */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Layout Components
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 font-medium">Container</h4>
              <Container
                size="md"
                className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800"
              >
                <p className="text-center">This is a medium container</p>
              </Container>
            </div>

            <div>
              <h4 className="mb-3 font-medium">Grid</h4>
              <Grid cols={3} gap="md">
                <div className="rounded-lg bg-blue-100 p-4 text-center dark:bg-blue-900">
                  Item 1
                </div>
                <div className="rounded-lg bg-green-100 p-4 text-center dark:bg-green-900">
                  Item 2
                </div>
                <div className="rounded-lg bg-purple-100 p-4 text-center dark:bg-purple-900">
                  Item 3
                </div>
              </Grid>
            </div>

            <div>
              <h4 className="mb-3 font-medium">Stack</h4>
              <VStack gap="md">
                <div className="rounded-lg bg-red-100 p-4 text-center dark:bg-red-900">
                  Vertical Item 1
                </div>
                <div className="rounded-lg bg-yellow-100 p-4 text-center dark:bg-yellow-900">
                  Vertical Item 2
                </div>
              </VStack>
            </div>
          </div>
        </div>
      </div>
    </ComponentSection>
  );

  const renderIntegrationTestsSection = () => (
    <ComponentSection title="Integration Tests" id="integration-tests">
      <div className="space-y-8">
        <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
          <h3 className="mb-4 text-lg font-medium text-blue-900 dark:text-blue-100">
            Component Integration Demo
          </h3>
          <p className="mb-6 text-blue-700 dark:text-blue-300">
            This section demonstrates how our modern UI components work together
            in real-world scenarios.
          </p>

          {/* Complex Form Integration */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-black">
            <h4 className="mb-4 font-medium">User Profile Form</h4>
            <Container size="lg">
              <Grid cols={2} gap="lg">
                <ModernFormField>
                  <FormItem>
                    <ModernFormLabel required>Display Name</ModernFormLabel>
                    <FormControl>
                      <ModernInput placeholder="Enter your display name" />
                    </FormControl>
                  </FormItem>
                </ModernFormField>

                <ModernFormField>
                  <FormItem>
                    <ModernFormLabel required>Role</ModernFormLabel>
                    <FormControl>
                      <Select>
                        <Option value="">Select a role</Option>
                        <Option value="admin">Administrator</Option>
                        <Option value="user">Regular User</Option>
                        <Option value="viewer">Viewer</Option>
                      </Select>
                    </FormControl>
                  </FormItem>
                </ModernFormField>
              </Grid>

              <VStack gap="md" className="mt-6">
                <Checkbox label="Enable email notifications" />
                <Checkbox label="Make profile public" />
                <Switch label="Dark mode preference" />
              </VStack>

              <Tabs defaultValue="personal" className="mt-6">
                <TabsList>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                <TabsContent value="personal">
                  <div className="mt-4 space-y-4">
                    <ModernInput placeholder="Bio" />
                    <ModernInput placeholder="Location" />
                  </div>
                </TabsContent>
                <TabsContent value="security">
                  <div className="mt-4 space-y-4">
                    <ModernInput
                      type="password"
                      placeholder="Current password"
                    />
                    <ModernInput type="password" placeholder="New password" />
                  </div>
                </TabsContent>
                <TabsContent value="preferences">
                  <div className="mt-4 space-y-4">
                    <RadioGroup>
                      <Radio name="theme" value="light" label="Light theme" />
                      <Radio name="theme" value="dark" label="Dark theme" />
                      <Radio name="theme" value="auto" label="Auto (system)" />
                    </RadioGroup>
                  </div>
                </TabsContent>
              </Tabs>

              <HStack justify="end" className="mt-6">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </HStack>
            </Container>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
          <h3 className="mb-4 text-lg font-medium text-green-900 dark:text-green-100">
            Performance Metrics
          </h3>
          <Grid cols={3} gap="md">
            <div className="rounded-lg bg-white p-4 text-center dark:bg-black">
              <div className="text-2xl font-bold text-green-600">13</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Modern Components
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 text-center dark:bg-black">
              <div className="text-2xl font-bold text-blue-600">99%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                TypeScript Coverage
              </div>
            </div>
            <div className="rounded-lg bg-white p-4 text-center dark:bg-black">
              <div className="text-2xl font-bold text-purple-600">A11y</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Accessibility Ready
              </div>
            </div>
          </Grid>
        </div>
      </div>
    </ComponentSection>
  );

  // Sidebar navigation item
  const NavItem = ({ id, label, isActive, onClick }) => (
    <a
      href={`#${id}`}
      className={`block rounded-md px-4 py-2 transition-colors ${
        isActive
          ? 'bg-purple-100 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
      onClick={e => {
        e.preventDefault();
        onClick(id);
        window.history.pushState(null, '', `#${id}`);
      }}
    >
      {label}
    </a>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm dark:bg-[#0F0F0F]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold">
              Pokemon Card Tracker - Component Library
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="rounded-full bg-gray-100 p-2 text-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300"
                aria-label="Toggle theme"
              >
                <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-md bg-white p-1 shadow-sm dark:bg-[#0F0F0F]">
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none ${
                activeTab === 'atomic'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setActiveTab('atomic');
                setActiveSection('colors');
              }}
            >
              Atomic Components
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none ${
                activeTab === 'composite'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setActiveTab('composite');
                setActiveSection('header');
              }}
            >
              Composite Components
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg bg-white p-4 shadow-sm dark:bg-[#0F0F0F]">
              <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
                {activeTab === 'atomic'
                  ? 'Atomic Components'
                  : 'Composite Components'}
              </h2>
              <nav className="space-y-1">
                {activeTab === 'atomic'
                  ? atomicNavItems.map(item => (
                      <NavItem
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        isActive={activeSection === item.id}
                        onClick={setActiveSection}
                      />
                    ))
                  : compositeNavItems.map(item => (
                      <NavItem
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        isActive={activeSection === item.id}
                        onClick={setActiveSection}
                      />
                    ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-[#0F0F0F] lg:col-span-3">
            {activeTab === 'atomic' && (
              <>
                {activeSection === 'colors' && renderColorSystemSection()}
                {activeSection === 'buttons' && renderButtonSection()}
                {activeSection === 'cards' && renderCardSection()}
                {activeSection === 'form-elements' &&
                  renderFormElementsSection()}
                {activeSection === 'modern-forms' && renderModernFormsSection()}
                {activeSection === 'navigation' && renderNavigationSection()}
                {activeSection === 'icons' && renderIconSection()}
                {activeSection === 'toggle' && renderToggleSection()}
                {activeSection === 'dropdown' && renderDropdownSection()}
                {activeSection === 'toast' && renderToastSection()}
                {activeSection === 'integration-tests' &&
                  renderIntegrationTestsSection()}
              </>
            )}

            {activeTab === 'composite' && (
              <>
                {activeSection === 'header' && renderHeaderSection()}
                {activeSection === 'modal' && renderModalSection()}
                {activeSection === 'card-details-modal' &&
                  renderCardDetailsModalSection()}
                {activeSection === 'statistics-summary' &&
                  renderStatisticsSummarySection()}
                {activeSection === 'search-toolbar' &&
                  renderSearchToolbarSection()}
                {activeSection === 'login-modal' && renderLoginModalSection()}
                {activeSection === 'settings-modal' &&
                  renderSettingsModalSection()}
                {activeSection === 'sold-items-view' &&
                  renderSoldItemsViewSection()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 bg-white py-6 shadow-sm dark:bg-[#0F0F0F]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Pokemon Card Tracker Design System {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ComponentLibrary;
