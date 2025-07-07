import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, toast } from '../../design-system';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import LazyImage from './LazyImage';
import ReviewSystem from './ReviewSystem';

function SellerProfile({ sellerId, onClose, onViewListing }) {
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    if (!sellerId) return;

    const loadSellerData = async () => {
      setLoading(true);
      try {
        // Load marketplace profile
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', sellerId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setSellerProfile(profileSnap.data());
        }

        // Load seller's active listings
        const listingsQuery = query(
          collection(firestoreDb, 'marketplace-listings'),
          where('userId', '==', sellerId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const listingsSnap = await getDocs(listingsQuery);
        const listingsData = listingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSellerListings(listingsData);
      } catch (error) {
        logger.error('Error loading seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [sellerId]);

  const renderBadges = () => {
    if (!sellerProfile) return null;

    const badges = [];
    
    // Response time badge
    if (sellerProfile.responseTime === 'within-1h') {
      badges.push({
        icon: 'flash_on',
        label: 'Fast Responder',
        color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      });
    }

    // Add more badges based on seller stats
    // This would be expanded with actual seller performance data
    
    return badges.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((badge, index) => (
          <div
            key={index}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${badge.color}`}
          >
            <span className="material-icons text-xs">{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    ) : null;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            size="sm"
            className={star <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
          />
        ))}
      </div>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Seller Profile"
      size="large"
      className="max-w-4xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seller Info Header */}
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <div className="flex items-start gap-4">
              <div className="flex size-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <Icon name="person" size="xl" className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sellerProfile?.displayName || 'Seller'}
                </h2>
                {sellerProfile?.location && (
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    <Icon name="location_on" size="sm" className="mr-1 inline" />
                    {sellerProfile.location}
                  </p>
                )}
                {sellerProfile?.bio && (
                  <p className="mt-3 text-gray-700 dark:text-gray-300">
                    {sellerProfile.bio}
                  </p>
                )}
                {renderBadges()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('listings')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'listings'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Listings ({sellerListings.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Reviews
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'listings' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sellerListings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => onViewListing(listing)}
                    className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="relative aspect-square">
                      <LazyImage
                        src={listing.images?.[0] || '/placeholder-card.png'}
                        alt={listing.cardName}
                        className="size-full object-cover"
                      />
                      {listing.condition && (
                        <span className="bg-black/70 absolute right-2 top-2 rounded px-2 py-1 text-xs text-white">
                          {listing.condition}
                        </span>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="line-clamp-2 font-semibold text-gray-900 dark:text-white">
                        {listing.cardName}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold text-purple-600">
                          ${listing.price}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {listing.location || 'Local'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sellerListings.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                    No active listings
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <ReviewSystem sellerId={sellerId} />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default SellerProfile;
