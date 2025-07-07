import React from 'react';
// Component library styles now integrated into global design system
import * as Components from './index';
import SettingsComponentsLibrary from './SettingsComponentsLibrary';

/**
 * Component Library
 *
 * This is the main entry point for the component library.
 * It imports the self-contained CSS and all components.
 */
const ComponentLibrary = ({ children }) => {
  return (
    <div className="component-library">
      {children || <SettingsComponentsLibrary />}
    </div>
  );
};

// Export all components from the design system
export const {
  // Tokens
  colors,
  typography,
  spacing,
  borders,
  shadows,
  transitions,

  // Atoms
  Button,
  Icon,
  FormLabel,
  TextField,
  NumberField,
  ImageUpload,
  ColorSwatch,
  GradientSwatch,
  Toggle,
  SettingsNavItem,

  // Molecules
  Dropdown,
  DropdownItem,
  DropdownDivider,
  Modal,
  FormField,
  ColorCategory,
  ColorCustomizer,
  ComponentSection,
  SettingsPanel,

  // Components
  Header,
  StatisticsSummary,
  SearchToolbar,
  Card,
  CardDetailsForm,
  CardDetailsModal,
  SettingsModal,
} = Components;

export default ComponentLibrary;
