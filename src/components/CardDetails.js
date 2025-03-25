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
    const dropZone = e.currentTarget;
    dropZone.classList.add('border-primary', 'dark:border-primary', 'bg-primary/5');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropZone = e.currentTarget;
    dropZone.classList.remove('border-primary', 'dark:border-primary', 'bg-primary/5');
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropZone = e.currentTarget;
    dropZone.classList.remove('border-primary', 'dark:border-primary', 'bg-primary/5');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handleImageChange({ target: { files: [file] } });
    }
  };

  console.log("CardDetails rendering with card:", card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 md:p-4">
      {/* Toast Message */}
      {saveMessage && (
        <div className={`fixed right-4 bottom-20 z-[9999] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          saveMessage.type === 'success' ? 'bg-green-500 text-white' : 
          saveMessage.type === 'error' ? 'bg-red-500 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <div 
        ref={modalContentRef}
        className={`w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-xl shadow-lg ${isDarkMode ? 'bg-[#1B2131]' : 'bg-white'} flex flex-col overflow-hidden`}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">Card Details</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Section */}
            <div className="space-y-3">
              <div 
                className="image-upload-container border-2 border-dashed border-blue-500/50 dark:border-blue-500/30 rounded-lg flex items-center justify-center h-[300px] w-full overflow-hidden cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <CardImage
                  imageUrl={cardImage}
                  loadingState={imageLoadingState}
                  onRetry={loadCardImage}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Image Actions */}
              <div className="flex items-center justify-between py-2">
                <div></div> {/* Empty div for spacing */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center bg-[#1e2436] hover:bg-[#2a3045] text-white px-3 py-2 rounded-md transition-colors"
                  >
                    <span className="material-icons text-sm mr-1">file_upload</span>
                    Upload Image
                  </button>
                  <button
                    onClick={handleMarkAsSold}
                    className="flex items-center justify-center bg-[#1e2436] hover:bg-[#2a3045] text-white px-3 py-2 rounded-md transition-colors"
                  >
                    <span className="material-icons text-sm mr-1">sell</span>
                    Mark as Sold
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Card Details */}
            <div className="space-y-6">
              {/* Card Info Section */}
              <div className="card-info">
                <h2 className="text-xl font-semibold mb-6">Card Information</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Player Name</label>
                      <input
                        type="text"
                        name="player"
                        value={editedCard.player || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Player Name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Card Type</label>
                      <input
                        type="text"
                        name="card"
                        value={editedCard.card || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Card Type"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Set</label>
                      <input
                        type="text"
                        name="set"
                        value={editedCard.set || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Set"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Year</label>
                      <input
                        type="text"
                        name="year"
                        value={editedCard.year || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Year"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Condition</label>
                      <input
                        type="text"
                        name="condition"
                        value={editedCard.condition || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Condition"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Slab Serial</label>
                      <input
                        type="text"
                        name="slabSerial"
                        value={editedCard.slabSerial || ''}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Slab Serial"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Date Purchased</label>
                      <input
                        type="date"
                        name="datePurchased"
                        value={editedCard.datePurchased ? new Date(editedCard.datePurchased).toISOString().split('T')[0] : ''}
                        onChange={handleInputChange}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Investment Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (AUD)</label>
                    <input
                      type="number"
                      name="investmentAUD"
                      value={editedCard.investmentAUD || ''}
                      onChange={handleNumberInputChange}
                      className="input"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                    <input
                      type="number"
                      name="currentValueAUD"
                      value={editedCard.currentValueAUD || ''}
                      onChange={handleNumberInputChange}
                      className="input"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Potential Profit</label>
                    <div className={`text-lg font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(profit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-inherit">
          <div className="flex justify-between items-center">
            <button 
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2"
            >
              <span className="material-icons">delete</span>
            </button>

            <div className="flex gap-2">
              <button 
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className={`btn btn-primary ${!hasCardBeenEdited() ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!hasCardBeenEdited()}
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