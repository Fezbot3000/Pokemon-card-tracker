import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, toast } from '../../design-system';
import { useAuth } from '../../design-system';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import db from '../../services/firestore/dbAdapter'; // Import IndexedDB service for image loading

function SellerProfileModal({ isOpen, onClose, sellerId, onOpenListing, cardImages, onContactSeller, onViewChange }) {
  const { user } = useAuth();
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeListings, setActiveListings] = useState([]);
  const [activeTab, setActiveTab] = useState('listings');
  const [sellerCardImages, setSellerCardImages] = useState({});
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
          loadSellerCardImages(foundSellerListings);
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

  // Load card images for seller's listings
  const loadSellerCardImages = async (listingsData) => {
    if (!listingsData || listingsData.length === 0) return;

    const newCardImages = {};

    // Helper function to ensure we have a string URL
    const ensureStringUrl = (imageData) => {
      if (!imageData) return null;

      // If it's already a string, return it
      if (typeof imageData === 'string') {
        return imageData;
      }

      // If it's a File object with a preview URL
      if (imageData instanceof File && window.URL) {
        return window.URL.createObjectURL(imageData);
      }

      // If it's an object with a URL property, use that
      if (typeof imageData === 'object') {
        // Check for common URL properties
        if (imageData.url) return imageData.url;
        if (imageData.src) return imageData.src;
        if (imageData.uri) return imageData.uri;
        if (imageData.href) return imageData.href;
        if (imageData.downloadURL) return imageData.downloadURL;
        if (imageData.path && typeof imageData.path === 'string') return imageData.path;

        // If it has a toString method, try that
        if (typeof imageData.toString === 'function') {
          const stringValue = imageData.toString();
          if (stringValue !== '[object Object]') {
            return stringValue;
          }
        }
      }

      // If it's a Blob with a type
      if (imageData instanceof Blob && imageData.type && imageData.type.startsWith('image/')) {
        return window.URL.createObjectURL(imageData);
      }

      // If we can't extract a URL, return null
      return null;
    };

    // Process each listing
    for (const listing of listingsData) {
      try {
        const card = listing.card;
        if (!card) continue;

        const cardId = card.slabSerial || card.id || listing.cardId;
        if (!cardId) continue;

        console.log(`Loading image for seller listing ${cardId}:`, {
          hasImageUrl: Boolean(card.imageUrl),
          hasImage: Boolean(card.image),
          imageUrlType: card.imageUrl ? typeof card.imageUrl : 'none',
          imageType: card.image ? typeof card.image : 'none'
        });

        // First, check if the card has an imageUrl property
        if (card.imageUrl) {
          const url = ensureStringUrl(card.imageUrl);
          if (url) {
            console.log(`Using imageUrl for seller card ${cardId}:`, url);
            newCardImages[cardId] = url;
            continue;
          }
        }

        // Next, check if the card has an image property
        if (card.image) {
          const imageUrl = ensureStringUrl(card.image);
          if (imageUrl) {
            console.log(`Using image property for seller card ${cardId}:`, imageUrl);
            newCardImages[cardId] = imageUrl;
            continue;
          }
        }

        // Check all other possible image properties
        const possibleImageProps = ['frontImageUrl', 'backImageUrl', 'imageData', 'cardImageUrl'];
        let foundImage = false;

        for (const prop of possibleImageProps) {
          if (card[prop]) {
            const url = ensureStringUrl(card[prop]);
            if (url) {
              console.log(`Using ${prop} for seller card ${cardId}:`, url);
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        if (foundImage) continue;

        // If no image in card object, try to load from IndexedDB
        try {
          const imageBlob = await db.getImage(cardId);
          if (imageBlob) {
            const blobUrl = URL.createObjectURL(imageBlob);
            console.log(`Using IndexedDB image for seller card ${cardId}:`, blobUrl);
            newCardImages[cardId] = blobUrl;
            continue;
          }
        } catch (dbError) {
          // Silently handle IndexedDB errors
          logger.warn(`Error loading image from IndexedDB for seller card ${cardId}:`, dbError);
        }

        // If we still don't have an image, set to null
        console.log(`No image found for seller card ${cardId}`);
        newCardImages[cardId] = null;
      } catch (error) {
        logger.warn('Error processing seller card image:', error);
      }
    }

    setSellerCardImages(newCardImages);
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

  const handleMessageSeller = () => {
    if (!onContactSeller || !user || user.uid === sellerId) return;
    
    // Create a general listing object for messaging (not tied to a specific item)
    const generalListing = {
      id: `general_${sellerId}_${Date.now()}`, // Unique ID for general conversations
      userId: sellerId,
      cardName: 'General Discussion',
      card: {
        name: 'General Discussion'
      },
      isGeneralChat: true // Flag to indicate this is a general conversation
    };
    
    const prefilledMessage = `Hi! I'd like to discuss your Pokemon cards.`;
    
    // Close this modal first to prevent modal stacking issues
    onClose();
    
    // Small delay to ensure modal closes before opening the next one
    setTimeout(() => {
      onContactSeller(generalListing, prefilledMessage);
    }, 100);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Seller Profile" className="rounded-2xl overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-8 pb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white -mx-6 mt-6">
            <div className="flex items-center gap-6 px-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                <Icon name="person" size="xl" className="text-white" />
              </div>
              
              {/* Seller Info */}
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">
                      {sellerProfile?.displayName || 'Seller'}
                    </h2>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/90">
                        <Icon name="calendar_today" size="sm" />
                        <span className="text-sm">Member since {formatDate(sellerProfile?.createdAt)}</span>
                      </div>
                      {sellerProfile?.location && (
                        <div className="flex items-center gap-2 text-white/90">
                          <Icon name="location_on" size="sm" />
                          <span className="text-sm">{sellerProfile.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Message Seller Button - Mobile positioned below location */}
                    {user && user.uid !== sellerId && onContactSeller && (
                      <div className="mt-4 lg:hidden">
                        <Button
                          onClick={handleMessageSeller}
                          variant="secondary"
                          size="md"
                          className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200 w-full"
                        >
                          <Icon name="message" size="sm" className="mr-2" />
                          Message Seller
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Message Seller Button - Desktop positioned on the right */}
                  {user && user.uid !== sellerId && onContactSeller && (
                    <div className="hidden lg:block">
                      <Button
                        onClick={handleMessageSeller}
                        variant="secondary"
                        size="md"
                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-200"
                      >
                        <Icon name="message" size="sm" className="mr-2" />
                        Message Seller
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('listings')}
                className={`pb-4 px-2 font-semibold transition-all duration-200 relative ${
                  activeTab === 'listings'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Listings ({activeListings.length})
                {activeTab === 'listings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-4 px-2 font-semibold transition-all duration-200 relative ${
                  activeTab === 'reviews'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Reviews ({totalReviews})
                {activeTab === 'reviews' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'listings' ? (
            <div>
              {activeListings.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="rate_review" size="xl" className="text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No active listings</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Start selling to receive your first review!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {activeListings.map((listing) => (
                    <div
                      key={listing.id}
                      onClick={() => {
                        // Close seller profile and open listing detail
                        onClose();
                        onOpenListing(listing);
                      }}
                      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-4">
                        {/* Card Image */}
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                          {(() => {
                            const cardImageKey = listing.card?.slabSerial || listing.card?.id || listing.cardId;
                            const cardImage = sellerCardImages?.[cardImageKey];
                            const fallbackImage = listing.images?.[0] || listing.imageUrls?.[0] || listing.cardImages?.[0];
                            const imageUrl = cardImage || fallbackImage;
                            
                            console.log('Image lookup for listing', listing.id, ':', {
                              cardImageKey,
                              cardImage,
                              fallbackImage,
                              finalImageUrl: imageUrl,
                              sellerCardImagesKeys: Object.keys(sellerCardImages)
                            });
                            
                            if (imageUrl) {
                              return (
                                <img
                                  src={imageUrl}
                                  alt={listing.card?.name || 'Card image'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                                  <Icon name="image" size="md" />
                                </div>
                              );
                            }
                          })()}
                        </div>
                        
                        {/* Card Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-base mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {listing.cardName || listing.card?.name || listing.card?.cardName || listing.title || 'Unknown Card'}
                          </h4>
                          
                          <div className="space-y-2">
                            <p className="text-purple-600 dark:text-purple-400 font-bold text-xl">
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
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                <Icon name="collections" size="xs" className="inline mr-1" />
                                {listing.card.set}
                              </p>
                            )}
                            
                            {listing.condition && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <Icon name="star" size="xs" className="inline mr-1" />
                                {listing.condition}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-md"
                        >
                          <Icon name="visibility" size="sm" className="mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Rating Overview */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rating Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center mb-2">
                      {renderStars(Math.round(averageRating))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Average Rating
                    </div>
                  </div>

                  {/* Total Reviews */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {totalReviews}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Total Reviews
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Rating Distribution</h4>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-3">{rating}</span>
                        <Icon name="star" size="sm" className="text-yellow-500" />
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-500"
                            style={{
                              width: totalReviews > 0 ? `${(ratingBreakdown[rating] / totalReviews) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right font-medium">
                          {ratingBreakdown[rating]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Reviews */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Reviews</h3>
                {sellerReviews.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <Icon name="rate_review" size="2xl" className="text-gray-400 mb-4" />
                    <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">No reviews yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Start selling to receive your first review!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {sellerReviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <Icon name="person" size="sm" className="text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {review.buyerName || 'Anonymous'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(review.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        
                        {review.comment && (
                          <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                        
                        {review.itemTitle && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Icon name="shopping_cart" size="sm" className="text-purple-500" />
                              <span className="font-medium">Item:</span> {review.itemTitle}
                            </p>
                          </div>
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
