import React, { useState, useEffect, useRef, memo } from 'react';
import db from '../services/db';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import PSALookupButton from './PSALookupButton';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const CardDetails = ({ card, onClose, onUpdate, onUpdateCard, onDelete, exchangeRate }) => {
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

  // Use onUpdateCard if available, otherwise fall back to onUpdate for backward compatibility
  const updateCard = onUpdateCard || onUpdate;

  // Effect to load card image on mount
  useEffect(() => {
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
    };
  }, []);

  // Load the card image
  const loadCardImage = async () => {
    setImageLoadingState('loading');
    try {
      // Use the appropriate ID for the image
      const id = card.id || card.slabSerial;
      const imageBlob = await db.getImage(id);
      
      if (imageBlob) {
        const imageUrl = URL.createObjectURL(imageBlob);
        setCardImage(imageUrl);
        
        // Update the edited card with the image URL
        setEditedCard(prev => ({
          ...prev,
          imageUrl: imageUrl
        }));
        
        setImageLoadingState('idle');
      } else {
        setCardImage(null);
        setImageLoadingState('idle');
      }
    } catch (error) {
      console.error('Error loading card image:', error);
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
      // Check if there are any changes
      if (!hasCardBeenEdited()) {
        // Show a simple feedback message in the UI
        try {
          toast.info('No changes to save');
        } catch (toastError) {
          console.error('Toast notification error:', toastError);
        }
        return;
      }

      // Format the card data before saving
      const cardToSave = {
        ...card, // Start with original card data
        ...updatedCard, // Override with edited values
        investmentAUD: Number(updatedCard.investmentAUD || 0),
        currentValueAUD: Number(updatedCard.currentValueAUD || 0),
        investmentUSD: Number(updatedCard.investmentUSD || 0),
        currentValueUSD: Number(updatedCard.currentValueUSD || 0),
        potentialProfit: Number((Number(updatedCard.currentValueAUD || 0) - Number(updatedCard.investmentAUD || 0)).toFixed(2))
      };

      // Apply exchange rate conversions if needed
      if (exchangeRate && typeof exchangeRate === 'number') {
        // If AUD value changed, recalculate USD value
        if (updatedCard.investmentAUD !== card.investmentAUD) {
          cardToSave.investmentUSD = Number((updatedCard.investmentAUD / exchangeRate).toFixed(2));
        }
        
        if (updatedCard.currentValueAUD !== card.currentValueAUD) {
          cardToSave.currentValueUSD = Number((updatedCard.currentValueAUD / exchangeRate).toFixed(2));
        }
      }

      // Update the parent component (this will handle the database save)
      await updateCard(cardToSave);
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Use try-catch specifically for toast to isolate potential errors
      try {
        toast.success('Card updated successfully');
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
      
      // Close the modal with a small delay for animation
      handleClose();
    } catch (error) {
      console.error('Error saving card:', error);
      
      // Try to show toast, but don't let it break the app
      try {
        toast.error('Failed to update card: ' + (error.message || 'Unknown error'));
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    try {
      await onDelete(card);
      try {
        toast.success('Card deleted successfully');
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
      handleClose();
    } catch (error) {
      console.error('Error deleting card:', error);
      try {
        toast.error('Error deleting card: ' + error.message);
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
    }
  };

  // Handle marking a card as sold
  const handleMarkAsSold = async (soldCardData) => {
    try {
      // First get the existing sold cards
      let soldCards = await db.getSoldCards() || [];
      console.log("Current sold cards:", soldCards);
      
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
      handleClose();
    } catch (error) {
      console.error('Error marking card as sold:', error);
      toast.error('Error marking card as sold: ' + error.message);
    }
  };

  // Handle close action with confirmation for unsaved changes
  const handleClose = () => {
    setIsOpen(false);
    // Wait for the close animation to finish
    setTimeout(() => {
      if (hasUnsavedChanges) {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          onClose();
        } else {
          setIsOpen(true);
        }
      } else {
        onClose();
      }
    }, 300);
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
      onDelete={onDelete ? () => handleDelete() : null}
      onMarkAsSold={handleMarkAsSold}
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
    />
  );
};

export default memo(CardDetails);