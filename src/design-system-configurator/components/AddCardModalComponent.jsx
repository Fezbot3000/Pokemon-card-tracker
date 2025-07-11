import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor } from '../utils/colorUtils';
import { toast } from 'react-hot-toast';
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import { useSubscription } from '../../hooks/useSubscription';
import logger from '../../services/LoggingService';
import { cleanupPreviews } from '../../utils/imageUtils';
import ImageGallery from './ImageGallery';

const AddCardModalComponent = ({ 
  data, 
  config = {}, 
  isDarkMode, 
  realCards, 
  cardsLoading,
  selectedCollection,
  setSelectedCollection,
  collections,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors = {},
  isOpen,
  onClose,
  onSave,
  onNewCollectionCreated
}) => {
  // State management
  const [newCard, setNewCard] = useState({
    id: null,
    cardName: '',
    player: '',
    set: '',
    setName: '',
    year: '',
    category: 'pokemon',
    condition: '',
    grade: '',
    gradingCompany: '',
    certificationNumber: '',
    slabSerial: '',
    population: '',
    datePurchased: new Date().toISOString().split('T')[0],
    originalInvestmentAmount: '',
    originalInvestmentCurrency: 'AUD',
    originalCurrentValueAmount: '',
    originalCurrentValueCurrency: 'AUD',
    investmentAUD: '',
    currentValueAUD: '',
    quantity: 1,
    collection: selectedCollection?.name || selectedCollection || 'Default Collection'
  });
  
  const [cardImages, setCardImages] = useState([]);
  const [imageLoadingState, setImageLoadingState] = useState('idle');
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [psaSerial, setPsaSerial] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [selectedCollectionLocal, setSelectedCollectionLocal] = useState(selectedCollection?.name || selectedCollection || '');
  const [newCollectionName, setNewCollectionName] = useState('');

  const [isMobileView, setIsMobileView] = useState(false);
  
  const modalRef = useRef(null);
  
  // Subscription check
  const { hasFeature } = useSubscription();
  
  // Responsive handling
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  // Handle modal close with cleanup - defined first to avoid hoisting issues
  const handleClose = useCallback(() => {
    // Clean up preview URLs when closing
    cleanupPreviews(cardImages);
    setCardImages([]);
    setErrors({});
    setSaveMessage(null);
    onClose();
  }, [cardImages, onClose]);

  // Handle modal open/close with proper cleanup
  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setNewCard({
        id: null,
        cardName: '',
        player: '',
        set: '',
        setName: '',
        year: '',
        category: 'pokemon',
        condition: '',
        grade: '',
        gradingCompany: '',
        certificationNumber: '',
        slabSerial: '',
        population: '',
        datePurchased: new Date().toISOString().split('T')[0],
        originalInvestmentAmount: '',
        originalInvestmentCurrency: 'AUD',
        originalCurrentValueAmount: '',
        originalCurrentValueCurrency: 'AUD',
        investmentAUD: '',
        currentValueAUD: '',
        quantity: 1,
        collection: selectedCollection?.name || selectedCollection || 'Default Collection'
      });
      // Clean up any existing preview URLs
      cleanupPreviews(cardImages);
      setCardImages([]);
      setErrors({});
      setSaveMessage(null);
      setPsaSerial('');
      setIsSaving(false);
      setIsSearching(false);
      setSelectedCollectionLocal(selectedCollection?.name || selectedCollection || '');
    }
  }, [isOpen, selectedCollection]);
  
  // Close modal when clicking outside and prevent background scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if a child modal (new collection) is open
      if (showNewCollectionModal) {
        return;
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose, showNewCollectionModal]);
  
  // Handle form changes
  const handleCardChange = (field, value) => {
    setNewCard(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Sync investment fields
      if (field === 'originalInvestmentAmount') {
        updated.investmentAUD = value;
      } else if (field === 'originalCurrentValueAmount') {
        updated.currentValueAUD = value;
      }
      
      return updated;
    });
    
    // Clear field error when user edits
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Handle multiple images change
  const handleImagesChange = (newImages) => {
    setCardImages(newImages);
    setErrors(prev => ({ ...prev, images: undefined }));
  };

  // Handle image removal with proper cleanup
  const handleImageRemove = (imageToRemove, index) => {
    // Clean up the preview URL - exactly match production
    if (imageToRemove.previewUrl && imageToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }

    // Remove from state
    setCardImages(prev => prev.filter((_, i) => i !== index));
    
    // Clear field error when user removes/adds images
    if (errors.images || errors.image) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.images;
        delete newErrors.image;
        return newErrors;
      });
    }
  };

  // Handle new collection creation - exactly match production
  const handleCreateNewCollection = async () => {
    const name = newCollectionName.trim();
    if (name) {
      try {
        console.log('AddCardModal: Creating collection:', name);
        console.log('AddCardModal: Current collections before create:', collections);
        
        // Close modal first
        setShowNewCollectionModal(false);
        
        // Check if collection already exists
        const existingCollection = collections.find(c => 
          (typeof c === 'string' ? c : c.name) === name
        );
        
        if (!existingCollection) {
          // Call the parent component's callback to update collections list
          if (onNewCollectionCreated) {
            const result = await onNewCollectionCreated(name);
            console.log('AddCardModal: Collection created successfully:', result);
          }
          
          // Update the selected collection
          setSelectedCollectionLocal(name);
          
          // Save to database - exactly match production
          if (typeof window !== 'undefined') {
            if (window.db && window.db.createEmptyCollection) {
              window.db.createEmptyCollection(name);
            }
          }
        } else {
          console.log('AddCardModal: Collection already exists, selecting it:', existingCollection);
          // If collection exists, just select it
          setSelectedCollectionLocal(name);
        }
        
        // Clear the form
        setNewCollectionName('');
        
        // Show success message
        toast.success(`Collection "${name}" created successfully!`);
      } catch (error) {
        console.error('AddCardModal: Error creating collection:', error);
        toast.error('Failed to create collection. Please try again.');
      }
    }
  };

  // Handle collection dropdown change
  const handleCollectionChange = (e) => {
    if (e.target.value === 'create-new') {
      setShowNewCollectionModal(true);
    } else {
      setSelectedCollectionLocal(e.target.value);
    }
  };
  
  // Validate form - exactly match production AddCardModal
  const validateForm = () => {
    const newErrors = {};

    // Only validate required fields
    if (!newCard.cardName?.trim()) {
      newErrors.cardName = 'Card name is required';
    }

    // Investment amount is required
    const investmentAmount = parseFloat(newCard.originalInvestmentAmount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      newErrors.originalInvestmentAmount = 'Investment amount is required';
    }

    // Date purchased is required
    if (!newCard.datePurchased) {
      newErrors.datePurchased = 'Date purchased is required';
    }

    // Quantity is required and must be at least 1
    const quantity = parseInt(newCard.quantity);
    if (isNaN(quantity) || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    // Collection validation - exactly match production
    if (!selectedCollectionLocal) {
      newErrors.collection = 'Please select a collection';
    } else if (selectedCollectionLocal.toLowerCase() === 'sold') {
      newErrors.collection =
        'Cards cannot be added directly to the Sold collection';
    }

    setErrors(newErrors);
    return newErrors;
  };
  
  // Handle save with exact production validation logic
  const handleSave = async () => {
    // Clear any previous error messages
    setSaveMessage(null);
    setErrors({});
    setIsSaving(true);

    // Validate form - exactly match production
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveMessage('Please fix the errors before saving');
      setIsSaving(false);
      return;
    }

    // Check if we have at least one image file - exactly match production
    if (cardImages.length === 0) {
      setSaveMessage('Please add at least one image for the card');
      setErrors({ image: 'Card image is required' });
      setIsSaving(false);
      return;
    }

    try {
      // Prepare card data - exactly match production
      const cardToSave = {
        ...newCard,
        collection: selectedCollectionLocal,
      };

      // Prepare image files for upload
      const imageFiles = cardImages.map(img => img.file);
      
      // Try to save the card
      await onSave(cardToSave, imageFiles, selectedCollectionLocal);

      // Clear form on success - exactly match production
      setNewCard({
        id: null,
        cardName: '',
        player: '',
        set: '',
        setName: '',
        year: '',
        category: 'pokemon',
        condition: '',
        grade: '',
        gradingCompany: '',
        certificationNumber: '',
        slabSerial: '',
        population: '',
        datePurchased: new Date().toISOString().split('T')[0],
        originalInvestmentAmount: '',
        originalInvestmentCurrency: 'AUD',
        originalCurrentValueAmount: '',
        originalCurrentValueCurrency: 'AUD',
        investmentAUD: '',
        currentValueAUD: '',
        quantity: 1,
        collection: selectedCollection?.name || selectedCollection || 'Default Collection'
      });
      
      // Clean up preview URLs - exactly match production
      cleanupPreviews(cardImages);
      setCardImages([]);
      setErrors({});
      setSaveMessage('Card saved successfully');

      // Close modal immediately after successful save
      onClose();
    } catch (error) {
      logger.error('Error adding card:', error);

      // Handle specific error cases - exactly match production
      if (error.message.includes('serial number already exists')) {
        setErrors({
          certificationNumber:
            'This serial number already exists in your active collections',
        });
        setSaveMessage('Card already exists');

        // Scroll the serial number field into view
        const serialField = document.querySelector(
          '[name="certificationNumber"]'
        );
        if (serialField) {
          serialField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Generic error handling
        setSaveMessage(`Error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle PSA lookup (using real production logic)
  const handlePsaLookup = async () => {
    // Check subscription access first
    if (!hasFeature('PSA_SEARCH')) {
      toast.error(
        'PSA search is available with Premium. Upgrade to access this feature!'
      );
      return;
    }

    if (!psaSerial) {
      toast.error('Please enter a PSA serial number');
      return;
    }

    setIsSearching(true);
    setSaveMessage('Searching PSA database...');

    try {
      const psaData = await searchByCertNumber(psaSerial);

      // Check for error response
      if (psaData && psaData.error) {
        logger.error('PSA search error:', psaData.error);
        toast.error(`PSA search failed: ${psaData.error}`);
        setSaveMessage(
          'Failed to find PSA data. Please check the number and try again.'
        );
        return;
      }

      if (!psaData) {
        toast.error('No PSA data found for this serial number');
        setSaveMessage('Failed to find PSA data');
        return;
      }

      // Parse and apply PSA data directly
      const parsedData = parsePSACardData(psaData);
      if (!parsedData) {
        toast.error('Could not parse PSA data');
        setSaveMessage('Failed to parse PSA data');
        return;
      }

      // Update card data with PSA information
      const updatedCard = {
        ...newCard,
        ...parsedData,
        slabSerial: psaSerial,
        condition: `PSA ${parsedData.grade}`,
        gradeCompany: 'PSA',
        gradingCompany: 'PSA',
        psaUrl: `https://www.psacard.com/cert/${psaSerial}`,
        player: parsedData.player || '',
        cardName: parsedData.cardName || '',
        population: parsedData.population || '',
        category: parsedData.category || newCard.category,
        set: parsedData.set || newCard.set,
        year: parsedData.year || newCard.year,
        certificationNumber: psaSerial,
        grade: parsedData.grade
      };

      setNewCard(updatedCard);
      toast.success('PSA data successfully loaded');
      setSaveMessage('PSA data applied successfully');
    } catch (error) {
      logger.error('Error searching PSA:', error);
      toast.error(`PSA search failed: ${error.message || 'Unknown error'}`);
      setSaveMessage(
        'Failed to search PSA database. Please check the number and try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };
  
  // Get collections for dropdown
  const availableCollections = React.useMemo(() => {
    console.log('AddCardModal: Raw collections prop:', collections);
    const collectionList = Array.isArray(collections) ? collections : [];
    const filtered = collectionList
      .filter(collection => {
        if (typeof collection === 'string') {
          return collection.toLowerCase() !== 'sold';
        }
        return collection?.name?.toLowerCase() !== 'sold';
      })
      .map(collection => {
        if (typeof collection === 'string') {
          return { name: collection, id: collection };
        }
        return collection;
      });
    console.log('AddCardModal: Available collections for dropdown:', filtered);
    return filtered;
  }, [collections]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center ${isMobileView ? 'justify-center p-4' : 'justify-end pr-8'}`} style={{ 
      backgroundColor: `${colors.overlay || colors.background}80` 
    }}>
      <div 
        ref={modalRef}
        className={`relative w-full max-h-[90vh] overflow-y-auto rounded-lg ${isMobileView ? 'max-w-none' : 'max-w-2xl'}`}
        style={{
          ...getSurfaceStyle('primary'),
          marginTop: isMobileView ? '0px' : '32px',
          marginBottom: isMobileView ? '0px' : '32px',
          marginLeft: '0px',
          marginRight: '0px',
          border: `${config.components?.cards?.borderWidth || '0.5px'} solid ${colors.border}`,
          overscrollBehavior: 'contain'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b" style={{ 
          ...getSurfaceStyle('primary'),
          borderColor: colors.border 
        }}>
          <div style={{
            ...getTypographyStyle('heading'),
            fontSize: '24px',
            fontWeight: '600',
            ...getTextColorStyle('primary')
          }}>
            Add New Card
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              ...getInteractiveStyle('default'),
              ...getTextColorStyle('secondary')
            }}
          >
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Card Images Section - MOVED TO TOP */}
          <div className="space-y-4">
            <h3 style={{
              ...getTypographyStyle('heading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Card Images *
            </h3>
            
            <ImageGallery
              images={cardImages}
              onImagesChange={handleImagesChange}
              onImageRemove={handleImageRemove}
              maxImages={5}
              config={config}
              colors={colors}
              getTypographyStyle={getTypographyStyle}
              getSurfaceStyle={getSurfaceStyle}
              getTextColorStyle={getTextColorStyle}
            />
            
            {errors.images && (
              <div style={{
                ...getTypographyStyle('caption'),
                color: colors.error
              }}>
                {errors.images}
              </div>
            )}
          </div>

          {/* PSA Certificate Lookup Section */}
          <div className="space-y-4">
            <h3 style={{
              ...getTypographyStyle('heading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              PSA Certificate Lookup
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  PSA Serial Number
                </label>
                <input
                  type="text"
                  value={psaSerial}
                  onChange={(e) => setPsaSerial(e.target.value)}
                  placeholder="Enter PSA serial number..."
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                  style={{
                    ...getSurfaceStyle('secondary'),
                    ...getTypographyStyle('body'),
                    ...getTextColorStyle('primary'),
                    border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                    '--tw-ring-color': `${colors.primary}33`
                  }}
                />
              </div>
              
              <div className="md:col-span-2">
                <button
                  onClick={handlePsaLookup}
                  disabled={isSearching || !psaSerial}
                  className="w-full px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    ...getPrimaryButtonStyle(),
                    ...getTypographyStyle('button')
                  }}
                >
                  {isSearching ? 'Searching...' : 'Search PSA Database'}
                </button>
              </div>
            </div>
            
            {/* PSA Status Message */}
            {saveMessage && (
              saveMessage.startsWith('Searching PSA') || 
              saveMessage.startsWith('Failed to find PSA') || 
              saveMessage.startsWith('Failed to search PSA') || 
              saveMessage.startsWith('Failed to parse PSA') || 
              saveMessage === 'PSA data applied successfully'
            ) && (
              <div 
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: saveMessage.startsWith('Failed') ? 
                    (isDarkMode ? `${colors.error}40` : `${colors.error}1A`) : 
                    saveMessage.includes('successfully') ? 
                      (isDarkMode ? `${colors.success}40` : `${colors.success}1A`) : 
                      (isDarkMode ? `${colors.info}40` : `${colors.info}1A`),
                  color: saveMessage.startsWith('Failed') ? 
                    colors.error : 
                    saveMessage.includes('successfully') ? 
                      colors.success : 
                      colors.info,
                  ...getTypographyStyle('body')
                }}
              >
                {saveMessage}
              </div>
            )}
          </div>

          {/* Collection Selection Section */}
          <div className="space-y-4">
            <h3 style={{
              ...getTypographyStyle('heading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Select Collection
            </h3>
            
            <div className="space-y-2">
              <label style={{
                ...getTypographyStyle('label'),
                ...getTextColorStyle('secondary')
              }}>
                Collection *
              </label>
              <select
                value={selectedCollectionLocal}
                onChange={handleCollectionChange}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                style={{
                  ...getSurfaceStyle('secondary'),
                  ...getTypographyStyle('body'),
                  ...getTextColorStyle('primary'),
                  border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.collection ? colors.error : colors.border}`,
                  '--tw-ring-color': `${colors.primary}33`
                }}
              >
                <option value="">Select Collection...</option>
                {availableCollections.map((collection) => (
                  <option key={collection.id} value={collection.name}>
                    {collection.name}
                  </option>
                ))}
                <option value="create-new">+ Create New Collection</option>
              </select>
              {errors.collection && (
                <div style={{
                  ...getTypographyStyle('caption'),
                  color: colors.error
                }}>
                  {errors.collection}
                </div>
              )}
            </div>
          </div>
          
          {/* Card Details Section */}
          <div className="space-y-4">
            <h3 style={{
              ...getTypographyStyle('heading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Card Details
            </h3>
            
            <div className="space-y-4">
              {/* Card Name */}
              <div className="space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  Card Name *
                </label>
                <input
                  type="text"
                  value={newCard.cardName}
                  onChange={(e) => handleCardChange('cardName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                  style={{
                    ...getSurfaceStyle('secondary'),
                    ...getTypographyStyle('body'),
                    ...getTextColorStyle('primary'),
                    border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.cardName ? colors.error : colors.border}`,
                    '--tw-ring-color': `${colors.primary}33`
                  }}
                />
                {errors.cardName && (
                  <div style={{
                    ...getTypographyStyle('caption'),
                    color: colors.error
                  }}>
                    {errors.cardName}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  Category
                </label>
                <select
                  value={newCard.category || ''}
                  onChange={(e) => handleCardChange('category', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                  style={{
                    ...getSurfaceStyle('secondary'),
                    ...getTypographyStyle('body'),
                    ...getTextColorStyle('primary'),
                    border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                    '--tw-ring-color': `${colors.primary}33`
                  }}
                >
                  <option value="">Select Category...</option>
                  <option value="pokemon">Pokemon</option>
                  <option value="magicTheGathering">Magic: The Gathering</option>
                  <option value="yugioh">Yu-Gi-Oh</option>
                  <option value="digimon">Digimon</option>
                  <option value="onePiece">One Piece</option>
                  <option value="dragonBallZ">Dragon Ball Z</option>
                  <option value="nba">NBA</option>
                  <option value="nfl">NFL</option>
                  <option value="mlb">MLB/Baseball</option>
                  <option value="nrl">NRL</option>
                  <option value="soccer">Soccer</option>
                  <option value="ufc">UFC</option>
                  <option value="f1">Formula 1</option>
                  <option value="marvel">Marvel</option>
                  <option value="wwe">WWE</option>
                  <option value="sports">Other Sports</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Year & Set */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Year
                  </label>
                  <select
                    value={newCard.year || ''}
                    onChange={(e) => handleCardChange('year', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  >
                    <option value="">Select Year...</option>
                    {Array.from({length: 50}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Set
                  </label>
                  <input
                    type="text"
                    value={newCard.set || newCard.setName || ''}
                    onChange={(e) => handleCardChange('set', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                </div>
              </div>

              {/* Grading Company & Grade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Grading Company
                  </label>
                  <select
                    value={newCard.gradingCompany || ''}
                    onChange={(e) => handleCardChange('gradingCompany', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  >
                    <option value="">Select Company...</option>
                    <option value="PSA">PSA</option>
                    <option value="BGS">BGS (Beckett)</option>
                    <option value="CGC">CGC</option>
                    <option value="SGC">SGC</option>
                    <option value="RAW">Raw/Ungraded</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Grade
                  </label>
                  <input
                    type="text"
                    value={newCard.grade || ''}
                    onChange={(e) => handleCardChange('grade', e.target.value)}
                    placeholder="Enter grade..."
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                </div>
              </div>

              {/* Serial Number & Population */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    name="certificationNumber"
                    value={newCard.slabSerial || newCard.certificationNumber || ''}
                    onChange={(e) => {
                      handleCardChange('slabSerial', e.target.value);
                      handleCardChange('certificationNumber', e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.certificationNumber ? colors.error : colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                  {errors.certificationNumber && (
                    <div style={{
                      ...getTypographyStyle('caption'),
                      color: colors.error
                    }}>
                      {errors.certificationNumber}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Population
                  </label>
                  <input
                    type="text"
                    value={newCard.population || ''}
                    onChange={(e) => handleCardChange('population', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                </div>
              </div>

              {/* Investment Amount & Current Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Investment Amount (AUD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCard.originalInvestmentAmount}
                    onChange={(e) => handleCardChange('originalInvestmentAmount', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.originalInvestmentAmount ? colors.error : colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                  {errors.originalInvestmentAmount && (
                    <div style={{
                      ...getTypographyStyle('caption'),
                      color: colors.error
                    }}>
                      {errors.originalInvestmentAmount}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Current Value (AUD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCard.originalCurrentValueAmount}
                    onChange={(e) => handleCardChange('originalCurrentValueAmount', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                </div>
              </div>

              {/* Date Purchased & Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Date Purchased *
                  </label>
                  <input
                    type="date"
                    value={newCard.datePurchased}
                    onChange={(e) => handleCardChange('datePurchased', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.datePurchased ? colors.error : colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                  {errors.datePurchased && (
                    <div style={{
                      ...getTypographyStyle('caption'),
                      color: colors.error
                    }}>
                      {errors.datePurchased}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label style={{
                    ...getTypographyStyle('label'),
                    ...getTextColorStyle('secondary')
                  }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCard.quantity}
                    onChange={(e) => handleCardChange('quantity', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                    style={{
                      ...getSurfaceStyle('secondary'),
                      ...getTypographyStyle('body'),
                      ...getTextColorStyle('primary'),
                      border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${errors.quantity ? colors.error : colors.border}`,
                      '--tw-ring-color': `${colors.primary}33`
                    }}
                  />
                  {errors.quantity && (
                    <div style={{
                      ...getTypographyStyle('caption'),
                      color: colors.error
                    }}>
                      {errors.quantity}
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>


          
          {/* Status Message */}
          {saveMessage && 
           !saveMessage.startsWith('Searching PSA') && 
           !saveMessage.startsWith('Failed to find PSA') && 
           !saveMessage.startsWith('Failed to search PSA') && 
           !saveMessage.startsWith('Failed to parse PSA') && 
           saveMessage !== 'PSA data applied successfully' && (
            <div 
              className="p-4 rounded-lg"
              style={{
                backgroundColor: saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix') || saveMessage.startsWith('Database connection') ? 
                  (isDarkMode ? `${colors.error}40` : `${colors.error}1A`) : 
                  saveMessage.includes('successfully') ? 
                    (isDarkMode ? `${colors.success}40` : `${colors.success}1A`) : 
                    (isDarkMode ? `${colors.info}40` : `${colors.info}1A`),
                color: saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix') || saveMessage.startsWith('Database connection') ? 
                  colors.error : 
                  saveMessage.includes('successfully') ? 
                    colors.success : 
                    colors.info,
                ...getTypographyStyle('body')
              }}
            >
              {saveMessage}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className={`sticky bottom-0 z-10 p-6 border-t ${isMobileView ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`} style={{ 
          ...getSurfaceStyle('primary'),
          borderColor: colors.border 
        }}>
          <button
            onClick={handleClose}
            className={`px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 ${isMobileView ? 'w-full order-2' : ''}`}
            style={{
              ...getSurfaceStyle('secondary'),
              ...getTypographyStyle('button'),
              ...getTextColorStyle('primary'),
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isMobileView ? 'w-full order-1' : ''}`}
            style={{
              ...getPrimaryButtonStyle(),
              ...getTypographyStyle('button')
            }}
          >
            {isSaving ? 'Saving...' : 'Add Card'}
          </button>
        </div>
      </div>

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            backgroundColor: `${colors.overlay || colors.background}80` 
          }}
          onClick={(e) => {
            // Close modal when clicking on overlay
            if (e.target === e.currentTarget) {
              setShowNewCollectionModal(false);
              setNewCollectionName('');
            }
          }}
        >
          <div 
            className={`p-6 rounded-lg w-96 max-w-md mx-4`}
            style={getSurfaceStyle('primary')}
            onClick={(e) => {
              // Prevent clicks on modal content from bubbling to overlay
              e.stopPropagation();
            }}
          >
            <h3 className={`text-lg font-semibold mb-4`}
                style={{
                  ...getTypographyStyle('heading'),
                  ...getTextColorStyle('primary')
                }}>
              Create New Collection
            </h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 mb-4`}
              style={{
                ...getTypographyStyle('body'),
                ...getSurfaceStyle('secondary'),
                ...getTextColorStyle('primary'),
                borderColor: colors.border,
                border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`,
                '--tw-ring-color': `${colors.primary}33`
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNewCollection();
                }
              }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewCollectionModal(false);
                  setNewCollectionName('');
                }}
                className={`px-4 py-2 rounded-lg border transition-colors`}
                style={{
                  ...getTypographyStyle('button'),
                  ...getTextColorStyle('secondary'),
                  borderColor: colors.border
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewCollection}
                disabled={!newCollectionName.trim()}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{
                  ...getTypographyStyle('button'),
                  ...getPrimaryButtonStyle()
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCardModalComponent;