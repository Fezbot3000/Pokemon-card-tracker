import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Icon } from '../';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import SaleModal from '../../components/SaleModal'; 
import '../styles/animations.css';
import { toast } from 'react-hot-toast';
import { searchByCertNumber, fetchPSACardImage, parsePSACardData, mergeWithExistingCard } from '../../services/psaSearch';
import PSADetailModal from '../../components/PSADetailModal';

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
  const [psaDetailModalOpen, setPsaDetailModalOpen] = useState(false);
  const [psaData, setPsaData] = useState(null);

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
    // First update our local state
    setLocalImageLoadingState('loading');
    try {
      // Create a preview URL for immediate feedback
      const imageUrl = URL.createObjectURL(file);
      setCardImage(imageUrl);
      setLocalImageLoadingState('idle');
    } catch (error) {
      console.error('Error creating image preview:', error);
      setLocalImageLoadingState('error');
    }
    
    // Then pass to parent component
    if (onImageChange) {
      onImageChange(file);
    }
  };
  
  // Handle PSA search
  const handlePsaSearch = async (serialNumber) => {
    if (!serialNumber) {
      toast.error('Please enter a PSA serial number');
      return;
    }
    
    setIsPsaSearching(true);
    setSaveMessage('Searching PSA database...');
    
    try {
      const data = await searchByCertNumber(serialNumber);
      console.log('PSA data received:', data);
      
      // Capture the PSA data
      setPsaData(data);
      
      // Try to fetch the PSA card image in parallel
      let psaImage = null;
      try {
        // Only fetch and apply PSA image if the card doesn't already have an image
        if (!card.hasImage || !cardImage) {
          psaImage = await fetchPSACardImage(serialNumber);
          if (psaImage) {
            console.log(`PSA image fetched successfully: ${psaImage.size} bytes`);
            setCardImage(URL.createObjectURL(psaImage));
            
            // Notify parent of image change if handler is provided
            if (onImageChange) {
              onImageChange(psaImage);
            }
          } else {
            console.log('No PSA image found or image fetch failed');
          }
        } else {
          console.log('Card already has an image, preserving existing image');
        }
      } catch (imageError) {
        console.error('Error fetching PSA image:', imageError);
      }
      
      // Open the PSADetailModal with the data
      if (data && data.PSACert) {
        setPsaDetailModalOpen(true);
      } else {
        toast.error('No valid PSA data found for this serial number');
      }
      
      setSaveMessage(null);
    } catch (error) {
      console.error('Error looking up PSA certificate:', error);
      toast.error(`Failed to find PSA certificate: ${error.message}`);
      setSaveMessage('Failed to find PSA certificate. Please check the number and try again.');
    } finally {
      setIsPsaSearching(false);
    }
  };
  
  // Handle applying PSA details to the card
  const handleApplyPsaDetails = (updatedCardData) => {
    if (onChange) {
      onChange(updatedCardData);
    }
    setPsaDetailModalOpen(false);
    toast.success('PSA card details applied');
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
  const handleSave = () => {
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
    
    // Check if there are any validation errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaveMessage('Please fix the errors before saving');
      return;
    }
    
    // Clear any previous errors
    setErrors({});
    
    // Call the onSave callback with the updated card data
    if (onSave) {
      onSave(card);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Card Details"
        position="right"
        closeOnClickOutside={false}
        className={`${className} ${animClass}`}
        footer={
          <div className="flex justify-between w-full">
            <Button 
              variant="secondary" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <div className="flex space-x-2">
              {onMarkAsSold && (
                <Button 
                  variant="secondary" 
                  onClick={handleMarkAsSold}
                  leftIcon={<Icon name="tag" />}
                >
                  Mark as Sold
                </Button>
              )}
              <Button 
                variant="primary" 
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Card Details
              </button>
              {priceChartingProductId && (
                <button
                  className={`py-2 px-4 font-medium text-sm border-b-2 ${
                    activeTab === 'price-history'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('price-history')}
                >
                  Price History
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          {contentLoaded && activeTab === 'details' && (
            <div className="flex-1 overflow-y-auto">
              <div className="py-4">
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
      
      {/* PSA Detail Modal */}
      <PSADetailModal
        isOpen={psaDetailModalOpen}
        onClose={() => setPsaDetailModalOpen(false)}
        certNumber={card?.slabSerial || ''}
        currentCardData={card}
        psaData={psaData}
        onApplyDetails={handleApplyPsaDetails}
      />
      
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
