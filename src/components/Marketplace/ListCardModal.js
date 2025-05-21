import React, { useState } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';

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
  // Early return before any hooks to avoid hook order issues
  if (!isOpen) return null;
  
  const { user } = useAuth();
  const { preferredCurrency } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingData, setListingData] = useState({});
  
  // Initialize listing data when component mounts or selectedCards changes
  // Consolidated the two previous useEffect hooks into one
  React.useEffect(() => {
    if (!selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) return;
    
    const initialData = {};
    selectedCards.forEach(card => {
      if (!card) return; // Skip null/undefined cards
      
      // Use a unique identifier that's guaranteed to exist
      const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
      initialData[cardId] = {
        price: '',
        note: '',
        location: ''
      };
    });
    
    setListingData(initialData);
  }, [selectedCards]);
  
  // Add the style to the document for hiding scrollbars and prevent body scrolling
  React.useEffect(() => {
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
        if (!card || !card.slabSerial) return { cardId: null, exists: false };
        
        const existingQuery = query(
          marketplaceRef,
          where('cardId', '==', card.slabSerial),
          where('status', '==', 'available')
        );
        const snapshot = await getDocs(existingQuery);
        return { cardId: card.slabSerial, exists: !snapshot.empty };
      });

      const existingListingsResults = await Promise.all(existingListingsPromises);
      const alreadyListedCards = existingListingsResults.filter(result => result.cardId && result.exists);

      if (alreadyListedCards.length > 0) {
        const alreadyListedCardNames = alreadyListedCards.map(result => {
          const card = selectedCards.find(c => c && c.slabSerial === result.cardId);
          return card ? (card.card || card.slabSerial) : 'Unknown card';
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
          // Create marketplace listing
          const listingRef = await addDoc(collection(firestoreDb, 'marketplaceItems'), {
            cardId: card.slabSerial || card.id || card._id,
            userId: user.uid,
            card: card, // Store the entire card object for display
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

  // Early return was moved to the top of the component

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-[#1B2131] overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1B2131] z-10">
          <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">
            List {selectedCards.length} Card{selectedCards.length > 1 ? 's' : ''} on Marketplace
          </h2>
          <button 
            className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-4 pb-32">
            {(selectedCards || []).map(card => card && (
              <div key={card.slabSerial} className="border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Card image and details */}
                  <div className="flex items-center gap-4 sm:w-1/2">
                    <div className="w-16 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                      {card.imageUrl ? (
                        <img 
                          src={card.imageUrl} 
                          alt={card.card || 'Card'} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-icons text-gray-400">image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {card.card || 'Unnamed Card'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {card.set} • {card.year || 'Unknown Year'}
                      </p>
                      {card.grade && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {card.gradeCompany} {card.grade}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Price and note inputs */}
                  <div className="sm:w-1/2 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Listing Price ({preferredCurrency.code})
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                          {preferredCurrency.symbol}
                        </span>
                        <input
                          type="number"
                          value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.price || ''}
                          onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'price', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Note (Optional)
                      </label>
                      <textarea
                        value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.note || ''}
                        onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'note', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a note about this card..."
                        rows="2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location (Optional)
                      </label>
                      <input
                        type="text"
                        value={listingData[card.slabSerial || card.id || card._id || JSON.stringify(card)]?.location || ''}
                        onChange={(e) => handleInputChange(card.slabSerial || card.id || card._id || JSON.stringify(card), 'location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your location (e.g., Sydney)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Fixed Footer */}
          <div className="flex-shrink-0 absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700/50 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-gray-100 dark:bg-[#252B3B] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#323B4B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  <span>Listing...</span>
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">storefront</span>
                  <span>List on Marketplace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ListCardModal;
