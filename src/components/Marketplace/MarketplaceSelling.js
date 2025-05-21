import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import Card from '../../design-system/components/Card';
import logger from '../../utils/logger';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import db from '../../services/db'; // Import IndexedDB service for image loading

function MarketplaceSelling() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardImages, setCardImages] = useState({});
  const { user } = useAuth();
  const { convertCurrency, formatAmountForDisplay: formatUserCurrency } = useUserPreferences();

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
            logger.error('Error fetching user listings:', error);
          }
          setLoading(false);
        }
      }, (error) => {
        // Check if this is an index building error
        if (error.message && error.message.includes('requires an index')) {
          logger.warn('Marketplace selling index is still building:', error);
          
          // Fall back to a simpler query without ordering
          try {
            const simpleQuery = query(
              marketplaceRef,
              where('userId', '==', user.uid)
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
              logger.error('Error in fallback user listings listener:', fallbackError);
              setLoading(false);
            });
          } catch (fallbackSetupError) {
            logger.error('Error setting up fallback user listings listener:', fallbackSetupError);
            setLoading(false);
          }
        } else {
          // Ignore AdBlock related errors
          if (error.message && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            // Silently handle AdBlock errors
          } else {
            logger.error('Error in user listings listener:', error);
          }
          setLoading(false);
        }
      });
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

  // Function to load card images from Firebase or IndexedDB
  const loadCardImages = async (listingsData) => {
    const images = {};
    const loadPromises = [];
    
    listingsData.forEach(listing => {
      const cardId = listing.card?.slabSerial || listing.card?.id || listing.cardId;
      
      if (!cardId) {
        logger.warn('Card ID not found for listing:', listing.id);
        return;
      }
      
      const loadPromise = (async () => {
        try {
          // Try to load from IndexedDB first
          const cachedImage = await db.getImage(cardId);
          if (cachedImage) {
            images[cardId] = cachedImage;
            return;
          }
          
          // If not in IndexedDB, the image will be loaded via the Card component's built-in loading
        } catch (error) {
          logger.error('Error loading card image:', error);
        }
      })();
      
      loadPromises.push(loadPromise);
    });
    
    // Wait for all images to load (or fail)
    await Promise.all(loadPromises);
    setCardImages(images);
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 pt-16"> {/* Added pt-16 for padding-top to avoid header overlap */}
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Your Listings</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">You don't have any cards listed for sale.</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2">
            When you list cards for sale, they will appear here.
          </p>
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Status: {listing.status === 'available' ? 'Active' : 'Sold'}
                      </p>
                    </div>
                    <button
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplaceSelling;
