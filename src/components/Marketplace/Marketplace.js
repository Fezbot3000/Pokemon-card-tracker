import React, { useState, useEffect } from 'react';
import { useAuth, Icon, toast } from '../../design-system';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import db from '../../services/firestore/dbAdapter'; // Import IndexedDB service for image loading
import MessageModal from './MessageModal'; // Import the MessageModal component
import ListingDetailModal from './ListingDetailModal'; // Import the ListingDetailModal component
import EditListingModal from './EditListingModal'; // Import the EditListingModal component
import BuyerSelectionModal from './BuyerSelectionModal'; // Import the BuyerSelectionModal component
import MarketplaceCard from './MarketplaceCard'; // Import the custom MarketplaceCard component
import MarketplaceNavigation from './MarketplaceNavigation'; // Import the navigation component
import MarketplaceSearchFilters from './MarketplaceSearchFilters'; // Import the search and filter component
import MarketplacePagination from './MarketplacePagination'; // Import pagination component
import LazyImage from './LazyImage'; // Import lazy image component
import SellerProfileModal from './SellerProfileModal'; // Import seller profile modal component
import ReportListing from './ReportListing'; // Import report listing component
import { useNavigate } from 'react-router-dom'; // Import for navigation

function Marketplace({ currentView, onViewChange }) {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    gradingCompany: '',
    grade: ''
  });
  const [loading, setLoading] = useState(true);
  const [cardImages, setCardImages] = useState({});
  const { user } = useAuth();
  const { convertCurrency, formatAmountForDisplay: formatUserCurrency } = useUserPreferences();
  const navigate = useNavigate();

  const [indexBuildingError, setIndexBuildingError] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [existingChats, setExistingChats] = useState({});
  const [prefilledMessage, setPrefilledMessage] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBuyerSelectionModalOpen, setIsBuyerSelectionModalOpen] = useState(false);

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
    const userChatsQuery = query(chatsRef, where('participants', 'array-contains', user.uid));
    
    const unsubscribeChats = onSnapshot(userChatsQuery, (chatsSnapshot) => {
      try {
        const chatsData = {};
        chatsSnapshot.forEach(doc => {
          const chatData = doc.data();
          // Only include chats that haven't been hidden by the current user
          if (chatData.cardId && (!chatData.hiddenBy || !chatData.hiddenBy[user.uid])) {
            chatsData[chatData.cardId] = doc.id;
          }
        });

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

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setIndexBuildingError(false);

    let unsubscribe;

    try {
      // First try with the composite index (which might still be building)
      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
      const marketplaceQuery = query(
        marketplaceRef,
        where('status', '==', 'available'),
        orderBy('timestampListed', 'desc')
      );

      // Set up real-time listener for marketplace items
      unsubscribe = onSnapshot(marketplaceQuery, (snapshot) => {
        try {
          // Fetch listings from Firestore
          const listingsData = [];
          snapshot.forEach(doc => {
            listingsData.push({ id: doc.id, ...doc.data() });
          });
          
          setAllListings(listingsData);
          setFilteredListings(listingsData);

          // Load card images after getting listings
          loadCardImages(listingsData);
        } catch (error) {
          // Ignore AdBlock related errors
          if (error.message && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            // Silently handle AdBlock errors
          } else {
            logger.error('Error fetching marketplace items:', error);
            toast.error('Error loading marketplace items');
          }
        } finally {
          setLoading(false);
        }
      }, (error) => {
        // Check if this is an index building error
        if (error.message && error.message.includes('requires an index')) {
          logger.warn('Marketplace index is still building:', error);
          setIndexBuildingError(true);

          // Fall back to a simpler query without ordering
          try {
            const simpleQuery = query(
              marketplaceRef,
              where('status', '==', 'available')
            );

            unsubscribe = onSnapshot(simpleQuery, (snapshot) => {
              const listingData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
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
            }, (fallbackError) => {
              logger.error('Error in fallback marketplace listener:', fallbackError);
              setLoading(false);
            });
          } catch (fallbackSetupError) {
            logger.error('Error setting up fallback marketplace listener:', fallbackSetupError);
            setLoading(false);
          }
        } else {
          logger.error('Error in marketplace listener:', error);
          setLoading(false);
        }
      });
    } catch (setupError) {
      logger.error('Error setting up marketplace listener:', setupError);
      setLoading(false);
    }

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const loadCardImages = async (listingsData) => {
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
        const possibleImageProps = ['frontImageUrl', 'backImageUrl', 'imageData', 'cardImageUrl'];
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
          logger.warn(`Error loading image from IndexedDB for card ${cardId}:`, dbError);
        }

        // If we still don't have an image, set to null
        newCardImages[cardId] = null;
      } catch (error) {
        logger.warn('Error processing card image:', error);
      }
    }

    setCardImages(prevImages => ({
      ...prevImages,
      ...newCardImages
    }));
  };

  const handleContactSeller = (listing, message = '') => {
    // Check if there's an existing chat for this listing
    const existingChatId = existingChats[listing.id];
    
    if (existingChatId) {
      // Navigate to Messages tab and open the existing chat
      onViewChange('marketplace-messages');
      
      // Set a brief timeout to ensure the Messages component has loaded, then trigger chat selection
      setTimeout(() => {
        // Dispatch a custom event that the Messages component can listen for
        window.dispatchEvent(new CustomEvent('openSpecificChat', { 
          detail: { chatId: existingChatId } 
        }));
      }, 100);
    } else {
      // No existing chat, open the message modal to start a new conversation
      setSelectedListing(listing);
      setPrefilledMessage(message);
      setIsMessageModalOpen(true);
    }
  };

  const handleCardClick = (listing) => {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedListing(null);
  };

  // Handle filter changes from the search/filter component
  const handleFilterChange = (newFilters) => {
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
        console.error('Error parsing saved filters:', error);
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
          (listing.cardName && listing.cardName.toLowerCase().includes(searchTerm)) ||
          (listing.brand && listing.brand.toLowerCase().includes(searchTerm)) ||
          (listing.category && listing.category.toLowerCase().includes(searchTerm)) ||
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
        
        return listingCategory === filterCategory || cardCategory === filterCategory;
      });
    }

    // Apply grading company filter
    if (filters.gradingCompany) {
      results = results.filter(listing =>
        listing.gradingCompany === filters.gradingCompany ||
        listing.card?.gradingCompany === filters.gradingCompany
      );
    }

    // Apply grade filter
    if (filters.grade) {
      results = results.filter(listing =>
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
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of listings
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleViewSellerProfile = (sellerId) => {
    // console.log('Opening seller profile for sellerId:', sellerId);
    setSelectedSellerId(sellerId);
    setShowSellerProfile(true);
  };

  const handleReportListing = (listing) => {
    setReportingListing(listing);
    setShowReportModal(true);
  };

  const handleEditListing = async (listing) => {
    setSelectedListing(listing);
    setIsEditModalOpen(true);
  };

  const handleMarkAsPending = async (listing) => {
    try {
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'pending'
      });
      toast.success('Listing marked as pending');
    } catch (error) {
      logger.error('Error marking listing as pending:', error);
      toast.error('Error marking listing as pending');
    }
  };

  const handleMarkAsSold = async (listing) => {
    setSelectedListing(listing);
    setIsBuyerSelectionModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4 bg-gray-100 dark:bg-black min-h-screen">
      <MarketplaceNavigation currentView={currentView} onViewChange={onViewChange} />

      {/* Search and Filter Component */}
      <MarketplaceSearchFilters
        onFilterChange={handleFilterChange}
        listings={allListings}
        initialFilters={filters}
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : indexBuildingError ? (
        <div className="text-center py-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="material-icons text-yellow-500 mr-2">info</span>
              <p className="text-yellow-700 dark:text-yellow-400">The marketplace index is still being built. Some features may be limited until it's ready.</p>
            </div>
          </div>
          {allListings.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-lg">No cards currently listed in the marketplace.</p>
          ) : null}
        </div>
      ) : allListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* Marketplace Icon */}
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">storefront</span>
          </div>
          
          {/* Main Message */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
            No Cards in Marketplace
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 leading-relaxed">
            The marketplace is currently empty. Be the first to list a card for sale, or check back later to see what other collectors are offering.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => onViewChange('cards')}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-icons text-lg">add_circle</span>
              List Your Cards
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-icons text-lg">refresh</span>
              Refresh
            </button>
          </div>
          
          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              💡 Tip: List your valuable cards to connect with other collectors
            </p>
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* Search Icon */}
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <span className="material-icons text-3xl text-gray-400 dark:text-gray-600">search_off</span>
          </div>
          
          {/* Main Message */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
            No Matching Cards Found
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6 leading-relaxed">
            We couldn't find any cards matching your current filters. Try adjusting your search criteria or clearing the filters.
          </p>
          
          {/* Action Button */}
          <button 
            onClick={() => handleFilterChange({
              search: '',
              category: '',
              gradingCompany: '',
              grade: ''
            })}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span className="material-icons text-lg">clear_all</span>
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3">
            {paginatedListings.map(listing => (
              <div key={listing.id} className="flex flex-col h-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F]">
                <div className="flex-grow relative aspect-square">
                  <LazyImage
                    src={cardImages[listing.card?.slabSerial || listing.card?.id || listing.cardId] || '/placeholder-card.png'}
                    alt={listing.card?.name || 'Pokemon Card'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleCardClick(listing)}
                  />
                  {listing.card?.grade && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                      {listing.card.gradingCompany} {listing.card.grade}
                    </span>
                  )}
                </div>
                <div className="bg-white dark:bg-[#0F0F0F] p-3 rounded-b-lg">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-center w-full">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {listing.cardName || listing.card?.name || listing.card?.cardName || 'Unknown Card'}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {listing.listingPrice} {listing.currency}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {listing.location || 'No location'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleContactSeller(listing)}
                      className={`w-full px-3 py-1.5 text-white text-sm rounded-md transition-colors ${
                        existingChats[listing.id] 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {existingChats[listing.id] ? 'See Chat' : 'Contact Seller'}
                    </button>
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
        cardImage={selectedListing ? cardImages[selectedListing.card?.slabSerial || selectedListing.card?.id || selectedListing.cardId] : null}
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
          onOpenListing={(listing) => {
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
            // Don't clear selectedListing here - keep the detail modal open
          }}
          onEditListing={handleEditListing}
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
