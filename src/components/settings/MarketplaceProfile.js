import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { toast as toastService } from '../../design-system';
import logger from '../../utils/logger';
import CustomDropdown from '../../design-system/molecules/CustomDropdown';

function MarketplaceProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    location: '',
    preferredPaymentMethods: [],
    responseTime: 'within-24h',
    autoReplyMessage: '',
    showRatings: true,
    allowOffers: true,
  });

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'payments' },
    { id: 'bank-transfer', label: 'Bank Transfer', icon: 'account_balance' },
    { id: 'paypal', label: 'PayPal', icon: 'payment' },
    { id: 'crypto', label: 'Cryptocurrency', icon: 'currency_bitcoin' },
  ];

  const responseTimeOptions = [
    { value: 'within-1h', label: 'Within 1 hour' },
    { value: 'within-24h', label: 'Within 24 hours' },
    { value: 'within-3d', label: 'Within 3 days' },
    { value: 'within-week', label: 'Within a week' },
  ];

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile(prev => ({ ...prev, ...profileSnap.data() }));
        } else {
          // Initialize with user's display name
          setProfile(prev => ({
            ...prev,
            displayName: user.displayName || '',
          }));
        }
      } catch (error) {
        logger.error('Error loading marketplace profile:', error);
        toastService.error('Failed to load marketplace profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
      await setDoc(
        profileRef,
        {
          ...profile,
          userId: user.uid,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      toastService.success('Marketplace profile updated successfully');
    } catch (error) {
      logger.error('Error saving marketplace profile:', error);
      toastService.error('Failed to save marketplace profile');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = methodId => {
    setProfile(prev => ({
      ...prev,
      preferredPaymentMethods: prev.preferredPaymentMethods.includes(methodId)
        ? prev.preferredPaymentMethods.filter(id => id !== methodId)
        : [...prev.preferredPaymentMethods, methodId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Marketplace Profile
        </h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Customize how buyers see you in the marketplace
        </p>
      </div>

      {/* Display Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Display Name
        </label>
        <input
          type="text"
          value={profile.displayName}
          onChange={e =>
            setProfile(prev => ({ ...prev, displayName: e.target.value }))
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white"
          placeholder="Your marketplace name"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Bio
        </label>
        <textarea
          value={profile.bio}
          onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white"
          rows={3}
          placeholder="Tell buyers a bit about yourself..."
        />
      </div>

      {/* Location */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Location
        </label>
        <input
          type="text"
          value={profile.location}
          onChange={e =>
            setProfile(prev => ({ ...prev, location: e.target.value }))
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white"
          placeholder="City, State/Country"
        />
      </div>

      {/* Preferred Payment Methods */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Preferred Payment Methods
        </label>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map(method => (
            <button
              key={method.id}
              onClick={() => togglePaymentMethod(method.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                profile.preferredPaymentMethods.includes(method.id)
                  ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <span className="material-icons text-sm">{method.icon}</span>
              <span className="text-sm">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Response Time */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Typical Response Time
        </label>
        <CustomDropdown
          value={profile.responseTime}
          onSelect={selectedValue =>
            setProfile(prev => ({ ...prev, responseTime: selectedValue }))
          }
          options={responseTimeOptions}
        />
      </div>

      {/* Auto Reply Message */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto Reply Message (Optional)
        </label>
        <textarea
          value={profile.autoReplyMessage}
          onChange={e =>
            setProfile(prev => ({ ...prev, autoReplyMessage: e.target.value }))
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white"
          rows={2}
          placeholder="Thanks for your interest! I'll get back to you soon."
        />
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show ratings on profile
          </span>
          <button
            onClick={() =>
              setProfile(prev => ({ ...prev, showRatings: !prev.showRatings }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.showRatings
                ? 'bg-purple-600'
                : 'bg-gray-300 dark:bg-[#0F0F0F]'
            }`}
          >
            <span
              className={`inline-block size-4 rounded-full bg-white transition-transform${
                profile.showRatings ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Allow buyers to make offers
          </span>
          <button
            onClick={() =>
              setProfile(prev => ({ ...prev, allowOffers: !prev.allowOffers }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.allowOffers
                ? 'bg-purple-600'
                : 'bg-gray-300 dark:bg-[#0F0F0F]'
            }`}
          >
            <span
              className={`inline-block size-4 rounded-full bg-white transition-transform${
                profile.allowOffers ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="size-4 animate-spin rounded-full border-y-2 border-white"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="material-icons text-sm">save</span>
              <span>Save Profile</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default MarketplaceProfile;
