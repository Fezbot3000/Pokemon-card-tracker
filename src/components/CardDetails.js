import React, { useState, useEffect, useRef, memo } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import db from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';

// Add CSS class definitions
const inputStyles = `
  w-full px-3 py-2 border border-gray-200 dark:border-gray-700
  rounded-lg bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white text-sm
  focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
  placeholder-gray-500 dark:placeholder-gray-400
`;

// Image loading states component
const CardImage = memo(({ imageUrl, loadingState, onRetry, onClick }) => {
  const { isDarkMode } = useTheme();
  
  if (loadingState === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="material-icons animate-spin text-gray-500">hourglass_empty</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Loading image...</span>
      </div>
    );
  }
  
  if (loadingState === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <span className="material-icons text-red-500 mb-2">error_outline</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">Failed to load image</span>
        <button 
          onClick={onRetry}
          className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white px-3 py-1 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <span className="material-icons text-4xl text-gray-400 dark:text-gray-600 mb-2">
          image
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          No image available
        </span>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full cursor-pointer" onClick={onClick}>
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
    currentValueAUD: typeof card.currentValueAUD === 'number' ? Number(card.currentValueAUD.toFixed(2)) : 0,
    datePurchased: card.datePurchased || ''
  });
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const fileInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const { isDarkMode } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef(null);

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

  useEffect(() => {
    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    // Prevent background scrolling but compensate for scrollbar width
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    
    return () => {
      // Restore scrolling on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please drop an image file');
        return;
      }
      handleImageChange({ target: { files: [file] } });
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
          
          // Show success message in UI
          setSaveMessage('Image uploaded successfully');
          
          // Try toast, but don't let it break the app
          try {
            toast.success('Image uploaded successfully');
          } catch (toastError) {
            console.error('Toast notification error:', toastError);
          }
        } catch (updateError) {
          console.error('Error updating card after image upload:', updateError);
          
          // Still show success for the image upload since it was saved in the database
          setSaveMessage('Image saved, but card update failed');
          
          // Try toast, but don't let it break the app
          try {
            toast.success('Image saved, but there was a problem updating the card');
          } catch (toastError) {
            console.error('Toast notification error:', toastError);
          }
        }
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        
        // Show error message in UI
        setSaveMessage(`Error: ${error.message || 'Failed to upload image'}`);
        
        // Try toast, but don't let it break the app
        try {
          toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
        } catch (toastError) {
          console.error('Toast notification error:', toastError);
        }
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
        // Use a simple message instead of toast to avoid potential errors
        setSaveMessage('No changes to save');
        // Show a simple feedback message in the UI rather than using toast here
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
      setSaveMessage('Card updated successfully');
      
      // Use try-catch specifically for toast to isolate potential errors
      try {
        toast.success('Card updated successfully');
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
        // Continue execution even if toast fails
      }
    } catch (error) {
      console.error('Error saving card:', error);
      
      // Set a message that will be shown in the UI
      setSaveMessage(`Error: ${error.message || 'Failed to update card'}`);
      
      // Try to show toast, but don't let it break the app
      try {
        toast.error('Failed to update card: ' + (error.message || 'Unknown error'));
      } catch (toastError) {
        console.error('Toast notification error:', toastError);
      }
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
        {/* Header - Made smaller */}
        <div className="card-details-header flex items-center h-14">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Card Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-auto p-2"
            aria-label="Close"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="card-details-content h-[calc(100vh-112px)] overflow-y-auto">
          {/* Image upload section */}
          <div className="mb-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800/30 mb-4 max-w-[180px] max-h-[250px] aspect-[2/3] relative mx-auto">
              <CardImage
                imageUrl={cardImage}
                loadingState={imageLoadingState}
                onRetry={loadCardImage}
                onClick={() => cardImage && setShowEnlargedImage(true)}
              />
            </div>
            
            {/* Upload Image Button with Drag & Drop */}
            <div 
              ref={dropZoneRef}
              className="flex justify-center relative"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 -m-4 border-2 border-dashed border-purple-500 rounded-lg bg-purple-100/30 dark:bg-purple-900/10 flex items-center justify-center z-0">
                  <p className="text-purple-700 dark:text-purple-300 font-medium">Drop image here</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center space-x-2 text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800/70 px-4 py-2 rounded-lg relative z-10"
              >
                <span className="material-icons text-sm">photo_camera</span>
                <span>Upload Image</span>
              </button>
            </div>
          </div>

          {/* Card Details Form */}
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Player
                  </label>
                  <input
                    type="text"
                    name="player"
                    value={editedCard.player || ''}
                    onChange={handleInputChange}
                    className={inputStyles}
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
                    className={inputStyles}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Set
                </label>
                <input
                  type="text"
                  name="set"
                  value={editedCard.set || ''}
                  onChange={handleInputChange}
                  className={inputStyles}
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
                  className={inputStyles}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={editedCard.category || ''}
                  onChange={handleInputChange}
                  className={inputStyles}
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
                  className={inputStyles}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  name="slabSerial"
                  value={editedCard.slabSerial}
                  onChange={handleInputChange}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Purchased
                </label>
                <input
                  type="date"
                  name="datePurchased"
                  value={editedCard.datePurchased || ''}
                  onChange={handleInputChange}
                  className={inputStyles}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Paid (AUD)</label>
                  <input
                    type="text"
                    name="investmentAUD"
                    value={editedCard.investmentAUD === '' ? '' : editedCard.investmentAUD === 0 ? '' : editedCard.investmentAUD}
                    onChange={handleNumberInputChange}
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                  <input
                    type="text"
                    name="currentValueAUD"
                    value={editedCard.currentValueAUD === '' ? '' : editedCard.currentValueAUD === 0 ? '' : editedCard.currentValueAUD}
                    onChange={handleNumberInputChange}
                    className={inputStyles}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer with Actions */}
        <div className="card-details-footer">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-tertiary min-w-[80px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary min-w-[120px]"
              >
                Save Changes
              </button>
            </div>
            
            {/* Status message */}
            {saveMessage && (
              <div className={`text-sm px-3 py-1 rounded-md transition-opacity max-w-full ${
                saveMessage.startsWith('Error') 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : saveMessage === 'No changes to save'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move the enlarged image modal outside the card details modal */}
      {showEnlargedImage && cardImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out" 
          onClick={(e) => {
            e.stopPropagation();
            setShowEnlargedImage(false);
          }}
          style={{ 
            backdropFilter: 'blur(8px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={cardImage} 
              alt="Card preview (enlarged)" 
              className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-lg" 
              style={{ margin: 'auto' }}
              onClick={e => e.stopPropagation()}
            />
            <button 
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowEnlargedImage(false);
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(CardDetails);