import React, { useState, useEffect, useRef, memo } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import { db } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { showToast } from '../utils/toast';

// Image loading states component
const CardImage = memo(({ imageUrl, loadingState, onRetry }) => {
  const { isDarkMode } = useTheme();
  
  if (loadingState === 'loading') {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="material-icons text-4xl text-gray-400 animate-pulse">hourglass_empty</span>
      </div>
    );
  }
  
  if (loadingState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
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
      <div className="flex flex-col items-center justify-center w-full h-full">
        <span className="material-icons text-4xl text-blue-500/60 mb-2">image</span>
        <p className="text-sm text-blue-500/80 dark:text-blue-400/80 text-center font-medium">Drag & drop an image here</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={imageUrl}
        alt="Card"
        className="w-auto max-w-full h-auto max-h-full object-contain"
      />
    </div>
  );
});

const CardDetails = ({ card, onClose, onUpdate, onUpdateCard, onDelete, exchangeRate, onViewChange }) => {
  const [editedCard, setEditedCard] = useState({
    ...card,
    investmentUSD: typeof card.investmentUSD === 'number' ? Number(card.investmentUSD.toFixed(2)) : 0,
    currentValueUSD: typeof card.currentValueUSD === 'number' ? Number(card.currentValueUSD.toFixed(2)) : 0,
    investmentAUD: typeof card.investmentAUD === 'number' ? Number(card.investmentAUD.toFixed(2)) : 0,
    currentValueAUD: typeof card.currentValueAUD === 'number' ? Number(card.currentValueAUD.toFixed(2)) : 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [soldDetails, setSoldDetails] = useState({
    price: '',
    buyer: '',
    date: new Date().toISOString().split('T')[0]
  });
  const fileInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const soldModalRef = useRef(null);  // Add ref for sold modal
  const { isDarkMode } = useTheme();

  // Add ref for the modal content
  const modalContentRef = useRef(null);

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
    if (hasUnsavedChanges && isEditing) {
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
    const numValue = value === '' ? 0 : Number(parseFloat(value).toFixed(2));
    setEditedCard(prev => {
      if (name === 'investmentAUD') {
        return {
          ...prev,
          investmentAUD: numValue,
          potentialProfit: Number((prev.currentValueAUD - numValue).toFixed(2))
        };
      } else if (name === 'currentValueAUD') {
        return {
          ...prev,
          currentValueAUD: numValue,
          potentialProfit: Number((numValue - prev.investmentAUD).toFixed(2))
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
        
        try {
          // Notify parent component that image has been updated
          // This will trigger a refresh of the card images in the main view
          await updateCard({
            ...card,
            hasImage: true,
            imageUpdatedAt: timestamp
          });
          
          // Show success message
          setSaveMessage({
            text: 'Image uploaded successfully',
            type: 'success'
          });
        } catch (updateError) {
          console.error('Error updating card after image upload:', updateError);
          // Still show success for the image upload since it was saved in the database
          setSaveMessage({
            text: 'Image saved, but there was a problem updating the card',
            type: 'warning'
          });
        }
        
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (error) {
        console.error('Error saving image:', error);
        setImageLoadingState('error');
        
        // Show error message
        setSaveMessage({
          text: `Failed to upload image: ${error.message || 'Unknown error'}`,
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
    if (!hasCardBeenEdited()) {
      setSaveMessage({
        text: 'No changes were made',
        type: 'info'
      });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      // Save to the database
      await db.saveCard(editedCard);
      
      // Update the parent component
      updateCard(editedCard);
      
      // Show success message
      setSaveMessage({
        text: 'Card updated successfully',
        type: 'success'
      });
      
      // Reset hasUnsavedChanges flag
      setHasUnsavedChanges(false);
      
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
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Try to delete the card image
      try {
        await db.deleteImage(card.slabSerial);
      } catch (error) {
        console.error('Error deleting card image:', error);
        // Continue with card deletion even if image deletion fails
      }
      
      // Call the onDelete callback directly - this handles the actual collection update
      await onDelete(card.slabSerial);
      
      // Close the modal
      onClose();
      
      // Show success toast - positioned lower and to the right with high z-index
      showToast('Card deleted successfully');
    } catch (error) {
      console.error('Error deleting card:', error);
      
      // Show error toast - also positioned lower with high z-index
      showToast('Failed to delete card: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setShowDeleteModal(false);
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
      investmentUSD: typeof card.investmentUSD === 'number' ? Number(card.investmentUSD.toFixed(2)) : 0,
      currentValueUSD: typeof card.currentValueUSD === 'number' ? Number(card.currentValueUSD.toFixed(2)) : 0,
      investmentAUD: typeof card.investmentAUD === 'number' ? Number(card.investmentAUD.toFixed(2)) : 0,
      currentValueAUD: typeof card.currentValueAUD === 'number' ? Number(card.currentValueAUD.toFixed(2)) : 0
    });
    setIsEditing(false);
    setEditingField(null);
    setHasUnsavedChanges(false);
  };

  const profit = editedCard.currentValueAUD - editedCard.investmentAUD;
  const profitPercentage = editedCard.investmentAUD ? (profit / editedCard.investmentAUD * 100) : 0;

  const handleSoldDetailsChange = (e) => {
    const { name, value } = e.target;
    setSoldDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMarkAsSold = async () => {
    // Instead of handling the sale directly, we'll trigger the shared modal
    // Make sure we pass the full card object to match what the main page selection does
    onViewChange('markAsSold', [editedCard]);
    onClose(); // Close the card details modal
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-primary', 'bg-primary/5');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        setImageLoadingState('loading');
        await db.saveImage(card.slabSerial, file);
        const imageUrl = URL.createObjectURL(file);
        setCardImage(imageUrl);
        setImageLoadingState('loaded');
        
        const timestamp = new Date().toISOString();
        await updateCard({
          ...card,
          hasImage: true,
          imageUpdatedAt: timestamp
        });
        
        setSaveMessage({
          text: 'Image uploaded successfully',
          type: 'success'
        });
      } catch (error) {
        console.error('Error saving dropped image:', error);
        setImageLoadingState('error');
        setSaveMessage({
          text: `Failed to upload image: ${error.message || 'Unknown error'}`,
          type: 'error'
        });
      }
    } else {
      setSaveMessage({
        text: 'Please drop a valid image file',
        type: 'error'
      });
    }
  };

  console.log("CardDetails rendering with card:", card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 md:p-4">
      {/* Toast Message */}
      {saveMessage && (
        <div className={`fixed right-4 bottom-20 z-[9999] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          saveMessage.type === 'success' ? 'bg-green-600 dark:bg-green-500 text-white' : 
          saveMessage.type === 'error' ? 'bg-red-600 dark:bg-red-500 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <div 
        ref={modalContentRef}
        className={`w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-xl shadow-lg bg-white dark:bg-[#1B2131] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700/50`}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-200">Card Details</h2>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Image */}
            <div>
              <div>
                <div 
                  className="aspect-[2/3] relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {cardImage ? (
                    <img
                      src={cardImage}
                      alt={`${card.player} ${card.card}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="material-icons text-6xl text-gray-400 mb-2">image</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop an image here</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">or click to upload</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 btn btn-secondary text-gray-700 dark:text-gray-200"
                >
                  <span className="material-icons mr-2">upload</span>
                  Upload Image
                </button>
                {cardImage && (
                  <button
                    onClick={handleDelete}
                    className="btn btn-secondary text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Card Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">Card Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player Name</label>
                    <input
                      type="text"
                      value={editedCard.player || ''}
                      onChange={(e) => handleInputChange('player', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Type</label>
                    <input
                      type="text"
                      value={editedCard.card || ''}
                      onChange={(e) => handleInputChange('card', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Set</label>
                    <input
                      type="text"
                      value={editedCard.set || ''}
                      onChange={(e) => handleInputChange('set', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
                    <input
                      type="text"
                      value={editedCard.year || ''}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                    <input
                      type="text"
                      value={editedCard.condition || ''}
                      onChange={(e) => handleInputChange('condition', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Slab Serial</label>
                    <input
                      type="text"
                      value={editedCard.slabSerial || ''}
                      onChange={(e) => handleInputChange('slabSerial', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Investment Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">Investment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (AUD)</label>
                    <input
                      type="number"
                      value={editedCard.investmentAUD || ''}
                      onChange={(e) => handleInputChange('investmentAUD', e.target.value)}
                      className="input w-full"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                    <input
                      type="number"
                      value={editedCard.currentValueAUD || ''}
                      onChange={(e) => handleInputChange('currentValueAUD', e.target.value)}
                      className="input w-full"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Potential Profit</div>
                  <div className={`text-lg font-medium ${
                    editedCard.potentialProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    {formatCurrency(editedCard.potentialProfit)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-inherit z-10">
          <div className="flex justify-between items-center">
            <button
              onClick={handleDelete}
              className="btn btn-secondary text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              <span className="material-icons mr-2">delete</span>
              Delete Card
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="btn btn-secondary text-gray-700 dark:text-gray-200"
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
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl shadow-lg bg-[#1B2131]">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Delete Card</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this card? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-400 hover:text-gray-200"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CardDetails);