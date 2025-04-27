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
    { value: '6', label: '6' },
    { value: '5', label: '5' },
    { value: '4', label: '4' },
    { value: '3', label: '3' },
    { value: '2', label: '2' },
    { value: '1', label: '1' },
    { value: 'A', label: 'A (Authentic)' },
  ];

  // --- Dropdown Handlers ---
  const handleCompanyChange = (e) => {
    const company = e.target.value;
    setSelectedCompany(company);
    
    // Reset grade when company changes
    if (company === 'RAW') {
      setSelectedGrade('');
    } else {
      setSelectedGrade('');
    }
    
    // Update the condition in the card object
    updateCondition(company, '');
  };

  const handleGradeChange = (e) => {
    const grade = e.target.value;
    setSelectedGrade(grade);
    updateCondition(selectedCompany, grade);
  };

  const updateCondition = (company, grade) => {
    let condition = '';
    if (company === 'RAW') {
      condition = grade; // For raw cards, just use the grade (e.g., "Mint")
    } else if (company && grade) {
      condition = `${company} ${grade}`; // For graded cards, combine (e.g., "PSA 10")
    } else if (company) {
      condition = company; // If only company is selected
    }
    
    onChange({ ...card, condition });
  };

  // Handle collection change
  const handleCollectionChange = (e) => {
    const collectionId = e.target.value;
    if (onChange) {
      onChange({
        ...card,
        collectionId,
        // For backward compatibility, also update the collection field
        collection: collectionId
      });
    }
  };

  return (
    <div className={`card-details-form ${className}`}>
      {/* Collection Dropdown - Always at the top */}
      <div className="mb-6">
        <SelectField
          label="Collection"
          name="collectionId"
          value={card.collectionId || ''}
          onChange={handleCollectionChange}
          error={errors.collectionId}
          required
        >
          <option value="">Select Collection...</option>
          {collections.map(collection => (
            <option key={collection} value={collection}>
              {collection}
            </option>
          ))}
        </SelectField>
      </div>

      {/* Card Image and Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card Image Column */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Image</h3>
          <div className="relative">
            <div 
              className="relative overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center w-full"
              style={{ height: '300px', width: '100%', maxWidth: '220px', margin: '0 auto' }}
            >
              {imageLoadingState === 'loading' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : imageLoadingState === 'error' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900/20">
                  <Icon name="error" className="text-red-500 text-4xl mb-2" />
                  <p className="text-red-600 dark:text-red-400 mb-2">Failed to load image</p>
                  {onImageRetry && (
                    <button 
                      onClick={onImageRetry}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/30"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : null}
              
              {cardImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={cardImage} 
                    alt="Card preview" 
                    className="max-h-[280px] max-w-full h-auto object-contain cursor-pointer"
                    onClick={onImageClick}
                    onError={(e) => {
                      console.log('Image failed to load:', e);
                      if (onImageRetry) onImageRetry();
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Icon name="image" className="text-gray-400 text-4xl mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No image available</p>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex justify-center">
              <ImageUploadButton onChange={onImageChange} />
            </div>
            
            {/* PSA Lookup Button */}
            <div className="mt-3">
              <button 
                onClick={() => {}} 
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Icon name="search" className="mr-2" />
                Search PSA
              </button>
            </div>
            
            {/* Profit/Loss Display - Moved under the image */}
            {(typeof card.investmentAUD === 'number' || typeof card.investmentAUD === 'string') && 
             (typeof card.currentValueAUD === 'number' || typeof card.currentValueAUD === 'string') && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit/Loss:</span>
                <span className={`font-medium ${getProfit() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${Math.abs(getProfit()).toFixed(2)} {getProfit() >= 0 ? 'profit' : 'loss'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Card Information Column */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Information</h3>
          
          {/* Two-column grid for card details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormField
                label="Player"
                name="player"
                value={card.player || ''}
                onChange={handleInputChange}
                error={errors.player}
              />
            </div>
            <div>
              <FormField
                label="Card Name"
                name="card"
                value={card.card || ''}
                onChange={handleInputChange}
                error={errors.card}
                required
              />
            </div>
            <div>
              <FormField
                label="Set"
                name="set"
                value={card.set || ''}
                onChange={handleInputChange}
                error={errors.set}
                required
              />
            </div>
            <div>
              <FormField
                label="Year"
                name="year"
                value={card.year || ''}
                onChange={handleInputChange}
                error={errors.year}
              />
            </div>
            <div>
              <SelectField
                label="Category"
                name="category"
                value={card.category || ''}
                onChange={handleInputChange}
                error={errors.category}
                required
              >
                <option value="">Select Category...</option>
                <option value="Pokémon">Pokémon</option>
                <option value="Trainer">Trainer</option>
                <option value="Energy">Energy</option>
                <option value="Other">Other</option>
              </SelectField>
            </div>
            <div>
              <SelectField
                label="Collection"
                name="collectionId"
                value={card.collectionId || ''}
                onChange={handleCollectionChange}
                error={errors.collectionId}
                required
              >
                <option value="">Select Collection...</option>
                {collections.map(collection => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <SelectField
                label="Grading Company"
                name="gradingCompany"
                value={selectedCompany}
                onChange={handleCompanyChange}
                error={errors.condition}
                required
              >
                {gradingCompanies.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <SelectField
                label="Grade"
                name="grade"
                value={selectedGrade}
                onChange={handleGradeChange}
                error={errors.condition}
                disabled={!selectedCompany}
              >
                {(selectedCompany === 'RAW' ? rawConditions : gradedConditions).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FormField
                label="Population"
                name="population"
                value={card.population ? String(card.population) : ''}
                onChange={handleInputChange}
                error={errors.population}
              />
            </div>
            <div className="relative">
              <FormField
                label="Serial Number"
                name="slabSerial"
                value={card.slabSerial || ''}
                onChange={handleInputChange}
                error={errors.slabSerial}
              />
              {additionalSerialContent && (
                <div className="absolute right-2 top-8">
                  {additionalSerialContent}
                </div>
              )}
            </div>
            <div>
              <FormField
                label="Date Purchased"
                name="datePurchased"
                type="date"
                value={card.datePurchased || ''}
                onChange={handleInputChange}
                error={errors.datePurchased}
              />
            </div>
            <div>
              <FormField
                label="Quantity"
                name="quantity"
                type="number"
                value={card.quantity ? String(card.quantity) : '1'}
                onChange={handleInputChange}
                error={errors.quantity}
                min={1}
              />
            </div>
          </div>
          
          {/* Financial Details Section */}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-6 mb-4">Financial Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormField
                label="Paid (AUD)"
                name="investmentAUD"
                type="number"
                prefix="$"
                value={card.investmentAUD || ''}
                onChange={handleNumberChange}
                error={errors.investmentAUD}
              />
            </div>
            <div>
              <FormField
                label="Current Value (AUD)"
                name="currentValueAUD"
                type="number"
                prefix="$"
                value={card.currentValueAUD || ''}
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
