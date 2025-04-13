import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import CardDetailsForm from './CardDetailsForm';
import '../styles/animations.css';

/**
 * CardDetailsModal Component
 * 
 * A specialized modal for viewing and editing Pokemon card details.
 */
const CardDetailsModal = ({
  isOpen,
  onClose,
  card,
  onSave,
  onDelete,
  onMarkAsSold,
  showAsStatic = false,
  className = ''
}) => {
  // State for edited card data
  const [editedCard, setEditedCard] = useState({
    ...card,
    year: card.year ? String(card.year) : '',
    investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                  (typeof card.investmentAUD === 'string' && !isNaN(parseFloat(card.investmentAUD))) ? 
                  parseFloat(card.investmentAUD) : 0,
    currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                    (typeof card.currentValueAUD === 'string' && !isNaN(parseFloat(card.currentValueAUD))) ? 
                    parseFloat(card.currentValueAUD) : 0,
    datePurchased: card.datePurchased || ''
  });
  
  // State for image handling
  const [cardImage, setCardImage] = useState(card.imageUrl || null);
  const [imageLoadingState, setImageLoadingState] = useState('idle');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  
  // State for form validation and UI feedback
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [saleDetails, setSaleDetails] = useState({
    buyer: '',
    finalValueAUD: editedCard.currentValueAUD || 0,
    dateSold: new Date().toISOString().split('T')[0]
  });
  const [animClass, setAnimClass] = useState('');
  
  // Refs
  const messageTimeoutRef = useRef(null);

  // Set animation class when open state changes
  useEffect(() => {
    if (isOpen) {
      setAnimClass('slide-in-right');
    } else {
      setAnimClass('slide-out-right');
    }
  }, [isOpen]);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setEditedCard({
        ...card,
        year: card.year ? String(card.year) : '',
        investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                      (typeof card.investmentAUD === 'string' && !isNaN(parseFloat(card.investmentAUD))) ? 
                      parseFloat(card.investmentAUD) : 0,
        currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                        (typeof card.currentValueAUD === 'string' && !isNaN(parseFloat(card.currentValueAUD))) ? 
                        parseFloat(card.currentValueAUD) : 0,
        datePurchased: card.datePurchased || ''
      });
      // Reset states
      setErrors({});
      setSaveMessage(null);
      setIsConfirmingDelete(false);
      setIsConfirmingSold(false);
      
      // Set card image from the card object - handle both imageUrl and db image source
      setCardImage(card.imageUrl || null);
      
      // If using a DB, you might need to fetch the image:
      if (!card.imageUrl && card.id) {
        // Check if we need to fetch an image from DB
        handleImageFetch(card.id);
      }
    }
    
    // Cleanup on unmount or when card changes
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [card]);
  
  // Function to fetch image from DB if needed
  const handleImageFetch = async (cardId) => {
    setImageLoadingState('loading');
    
    try {
      // Check if we have a DB service to load the image from
      if (window.db && typeof window.db.getCardImage === 'function') {
        const imageUrl = await window.db.getCardImage(cardId);
        if (imageUrl) {
          setCardImage(imageUrl);
        }
      }
      setImageLoadingState('idle');
    } catch (error) {
      console.error('Error fetching card image:', error);
      setImageLoadingState('error');
    }
  };
  
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
    setEditedCard(updatedCard);
    
    // Clear field error when user edits the field
    if (errors[Object.keys(updatedCard).find(key => updatedCard[key] !== editedCard[key])]) {
      setErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        delete updatedErrors[Object.keys(updatedCard).find(key => updatedCard[key] !== editedCard[key])];
        return updatedErrors;
      });
    }
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    // Card name is required
    if (!editedCard.card?.trim()) {
      newErrors.card = 'Card name is required';
    }
    
    // Serial number is required - we call it slabSerial
    if (!editedCard.slabSerial?.trim()) {
      newErrors.slabSerial = 'Serial number is required';
    }
    
    // If there are required fields, add custom validation here
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle save action
  const handleSave = () => {
    // Clear any previous message
    setSaveMessage(null);
    
    // Validate the form
    if (!validateForm()) {
      setSaveMessage('Please fix the errors before saving.');
      return;
    }
    
    // Check if anything changed
    const hasChanges = JSON.stringify(card) !== JSON.stringify(editedCard);
    if (!hasChanges) {
      setSaveMessage('No changes to save');
      messageTimeoutRef.current = setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
      return;
    }
    
    // Call the onSave callback with edited data
    onSave(editedCard, cardImage);
  };
  
  // Handle delete action
  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      
      // Auto-reset confirmation after 5 seconds
      messageTimeoutRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 5000);
    } else {
      // Confirmed delete
      onDelete(card.id);
      setIsConfirmingDelete(false);
    }
  };
  
  // Handle marking a card as sold
  const handleMarkAsSold = () => {
    if (!isConfirmingSold) {
      setIsConfirmingSold(true);
      return;
    }

    // Validate sale details
    const saleErrors = {};
    if (!saleDetails.buyer.trim()) {
      saleErrors.buyer = 'Buyer name is required';
    }
    if (!saleDetails.finalValueAUD || saleDetails.finalValueAUD <= 0) {
      saleErrors.finalValueAUD = 'A valid sale price is required';
    }
    if (!saleDetails.dateSold) {
      saleErrors.dateSold = 'Sale date is required';
    }

    if (Object.keys(saleErrors).length > 0) {
      setErrors({...errors, ...saleErrors});
      return;
    }

    // Calculate profit
    const investment = parseFloat(editedCard.investmentAUD) || 0;
    const saleValue = parseFloat(saleDetails.finalValueAUD) || 0;
    const profit = saleValue - investment;

    // Prepare the sold card data
    const soldCardData = {
      ...editedCard,
      buyer: saleDetails.buyer,
      dateSold: saleDetails.dateSold,
      finalValueAUD: saleValue,
      finalProfitAUD: profit,
      soldDate: new Date().toISOString()
    };

    // Call the onMarkAsSold handler with the sold card data
    if (typeof onMarkAsSold === 'function') {
      onMarkAsSold(soldCardData);
    }

    // Reset form state and close modal
    setIsConfirmingSold(false);
    onClose();
  };

  // Handle sale details change
  const handleSaleDetailsChange = (e) => {
    const { name, value } = e.target;
    setSaleDetails({
      ...saleDetails,
      [name]: name === 'finalValueAUD' ? parseFloat(value) || 0 : value
    });
  };
  
  // Create modal footer with action buttons
  const modalFooter = (
    <div className="w-full flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex items-center gap-2">
        {onDelete && !isConfirmingSold && (
          <Button
            variant="danger"
            onClick={handleDelete}
            className="min-w-[120px]"
          >
            {isConfirmingDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
        )}
        
        {onMarkAsSold && !isConfirmingDelete && (
          <Button
            variant="success" 
            onClick={handleMarkAsSold}
            className="min-w-[120px]"
          >
            {isConfirmingSold ? 'Confirm Sale' : 'Mark as Sold'}
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Cancel and Save buttons - right aligned */}
        <Button
          variant="secondary"
          onClick={() => {
            setIsConfirmingDelete(false);
            setIsConfirmingSold(false);
            onClose();
          }}
          className="min-w-[80px]"
        >
          Cancel
        </Button>
        
        {!isConfirmingSold && (
          <Button
            variant="primary"
            onClick={handleSave}
            className="min-w-[120px]"
          >
            Save Changes
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
        title={isConfirmingSold ? "Mark Card as Sold" : "Card Details"}
        footer={modalFooter}
        position="right"
        className={`${animClass} ${className}`}
        closeOnClickOutside={!showEnlargedImage && !isConfirmingSold} // Disable closing on outside click when image is enlarged or confirming sale
        showAsStatic={showAsStatic}
      >
        <div className="space-y-6 pb-4">
          {isConfirmingSold ? (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Please enter the sale details to mark this card as sold:
              </p>
              
              <div className="space-y-4 mb-6">
                {/* Buyer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    name="buyer"
                    value={saleDetails.buyer}
                    onChange={handleSaleDetailsChange}
                    className="w-full px-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter buyer name"
                  />
                  {errors.buyer && (
                    <p className="mt-1 text-sm text-red-500">{errors.buyer}</p>
                  )}
                </div>
                
                {/* Sale Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sale Price (AUD)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      name="finalValueAUD"
                      value={saleDetails.finalValueAUD}
                      onChange={handleSaleDetailsChange}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.finalValueAUD && (
                    <p className="mt-1 text-sm text-red-500">{errors.finalValueAUD}</p>
                  )}
                </div>
                
                {/* Sale Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Sold
                  </label>
                  <input
                    type="date"
                    name="dateSold"
                    value={saleDetails.dateSold}
                    onChange={handleSaleDetailsChange}
                    className="w-full px-3 py-2 rounded-lg border border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {errors.dateSold && (
                    <p className="mt-1 text-sm text-red-500">{errors.dateSold}</p>
                  )}
                </div>
                
                {/* Profit/Loss Preview */}
                <div className="bg-white dark:bg-[#0F0F0F] rounded-lg p-4 border border-[#ffffff33] dark:border-[#ffffff1a] mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Investment:</span>
                    <span className="font-medium">${parseFloat(editedCard.investmentAUD || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sale Price:</span>
                    <span className="font-medium">${parseFloat(saleDetails.finalValueAUD || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#ffffff33] dark:border-[#ffffff1a] my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit/Loss:</span>
                    <span className={`font-medium ${(parseFloat(saleDetails.finalValueAUD || 0) - parseFloat(editedCard.investmentAUD || 0)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${Math.abs(parseFloat(saleDetails.finalValueAUD || 0) - parseFloat(editedCard.investmentAUD || 0)).toFixed(2)}
                      {(parseFloat(saleDetails.finalValueAUD || 0) - parseFloat(editedCard.investmentAUD || 0)) >= 0 ? ' profit' : ' loss'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CardDetailsForm
              card={editedCard}
              cardImage={cardImage}
              imageLoadingState={imageLoadingState}
              onCardChange={handleCardChange}
              onImageChange={handleImageChange}
              onImageRetry={() => setImageLoadingState('idle')}
              onImageClick={() => cardImage && setShowEnlargedImage(true)}
              errors={errors}
            />
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
    </>
  );
};

CardDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  card: PropTypes.shape({
    id: PropTypes.string,
    card: PropTypes.string,
    player: PropTypes.string,
    set: PropTypes.string,
    year: PropTypes.string,
    category: PropTypes.string,
    condition: PropTypes.string,
    slabSerial: PropTypes.string,
    datePurchased: PropTypes.string,
    investmentAUD: PropTypes.number,
    currentValueAUD: PropTypes.number,
    imageUrl: PropTypes.string
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  onMarkAsSold: PropTypes.func,
  showAsStatic: PropTypes.bool,
  className: PropTypes.string
};

export default CardDetailsModal;
