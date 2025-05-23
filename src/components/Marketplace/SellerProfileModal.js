import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, toast } from '../../design-system';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';

function SellerProfileModal({ isOpen, onClose, sellerId }) {
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeListings, setActiveListings] = useState([]);
  const [activeTab, setActiveTab] = useState('listings');
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  });

  useEffect(() => {
    if (!isOpen || !sellerId) {
      console.log('SellerProfileModal: Not opening because:', { isOpen, sellerId });
      return;
    }

    console.log('=== SellerProfileModal Opening ===');
    console.log('sellerId parameter:', sellerId);
    console.log('sellerId type:', typeof sellerId);
    console.log('sellerId length:', sellerId?.length);

    const loadSellerData = async () => {
      try {
        setLoading(true);
        
        console.log('Loading seller data for ID:', sellerId);
        
        // Load seller profile
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', sellerId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setSellerProfile({ id: profileSnap.id, ...profileSnap.data() });
        } else {
          // If no marketplace profile exists, try to get basic user info
          const userRef = doc(firestoreDb, 'users', sellerId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setSellerProfile({
              id: userSnap.id,
              displayName: userData.displayName || userData.email?.split('@')[0] || 'Seller',
              createdAt: userData.createdAt || new Date()
            });
          }
        }
        
        // Load seller reviews
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        const reviewsQuery = query(
          reviewsRef,
          where('sellerId', '==', sellerId),
          orderBy('createdAt', 'desc')
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = [];
        let totalRating = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        
        reviewsSnapshot.forEach((doc) => {
          const review = { id: doc.id, ...doc.data() };
          reviews.push(review);
          totalRating += review.rating;
          breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
        });
        
        setSellerReviews(reviews);
        setTotalReviews(reviews.length);
        setAverageRating(reviews.length > 0 ? totalRating / reviews.length : 0);
        setRatingBreakdown(breakdown);
        
        // Load active listings
        try {
          const listingsRef = collection(firestoreDb, 'marketplaceItems');
          
          // Debug: First check ALL marketplace items to understand the data structure
          const allItemsQuery = query(listingsRef);
          const allItemsSnapshot = await getDocs(allItemsQuery);
          
          console.log('=== DEBUG: Checking ALL marketplace items ===');
          console.log('Total items in marketplace:', allItemsSnapshot.size);
          
          const userIdSet = new Set();
          allItemsSnapshot.forEach((doc) => {
            const data = doc.data();
            userIdSet.add(data.userId);
            
            // Check if this seller's ID matches (case-insensitive)
            if (data.userId && 
                (data.userId === sellerId || 
                 data.userId.toLowerCase() === sellerId.toLowerCase() ||
                 data.userId.trim() === sellerId.trim())) {
              console.log('MATCH FOUND! Listing for our seller:', {
                id: doc.id,
                userId: data.userId,
                sellerIdParam: sellerId,
                status: data.status,
                title: data.title || data.card?.name
              });
            }
            
            // Log first few items to see structure
            if (userIdSet.size <= 5) {
              console.log('Sample item:', {
                id: doc.id,
                userId: data.userId,
                sellerId: data.sellerId, // Check if it's sellerId instead
                status: data.status,
                title: data.title || data.card?.name
              });
            }
          });
          
          console.log('Unique userIds found:', Array.from(userIdSet));
          console.log('Looking for sellerId:', sellerId);
          console.log('=== END DEBUG ===');
          
          // Now try the actual query
          const listingsQuery = query(
            listingsRef,
            where('userId', '==', sellerId)
          );
          
          console.log('Querying listings for sellerId:', sellerId);
          
          const listingsSnapshot = await getDocs(listingsQuery);
          const listings = [];
          
          console.log('Total listings found for this seller:', listingsSnapshot.size);
          
          listingsSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Listing:', { 
              id: doc.id, 
              userId: data.userId, 
              status: data.status,
              title: data.title || data.card?.name
            });
            
            // Only include available listings
            if (data.status === 'available') {
              listings.push({ id: doc.id, ...data });
            }
          });
          
          console.log('Available listings after filtering:', listings.length);
          
          // Sort listings by timestamp on client side
          listings.sort((a, b) => {
            const timeA = a.timestampListed?.toDate?.() || a.timestampListed || 0;
            const timeB = b.timestampListed?.toDate?.() || b.timestampListed || 0;
            return timeB - timeA; // Descending order
          });
          
          // If no listings found with userId, try with sellerId field
          if (listings.length === 0) {
            console.log('No listings found with userId, trying sellerId field...');
            
            const sellerIdQuery = query(
              listingsRef,
              where('sellerId', '==', sellerId)
            );
            
            const sellerIdSnapshot = await getDocs(sellerIdQuery);
            console.log('Listings found with sellerId field:', sellerIdSnapshot.size);
            
            sellerIdSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log('Listing with sellerId:', { 
                id: doc.id, 
                sellerId: data.sellerId,
                userId: data.userId, 
                status: data.status,
                title: data.title || data.card?.name
              });
              
              // Only include available listings
              if (data.status === 'available') {
                listings.push({ id: doc.id, ...data });
              }
            });
            
            // Re-sort after adding new listings
            listings.sort((a, b) => {
              const timeA = a.timestampListed?.toDate?.() || a.timestampListed || 0;
              const timeB = b.timestampListed?.toDate?.() || b.timestampListed || 0;
              return timeB - timeA; // Descending order
            });
          }
          
          setActiveListings(listings);
        } catch (listingsError) {
          logger.error('Error loading seller listings:', listingsError);
          console.error('Listings query error:', listingsError);
          setActiveListings([]);
        }
      } catch (error) {
        logger.error('Error loading seller data:', error);
        toast.error('Failed to load seller profile');
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [sellerId, isOpen]);

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
      isOpen={isOpen}
      onClose={onClose}
      title="Seller Profile"
      size="large"
      className="max-w-4xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seller Info Header */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Icon name="person" size="xl" className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sellerProfile?.displayName || 'Seller'}
                </h2>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <Icon name="calendar_today" size="sm" className="inline mr-1" />
                    Member since {formatDate(sellerProfile?.createdAt)}
                  </div>
                  {sellerProfile?.location && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <Icon name="location_on" size="sm" className="inline mr-1" />
                      {sellerProfile.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('listings')}
                className={`pb-3 font-medium transition-colors relative ${
                  activeTab === 'listings'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Listings ({activeListings.length})
                {activeTab === 'listings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 font-medium transition-colors relative ${
                  activeTab === 'reviews'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Reviews
                {activeTab === 'reviews' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'listings' ? (
            <div>
              {activeListings.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No active listings
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {listing.images?.[0] && (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium line-clamp-1">{listing.title}</h4>
                          <p className="text-purple-600 dark:text-purple-400 font-bold">
                            ${listing.price}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reviews Statistics */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="mt-2">
                      {renderStars(Math.round(averageRating))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Average Rating
                    </div>
                  </div>

                  {/* Total Reviews */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      {totalReviews}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Total Reviews
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-sm w-4">{rating}</span>
                        <Icon name="star" size="sm" className="text-yellow-500" />
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full transition-all duration-300"
                            style={{
                              width: totalReviews > 0 ? `${(ratingBreakdown[rating] / totalReviews) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                          {ratingBreakdown[rating]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Reviews */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Reviews</h3>
                {sellerReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon name="rate_review" size="xl" className="text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Start selling to receive your first review!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sellerReviews.map((review) => (
                      <div
                        key={review.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{review.buyerName || 'Anonymous'}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-500">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 dark:text-gray-300 mt-2">
                            {review.comment}
                          </p>
                        )}
                        {review.itemTitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            <Icon name="shopping_cart" size="xs" className="inline mr-1" />
                            {review.itemTitle}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default SellerProfileModal;
