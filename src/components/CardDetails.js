import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types'; 
import db from '../services/db';
import cardRepo from '../services/cardRepo';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import PSALookupButton from './PSALookupButton';
import PriceHistoryGraph from './PriceHistoryGraph';

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
        
        // Check if there's already a blob URL to revoke
        if (editedCard._blobUrl) {
          try {
            URL.revokeObjectURL(editedCard._blobUrl);
            console.log('Revoked previous blob URL');
          } catch (e) {
            console.warn('Failed to revoke previous blob URL', e);
          }
        }
        
        // Create a local URL for the image preview that's stable
        const localImageUrl = URL.createObjectURL(file);
        
        // Set card image directly from current scope
        setCardImage(localImageUrl);
        
        // Update the edited card with the pending image
        setEditedCard(prev => ({
          ...prev,
          imageUrl: localImageUrl,
          hasImage: true,
          _pendingImageFile: file, // Store the file for later upload
          _blobUrl: localImageUrl, // Store the blob URL for cleanup
          imageUpdatedAt: new Date().toISOString() // Add timestamp to force refresh
        }));
        
        // Mark that we have unsaved changes
        setHasUnsavedChanges(true);
        
        // Update the loading state
        setImageLoadingState('idle');
        
        // Show a toast to let the user know they need to save
        toast.success('Image staged - Click Save to upload to the server');
        
        return file;
      } catch (error) {
        console.error('Error processing image:', error);
        setImageLoadingState('error');
        
        // Try toast, but don't let it break the app
        try {
          toast.error(`Failed to process image: ${error.message || 'Unknown error'}`);
        } catch (toastError) {
          console.error('Toast notification error:', toastError);
        }
        
        return null;
      }
    } else {
      console.warn(`Invalid image file provided: ${file ? 'not a valid Blob/File' : 'null or undefined'}`);
      setImageLoadingState('error');
      
      try {
        toast.error('Invalid image file. Please try another image.');
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
      
      return null;
    }
  };

  // Handle close action with confirmation for unsaved changes
  const handleClose = (saveSuccess = false, skipConfirmation = false) => {
    // If save was successful, we can close without confirmation
    if (!saveSuccess && hasUnsavedChanges && !skipConfirmation) {
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
    
    // Reset unsaved changes state if save was successful
    if (saveSuccess) {
      setHasUnsavedChanges(false);
    }
    
    // Close the modal
    setIsOpen(false);
    
    // Execute onClose callback after a short delay to allow animations
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Handle save action
  const handleSave = async () => {
    console.log('=========== CARD SAVE FLOW START ===========');
    console.log('[CardDetails] handleSave called with card:', card.id);
    
    try {
      // Prepare the final card data
      let finalCardData = { ...editedCard };
      
      // Check if this card has a pending image to upload
      if (editedCard._pendingImageFile) {
        console.log('[CardDetails] Uploading pending image before saving card');
        
        try {
          // Store the old blob URL for cleanup
          const oldBlobUrl = editedCard._blobUrl;
          
          // Show a loading toast
          const loadingToast = toast.loading('Uploading image...');
          
          // Now actually upload the image to Firebase
          // Always force replacement to ensure old image is deleted
          const imageUrl = await db.saveImage(
            card.id || card.slabSerial, 
            editedCard._pendingImageFile, 
            { 
              isReplacement: true, // Always force replacement
              silent: false // Show toast for image upload
            }
          );
          
          // Dismiss the loading toast
          toast.dismiss(loadingToast);
          
          // Check if we got a data URL (fallback for development)
          const isDataUrl = imageUrl && imageUrl.startsWith('data:');
          
          // Force a unique timestamp to prevent caching issues
          const timestamp = new Date().toISOString();
          
          // Update the finalCardData directly
          finalCardData = {
            ...finalCardData,
            imageUrl: imageUrl,
            hasImage: true,
            _isDataUrl: isDataUrl, // Flag to indicate this is a data URL
            imageUpdatedAt: timestamp, // Add timestamp to force refresh
            _pendingImageFile: null,
            _blobUrl: null,
            _forceImageRefresh: Date.now() // Add a unique timestamp to force refresh
          };
          
          // Update the card image state with the new URL
          setCardImage(imageUrl);
          
          // Force a refresh of the image by creating an image element
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
            console.log('[CardDetails] Image preloaded successfully');
          };
          
          // We don't use the blob URL anymore since we have the Firebase URL
          // Revoke the blob URL after we've updated all references
          if (oldBlobUrl && oldBlobUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(oldBlobUrl);
            } catch (e) {
              console.warn('Failed to revoke blob URL during save:', e);
            }
          }
          
          console.log('[CardDetails] Image uploaded successfully with URL:', isDataUrl ? 'data:URL (truncated)' : imageUrl);
          toast.success('Image uploaded successfully');
        } catch (imageError) {
          console.error('[CardDetails] Error uploading image:', imageError);
          toast.error(`Error uploading image: ${imageError.message}`);
          // Don't proceed with saving if image upload fails
          return;
        }
      }
      
      // Process the date value
      let processedDate = finalCardData.date || finalCardData.datePurchased;
      
      // Process the card data for saving and remove non-Firestore-compatible fields
      const processedCard = {
        ...finalCardData,
        year: finalCardData.year ? parseInt(finalCardData.year, 10) : null,
        investmentUSD: finalCardData.investmentUSD ? parseFloat(finalCardData.investmentUSD) : 0,
        currentValueUSD: finalCardData.currentValueUSD ? parseFloat(finalCardData.currentValueUSD) : 0,
        investmentAUD: finalCardData.investmentAUD ? parseFloat(finalCardData.investmentAUD) : 0,
        currentValueAUD: finalCardData.currentValueAUD ? parseFloat(finalCardData.currentValueAUD) : 0,
        datePurchased: processedDate, // Use the processed date
        // Ensure both collection properties are set for compatibility
        collection: finalCardData.collectionId || finalCardData.collection || initialCollectionName,
        collectionId: finalCardData.collectionId || finalCardData.collection || initialCollectionName,
        hasImage: finalCardData.hasImage || false, // Make sure hasImage is explicitly set
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
      
      console.log('[CardDetails] Card saved successfully, closing modal');
      console.log('=========== CARD SAVE FLOW END ===========');
      
      // Close the modal with success flag
      handleClose(true);
    } catch (error) {
      console.error('=========== CARD SAVE ERROR ===========');
      console.error('Error saving card:', error);
      toast.error('Error saving card: ' + error.message);
      console.error('=========== CARD SAVE ERROR END ===========');
    }
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
      }
      additionalSerialContent={
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