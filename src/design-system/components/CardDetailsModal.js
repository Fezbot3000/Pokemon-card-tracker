import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Icon } from '../';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import PriceChartingButton from '../../components/PriceChartingButton';
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
  const [cardImage, setCardImage] = useState(image);
  const [localImageLoadingState, setLocalImageLoadingState] = useState(imageLoadingState);
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [animClass, setAnimClass] = useState('fade-in');

  // If the card has pricing data from PriceCharting, extract the product ID
  let priceChartingProductId = null;
  if (card?.priceChartingUrl) {
    try {
      const urlParts = card.priceChartingUrl.split('/');
      priceChartingProductId = urlParts[urlParts.length - 1]?.split('?')[0];
    } catch (error) {
    }
  } else if (card?.priceChartingProductId) {
    // If the product ID is already stored in the card data, use it directly
    priceChartingProductId = card.priceChartingProductId;
  }
    
  // Log the extracted product ID for debugging
  useEffect(() => {
    if (card?.priceChartingUrl) {
    } else {
    }
  }, [card, priceChartingProductId]);
  
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
      if (image) {
        setCardImage(image);
      } else {
        setCardImage(null);
      }
      setLocalImageLoadingState(imageLoadingState);
      setActiveTab('details'); // Reset to the details tab on open
      setErrors({}); // Clear any previous errors
    }
  }, [image, imageLoadingState, isOpen]); // Simplified dependencies
  
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
    if (onSave) {
      onSave(card); // Use card prop
    }
  };
  
  // Create modal footer with action buttons
  const modalFooter = (
    <div className="flex justify-between items-center w-full">
      {/* Cancel button (always left) */}
      <Button variant="secondary" onClick={() => {
        onClose();
      }} className="mr-auto md:mr-0">
        Cancel
      </Button>

      {/* Right-aligned buttons group */}
      <div className="flex items-center space-x-3">
        {/* Mark as Sold Button (Icon on mobile) */}
        {onMarkAsSold && !card?.sold && (
          <Button
            variant="secondary"
            onClick={handleMarkAsSold}
            className="transition-all duration-200"
          >
            <Icon name="sell" className="mr-0 md:mr-2" /> {/* Icon always visible */}
            <span className="hidden md:inline"> {/* Text hidden on mobile */}Mark as Sold</span>
          </Button>
        )}

        {/* Save Button */}
        {onSave && (
          <Button variant="primary" onClick={handleSave}>
            <Icon name="save" className="mr-2" />
            Save {/* Changed text */}
          </Button>
        )}
      </div>
    </div>
  );
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
        }}
        title="Card Details"
        size="4xl" // Use a larger size for desktop
        footer={modalFooter}
        position="right"
        className={window.innerWidth < 640 ? 'w-full max-w-full h-full rounded-none m-0' : `card-details-modal-instance ${animClass} ${className}`}
        closeOnClickOutside={false}
      >
        <div className="space-y-6 pb-4">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700 mb-4">
            <button
              className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('details')}
            >
              Card Details
            </button>
            {priceChartingProductId && (
              <button
                className={`px-4 py-2 ${activeTab === 'price-history' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('price-history')}
              >
                Price History
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-6 ">
              {/* Collection Selector */}
              <div className="w-full md:w-1/2">
                <label htmlFor="modal-collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection
                </label>
                <select
                  id="modal-collection"
                  name="collectionId" // Assumes card data uses 'collectionId' to store the collection NAME
                  value={card?.collectionId || ''} // Use card prop for value
                  onChange={(e) => onChange({ ...card, collectionId: e.target.value })} // Call onChange prop directly
                  className="w-full px-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!collections || collections.length === 0}
                >
                  <option value="">Select Collection...</option>
                  {/* Map over array of strings */} 
                  {Array.isArray(collections) && collections.map((collectionName) => (
                    <option key={collectionName} value={collectionName}>
                      {collectionName}
                    </option>
                  ))}
                </select>
                {/* Optional: Add loading state or error message */}
              </div>

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
              />
            </div>
          )}

          {activeTab === 'price-history' && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Price History (PriceCharting)</h3>
              {card.priceCharting?.productId ? (
                <PriceHistoryGraph productId={card.priceCharting.productId} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 mt-2">No PriceCharting data available for this card.</p>
              )}
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
