import React, { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../../design-system';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

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
    allowOffers: true
  });

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'payments' },
    { id: 'bank-transfer', label: 'Bank Transfer', icon: 'account_balance' },
    { id: 'paypal', label: 'PayPal', icon: 'payment' },
    { id: 'crypto', label: 'Cryptocurrency', icon: 'currency_bitcoin' }
  ];

  const responseTimeOptions = [
    { value: 'within-1h', label: 'Within 1 hour' },
    { value: 'within-24h', label: 'Within 24 hours' },
    { value: 'within-3d', label: 'Within 3 days' },
    { value: 'within-week', label: 'Within a week' }
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
          setProfile(prev => ({ ...prev, displayName: user.displayName || '' }));
        }
      } catch (error) {
        logger.error('Error loading marketplace profile:', error);
        toast.error('Failed to load marketplace profile');
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
      await setDoc(profileRef, {
        ...profile,
        userId: user.uid,
        updatedAt: new Date()
      }, { merge: true });

      toast.success('Marketplace profile updated successfully');
    } catch (error) {
      logger.error('Error saving marketplace profile:', error);
      toast.error('Failed to save marketplace profile');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (methodId) => {
    setProfile(prev => ({
      ...prev,
      preferredPaymentMethods: prev.preferredPaymentMethods.includes(methodId)
        ? prev.preferredPaymentMethods.filter(id => id !== methodId)
        : [...prev.preferredPaymentMethods, methodId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Marketplace Profile
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize how buyers see you in the marketplace
        </p>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={profile.displayName}
          onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-black dark:text-white"
          placeholder="Your marketplace name"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bio
        </label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-black dark:text-white"
          rows={3}
          placeholder="Tell buyers a bit about yourself..."
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location
        </label>
        <input
          type="text"
          value={profile.location}
          onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-black dark:text-white"
          placeholder="City, State/Country"
        />
      </div>

      {/* Preferred Payment Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preferred Payment Methods
        </label>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map(method => (
            <button
              key={method.id}
              onClick={() => togglePaymentMethod(method.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                profile.preferredPaymentMethods.includes(method.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Typical Response Time
        </label>
        <select
          value={profile.responseTime}
          onChange={(e) => setProfile(prev => ({ ...prev, responseTime: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-black dark:text-white"
        >
          {responseTimeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Auto Reply Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Auto Reply Message (Optional)
        </label>
        <textarea
          value={profile.autoReplyMessage}
          onChange={(e) => setProfile(prev => ({ ...prev, autoReplyMessage: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-black dark:text-white"
          rows={2}
          placeholder="Thanks for your interest! I'll get back to you soon."
        />
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show ratings on profile
          </span>
          <button
            onClick={() => setProfile(prev => ({ ...prev, showRatings: !prev.showRatings }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.showRatings ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.showRatings ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Allow buyers to make offers
          </span>
          <button
            onClick={() => setProfile(prev => ({ ...prev, allowOffers: !prev.allowOffers }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.allowOffers ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
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
