import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types'; // Add this import
import db from '../services/db';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import PSALookupButton from './PSALookupButton';
import PriceChartingButton from './PriceChartingButton';
import PriceHistoryGraph from './PriceHistoryGraph';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const CardDetails = memo(({
  card,
  onClose,
  onUpdateCard,
  onDelete,
  exchangeRate,
  collections = [],
  initialCollectionName
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

  // Load the card image
  const loadCardImage = async () => {
    setImageLoadingState('loading');
    try {
      // Use the appropriate ID for the image
      const id = editedCard.id || editedCard.slabSerial || card.id || card.slabSerial;
      // console.log('[CardDetails] Loading image for ID:', id);
      const imageBlob = await db.getImage(id);
      
      if (imageBlob) {
        // Revoke any existing object URL to prevent memory leaks
        if (cardImage) {
          URL.revokeObjectURL(cardImage);
        }
        
        const imageUrl = URL.createObjectURL(imageBlob);
        // console.log('[CardDetails] Image loaded successfully, URL:', imageUrl);
        setCardImage(imageUrl);
        setImageLoadingState('idle');
      } else {
        // console.log('[CardDetails] No image found for ID:', id);
        setCardImage(null);
        setImageLoadingState('idle');
      }
    } catch (error) {
      console.error('Error loading card image:', error);
      setCardImage(null);
      setImageLoadingState('error');
    }
  };

  // Handle image update
  const handleImageChange = async (file) => {
    if (file) {
      try {
        // Show loading state
        setImageLoadingState('loading');
        
        // Use the appropriate ID for the image
        const id = card.id || card.slabSerial;
        
        // Save image to database
        await db.saveImage(id, file);
        
        // Create URL for local display
        const imageUrl = URL.createObjectURL(file);
        setCardImage(imageUrl);
        
        // Update the edited card with the image URL
        setEditedCard(prev => ({
          ...prev,
          imageUrl: imageUrl
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
      // console.log('[CardDetails] Saving card with data:', updatedCard);
      
      // Convert string values to appropriate types
      const processedCard = {
        ...updatedCard,
        year: updatedCard.year ? parseInt(updatedCard.year, 10) : null,
        investmentUSD: updatedCard.investmentUSD ? parseFloat(updatedCard.investmentUSD) : 0,
        currentValueUSD: updatedCard.currentValueUSD ? parseFloat(updatedCard.currentValueUSD) : 0,
        investmentAUD: updatedCard.investmentAUD ? parseFloat(updatedCard.investmentAUD) : 0,
        currentValueAUD: updatedCard.currentValueAUD ? parseFloat(updatedCard.currentValueAUD) : 0,
        datePurchased: updatedCard.datePurchased ? new Date(updatedCard.datePurchased) : null
      };
      
      // Update the card in the database
      await updateCard(processedCard);
      
      // Show success message
      toast.success('Card saved successfully!');
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Close the modal
      handleClose(true); // Pass true to indicate a successful save
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Error saving card: ' + error.message);
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
      additionalValueContent={
        <PriceChartingButton
          currentCardData={editedCard}
          onCardUpdate={(updatedData) => {
            // console.log('[CardDetails] Received updated data from PriceCharting:', updatedData);
            // console.log('[CardDetails] Current edited card before update:', editedCard);
            
            setEditedCard(prev => {
              const newData = {
                ...prev,
                ...updatedData
              };
              // console.log('[CardDetails] New card data after update:', newData);
              return newData;
            });
            
            setHasUnsavedChanges(true);
            // console.log('[CardDetails] Set hasUnsavedChanges to true');
            toast.success("Card price updated from PriceCharting");
          }}
          buttonText="Update Price"
          className="ml-2"
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

CardDetails.defaultProps = {
  card: null,
  collections: [],
  initialCollectionName: null
};

export default CardDetails;