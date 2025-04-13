import React from 'react';
import PropTypes from 'prop-types';
import FormField from '../molecules/FormField';
import ImageUpload from '../atoms/ImageUpload';
import ImageUploadButton from '../atoms/ImageUploadButton';
import Icon from '../atoms/Icon';
import { gradients } from '../styles/colors';

/**
 * CardDetailsForm Component
 * 
 * A form specifically designed for editing Pokemon card details.
 */
const CardDetailsForm = ({ 
  card, 
  cardImage, 
  imageLoadingState,
  onCardChange,
  onImageChange,
  onImageRetry,
  onImageClick,
  errors = {},
  className = ''
}) => {
  // Handle text field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onCardChange({
      ...card,
      [name]: value
    });
  };

  // Handle number field changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Store the raw value in the card object, conversion will happen when needed
    onCardChange({
      ...card,
      [name]: value === '' ? '' : value
    });
  };

  // Calculate profit safely
  const getProfit = () => {
    const investment = typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                      (typeof card.investmentAUD === 'string' ? parseFloat(card.investmentAUD) || 0 : 0);
    
    const currentValue = typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                        (typeof card.currentValueAUD === 'string' ? parseFloat(card.currentValueAUD) || 0 : 0);
    
    const investmentFloat = isNaN(investment) ? 0 : investment;
    const currentValueFloat = isNaN(currentValue) ? 0 : currentValue;

    return currentValueFloat - investmentFloat;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:gap-6">
        {/* Card Image Section */}
        <div className="w-full md:w-1/3 mb-6 md:mb-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Card Image</h3>
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[240px] h-[280px] mx-auto border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg overflow-hidden mb-3">
              {imageLoadingState === 'loading' ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1A] rounded-lg">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-[#ef4444] border-t-transparent rounded-full mb-2"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
                  </div>
                </div>
              ) : imageLoadingState === 'error' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1A1A1A] rounded-lg">
                  <Icon name="error_outline" size="lg" className="text-red-500 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-3">Failed to load image</span>
                  <button 
                    onClick={onImageRetry}
                    className="px-4 py-2 bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white rounded-full text-sm hover:opacity-90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : cardImage ? (
                <div 
                  className="w-full h-full cursor-pointer flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1A]" 
                  onClick={onImageClick}
                >
                  <img
                    src={cardImage}
                    alt="Card"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1A1A1A] rounded-lg">
                  <Icon name="image" size="xl" className="text-gray-400 dark:text-gray-500 mb-3" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">No image available</span>
                </div>
              )}
            </div>
            
            {/* Separate Upload Button */}
            <ImageUploadButton onImageChange={onImageChange} />
          </div>
        </div>

        {/* Card Information Section */}
        <div className="w-full md:w-2/3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Card Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Player"
              name="player"
              value={card.player || ''}
              onChange={handleInputChange}
              error={errors.player}
            />
            
            <FormField
              label="Card Name"
              name="card"
              value={card.card || ''}
              onChange={handleInputChange}
              error={errors.card}
              required
            />
            
            <FormField
              label="Set"
              name="set"
              value={card.set || ''}
              onChange={handleInputChange}
              error={errors.set}
            />
            
            <FormField
              label="Year"
              name="year"
              value={card.year || ''}
              onChange={handleInputChange}
              error={errors.year}
            />
            
            <FormField
              label="Category"
              name="category"
              value={card.category || ''}
              onChange={handleInputChange}
              error={errors.category}
            />
            
            <FormField
              label="Condition"
              name="condition"
              value={card.condition || ''}
              onChange={handleInputChange}
              error={errors.condition}
            />
            
            <FormField
              label="Population"
              name="population"
              value={card.population || ''}
              onChange={handleInputChange}
              error={errors.population}
              type="number"
              placeholder="Card population count"
            />
            
            <FormField
              label="Serial Number"
              name="slabSerial"
              value={card.slabSerial || ''}
              onChange={handleInputChange}
              error={errors.slabSerial}
              required
            />
            
            <FormField
              label="Date Purchased"
              name="datePurchased"
              type="date"
              value={card.datePurchased || ''}
              onChange={handleInputChange}
              error={errors.datePurchased}
            />
          </div>

          {/* Financial Details Section */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 mt-6">Financial Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              label="Paid (AUD)"
              name="investmentAUD"
              type="number"
              prefix="$"
              value={typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                     (typeof card.investmentAUD === 'string' && !isNaN(parseFloat(card.investmentAUD))) ? 
                     parseFloat(card.investmentAUD) : 0}
              onChange={handleNumberChange}
              error={errors.investmentAUD}
            />
            
            <FormField
              label="Current Value (AUD)"
              name="currentValueAUD"
              type="number"
              prefix="$"
              value={typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                     (typeof card.currentValueAUD === 'string' && !isNaN(parseFloat(card.currentValueAUD))) ? 
                     parseFloat(card.currentValueAUD) : 0}
              onChange={handleNumberChange}
              error={errors.currentValueAUD}
            />
          </div>

          {(typeof card.investmentAUD === 'number' || typeof card.investmentAUD === 'string') && 
           (typeof card.currentValueAUD === 'number' || typeof card.currentValueAUD === 'string') && (
            <div className="bg-white dark:bg-[#0F0F0F] rounded-lg p-3 border border-[#ffffff33] dark:border-[#ffffff1a] flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Profit/Loss:</span>
              <span className={`font-medium ${getProfit() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${Math.abs(getProfit()).toFixed(2)}
                {getProfit() >= 0 ? ' profit' : ' loss'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

CardDetailsForm.propTypes = {
  card: PropTypes.shape({
    card: PropTypes.string,
    player: PropTypes.string,
    set: PropTypes.string,
    year: PropTypes.string,
    category: PropTypes.string,
    condition: PropTypes.string,
    population: PropTypes.string,
    slabSerial: PropTypes.string,
    datePurchased: PropTypes.string,
    investmentAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    currentValueAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired,
  cardImage: PropTypes.string,
  imageLoadingState: PropTypes.oneOf(['idle', 'loading', 'error']),
  onCardChange: PropTypes.func.isRequired,
  onImageChange: PropTypes.func.isRequired,
  onImageRetry: PropTypes.func,
  onImageClick: PropTypes.func,
  errors: PropTypes.object,
  className: PropTypes.string
};

export default CardDetailsForm;
