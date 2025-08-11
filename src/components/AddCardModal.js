import React, {
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import ModalButton from '../design-system/atoms/ModalButton';
import Icon from '../design-system/atoms/Icon';
import CardDetailsForm from '../design-system/components/CardDetailsForm';
import { toast } from 'react-hot-toast';
import PSADetailModal from './PSADetailModal';
import NewCollectionModal from './NewCollectionModal';
import CardSearchModal from './CardSearchModal';
import CardSearchAutocomplete from './CardSearchAutocomplete';
import { searchByCertNumber, parsePSACardData } from '../services/psaSearch';
import { searchCardsByName, convertPriceChartingToCardData } from '../services/priceChartingService';
import { useSubscription } from '../hooks/useSubscription';
import logger from '../services/LoggingService';
import CustomDropdown from '../design-system/molecules/CustomDropdown';
// import Spinner from './Spinner'; // Import Spinner for loading state

/**
 * AddCardModal Component
 *
 * A specialized modal for adding new Pokemon cards with PSA certificate lookup.
 */
// Initial card data template
const getEmptyCard = () => ({
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
});

const AddCardModal = ({
  isOpen,
  onClose,
  onSave,
  collections = [],
  className = '',
  onNewCollectionCreated,
  defaultCollection = '',
}) => {

  // State for card data
  const [newCard, setNewCard] = useState(() => ({ ...getEmptyCard() }));

  // State for collection selection
  const [selectedCollection, setSelectedCollection] = useState(() => {
    // Use defaultCollection if provided and it exists in collections
    if (
      defaultCollection &&
      collections.includes(defaultCollection) &&
      defaultCollection.toLowerCase() !== 'sold'
    ) {
      return defaultCollection;
    }
    // Otherwise filter out "Sold" collection from the initial selection
    const availableCollections = collections.filter(
      c => c.toLowerCase() !== 'sold'
    );
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

  // State for card search modal (kept for potential future use)
  const [cardSearchModalOpen, setCardSearchModalOpen] = useState(false);
  const [cardSearchResults, setCardSearchResults] = useState([]);
  const [cardSearchError, setCardSearchError] = useState(null);

  // State for form validation and UI feedback
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);
  const [animClass, setAnimClass] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State for new collection modal
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);

  // Subscription check
  const { hasFeature } = useSubscription();

  // Check if form has meaningful changes (any field filled)
  const hasFormChanges = () => {
    const emptyCard = getEmptyCard();
    
    // Check if any text fields have been modified from empty state
    const hasTextChanges = Object.keys(emptyCard).some(key => {
      if (key === 'datePurchased' || key === 'quantity') return false; // Skip date and quantity as they have defaults
      return newCard[key] && newCard[key] !== emptyCard[key] && newCard[key].toString().trim() !== '';
    });
    
    // Check if image has been added
    const hasImageChanges = cardImage !== null || imageFile !== null;
    
    // Check if collection has been changed from default
    const hasCollectionChanges = selectedCollection && selectedCollection !== (collections.filter(c => c.toLowerCase() !== 'sold')[0] || '');
    
    return hasTextChanges || hasImageChanges || hasCollectionChanges;
  };

  // Set animation class when open state changes
  useEffect(() => {
    if (isOpen) {
      setAnimClass('slide-in-right');
      // Reset form when opening
      setNewCard({ ...getEmptyCard() });
      setCardImage(null);
      setImageFile(null);
      setErrors({});
      setSaveMessage(null);
      setPsaSerial('');
      setCardSearchResults([]);
      setCardSearchError(null);
    } else {
      setAnimClass('slide-out-right');
    }
  }, [isOpen]);

  // Handle card image change
  const handleImageChange = async file => {
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
      logger.error('Error changing card image:', error);
      setImageLoadingState('error');
      setErrors(prev => ({ ...prev, image: 'Failed to load image' }));
      return null;
    }
  };

  // Handle form changes
  const handleCardChange = updatedCard => {
    setNewCard(updatedCard);

    // Clear field error when user edits the field
    if (
      errors[
        Object.keys(updatedCard).find(key => updatedCard[key] !== newCard[key])
      ]
    ) {
      setErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        delete updatedErrors[
          Object.keys(updatedCard).find(
            key => updatedCard[key] !== newCard[key]
          )
        ];
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
      newErrors.collection =
        'Cards cannot be added directly to the Sold collection';
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
        collection: selectedCollection,
      };

      // Try to save the card
      await onSave(cardToSave, imageFile, selectedCollection);

      // Clear form on success
      setNewCard({ ...getEmptyCard() });
      setCardImage(null);
      setImageFile(null);
      setErrors({});
      setSaveMessage('Card saved successfully');

      // Close modal immediately after successful save
      onClose();
    } catch (error) {
      logger.error('Error adding card:', error);

      // Handle specific error cases
      if (error.message.includes('serial number already exists')) {
        setErrors({
          certificationNumber:
            'This serial number already exists in your active collections',
        });
        setSaveMessage('Card already exists');

        // Scroll the serial number field into view
        const serialField = document.querySelector(
          '[name="certificationNumber"]'
        );
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
    // Check subscription access first
    if (!hasFeature('PSA_SEARCH')) {
      toast.error(
        'PSA search is available with Premium. Upgrade to access this feature!'
      );
      return;
    }

    if (!psaSerial) {
      toast.error('Please enter a PSA serial number');
      return;
    }

    setIsSearching(true);
    setSaveMessage('Searching PSA database...');

    try {
      const psaData = await searchByCertNumber(psaSerial);

      // Check for error response
      if (psaData && psaData.error) {
        logger.error('PSA search error:', psaData.error);
        toast.error(`PSA search failed: ${psaData.error}`);
        setSaveMessage(
          'Failed to find PSA data. Please check the number and try again.'
        );
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
        year: parsedData.year || newCard.year,
      };

      setNewCard(updatedCard);
      toast.success('PSA data successfully loaded');
      setSaveMessage('PSA data applied successfully');
    } catch (error) {
      logger.error('Error searching PSA:', error);
      toast.error(`PSA search failed: ${error.message || 'Unknown error'}`);
      setSaveMessage(
        'Failed to search PSA database. Please check the number and try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };



  // Handle selecting a card from search results
  const handleSelectCard = (cardResult) => {
    try {
      // Convert Price Charting data to form data
      const cardData = convertPriceChartingToCardData(cardResult);
      
      // Update the form with the selected card data
      const updatedCard = {
        ...newCard,
        ...cardData,
        // Keep existing form data for fields not provided by Price Charting
        datePurchased: newCard.datePurchased,
        investmentAUD: newCard.investmentAUD,
        quantity: newCard.quantity
      };

      setNewCard(updatedCard);
      toast.success('Card details applied successfully!');
      setSaveMessage('Card details applied from Price Charting');
      
      // Close the search modal
      setCardSearchModalOpen(false);
    } catch (error) {
      logger.error('Error applying card data:', error);
      toast.error('Failed to apply card data');
      setSaveMessage('Failed to apply card data');
    }
  };

  // Handle applying PSA details to the card
  const handleApplyPsaDetails = updatedCardData => {
    setNewCard(prev => {
      // updatedCardData contains all fields from parsePSACardData, including certificationNumber
      const mergedData = {
        ...prev,
        ...updatedCardData,
        // Ensure psaUrl uses the certification number from PSA data, fallback to the user-entered psaSerial if needed.
        psaUrl:
          updatedCardData.psaUrl ||
          `https://www.psacard.com/cert/${updatedCardData.certificationNumber || psaSerial || ''}`,
      };
      return mergedData;
    });
    toast.success('PSA card details applied');
    setPsaDetailModalOpen(false);
  };

  // Create modal footer with buttons
  const modalFooter = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      {/* Cancel button - left aligned */}
      <div>
        <ModalButton variant="secondary" onClick={onClose}>
          Close
        </ModalButton>
      </div>

      {/* Save button - right aligned */}
      <div className="flex items-center justify-end space-x-3">
        {/* Save button */}
        <ModalButton 
          variant="primary" 
          onClick={handleSave} 
          disabled={isSaving || !hasFormChanges()}
          leftIcon={isSaving ? <Icon name="sync" className="animate-spin" /> : null}
        >
          {isSaving ? 'Saving...' : 'Add Card'}
        </ModalButton>
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
        size="modal-width-70"
        className={`${animClass} ${className}`}
        closeOnClickOutside={true}
      >
        <div className="space-y-6">
          {/* Card Search Section */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              Search for Card
            </h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Start typing a Pokemon card name to see live search results.
            </p>
            <CardSearchAutocomplete
              onSelectCard={handleSelectCard}
              placeholder="Type card name (e.g., Charizard, Pikachu)..."
              className="w-full"
            />
            
            {/* Price Charting Success Message */}
            {saveMessage && saveMessage === 'Card details applied from Price Charting' && (
              <div className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm text-green-700 transition-all dark:bg-green-900/30 dark:text-green-400">
                Card details applied from Price Charting
              </div>
            )}
          </div>

          {/* PSA Certificate Lookup Section */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              PSA Certificate Lookup
            </h3>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Search your PSA serial number to pre-populate the page.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={psaSerial}
                onChange={e => setPsaSerial(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Optionally trigger the PSA search on Enter
                    if (psaSerial.trim() && hasFeature('PSA_SEARCH') && !isSearching) {
                      handlePsaLookup();
                    }
                  }
                }}
                placeholder="Enter PSA serial number"
                className="focus:ring-primary/20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white"
                disabled={isSearching}
              />
              <Button
                variant="primary"
                onClick={handlePsaLookup}
                disabled={
                  isSearching || !psaSerial.trim() || !hasFeature('PSA_SEARCH')
                }
                className="w-full"
                title={
                  !hasFeature('PSA_SEARCH')
                    ? 'PSA search requires Premium subscription'
                    : 'Search PSA database'
                }
              >
                {!hasFeature('PSA_SEARCH') ? (
                  <>
                    <span
                      className="material-icons mr-1"
                      style={{ fontSize: '16px' }}
                    >
                      lock
                    </span>
                    Premium Feature
                  </>
                ) : (
                  <>
                    <span
                      className="material-icons mr-1"
                      style={{ fontSize: '16px' }}
                    >
                      search
                    </span>
                    Search PSA
                  </>
                )}
              </Button>
            </div>

            {/* PSA Messages */}
            {saveMessage && saveMessage === 'PSA data applied successfully' && (
              <div className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm text-green-700 transition-all dark:bg-green-900/30 dark:text-green-400">
                PSA data applied successfully
              </div>
            )}
            {saveMessage && saveMessage.startsWith('Searching PSA') && (
              <div className="mt-4 rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-700 transition-all dark:bg-blue-900/30 dark:text-blue-400">
                {saveMessage}
              </div>
            )}
            {saveMessage &&
              (saveMessage.startsWith('Failed to find PSA') ||
                saveMessage.startsWith('Failed to search PSA')) && (
                <div className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 transition-all dark:bg-red-900/30 dark:text-red-400">
                  {saveMessage}
                </div>
              )}
          </div>

          {/* Collection Selection */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              Select Collection
            </h3>
            <div className="flex items-center gap-2">
              <CustomDropdown
                value={selectedCollection}
                onSelect={(selectedValue) => {
                  if (selectedValue === 'new') {
                    setShowNewCollectionModal(true);
                  } else {
                    setSelectedCollection(selectedValue);
                  }
                }}
                options={[
                  ...collections
                    .filter(collection => collection.toLowerCase() !== 'sold')
                    .map(collection => ({
                      value: collection,
                      label: collection
                    })),
                  { value: 'new', label: '+ Create New Collection' }
                ]}
                placeholder="Select Collection..."
                className="w-full"
                size="md"
              />
              <Button
                variant="primary"
                type="button"
                onClick={() => setShowNewCollectionModal(true)}
                className="shrink-0"
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
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 text-base font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none"
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
              quantity: true,
            }}
          />

          {/* Status message */}
          {saveMessage &&
            saveMessage !== 'PSA data applied successfully' &&
            saveMessage !== 'Card details applied from Price Charting' &&
            !saveMessage.startsWith('Searching PSA') &&
            !saveMessage.startsWith('Failed to find PSA') &&
            !saveMessage.startsWith('Failed to search PSA') && (
              <div
                className={`mt-4 rounded-lg px-4 py-2 text-sm transition-all ${
                  saveMessage.startsWith('Error') ||
                  saveMessage.startsWith('Please fix') ||
                  saveMessage.startsWith('Failed')
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : saveMessage === 'No changes to save' ||
                        saveMessage.startsWith('Searching')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {saveMessage}
              </div>
            )}
        </div>
      </Modal>

      {/* Enlarged Image Modal */}
      {showEnlargedImage && cardImage && (
        <div
          className="bg-black/90 fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center"
          onClick={e => {
            e.stopPropagation();
            setShowEnlargedImage(false);
          }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="relative flex max-w-[90vw] items-center justify-center"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
            }}
          >
            <img
              src={cardImage}
              alt="Card preview (enlarged)"
              className="size-auto rounded-lg object-contain"
              style={{
                maxHeight: '90vh',
                maxWidth: '90vw',
              }}
            />
            <button
              className="bg-black/70 absolute right-4 top-4 rounded-full p-2 text-white"
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

      {/* Card Search Modal - Hidden but kept for potential future use */}
      {cardSearchModalOpen && (
        <CardSearchModal
          isOpen={cardSearchModalOpen}
          onClose={() => setCardSearchModalOpen(false)}
          searchResults={cardSearchResults}
          isLoading={false}
          error={cardSearchError}
          onSelectCard={handleSelectCard}
          searchQuery=""
        />
      )}

      {/* New Collection Modal */}
      <NewCollectionModal
        isOpen={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        onCreate={name => {
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
  defaultCollection: PropTypes.string,
};

export default AddCardModal;
