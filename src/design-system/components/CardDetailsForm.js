import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import db from '../../services/firestore/dbAdapter';
import cardRepo from '../../services/cardRepo';
import FormField from '../molecules/FormField';
import FormLabel from '../atoms/FormLabel';
import SelectField from '../atoms/SelectField';
import ImageUpload from '../atoms/ImageUpload';
import ImageUploadButton from '../atoms/ImageUploadButton';
import Icon from '../atoms/Icon';
import { gradients } from '../styles/colors';
import PSALookupButton from '../../components/PSALookupButton'; 
import { getAllPokemonSets, getPokemonSetsByYear, getSetsByCategory, addCustomSet, getAvailableYears } from '../../data/pokemonSets';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useSubscription } from '../../hooks/useSubscription';
import '../styles/formFixes.css'; 

const cardCategories = [
  { value: 'pokemon', label: 'Pokemon' },
  { value: 'magicTheGathering', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh' },
  { value: 'digimon', label: 'Digimon' },
  { value: 'onePiece', label: 'One Piece' },
  { value: 'dragonBallZ', label: 'Dragon Ball Z' },
  { value: 'nba', label: 'NBA' },
  { value: 'nfl', label: 'NFL' },
  { value: 'mlb', label: 'MLB/Baseball' },
  { value: 'nrl', label: 'NRL' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'ufc', label: 'UFC' },
  { value: 'f1', label: 'Formula 1' },
  { value: 'marvel', label: 'Marvel' },
  { value: 'wwe', label: 'WWE' },
  { value: 'sports', label: 'Other Sports' },
  { value: 'other', label: 'Other' },
  // Add more categories as needed
];



const gradingCompanies = [
  { value: '', label: 'Select Company...' },
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'BGS (Beckett)' },
  { value: 'CGC', label: 'CGC' },
  { value: 'SGC', label: 'SGC' },
  { value: 'RAW', label: 'Raw/Ungraded' },
];

const rawConditions = [
  { value: '', label: 'Select Condition...' },
  { value: 'Mint', label: 'Mint' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Played', label: 'Played' },
  { value: 'Poor', label: 'Poor' },
];

// Placeholder for other grading scales - will need to be defined
const psaGrades = [
  { value: '', label: 'Select PSA Grade...' },
  { value: '10', label: 'PSA 10 Gem Mint' },
  { value: '9', label: 'PSA 9 Mint' },
  { value: '8', label: 'PSA 8 NM-Mint' },
  { value: '7', label: 'PSA 7 Near Mint' },
  { value: '6', label: 'PSA 6 EX-Mint' },
  { value: '5', label: 'PSA 5 Excellent' },
  { value: '4', label: 'PSA 4 VG-EX' },
  { value: '3', label: 'PSA 3 Very Good' },
  { value: '2', label: 'PSA 2 Good' },
  { value: '1.5', label: 'PSA 1.5 Fair' },
  { value: '1', label: 'PSA 1 Poor' },
  { value: 'A', label: 'PSA Authentic' }, // A for Authentic
  { value: 'N0', label: 'PSA N0 Evidence of Trimming'},
  { value: 'N1', label: 'PSA N1 Evidence of Restoration'},
  { value: 'N2', label: 'PSA N2 Evidence of Recoloring'},
  { value: 'N3', label: 'PSA N3 Questionable Authenticity'},
  { value: 'N4', label: 'PSA N4 Evidence of Cleaning'},
  { value: 'N5', label: 'PSA N5 Altered Stock'},
  { value: 'N6', label: 'PSA N6 Not Graded - Ungradable'}
];
const bgsGrades = [
  { value: '', label: 'Select BGS Grade...' },
  { value: '10', label: 'BGS 10 Pristine (Black Label)' },
  { value: '10P', label: 'BGS 10 Pristine' }, // Different from Black Label
  { value: '9.5', label: 'BGS 9.5 Gem Mint' },
  { value: '9', label: 'BGS 9 Mint' },
  { value: '8.5', label: 'BGS 8.5 NM-Mint+' },
  { value: '8', label: 'BGS 8 NM-Mint' },
  { value: '7.5', label: 'BGS 7.5 Near Mint+' },
  { value: '7', label: 'BGS 7 Near Mint' },
  { value: '6.5', label: 'BGS 6.5 EX-Mint+' },
  { value: '6', label: 'BGS 6 EX-Mint' },
  { value: '5.5', label: 'BGS 5.5 Excellent+' },
  { value: '5', label: 'BGS 5 Excellent' },
  { value: '4.5', label: 'BGS 4.5 VG-EX+' },
  { value: '4', label: 'BGS 4 VG-EX' },
  { value: '3.5', label: 'BGS 3.5 Very Good+' },
  { value: '3', label: 'BGS 3 Very Good' },
  { value: '2.5', label: 'BGS 2.5 Good+' },
  { value: '2', label: 'BGS 2 Good' },
  { value: '1.5', label: 'BGS 1.5 Fair+' },
  { value: '1', label: 'BGS 1 Poor' },
  { value: 'A', label: 'BGS Authentic' },
  { value: 'Altered', label: 'BGS Authentic - Altered'}
];
const cgcGrades = [
  { value: '', label: 'Select CGC Grade...' },
  { value: '10P', label: 'CGC 10 Perfect' },
  { value: '10', label: 'CGC 10 Pristine' },
  { value: '9.5', label: 'CGC 9.5 Gem Mint' },
  { value: '9', label: 'CGC 9 Mint' },
  { value: '8.5', label: 'CGC 8.5 NM/Mint+' },
  { value: '8', label: 'CGC 8 NM/Mint' },
  { value: '7.5', label: 'CGC 7.5 NM+' },
  { value: '7', label: 'CGC 7 NM' },
  { value: '6.5', label: 'CGC 6.5 EX/NM+' },
  { value: '6', label: 'CGC 6 EX/NM' },
  { value: '5.5', label: 'CGC 5.5 Excellent+' },
  { value: '5', label: 'CGC 5 Excellent' },
  { value: '4.5', label: 'CGC 4.5 VG/EX+' },
  { value: '4', label: 'CGC 4 VG/EX' },
  { value: '3.5', label: 'CGC 3.5 VG+' },
  { value: '3', label: 'CGC 3 VG' },
  { value: '2.5', label: 'CGC 2.5 Good+' },
  { value: '2', label: 'CGC 2 Good' },
  { value: '1.5', label: 'CGC 1.5 Fair' },
  { value: '1', label: 'CGC 1 Poor' },
  { value: 'Authentic', label: 'CGC Authentic' },
  { value: 'Altered', label: 'CGC Authentic Altered' },
  { value: 'Restored', label: 'CGC Restored (Various Tiers)' }
];
const sgcGrades = [
  { value: '', label: 'Select SGC Grade...' },
  { value: '10P', label: 'SGC 10 Pristine Gold Label' },
  { value: '10', label: 'SGC 10 Gem Mint' },
  { value: '9.5', label: 'SGC 9.5 Mint+' },
  { value: '9', label: 'SGC 9 Mint' },
  { value: '8.5', label: 'SGC 8.5 NM-Mint+' },
  { value: '8', label: 'SGC 8 NM-Mint' },
  { value: '7.5', label: 'SGC 7.5 Near Mint+' },
  { value: '7', label: 'SGC 7 Near Mint' },
  { value: '6.5', label: 'SGC 6.5 EX-MT+' },
  { value: '6', label: 'SGC 6 EX-MT' },
  { value: '5.5', label: 'SGC 5.5 Excellent+' },
  { value: '5', label: 'SGC 5 Excellent' },
  { value: '4.5', label: 'SGC 4.5 VG-EX+' },
  { value: '4', label: 'SGC 4 VG-EX' },
  { value: '3.5', label: 'SGC 3.5 Very Good+' },
  { value: '3', label: 'SGC 3 Very Good' },
  { value: '2.5', label: 'SGC 2.5 Good+' },
  { value: '2', label: 'SGC 2 Good' },
  { value: '1.5', label: 'SGC 1.5 Fair' },
  { value: '1', label: 'SGC 1 Poor' },
  { value: 'A', label: 'SGC Authentic' }
];

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
  initialCollectionName = '', 
  hideCollectionField = false,
  onPsaSearch,
  isPsaSearching = false,
  hidePsaSearchButton = false,
  requiredFields = {}
}) => {
  const { 
    preferredCurrency, 
    convertToUserCurrency,
    convertFromUserCurrency,
    formatAmountForDisplay, 
    formatPreferredCurrency 
  } = useUserPreferences();
  
  const { hasFeature } = useSubscription();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [availableSets, setAvailableSets] = useState([]);
  const [availableYears, setAvailableYears] = useState(getAvailableYears());
  const [displayInvestment, setDisplayInvestment] = useState('');
  const [displayCurrentValue, setDisplayCurrentValue] = useState('');

  useEffect(() => {
    const updateAvailableSets = () => {
      let filteredSets = [];
      
      // Step 1: Always get sets based on category first
      if (card?.category) {
        // Get all sets for the selected category
        const categorySets = getSetsByCategory(card.category);
        
        // If we have sets for this category, use them
        if (categorySets && categorySets.length > 0) {
          filteredSets = categorySets;
          
          // Step 2: If category is Pokemon and we have a year, filter by year
          if (card.category === 'pokemon' && card?.year) {
            const parsedYear = parseInt(card.year, 10);
            if (!isNaN(parsedYear)) {
              const yearSets = getPokemonSetsByYear(parsedYear);
              
              // Only use year-filtered sets if we found some
              if (yearSets && yearSets.length > 0) {
                filteredSets = yearSets;
              }
            }
          }
        }
      } else if (card?.year) {
        // If no category but we have a year, default to Pokemon sets for that year
        const parsedYear = parseInt(card.year, 10);
        if (!isNaN(parsedYear)) {
          const yearSets = getPokemonSetsByYear(parsedYear);
          if (yearSets && yearSets.length > 0) {
            filteredSets = yearSets;
          }
        }
      }
      
      // Step 3: Process the sets to ensure consistent format (objects with value/label)
      let formattedSets = [];
      
      // Convert all sets to objects with value and label properties
      filteredSets.forEach(set => {
        if (typeof set === 'string') {
          formattedSets.push({ value: set.trim(), label: set.trim() });
        } else if (set && set.value) {
          formattedSets.push({ 
            value: set.value.trim(), 
            label: set.label || set.value.trim() 
          });
        }
      });
      
      // Step 4: Add current set if it exists and isn't already in the list
      const currentCardSetName = card?.setName ? String(card.setName).trim() : '';
      if (currentCardSetName) {
        // Check if the current set is already in the list
        const setExists = formattedSets.some(set => set.value === currentCardSetName);
        
        if (!setExists) {
          formattedSets.push({ value: currentCardSetName, label: currentCardSetName });
        }
      }
      
      // Step 5: Remove duplicates and empty values
      const uniqueSets = [];
      const seenValues = new Set();
      
      formattedSets.forEach(set => {
        if (set.value && !seenValues.has(set.value)) {
          seenValues.add(set.value);
          uniqueSets.push(set);
        }
      });
      
      // Step 6: Sort alphabetically by label
      uniqueSets.sort((a, b) => a.label.localeCompare(b.label));
      
      setAvailableSets(uniqueSets);
    };
    
    updateAvailableSets();
  }, [card?.category, card?.year, card?.setName]); // Dependency now on card.setName

  useEffect(() => {
    if (card?.category === 'pokemon') {
      setAvailableYears(getAvailableYears());
    } else {
      setAvailableYears([]);
    }
  }, [card?.category]);

  useEffect(() => {
    if (card?.condition) {
      const parts = card.condition.split(/\s+-\s+|\s+/); 
      const company = parts[0]?.toUpperCase();
      const grade = parts[1] || '';
      
      setSelectedCompany(company || '');
      setSelectedGrade(grade || '');
    }
  }, [card?.condition]);

  useEffect(() => {
    if (card?.gradingCompany && card?.grade) {
      setSelectedCompany(card.gradingCompany);
      setSelectedGrade(card.grade);
    }
  }, [card?.gradingCompany, card?.grade]);

  useEffect(() => {
    if (card && preferredCurrency) {
      if (card.originalInvestmentAmount !== undefined && card.originalInvestmentCurrency) {
        const investmentInPref = convertToUserCurrency(card.originalInvestmentAmount, card.originalInvestmentCurrency);
        setDisplayInvestment(investmentInPref > 0 ? String(investmentInPref) : '');
      } else {
        setDisplayInvestment('');
      }

      if (card.originalCurrentValueAmount !== undefined && card.originalCurrentValueCurrency) {
        const currentValueInPref = convertToUserCurrency(card.originalCurrentValueAmount, card.originalCurrentValueCurrency);
        setDisplayCurrentValue(currentValueInPref > 0 ? String(currentValueInPref) : '');
      } else {
        setDisplayCurrentValue('');
      }
    }
  }, [card, preferredCurrency, convertToUserCurrency]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let newCardData = { ...card };

    if (name === 'category') {
      newCardData = {
        ...card,
        category: value,
        // year: '', // DO NOT RESET YEAR
        set: '',        // Reset raw set (PSA Brand)
        setName: '',    // Reset display set name
      };
      
      // When category changes, update available years
      if (value === 'pokemon') {
        setAvailableYears(getAvailableYears());
      } else {
        setAvailableYears([]);
      }
    } else if (name === 'year') {
      newCardData = {
        ...card,
        year: value,    // Update year from text input
        set: '',        // Reset raw set
        setName: '',    // Reset display set name
      };
    } else if (name === 'set') { // This 'set' name comes from the Set SelectField's name attribute
      newCardData = {
        ...card,
        setName: value, // Update display name
        // Also update the raw set value to keep them in sync
        set: value, 
      };
    } else if (name === 'gradingCompany') {
      setSelectedCompany(value); // Local state for grade options
      newCardData = { ...card, gradingCompany: value, grade: '' }; // Reset grade in card data
      setSelectedGrade(''); // Reset local selectedGrade for UI consistency
    } else if (name === 'grade') { // No need to check selectedCompany here, card.gradingCompany is source of truth
      setSelectedGrade(value); // Local state for UI consistency
      newCardData = { ...card, grade: value };
    } else if (name === 'condition' && card?.gradingCompany === 'RAW') {
      // If grading company is RAW, condition is also used as the grade
      newCardData = { ...card, condition: value, grade: value };
    } else if (name === 'investment') {
      setDisplayInvestment(value); // Update display value immediately
      const numericValue = convertFromUserCurrency(value);
      if (!isNaN(numericValue)) {
        newCardData.investment = numericValue; // Store as number in card data
      } else if (value.trim() === '') {
        newCardData.investment = null; // Allow clearing the field
      }
    } else if (name === 'currentValue') {
      setDisplayCurrentValue(value); // Update display value immediately
      const numericValue = convertFromUserCurrency(value);
      if (!isNaN(numericValue)) {
        newCardData.currentValue = numericValue; // Store as number in card data
      } else if (value.trim() === '') {
        newCardData.currentValue = null; // Allow clearing the field
      }
    } else {
      // Default handling for other fields
      newCardData[name] = value;
    }
    
    onChange(newCardData); // Propagate changes up to the parent
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    if (onChange) {
      onChange({
        ...card,
        [name]: value === '' ? '' : value
      });
    }
  };

  const getProfit = () => {
    const investment = parseFloat(displayInvestment) || 0;
    const value = parseFloat(displayCurrentValue) || 0;
    return (value - investment).toFixed(preferredCurrency.code === 'JPY' ? 0 : 2);
  };

  const handleInvestmentInputChange = (e) => {
    const inputValue = e.target.value;
    setDisplayInvestment(inputValue); 

    const numericValue = parseFloat(inputValue) || 0;
    let newOriginalAmount = 0;
    let newOriginalCurrency = card.originalInvestmentCurrency || preferredCurrency.code;

    if (card.originalInvestmentCurrency) {
      newOriginalAmount = convertFromUserCurrency(numericValue, card.originalInvestmentCurrency);
    } else {
      newOriginalAmount = numericValue; 
      newOriginalCurrency = preferredCurrency.code; 
    }
    
    onChange({
      ...card,
      originalInvestmentAmount: newOriginalAmount,
      originalInvestmentCurrency: newOriginalCurrency
    });
  };

  const handleCurrentValueInputChange = (e) => {
    const inputValue = e.target.value;
    setDisplayCurrentValue(inputValue);

    const numericValue = parseFloat(inputValue) || 0;
    let newOriginalAmount = 0;
    let newOriginalCurrency = card.originalCurrentValueCurrency || preferredCurrency.code;

    if (card.originalCurrentValueCurrency) {
      newOriginalAmount = convertFromUserCurrency(numericValue, card.originalCurrentValueCurrency);
    } else {
      newOriginalAmount = numericValue;
    }

    onChange({
      ...card,
      originalCurrentValueAmount: newOriginalAmount,
      originalCurrentValueCurrency: newOriginalCurrency
    });
  };

  const handleCompanyChange = (e) => {
    const company = e.target.value;
    setSelectedCompany(company);
    
    if (company === 'RAW') {
      setSelectedGrade('');
    } else {
      setSelectedGrade('');
    }
    
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
      condition = grade; 
      onChange({
        ...card,
        condition,
        gradingCompany: company,
        grade,
        certificationNumber: card.certificationNumber || ''
      });
    } else if (company && grade) {
      condition = `${company} ${grade}`; 
      onChange({
        ...card,
        condition,
        gradingCompany: company,
        grade,
        certificationNumber: card.slabSerial || card.certificationNumber || ''
      });
    } else if (company) {
      condition = company; 
      onChange({
        ...card,
        condition,
        gradingCompany: company,
        grade: '',
        certificationNumber: card.slabSerial || card.certificationNumber || ''
      });
    } else {
      onChange({
        ...card,
        condition: '',
        gradingCompany: '',
        grade: '',
        certificationNumber: ''
      });
    }
  };

  const handleCollectionChange = (e) => {
    const collectionId = e.target.value;
    if (onChange) {
      onChange({
        ...card,
        collectionId,
      });
    }
  };

  const selectStyles = {
    option: {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '8px 12px'
    }
  };

  const handleAddCustomSet = async (newSet, year) => {
    if (!newSet || newSet.trim() === '') return '';
    
    const addedSet = await addCustomSet(newSet, year);
    
    if (card.year) {
      const updatedSets = getPokemonSetsByYear(card.year);
      setAvailableSets(updatedSets);
    } else {
      const allSets = getAllPokemonSets();
      setAvailableSets(allSets);
    }
    
    return addedSet;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className={`card-details-form ${className}`} noValidate>
      {!hideCollectionField && (
        <div className="mb-6 mt-12"> 
          <SelectField
            label="Collection"
            name="collectionId"
            value={card.collectionId || initialCollectionName}
            onChange={handleCollectionChange}
            error={errors.collectionId}
            required
          >
            <option value="">Select Collection...</option>
            {collections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Card Image</h3>
          <div className="relative">
            <div 
              className="relative overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black flex items-center justify-center w-full"
              style={{ height: '400px', width: '100%', maxWidth: '100%', margin: '0 auto' }}
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
                    className="max-h-[380px] max-w-full h-auto object-contain cursor-pointer"
                    onClick={onImageClick}
                    onError={(e) => {
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
            
            {!hidePsaSearchButton && selectedCompany !== 'RAW' && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-col space-y-2 w-full">
                  {!card.psaUrl && (
                    <button
                      onClick={() => {
                        if (!hasFeature('PSA_SEARCH')) {
                          toast.error('PSA search is available with Premium. Upgrade to access this feature!');
                          return;
                        }
                        onPsaSearch && onPsaSearch(card.slabSerial);
                      }}
                      disabled={!card.slabSerial || isPsaSearching || !hasFeature('PSA_SEARCH')}
                      className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      data-component-name="CardDetailsForm"
                      title={
                        !hasFeature('PSA_SEARCH') 
                          ? "PSA search requires Premium subscription" 
                          : !card.slabSerial 
                            ? "Enter a serial number first" 
                            : "Search PSA database"
                      }
                    >
                      {isPsaSearching ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </>
                      ) : !hasFeature('PSA_SEARCH') ? (
                        <>
                          <Icon name="lock" className="mr-2" />
                          Premium Feature
                        </>
                      ) : (
                        <>
                          <Icon name="search" className="mr-2" />
                          Search PSA
                        </>
                      )}
                    </button>
                  )}
                  
                  {card.psaUrl && (
                    <div className="flex flex-col space-y-2">
                      <a
                        href={card.psaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:opacity-90 shadow-sm"
                      >
                        <Icon name="open_in_new" className="mr-2" color="white" />
                        View on PSA Website
                      </a>
                      
                      {card.slabSerial && onPsaSearch && (
                        <button
                          onClick={() => {
                            if (!hasFeature('PSA_SEARCH')) {
                              toast.error('PSA search is available with Premium. Upgrade to access this feature!');
                              return;
                            }
                            onPsaSearch(card.slabSerial);
                          }}
                          disabled={!hasFeature('PSA_SEARCH')}
                          className={`w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none px-4 py-2 text-base shadow-sm ${
                            !hasFeature('PSA_SEARCH') 
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-green-500 to-green-700 text-white hover:opacity-90'
                          }`}
                          title={!hasFeature('PSA_SEARCH') ? "PSA search requires Premium subscription" : "Reload data from PSA"}
                        >
                          <Icon name={!hasFeature('PSA_SEARCH') ? "lock" : "refresh"} className="mr-2" color="white" />
                          {!hasFeature('PSA_SEARCH') ? 'Premium Feature' : 'Reload PSA Data'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Profit display removed - now shown in modal header */}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Details</h3>
          <div className="financial-details-grid">
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label={`Investment (${preferredCurrency.code})`}
                  name="displayInvestment" 
                  type="number"
                  value={displayInvestment} 
                  onChange={handleInvestmentInputChange} 
                  error={errors.originalInvestmentAmount} 
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <div className="form-label-nowrap">
                <FormField
                  label={`Current Value (${preferredCurrency.code})`}
                  name="displayCurrentValue" 
                  type="number"
                  value={displayCurrentValue} 
                  onChange={handleCurrentValueInputChange} 
                  error={errors.originalCurrentValueAmount} 
                  placeholder="0"
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
                name="cardName"
                value={card.cardName || ''}
                onChange={handleInputChange}
                error={errors.cardName}
                className={errors.cardName ? 'error' : ''}
                required
              />
            </div>
          </div>



          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <SelectField
                label="Category"
                name="category"
                value={card?.category || ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Category...' },
                  ...cardCategories
                ]}
                error={errors.category}
                required={false}
                testId="category-select"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <SelectField
                label="Year"
                name="year"
                value={card?.year || ''}
                onChange={handleInputChange}
                error={errors.year}
                disabled={false}
                testId="year-select"
              >
                <option value="">Select Year...</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </SelectField>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <SelectField
                label="Set"
                name="set"
                value={card?.setName || ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Set...' },
                  ...availableSets
                ]}
                disabled={!card?.category}
                className={errors.setName ? 'border-red-500' : ''}
                aria-describedby={errors.setName ? 'set-error' : undefined}
                testId="set-select"
              />
              {errors.setName && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.setName}</p>
              )}
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
            {selectedCompany !== 'RAW' && (
              <div>
                <div className="form-label-nowrap">
                  <FormField
                    label="Serial Number"
                    name="slabSerial"
                    value={card.slabSerial || ''}
                    onChange={handleInputChange}
                    error={errors.slabSerial}
                    required={false}
                  />
                </div>
                {additionalSerialContent && (
                  <div className="absolute right-2 top-8">
                    {additionalSerialContent}
                  </div>
                )}
              </div>
            )}
            <div className={selectedCompany === 'RAW' ? 'md:col-span-2' : ''}>
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
    </form>
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

    population: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), 
    slabSerial: PropTypes.string,
    datePurchased: PropTypes.string,
    originalInvestmentAmount: PropTypes.number,
    originalInvestmentCurrency: PropTypes.string,
    originalCurrentValueAmount: PropTypes.number,
    originalCurrentValueCurrency: PropTypes.string,
    psaUrl: PropTypes.string,
    lastPriceUpdate: PropTypes.string,
    quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    collectionId: PropTypes.string 
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
