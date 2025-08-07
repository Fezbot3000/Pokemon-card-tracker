import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, toast, Button, Icon } from '../../design-system';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

import MarketplaceImageService from '../../services/MarketplaceImageService';
import MessageModal from './MessageModal'; // Import the MessageModal component
import ListingDetailModal from './ListingDetailModal'; // Import the ListingDetailModal component
import EditListingModal from './EditListingModal'; // Import the EditListingModal component
import BuyerSelectionModal from './BuyerSelectionModal'; // Import the BuyerSelectionModal component
import MarketplaceNavigation from './MarketplaceNavigation'; // Import the navigation component
import MarketplaceSearchFilters from './MarketplaceSearchFilters'; // Import the search and filter component
import MarketplacePagination from './MarketplacePagination'; // Import pagination component
import LazyImage from './LazyImage'; // Import lazy image component
import SellerProfileModal from './SellerProfileModal'; // Import seller profile modal component
import ReportListing from './ReportListing'; // Import report listing component

import LoggingService from '../../services/LoggingService';

function Marketplace({ currentView, onViewChange }) {
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
  const { user } = useAuth();
  const { formatAmountForDisplay } = useUserPreferences();
  const navigate = useNavigate();


  const [indexBuildingError, setIndexBuildingError] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [existingChats, setExistingChats] = useState({});
  const [prefilledMessage, setPrefilledMessage] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBuyerSelectionModalOpen, setIsBuyerSelectionModalOpen] =
    useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Seller profile state
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [showSellerProfile, setShowSellerProfile] = useState(false);

  // Report listing state
  const [reportingListing, setReportingListing] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Fetch existing chats for the current user
  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for chats to update button states immediately
    const chatsRef = collection(firestoreDb, 'chats');
    const userChatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeChats = onSnapshot(userChatsQuery, chatsSnapshot => {
      try {
        const chatsData = {};
        chatsSnapshot.forEach(doc => {
          const chatData = doc.data();
          
          // Debug logging for chat detection
          logger.debug('Processing chat for existing chat detection:', {
            chatId: doc.id,
            cardId: chatData.cardId,
            isHidden: !!(chatData.hiddenBy && chatData.hiddenBy[user.uid]),
            participants: chatData.participants
          });
          
          // Only include chats that haven't been hidden by the current user
          if (
            chatData.cardId &&
            (!chatData.hiddenBy || !chatData.hiddenBy[user.uid])
          ) {
            chatsData[chatData.cardId] = doc.id;
            logger.debug('Added to existingChats mapping:', {
              cardId: chatData.cardId,
              chatId: doc.id
            });
          }
        });

        logger.debug('Final existingChats mapping:', chatsData);
        setExistingChats(chatsData);
      } catch (error) {
        logger.error('Error fetching existing chats:', error);
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribeChats();
    };
  }, [user]);

  const loadCardImages = useCallback(async listingsData => {
    if (!listingsData || listingsData.length === 0) return;

    const newCardImages = await MarketplaceImageService.loadCardImages(listingsData, cardImages);
    
    setCardImages(prevImages => ({
      ...prevImages,
      ...newCardImages,
    }));
  }, [cardImages]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setIndexBuildingError(false);

    let unsubscribe;

    try {
      // Use a simple query without composite index to avoid deployment issues
      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
      const marketplaceQuery = query(
        marketplaceRef,
        where('status', '==', 'available')
      );

      // Set up real-time listener for marketplace items
      unsubscribe = onSnapshot(
        marketplaceQuery,
        snapshot => {
          try {
            // Fetch listings from Firestore
            const listingsData = [];
            snapshot.forEach(doc => {
              listingsData.push({ id: doc.id, ...doc.data() });
            });

            // Sort manually on the client side
            listingsData.sort((a, b) => {
              const timeA = a.timestampListed?.seconds || a.createdAt?.seconds || 0;
              const timeB = b.timestampListed?.seconds || b.createdAt?.seconds || 0;
              return timeB - timeA; // Descending order
            });

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
              logger.error('Error fetching marketplace items:', error);
              toast.error('Error loading marketplace items');
            }
          } finally {
            setLoading(false);
          }
        },
        error => {
          logger.error('Error in marketplace listener:', error);
              setLoading(false);
        }
      );
    } catch (error) {
      logger.error('Error setting up marketplace listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleContactSeller = (listing, message = '') => {
    // Check if there's an existing chat for this listing
    const existingChatId = existingChats[listing.id];

    // Debug logging to help troubleshoot chat navigation
    logger.debug('handleContactSeller called:', {
      listingId: listing.id,
      existingChatId,
      hasExistingChat: !!existingChatId,
      totalExistingChats: Object.keys(existingChats).length
    });

    if (existingChatId) {
      // Navigate to Messages tab and open the existing chat
      logger.debug('Navigating to existing chat:', existingChatId);
      
      // Update URL while preserving performance system (same as MarketplaceNavigation)
      navigate('/dashboard/marketplace-messages', { replace: true });
      
      // Still use state for instant navigation
      setTimeout(() => {
        if (onViewChange && typeof onViewChange === 'function') {
          onViewChange('marketplace-messages');
        }
      }, 0);

      // Set a timeout to ensure the Messages component has loaded, then trigger chat selection
      setTimeout(() => {
        // Dispatch a custom event that the Messages component can listen for
        window.dispatchEvent(
          new CustomEvent('openSpecificChat', {
            detail: { chatId: existingChatId },
          })
        );
      }, 300);
    } else {
      // No existing chat, open the message modal to start a new conversation
      logger.debug('Opening message modal for new conversation');
      setSelectedListing(listing);
      setPrefilledMessage(message);
      setIsMessageModalOpen(true);
    }
  };

  const handleCardClick = listing => {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedListing(null);
  };

  // Handle filter changes from the search/filter component
  const handleFilterChange = newFilters => {
    setFilters(newFilters);

    // Save filters to localStorage for persistence
    localStorage.setItem('marketplaceFilters', JSON.stringify(newFilters));
  };

  // Load saved filters on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('marketplaceFilters');
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
        listing =>
          listing.gradingCompany === filters.gradingCompany ||
          listing.card?.gradingCompany === filters.gradingCompany
      );
    }

    // Apply grade filter
    if (filters.grade) {
      results = results.filter(
        listing =>
          listing.grade === filters.grade ||
          listing.card?.grade === filters.grade
      );
    }

    setFilteredListings(results);
  }, [allListings, filters]);

  // Calculate paginated listings
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = page => {
    setCurrentPage(page);
    // Scroll to top of listings
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleViewSellerProfile = sellerId => {
    // LoggingService.info('Opening seller profile for sellerId:', sellerId);
    setSelectedSellerId(sellerId);
    setShowSellerProfile(true);
  };

  const handleReportListing = listing => {
    setReportingListing(listing);
    setShowReportModal(true);
  };

  const handleEditListing = async listing => {
    setSelectedListing(listing);
    setIsEditModalOpen(true);
  };

  const handleMarkAsPending = async listing => {
    try {
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'pending',
        updatedAt: new Date(),
      });
      toast.success('Listing marked as pending');
    } catch (error) {
      logger.error('Error marking listing as pending:', error);
      toast.error('Error marking listing as pending');
    }
  };

  const handleMarkAsSold = async listing => {
    setSelectedListing(listing);
    setIsBuyerSelectionModalOpen(true);
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
        initialFilters={filters}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="size-12 animate-spin rounded-full border-y-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : indexBuildingError ? (
        <div className="py-12 text-center">
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <div className="flex items-center">
              <Icon name="info" className="mr-2 text-yellow-500" />
              <p className="text-yellow-700 dark:text-yellow-400">
                The marketplace index is still being built. Some features may be
                limited until it's ready.
              </p>
            </div>
          </div>
          {allListings.length === 0 ? (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              No cards currently listed in the marketplace.
            </p>
          ) : null}
        </div>
      ) : allListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          {/* Marketplace Icon */}
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Icon name="storefront" className="text-4xl text-gray-400 dark:text-gray-600" />
          </div>

          {/* Main Message */}
          <h3 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
            No Cards in Marketplace
          </h3>

          {/* Description */}
          <p className="mb-8 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
            The marketplace is currently empty. Be the first to list a card for
            sale, or check back later to see what other collectors are offering.
          </p>

          {/* Action Buttons */}
          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => onViewChange('cards')}
              variant="primary"
              size="lg"
              className="flex flex-1 items-center justify-center gap-2"
            >
              <Icon name="add_circle" className="text-lg" />
              List Your Cards
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              size="lg"
              className="flex flex-1 items-center justify-center gap-2"
            >
              <Icon name="refresh" className="text-lg" />
              Refresh
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              💡 Tip: List your valuable cards to connect with other collectors
            </p>
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          {/* Search Icon */}
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Icon name="search_off" className="text-3xl text-gray-400 dark:text-gray-600" />
          </div>

          {/* Main Message */}
          <h3 className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            No Matching Cards Found
          </h3>

          {/* Description */}
          <p className="mb-6 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
            We couldn't find any cards matching your current filters. Try
            adjusting your search criteria or clearing the filters.
          </p>

          {/* Action Button */}
          <Button
            onClick={() =>
              handleFilterChange({
                search: '',
                category: '',
                gradingCompany: '',
                grade: '',
              })
            }
            variant="primary"
            size="lg"
            className="flex items-center gap-2"
          >
            <Icon name="clear_all" className="text-lg" />
            Clear All Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {paginatedListings.map(listing => (
              <div
                key={listing.id}
                className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-black"
              >
                <div className="relative aspect-square grow">
                  <LazyImage
                    src={
                      cardImages[
                        listing.card?.slabSerial ||
                          listing.card?.id ||
                          listing.cardId
                      ] || '/placeholder-card.png'
                    }
                    alt={listing.card?.name || 'Pokemon Card'}
                    className="size-full cursor-pointer object-cover"
                    onClick={() => handleCardClick(listing)}
                  />
                  {listing.card?.grade && (
                    <span className="bg-black/70 absolute right-2 top-2 rounded px-2 py-1 text-xs text-white">
                      {listing.card.gradingCompany} {listing.card.grade}
                    </span>
                  )}
                </div>
                <div className="rounded-b-lg bg-white p-3 dark:bg-black">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full text-center">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {listing.cardName ||
                          listing.card?.name ||
                          listing.card?.cardName ||
                          'Unknown Card'}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatAmountForDisplay(listing.listingPrice, listing.currency || 'AUD')}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {listing.location || 'No location'}
                      </p>
                    </div>
                    {user && user.uid === listing.userId ? (
                      // Own listing - show Edit button
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCardClick(listing)}
                        leftIcon={<Icon name="edit" />}
                        className="w-full"
                      >
                        Edit
                      </Button>
                    ) : (
                      // Other user's listing - show Contact Seller
                      <Button
                        onClick={() => handleContactSeller(listing)}
                        variant={existingChats[listing.id] ? "primary" : "secondary"}
                        size="sm"
                        className={`relative w-full transition-all duration-200 ${
                          existingChats[listing.id]
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                            : 'border-2 border-transparent bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] bg-clip-border bg-transparent text-white hover:shadow-lg hover:shadow-blue-500/25'
                        }`}
                        style={!existingChats[listing.id] ? {
                          background: 'linear-gradient(#0F0F0F, #0F0F0F) padding-box, linear-gradient(to right, #3b82f6, #1d4ed8) border-box',
                          border: '2px solid transparent'
                        } : {}}
                      >
                        {existingChats[listing.id]
                          ? 'See Chat'
                          : 'Contact Seller'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <MarketplacePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setPrefilledMessage('');
        }}
        listing={selectedListing}
        prefilledMessage={prefilledMessage}
        onViewChange={onViewChange}
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
        onContactSeller={handleContactSeller}
        onViewSellerProfile={handleViewSellerProfile}
        onReportListing={() => handleReportListing(selectedListing)}
        onEditListing={handleEditListing}
        onMarkAsPending={handleMarkAsPending}
        onMarkAsSold={handleMarkAsSold}
        onViewChange={onViewChange}
      />

      {/* Seller Profile Modal */}
      {showSellerProfile && selectedSellerId && (
        <SellerProfileModal
          isOpen={showSellerProfile}
          sellerId={selectedSellerId}
          cardImages={cardImages}
          onClose={() => {
            setShowSellerProfile(false);
            setSelectedSellerId(null);
          }}
          onOpenListing={listing => {
            // Close seller profile and open listing detail
            setShowSellerProfile(false);
            setSelectedSellerId(null);
            setSelectedListing(listing);
            setIsDetailModalOpen(true);
          }}
          onContactSeller={handleContactSeller}
          onViewChange={onViewChange}
        />
      )}

      {/* Report Listing Modal */}
      {showReportModal && reportingListing && (
        <ReportListing
          listingId={reportingListing.id}
          sellerId={reportingListing.userId}
          onClose={() => {
            setShowReportModal(false);
            setReportingListing(null);
          }}
        />
      )}

      {/* Edit Listing Modal */}
      {isEditModalOpen && selectedListing && (
        <EditListingModal
          isOpen={isEditModalOpen}
          listing={selectedListing}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedListing(null);
          }}
          onListingDeleted={(deletedListingId) => {
            // Remove deleted listing from state
            setAllListings(prev => prev.filter(listing => listing.id !== deletedListingId));
            setFilteredListings(prev => prev.filter(listing => listing.id !== deletedListingId));
          }}
          onListingUpdated={(listingId, updatedData) => {
            // Update listing in state
            const updateListing = (listings) => 
              listings.map(listing => 
                listing.id === listingId 
                  ? { ...listing, ...updatedData }
                  : listing
              );
            
            setAllListings(updateListing);
            setFilteredListings(updateListing);
          }}
        />
      )}

      {/* Buyer Selection Modal */}
      {isBuyerSelectionModalOpen && selectedListing && (
        <BuyerSelectionModal
          isOpen={isBuyerSelectionModalOpen}
          listing={selectedListing}
          onClose={() => {
            setIsBuyerSelectionModalOpen(false);
            setSelectedListing(null);
          }}
        />
      )}
    </div>
  );
}

export default Marketplace;
