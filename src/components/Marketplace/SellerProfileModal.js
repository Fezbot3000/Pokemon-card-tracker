import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, toast } from '../../design-system';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';

function SellerProfileModal({ isOpen, onClose, sellerId, onOpenListing, cardImages }) {
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
          console.log('No marketplace profile found, trying users collection...');
          try {
            const userRef = doc(firestoreDb, 'users', sellerId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              console.log('Found user data:', userData);
              setSellerProfile({
                id: userSnap.id,
                displayName: userData.displayName || userData.email?.split('@')[0] || 'Seller',
                createdAt: userData.createdAt || new Date()
              });
            } else {
              console.log('No user data found, using fallback profile');
              // Fallback profile
              setSellerProfile({
                id: sellerId,
                displayName: 'Seller',
                createdAt: new Date()
              });
            }
          } catch (userError) {
            console.error('Error loading user data:', userError);
            // Still set a fallback profile
            setSellerProfile({
              id: sellerId,
              displayName: 'Seller',
              createdAt: new Date()
            });
          }
        }
        
        // Load seller reviews
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        const reviewsQuery = query(
          reviewsRef,
          where('sellerId', '==', sellerId)
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
        
        // Sort reviews by date (newest first) on client side
        reviews.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || a.createdAt || 0;
          const timeB = b.createdAt?.toDate?.() || b.createdAt || 0;
          return timeB - timeA;
        });
        
        setSellerReviews(reviews);
        setTotalReviews(reviews.length);
        setAverageRating(reviews.length > 0 ? totalRating / reviews.length : 0);
        setRatingBreakdown(breakdown);
        
        // Load active listings
        try {
          const listingsRef = collection(firestoreDb, 'marketplaceItems');
          
          // Debug: First check what fields are available in a sample listing
          console.log('=== DEBUGGING SELLER LISTINGS ===');
          console.log('Looking for listings with sellerId:', sellerId);
          
          // Try to get all available listings first to see the data structure
          const allListingsQuery = query(
            listingsRef,
            where('status', '==', 'available')
          );
          const allListingsSnapshot = await getDocs(allListingsQuery);
          
          console.log('Total available listings:', allListingsSnapshot.size);
          
          // Check first few listings to see field structure
          let foundSellerListings = [];
          allListingsSnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Check if this listing belongs to our seller
            if (data.userId === sellerId || data.sellerId === sellerId) {
              console.log('FOUND SELLER LISTING:', {
                id: doc.id,
                userId: data.userId,
                sellerId: data.sellerId,
                title: data.card?.name || data.title,
                status: data.status,
                priceAUD: data.priceAUD,
                price: data.price,
                askingPrice: data.askingPrice,
                allPriceFields: Object.keys(data).filter(key => key.toLowerCase().includes('price')),
                images: data.images,
                imageUrls: data.imageUrls,
                cardImages: data.cardImages,
                allImageFields: Object.keys(data).filter(key => key.toLowerCase().includes('image')),
                fullData: data
              });
              foundSellerListings.push({ id: doc.id, ...data });
            }
          });
          
          console.log('Found seller listings:', foundSellerListings.length);
          console.log('=== END DEBUGGING ===');
          
          // Sort listings by timestamp
          foundSellerListings.sort((a, b) => {
            const timeA = a.timestampListed?.toDate?.() || a.timestampListed || 0;
            const timeB = b.timestampListed?.toDate?.() || b.timestampListed || 0;
            return timeB - timeA;
          });
          
          setActiveListings(foundSellerListings);
        } catch (listingsError) {
          logger.error('Error loading seller listings:', listingsError);
          console.error('Listings query error:', listingsError);
          setActiveListings([]);
        }
      } catch (error) {
        logger.error('Error loading seller data:', error);
        console.error('=== SELLER PROFILE ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('SellerId that failed:', sellerId);
        console.error('=== END ERROR ===');
        toast.error(`Failed to load seller profile: ${error.message || 'Unknown error'}`);
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
                      onClick={() => {
                        // Close seller profile and open listing detail
                        onClose();
                        onOpenListing(listing);
                      }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                          {(() => {
                            const cardImageKey = listing.card?.slabSerial || listing.card?.id || listing.cardId;
                            const cardImage = cardImages?.[cardImageKey];
                            const fallbackImage = listing.images?.[0] || listing.imageUrls?.[0] || listing.cardImages?.[0];
                            const imageUrl = cardImage || fallbackImage;
                            
                            console.log('Image lookup for listing', listing.id, ':', {
                              cardImageKey,
                              cardImage,
                              fallbackImage,
                              finalImageUrl: imageUrl
                            });
                            
                            if (imageUrl) {
                              return (
                                <img
                                  src={imageUrl}
                                  alt={listing.card?.name || 'Card image'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.log('Image failed to load:', e.target.src);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              );
                            } else {
                              return (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Icon name="image" size="sm" />
                                </div>
                              );
                            }
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium line-clamp-2 text-sm">
                            {listing.card?.name || listing.title || 'Unknown Card'}
                          </h4>
                          <p className="text-purple-600 dark:text-purple-400 font-bold text-lg">
                            {(() => {
                              const price = listing.listingPrice || listing.priceAUD || listing.price || listing.askingPrice || listing.amount || listing.cost || 0;
                              const currency = listing.currency || 'AUD';
                              console.log('Price for listing', listing.id, ':', price, currency, 'from fields:', {
                                listingPrice: listing.listingPrice,
                                currency: listing.currency,
                                priceAUD: listing.priceAUD,
                                price: listing.price,
                                askingPrice: listing.askingPrice,
                                amount: listing.amount,
                                cost: listing.cost
                              });
                              return `${price} ${currency}`;
                            })()}
                          </p>
                          {listing.card?.set && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {listing.card.set}
                            </p>
                          )}
                          {listing.condition && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {listing.condition}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors">
                          View Details
                        </button>
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
