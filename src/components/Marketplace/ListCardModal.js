import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';
import Modal from '../../design-system/molecules/Modal';
import Button from '../../design-system/atoms/Button';
import Icon from '../../design-system/atoms/Icon';

// Add CSS for hiding scrollbars
const scrollbarHideStyles = `
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

function ListCardModal({ isOpen, onClose, selectedCards }) {
  const { user } = useAuth();
  const { preferredCurrency } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingData, setListingData] = useState({});
  const [userLocation, setUserLocation] = useState('');
  
  // Initialize listing data when component mounts or selectedCards changes
  // Consolidated the two previous useEffect hooks into one
  useEffect(() => {
    if (!isOpen || !selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) return;
    
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          setUserLocation(profileData.location || '');
        }
      } catch (error) {
        logger.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
    
    const initialData = {};
    selectedCards.forEach(card => {
      if (!card) return; // Skip null/undefined cards
      
      // Use a unique identifier that's guaranteed to exist
      const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
      initialData[cardId] = {
        price: '',
        note: '',
        location: userLocation || ''
      };
    });
    
    setListingData(initialData);
  }, [selectedCards, isOpen, user]);
  
  // Update location when userLocation is loaded
  useEffect(() => {
    if (userLocation && listingData) {
      const updatedData = {};
      Object.keys(listingData).forEach(cardId => {
        updatedData[cardId] = {
          ...listingData[cardId],
          location: listingData[cardId].location || userLocation
        };
      });
      setListingData(updatedData);
    }
  }, [userLocation]);
  
  // Add the style to the document for hiding scrollbars and prevent body scrolling
  useEffect(() => {
    if (!isOpen) return;
    
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.innerHTML = scrollbarHideStyles;
    document.head.appendChild(styleEl);
    
    // Prevent body scrolling when modal is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleEl);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);
  
  // Return null early but AFTER all hooks are defined
  if (!isOpen) return null;

  const handleInputChange = (cardId, field, value) => {
    setListingData(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const errors = {};

    // First check if listingData is valid
    if (!listingData || Object.keys(listingData).length === 0) {
      return { isValid: false, errors: { 'general': 'No listing data available' } };
    }

    Object.keys(listingData).forEach(cardId => {
      const cardData = listingData[cardId] || { price: '', note: '', location: '' };
      const numericPrice = parseFloat(cardData.price);
      
      if (!cardData.price || isNaN(numericPrice) || numericPrice <= 0) {
        errors[cardId] = 'Please enter a valid price';
        isValid = false;
      }
    });

    return { isValid, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that we have cards to list
    if (!selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) {
      toast.error('No cards selected for listing');
      return;
    }
    
    const { isValid, errors } = validateForm();
    
    if (!isValid) {
      // Display first error
      const firstErrorCardId = Object.keys(errors)[0];
      const card = selectedCards.find(card => 
        (card && (card.slabSerial === firstErrorCardId || card.id === firstErrorCardId))
      ) || { card: 'Card' };
      toast.error(`${card.card || 'Card'}: ${errors[firstErrorCardId]}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for existing listings for these cards
      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
      const existingListingsPromises = selectedCards.map(async (card) => {
        if (!card || !card.slabSerial) {
          return { cardId: null, exists: false };
        }
        
        const existingQuery = query(
          marketplaceRef,
          where('cardId', '==', card.slabSerial),
          where('status', '==', 'available')
        );
        
        const existingDocs = await getDocs(existingQuery);
        const exists = !existingDocs.empty;
        
        return { cardId: card.slabSerial, exists };
      });

      const existingListingsResults = await Promise.all(existingListingsPromises);
      
      const alreadyListedCards = existingListingsResults.filter(result => result.cardId && result.exists);

      if (alreadyListedCards.length > 0) {
        const alreadyListedCardNames = alreadyListedCards.map(result => {
          const card = selectedCards.find(c => c && c.slabSerial === result.cardId);
          const cardName = card ? (card.card || card.slabSerial) : 'Unknown card';
          
          return cardName;
        });
        
        toast.error(`${alreadyListedCardNames.join(', ')} already listed in marketplace`);
        setIsSubmitting(false);
        return;
      }
      
      // Create listings for each card
      const listingPromises = selectedCards.map(async (card) => {
        if (!card) return null; // Skip invalid cards
        
        const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
        const cardData = listingData[cardId] || { price: '', note: '', location: '' };
        
        // Validate price
        const price = parseFloat(cardData.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for ${card.card || 'card'}`); 
        }
        
        try {
          // Ensure we have the image data for the card
          let cardWithImage = { ...card };
          
          // If card has imageUrl property, make sure it's included
          if (card.imageUrl) {
            // Card already has imageUrl
          }
          // If card has image data as an object, convert it to a string URL
          else if (card.image && typeof card.image === 'object') {
            // Ensure the image object is properly formatted for storage
            cardWithImage.imageUrl = card.image.url || card.image.src || null;
          }
          
          // Create marketplace listing
          const listingRef = await addDoc(collection(firestoreDb, 'marketplaceItems'), {
            cardId: card.slabSerial || card.id || card._id,
            userId: user.uid,
            card: cardWithImage, // Store the entire card object with image data for display
            category: card.category || 'pokemon', // Add explicit category field for filtering
            listingPrice: price,
            currency: preferredCurrency.code,
            timestampListed: serverTimestamp(),
            status: 'available',
            note: cardData.note || '',
            location: cardData.location || ''
          });

          // Update the card in the user's collection to mark it as listed
          if (card.slabSerial) {
            const cardRef = doc(firestoreDb, `users/${user.uid}/cards/${card.slabSerial}`);
            await updateDoc(cardRef, {
              isListed: true
            });
          }

          return listingRef;
        } catch (cardError) {
          // Log specific card error but continue with others
          console.error(`Error listing card ${card.card || cardId}:`, cardError);
          // Only throw if it's a permission error, not a validation error
          if (cardError.code === 'permission-denied') {
            throw cardError; // Re-throw permission errors
          }
          return null;
        }
      });

      const results = await Promise.all(listingPromises);
      const successfulListings = results.filter(result => result !== null);

      if (successfulListings.length > 0) {
        toast.success(`Successfully listed ${successfulListings.length} card${successfulListings.length > 1 ? 's' : ''} on the marketplace`);
        onClose();
      } else {
        toast.error('Failed to list any cards. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error listing cards:', error);
      // Ignore AdBlock related errors in console
      if (error.message && error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
        // Silently handle AdBlock errors
      } else {
        toast.error('Failed to list cards. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`List ${selectedCards.length} Card${selectedCards.length > 1 ? 's' : ''} on Marketplace`}
      position="right"
      size="2xl"
      closeOnClickOutside={false}
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={isSubmitting ? null : <Icon name="storefront" />}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Listing...
              </>
            ) : (
              'List on Marketplace'
            )}
          </Button>
        </div>
      }
    >
      <form id="listing-form" onSubmit={handleSubmit} className="space-y-6">
        {selectedCards.map((card, index) => {
          return (
            <div key={card.slabSerial || card.id || card._id || JSON.stringify(card)} className="bg-white dark:bg-[#0F0F0F] rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Card Image */}
                <div className="flex-shrink-0">
                  <img
                    src={card.imageUrl || card.cloudImageUrl || card.image || card.imageURL || card.img || '/placeholder-card.png'}
                    alt={card.card || card.name || 'Card'}
                    className="w-32 h-44 object-contain bg-gray-100 dark:bg-black rounded-lg shadow-md"
                    onError={(e) => {
                      e.target.src = '/placeholder-card.png';
                    }}
                  />
                </div>
                
                {/* Card Details and Form */}
                <div className="flex-1 space-y-4">
                  {/* Card Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {card.card || card.name || 'Unnamed Card'}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Set:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{card.set || card.setName || 'Unknown Set'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Year:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{card.year || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Grade:</span>
                        <p className="text-gray-900 dark:text-white font-medium">PSA {card.grade || 'Ungraded'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Slab Serial:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{card.slabSerial || 'N/A'}</p>
                      </div>
                      {(card.currentValueAUD || card.value || card.marketValue || card.currentValue) && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Current Value:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {preferredCurrency?.symbol || '$'}{card.currentValueAUD || card.value || card.marketValue || card.currentValue || '0'}
                          </p>
                        </div>
                      )}
                      {(card.paidPriceAUD || card.purchasePrice || card.paidPrice || card.paid || card.cost) && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Purchase Price:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {preferredCurrency?.symbol || '$'}{card.paidPriceAUD || card.purchasePrice || card.paidPrice || card.paid || card.cost || '0'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Listing Price ({preferredCurrency?.code || 'USD'}) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          {preferredCurrency?.symbol || '$'}
                        </span>
                        <input
                          type="number"
                          value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.price || ''}
                          onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'price', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)] placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Note (Optional)
                        </label>
                        <textarea
                          value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.note || ''}
                          onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'note', e.target.value)}
                          className="w-full px-4 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)] placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Add a note about this card..."
                          rows="3"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location (Optional)
                        </label>
                        <input
                          type="text"
                          value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.location || ''}
                          onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'location', e.target.value)}
                          className="w-full px-4 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)] placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Enter your location (e.g., Sydney)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </form>
    </Modal>
  );
}

export default ListCardModal;
