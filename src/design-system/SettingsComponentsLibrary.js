import React, { useState } from 'react';
import {
  ComponentSection,
  SettingsNavItem,
  SettingsPanel,
  Button,
  Icon,
  FormField,
} from './index';

/**
 * Settings Components Library
 *
 * Showcases all the building blocks used in the Settings modal.
 */
const SettingsComponentsLibrary = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-8">
      <ComponentSection
        title="Settings Navigation Items"
        description="Navigation items used in the settings sidebar."
      >
        <div className="w-52 bg-[#121212] p-6">
          <SettingsNavItem
            icon="settings"
            label="General"
            isActive={true}
            onClick={() => {}}
          />
          <SettingsNavItem
            icon="database"
            label="Data"
            isActive={false}
            onClick={() => {}}
          />
          <SettingsNavItem
            icon="person"
            label="Profile"
            isActive={false}
            onClick={() => {}}
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Settings Panels"
        description="Content panels used in the settings modal."
      >
        <div className="max-w-lg bg-[#121212] p-6">
          <SettingsPanel
            title="Appearance"
            description="Choose your preferred light or dark theme."
          >
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                iconLeft={<Icon name="light_mode" />}
                className="flex-1 bg-gray-700"
              >
                Light
              </Button>
              <Button
                variant="primary"
                iconLeft={<Icon name="dark_mode" />}
                className="flex-1 bg-red-500"
              >
                Dark
              </Button>
            </div>
          </SettingsPanel>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Settings Form Panel"
        description="Panel with form fields for settings."
      >
        <div className="max-w-lg bg-[#121212] p-6">
          <SettingsPanel
            title="Profile Information"
            description="Update your user profile information."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="First Name"
                  name="firstName"
                  type="text"
                  value="Demo"
                  placeholder="Your first name"
                />
                <FormField
                  label="Last Name"
                  name="lastName"
                  type="text"
                  value="User"
                  placeholder="Your last name"
                />
              </div>
              <FormField
                label="Mobile Number"
                name="mobileNumber"
                type="tel"
                value="555-123-4567"
                placeholder="Your mobile number"
              />
              <div className="flex justify-end">
                <Button variant="primary" iconLeft={<Icon name="save" />}>
                  Save Profile
                </Button>
              </div>
            </div>
          </SettingsPanel>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Settings Dropdown Panel"
        description="Panel with dropdown selection."
      >
        <div className="max-w-lg bg-[#121212] p-6">
          <SettingsPanel
            title="Currency Settings"
            description="Select the default currency for display."
          >
            <select className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white">
              <option>AUD (A$)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>JPY (¥)</option>
            </select>
          </SettingsPanel>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Settings Layout Example"
        description="Example of a settings layout with sidebar and content."
      >
        <div className="max-w-3xl overflow-hidden rounded-lg border border-gray-700">
          <div className="border-b border-gray-800 bg-[#121212] p-4">
            <h2 className="text-lg font-medium text-white">Settings</h2>
          </div>
          <div className="flex h-[350px]">
            {/* Sidebar */}
            <div className="w-52 border-r border-gray-800 bg-[#121212] p-2">
              <div className="space-y-1">
                {['general', 'data', 'profile', 'account'].map(tab => (
                  <SettingsNavItem
                    key={tab}
                    icon={
                      tab === 'general'
                        ? 'settings'
                        : tab === 'data'
                          ? 'database'
                          : tab === 'profile'
                            ? 'person'
                            : 'account_circle'
                    }
                    label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                    isActive={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[#121212] p-6">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <SettingsPanel
                    title="Appearance"
                    description="Choose your preferred light or dark theme."
                  >
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        iconLeft={<Icon name="light_mode" />}
                        className="flex-1 bg-gray-700"
                      >
                        Light
                      </Button>
                      <Button
                        variant="primary"
                        iconLeft={<Icon name="dark_mode" />}
                        className="flex-1 bg-red-500"
                      >
                        Dark
                      </Button>
                    </div>
                  </SettingsPanel>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <SettingsPanel
                    title="Profile Information"
                    description="Update your user profile information."
                  >
                    <div className="space-y-4">
                      <FormField
                        label="Name"
                        name="name"
                        type="text"
                        value="Demo User"
                        placeholder="Your name"
                      />
                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          iconLeft={<Icon name="save" />}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </SettingsPanel>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-4">
                  <SettingsPanel
                    title="Import/Export"
                    description="Manage your data."
                  >
                    <div className="space-y-3">
                      <Button
                        variant="secondary"
                        className="w-full bg-gray-700"
                        iconLeft={<Icon name="file_download" />}
                      >
                        Export Collection
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full bg-gray-700"
                        iconLeft={<Icon name="file_upload" />}
                      >
                        Import Collection
                      </Button>
                    </div>
                  </SettingsPanel>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-4">
                  <SettingsPanel
                    title="Account Information"
                    description="Manage your account."
                  >
                    <div className="mb-4 flex items-center space-x-3">
                      <Icon
                        name="account_circle"
                        className="text-2xl text-gray-400"
                      />
                      <div>
                        <p className="font-medium text-white">Demo User</p>
                        <p className="text-sm text-gray-400">
                          user@example.com
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="tertiary"
                      className="w-full"
                      iconLeft={<Icon name="logout" />}
                    >
                      Sign Out
                    </Button>
                  </SettingsPanel>
                </div>
              )}
            </div>
          </div>
        </div>
      </ComponentSection>
    </div>
  );
};

export default SettingsComponentsLibrary;
