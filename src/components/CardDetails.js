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

  const handleInputChange = (field, value) => {
    setEditedCard(prev => ({
      ...prev,
      [field]: value
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

  // Drag and drop handlers
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please drop an image file');
        return;
      }
      
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
          await updateCard({
            ...card,
            hasImage: true,
            imageUpdatedAt: timestamp
          });
          
          // Show success message
          setSaveMessage('Image uploaded successfully');
          toast.success('Image uploaded successfully');
        } catch (updateError) {
          console.error('Error updating card after image upload:', updateError);
          setSaveMessage('Image saved, but card update failed');
          toast.success('Image saved, but there was a problem updating the card');
        }
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        setSaveMessage(`Error: ${error.message || 'Failed to upload image'}`);
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
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-[95]"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms'
        }}
        onClick={handleClose}
      />
    
      {/* Card Details Modal */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] 
                   bg-white dark:bg-[#000000] card-details-panel
                   shadow-2xl border-l border-gray-200 dark:border-gray-700/50
                   transform transition-transform duration-300 ease-in-out z-[100]
                   flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        ref={modalContentRef}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between 
                      border-b border-gray-200 dark:border-gray-700/50 
                      bg-white dark:bg-[#000000]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Card Details</h2>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1E293B] 
                    text-gray-500 dark:text-gray-400 focus:outline-none"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Content with overflow */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#000000] p-4">
          {/* Card image with zoom capability */}
          <div className="mb-6 flex justify-center">
            {cardImage ? (
              <div className="relative rounded-lg overflow-hidden max-w-full" style={{ maxHeight: '50vh' }}>
                <img 
                  src={cardImage}
                  alt={`${card.player} ${card.card}`}
                  className="object-contain w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full aspect-[3/4] bg-gray-100 dark:bg-[#0A0E17] rounded-lg flex items-center justify-center">
                <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">image</span>
              </div>
            )}
          </div>

          {/* Drag and drop image upload area */}
          <div className="mb-6">
            <div 
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer relative transition-colors
                        ${isDragging 
                          ? 'border-purple-400 dark:border-purple-500 bg-purple-50/80 dark:bg-purple-900/10' 
                          : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ height: '120px' }}
            >
              <div className="text-center">
                <span className="material-icons text-gray-400 dark:text-gray-600 text-3xl mb-1">add_photo_alternate</span>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Drag and drop an image here</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">or click to browse</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Card Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Player */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Player</label>
                <input
                  type="text"
                  value={editedCard.player || ''}
                  onChange={(e) => handleInputChange('player', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
              
              {/* Card Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Name</label>
                <input
                  type="text"
                  value={editedCard.card || ''}
                  onChange={(e) => handleInputChange('card', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
              
              {/* Set */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set</label>
                <input
                  type="text"
                  value={editedCard.set || ''}
                  onChange={(e) => handleInputChange('set', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
              
              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                <input
                  type="text"
                  value={editedCard.year || ''}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={editedCard.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
              
              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                <input
                  type="text"
                  value={editedCard.condition || ''}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                           rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                           bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Serial Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input
                type="text"
                value={editedCard.slabSerial || ''}
                onChange={(e) => handleInputChange('slabSerial', e.target.value)}
                readOnly={card.slabSerial ? true : false}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                         rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                         bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                         ${card.slabSerial ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
              {card.slabSerial && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Serial number cannot be changed after creation</p>
              )}
            </div>
          </div>

          {/* Financial Details */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Paid Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid (AUD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={editedCard.investmentAUD || ''}
                    onChange={(e) => handleInputChange('investmentAUD', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 
                             rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                             bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Current Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value (AUD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    value={editedCard.currentValueAUD || ''}
                    onChange={(e) => handleInputChange('currentValueAUD', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 
                             rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                             bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
              <input
                type="date"
                value={editedCard.datePurchased || ''}
                onChange={(e) => handleInputChange('datePurchased', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                         rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                         bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={editedCard.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                       rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary
                       bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white"
              placeholder="Add any additional notes about this card..."
            ></textarea>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="sticky bottom-0 px-4 py-3 flex items-center justify-between 
                      border-t border-gray-200 dark:border-gray-700/50
                      bg-white dark:bg-[#000000] shadow-lg">
          <div className="flex">
            <button 
              onClick={handleDelete} 
              className="btn btn-danger sm:flex items-center sm:space-x-1"
              aria-label="Delete card"
            >
              <span className="material-icons">delete</span>
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={handleClose} 
              className="btn btn-tertiary"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="btn btn-primary flex items-center space-x-1"
            >
              <span className="material-icons">save</span>
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(CardDetails);