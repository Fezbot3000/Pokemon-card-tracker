import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { toast } from 'react-hot-toast';

const Profile = ({ onClose }) => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedProfile = await db.getProfile();
        if (savedProfile) {
          setProfile(savedProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await db.saveProfile(profile);
      toast.success('Profile saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={profile.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={profile.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobile Number
          </label>
          <input
            type="tel"
            name="mobileNumber"
            value={profile.mobileNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter mobile number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company Name
          </label>
          <input
            type="text"
            name="companyName"
            value={profile.companyName}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={profile.address}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Enter address"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-white
                     hover:bg-primary/90 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile; 