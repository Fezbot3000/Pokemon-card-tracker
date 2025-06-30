import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import CardDetailsForm from '../design-system/components/CardDetailsForm';
import { toast } from 'react-hot-toast';
import PSADetailModal from './PSADetailModal';
import NewCollectionModal from './NewCollectionModal';
import { searchByCertNumber, parsePSACardData } from '../services/psaSearch';
// import Spinner from './Spinner'; // Import Spinner for loading state

/**
 * AddCardModal Component
 * 
 * A specialized modal for adding new Pokemon cards with PSA certificate lookup.
 */
const AddCardModal = ({
  isOpen,
  onClose,
  onSave,
  collections = [],
  className = '',
  onNewCollectionCreated,
  defaultCollection = ''
}) => {
  // Initial card data
  const emptyCard = {
    id: null,
    player: '',
    cardName: '', 
    set: '',
    year: '',
    category: '', 
    condition: '',
    certificationNumber: '', 
    datePurchased: new Date().toISOString().split('T')[0],
    investmentAUD: '',
    currentValueAUD: '',
    quantity: 1, 
  };
  
  // State for card data
  const [newCard, setNewCard] = useState({...emptyCard});
  
  // State for collection selection
  const [selectedCollection, setSelectedCollection] = useState(() => {
    // Use defaultCollection if provided and it exists in collections
    if (defaultCollection && collections.includes(defaultCollection) && defaultCollection.toLowerCase() !== 'sold') {
      return defaultCollection;
    }
    // Otherwise filter out "Sold" collection from the initial selection
    const availableCollections = collections.filter(c => c.toLowerCase() !== 'sold');
    return availableCollections[0] || '';
  });
  
  // State for image handling
  const [cardImage, setCardImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('idle');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  
  // State for PSA lookup
  const [psaSerial, setPsaSerial] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [psaDetailModalOpen, setPsaDetailModalOpen] = useState(false);
  const [psaData, setPsaData] = useState(null);
  
  // State for form validation and UI feedback
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);
  const [animClass, setAnimClass] = useState('');
  const [isSaving, setIsSaving] = useState(false); 
  
  // State for new collection modal
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);

  // Refs
  const messageTimeoutRef = useRef(null);

  // Set animation class when open state changes
  useEffect(() => {
    if (isOpen) {
      setAnimClass('slide-in-right');
      // Reset form when opening
      setNewCard({...emptyCard});
      setCardImage(null);
      setImageFile(null);
      setErrors({});
      setSaveMessage(null);
      setPsaSerial('');
    } else {
      setAnimClass('slide-out-right');
    }
  }, [isOpen]);

  // Handle card image change
  const handleImageChange = async (file) => {
    if (!file) return;
    
    setImageLoadingState('loading');
    
    try {
      // Create a preview URL
      const imageUrl = URL.createObjectURL(file);
      
      // Cleanup previous URL if it exists
      if (cardImage && cardImage.startsWith('blob:')) {
        URL.revokeObjectURL(cardImage);
      }
      
      setCardImage(imageUrl);
      setImageFile(file);
      setErrors(prev => ({ ...prev, image: undefined }));
      setImageLoadingState('idle');
      
      return file; 
    } catch (error) {
      console.error('Error changing card image:', error);
      setImageLoadingState('error');
      setErrors(prev => ({ ...prev, image: 'Failed to load image' }));
      return null;
    }
  };
  
  // Handle form changes
  const handleCardChange = (updatedCard) => {
    setNewCard(updatedCard);
    
    // Clear field error when user edits the field
    if (errors[Object.keys(updatedCard).find(key => updatedCard[key] !== newCard[key])]) {
      setErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        delete updatedErrors[Object.keys(updatedCard).find(key => updatedCard[key] !== newCard[key])];
        return updatedErrors;
      });
    }
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    // Only validate required fields
    if (!newCard.cardName?.trim()) {
      newErrors.cardName = 'Card name is required';
    }
    
    // Investment amount is required
    const investmentAmount = parseFloat(newCard.originalInvestmentAmount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      newErrors.originalInvestmentAmount = 'Investment amount is required';
    }
    
    // Date purchased is required
    if (!newCard.datePurchased) {
      newErrors.datePurchased = 'Date purchased is required';
    }
    
    // Quantity is required and must be at least 1
    const quantity = parseInt(newCard.quantity);
    if (isNaN(quantity) || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    
    // Collection validation
    if (!selectedCollection) {
      newErrors.collection = 'Please select a collection';
    } else if (selectedCollection.toLowerCase() === 'sold') {
      newErrors.collection = 'Cards cannot be added directly to the Sold collection';
    }
    
    setErrors(newErrors);
    return newErrors;
  };
  
  // Handle save action
  const handleSave = async () => {
    // Clear any previous error messages
    setSaveMessage(null);
    setErrors({});
    setIsSaving(true); 

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveMessage('Please fix the errors before saving');
      setIsSaving(false); 
      return;
    }

    // Check if we have an image file
    if (!imageFile && !cardImage) {
      setSaveMessage('Please add an image for the card');
      setErrors({ image: 'Card image is required' });
      setIsSaving(false); 
      return;
    }

    try {
      // Prepare card data
      const cardToSave = {
        ...newCard,
        collection: selectedCollection
      };

      // Try to save the card
      await onSave(cardToSave, imageFile, selectedCollection);
      
      // Clear form on success
      setNewCard({...emptyCard});
      setCardImage(null);
      setImageFile(null);
      setErrors({});
      setSaveMessage('Card saved successfully');
      
      // Close modal immediately after successful save
      onClose();

    } catch (error) {
      console.error('Error adding card:', error);
      
      // Handle specific error cases
      if (error.message.includes('serial number already exists')) {
        setErrors({
          certificationNumber: 'This serial number already exists in your active collections'
        });
        setSaveMessage('Card already exists');
        
        // Scroll the serial number field into view
        const serialField = document.querySelector('[name="certificationNumber"]');
        if (serialField) {
          serialField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Generic error handling
        setSaveMessage(`Error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle PSA certificate lookup
  const handlePsaLookup = async () => {
    if (!psaSerial) {
      toast.error('Please enter a PSA serial number');
      return;
    }
    
    setIsSearching(true);
    setSaveMessage('Searching PSA database...');
    
    try {
      const psaData = await searchByCertNumber(psaSerial);
      
      // Check for error response
      if (psaData.error) {
        console.error('PSA search error:', psaData.error);
        toast.error(psaData.message || 'Failed to find PSA data');
        setSaveMessage('Failed to find PSA data. Please check the number and try again.');
        return;
      }
      
      if (!psaData) {
        toast.error('No PSA data found for this serial number');
        setSaveMessage('Failed to find PSA data');
        return;
      }
      
      // Parse and apply PSA data directly
      const parsedData = parsePSACardData(psaData);
      if (!parsedData) {
        toast.error('Could not parse PSA data');
        setSaveMessage('Failed to parse PSA data');
        return;
      }

      // Update card data with PSA information
      const updatedCard = {
        ...newCard,
        ...parsedData,
        slabSerial: psaSerial,
        condition: `PSA ${parsedData.grade}`,
        gradeCompany: 'PSA',
        psaUrl: `https://www.psacard.com/cert/${psaSerial}`,
        player: parsedData.player || '',
        cardName: parsedData.cardName || '',
        population: parsedData.population || '',
        category: parsedData.category || newCard.category,
        set: parsedData.set || newCard.set,
        year: parsedData.year || newCard.year
      };

      setNewCard(updatedCard);
      toast.success('PSA data successfully loaded');
      setSaveMessage('PSA data applied successfully');
      
    } catch (error) {
      console.error('Error searching PSA:', error);
      toast.error('Error searching PSA database');
      setSaveMessage('Failed to search PSA database. Please check the number and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle applying PSA details to the card
  const handleApplyPsaDetails = (updatedCardData) => {
    setNewCard(prev => {
      // updatedCardData contains all fields from parsePSACardData, including certificationNumber
      const mergedData = {
        ...prev, 
        ...updatedCardData, 
        // Ensure psaUrl uses the certification number from PSA data, fallback to the user-entered psaSerial if needed.
        psaUrl: updatedCardData.psaUrl || `https://www.psacard.com/cert/${updatedCardData.certificationNumber || psaSerial || ''}`,
      };
      // console.log('Applied PSA details. Merged data:', mergedData);
      return mergedData;
    });
    toast.success('PSA card details applied');
    setPsaDetailModalOpen(false);
  };

  // Create modal footer with buttons
  const modalFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      {/* Cancel button - left aligned */}
      <div>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
      
      {/* Save button - right aligned */}
      <div className="flex items-center justify-end space-x-3">
        {/* Save button */}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving} 
        >
          {isSaving ? (
            'Saving...'
          ) : (
            'Add Card'
          )}
        </Button>
      </div>
    </div>
  );
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add New Card"
        footer={modalFooter}
        position="right"
        className={`${animClass} ${className}`}
        closeOnClickOutside={!showEnlargedImage}
      >
        <div className="space-y-6 pb-4">
          {/* PSA Certificate Lookup Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">PSA Certificate Lookup</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Search your PSA serial number to pre-populate the page.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={psaSerial}
                onChange={(e) => setPsaSerial(e.target.value)}
                placeholder="Enter PSA serial number"
                className="flex-1 px-3 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSearching}
              />
              <Button
                variant="primary"
                onClick={handlePsaLookup}
                disabled={isSearching || !psaSerial.trim()}
                className="whitespace-nowrap"
              >
                <span className="material-icons mr-1" style={{ fontSize: '16px' }}>search</span>
                Search PSA
              </Button>
            </div>
            
            {/* PSA Messages */}
            {saveMessage && saveMessage === 'PSA data applied successfully' && (
              <div className="mt-4 px-4 py-2 rounded-lg text-sm transition-all bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                PSA data applied successfully
              </div>
            )}
            {saveMessage && saveMessage.startsWith('Searching PSA') && (
              <div className="mt-4 px-4 py-2 rounded-lg text-sm transition-all bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {saveMessage}
              </div>
            )}
            {saveMessage && (saveMessage.startsWith('Failed to find PSA') || saveMessage.startsWith('Failed to search PSA')) && (
              <div className="mt-4 px-4 py-2 rounded-lg text-sm transition-all bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {saveMessage}
              </div>
            )}
          </div>

          {/* Collection Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Select Collection</h3>
            <div className="flex gap-2 items-center">
              <select
                value={selectedCollection}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setShowNewCollectionModal(true);
                  } else {
                    setSelectedCollection(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a]
                         bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select Collection...</option>
                {collections
                  .filter(collection => collection.toLowerCase() !== 'sold')
                  .map(collection => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))
                }
                <option value="new">+ Create New Collection</option>
              </select>
              <Button
                variant="primary"
                type="button"
                onClick={() => setShowNewCollectionModal(true)}
                className="flex-shrink-0"
                aria-label="Add new collection"
              >
                <span className="material-icons">add</span>
              </Button>
            </div>
            {errors.collection && (
              <p className="mt-1 text-sm text-red-600">{errors.collection}</p>
            )}
          </div>

          {/* PSA Website Link - Show if PSA URL exists */}
          {newCard.psaUrl && (
            <div className="mb-4">
              <a
                href={newCard.psaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:opacity-90 shadow-sm"
              >
                <span className="material-icons mr-2">open_in_new</span>
                View on PSA Website
              </a>
            </div>
          )}
          
          {/* Card Details Form */}
          <CardDetailsForm
            card={newCard}
            cardImage={cardImage}
            imageLoadingState={imageLoadingState}
            onChange={handleCardChange}
            onImageChange={handleImageChange}
            onImageRetry={() => handleImageChange(imageFile)}
            onImageClick={() => setShowEnlargedImage(true)}
            errors={errors}
            hideCollectionField={true}
            hidePsaSearchButton={true}
            requiredFields={{
              cardName: true,
              originalInvestmentAmount: true,
              datePurchased: true,
              quantity: true
            }}
          />
          
          {/* Status message */}
          {saveMessage && 
           saveMessage !== 'PSA data applied successfully' && 
           !saveMessage.startsWith('Searching PSA') && 
           !saveMessage.startsWith('Failed to find PSA') && 
           !saveMessage.startsWith('Failed to search PSA') && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm transition-all ${
              saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix') || saveMessage.startsWith('Failed')
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : saveMessage === 'No changes to save' || saveMessage.startsWith('Searching')
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
      </Modal>
      
      {/* Enlarged Image Modal */}
      {showEnlargedImage && cardImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center cursor-zoom-out" 
          onClick={(e) => {
            e.stopPropagation();
            setShowEnlargedImage(false);
          }}
          onMouseDown={(e) => e.stopPropagation()} 
          style={{ 
            backdropFilter: 'blur(8px)',
            height: '100vh',
            minHeight: '100vh',
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <div 
            className="relative max-w-[90vw] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: 'calc(90vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
            }}
          >
            <img 
              src={cardImage} 
              alt="Card preview (enlarged)" 
              className="w-auto h-auto object-contain rounded-lg" 
              style={{
                maxHeight: 'calc(90vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                maxWidth: '90vw'
              }}
            />
            <button 
              className="absolute top-4 right-4 p-2 bg-black/70 rounded-full text-white"
              onClick={() => setShowEnlargedImage(false)}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      )}
      
      {/* PSA Detail Modal */}
      <PSADetailModal
        isOpen={psaDetailModalOpen}
        onClose={() => setPsaDetailModalOpen(false)}
        certNumber={psaSerial}
        currentCardData={newCard}
        onApplyDetails={handleApplyPsaDetails}
      />
      
      {/* New Collection Modal */}
      <NewCollectionModal
        isOpen={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        onCreate={(name) => {
          setShowNewCollectionModal(false);
          if (!collections.includes(name)) {
            if (onNewCollectionCreated) {
              onNewCollectionCreated(name);
            }
            setSelectedCollection(name);
            if (typeof window !== 'undefined') {
              if (window.db && window.db.createEmptyCollection) {
                window.db.createEmptyCollection(name);
              }
            }
          } else {
            setSelectedCollection(name);
          }
        }}
        existingCollections={collections}
      />
    </>
  );
};

AddCardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  collections: PropTypes.array,
  className: PropTypes.string,
  onNewCollectionCreated: PropTypes.func,
  defaultCollection: PropTypes.string
};

export default AddCardModal;
