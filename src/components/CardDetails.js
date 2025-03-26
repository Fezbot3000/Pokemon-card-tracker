import React, { useState, useEffect, useRef, memo } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import { db } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';

// Image loading states component
const CardImage = memo(({ imageUrl, loadingState, onRetry }) => {
  if (loadingState === 'loading') {
    return (
      <div className="card-image-display loading">
        <span className="material-icons animate-spin">hourglass_empty</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
      </div>
    );
  }
  
  if (loadingState === 'error') {
    return (
      <div className="card-image-display error">
        <span className="material-icons">error_outline</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Failed to load image</span>
        <button onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  
  if (!imageUrl) {
    return (
      <div className="card-image-display">
        <div className="flex flex-col items-center justify-center h-full">
          <span className="material-icons text-4xl text-gray-400 dark:text-gray-500 mb-2">
            image
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No image available
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card-image-display">
      <img
        src={imageUrl}
        alt="Card"
        className="w-full h-full object-contain"
      />
    </div>
  );
});

const CardDetails = ({ card, onClose, onUpdate, onUpdateCard, onDelete, exchangeRate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editedCard, setEditedCard] = useState({
    ...card,
    investmentUSD: typeof card.investmentUSD === 'number' ? Number(card.investmentUSD.toFixed(2)) : 0,
    currentValueUSD: typeof card.currentValueUSD === 'number' ? Number(card.currentValueUSD.toFixed(2)) : 0,
    investmentAUD: typeof card.investmentAUD === 'number' ? Number(card.investmentAUD.toFixed(2)) : 0,
    currentValueAUD: typeof card.currentValueAUD === 'number' ? Number(card.currentValueAUD.toFixed(2)) : 0
  });
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const fileInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const { isDarkMode } = useTheme();

  // Add ref for the modal content
  const modalContentRef = useRef(null);

  // Use onUpdateCard if available, otherwise fall back to onUpdate for backward compatibility
  const updateCard = onUpdateCard || onUpdate;

  // Effect to trigger open animation on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    if (saveMessage) {
      messageTimeoutRef.current = setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [saveMessage]);

  useEffect(() => {
    loadCardImage();
    return () => {
      if (cardImage) {
        URL.revokeObjectURL(cardImage);
      }
    };
  }, [card.slabSerial]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadCardImage = async () => {
    setImageLoadingState('loading');
    try {
      const imageBlob = await db.getImage(card.slabSerial);
      if (imageBlob) {
        const imageUrl = URL.createObjectURL(imageBlob);
        setCardImage(imageUrl);
        setImageLoadingState('loaded');
      } else {
        setCardImage(null);
        setImageLoadingState('loaded');
      }
    } catch (error) {
      console.error('Error loading card image:', error);
      setImageLoadingState('error');
    }
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCard(prev => ({
      ...prev,
      [name]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow empty input or numbers with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      const numValue = value === '' ? '' : parseFloat(value);
      
      setEditedCard(prev => {
        const updates = {
          ...prev,
          [name]: value === '' ? '' : numValue
        };

        // Calculate USD values based on AUD
        if (name === 'investmentAUD') {
          updates.investmentUSD = value === '' ? '' : Number((numValue / exchangeRate).toFixed(2));
          updates.potentialProfit = Number((prev.currentValueAUD || 0) - (numValue || 0)).toFixed(2);
        } else if (name === 'currentValueAUD') {
          updates.currentValueUSD = value === '' ? '' : Number((numValue / exchangeRate).toFixed(2));
          updates.potentialProfit = Number((numValue || 0) - (prev.investmentAUD || 0)).toFixed(2);
        }

        return updates;
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Show loading state
        setImageLoadingState('loading');
        
        // Save image to database
        await db.saveImage(card.slabSerial, file);
        
        // Create URL for local display
        const imageUrl = URL.createObjectURL(file);
        setCardImage(imageUrl);
        setImageLoadingState('loaded');
        
        // Create a unique timestamp for this update
        const timestamp = new Date().toISOString();
        
        try {
          // Notify parent component that image has been updated
          // This will trigger a refresh of the card images in the main view
          await updateCard({
            ...card,
            hasImage: true,
            imageUpdatedAt: timestamp
          });
          
          // Show success message
          toast.success('Image uploaded successfully');
        } catch (updateError) {
          console.error('Error updating card after image upload:', updateError);
          // Still show success for the image upload since it was saved in the database
          toast.success('Image saved, but there was a problem updating the card');
        }
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        
        // Show error message
        toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const hasCardBeenEdited = () => {
    return Object.keys(editedCard).some(key => {
      // Skip comparing functions, undefined values, and cardImage
      if (typeof editedCard[key] === 'function' || editedCard[key] === undefined) {
        return false;
      }
      // For numbers, compare with a small epsilon to handle floating point precision
      if (typeof editedCard[key] === 'number') {
        return Math.abs(editedCard[key] - (card[key] || 0)) > 0.001;
      }
      return editedCard[key] !== (card[key] || '');
    });
  };

  const handleSave = async () => {
    try {
      // Check if there are any changes
      if (!hasCardBeenEdited()) {
        toast.info('No changes to save');
        return;
      }

      // Format the card data before saving
      const cardToSave = {
        ...card, // Start with original card data
        ...editedCard, // Override with edited values
        investmentAUD: Number(editedCard.investmentAUD || 0),
        currentValueAUD: Number(editedCard.currentValueAUD || 0),
        investmentUSD: Number(editedCard.investmentUSD || 0),
        currentValueUSD: Number(editedCard.currentValueUSD || 0),
        potentialProfit: Number((Number(editedCard.currentValueAUD || 0) - Number(editedCard.investmentAUD || 0)).toFixed(2))
      };

      // Update the parent component first (this will handle the database save)
      await updateCard(cardToSave);
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success message
      toast.success('Card updated successfully');
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Failed to update card: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      onDelete(card.slabSerial);
    }
  };

  const profit = editedCard.currentValueAUD - editedCard.investmentAUD;
  const profitPercentage = editedCard.investmentAUD ? (profit / editedCard.investmentAUD * 100) : 0;

  return (
    <>
      <div 
        className={`card-details-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleClose}
      />
      
      <div 
        className={`card-details ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
      >
        {/* Header */}
        <div className="card-details-header">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Card Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="card-details-content">
          {/* Image upload section */}
          <div className="mb-6">
            <div className="image-upload-container">
              <CardImage
                imageUrl={cardImage}
                loadingState={imageLoadingState}
                onRetry={loadCardImage}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                <span className="material-icons text-white text-4xl mb-2">
                  upload
                </span>
                <span className="text-white text-sm">
                  Click or drag to upload image
                </span>
              </div>
            </div>
          </div>

          {/* Card Details Form */}
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Player
                  </label>
                  <input
                    type="text"
                    name="player"
                    value={editedCard.player || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Card Name
                  </label>
                  <input
                    type="text"
                    name="card"
                    value={editedCard.card || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Set
                </label>
                <input
                  type="text"
                  name="set"
                  value={editedCard.set || ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  name="year"
                  value={editedCard.year || ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={editedCard.category || ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condition
                </label>
                <input
                  type="text"
                  name="condition"
                  value={editedCard.condition || ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                name="slabSerial"
                value={editedCard.slabSerial}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Investment (AUD)
                  </label>
                  <input
                    type="text"
                    name="investmentAUD"
                    value={editedCard.investmentAUD === '' ? '' : editedCard.investmentAUD === 0 ? '' : editedCard.investmentAUD}
                    onChange={handleNumberInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Value (AUD)
                  </label>
                  <input
                    type="text"
                    name="currentValueAUD"
                    value={editedCard.currentValueAUD === '' ? '' : editedCard.currentValueAUD === 0 ? '' : editedCard.currentValueAUD}
                    onChange={handleNumberInputChange}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer with Actions */}
        <div className="card-details-footer">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-300 
                     text-sm font-medium text-gray-700 bg-white 
                     hover:bg-gray-50 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-primary 
                     dark:bg-gray-700 dark:border-gray-600 
                     dark:text-white dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg border border-transparent 
                     text-sm font-medium text-white bg-primary 
                     hover:bg-primary/90 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};

export default memo(CardDetails);