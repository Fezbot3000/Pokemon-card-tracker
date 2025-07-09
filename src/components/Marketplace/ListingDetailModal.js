import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Icon, toastService } from '../../design-system';
import { useAuth } from '../../design-system';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import MapView from './MapView';
import BuyerSelectionModal from './BuyerSelectionModal';


function ListingDetailModal({
  isOpen,
  onClose,
  listing,
  onContactSeller,
  // onReportListing, // Removed - not used
  onViewSellerProfile,
  onEditListing,
  // onMarkAsPending, // Removed - not used
  // onMarkAsSold, // Removed - not used
  onViewChange,
}) {
  // Temporary test to verify our changes are loading
  if (typeof window !== 'undefined' && !window.debugTestRan) {
    window.debugTestRan = true;
  }

  const { user } = useAuth();
  const [imageIndex, setImageIndex] = useState(0);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingSellerData, setLoadingSellerData] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [hasExistingChat, setHasExistingChat] = useState(false);
  const [existingChatId, setExistingChatId] = useState(null);
  const [showBuyerSelectionModal, setShowBuyerSelectionModal] = useState(false);



  useEffect(() => {
    if (!listing || !isOpen) return;

    const loadSellerData = async () => {
      try {
        setLoadingSellerData(true);

        // Load seller profile
        const profileRef = doc(
          firestoreDb,
          'marketplaceProfiles',
          listing.userId
        );
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            setSellerProfile(profileData);

            // Store the actual marketplace profile userId for viewing seller's other listings
            if (profileData.userId) {
              listing._marketplaceProfileUserId = profileData.userId;
            }
          } else {
            logger.error('Seller profile not found');
          }
        } catch (error) {
          if (error.code === 'permission-denied') {
            logger.error('Permission denied: cannot access seller profile');
            toastService.error(
              'Permission denied: cannot access seller profile'
            );
          } else {
            logger.error('Error loading seller profile:', error);
          }
        }

        // Load seller reviews
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        const q = query(
          reviewsRef,
          where('sellerId', '==', listing.userId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        try {
          const querySnapshot = await getDocs(q);
          const reviews = [];
          let totalRating = 0;

          querySnapshot.forEach(doc => {
            const review = { id: doc.id, ...doc.data() };
            reviews.push(review);
            totalRating += review.rating;
          });

          setSellerReviews(reviews);
          setTotalReviews(reviews.length);
          setAverageRating(
            reviews.length > 0 ? totalRating / reviews.length : 0
          );
        } catch (error) {
          if (error.code === 'permission-denied') {
            logger.error('Permission denied: cannot access seller reviews');
          } else {
            logger.error('Error loading seller reviews:', error);
          }
          setSellerReviews([]);
          setTotalReviews(0);
          setAverageRating(0);
        }

        // Check for existing chat with this seller about this listing
        await checkForExistingChat();
      } catch (error) {
        logger.error('Error loading seller data:', error);
      } finally {
        setLoadingSellerData(false);
      }
    };

    loadSellerData();
  }, [listing, isOpen]);

  // Function to check for existing chats
  const checkForExistingChat = useCallback(async () => {
    if (!user || !listing || user.uid === listing.userId) return;

    try {
      const chatsRef = collection(firestoreDb, 'chats');
      const chatQuery = query(
        chatsRef,
        where('participants', 'array-contains', user.uid),
        where('cardId', '==', listing.id)
      );

      const chatSnapshot = await getDocs(chatQuery);
      if (!chatSnapshot.empty) {
        // Find chat with this specific seller that is NOT hidden by current user
        const existingChat = chatSnapshot.docs.find(doc => {
          const chatData = doc.data();
          const isMatchingSeller =
            chatData.sellerId === listing.userId ||
            chatData.buyerId === listing.userId;
          const isNotHiddenByUser =
            !chatData.hiddenBy || !chatData.hiddenBy[user.uid];
          return isMatchingSeller && isNotHiddenByUser;
        });

        if (existingChat) {
          setHasExistingChat(true);
          setExistingChatId(existingChat.id);
        }
      }
    } catch (error) {
      if (error.code === 'permission-denied') {
        logger.error('Permission denied: cannot check for existing chats');
      } else {
        logger.error('Error checking for existing chat:', error);
      }
    }
  }, [user, listing]);

  if (!listing || !listing.card) {
    return null;
  }

  const card = listing.card;

  // Try multiple image sources
  const cardImage =
    card.cloudImageUrl ||
    card.imageURL ||
    card.imageUrl ||
    card.img ||
    listing.images?.[0] ||
    null;
  const images =
    listing.images?.length > 0 ? listing.images : cardImage ? [cardImage] : [];
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = () => {
    setImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const renderStars = rating => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Icon
            key={star}
            name="star"
            size="sm"
            className={
              star <= rating
                ? 'text-yellow-500'
                : 'text-gray-300 dark:text-gray-600'
            }
          />
        ))}
      </div>
    );
  };

  const formatDate = timestamp => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleMessageSeller = () => {
    const prefilledMessage = `Hi, is this available?`;
    onContactSeller(listing, prefilledMessage);
  };

  const handleNavigateToChat = () => {
    if (onViewChange && existingChatId) {
      // Navigate to Messages tab - the Messages component will auto-select this chat
      // We'll use a URL parameter to pass the chat ID
      onViewChange('marketplace-messages');
      onClose(); // Close the listing modal

      // Set a brief timeout to ensure the Messages component has loaded, then trigger chat selection
      setTimeout(() => {
        // Dispatch a custom event that the Messages component can listen for
        window.dispatchEvent(
          new CustomEvent('openSpecificChat', {
            detail: { chatId: existingChatId },
          })
        );
      }, 100);
    } else {
      // Fallback: just navigate to messages tab
      onViewChange('marketplace-messages');
      onClose();
    }
  };

  const handleViewSellerProfile = () => {
    if (onViewSellerProfile) {
      // Always use the listing's userId which is the Firebase Auth user ID
      onViewSellerProfile(listing.userId);
    } else {
      toastService.info('Seller profile view is not available');
    }
  };

  const handleEditListing = async () => {
    onEditListing(listing);
  };

  const handleMarkAsPending = async () => {
    try {
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'pending',
        updatedAt: new Date(),
      });
      toastService.success('Listing marked as pending');
    } catch (error) {
      logger.error('Error marking listing as pending:', error);
      toastService.error('Failed to mark listing as pending');
    }
  };

  const handleMarkAsSold = async () => {
    setShowBuyerSelectionModal(true);
  };

  // Determine if this is the seller's own listing
  const isOwnListing = user?.uid === listing.userId;

  // Generate footer content based on listing ownership
  const renderFooter = () => {
    if (isOwnListing) {
      // Seller's own listing - show management actions
      return (
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleMarkAsPending}
              leftIcon={<Icon name="schedule" />}
            >
              Mark as Pending
            </Button>
            <Button
              variant="success"
              onClick={handleMarkAsSold}
              leftIcon={<Icon name="check_circle" />}
            >
              Mark as Sold
            </Button>
            <Button
              variant="primary"
              onClick={handleEditListing}
              leftIcon={<Icon name="edit" />}
            >
              Edit
            </Button>
          </div>
        </>
      );
    } else {
      // Other user's listing - show contact action
      return (
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              hasExistingChat ? handleNavigateToChat() : handleMessageSeller();
            }}
            leftIcon={<Icon name="message" />}
          >
            {hasExistingChat
              ? 'Continue Conversation'
              : 'Send Seller a Message'}
          </Button>
        </>
      );
    }
  };

  const ReviewsModal = () => (
    <Modal
      isOpen={showAllReviews}
      onClose={() => setShowAllReviews(false)}
      title="Seller Reviews"
      size="lg"
      position="center"
    >
      <div className="space-y-4">
        {/* Rating Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating))}
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {sellerReviews.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              No reviews yet
            </p>
          ) : (
            sellerReviews.map(review => (
              <div
                key={review.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {review.buyerName || 'Anonymous'}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-2 text-gray-700 dark:text-gray-300">
                    "{review.comment}"
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
        title="Listing Details"
        position="right"
        size="2xl"
        closeOnClickOutside={true}
        footer={renderFooter()}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            {/* Left Column - Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#000]">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[imageIndex]}
                      alt={card.name || 'Card image'}
                      className="size-full object-contain"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23e5e7eb"/%3E%3Ctext x="200" y="200" font-family="Arial" font-size="20" fill="%236b7280" text-anchor="middle" dominant-baseline="middle"%3ENo Image Available%3C/text%3E%3C/svg%3E';
                      }}
                    />

                    {/* Navigation Arrows */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={handlePrevImage}
                          className="bg-white/80 absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors hover:bg-white dark:bg-[#0F0F0F]/80 dark:hover:bg-[#0F0F0F]"
                        >
                          <Icon name="chevron_left" size="md" />
                        </button>
                        <button
                          onClick={handleNextImage}
                          className="bg-white/80 absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors hover:bg-white dark:bg-[#0F0F0F]/80 dark:hover:bg-[#0F0F0F]"
                        >
                          <Icon name="chevron_right" size="md" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <div className="text-center">
                      <Icon
                        name="image"
                        size="xl"
                        className="mb-2 text-gray-400"
                      />
                      <p className="text-gray-500">No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Indicators */}
              {hasMultipleImages && (
                <div className="flex justify-center gap-2">
                  {images.map((image, index) => (
                    <button
                      key={`image-nav-${image || `placeholder-${index}`}`}
                      onClick={() => setImageIndex(index)}
                      className={`size-2 rounded-full transition-colors ${
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
            <div className="space-y-6">
              {/* Title and Price */}
              <div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {card.name || card.cardName || 'Pokemon Card'}
                </h1>
                <div className="mb-2 flex items-center gap-3">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${listing.listingPrice}
                  </p>
                  {/* Status Tag */}
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      listing.status === 'sold'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : listing.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {listing.status === 'sold'
                      ? 'SOLD'
                      : listing.status === 'pending'
                        ? 'PENDING'
                        : 'FOR SALE'}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Listed in {listing.location}
                </p>
              </div>

              {/* Seller Information (only for other user's listings) */}
              {!isOwnListing && (
                <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                  <h2 className="mb-4 text-lg font-semibold">
                    Seller Information
                  </h2>

                  {loadingSellerData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Seller Profile */}
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                          <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                            {sellerProfile?.displayName?.charAt(0) || 'S'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <button
                            onClick={handleViewSellerProfile}
                            className="font-medium text-gray-900 hover:text-purple-600 dark:text-white dark:hover:text-purple-400"
                          >
                            {sellerProfile?.displayName || 'Seller'}
                          </button>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Joined{' '}
                            {sellerProfile?.createdAt
                              ? formatDate(sellerProfile.createdAt)
                              : 'Recently'}
                          </p>
                        </div>
                        <button
                          onClick={handleViewSellerProfile}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Seller details
                        </button>
                      </div>

                      {/* Reviews Summary */}
                      {sellerReviews.length > 0 && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {renderStars(Math.round(averageRating))}
                              <span className="font-medium">
                                {averageRating.toFixed(1)}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({totalReviews}{' '}
                                {totalReviews === 1 ? 'review' : 'reviews'})
                              </span>
                            </div>
                            <button
                              onClick={() => setShowAllReviews(true)}
                              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                              View all
                            </button>
                          </div>

                          {/* Latest Review */}
                          {sellerReviews[0] && (
                            <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                              <div className="mb-1 flex items-center gap-2">
                                {renderStars(sellerReviews[0].rating)}
                                <span className="text-sm text-gray-500">
                                  {formatDate(sellerReviews[0].createdAt)}
                                </span>
                              </div>
                              {sellerReviews[0].comment && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  "{sellerReviews[0].comment}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Details Section */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h2 className="mb-4 text-lg font-semibold">Details</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      Condition
                    </dt>
                    <dd className="font-medium">
                      {card.grade
                        ? `${card.gradingCompany || 'PSA'} ${card.grade}`
                        : 'Ungraded'}
                    </dd>
                  </div>
                  {card.set && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Set
                      </dt>
                      <dd className="font-medium">{card.set}</dd>
                    </div>
                  )}
                  {card.year && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Year
                      </dt>
                      <dd className="font-medium">{card.year}</dd>
                    </div>
                  )}
                  {card.category && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Category
                      </dt>
                      <dd className="font-medium">{card.category}</dd>
                    </div>
                  )}
                  {card.slabSerial && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Slab Serial
                      </dt>
                      <dd className="font-medium">{card.slabSerial}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      Location
                    </dt>
                    <dd className="font-medium">
                      {listing.location || 'Not specified'}
                    </dd>
                  </div>
                  {card.purchasePrice && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Purchase Price
                      </dt>
                      <dd className="font-medium">${card.purchasePrice}</dd>
                    </div>
                  )}
                  {card.currentValue && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        Current Value
                      </dt>
                      <dd className="font-medium">${card.currentValue}</dd>
                    </div>
                  )}
                </dl>

                {listing.note && (
                  <div className="mt-4">
                    <dt className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      Description
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {listing.note}
                    </dd>
                  </div>
                )}
              </div>

              {/* Map Section */}
              {listing.location && (
                <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                  <h2 className="mb-4 text-lg font-semibold">Location</h2>
                  <MapView
                    location={listing.location}
                    cardName={card.name || card.cardName || 'Pokemon Card'}
                    price={listing.listingPrice}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Reviews Modal */}
      <ReviewsModal />

      {/* Buyer Selection Modal */}
      <BuyerSelectionModal
        isOpen={showBuyerSelectionModal}
        onClose={() => setShowBuyerSelectionModal(false)}
        listing={listing}
      />
    </>
  );
}

export default ListingDetailModal;
