import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, Button, Icon } from '../../design-system';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import MarketplaceImageService from '../../services/MarketplaceImageService';
import EditListingModal from './EditListingModal';
import ListingDetailModal from './ListingDetailModal';
import MarketplaceCard from './MarketplaceCard'; // Import the custom MarketplaceCard component
import MarketplaceNavigation from './MarketplaceNavigation'; // Import the navigation component
import MarketplaceSearchFilters from './MarketplaceSearchFilters'; // Import the search and filter component


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

      // Use a simple query without composite index to avoid deployment issues
      const marketplaceQuery = query(
        marketplaceRef,
        where('userId', '==', user.uid)
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

            // Sort manually on the client side
            listingsData.sort((a, b) => {
              const timeA = a.timestampListed?.seconds || a.createdAt?.seconds || 0;
              const timeB = b.timestampListed?.seconds || b.createdAt?.seconds || 0;
              return timeB - timeA; // Descending order
            });

            setAllListings(listingsData);
            setFilteredListings(listingsData);

            // Load card images after getting listings
            loadCardImages(listingsData).finally(() => {
              setLoading(false);
            });
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
            }
        },
        error => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Function to load card images using centralized service
  const loadCardImages = useCallback(async listingsData => {
    if (!listingsData || listingsData.length === 0) return;

    const newCardImages = await MarketplaceImageService.loadCardImages(listingsData, cardImages);
    
    setCardImages(prevImages => ({
      ...prevImages,
      ...newCardImages,
    }));
  }, [cardImages]);

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

  const handleEditClick = listing => {
    setSelectedListing(listing);
    setIsDetailModalOpen(false); // Close detail modal
    setIsEditModalOpen(true); // Open edit modal
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedListing(null);
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

  const handleListingUpdated = (listingId, updatedData) => {
    // Update the listing in both state arrays
    const updateListing = (listings) => 
      listings.map(listing => 
        listing.id === listingId 
          ? { ...listing, ...updatedData }
          : listing
      );
    
    setAllListings(updateListing);
    setFilteredListings(updateListing);
  };

  const handleCardClick = listing => {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedListing(null);
  };





  return (
    <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-1">
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
              <div className="rounded-b-lg bg-white p-3 dark:bg-black">
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatUserCurrency(listing.listingPrice, listing.currency || 'AUD')}
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
                  <div className="w-full">
                    <Button
                      variant="primary"
                      onClick={() => handleCardClick(listing)}
                      leftIcon={<Icon name="edit" />}
                      size="sm"
                      className="w-full"
                    >
                      Edit
                    </Button>
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
        onClose={() => {
          setIsEditModalOpen(false);
          // Re-open the listing detail modal instead of closing completely
          setIsDetailModalOpen(true);
        }}
        listing={selectedListing}
        onListingDeleted={(deletedListingId) => {
          handleListingDeleted(deletedListingId);
          // Close both modals when listing is deleted
          setIsEditModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedListing(null);
        }}
        onListingUpdated={(listingId, updatedData) => {
          handleListingUpdated(listingId, updatedData);
          // Close edit modal and re-open detail modal with updated data
          setIsEditModalOpen(false);
          setIsDetailModalOpen(true);
        }}
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
        onViewChange={onViewChange}
      />


    </div>
  );
}

export default MarketplaceSelling;
