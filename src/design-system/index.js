/**
 * Design System Entry Point
 *
 * This file exports all components, atoms, molecules, and tokens from the design system
 * for easy consumption throughout the application.
 */

// Tokens
export * from './tokens';
export * from './styles/colors';

// Utilities
export { useTheme, ThemeProvider } from './contexts/ThemeContext';
export { default as DesignSystemProvider } from './providers/DesignSystemProvider';
export { default as toastService } from './utils/toast';
export { toast } from './utils/toast';
export * from './utils/formatters';
export { subscribeToNotifications } from './utils/notifications';

// Contexts
export { default as ThemeContext } from './contexts/ThemeContext';
export {
  default as AuthContext,
  AuthProvider,
  useAuth,
} from './contexts/AuthContext';



// Atoms
export { default as Button } from './atoms/Button';
export { default as Icon } from './atoms/Icon';
export { default as FormLabel } from './atoms/FormLabel';
export { default as TextField } from './atoms/TextField';
export { default as NumberField } from './atoms/NumberField';
export { default as SelectField } from './atoms/SelectField';
export { default as Toggle } from './atoms/Toggle';
export { default as CardImage } from './atoms/CardImage';
export { default as AmountLabel } from './atoms/AmountLabel';
export { default as ImageUpload } from './atoms/ImageUpload';
export { default as ColorSwatch } from './atoms/ColorSwatch';
export { default as GradientSwatch } from './atoms/GradientSwatch';
export { default as SettingsNavItem } from './atoms/SettingsNavItem';
export { default as Toast } from './atoms/Toast';

// Molecules
export { default as Modal } from './molecules/Modal';
export { default as Dropdown } from './molecules/Dropdown';
export { DropdownItem, DropdownDivider } from './molecules/Dropdown';
export { default as CustomDropdown } from './molecules/CustomDropdown';
export { default as FormField } from './molecules/FormField';
export { default as ColorCategory } from './molecules/ColorCategory';
export { default as ColorCustomizer } from './molecules/ColorCustomizer';
export { default as ComponentSection } from './molecules/ComponentSection';
export { default as SettingsPanel } from './molecules/SettingsPanel';
export { default as InvoiceCard } from './molecules/invoice/InvoiceCard';
export { default as InvoiceHeader } from './molecules/invoice/InvoiceHeader';
export { default as ConfirmDialog } from './molecules/ConfirmDialog';

// Components
export { default as Header } from './components/Header';
export { default as StatisticsSummary } from './components/StatisticsSummary';
export { default as SearchToolbar } from './components/SearchToolbar';
export { default as SimpleSearchBar } from './components/SimpleSearchBar';
export { default as Card } from './components/Card';
export { default as CardOptimized } from './components/CardOptimized';
export { default as CardDetailsForm } from './components/CardDetailsForm';
export { default as CardDetailsModal } from './components/CardDetailsModal';
export { default as LoginModal } from './components/LoginModal';
export { default as SoldItemsView } from './components/SoldItemsView';
export { default as SettingsModal } from './components/SettingsModal';

