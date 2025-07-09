import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import db from '../../services/firestore/dbAdapter'; // Import IndexedDB service for image loading
import EditListingModal from './EditListingModal';
import ListingDetailModal from './ListingDetailModal';
import MarketplaceCard from './MarketplaceCard'; // Import the custom MarketplaceCard component
import MarketplaceNavigation from './MarketplaceNavigation'; // Import the navigation component
import MarketplaceSearchFilters from './MarketplaceSearchFilters'; // Import the search and filter component
import toast from 'react-hot-toast';
import BuyerSelectionModal from './BuyerSelectionModal'; // Import BuyerSelectionModal
import LoggingService from '../../services/LoggingService';

function MarketplaceSelling({ currentView, onViewChange }) {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    gradingCompany: '',
    grade: '',
  });
  const [loading, setLoading] = useState(true);
  const [cardImages, setCardImages] = useState({});
  const [selectedListing, setSelectedListing] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBuyerSelectionModalOpen, setIsBuyerSelectionModalOpen] =
    useState(false); // New state for buyer selection modal
  const { user } = useAuth();
  const { formatAmountForDisplay: formatUserCurrency } =
    useUserPreferences();

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    let unsubscribe;

    try {
      // Query for user's own listings
      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');

      // First try with the composite index (which might still be building)
      const marketplaceQuery = query(
        marketplaceRef,
        where('userId', '==', user.uid),
        orderBy('timestampListed', 'desc')
      );

      // Set up real-time listener for marketplace items
      unsubscribe = onSnapshot(
        marketplaceQuery,
        snapshot => {
          try {
            const listingsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));

            setAllListings(listingsData);
            setFilteredListings(listingsData);

            // Load card images after getting listings
            loadCardImages(listingsData);
          } catch (error) {
            // Ignore AdBlock related errors
            if (
              error.message &&
              error.message.includes('net::ERR_BLOCKED_BY_CLIENT')
            ) {
              // Silently handle AdBlock errors
            } else {
              logger.error('Error fetching user listings:', error);
            }
            setLoading(false);
          }
        },
        error => {
          // Check if this is an index building error
          if (error.message && error.message.includes('requires an index')) {
            logger.warn('Marketplace selling index is still building:', error);

            // Fall back to a simpler query without ordering
            try {
              const simpleQuery = query(
                marketplaceRef,
                where('userId', '==', user.uid)
              );

              unsubscribe = onSnapshot(
                simpleQuery,
                snapshot => {
                  const listingData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  // Sort manually on the client side
                  listingData.sort((a, b) => {
                    const timeA = a.timestampListed?.seconds || 0;
                    const timeB = b.timestampListed?.seconds || 0;
                    return timeB - timeA; // Descending order
                  });
                  setAllListings(listingData);
                  setFilteredListings(listingData);

                  // Load card images after getting listings
                  loadCardImages(listingData);
                  setLoading(false);
                },
                fallbackError => {
                  logger.error(
                    'Error in fallback user listings listener:',
                    fallbackError
                  );
                  setLoading(false);
                }
              );
            } catch (fallbackSetupError) {
              logger.error(
                'Error setting up fallback user listings listener:',
                fallbackSetupError
              );
              setLoading(false);
            }
          } else {
            // Ignore AdBlock related errors
            if (
              error.message &&
              error.message.includes('net::ERR_BLOCKED_BY_CLIENT')
            ) {
              // Silently handle AdBlock errors
            } else {
              logger.error('Error in user listings listener:', error);
            }
            setLoading(false);
          }
        }
      );
    } catch (error) {
      logger.error('Error setting up user listings listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Handle filter changes from the search/filter component
  const handleFilterChange = newFilters => {
    setFilters(newFilters);

    // Save filters to localStorage for persistence
    localStorage.setItem(
      'marketplaceSellingFilters',
      JSON.stringify(newFilters)
    );
  };

  // Load saved filters on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('marketplaceSellingFilters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (error) {
        LoggingService.error('Error parsing saved filters:', error);
      }
    }
  }, []);

  // Apply filters when listings or filters change
  useEffect(() => {
    if (!allListings.length) return;

    let results = [...allListings];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(listing => {
        // Check card name in the card object
        const cardName = listing.card?.cardName || listing.card?.name || '';
        // Check other properties
        return (
          cardName.toLowerCase().includes(searchTerm) ||
          (listing.cardName &&
            listing.cardName.toLowerCase().includes(searchTerm)) ||
          (listing.brand && listing.brand.toLowerCase().includes(searchTerm)) ||
          (listing.category &&
            listing.category.toLowerCase().includes(searchTerm)) ||
          (listing.year && listing.year.toString().includes(searchTerm))
        );
      });
    }

    // Apply category filter
    if (filters.category) {
      results = results.filter(listing => {
        const listingCategory = listing.category?.toLowerCase();
        const cardCategory = listing.card?.category?.toLowerCase();
        const filterCategory = filters.category.toLowerCase();

        return (
          listingCategory === filterCategory || cardCategory === filterCategory
        );
      });
    }

    // Apply grading company filter
    if (filters.gradingCompany) {
      results = results.filter(
        listing => listing.gradingCompany === filters.gradingCompany
      );
    }

    // Apply grade filter
    if (filters.grade) {
      results = results.filter(listing => listing.grade === filters.grade);
    }

    setFilteredListings(results);
  }, [allListings, filters]);

  // Function to load card images from Firebase or IndexedDB
  const loadCardImages = async listingsData => {
    if (!listingsData || listingsData.length === 0) return;

    // Clean up existing blob URLs before loading new ones
    Object.values(cardImages).forEach(url => {
      if (url && typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          logger.warn('Failed to revoke blob URL:', error);
        }
      }
    });

    const newCardImages = {};

    // Helper function to ensure we have a string URL
    const ensureStringUrl = imageData => {
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
        if (imageData.path && typeof imageData.path === 'string')
          return imageData.path;

        // If it has a toString method, try that
        if (typeof imageData.toString === 'function') {
          const stringValue = imageData.toString();
          if (stringValue !== '[object Object]') {
            return stringValue;
          }
        }
      }

      // If it's a Blob with a type
      if (
        imageData instanceof Blob &&
        imageData.type &&
        imageData.type.startsWith('image/')
      ) {
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

        // First, check if the card has an imageUrl property
        if (card.imageUrl) {
          const url = ensureStringUrl(card.imageUrl);
          if (url) {
            newCardImages[cardId] = url;
            continue;
          }
        }

        // Next, check if the card has an image property
        if (card.image) {
          const imageUrl = ensureStringUrl(card.image);
          if (imageUrl) {
            newCardImages[cardId] = imageUrl;
            continue;
          }
        }

        // Check all other possible image properties
        const possibleImageProps = [
          'frontImageUrl',
          'backImageUrl',
          'imageData',
          'cardImageUrl',
        ];
        let foundImage = false;

        for (const prop of possibleImageProps) {
          if (card[prop]) {
            const url = ensureStringUrl(card[prop]);
            if (url) {
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
            newCardImages[cardId] = blobUrl;
            continue;
          }
        } catch (dbError) {
          // Silently handle IndexedDB errors
          logger.warn(
            `Error loading image from IndexedDB for card ${cardId}:`,
            dbError
          );
        }

        // If we still don't have an image, set to null
        newCardImages[cardId] = null;
      } catch (error) {
        logger.warn('Error processing card image:', error);
      }
    }

    setCardImages(prevImages => ({
      ...prevImages,
      ...newCardImages,
    }));

    // Make sure to update loading state
    setLoading(false);
  };

  const handleEditClick = listing => {
    setSelectedListing(listing);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    // Don't clear selectedListing here - keep the detail modal open
  };

  const handleListingDeleted = deletedListingId => {
    // Update the UI by removing the deleted listing from state
    setAllListings(prev =>
      prev.filter(listing => listing.id !== deletedListingId)
    );
    setFilteredListings(prev =>
      prev.filter(listing => listing.id !== deletedListingId)
    );
  };

  const handleCardClick = listing => {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedListing(null);
  };

  const handleMarkAsSold = listing => {
    setSelectedListing(listing);
    setIsBuyerSelectionModalOpen(true);
  };

  const handleMarkAsPending = async listing => {
    try {
      // LoggingService.info('Marking listing as pending:', { id: listing.id, currentStatus: listing.status });
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'pending',
        updatedAt: new Date(),
      });
      toast.success('Listing marked as pending');
    } catch (error) {
      logger.error('Error marking listing as pending:', error);
      toast.error('Failed to mark listing as pending');
    }
  };

  const handleCloseBuyerSelectionModal = () => {
    setIsBuyerSelectionModalOpen(false);
    setSelectedListing(null);
  };

  return (
    <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-4">
      <MarketplaceNavigation
        currentView={currentView}
        onViewChange={onViewChange}
      />

      {/* Search and Filter Component */}
      <MarketplaceSearchFilters
        onFilterChange={handleFilterChange}
        listings={allListings}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="size-12 animate-spin rounded-full border-y-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : allListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          {/* Selling Icon */}
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">
              sell
            </span>
          </div>

          {/* Main Message */}
          <h3 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
            No Cards Listed for Sale
          </h3>

          {/* Description */}
          <p className="mb-8 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
            You haven't listed any cards for sale yet. Start selling by listing
            your valuable cards from your collection.
          </p>

          {/* Action Button */}
          <button
            onClick={() => onViewChange('cards')}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-8 py-3 font-medium text-white shadow-lg transition-colors hover:bg-red-600"
          >
            <span className="material-icons text-lg">add_business</span>
            List Cards for Sale
          </button>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              💰 Start earning from your collection today
            </p>
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          {/* Search Icon */}
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="material-icons text-3xl text-gray-400 dark:text-gray-600">
              search_off
            </span>
          </div>

          {/* Main Message */}
          <h3 className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            No Matching Listings
          </h3>

          {/* Description */}
          <p className="mb-6 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
            No listings match your current filters. Try adjusting your search
            criteria.
          </p>

          {/* Action Button */}
          <button
            onClick={() =>
              handleFilterChange({
                search: '',
                category: '',
                gradingCompany: '',
                grade: '',
              })
            }
            className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600"
          >
            <span className="material-icons text-lg">clear_all</span>
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {filteredListings.map(listing => (
            <div
              key={listing.id}
              className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-black"
            >
              <div className="grow">
                <MarketplaceCard
                  card={listing.card}
                  cardImage={
                    cardImages[
                      listing.card?.slabSerial ||
                        listing.card?.id ||
                        listing.cardId
                    ]
                  }
                  onClick={() => handleCardClick(listing)} // Show detail modal when card is clicked
                  className="h-full border-0"
                  investmentAUD={0}
                  formatUserCurrency={formatUserCurrency}
                />
              </div>
              <div className="rounded-b-lg bg-white p-3 dark:bg-gray-800">
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {listing.listingPrice} {listing.currency}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {listing.location || 'No location'}
                    </p>
                    {listing.status && listing.status !== 'available' && (
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          listing.status === 'sold'
                            ? 'text-red-600 dark:text-red-400'
                            : listing.status === 'pending'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : ''
                        }`}
                      >
                        {listing.status === 'sold'
                          ? 'SOLD'
                          : listing.status === 'pending'
                            ? 'PENDING'
                            : listing.status.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div className="w-full space-y-1">
                    <button
                      onClick={() => handleEditClick(listing)}
                      className="w-full rounded-md bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    {listing.status !== 'sold' &&
                      listing.status !== 'pending' && (
                        <>
                          <button
                            onClick={() => handleMarkAsPending(listing)}
                            className="w-full rounded-md bg-yellow-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-yellow-600"
                          >
                            Mark as Pending
                          </button>
                          <button
                            onClick={() => handleMarkAsSold(listing)}
                            className="w-full rounded-md bg-red-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-600"
                          >
                            Mark as Sold
                          </button>
                        </>
                      )}
                    {(listing.status === 'sold' ||
                      listing.status === 'pending') && (
                      <button
                        onClick={async () => {
                          try {
                            const listingRef = doc(
                              firestoreDb,
                              'marketplaceItems',
                              listing.id
                            );
                            await updateDoc(listingRef, {
                              status: 'available',
                              updatedAt: new Date(),
                            });
                            toast.success('Listing marked as available');
                          } catch (error) {
                            logger.error(
                              'Error marking listing as available:',
                              error
                            );
                            toast.error('Failed to mark listing as available');
                          }
                        }}
                        className="w-full rounded-md bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600"
                      >
                        Mark as Available
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Listing Modal */}
      <EditListingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        listing={selectedListing}
        onListingDeleted={handleListingDeleted}
      />

      {/* Listing Detail Modal */}
      <ListingDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        listing={selectedListing}
        cardImage={
          selectedListing
            ? cardImages[
                selectedListing.card?.slabSerial ||
                  selectedListing.card?.id ||
                  selectedListing.cardId
              ]
            : null
        }
        onEditListing={handleEditClick}
        onMarkAsPending={handleMarkAsPending}
        onMarkAsSold={handleMarkAsSold}
        onViewChange={onViewChange}
      />

      {/* Buyer Selection Modal */}
      <BuyerSelectionModal
        isOpen={isBuyerSelectionModalOpen}
        onClose={handleCloseBuyerSelectionModal}
        listing={selectedListing}
      />
    </div>
  );
}

export default MarketplaceSelling;
