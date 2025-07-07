import React from 'react';
import { Button, Icon, SettingsPanel, SelectField, toast as toastService } from '../../design-system';
import featureFlags, { updateFeatureFlag } from '../../utils/featureFlags';
import { useUserPreferences, availableCurrencies } from '../../contexts/UserPreferencesContext';

/**
 * Application Settings Component
 * Handles general app settings like cloud sync, currency, and tutorial
 */
const ApplicationSettings = ({ onStartTutorial }) => {
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();

  const handlePreferredCurrencyChange = (event) => {
    const newCurrencyCode = event.target.value;
    const newCurrency = availableCurrencies.find(c => c.code === newCurrencyCode);
    if (newCurrency) {
      updatePreferredCurrency(newCurrency);
      toastService.success(`Currency changed to ${newCurrency.name}`);
    }
  };

  const handleCloudSyncToggle = () => {
    updateFeatureFlag('enableFirestoreSync', !featureFlags.enableFirestoreSync);
    if (!featureFlags.enableFirestoreSync) {
      // Also enable related flags for full cloud functionality
      updateFeatureFlag('enableFirestoreReads', true);
      updateFeatureFlag('enableRealtimeListeners', true);
    }
    toastService.success(`Cloud Sync ${!featureFlags.enableFirestoreSync ? 'enabled' : 'disabled'}`);
  };

  return (
    <SettingsPanel
      title="Application Settings"
      description="Configure general application settings."
    >
      <div className="space-y-4">
        
        {onStartTutorial && (
          <Button
            variant="outline"
            iconLeft={<Icon name="help_outline" />}
            onClick={onStartTutorial}
            fullWidth
          >
            Start Tutorial
          </Button>
        )}
        
        {/* Feature Flag Toggle - Cloud Sync */}
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cloud Sync</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enable automatic cloud synchronization for your data
              </p>
            </div>
            <Button
              variant={featureFlags.enableFirestoreSync ? "primary" : "outline"}
              size="sm"
              onClick={handleCloudSyncToggle}
            >
              {featureFlags.enableFirestoreSync ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
        
        {/* Preferred Currency Setting */}
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-[#1B2131]">
          <h4 className="mb-2 flex items-center font-medium text-gray-900 dark:text-white">
            <Icon name="language" className="mr-2" />
            Display Currency
          </h4>
          <SelectField
            label="Preferred Currency"
            name="preferredCurrency"
            value={preferredCurrency.code}
            onChange={handlePreferredCurrencyChange}
            className="w-full text-sm"
          >
            {availableCurrencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {`${currency.name} (${currency.code})`}
              </option>
            ))}
          </SelectField>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Select the currency for displaying all monetary values in the app.
          </p>
        </div>
      </div>
    </SettingsPanel>
  );
};

export default ApplicationSettings;
