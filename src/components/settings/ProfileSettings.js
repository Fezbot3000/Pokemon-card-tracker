import React from 'react';
import { Button, FormField, SettingsPanel } from '../../design-system';

/**
 * Profile Settings Component
 * Handles user profile information management
 */
const ProfileSettings = ({ profile, onProfileChange, onProfileSave }) => {
  return (
    <SettingsPanel
      title="Personal Information"
      description="Update your personal information and profile settings."
    >
      {/* Profile form fields */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="firstName"
          label="First Name"
          type="text"
          name="firstName"
          value={profile.firstName || ''}
          onChange={onProfileChange}
        />
        <FormField
          id="lastName"
          label="Last Name"
          type="text"
          name="lastName"
          value={profile.lastName || ''}
          onChange={onProfileChange}
        />
        <FormField
          id="companyName"
          label="Company Name (Optional)"
          type="text"
          name="companyName"
          value={profile.companyName || ''}
          onChange={onProfileChange}
        />
        <FormField
          id="mobileNumber"
          label="Mobile Number (Optional)"
          type="tel"
          name="mobileNumber"
          value={profile.mobileNumber || ''}
          onChange={onProfileChange}
        />
        <div className="md:col-span-2">
          <FormField
            id="address"
            label="Address (Optional)"
            type="text"
            name="address"
            value={profile.address || ''}
            onChange={onProfileChange}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onProfileSave}>
          Save Profile
        </Button>
      </div>
    </SettingsPanel>
  );
};

export default ProfileSettings;
