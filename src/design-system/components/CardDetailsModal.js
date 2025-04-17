import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import CardDetailsForm from './CardDetailsForm';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import RecentSales from '../../components/RecentSales';
import EbaySales from '../../components/EbaySales';
import PriceChartingButton from '../../components/PriceChartingButton';
import SaleModal from '../../components/SaleModal'; // Import SaleModal
import '../styles/animations.css';

/**
 * CardDetailsModal Component
 * 
 * A modal for displaying and editing card details
 */
const CardDetailsModal = ({
  isOpen,
  onClose,
  card,
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
  additionalSerialContent
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editedCard, setEditedCard] = useState(card || {});
  const [cardImage, setCardImage] = useState(image);
  const [localImageLoadingState, setLocalImageLoadingState] = useState(imageLoadingState);
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
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
  
  // Update local state when props change
  useEffect(() => {
    setEditedCard(card || {});
    if (image) {
      setCardImage(image);
    } else {
      setCardImage(null);
    }
    setLocalImageLoadingState(imageLoadingState);
  }, [card, image, imageLoadingState]);
  
  // Handle card field changes
  const handleCardChange = (updatedCard) => {
    setEditedCard(updatedCard);
    if (onChange) {
      onChange(updatedCard);
    }
  };
  
  // Handle image changes
  const handleImageChange = (file) => {
    if (onImageChange && file) {
      setLocalImageLoadingState('loading');
      onImageChange(file);
    }
  };
  
  // Handle delete action
  const handleDelete = () => {
    if (isConfirmingDelete) {
      if (onDelete) {
        onDelete();
      }
    } else {
      setIsConfirmingDelete(true);
      
      // Reset after 5 seconds if not confirmed
      setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 5000);
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
      onMarkAsSold({ ...editedCard, ...saleData });
    }
  };

  const handleSaleModalClose = () => {
    setIsConfirmingSold(false);
  };
  
  // Handle save action
  const handleSave = () => {
    if (onSave) {
      onSave(editedCard);
    }
  };
  
  // Create modal footer with action buttons
  const modalFooter = (
    <div className="flex justify-between items-center w-full">
      {/* Cancel button (always left) */}
      <Button variant="secondary" onClick={() => {
        setIsConfirmingDelete(false);
        setIsConfirmingSold(false);
        onClose();
      }} className="mr-auto md:mr-0">
        Cancel
      </Button>

      {/* Right-aligned buttons group */}
      <div className="flex items-center gap-2">
        {/* Delete Button (Icon on mobile) */}
        {onDelete && (
          <Button
            variant="danger"
            onClick={handleDelete}
            className={`transition-all duration-200 ${isConfirmingDelete ? 'bg-red-100 dark:bg-red-900/50' : ''}`}
          >
            <Icon name="delete" className="mr-0 md:mr-2" /> {/* Icon always visible */}
            <span className="hidden md:inline"> {/* Text hidden on mobile */}
              {isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}
            </span>
          </Button>
        )}

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
          setIsConfirmingDelete(false);
          setIsConfirmingSold(false);
          onClose();
        }}
        title="Card Details"
        size="4xl" // Use a larger size for desktop
        footer={modalFooter}
        position="right"
        className={`card-details-modal-instance ${animClass} ${className}`}
        closeOnClickOutside={!showEnlargedImage && !isConfirmingSold}
      >
        <div className="space-y-6 pb-4">
          {/* Notice and PriceChartingButton */}
          {!priceChartingProductId && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4 flex flex-col items-center text-center">
              <span className="text-yellow-700 dark:text-yellow-300 font-semibold mb-2">
                This card is not yet linked to a PriceCharting product.
              </span>
              <span className="text-yellow-600 dark:text-yellow-200 text-sm mb-3">
                To enable price history and recent sales features, please link this card to a PriceCharting product below.
              </span>
              <PriceChartingButton
                currentCardData={editedCard}
                onCardUpdate={updated => {
                  setEditedCard(updated);
                  if (onChange) onChange(updated);
                }}
                buttonText="Link to PriceCharting Product"
              />
            </div>
          )}
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
            {priceChartingProductId && (
              <button
                className={`px-4 py-2 ${activeTab === 'recent-sales' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('recent-sales')}
              >
                Recent Sales
              </button>
            )}
            <button
              className={`px-4 py-2 ${activeTab === 'ebay-sales' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('ebay-sales')}
            >
              eBay Sales
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <CardDetailsForm
              card={editedCard}
              cardImage={cardImage}
              imageLoadingState={localImageLoadingState}
              onChange={handleCardChange}
              onImageChange={handleImageChange}
              onImageRetry={onImageRetry}
              onImageClick={() => setShowEnlargedImage(true)}
              additionalValueContent={additionalValueContent}
              additionalSerialContent={additionalSerialContent}
            />
          )}

          {activeTab === 'price-history' && priceChartingProductId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Price History</h3>
                {card.priceChartingUrl && (
                  <a 
                    href={card.priceChartingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    View on PriceCharting <span className="ml-1">↗</span>
                  </a>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <PriceHistoryGraph 
                  productId={priceChartingProductId} 
                  condition={getPriceConditionType()}
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Price data provided by PriceCharting.com. Last updated: {card.lastPriceUpdate ? new Date(card.lastPriceUpdate).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          )}

          {activeTab === 'recent-sales' && priceChartingProductId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Sales</h3>
                {card.priceChartingUrl && (
                  <a 
                    href={card.priceChartingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    View on PriceCharting <span className="ml-1">↗</span>
                  </a>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <RecentSales 
                  productId={priceChartingProductId} 
                  productName={card?.priceChartingName || card?.name} 
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Sales data provided by PriceCharting.com. These are verified recent sales from various marketplaces.</p>
              </div>
            </div>
          )}

          {activeTab === 'ebay-sales' && card && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent eBay Sales</h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                {/* Pass the full card object for flexible search */}
                <EbaySales card={card} />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Sales data provided by eBay. These are recent completed listings matching your card details.</p>
              </div>
            </div>
          )}
          
          {/* Status message */}
          {saveMessage && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm transition-all ${
              saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix')
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : saveMessage === 'No changes to save'
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
          selectedCards={[editedCard]}
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
  additionalSerialContent: PropTypes.node
};

export default CardDetailsModal;
