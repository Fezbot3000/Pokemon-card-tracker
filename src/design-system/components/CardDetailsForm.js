import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import db from '../../services/db';
import cardRepo from '../../services/cardRepo';
import FormField from '../molecules/FormField';
import FormLabel from '../atoms/FormLabel';
import SelectField from '../atoms/SelectField';
import ImageUpload from '../atoms/ImageUpload';
import ImageUploadButton from '../atoms/ImageUploadButton';
import Icon from '../atoms/Icon';
import { gradients } from '../styles/colors';
import PriceHistoryGraph from '../../components/PriceHistoryGraph';
import PSALookupButton from '../../components/PSALookupButton'; 
import { getAllPokemonSets, getPokemonSetsByYear, addCustomSet } from '../../data/pokemonSets';
import '../styles/formFixes.css'; // Import the new CSS fixes

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
  initialCollectionName = '', // Use initialCollectionName from modal if available
  hideCollectionField = false,
  onPsaSearch,
  isPsaSearching = false,
  hidePsaSearchButton = false
}) => {
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [availableSets, setAvailableSets] = useState([]);
  
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

  // Handle direct updates to gradingCompany and grade fields
  useEffect(() => {
    // If both gradingCompany and grade are set directly, update the dropdowns
    if (card?.gradingCompany && card?.grade) {
      console.log('Direct update to gradingCompany and grade:', card.gradingCompany, card.grade);
      setSelectedCompany(card.gradingCompany);
      setSelectedGrade(card.grade);
    }
  }, [card?.gradingCompany, card?.grade]);

  // Effect to update available sets when year or category changes
  useEffect(() => {
    if (card.year) {
      const sets = getPokemonSetsByYear(card.year);
      setAvailableSets(sets);
    } else {
      setAvailableSets(getAllPokemonSets());
    }
  }, [card.year]);

  // Handle input changes for all form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle the special case for adding a custom set
    if (name === 'setName' && value === '__add_custom__') {
      const customSet = prompt('Enter the name of the custom set:');
      if (customSet && customSet.trim() !== '') {
        // Get the current year from the form
        const currentYear = card.year || "2024"; // Default to 2024 if no year is selected
        
        // Add the custom set to the database with the current year
        const newSet = handleAddCustomSet(customSet.trim(), currentYear);
        
        // Update the card with the new set
        if (onChange) {
          onChange({
            ...card,
            [name]: newSet
          });
        }
        
        // Force refresh the available sets list to include the new set
        setTimeout(() => {
          if (card.year) {
            const updatedSets = getPokemonSetsByYear(card.year);
            console.log('Updated sets for year', card.year, ':', updatedSets);
            setAvailableSets(updatedSets);
          } else {
            const allSets = getAllPokemonSets();
            console.log('All updated sets:', allSets);
            setAvailableSets(allSets);
          }
        }, 100);
      } else {
        // If the user cancels or enters an empty string, revert to previous value
        e.target.value = card.setName || '';
      }
      return;
    }
    
    // Special handling for year changes to update available sets
    if (name === 'year' && value) {
      // Update available sets when year changes
      const yearSets = getPokemonSetsByYear(value);
      console.log(`Sets for year ${value}:`, yearSets);
      setAvailableSets(yearSets);
    }
    
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
        [name]: value === '' ? '' : value
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

  const psaGrades = [
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

  const bgsGrades = [
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

  const cgcGrades = [
    { value: '', label: 'Select Grade...' },
    { value: '10', label: '10' },
    { value: '9.8', label: '9.8' },
    { value: '9.6', label: '9.6' },
    { value: '9.4', label: '9.4' },
    { value: '9.2', label: '9.2' },
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

  const sgcGrades = [
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

  // Define card categories
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
    { value: 'Trainer', label: 'Trainer' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Other', label: 'Other TCG/CCG' },
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

  // Custom styles for select options
  const selectStyles = {
    option: {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '8px 12px'
    }
  };

  // Handle the addition of a new custom set
  const handleAddCustomSet = (newSet, year) => {
    if (!newSet || newSet.trim() === '') return '';
    
    console.log(`Adding custom set "${newSet}" for year ${year}`);
    
    // Add the custom set
    const addedSet = addCustomSet(newSet, year);
    console.log(`Custom set added: ${addedSet}`);
    
    // Update available sets
    if (card.year) {
      const updatedSets = getPokemonSetsByYear(card.year);
      console.log(`Updated sets for year ${card.year} after adding:`, updatedSets);
      setAvailableSets(updatedSets);
    } else {
      const allSets = getAllPokemonSets();
      console.log('All sets after adding:', allSets);
      setAvailableSets(allSets);
    }
    
    // Return the added set name
    return addedSet;
  };

  return (
    <div className={`card-details-form ${className}`}>
      {/* Collection Dropdown - Always at the top */}
      {!hideCollectionField && (
        <div className="mb-6 mt-12"> {/* Added significant top margin (mt-12) to create space below the header tabs */}
          <SelectField
            label="Collection"
            name="collectionId"
            value={card.collectionId || ''}
            onChange={handleCollectionChange}
            error={errors.collectionId}
            required
          >
            <option value="">Select Collection...</option>
            {collections
              .filter(collection => collection !== 'sold') // Filter out the 'sold' collection
              .map(collection => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))
            }
          </SelectField>
        </div>
      )}

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
              <ImageUploadButton onImageChange={onImageChange} />
            </div>
            
            {/* PSA Lookup Button */}
            {!hidePsaSearchButton && (
              <div className="mt-3 space-y-2">
                <button 
                  onClick={() => onPsaSearch && onPsaSearch(card.slabSerial)} 
                  className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isPsaSearching || !card.slabSerial}
                  title={!card.slabSerial ? "Enter a serial number first" : "Search PSA database"}
                >
                  {isPsaSearching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Icon name="search" className="mr-2" />
                      Search PSA
                    </>
                  )}
                </button>
                
                {/* PSA Website Link - Show if PSA URL exists */}
                {card.psaUrl && (
                  <a
                    href={card.psaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:opacity-90 shadow-sm"
                  >
                    <Icon name="open_in_new" className="mr-2" />
                    View on PSA Website
                  </a>
                )}
              </div>
            )}
            
            {/* Profit/Loss Display - Moved under the image */}
            {(typeof card.investmentAUD === 'number' || typeof card.investmentAUD === 'string') && 
             (typeof card.currentValueAUD === 'number' || typeof card.currentValueAUD === 'string') && (
              <div 
                className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                data-component-name="CardDetailsForm"
              >
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Profit/Loss:</span>
                <span 
                  className={`font-medium ${getProfit() >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
                  data-component-name="CardDetailsForm"
                >
                  ${Math.abs(getProfit()).toFixed(2)} {getProfit() >= 0 ? 'profit' : 'loss'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Card Information Column */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Details</h3>
          <div className="financial-details-grid">
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label="Paid (AUD)"
                  name="investmentAUD"
                  type="number"
                  prefix="$"
                  value={typeof card.investmentAUD === 'number' ? String(card.investmentAUD) : (card.investmentAUD || '')}
                  onChange={handleNumberChange}
                  error={errors.investmentAUD}
                />
              </div>
            </div>
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label="Current Value (AUD)"
                  name="currentValueAUD"
                  type="number"
                  prefix="$"
                  value={typeof card.currentValueAUD === 'number' ? String(card.currentValueAUD) : (card.currentValueAUD || '')}
                  onChange={handleNumberChange}
                  error={errors.currentValueAUD}
                />
              </div>
              {additionalValueContent && (
                <div className="mt-2">
                  {additionalValueContent}
                </div>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-8 mb-4">Card Details</h3>
          
          {/* Two-column grid for card details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <FormField
                label="Player"
                name="player"
                value={card.player || ''}
                onChange={handleInputChange}
                error={errors.player}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
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
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <FormLabel htmlFor="setName">Set</FormLabel>
              <div className="relative">
                <select
                  id="setName"
                  name="setName"
                  value={card.setName || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-md ${
                    errors.setName ? 'border-red-500' : 'border-[#ffffff33] dark:border-[#ffffff1a]'
                  } bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10`}
                  data-component-name="CardDetailsForm"
                >
                  <option value="">Select Set...</option>
                  {availableSets.map(set => (
                    <option key={set} value={set}>{set}</option>
                  ))}
                  <option value="__add_custom__">+ Add Custom Set...</option>
                </select>
                {/* Custom dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <FormField
                label="Year"
                name="year"
                value={card.year || ''}
                onChange={handleInputChange}
                error={errors.year}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <SelectField
                label="Category"
                name="category"
                value={card.category || ''}
                onChange={handleInputChange}
                error={errors.category}
                required
              >
                {cardCategories.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="form-label-nowrap">
                <FormLabel htmlFor="gradingCompany">Grading Company</FormLabel>
                <div className="relative">
                  <select
                    id="gradingCompany"
                    value={selectedCompany}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-2 border rounded-md border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                    data-component-name="CardDetailsForm"
                  >
                    {gradingCompanies.map(company => (
                      <option key={company.value} value={company.value}>{company.label}</option>
                    ))}
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="form-label-nowrap">
                <FormLabel htmlFor="grade">Grade</FormLabel>
                <div className="relative">
                  <select
                    id="grade"
                    value={selectedGrade}
                    onChange={handleGradeChange}
                    className="w-full px-4 py-2 border rounded-md border-[#ffffff33] dark:border-[#ffffff1a] bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                    data-component-name="CardDetailsForm"
                  >
                    {selectedCompany === 'RAW' ? (
                      rawConditions.map(condition => (
                        <option key={condition.value} value={condition.value}>{condition.label}</option>
                      ))
                    ) : selectedCompany === 'PSA' ? (
                      psaGrades.map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))
                    ) : selectedCompany === 'BGS' ? (
                      bgsGrades.map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))
                    ) : selectedCompany === 'CGC' ? (
                      cgcGrades.map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))
                    ) : selectedCompany === 'SGC' ? (
                      sgcGrades.map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))
                    ) : (
                      <option value="">Select Grade...</option>
                    )}
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label="Serial Number"
                  name="slabSerial"
                  value={card.slabSerial || ''}
                  onChange={handleInputChange}
                  error={errors.slabSerial}
                />
              </div>
              {additionalSerialContent && (
                <div className="absolute right-2 top-8">
                  {additionalSerialContent}
                </div>
              )}
            </div>
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label="Population"
                  name="population"
                  value={typeof card.population === 'number' ? String(card.population) : (card.population || '')}
                  onChange={handleInputChange}
                  error={errors.population}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label="Date Purchased"
                  name="datePurchased"
                  type="date"
                  value={card.datePurchased || ''}
                  onChange={handleInputChange}
                  error={errors.datePurchased}
                />
              </div>
            </div>
            <div>
              <div className="form-label-nowrap">
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
  initialCollectionName: PropTypes.string,
  hideCollectionField: PropTypes.bool,
  onPsaSearch: PropTypes.func,
  isPsaSearching: PropTypes.bool,
  hidePsaSearchButton: PropTypes.bool
};

export default CardDetailsForm;
