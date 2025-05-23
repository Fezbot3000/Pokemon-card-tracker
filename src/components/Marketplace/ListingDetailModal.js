import React, { useState, useEffect } from 'react';
import { Modal, Button, Icon, toast } from '../../design-system';
import { useAuth } from '../../design-system';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import MapView from './MapView';

function ListingDetailModal({ isOpen, onClose, listing, onContactSeller, onReportListing, onViewSellerProfile }) {
  const { user } = useAuth();
  const [imageIndex, setImageIndex] = useState(0);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingSellerData, setLoadingSellerData] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);

  useEffect(() => {
    if (!listing || !isOpen) return;

    const loadSellerData = async () => {
      try {
        setLoadingSellerData(true);
        
        // Load seller profile
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', listing.userId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setSellerProfile(profileSnap.data());
        }
        
        // Load seller reviews
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        const q = query(
          reviewsRef,
          where('sellerId', '==', listing.userId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const reviews = [];
        let totalRating = 0;
        
        querySnapshot.forEach((doc) => {
          const review = { id: doc.id, ...doc.data() };
          reviews.push(review);
          totalRating += review.rating;
        });
        
        setSellerReviews(reviews);
        setTotalReviews(reviews.length);
        setAverageRating(reviews.length > 0 ? totalRating / reviews.length : 0);
      } catch (error) {
        logger.error('Error loading seller data:', error);
      } finally {
        setLoadingSellerData(false);
      }
    };

    loadSellerData();
  }, [listing, isOpen]);

  if (!listing) return null;

  // Get card data from listing
  const card = listing.card || {};
  
  // Try multiple image sources
  const cardImage = card.cloudImageUrl || card.imageURL || card.imageUrl || card.img || listing.images?.[0] || null;
  const images = listing.images?.length > 0 ? listing.images : (cardImage ? [cardImage] : []);
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = () => {
    setImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
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
    const prefilledMessage = `Hi, is this available?`;
    onContactSeller(listing, prefilledMessage);
  };

  const handleViewSellerProfile = () => {
    if (onViewSellerProfile) {
      onViewSellerProfile(listing.userId);
    } else {
      toast.error('Seller profile view is not available');
    }
  };

  const ReviewsModal = () => (
    <Modal
      isOpen={showAllReviews}
      onClose={() => setShowAllReviews(false)}
      title="Seller Reviews"
      size="medium"
      zIndex={60}
    >
      <div className="space-y-4">
        {/* Rating Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating))}
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sellerReviews.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No reviews yet
            </p>
          ) : (
            sellerReviews.map((review) => (
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
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="full"
        className="!h-screen !max-h-screen"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Listing Details</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Icon name="close" size="md" />
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowReportMenu(!showReportMenu)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Icon name="more_horiz" size="md" />
                </button>
                {showReportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    <button
                      onClick={() => {
                        setShowReportMenu(false);
                        onReportListing();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Report Listing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 lg:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left Column - Images */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square">
                    {images.length > 0 ? (
                      <>
                        <img
                          src={images[imageIndex]}
                          alt={card.name || 'Card image'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('Image failed to load:', e.target.src);
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23e5e7eb"/%3E%3Ctext x="200" y="200" font-family="Arial" font-size="20" fill="%236b7280" text-anchor="middle" dominant-baseline="middle"%3ENo Image Available%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        
                        {/* Navigation Arrows */}
                        {hasMultipleImages && (
                          <>
                            <button
                              onClick={handlePrevImage}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                              <Icon name="chevron_left" size="md" />
                            </button>
                            <button
                              onClick={handleNextImage}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            >
                              <Icon name="chevron_right" size="md" />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Icon name="image" size="xl" className="text-gray-400 mb-2" />
                          <p className="text-gray-500">No image available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image Indicators */}
                  {hasMultipleImages && (
                    <div className="flex justify-center gap-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === imageIndex
                              ? 'bg-gray-800 dark:bg-white'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column - Details */}
                <div className="lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2">
                  <div className="space-y-6">
                    {/* Title and Price */}
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {card.name || card.cardName || 'Pokemon Card'}
                      </h1>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${listing.listingPrice}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Listed in {listing.location || 'Unknown location'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleMessageSeller}
                        className="flex-1"
                      >
                        Message Seller
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => onReportListing()}
                      >
                        Report Listing
                      </Button>
                    </div>

                    {/* Details Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h2 className="text-lg font-semibold mb-4">Details</h2>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-gray-600 dark:text-gray-400">Condition</dt>
                          <dd className="font-medium">
                            {card.grade ? `${card.gradingCompany || 'PSA'} ${card.grade}` : 'Ungraded'}
                          </dd>
                        </div>
                        {card.set && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Set</dt>
                            <dd className="font-medium">{card.set}</dd>
                          </div>
                        )}
                        {card.year && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Year</dt>
                            <dd className="font-medium">{card.year}</dd>
                          </div>
                        )}
                        {card.category && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Category</dt>
                            <dd className="font-medium">{card.category}</dd>
                          </div>
                        )}
                        {card.slabSerial && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Slab Serial</dt>
                            <dd className="font-medium">{card.slabSerial}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm text-gray-600 dark:text-gray-400">Location</dt>
                          <dd className="font-medium">{listing.location || 'Not specified'}</dd>
                        </div>
                        {card.purchasePrice && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Purchase Price</dt>
                            <dd className="font-medium">${card.purchasePrice}</dd>
                          </div>
                        )}
                        {card.currentValue && (
                          <div>
                            <dt className="text-sm text-gray-600 dark:text-gray-400">Current Value</dt>
                            <dd className="font-medium">${card.currentValue}</dd>
                          </div>
                        )}
                      </dl>
                      
                      {listing.note && (
                        <div className="mt-4">
                          <dt className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</dt>
                          <dd className="text-gray-900 dark:text-white">{listing.note}</dd>
                        </div>
                      )}
                    </div>

                    {/* Map Section */}
                    {listing.location && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h2 className="text-lg font-semibold mb-4">Location</h2>
                        <MapView 
                          location={listing.location} 
                          cardName={card.name || card.cardName || 'Pokemon Card'}
                          price={listing.listingPrice}
                        />
                      </div>
                    )}

                    {/* Seller Information */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h2 className="text-lg font-semibold mb-4">Seller Information</h2>
                      
                      {loadingSellerData ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Seller Profile */}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                              <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                                {sellerProfile?.displayName?.charAt(0) || 'S'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <button
                                onClick={handleViewSellerProfile}
                                className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                              >
                                {sellerProfile?.displayName || 'Seller'}
                              </button>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Joined {sellerProfile?.createdAt ? formatDate(sellerProfile.createdAt) : 'Recently'}
                              </p>
                            </div>
                            <button
                              onClick={handleViewSellerProfile}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Seller details
                            </button>
                          </div>

                          {/* Quick Message */}
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Send seller a message
                            </p>
                            <button
                              onClick={handleMessageSeller}
                              className="w-full text-left px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                              <span className="text-gray-600 dark:text-gray-400">
                                Hi, is this available?
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reviews Modal */}
      <ReviewsModal />
    </>
  );
}

export default ListingDetailModal;
