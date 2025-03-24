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
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await onDelete(card.slabSerial);
      onClose();
      
      // Create and show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
      toast.textContent = 'Card deleted successfully';
      document.body.appendChild(toast);

      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } catch (error) {
      console.error('Error deleting card:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
      toast.textContent = 'Failed to delete card';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
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
    try {
      // Convert sold price to number
      const soldPriceAUD = parseFloat(soldDetails.price) || 0;

      // Create sold card record without an ID (it will be auto-generated)
      const soldCard = {
        slabSerial: editedCard.slabSerial,
        serialNumber: editedCard.slabSerial,
        player: editedCard.player,
        card: editedCard.card,
        set: editedCard.set,
        year: editedCard.year,
        category: editedCard.category,
        condition: editedCard.condition,
        investmentAUD: editedCard.investmentAUD,
        soldPriceAUD,
        buyer: soldDetails.buyer,
        dateSold: new Date(soldDetails.date).toISOString(),
        profit: soldPriceAUD - editedCard.investmentAUD
      };

      // Add to sold cards database
      await db.addSoldCard(soldCard);

      // Delete from current collection and cards state
      const deleteResult = await onDelete(editedCard.slabSerial);
      
      if (!deleteResult) {
        throw new Error('Failed to delete card from collection');
      }

      // Close sold modal and card details
      setShowSoldModal(false);
      onClose();

      // Navigate to sold page
      onViewChange('sold');

      // Create and show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
      toast.textContent = 'Card marked as sold successfully!';
      document.body.appendChild(toast);

      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);

    } catch (error) {
      console.error('Error marking card as sold:', error);
      setSaveMessage({
        text: 'Failed to mark card as sold',
        type: 'error'
      });
    }
  };

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

      {/* Sold Modal */}
      {showSoldModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSoldModal(false);
          }
        }}>
          <div 
            ref={soldModalRef}
            className={`w-full max-w-md mx-4 p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-[#1B2131]' : 'bg-white'}`}
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Mark Card as Sold</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Sold Price (AUD)</label>
                <input
                  type="number"
                  name="price"
                  value={soldDetails.price}
                  onChange={handleSoldDetailsChange}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Buyer</label>
                <input
                  type="text"
                  name="buyer"
                  value={soldDetails.buyer}
                  onChange={handleSoldDetailsChange}
                  className="input"
                  placeholder="Enter buyer name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date Sold</label>
                <input
                  type="date"
                  name="date"
                  value={soldDetails.date}
                  onChange={handleSoldDetailsChange}
                  className="input"
                />
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Profit: {formatCurrency(parseFloat(soldDetails.price || 0) - editedCard.investmentAUD)}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => setShowSoldModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                onClick={handleMarkAsSold}
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 right-0 max-w-full flex sm:pl-10">
          <div 
            ref={modalContentRef}
            className={`w-screen transform transition-all ease-in-out duration-500 ${
              isDarkMode ? 'bg-[#0B0F19]' : 'bg-white'
            } sm:max-w-md`}
          >
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
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.add('dragover-active');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove('dragover-active');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove('dragover-active');
                          
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            const file = files[0];
                            if (file.type.startsWith('image/')) {
                              // Manually update the file input value and trigger the change handler
                              if (fileInputRef.current) {
                                // Create a DataTransfer to programmatically set the file
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                fileInputRef.current.files = dataTransfer.files;
                                
                                // Trigger the change handler manually
                                handleImageChange({ target: { files: dataTransfer.files } });
                              }
                            } else {
                              // Show error for non-image files
                              setSaveMessage({
                                text: 'Only image files are allowed',
                                type: 'error'
                              });
                              setTimeout(() => setSaveMessage(null), 3000);
                            }
                          }
                        }}
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
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or drag and drop</p>
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
                              value={editedCard.investmentAUD.toFixed(2)}
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
                              value={editedCard.currentValueAUD.toFixed(2)}
                              onChange={handleNumberInputChange}
                              className="input"
                              step="0.01"
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
                      className="btn btn-secondary"
                      onClick={() => setShowSoldModal(true)}
                    >
                      <span className="material-icons">sell</span>
                      <span>Mark as Sold</span>
                    </button>
                    
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