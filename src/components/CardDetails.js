import React, { useState, useEffect, useRef, memo } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import { db } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

// Image loading states component
const CardImage = memo(({ imageUrl, loadingState, onRetry }) => {
  const { isDarkMode } = useTheme();
  
  if (loadingState === 'loading') {
    return (
      <div className="card-image-display animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <span className="material-icons text-4xl text-gray-400">hourglass_empty</span>
      </div>
    );
  }
  
  if (loadingState === 'error') {
    return (
      <div className="card-image-display bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4">
        <span className="material-icons text-4xl text-red-500 mb-2">error_outline</span>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">Failed to load image</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!imageUrl) {
    return (
      <div className="card-image-display bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="material-icons text-4xl text-gray-400">image</span>
      </div>
    );
  }
  
  return (
    <div className="card-image-display rounded-lg overflow-hidden">
      <img
        src={imageUrl}
        alt="Card"
        className="w-full h-full object-contain"
      />
    </div>
  );
});

const CardDetails = ({ card, onClose, onUpdate, onUpdateCard, onDelete, exchangeRate }) => {
  const [editedCard, setEditedCard] = useState({
    ...card,
    investmentUSD: typeof card.investmentUSD === 'number' ? card.investmentUSD : 0,
    currentValueUSD: typeof card.currentValueUSD === 'number' ? card.currentValueUSD : 0,
    investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 0,
    currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const fileInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const { isDarkMode } = useTheme();

  // Use onUpdateCard if available, otherwise fall back to onUpdate for backward compatibility
  const updateCard = onUpdateCard || onUpdate;

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      // Re-enable scrolling when modal is closed
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
    // Only show warning if there are actual changes
    const hasChanges = Object.keys(editedCard).some(key => {
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

    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
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
    const numValue = value === '' ? 0 : parseFloat(value);
    setEditedCard(prev => {
      if (name === 'investmentAUD') {
        return {
          ...prev,
          investmentAUD: numValue,
          potentialProfit: prev.currentValueAUD - numValue
        };
      } else if (name === 'currentValueAUD') {
        return {
          ...prev,
          currentValueAUD: numValue,
          potentialProfit: numValue - prev.investmentAUD
        };
      }
      return { ...prev, [name]: numValue };
    });
    setHasUnsavedChanges(true);
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
        
        // Notify parent component that image has been updated
        // This will trigger a refresh of the card images in the main view
        updateCard({
          ...card,
          hasImage: true,
          imageUpdatedAt: timestamp
        });
        
        // Show success message
        setSaveMessage({
          text: 'Image uploaded successfully',
          type: 'success'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        
        // Show error message
        setSaveMessage({
          text: 'Failed to upload image',
          type: 'error'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
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
      // Save to the database
      await db.saveCard(editedCard);
      
      // Update the parent component
      updateCard(editedCard);
      
      // Exit edit mode
      setIsEditing(false);
      setHasUnsavedChanges(false);
      
      // Show success message
      setSaveMessage({
        text: 'Card updated successfully',
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving card:', error);
      
      // Show error message
      setSaveMessage({
        text: 'Failed to update card',
        type: 'error'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      onDelete(card.slabSerial);
    }
  };

  const handleEditMenuToggle = () => {
    setIsEditMenuOpen(!isEditMenuOpen);
  };

  const handleFieldEdit = (field) => {
    if (field === 'details') {
      setIsEditing(true);
    } else {
      setEditingField(field);
    }
    setIsEditMenuOpen(false);
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    // Reset the edited card to the original card data
    setEditedCard({
      ...card,
      investmentUSD: typeof card.investmentUSD === 'number' ? card.investmentUSD : 0,
      currentValueUSD: typeof card.currentValueUSD === 'number' ? card.currentValueUSD : 0,
      investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 0,
      currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 0
    });
    setIsEditing(false);
    setEditingField(null);
    setHasUnsavedChanges(false);
  };

  const profit = editedCard.currentValueAUD - editedCard.investmentAUD;
  const profitPercentage = editedCard.investmentAUD ? (profit / editedCard.investmentAUD * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50">
      {/* Toast Message */}
      {saveMessage && (
        <div className={`toast ${
          saveMessage.type === 'success' ? 'toast-success' : 
          saveMessage.type === 'error' ? 'toast-error' :
          'bg-gray-700 text-white'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 right-0 max-w-full flex sm:pl-10">
          <div className={`w-screen transform transition-all ease-in-out duration-500 ${
            isDarkMode ? 'bg-[#0B0F19]' : 'bg-white'
          } sm:max-w-md`}>
            <div className="h-full flex flex-col bg-white dark:bg-[#0B0F19] shadow-xl">
              {/* Header - Made sticky */}
              <div className="sticky top-0 z-10 px-4 sm:px-6 flex justify-between items-start py-4 bg-white dark:bg-[#0B0F19] border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Card Details
                </h2>
                <button
                  onClick={handleClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              {/* Content - Added padding and made scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 sm:px-6 py-6">
                  {/* Card Image and Details Grid */}
                  <div className="grid grid-cols-1 gap-8">
                    {/* Card Image Section */}
                    <div className="flex flex-row items-center justify-between gap-4">
                      <CardImage
                        imageUrl={cardImage}
                        loadingState={imageLoadingState}
                        onRetry={loadCardImage}
                      />

                      <div 
                        className="image-upload-container"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="material-icons text-2xl text-gray-400 mb-1">add_photo_alternate</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Upload image</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Details Section */}
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Card Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player</label>
                            <input
                              type="text"
                              name="player"
                              value={editedCard.player || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Name</label>
                            <input
                              type="text"
                              name="card"
                              value={editedCard.card || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Set</label>
                            <input
                              type="text"
                              name="set"
                              value={editedCard.set || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
                            <input
                              type="text"
                              name="year"
                              value={editedCard.year || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
                            <input
                              type="text"
                              name="category"
                              value={editedCard.category || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                            <input
                              type="text"
                              name="condition"
                              value={editedCard.condition || ''}
                              onChange={handleInputChange}
                              className="input"
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Serial Number</label>
                            <input
                              type="text"
                              name="slabSerial"
                              value={editedCard.slabSerial}
                              onChange={handleInputChange}
                              className="input"
                              disabled
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Financial Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (AUD)</label>
                            <input
                              type="number"
                              name="investmentAUD"
                              value={editedCard.investmentAUD}
                              onChange={handleNumberInputChange}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                            <input
                              type="number"
                              name="currentValueAUD"
                              value={editedCard.currentValueAUD}
                              onChange={handleNumberInputChange}
                              className="input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-4 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCancel}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        className="btn btn-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  ) : null}
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={handleDelete}
                      className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={handleEditMenuToggle}
                        className="text-gray-500 dark:text-gray-400 p-2 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <span className="material-icons">more_vert</span>
                      </button>
                      
                      {isEditMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-md shadow-lg bg-white dark:bg-[#1B2131] ring-1 ring-black ring-opacity-5">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              onClick={() => handleFieldEdit('details')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              Edit Card Details
                            </button>
                            <button
                              onClick={() => handleFieldEdit('investment')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              Edit Investment
                            </button>
                            <button
                              onClick={() => handleFieldEdit('value')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              Edit Current Value
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CardDetails);