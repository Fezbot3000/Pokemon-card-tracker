import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor } from '../utils/colorUtils';
import { toast } from 'react-hot-toast';
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import { useSubscription } from '../../hooks/useSubscription';
import logger from '../../services/LoggingService';
import ImageGallery from './ImageGallery';

const AddCardModalComponent = ({ 
  data, 
  config, 
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
  colors,
  isOpen,
  onClose,
  onSave
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
  
  // Handle modal open/close
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
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
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
  }, [isOpen, onClose]);
  
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
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!newCard.cardName?.trim()) {
      newErrors.cardName = 'Card name is required';
    }
    
    const investmentAmount = parseFloat(newCard.originalInvestmentAmount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      newErrors.originalInvestmentAmount = 'Investment amount is required';
    }
    
    if (!newCard.datePurchased) {
      newErrors.datePurchased = 'Date purchased is required';
    }
    
    const quantity = parseInt(newCard.quantity);
    if (isNaN(quantity) || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    
    if (!selectedCollectionLocal) {
      newErrors.collection = 'Please select a collection';
    }
    
    if (!cardImages || cardImages.length === 0) {
      newErrors.images = 'At least one card image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle save
  const handleSave = async () => {
    setSaveMessage(null);
    setIsSaving(true);
    
    if (!validateForm()) {
      setSaveMessage('Please fix the errors before saving');
      setIsSaving(false);
      return;
    }
    
    try {
      const cardToSave = {
        ...newCard,
        collection: selectedCollectionLocal,
        currentValueAUD: parseFloat(newCard.originalCurrentValueAmount) || parseFloat(newCard.originalInvestmentAmount),
        investmentAUD: parseFloat(newCard.originalInvestmentAmount),
        name: newCard.cardName,
        hasImage: cardImages.length > 0,
        hasMultipleImages: cardImages.length > 1,
        imageCount: cardImages.length,
        dateAdded: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      // For configurator, we'll simulate the save
      if (onSave) {
        const imageFiles = cardImages.map(img => img.file);
        await onSave(cardToSave, imageFiles, selectedCollectionLocal);
      }
      
      setSaveMessage('Card saved successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
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
    const collectionList = Array.isArray(collections) ? collections : [];
    return collectionList
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
  }, [collections]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center ${isMobileView ? 'justify-center p-4' : 'justify-end pr-8'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        ref={modalRef}
        className={`relative w-full max-h-[90vh] overflow-y-auto rounded-lg ${isMobileView ? 'max-w-none' : 'max-w-2xl'}`}
        style={{
          ...getSurfaceStyle('primary'),
          marginTop: isMobileView ? '0px' : '32px',
          marginBottom: isMobileView ? '0px' : '32px',
          marginLeft: '0px',
          marginRight: '0px',
          border: `${config.components?.cards?.borderWidth || '0.5px'} solid ${colors.border}`
        }}
        onWheel={(e) => {
          const element = e.currentTarget;
          const { scrollTop, scrollHeight, clientHeight } = element;
          const isScrollingUp = e.deltaY < 0;
          const isScrollingDown = e.deltaY > 0;
          
          // Prevent background scroll when:
          // 1. Scrolling up and already at the top
          // 2. Scrolling down and already at the bottom
          if ((isScrollingUp && scrollTop === 0) || 
              (isScrollingDown && scrollTop + clientHeight >= scrollHeight)) {
            e.preventDefault();
          }
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
          {/* PSA Certificate Lookup Section */}
          <div className="space-y-4">
            <div>
              <div style={{
                ...getTypographyStyle('subheading'),
                fontSize: '18px',
                fontWeight: '600',
                ...getTextColorStyle('primary')
              }}>
                PSA Certificate Lookup
              </div>
              <div style={{
                ...getTypographyStyle('caption'),
                ...getTextColorStyle('secondary')
              }}>
                Search your PSA serial number to pre-populate the page.
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={psaSerial}
                onChange={(e) => setPsaSerial(e.target.value)}
                placeholder="Enter PSA serial number"
                className="flex-1 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                style={{
                  ...getSurfaceStyle('secondary'),
                  ...getTypographyStyle('body'),
                  ...getTextColorStyle('primary'),
                  border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                  '--tw-ring-color': `${colors.primary}33`
                }}
                disabled={isSearching}
              />
              <button
                onClick={handlePsaLookup}
                disabled={isSearching || !psaSerial.trim() || !hasFeature('PSA_SEARCH')}
                className="px-4 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full flex items-center justify-center space-x-2"
                style={{
                  ...getPrimaryButtonStyle(),
                  ...getTypographyStyle('button')
                }}
                title={
                  !hasFeature('PSA_SEARCH')
                    ? 'PSA search requires Premium subscription'
                    : 'Search PSA database'
                }
              >
                {!hasFeature('PSA_SEARCH') ? (
                  <>
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                    <span>Premium Feature</span>
                  </>
                ) : (
                  <>
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{isSearching ? 'Searching...' : 'Search PSA'}</span>
                  </>
                )}
              </button>
            </div>
            
            {/* PSA Status Messages - Moved to top for visibility */}
            {saveMessage && saveMessage === 'PSA data applied successfully' && (
              <div 
                className="mt-4 p-4 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? `${colors.success}40` : `${colors.success}1A`,
                  color: colors.success,
                  ...getTypographyStyle('body')
                }}
              >
                PSA data applied successfully
              </div>
            )}
            {saveMessage && saveMessage.startsWith('Searching PSA') && (
              <div 
                className="mt-4 p-4 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? `${colors.info}40` : `${colors.info}1A`,
                  color: colors.info,
                  ...getTypographyStyle('body')
                }}
              >
                {saveMessage}
              </div>
            )}
            {saveMessage &&
              (saveMessage.startsWith('Failed to find PSA') ||
                saveMessage.startsWith('Failed to search PSA') ||
                saveMessage.startsWith('Failed to parse PSA')) && (
              <div 
                className="mt-4 p-4 rounded-lg"
                style={{
                  backgroundColor: isDarkMode ? `${colors.error}40` : `${colors.error}1A`,
                  color: colors.error,
                  ...getTypographyStyle('body')
                }}
              >
                {saveMessage}
                             </div>
             )}
             
             {/* PSA Website Link - Show if PSA URL exists */}
             {newCard.psaUrl && (
               <div className="mt-4">
                 <a
                   href={newCard.psaUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-base font-medium shadow-sm transition-colors hover:opacity-90 focus:outline-none"
                   style={{
                     ...getPrimaryButtonStyle(),
                     ...getTypographyStyle('button')
                   }}
                 >
                   <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                   </svg>
                   View on PSA Website
                 </a>
               </div>
             )}
          </div>
          
          {/* Collection Selection */}
          <div className="space-y-4">
            <div style={{
              ...getTypographyStyle('subheading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Select Collection
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedCollectionLocal}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setShowNewCollectionModal(true);
                  } else {
                    setSelectedCollectionLocal(e.target.value);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                style={{
                  ...getSurfaceStyle('secondary'),
                  ...getTypographyStyle('body'),
                  ...getTextColorStyle('primary'),
                  border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                  '--tw-ring-color': `${colors.primary}33`
                }}
              >
                <option value="">Select Collection...</option>
                {availableCollections.map((collection) => (
                  <option key={collection.id} value={collection.name}>
                    {collection.name}
                  </option>
                ))}
                <option value="new">+ Create New Collection</option>
              </select>
              <button
                onClick={() => setShowNewCollectionModal(true)}
                className="px-4 py-3 rounded-lg transition-all duration-200 hover:scale-105 sm:w-auto w-full"
                style={{
                  ...getPrimaryButtonStyle(),
                  ...getTypographyStyle('button')
                }}
              >
                + Create New
              </button>
            </div>
            
            {errors.collection && (
              <div style={{
                ...getTypographyStyle('caption'),
                color: colors.error
              }}>
                {errors.collection}
              </div>
            )}
          </div>
          
          {/* Card Images */}
          <div className="space-y-4">
            <div style={{
              ...getTypographyStyle('subheading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Card Images
            </div>
            
            <ImageGallery
              images={cardImages}
              onImagesChange={handleImagesChange}
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
          
          {/* Financial Details */}
          <div className="space-y-4">
            <div style={{
              ...getTypographyStyle('subheading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Financial Details
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Investment Amount */}
              <div className="space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  Investment Amount (AUD) *
                </label>
                <input
                  type="number"
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
                  placeholder="0"
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
              
              {/* Current Value */}
              <div className="space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  Current Value (AUD)
                </label>
                <input
                  type="number"
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
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-4">
            <div style={{
              ...getTypographyStyle('subheading'),
              fontSize: '18px',
              fontWeight: '600',
              ...getTextColorStyle('primary')
            }}>
              Card Details
            </div>
            
            <div className="space-y-4">
              {/* Player */}
              <div className="space-y-2">
                <label style={{
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}>
                  Player
                </label>
                <input
                  type="text"
                  value={newCard.player || ''}
                  onChange={(e) => handleCardChange('player', e.target.value)}
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

              {/* Year */}
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

              {/* Set */}
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
                  {newCard.gradingCompany === 'PSA' ? (
                    <select
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    >
                      <option value="">Select PSA Grade...</option>
                      <option value="10">PSA 10 Gem Mint</option>
                      <option value="9">PSA 9 Mint</option>
                      <option value="8">PSA 8 NM-Mint</option>
                      <option value="7">PSA 7 Near Mint</option>
                      <option value="6">PSA 6 EX-Mint</option>
                      <option value="5">PSA 5 Excellent</option>
                      <option value="4">PSA 4 VG-EX</option>
                      <option value="3">PSA 3 Very Good</option>
                      <option value="2">PSA 2 Good</option>
                      <option value="1">PSA 1 Poor</option>
                      <option value="A">PSA Authentic</option>
                    </select>
                  ) : newCard.gradingCompany === 'BGS' ? (
                    <select
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    >
                      <option value="">Select BGS Grade...</option>
                      <option value="10">BGS 10 Pristine (Black Label)</option>
                      <option value="9.5">BGS 9.5 Gem Mint</option>
                      <option value="9">BGS 9 Mint</option>
                      <option value="8.5">BGS 8.5 NM-Mint+</option>
                      <option value="8">BGS 8 NM-Mint</option>
                      <option value="7.5">BGS 7.5 Near Mint+</option>
                      <option value="7">BGS 7 Near Mint</option>
                    </select>
                  ) : newCard.gradingCompany === 'CGC' ? (
                    <select
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    >
                      <option value="">Select CGC Grade...</option>
                      <option value="10P">CGC 10 Perfect</option>
                      <option value="10">CGC 10 Pristine</option>
                      <option value="9.5">CGC 9.5 Gem Mint</option>
                      <option value="9">CGC 9 Mint</option>
                      <option value="8.5">CGC 8.5 NM/Mint+</option>
                      <option value="8">CGC 8 NM/Mint</option>
                    </select>
                  ) : newCard.gradingCompany === 'SGC' ? (
                    <select
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    >
                      <option value="">Select SGC Grade...</option>
                      <option value="10P">SGC 10 Pristine Gold Label</option>
                      <option value="10">SGC 10 Gem Mint</option>
                      <option value="9.5">SGC 9.5 Mint+</option>
                      <option value="9">SGC 9 Mint</option>
                      <option value="8.5">SGC 8.5 NM-Mint+</option>
                      <option value="8">SGC 8 NM-Mint</option>
                    </select>
                  ) : newCard.gradingCompany === 'RAW' ? (
                    <select
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    >
                      <option value="">Select Condition...</option>
                      <option value="Mint">Mint</option>
                      <option value="Near Mint">Near Mint</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Played">Played</option>
                      <option value="Poor">Poor</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newCard.grade || ''}
                      onChange={(e) => handleCardChange('grade', e.target.value)}
                      placeholder="Select Grade..."
                      className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4"
                      style={{
                        ...getSurfaceStyle('secondary'),
                        ...getTypographyStyle('body'),
                        ...getTextColorStyle('primary'),
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                      disabled
                    />
                  )}
                </div>
              </div>

              {/* Serial Number & Population */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newCard.gradingCompany !== 'RAW' && (
                  <div className="space-y-2">
                    <label style={{
                      ...getTypographyStyle('label'),
                      ...getTextColorStyle('secondary')
                    }}>
                      Serial Number
                    </label>
                    <input
                      type="text"
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
                        border: `${config.components?.forms?.inputBorderWidth || '0.5px'} solid ${colors.border}`,
                        '--tw-ring-color': `${colors.primary}33`
                      }}
                    />
                  </div>
                )}
                
                <div className={`space-y-2 ${newCard.gradingCompany === 'RAW' ? 'md:col-span-2' : ''}`}>
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
          
          {/* Status Message - Only for non-PSA messages */}
          {saveMessage && 
           !saveMessage.startsWith('Searching PSA') && 
           !saveMessage.startsWith('Failed to find PSA') && 
           !saveMessage.startsWith('Failed to search PSA') && 
           !saveMessage.startsWith('Failed to parse PSA') && 
           saveMessage !== 'PSA data applied successfully' && (
            <div 
              className="p-4 rounded-lg"
              style={{
                backgroundColor: saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix') ? 
                  (isDarkMode ? `${colors.error}40` : `${colors.error}1A`) : 
                  saveMessage.includes('successfully') ? 
                    (isDarkMode ? `${colors.success}40` : `${colors.success}1A`) : 
                    (isDarkMode ? `${colors.info}40` : `${colors.info}1A`),
                color: saveMessage.startsWith('Error') || saveMessage.startsWith('Please fix') ? 
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
            onClick={onClose}
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
      

    </div>
  );
};

export default AddCardModalComponent; 