import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import SaleModal from '../../components/SaleModal'; 
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import { toast } from 'react-hot-toast';
import '../styles/animations.css';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Check if the date is valid
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

/**
 * CardDetailsModal Component
 * 
 * A modal for displaying and editing card details
 */
const CardDetailsModal = ({
  isOpen,
  onClose,
  card = null,
  onSave,
  onDelete,
  onMarkAsSold,
  onChange,
  image,
  imageLoadingState = 'idle',
  onImageChange,
  onImageRetry,
  className = '',
  additionalHeaderContent,
  additionalValueContent,
  additionalSerialContent,
  collections = [], // Default to empty array
  initialCollectionName = null // Default to null
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [cardImage, setCardImage] = useState(null); // Start with null to implement lazy loading
  const [localImageLoadingState, setLocalImageLoadingState] = useState('idle');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [animClass, setAnimClass] = useState('fade-in');
  const [contentLoaded, setContentLoaded] = useState(false); // Track if content has been loaded
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPsaSearching, setIsPsaSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get currency formatting functions
  const { formatPreferredCurrency, formatAmountForDisplay } = useUserPreferences();


  // If the card has pricing data from PriceCharting, extract the product ID
  let priceChartingProductId = null;
  if (card?.priceChartingUrl) {
    try {
      const urlParts = card.priceChartingUrl.split('/');
      priceChartingProductId = urlParts[urlParts.length - 1]?.split('?')[0];
    } catch (error) {
      console.error("Error extracting PriceCharting product ID:", error);
    }
  } else if (card?.priceChartingProductId) {
    // If the product ID is already stored in the card data, use it directly
    priceChartingProductId = card.priceChartingProductId;
  }
  
  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine the condition type for the price history graph
  const getPriceConditionType = () => {
    if (card?.condition) {
      const condition = card.condition.toLowerCase();
      if (condition.includes('psa') || condition.includes('bgs') || condition.includes('cgc') || condition.includes('gem mt')) {
        return 'graded';
      }
    }
    return 'loose';
  };
  
  // Calculate profit safely
  const getProfit = () => {
    if (!card) return 0;
    
    // Use original amounts and currencies for more accurate profit calculation
    const originalInvestment = card.originalInvestmentAmount !== undefined ? parseFloat(card.originalInvestmentAmount) : 0;
    const originalInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';
    
    const originalCurrentValue = card.originalCurrentValueAmount !== undefined ? parseFloat(card.originalCurrentValueAmount) : 0;
    const originalCurrentValueCurrency = card.originalCurrentValueCurrency || 'AUD';
    
    // Convert both to preferred currency using the UserPreferences context
    const investmentInPreferredCurrency = originalInvestment !== 0 ? 
      parseFloat(formatAmountForDisplay(originalInvestment, originalInvestmentCurrency).replace(/[^0-9.-]+/g, '')) : 0;
    
    const currentValueInPreferredCurrency = originalCurrentValue !== 0 ? 
      parseFloat(formatAmountForDisplay(originalCurrentValue, originalCurrentValueCurrency).replace(/[^0-9.-]+/g, '')) : 0;
    
    return currentValueInPreferredCurrency - investmentInPreferredCurrency;
  };
  
  // Handle PSA search
  const handlePsaSearch = async (serialNumber) => {
    if (!serialNumber) {
      toast.error('Please enter a serial number to search');
      return;
    }

    setIsPsaSearching(true);
    setSaveMessage('Searching for PSA certificate...');

    try {
      const psaData = await searchByCertNumber(serialNumber);
      
      // Handle rate limit error
      if (psaData?.error === 'RATE_LIMITED') {
        toast.error('PSA lookup temporarily unavailable due to rate limiting');
        return;
      }
      
      // Handle not found error
      if (psaData?.error === 'NOT_FOUND' || !psaData) {
        toast.error('No PSA data found for this serial number');
        return;
      }

      const parsedData = parsePSACardData(psaData);
      if (!parsedData) {
        toast.error('Could not parse PSA data');
        return;
      }

      // Update card data with PSA information
      const updatedCard = {
        ...card,
        ...parsedData,
        slabSerial: serialNumber,
        condition: `PSA ${parsedData.grade}`,
        gradeCompany: 'PSA',
        psaUrl: `https://www.psacard.com/cert/${serialNumber}`,
        player: parsedData.player || card.player,
        cardName: parsedData.cardName || card.cardName,
        population: parsedData.population || card.population,
        category: parsedData.category || card.category,
        set: parsedData.set || card.set,
        year: parsedData.year || card.year
      };

      // Call onChange with the updated card data
      onChange(updatedCard);
      toast.success('PSA data successfully loaded');
    } catch (error) {
      console.error('Error searching PSA:', error);
      toast.error('Error searching PSA database');
    } finally {
      setIsPsaSearching(false);
      setSaveMessage('');
    }
  };

  // Update local state when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(
        '[CardDetailsModal] Main useEffect. isOpen:', isOpen, 
        'Card ID:', card?.id, 
        'CollectionID:', card?.collectionId, 
        'Set:', card?.set, 
        'Card Name:', card?.card
        // Consider logging the full card object if issues persist, but be mindful of verbosity
        // JSON.stringify(card)
      );

      // On mobile, only load content when the modal opens
      if (isMobile) {
        // Set a short delay to allow the modal animation to complete
        const timer = setTimeout(() => {
          if (image) {
            setCardImage(image);
          }
          setContentLoaded(true); // Ensure content is marked as loaded
        }, 150); // 150ms delay
        return () => clearTimeout(timer);
      } else {
        // Desktop: Load content immediately
        if (image) {
          setCardImage(image);
        }
        setContentLoaded(true);
      }

      // --- REVISED ERROR CLEARING LOGIC ---
      // If the modal is open, and this effect is running (which it will if 'card',
      // 'card.collectionId', 'card.set', or 'card.card' changes, as they are dependencies),
      // then clear previous validation states.
      console.log('[CardDetailsModal] Relevant card data changed or modal opened. Clearing errors and save message.');
      setErrors({});
      setSaveMessage('');
      // --- END REVISED ERROR CLEARING LOGIC ---

    } else {
      // Reset animation class and content loaded state when modal closes
      setAnimClass('fade-out');
      setContentLoaded(false); // Reset content loaded state
      // Optionally reset other states like cardImage if they should not persist
      // setCardImage(null); 
      // setLocalImageLoadingState('idle');
      // It might also be a good idea to clear errors when the modal closes completely
      // setErrors({});
      // setSaveMessage('');
    }
    // Dependencies that should trigger this effect. 'image' and 'isMobile' are for content loading.
    // 'card', 'card.collectionId', 'card.set', 'card.card' are critical for resetting form/error state.
  }, [isOpen, card, image, isMobile, card?.collectionId, card?.set, card?.card]);

  // Handle image changes (passed down to form)
  const handleImageChange = (file) => {
    if (onImageChange) {
      onImageChange(file);
    }
  };
  
  // Handle mark as sold action
  const handleMarkAsSold = () => {
    if (onMarkAsSold) {
      setIsConfirmingSold(true);
    }
  };
  
  // SaleModal integration for single card
  const handleSaleConfirm = (saleData) => {
    if (onMarkAsSold) {
      onMarkAsSold({...card, ...saleData});
    }
    setIsConfirmingSold(false);
  };
  
  const handleSaleModalClose = () => {
    setIsConfirmingSold(false);
  };
  
  // Handle save action
  const handleSave = async (e) => {
    // If this was triggered by a form submit, prevent default
    if (e?.preventDefault) {
      e.preventDefault();
    }

    // Validate required fields
    const newErrors = {};
    
    if (!card.card) {
      newErrors.card = 'Card name is required';
    }
    
    // Check the 'setName' field from the form data
    if (!card.setName) { 
      newErrors.setName = 'Set is required'; // Use 'setName' as the key
    }
    
    if (!card.collectionId) {
      newErrors.collectionId = 'Collection is required';
    }
    
    // Add validation for numeric fields
    if (card.investmentAUD && isNaN(parseFloat(card.investmentAUD))) {
      newErrors.investmentAUD = 'Must be a valid number';
    }
    
    if (card.currentValueAUD && isNaN(parseFloat(card.currentValueAUD))) {
      newErrors.currentValueAUD = 'Must be a valid number';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaveMessage('Please correct the highlighted field errors below.');
      return;
    }
    
    // Clear errors and save
    setErrors({});
    
    if (onSave) {
      // Set saving state to true
      setIsSaving(true);
      
      try {
        // Format the card data before saving
        const formattedCard = {
          ...card,
          // Format date if it exists
          datePurchased: card.datePurchased ? formatDate(card.datePurchased) : '',
          // Convert numeric fields to numbers
          investmentAUD: card.investmentAUD ? parseFloat(card.investmentAUD) : '',
          currentValueAUD: card.currentValueAUD ? parseFloat(card.currentValueAUD) : '',
          quantity: card.quantity ? parseInt(card.quantity, 10) : 1,
        };
        
        // Call onSave and wait for it to complete
        await onSave(formattedCard);
        
        // Clear any unsaved changes state
        setErrors({});
        setSaveMessage('');
        
        // Reset all form elements to prevent unsaved changes dialog
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error('Error saving card:', error);
        toast.error(`Failed to save card: ${error.message}`);
      } finally {
        // Reset saving state
        setIsSaving(false);
      }
    }

const currentValueInPreferredCurrency = originalCurrentValue !== 0 ? 
parseFloat(formatAmountForDisplay(originalCurrentValue, originalCurrentValueCurrency).replace(/[^0-9.-]+/g, '')) : 0;

return currentValueInPreferredCurrency - investmentInPreferredCurrency;
};

  // Update local state when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(
        '[CardDetailsModal] Main useEffect. isOpen:', isOpen, 
        'Card ID:', card?.id, 
        'CollectionID:', card?.collectionId, 
        'Set:', card?.set, 
        'Card Name:', card?.card
        // Consider logging the full card object if issues persist, but be mindful of verbosity
        // JSON.stringify(card)
      );
      setContentLoaded(true);
    }
  }, [isOpen, card]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={null}
        position="right"
        closeOnClickOutside={false}
        size="2xl"
        className={`${className} ${animClass}`}
        footer={
          <div className="flex justify-between w-full">
            <Button 
              variant="secondary" 
              onClick={onClose}
              disabled={isPsaSearching || isSaving}
            >
              Cancel
            </Button>
            <div className="flex space-x-2">
              {onMarkAsSold && (
                <Button 
                  variant="secondary" 
                  onClick={handleMarkAsSold}
                  leftIcon={<Icon name="tag" />}
                  disabled={isPsaSearching || isSaving}
                >
                  Mark as Sold
                </Button>
              )}
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={isPsaSearching || isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full">
          {/* Tabs - Moved to the top to replace the modal title */}
          <div className="sticky top-0 z-10 bg-white dark:bg-[#0F0F0F] py-2 -mt-6 -mx-6 px-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2">
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Card Details
              </button>
              {priceChartingProductId && (
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === 'price-history'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('price-history')}
                >
                  Price History
                </button>
              )}
              
              {/* Profit/Loss Display */}
              <div className="ml-auto flex items-center">
                <span
                  className={`font-medium ${getProfit() >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                  data-component-name="CardDetailsModal"
                >
                  {formatPreferredCurrency(Math.abs(getProfit()))} {getProfit() >= 0 ? 'profit' : 'loss'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {contentLoaded && activeTab === 'details' && (
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="py-2"> 
                <CardDetailsForm
                  card={card}
                  cardImage={cardImage}
                  imageLoadingState={localImageLoadingState}
                  onChange={onChange}
                  onImageChange={handleImageChange}
                  onImageRetry={onImageRetry}
                  onImageClick={() => setShowEnlargedImage(true)}
                  errors={errors}
                  additionalValueContent={additionalValueContent}
                  additionalSerialContent={additionalSerialContent}
                  collections={collections}
                  initialCollectionName={initialCollectionName}
                  onPsaSearch={handlePsaSearch}
                  isPsaSearching={isPsaSearching}
                />
              </div>
            </div>
          )}

          {contentLoaded && activeTab === 'price-history' && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Price History (PriceCharting)</h3>
              {card.priceCharting?.productId ? (
                <PriceHistoryGraph productId={card.priceCharting.productId} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 mt-2">No PriceCharting data available for this card.</p>
              )}
            </div>
          )}
          
          {/* Loading indicator when content is not yet loaded */}
          {!contentLoaded && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading card details...</span>
            </div>
          )}
          
          {/* Status message */}
          {saveMessage && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm transition-all ${
              saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix')
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : saveMessage.startsWith('No changes to save')
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
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowEnlargedImage(false);
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}
      
      {/* SaleModal for single card sale */}
      {isConfirmingSold && (
        <SaleModal
          isOpen={isConfirmingSold}
          onClose={handleSaleModalClose}
          selectedCards={[card]}
          onConfirm={handleSaleConfirm}
        />
      )}
    </>
  );
};

CardDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  card: PropTypes.object,
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  onMarkAsSold: PropTypes.func,
  onChange: PropTypes.func,
  image: PropTypes.string,
  imageLoadingState: PropTypes.string,
  onImageChange: PropTypes.func,
  onImageRetry: PropTypes.func,
  className: PropTypes.string,
  additionalHeaderContent: PropTypes.node,
  additionalValueContent: PropTypes.node,
  additionalSerialContent: PropTypes.node,
  collections: PropTypes.arrayOf(PropTypes.string), // Expect an array of strings now
  initialCollectionName: PropTypes.string // Add prop type
};

export default CardDetailsModal;
