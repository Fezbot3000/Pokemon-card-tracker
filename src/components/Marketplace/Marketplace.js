import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import Card from '../../design-system/components/Card';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import db from '../../services/db'; // Import IndexedDB service for image loading
import MessageModal from './MessageModal'; // Import the MessageModal component

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardImages, setCardImages] = useState({});
  const { user } = useAuth();
  const { convertCurrency, formatAmountForDisplay: formatUserCurrency } = useUserPreferences();

  const [indexBuildingError, setIndexBuildingError] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

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
          const listingData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setListings(listingData);
          
          // Load card images after getting listings
          loadCardImages(listingData);
        } catch (error) {
          // Ignore AdBlock related errors
          if (error.message && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            // Silently handle AdBlock errors
          } else {
            logger.error('Error fetching marketplace listings:', error);
          }
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
              setListings(listingData);
              
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
          // Ignore AdBlock related errors
          if (error.message && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            // Silently handle AdBlock errors
          } else {
            logger.error('Error in marketplace listener:', error);
          }
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

  // Function to load card images from Firebase or IndexedDB
  const loadCardImages = async (listingsData) => {
    if (!listingsData || listingsData.length === 0) {
      setLoading(false);
      return;
    }
    
    // Clean up existing blob URLs before loading new ones
    Object.values(cardImages).forEach(url => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke potential blob URL:', url, error);
        }
      }
    });
    
    const images = {};
    const loadPromises = [];
    
    // Process each listing
    listingsData.forEach(listing => {
      if (!listing.card) return;
      
      const cardId = listing.card.slabSerial || listing.card.id || listing.cardId;
      if (!cardId) return;
      
      // Create a promise for each image load
      const loadPromise = (async () => {
        try {
          // First check if the card has an imageUrl directly
          if (listing.card.imageUrl) {
            images[cardId] = listing.card.imageUrl;
            return;
          }
          
          // Try loading from IndexedDB if no direct URL
          const imageBlob = await db.getImage(cardId);
          if (imageBlob) {
            const blobUrl = URL.createObjectURL(imageBlob);
            images[cardId] = blobUrl;
          } else {
            // Set to null if not found
            images[cardId] = null;
          }
        } catch (error) {
          console.error(`Error loading image for card ${cardId}:`, error);
          images[cardId] = null;
        }
      })();
      
      loadPromises.push(loadPromise);
    });
    
    // Wait for all images to load (or fail)
    await Promise.all(loadPromises);
    setCardImages(images);
    setLoading(false);
  };

  const handleContactSeller = (listing) => {
    if (!user) {
      // If user is not logged in, show a message or redirect to login
      logger.warn('User must be logged in to contact seller');
      return;
    }
    
    // Don't allow contacting yourself
    if (listing.userId === user.uid) {
      logger.warn('Cannot contact yourself');
      return;
    }
    
    // Set the selected listing and open the message modal
    setSelectedListing(listing);
    setIsMessageModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 pt-16"> {/* Added pt-16 for padding-top to avoid header overlap */}
      
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
          {listings.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-lg">No cards currently listed in the marketplace.</p>
          ) : null}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No cards currently listed in the marketplace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {listings.map(listing => (
            <div key={listing.id} className="relative">
              <Card 
                card={listing.card}
                cardImage={cardImages[listing.card?.slabSerial || listing.card?.id || listing.cardId]}
                onClick={() => {}} // No detailed view in marketplace yet
                className="h-full"
                investmentAUD={listing.card?.investmentAUD || 0}
                currentValueAUD={listing.card?.currentValueAUD || 0}
                formatUserCurrency={formatUserCurrency}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 rounded-b-lg">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {listing.listingPrice} {listing.currency}
                      </p>
                      {listing.location && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                          <span className="material-icons text-xs mr-1">location_on</span>
                          {listing.location}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleContactSeller(listing)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                    >
                      Contact Seller
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Message Modal */}
      <MessageModal 
        isOpen={isMessageModalOpen} 
        onClose={() => setIsMessageModalOpen(false)} 
        listing={selectedListing} 
      />
    </div>
  );
}

export default Marketplace;
