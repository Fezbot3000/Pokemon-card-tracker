import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Icon } from '../';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import SaleModal from '../../components/SaleModal'; 
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import { toast } from 'react-hot-toast';
import '../styles/animations.css';

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
    const investment = card.investmentAUD === '' ? 0 : parseFloat(card.investmentAUD) || 0;
    const currentValue = card.currentValueAUD === '' ? 0 : parseFloat(card.currentValueAUD) || 0;
    return currentValue - investment;
  };
  
  // Update local state when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      // On mobile, only load content when the modal opens
      if (isMobile) {
        // Set a short delay to allow the modal animation to complete
        const timer = setTimeout(() => {
          if (image) {
            setCardImage(image);
          } else {
            setCardImage(null);
          }
          setLocalImageLoadingState(imageLoadingState);
          setContentLoaded(true); // Mark content as loaded
        }, 300);
        return () => clearTimeout(timer);
      } else {
        // On desktop, load immediately
        if (image) {
          setCardImage(image);
        } else {
          setCardImage(null);
        }
        setLocalImageLoadingState(imageLoadingState);
        setContentLoaded(true); // Mark content as loaded
      }
      
      setActiveTab('details'); // Reset to the details tab on open
      setErrors({}); // Clear any previous errors
    } else {
      // When modal closes, reset content loaded state for next open
      setContentLoaded(false);
      setSaveMessage('');
    }
  }, [isOpen, image, imageLoadingState, isMobile]);
  
  // Update image state when image prop changes
  useEffect(() => {
    if (image) {
      setCardImage(image);
    }
    setLocalImageLoadingState(imageLoadingState);
  }, [image, imageLoadingState]);
  
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
  const handleSave = async () => {
    // Validate required fields
    const newErrors = {};
    
    if (!card.card) {
      newErrors.card = 'Card name is required';
    }
    
    if (!card.set) {
      newErrors.set = 'Set is required';
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
      setSaveMessage('Please fix the errors before saving');
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
        
        // Don't show a success toast here - it will be shown by the parent component
        // toast.success('Card saved successfully!');
      } catch (error) {
        console.error('Error saving card:', error);
        toast.error(`Failed to save card: ${error.message}`);
      } finally {
        // Reset saving state
        setIsSaving(false);
      }
    }
  };

  // Handle PSA search
  const handlePsaSearch = async (serialNumber) => {
    if (!serialNumber) {
      toast.error('Please enter a PSA certificate number');
      return;
    }

    setIsPsaSearching(true);
    setSaveMessage('Searching for PSA certificate...');

    try {
      const data = await searchByCertNumber(serialNumber);
      console.log('PSA data received:', data);
      
      if (data && !data.error) {
        try {
          // Parse the PSA data into our app's format
          const parsedData = parsePSACardData(data);
          console.log('Parsed PSA data:', parsedData);
          
          // Create a direct mapping of PSA data to card fields
          const updatedCardData = {
            ...card,
            card: parsedData.cardName || card.card || '',
            player: parsedData.player || card.player || '',
            set: parsedData.setName || card.set || '',
            year: parsedData.year || card.year || '',
            category: parsedData.category || 'Pokemon', // Default to Pokemon for PSA cards
            condition: parsedData.grade ? `PSA ${parsedData.grade}` : card.condition || '',
            gradingCompany: 'PSA', // Explicitly set the grading company
            // Extract just the numeric part of the grade if it's in format "GEM MT 10"
            grade: parsedData.grade ? parsedData.grade.replace(/^.*?(\d+(?:\.\d+)?)$/, '$1') : card.grade || '',
            slabSerial: parsedData.slabSerial || serialNumber || card.slabSerial || '',
            population: parsedData.population || card.population || '',
            psaUrl: parsedData.psaUrl || card.psaUrl || '',
            // Preserve financial data
            datePurchased: card?.datePurchased || new Date().toISOString().split('T')[0],
            investmentAUD: card?.investmentAUD || '',
            currentValueAUD: card?.currentValueAUD || '',
            quantity: card?.quantity || 1
          };
          
          console.log('Updated card data:', updatedCardData);
          
          // Update the card data
          if (onChange) {
            onChange(updatedCardData);
            toast.success('PSA data applied successfully!');
          }
        } catch (parseError) {
          console.error('Error parsing PSA data:', parseError);
          toast.error('Error parsing PSA data: ' + parseError.message);
        }
      } else {
        console.error('PSA lookup failed:', data);
        toast.error(`PSA search error: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error looking up PSA certificate:', error);
      toast.error(`Failed to find PSA certificate: ${error.message}`);
    } finally {
      setIsPsaSearching(false);
      setSaveMessage('');
    }
  };

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
                  ${Math.abs(getProfit()).toFixed(2)} {getProfit() >= 0 ? 'profit' : 'loss'}
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
