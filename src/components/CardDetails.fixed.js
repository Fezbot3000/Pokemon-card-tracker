import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types'; 
import db from '../services/firestore/dbAdapter';
import cardRepo from '../services/cardRepo';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import PSALookupButton from './PSALookupButton';
import PriceHistoryGraph from './PriceHistoryGraph';
import { searchByCertNumber, parsePSACardData, mergeWithExistingCard } from '../services/psaSearch';

const CardDetails = memo(({
  card = null,
  onClose,
  onUpdateCard,
  onDelete,
  exchangeRate,
  collections = [],
  initialCollectionName = null
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editedCard, setEditedCard] = useState({
    ...card,
    id: card.id || card.slabSerial, // Ensure we have an ID for image loading
    year: card.year ? String(card.year) : '', // Convert year to string
    investmentUSD: typeof card.investmentUSD === 'number' ? String(Number(card.investmentUSD.toFixed(2))) : '0',
    currentValueUSD: typeof card.currentValueUSD === 'number' ? String(Number(card.currentValueUSD.toFixed(2))) : '0',
    investmentAUD: typeof card.investmentAUD === 'number' ? String(Number(card.investmentAUD.toFixed(2))) : '0',
    currentValueAUD: typeof card.currentValueAUD === 'number' ? String(Number(card.currentValueAUD.toFixed(2))) : '0',
    datePurchased: formatDate(card.datePurchased) || '',
    psaData: card.psaData || null,
    psaSearched: card.psaSearched || false
  });
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { isDarkMode } = useTheme();
  const messageTimeoutRef = useRef(null);

  // Effect to update editedCard when card or initialCollectionName changes
  useEffect(() => {
    if (card) {
      // Create a complete copy of the card with all necessary fields
      const completeCard = {
        ...card,
        id: card.id || card.slabSerial,
        year: card.year ? String(card.year) : '',
        // Ensure financial values are properly formatted
        investmentUSD: typeof card.investmentUSD === 'number' ? String(Number(card.investmentUSD.toFixed(2))) : '0',
        currentValueUSD: typeof card.currentValueUSD === 'number' ? String(Number(card.currentValueUSD.toFixed(2))) : '0',
        investmentAUD: typeof card.investmentAUD === 'number' ? String(Number(card.investmentAUD.toFixed(2))) : '0',
        currentValueAUD: typeof card.currentValueAUD === 'number' ? String(Number(card.currentValueAUD.toFixed(2))) : '0',
        datePurchased: formatDate(card.datePurchased) || '',
        // Ensure collection fields are properly set
        collection: initialCollectionName || card.collection || card.collectionId || '',
        collectionId: initialCollectionName || card.collectionId || card.collection || '',
        // Ensure set fields are properly set
        set: card.set || card.setName || '',
        setName: card.setName || card.set || '',
        // Preserve PSA data
        psaData: card.psaData || null,
        psaSearched: card.psaSearched || false
      };
      
      console.log('Setting edited card with complete data:', completeCard);
      setEditedCard(completeCard);
      // Also reset unsaved changes flag when the card prop changes
      setHasUnsavedChanges(false);
    } else {
      // Handle case where card is null (e.g., adding new card - though this component might not be used for that)
      setEditedCard({}); 
    }
  }, [card, initialCollectionName]); // Rerun when card or initialCollectionName changes

  // Use onUpdateCard if available, otherwise fall back to onUpdate for backward compatibility
  const updateCard = onUpdateCard;

  // Effect to load card image on mount
  useEffect(() => {
    // Remove noisy debug logs for cleaner console
    // console.log('[CardDetails] Component mounted, loading image...');
    loadCardImage();
    
    // Effect to handle body scroll locking
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    
    return () => {
      // Restore scrolling on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
      
      // Clean up timeouts
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      
      // Properly clean up any blob URLs when unmounting
      if (cardImage && cardImage.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cardImage);
          // Set cardImage to null to prevent future references
          setCardImage(null);
        } catch (e) {
          console.warn('Failed to revoke cardImage blob URL on unmount:', e);
        }
      }
    };
  }, []);

  // Listen for card-images-cleanup event to revoke blob URLs when collections are deleted
  useEffect(() => {
    const handleCardImagesCleanup = (event) => {
      const { cardIds } = event.detail;
      
      // If our current card's ID is in the list of cards being deleted
      if (cardIds.includes(card.id) || cardIds.includes(card.slabSerial)) {
        // Clean up any created object URLs to prevent memory leaks
        if (cardImage) {
          try {
            URL.revokeObjectURL(cardImage);
            console.log(`Revoked blob URL for card ${card.id || card.slabSerial} in CardDetails component`);
          } catch (error) {
            console.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, error);
          }
          
          // Clear the cardImage state
          setCardImage(null);
        }
        
        // Close the modal since the card is being deleted
        handleClose();
      }
    };
    
    // Add event listener
    window.addEventListener('card-images-cleanup', handleCardImagesCleanup);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('card-images-cleanup', handleCardImagesCleanup);
    };
  }, [card.id, card.slabSerial, cardImage]);

  // Load the card image
  const loadCardImage = async () => {
    setImageLoadingState('loading');
    try {
      // Prioritize Firestore image URL if available in the current card data
      if (editedCard.imageUrl) {
        // console.log('[CardDetails] Using Firestore image URL:', editedCard.imageUrl);
        // Revoke existing blob URL if necessary before setting the new URL
        if (cardImage && cardImage.startsWith('blob:')) {
          URL.revokeObjectURL(cardImage);
        }
        setCardImage(editedCard.imageUrl);
        setImageLoadingState('idle');
      } else {
        // Fallback: Try loading from IndexedDB if no Firestore URL
        const id = editedCard.id || editedCard.slabSerial || card.id || card.slabSerial;
        // console.log('[CardDetails] No Firestore URL, attempting to load image from IndexedDB for ID:', id);
        const imageBlob = await db.getImage(id);
        
        if (imageBlob) {
          // Revoke any existing object URL (could be blob or previous Firestore URL)
          if (cardImage) {
            // Only revoke if it's a blob URL
            if (cardImage.startsWith('blob:')) {
              URL.revokeObjectURL(cardImage);
            }
          }
          
          const blobUrl = URL.createObjectURL(imageBlob);
          // console.log('[CardDetails] Image loaded from IndexedDB, Blob URL:', blobUrl);
          setCardImage(blobUrl);
          setImageLoadingState('idle');
        } else {
          // console.log('[CardDetails] No image found in IndexedDB for ID:', id);
          // Ensure any previous image (blob or Firestore URL) is cleared
          if (cardImage && cardImage.startsWith('blob:')) {
            URL.revokeObjectURL(cardImage);
          }
          setCardImage(null);
          setImageLoadingState('idle');
        }
      }
    } catch (error) {
      console.error('Error loading card image:', error);
      // Ensure any previous image (blob or Firestore URL) is cleared on error
      if (cardImage && cardImage.startsWith('blob:')) {
        URL.revokeObjectURL(cardImage);
      }
      setCardImage(null);
      setImageLoadingState('error');
    }
  };

  // Handle image update
  const handleImageChange = async (file) => {
    if (file && (file instanceof Blob || file instanceof File)) {
      try {
        // Show loading state
        setImageLoadingState('loading');
        
        // Use the appropriate ID for the image
        const id = card.id || card.slabSerial;
        
        // Log for debugging
        console.log(`Processing image for card ${id}, file type: ${file.type}, size: ${file.size} bytes`);
        
        // Create a blob URL for the file
        const blobUrl = URL.createObjectURL(file);
        
        // Revoke any existing blob URL before setting the new one
        if (cardImage && cardImage.startsWith('blob:')) {
          URL.revokeObjectURL(cardImage);
        }
        
        // Set the new blob URL as the card image
        setCardImage(blobUrl);
        
        // Store the file for later upload
        setEditedCard(prev => ({
          ...prev,
          _pendingImageFile: file,
          _blobUrl: blobUrl,
          hasImage: true
        }));
        
        // Mark as having unsaved changes
        setHasUnsavedChanges(true);
        
        // Update loading state
        setImageLoadingState('idle');
      } catch (error) {
        console.error('Error processing image:', error);
        setImageLoadingState('error');
      }
    } else {
      console.warn('Invalid file provided to handleImageChange:', file);
    }
  };

  // Handle save action
  const handleSave = async () => {
    console.log('=========== CARD SAVE FLOW START ===========');
    console.log('[CardDetails] Saving card...');
    
    try {
      // Start with the current edited card data
      let finalCardData = { ...editedCard };
      
      // Handle image upload if there's a pending image file
      if (editedCard._pendingImageFile) {
        console.log('[CardDetails] Handling pending image file...');
        
        try {
          // Save the image to IndexedDB
          const id = editedCard.id || editedCard.slabSerial;
          await db.saveImage(id, editedCard._pendingImageFile);
          console.log(`[CardDetails] Image saved to IndexedDB for ID: ${id}`);
          
          // Update the finalCardData to indicate it has an image
          finalCardData.hasImage = true;
          finalCardData.imageUpdatedAt = new Date().toISOString();
          
          // Remove the pending image file from the data we'll save to Firestore
          delete finalCardData._pendingImageFile;
          delete finalCardData._blobUrl;
        } catch (imageError) {
          console.error('[CardDetails] Error saving image:', imageError);
          toast.error('Error saving image: ' + imageError.message);
          // Continue with the save process even if image save fails
        }
      }
      
      // Convert string values to appropriate types for Firestore
      const processedCard = {
        ...finalCardData,
        // Convert year to number if it's a valid number
        year: finalCardData.year ? parseInt(finalCardData.year, 10) || finalCardData.year : '',
        // Convert financial values to numbers
        investmentUSD: parseFloat(finalCardData.investmentUSD) || 0,
        currentValueUSD: parseFloat(finalCardData.currentValueUSD) || 0,
        investmentAUD: parseFloat(finalCardData.investmentAUD) || 0,
        currentValueAUD: parseFloat(finalCardData.currentValueAUD) || 0,
        // Ensure collection ID is set
        collectionId: finalCardData.collectionId || finalCardData.collection || '',
        // Ensure we have the image URL if available
        imageUrl: finalCardData.imageUrl || null, // Make sure imageUrl is explicitly set
        imageUpdatedAt: finalCardData.imageUpdatedAt || new Date().toISOString(),
        // Add a debug flag
        _saveDebug: true
      };
      
      // Make sure ID is explicitly set as a string
      if (card.id || card.slabSerial) {
        processedCard.id = String(card.id || card.slabSerial);
      }
      
      // Remove fields that shouldn't be saved to Firestore
      delete processedCard._pendingImageFile; // Remove the file object before saving to Firestore
      delete processedCard._blobUrl; // Remove the blob URL reference
      
      console.log('[CardDetails] Saving processed card:', {
        id: processedCard.id,
        collection: processedCard.collection,
        date: processedCard.datePurchased,
        timestamp: new Date().toISOString()
      });
      
      // Update the card in the database
      console.log('[CardDetails] Calling updateCard...');
      const saveStart = performance.now();
      
      // Make sure we're using the function from props
      if (typeof onUpdateCard !== 'function') {
        throw new Error('onUpdateCard function is not provided to CardDetails component');
      }
      
      // Pass the processed card to the parent component's update function
      await onUpdateCard(processedCard);
      
      const saveEnd = performance.now();
      console.log(`[CardDetails] updateCard finished in ${(saveEnd - saveStart).toFixed(2)}ms`);
      
      // Now update the editedCard state to match what we saved
      setEditedCard(finalCardData);
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success message
      toast.success('Card saved successfully!');
      
      console.log('[CardDetails] Card saved successfully, keeping modal open');
      console.log('=========== CARD SAVE FLOW END ===========');
    } catch (error) {
      console.error('=========== CARD SAVE ERROR ===========');
      console.error('Error saving card:', error);
      toast.error('Error saving card: ' + error.message);
      console.error('=========== CARD SAVE ERROR END ===========');
    }
  };

  // Handle close action with confirmation for unsaved changes
  const handleClose = (skipConfirmation = false) => {
    // Check if there are unsaved changes and we're not skipping confirmation
    if (hasUnsavedChanges && !skipConfirmation) {
      // TODO: Implement a dialog for confirmation
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    
    // Clean up any blob URLs before closing
    if (editedCard && editedCard._blobUrl && editedCard._blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(editedCard._blobUrl);
        console.log('Cleaned up blob URL on close');
      } catch (e) {
        console.warn('Failed to revoke blob URL on close:', e);
      }
    }
    
    // Also clean up cardImage if it's a blob URL
    if (cardImage && cardImage.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cardImage);
        // Set to null before closing to prevent invalid references
        setCardImage(null);
      } catch (e) {
        console.warn('Failed to revoke cardImage blob URL on close:', e);
      }
    }
    
    // Close the modal
    setIsOpen(false);
    
    // Execute onClose callback after a short delay to allow animations
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Handle card field changes and track if there are unsaved changes
  const handleCardChange = (updatedCard) => {
    setEditedCard(updatedCard);
    setHasUnsavedChanges(true);
  };

  // Clean up blob URLs when component unmounts or card changes
  useEffect(() => {
    return () => {
      // Cleanup function when component unmounts
      if (editedCard && editedCard._blobUrl && editedCard._blobUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(editedCard._blobUrl);
          console.log('Cleaned up blob URL on unmount');
        } catch (e) {
          console.warn('Failed to revoke blob URL on unmount:', e);
        }
      }
    };
  }, [editedCard]);

  // Additional effect to ensure blob URLs are properly managed
  useEffect(() => {
    // When editedCard's imageUrl changes and is a blob URL
    if (editedCard.imageUrl && editedCard.imageUrl.startsWith('blob:')) {
      // Store the current blob URL
      const currentBlobUrl = editedCard.imageUrl;
      
      // Clean up function for when this blob URL is no longer needed
      return () => {
        try {
          // Only revoke if the current blob URL is different than the one in editedCard
          // This check prevents revoking a URL that might still be in use
          if (currentBlobUrl && currentBlobUrl !== editedCard.imageUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            console.log('Cleaned up stale blob URL');
          }
        } catch (e) {
          console.warn('Failed to revoke stale blob URL:', e);
        }
      };
    }
  }, [editedCard.imageUrl]);

  // Check if the card has been edited
  const hasCardBeenEdited = () => {
    return Object.keys(editedCard).some(key => {
      // Skip comparing functions, undefined values, and image-related fields
      if (
        typeof editedCard[key] === 'function' || 
        editedCard[key] === undefined ||
        key === 'imageUrl' ||
        key === 'hasImage' ||
        key === 'imageUpdatedAt'
      ) {
        return false;
      }
      // For numbers, compare with a small epsilon to handle floating point precision
      if (typeof editedCard[key] === 'number') {
        return Math.abs(editedCard[key] - (card[key] || 0)) > 0.001;
      }
      return editedCard[key] !== (card[key] || '');
    });
  };

  return (
    <CardDetailsModal
      isOpen={isOpen}
      onClose={handleClose}
      card={editedCard}
      onSave={handleSave}
      // onDelete={onDelete} - Removed delete functionality from modal
      onMarkAsSold={async (soldCardData) => {
        try {
          // First get the existing sold cards
          let soldCards = await db.getSoldCards() || [];
          // console.log("Current sold cards:", soldCards);
          
          // Add the current card to the sold cards list
          soldCards.push({
            ...soldCardData,
            id: soldCardData.id || soldCardData.slabSerial,
            imageUrl: cardImage // Include the card image URL
          });
          
          // Save the updated sold cards list
          await db.saveSoldCards(soldCards);
          
          // Remove the card from the main collection if onDelete is provided
          if (onDelete) {
            await onDelete(card);
          }
          
          toast.success('Card marked as sold and moved to Sold Items');
          handleClose(true);
        } catch (error) {
          console.error('Error marking card as sold:', error);
          toast.error('Error marking card as sold: ' + error.message);
        }
      }}
      onChange={handleCardChange}
      image={cardImage}
      imageLoadingState={imageLoadingState}
      onImageChange={handleImageChange}
      onImageRetry={loadCardImage}
      className="fade-in"
      additionalHeaderContent={
        <div className="flex flex-col space-y-2">
          <PSALookupButton 
            currentCardData={editedCard}
            onCardUpdate={(updatedData) => {
              // Store reference to any existing blob URL before updating
              const existingBlobUrl = editedCard._blobUrl;
              
              setEditedCard(prev => {
                const newData = {
                  ...prev,
                  ...updatedData,
                  // Preserve image-related properties from the previous state
                  imageUrl: prev.imageUrl,
                  _pendingImageFile: prev._pendingImageFile,
                  _blobUrl: prev._blobUrl,
                  hasImage: prev.hasImage
                };
                return newData;
              });
              
              setHasUnsavedChanges(true);
              toast.success("Card details updated from PSA data");
            }}
            buttonText="Lookup PSA Data"
          />
          
          {editedCard.slabSerial && (
            <button
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {
                // Use the existing PSA serial number to refresh the data
                toast.loading('Refreshing PSA data...');
                
                searchByCertNumber(editedCard.slabSerial, true) // true = force refresh
                  .then(data => {
                    if (data && !data.error) {
                      const parsedData = parsePSACardData(data);
                      const mergedData = mergeWithExistingCard(editedCard, parsedData);
                      
                      // Update the card with the refreshed data
                      setEditedCard(prev => {
                        const newData = {
                          ...prev,
                          ...mergedData,
                          // Preserve image-related properties
                          imageUrl: prev.imageUrl,
                          _pendingImageFile: prev._pendingImageFile,
                          _blobUrl: prev._blobUrl,
                          hasImage: prev.hasImage
                        };
                        return newData;
                      });
                      
                      setHasUnsavedChanges(true);
                      toast.dismiss();
                      toast.success('PSA data refreshed successfully');
                    } else {
                      toast.dismiss();
                      toast.error(data?.error || 'Failed to refresh PSA data');
                    }
                  })
                  .catch(error => {
                    console.error('Error refreshing PSA data:', error);
                    toast.dismiss();
                    toast.error('Error refreshing PSA data');
                  });
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh PSA Data
            </button>
          )}
        </div>
      }
      additionalSerialContent={
        <div className="flex items-center space-x-2">
          <PSALookupButton 
            currentCardData={editedCard}
            onCardUpdate={(updatedData) => {
              // Store reference to any existing blob URL before updating
              const existingBlobUrl = editedCard._blobUrl;
              
              setEditedCard(prev => {
                const newData = {
                  ...prev,
                  ...updatedData,
                  // Preserve image-related properties from the previous state
                  imageUrl: prev.imageUrl,
                  _pendingImageFile: prev._pendingImageFile,
                  _blobUrl: prev._blobUrl,
                  hasImage: prev.hasImage
                };
                return newData;
              });
              
              setHasUnsavedChanges(true);
              toast.success("Card details updated from PSA data");
            }}
            iconOnly={true}
          />
          
          {editedCard.slabSerial && (
            <button
              className="inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Refresh PSA Data"
              onClick={() => {
                // Use the existing PSA serial number to refresh the data
                toast.loading('Refreshing PSA data...');
                
                searchByCertNumber(editedCard.slabSerial, true) // true = force refresh
                  .then(data => {
                    if (data && !data.error) {
                      const parsedData = parsePSACardData(data);
                      const mergedData = mergeWithExistingCard(editedCard, parsedData);
                      
                      // Update the card with the refreshed data
                      setEditedCard(prev => {
                        const newData = {
                          ...prev,
                          ...mergedData,
                          // Preserve image-related properties
                          imageUrl: prev.imageUrl,
                          _pendingImageFile: prev._pendingImageFile,
                          _blobUrl: prev._blobUrl,
                          hasImage: prev.hasImage
                        };
                        return newData;
                      });
                      
                      setHasUnsavedChanges(true);
                      toast.dismiss();
                      toast.success('PSA data refreshed successfully');
                    } else {
                      toast.dismiss();
                      toast.error(data?.error || 'Failed to refresh PSA data');
                    }
                  })
                  .catch(error => {
                    console.error('Error refreshing PSA data:', error);
                    toast.dismiss();
                    toast.error('Error refreshing PSA data');
                  });
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          )}
        </div>
      }
      collections={collections}
      initialCollectionName={initialCollectionName}
    />
  );
});

CardDetails.propTypes = {
  card: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onUpdateCard: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  exchangeRate: PropTypes.number.isRequired,
  collections: PropTypes.arrayOf(PropTypes.string),
  initialCollectionName: PropTypes.string
};

export default CardDetails;
