import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import CardDetailsForm from '../design-system/components/CardDetailsForm';
import { toast } from 'react-hot-toast';
import PSADetailModal from './PSADetailModal';
import NewCollectionModal from './NewCollectionModal';
import { searchByCertNumber, fetchPSACardImage } from '../services/psaSearch';

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
  onNewCollectionCreated
}) => {
  // Initial card data
  const emptyCard = {
    id: null,
    player: '',
    card: '',
    set: '',
    year: '',
    category: '', // Changed from 'Pokemon' to blank to fix default
    condition: '',
    slabSerial: '',
    datePurchased: new Date().toISOString().split('T')[0],
    investmentAUD: '',
    currentValueAUD: '',
    quantity: 1, // Add default quantity of 1
  };
  
  // State for card data
  const [newCard, setNewCard] = useState({...emptyCard});
  
  // State for collection selection
  const [selectedCollection, setSelectedCollection] = useState(() => {
    // Filter out "Sold" collection from the initial selection
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
      setImageLoadingState('idle');
      
      return file; // Return the file for saving by parent component
    } catch (error) {
      console.error('Error changing card image:', error);
      setImageLoadingState('error');
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
    
    // Card name is required
    if (!newCard.card?.trim()) {
      newErrors.card = 'Card name is required';
    }
    
    // Serial number is required - we call it slabSerial
    if (!newCard.slabSerial?.trim()) {
      newErrors.slabSerial = 'Serial number is required';
    }
    
    // Selected collection is required and cannot be "Sold"
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

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveMessage('Please fix the errors before saving');
      return;
    }

    // Check if we have an image file
    if (!imageFile) {
      setSaveMessage('Please add an image for the card');
      setErrors({ image: 'Card image is required' });
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
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error adding card:', error);
      
      // Handle specific error cases
      if (error.message.includes('serial number already exists')) {
        setErrors({
          slabSerial: 'This serial number already exists in your active collections'
        });
        setSaveMessage('Card already exists');
        
        // Scroll the serial number field into view
        const serialField = document.querySelector('[name="slabSerial"]');
        if (serialField) {
          serialField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Generic error handling
        setSaveMessage(`Error: ${error.message}`);
      }
    }
  };

  // Handle PSA certificate lookup
  const handlePsaLookup = async () => {
    if (!psaSerial.trim()) {
      toast.error('Please enter a PSA certificate number');
      return;
    }

    setIsSearching(true);
    setSaveMessage('Searching for PSA certificate...');

    try {
      const data = await searchByCertNumber(psaSerial);
      console.log('PSA data received:', data);
      
      // Capture the PSA data
      setPsaData(data);
      
      // Try to fetch the PSA card image in parallel
      let psaImage = null;
      try {
        psaImage = await fetchPSACardImage(psaSerial);
        if (psaImage) {
          console.log(`PSA image fetched successfully: ${psaImage.size} bytes`);
          setCardImage(URL.createObjectURL(psaImage));
          setImageFile(psaImage);
        } else {
          console.log('No PSA image found or image fetch failed');
        }
      } catch (imageError) {
        console.error('Error fetching PSA image:', imageError);
      }
      
      // Parse the data received from PSA
      // Check if we have a PSACert object, which seems to be the structure from the console logs
      if (data && data.PSACert) {
        const psaInfo = data.PSACert;
        
        // Update the card with PSA data
        setNewCard({
          ...newCard,
          player: psaInfo.Subject || '',
          card: psaInfo.Subject || '',  // Often the subject is the card name
          set: psaInfo.Brand || '',
          year: psaInfo.Year || '',
          condition: psaInfo.GradeDescription || psaInfo.CardGrade || '',
          slabSerial: psaInfo.CertNumber || psaInfo.SpecNumber || '',
          category: psaInfo.Category || 'Pokemon',
          hasImage: !!psaImage, // Mark that we have an image if we fetched one
        });
      }
      
      // Show the modal with the PSA details
      setPsaDetailModalOpen(true);
      
      toast.success('PSA certificate details loaded');
      setSaveMessage(null);
    } catch (error) {
      console.error('Error looking up PSA certificate:', error);
      toast.error(`Failed to find PSA certificate: ${error.message}`);
      setSaveMessage('Failed to find PSA certificate. Please check the number and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle applying PSA details to the card
  const handleApplyPsaDetails = (updatedCardData) => {
    setNewCard(prev => ({
      ...prev,
      ...updatedCardData
    }));
    toast.success('PSA card details applied');
    setPsaDetailModalOpen(false);
  };
  
  // Create modal footer with action buttons
  const modalFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      <div>
        {/* Space reserved for potential future buttons */}
      </div>
      
      <div className="flex items-center justify-end space-x-3">
        {/* Cancel and Save buttons - right aligned */}
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          onClick={handleSave}
        >
          Add Card
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
          </div>

          {/* Collection Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Select Collection</h3>
            <div className="flex gap-2 items-center">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a]
                         bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {collections
                  .filter(collection => collection.toLowerCase() !== 'sold')
                  .map(collection => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))
                }
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

          {/* Card Details Form */}
          <CardDetailsForm
            card={newCard}
            cardImage={cardImage}
            imageLoadingState={imageLoadingState}
            onChange={handleCardChange}
            onImageChange={handleImageChange}
            onImageRetry={() => setImageLoadingState('idle')}
            onImageClick={() => cardImage && setShowEnlargedImage(true)}
            errors={errors}
            hideCollectionField={true}
            hidePsaSearchButton={true}
          />
          
          {/* Status message */}
          {saveMessage && (
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
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={cardImage} 
              alt="Card preview (enlarged)" 
              className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-lg" 
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
  onNewCollectionCreated: PropTypes.func
};

export default AddCardModal;
