import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import FormField from '../molecules/FormField';
import FormLabel from '../atoms/FormLabel';
import SelectField from '../atoms/SelectField';
import ImageUpload from '../atoms/ImageUpload';
import ImageUploadButton from '../atoms/ImageUploadButton';
import Icon from '../atoms/Icon';
import { gradients } from '../styles/colors';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import PSALookupButton from '../../components/PSALookupButton'; // Import PSALookupButton

/**
 * CardDetailsForm Component
 * 
 * A form specifically designed for editing Pokemon card details.
 */
const CardDetailsForm = ({ 
  card, 
  cardImage, 
  imageLoadingState,
  onChange,
  onImageChange,
  onImageRetry,
  onImageClick,
  errors = {},
  className = '',
  additionalValueContent,
  additionalSerialContent,
  collections = [],
  initialCollectionName = '' // Use initialCollectionName from modal if available
}) => {
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Parse condition string on load/change
  useEffect(() => {
    if (card?.condition) {
      const parts = card.condition.split(/\s+-\s+|\s+/); // Split by ' - ' or space
      const company = parts[0]?.toUpperCase();
      const grade = parts.slice(1).join(' '); // Join remaining parts for grade

      // Define grading companies here to ensure they're available
      const gradingCompaniesArray = [
        { value: '', label: 'Select Company...' },
        { value: 'RAW', label: 'Raw/Ungraded' },
        { value: 'PSA', label: 'PSA' },
        { value: 'BGS', label: 'BGS' },
        { value: 'CGC', label: 'CGC' },
        { value: 'SGC', label: 'SGC' },
      ];

      if (gradingCompaniesArray.some(c => c.value === company)) {
        setSelectedCompany(company);
        setSelectedGrade(grade || '');
      } else {
        // Handle cases where company might not be standard (e.g., just 'Mint')
        setSelectedCompany('RAW'); // Assume Raw if no standard company prefix
        setSelectedGrade(card.condition);
      }
    } else {
      setSelectedCompany('RAW'); // Default to Raw
      setSelectedGrade('');
    }
  }, [card?.condition]);

  // Handle text field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (onChange) {
      onChange({
        ...card,
        [name]: value
      });
    }
  };

  // Handle number field changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    if (onChange) {
      // Store the raw value in the card object, conversion will happen when needed
      onChange({
        ...card,
        [name]: value === '' ? '' : parseFloat(value)
      });
    }
  };

  // Calculate profit safely
  const getProfit = () => {
    const investment = card.investmentAUD === '' ? 0 : parseFloat(card.investmentAUD) || 0;
    const currentValue = card.currentValueAUD === '' ? 0 : parseFloat(card.currentValueAUD) || 0;
    return currentValue - investment;
  };

  // --- Dropdown Options ---
  const gradingCompanies = [
    { value: '', label: 'Select Company...' },
    { value: 'RAW', label: 'Raw/Ungraded' },
    { value: 'PSA', label: 'PSA' },
    { value: 'BGS', label: 'BGS' },
    { value: 'CGC', label: 'CGC' },
    { value: 'SGC', label: 'SGC' },
  ];

  const rawConditions = [
    { value: '', label: 'Select Condition...' },
    { value: 'Mint', label: 'Mint (MT)' },
    { value: 'Near Mint', label: 'Near Mint (NM)' },
    { value: 'Excellent', label: 'Excellent (EX)' },
    { value: 'Very Good', label: 'Very Good (VG)' },
    { value: 'Good', label: 'Good (G)' },
    { value: 'Poor', label: 'Poor (P)' },
  ];

  const gradedConditions = [
    { value: '', label: 'Select Grade...' },
    { value: '10', label: '10' },
    { value: '9.5', label: '9.5' },
    { value: '9', label: '9' },
    { value: '8.5', label: '8.5' },
    { value: '8', label: '8' },
    { value: '7.5', label: '7.5' },
    { value: '7', label: '7' },
    { value: '6.5', label: '6.5' },
    { value: '6', label: '6' },
    { value: '5.5', label: '5.5' },
    { value: '5', label: '5' },
    { value: '4.5', label: '4.5' },
    { value: '4', label: '4' },
    { value: '3.5', label: '3.5' },
    { value: '3', label: '3' },
    { value: '2.5', label: '2.5' },
    { value: '2', label: '2' },
    { value: '1.5', label: '1.5' },
    { value: '1', label: '1' },
    { value: 'Authentic', label: 'Authentic' },
    { value: 'Authentic Altered', label: 'Authentic Altered' },
  ];

  const cardCategories = [
    { value: '', label: 'Select Category...' },
    { value: 'Pokemon', label: 'Pokémon' },
    { value: 'YuGiOh', label: 'Yu-Gi-Oh!' },
    { value: 'MagicTheGathering', label: 'Magic: The Gathering' },
    { value: 'DragonBallZ', label: 'Dragon Ball Z' },
    { value: 'OnePiece', label: 'One Piece' },
    { value: 'NHL', label: 'NHL' },
    { value: 'NBL', label: 'NBL' },
    { value: 'EPL', label: 'EPL' },
    { value: 'F1', label: 'F1' },
    { value: 'WWE', label: 'WWE' },
    { value: 'Other', label: 'Other TCG/CCG' },
  ];

  const currentGradeOptions = selectedCompany === 'RAW' ? rawConditions : gradedConditions;

  // --- Dropdown Handlers ---
  const handleCompanyChange = (e) => {
    const newCompany = e.target.value;
    setSelectedCompany(newCompany);
    // Reset grade if company changes, unless switching between graded types
    const isNewCompanyGraded = newCompany !== 'RAW';
    const isOldCompanyGraded = selectedCompany !== 'RAW';
    let newGrade = selectedGrade;
    if (isNewCompanyGraded !== isOldCompanyGraded) {
        newGrade = ''; // Reset grade if switching between Raw and Graded
        setSelectedGrade('');
    }
    updateCondition(newCompany, newGrade);
  };

  const handleGradeChange = (e) => {
    const newGrade = e.target.value;
    setSelectedGrade(newGrade);
    updateCondition(selectedCompany, newGrade);
  };

  const updateCondition = (company, grade) => {
    if (!onChange) return;
    let newConditionString = '';
    if (company && company !== 'RAW') {
      newConditionString = `${company} ${grade || ''}`.trim();
    } else if (grade) { // For RAW
      newConditionString = grade; // Just use the descriptive condition for Raw
    }
    
    onChange({ ...card, condition: newConditionString });
  };

  // Handle collection change
  const handleCollectionChange = (e) => {
    const { name, value } = e.target;
    if (onChange) {
      onChange({
        ...card,
        collectionId: value // Change to collectionId instead of collectionName
      });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="space-y-4">
        {/* Card Image Upload */}
        <div className="mb-4">
          <FormLabel>Card Image</FormLabel>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto max-w-[200px] mx-auto sm:mx-0">
              <ImageUpload
                imageUrl={cardImage}
                loadingState={imageLoadingState}
                onImageChange={onImageChange}
                onRetry={onImageRetry}
                onClick={onImageClick}
                className="w-full h-auto aspect-[2/3] rounded-lg overflow-hidden"
              />
            </div>
            
            <div className="flex-1 w-full">
              {/* Collection Selection - Moved up for better mobile visibility */}
              <div className="mb-4">
                <FormLabel htmlFor="collection">Collection</FormLabel>
                <SelectField
                  id="collection"
                  name="collection"
                  value={card.collectionId || initialCollectionName || ''}
                  onChange={handleCollectionChange}
                  error={errors.collection}
                >
                  <option value="">Select Collection...</option>
                  {collections.map(collection => (
                    <option key={collection} value={collection}>{collection}</option>
                  ))}
                </SelectField>
              </div>
              
              {/* Card Name & Player - Stacked vertically on mobile */}
              <div className="grid grid-cols-1 gap-4 mb-4">
                <FormField
                  label="Card Name"
                  name="card"
                  value={card.card || ''}
                  onChange={handleInputChange}
                  error={errors.card}
                  required
                />
                
                <FormField
                  label="Player/Character"
                  name="player"
                  value={card.player || ''}
                  onChange={handleInputChange}
                  error={errors.player}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Card Details - Always single column on mobile */}
        <div className="grid grid-cols-1 gap-4 mb-4">
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
        </div>
        
        {/* Condition Selection - Improved mobile layout */}
        <div className="mb-4">
          <FormLabel>Condition</FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              name="gradingCompany"
              value={selectedCompany}
              onChange={handleCompanyChange}
              error={errors.condition}
            >
              {gradingCompanies.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectField>
            
            <SelectField
              name="grade"
              value={selectedGrade}
              onChange={handleGradeChange}
              error={errors.grade}
              disabled={!selectedCompany}
            >
              {selectedCompany === 'RAW' 
                ? rawConditions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))
                : gradedConditions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))
              }
            </SelectField>
          </div>
        </div>
        
        {/* Financial Details - Always single column on mobile */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <FormField
            label="Paid (AUD)"
            name="investmentAUD"
            type="number"
            prefix="$"
            value={card.investmentAUD}
            onChange={handleNumberChange}
            error={errors.investmentAUD}
          />
          
          <div className="relative">
            <FormField
              label="Current Value (AUD)"
              name="currentValueAUD"
              type="number"
              prefix="$"
              value={card.currentValueAUD}
              onChange={handleNumberChange}
              error={errors.currentValueAUD}
            />
            {additionalValueContent && (
              <div className="mt-2">
                {additionalValueContent}
              </div>
            )}
          </div>
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
        
        {/* Price History Chart - directly below profit/loss */}
        <div className="mt-4">
          {card.priceChartingProductId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-2">
              <PriceHistoryGraph 
                productId={card.priceChartingProductId} 
                condition={selectedCompany === 'RAW' ? 'loose' : 'graded'} // Adjust condition based on selected company
              />
            </div>
          )}
          {card.priceChartingUrl && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              <p>Price data provided by PriceCharting.com. Last updated: {card.lastPriceUpdate ? new Date(card.lastPriceUpdate).toLocaleString() : 'Unknown'}</p>
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
    population: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Changed to accept string or number
    slabSerial: PropTypes.string,
    datePurchased: PropTypes.string,
    investmentAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    currentValueAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    psaUrl: PropTypes.string,
    priceChartingUrl: PropTypes.string,
    priceChartingProductId: PropTypes.string,
    lastPriceUpdate: PropTypes.string,
    quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    collectionId: PropTypes.string // Change to collectionId instead of collectionName
  }).isRequired,
  cardImage: PropTypes.string,
  imageLoadingState: PropTypes.oneOf(['idle', 'loading', 'error']),
  onChange: PropTypes.func.isRequired,
  onImageChange: PropTypes.func.isRequired,
  onImageRetry: PropTypes.func,
  onImageClick: PropTypes.func,
  errors: PropTypes.object,
  className: PropTypes.string,
  additionalValueContent: PropTypes.node,
  additionalSerialContent: PropTypes.node,
  collections: PropTypes.arrayOf(PropTypes.string),
  initialCollectionName: PropTypes.string
};

export default CardDetailsForm;
