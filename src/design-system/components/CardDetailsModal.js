import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Icon } from '../';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import SaleModal from '../../components/SaleModal'; 
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
    }
  }, [image, imageLoadingState, isOpen, isMobile]);
  
  // Handle image changes (passed down to form)
  const handleImageChange = (file) => {
    if (onImageChange && file) {
      setLocalImageLoadingState('loading');
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
    setIsConfirmingSold(false);
    if (onMarkAsSold) {
      // Pass the saleData back to the parent (CardDetails)
      onMarkAsSold({ ...card, ...saleData }); // Use card prop
    }
  };

  const handleSaleModalClose = () => {
    setIsConfirmingSold(false);
  };
  
  // Handle save action
  const handleSave = () => {
    console.log('[CardDetailsModal] Saving card with:');
    console.log(' - Current collection ID:', card.collectionId);
    console.log(' - Initial collection name:', initialCollectionName);
    
    // Make sure the card has the current collection ID from the form
    const cardToSave = {
      ...card,
      // Ensure both properties exist for backward compatibility
      collection: card.collectionId || card.collection,
      collectionId: card.collectionId || card.collection,
      // Preserve the image URL if it exists
      imageUrl: card.imageUrl || null,
      lastUpdated: new Date().toISOString() // Add timestamp for verification
    };
    
    console.log('[CardDetailsModal] Prepared card to save:', cardToSave);
    
    // Store verification data in localStorage
    if (initialCollectionName !== cardToSave.collectionId) {
      localStorage.setItem('lastCollectionChange', JSON.stringify({
        timestamp: new Date().toISOString(),
        cardId: cardToSave.slabSerial,
        cardName: cardToSave.card || 'Unnamed Card',
        from: initialCollectionName || 'Unknown Collection',
        to: cardToSave.collectionId,
        imageUrl: cardToSave.imageUrl // Include image URL in verification data
      }));
    }
    
    if (onSave) {
      onSave(cardToSave, initialCollectionName);
    }
  };
  
  // Create modal footer with action buttons
  const modalFooter = (
    <div className="flex justify-between w-full">
      <Button 
        variant="secondary" 
        onClick={onClose}
        className="mr-2"
      >
        Cancel
      </Button>
      <div className="flex space-x-2">
        {card && onDelete && (
          <Button 
            variant="danger" 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this card?')) {
                onDelete(card);
              }
            }}
            className="mr-2"
          >
            <Icon name="delete" className="mr-1" />
            Delete
          </Button>
        )}
        {card && onMarkAsSold && (
          <Button 
            variant="secondary" 
            onClick={handleMarkAsSold}
            className="mr-2"
          >
            <Icon name="sell" className="mr-1" />
            Mark as Sold
          </Button>
        )}
        {onSave && (
          <Button 
            variant="primary" 
            onClick={handleSave}
          >
            <Icon name="save" className="mr-1" />
            Save
          </Button>
        )}
      </div>
    </div>
  );
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {card?.card || 'New Card'}
              </h2>
              {card?.player && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {card.player}
                </p>
              )}
            </div>
            {additionalHeaderContent && (
              <div className="ml-4 flex-shrink-0">
                {additionalHeaderContent}
              </div>
            )}
          </div>
        }
        footer={modalFooter}
        className={`max-w-4xl w-full ${className}`}
        contentClassName="max-h-[80vh] overflow-y-auto pb-4 px-4 sm:px-6" // Add max height and overflow for mobile
      >
        <div className={`transition-opacity duration-300 ${animClass}`}>
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex space-x-4">
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Card Details
              </button>
              {card?.priceChartingUrl && (
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
          
          {/* Tab Content - Only render when contentLoaded is true */}
          {contentLoaded && activeTab === 'details' && (
            <div className="space-y-4">
              <CardDetailsForm 
                key={card?.id || 'new-card-form'} 
                card={card} // Pass card prop
                cardImage={cardImage}
                imageLoadingState={localImageLoadingState}
                onChange={onChange} // Pass onChange prop directly
                onImageChange={handleImageChange}
                onImageRetry={onImageRetry}
                onImageClick={() => setShowEnlargedImage(true)}
                additionalValueContent={additionalValueContent}
                additionalSerialContent={additionalSerialContent}
                collections={collections}
                initialCollectionName={initialCollectionName}
              />
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
