import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types'; // Add this import
import db from '../services/db';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import PSALookupButton from './PSALookupButton';
import PriceHistoryGraph from './PriceHistoryGraph';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

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
    datePurchased: formatDate(card.datePurchased) || ''
  });
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { isDarkMode } = useTheme();
  const messageTimeoutRef = useRef(null);

  // Effect to update editedCard when card or initialCollectionName changes
  useEffect(() => {
    if (card) {
      setEditedCard({
        ...card,
        id: card.id || card.slabSerial,
        year: card.year ? String(card.year) : '',
        investmentUSD: typeof card.investmentUSD === 'number' ? String(Number(card.investmentUSD.toFixed(2))) : '0',
        currentValueUSD: typeof card.currentValueUSD === 'number' ? String(Number(card.currentValueUSD.toFixed(2))) : '0',
        investmentAUD: typeof card.investmentAUD === 'number' ? String(Number(card.investmentAUD.toFixed(2))) : '0',
        currentValueAUD: typeof card.currentValueAUD === 'number' ? String(Number(card.currentValueAUD.toFixed(2))) : '0',
        datePurchased: formatDate(card.datePurchased) || '',
        // Prioritize initialCollectionName if provided, otherwise use card's collectionId
        collectionId: initialCollectionName || card.collectionId || '' 
      });
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
      
      // Clean up any created object URLs to prevent memory leaks
      if (cardImage) {
        // console.log('[CardDetails] Cleaning up image URL on unmount:', cardImage);
        URL.revokeObjectURL(cardImage);
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
        
        // Save image to database
        await db.saveImage(id, file);
        
        // Create URL for local display
        const imageUrl = URL.createObjectURL(file);
        setCardImage(imageUrl);
        
        // Update the edited card with the image URL
        setEditedCard(prev => ({
          ...prev,
          imageUrl: imageUrl,
          hasImage: true
        }));
        
        setImageLoadingState('idle');
        
        // Create a unique timestamp for this update
        const timestamp = new Date().toISOString();
        
        try {
          // Notify parent component that image has been updated
          await updateCard({
            ...card,
            hasImage: true,
            imageUpdatedAt: timestamp
          });
          
          // Try toast, but don't let it break the app
          try {
            toast.success('Image uploaded successfully');
          } catch (toastError) {
            console.error('Toast notification error:', toastError);
          }
        } catch (updateError) {
          console.error('Error updating card after image upload:', updateError);
          
          // Try toast, but don't let it break the app
          try {
            toast.success('Image saved, but there was a problem updating the card');
          } catch (toastError) {
            console.error('Toast notification error:', toastError);
          }
        }
        
        return file;
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        
        // Try toast, but don't let it break the app
        try {
          toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
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

  // Handle save action
  const handleSave = async (updatedCard) => {
    try {
      console.log('=========== CARD SAVE FLOW START ===========');
      console.log('[CardDetails] handleSave called with card:', updatedCard.id);
      
      // Process date properly - keep as string or convert to string in ISO format
      let processedDate = null;
      if (updatedCard.datePurchased) {
        // If it's already a string in YYYY-MM-DD format, keep it
        if (typeof updatedCard.datePurchased === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updatedCard.datePurchased)) {
          processedDate = updatedCard.datePurchased;
        } 
        // If it's a Date object, convert to string
        else if (updatedCard.datePurchased instanceof Date) {
          processedDate = updatedCard.datePurchased.toISOString().split('T')[0];
        }
        // Otherwise try to parse it as a date and convert to string
        else {
          try {
            const dateObj = new Date(updatedCard.datePurchased);
            if (!isNaN(dateObj.getTime())) {
              processedDate = dateObj.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }
      }
      
      // Convert string values to appropriate types
      const processedCard = {
        ...updatedCard,
        year: updatedCard.year ? parseInt(updatedCard.year, 10) : null,
        investmentUSD: updatedCard.investmentUSD ? parseFloat(updatedCard.investmentUSD) : 0,
        currentValueUSD: updatedCard.currentValueUSD ? parseFloat(updatedCard.currentValueUSD) : 0,
        investmentAUD: updatedCard.investmentAUD ? parseFloat(updatedCard.investmentAUD) : 0,
        currentValueAUD: updatedCard.currentValueAUD ? parseFloat(updatedCard.currentValueAUD) : 0,
        datePurchased: processedDate, // Use the processed date
        // Ensure both collection properties are set for compatibility
        collection: updatedCard.collectionId || updatedCard.collection || initialCollectionName,
        collectionId: updatedCard.collectionId || updatedCard.collection || initialCollectionName,
        // Add a debug flag
        _saveDebug: true
      };
      
      console.log('[CardDetails] Saving processed card:', {
        id: processedCard.id,
        collection: processedCard.collection,
        date: processedCard.datePurchased,
        timestamp: new Date().toISOString()
      });
      
      // Update the card in the database
      console.log('[CardDetails] Calling updateCard...');
      const saveStart = performance.now();
      await updateCard(processedCard);
      const saveEnd = performance.now();
      console.log(`[CardDetails] updateCard finished in ${(saveEnd - saveStart).toFixed(2)}ms`);
      
      // Show success message
      toast.success('Card saved successfully!');
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Close the modal
      console.log('[CardDetails] Closing modal after successful save');
      handleClose(true); // Pass true to indicate a successful save
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
    if (skipConfirmation || !hasUnsavedChanges) {
      // If skipConfirmation is true or there are no unsaved changes, close without confirmation
      setIsOpen(false);
      setTimeout(() => {
        onClose();
      }, 300);
    } else {
      // Otherwise, show confirmation dialog
      setIsOpen(false);
      // Wait for the close animation to finish
      setTimeout(() => {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          onClose();
        } else {
          setIsOpen(true);
        }
      }, 300);
    }
  };

  // Handle card field changes and track if there are unsaved changes
  const handleCardChange = (updatedCard) => {
    setEditedCard(updatedCard);
    setHasUnsavedChanges(true);
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
            setEditedCard(prev => ({
              ...prev,
              ...updatedData
            }));
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
            // console.log('[CardDetails] Received updated data from PSA lookup:', updatedData);
            
            setEditedCard(prev => {
              const newData = {
                ...prev,
                ...updatedData
              };
              // console.log('[CardDetails] New card data after PSA update:', newData);
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