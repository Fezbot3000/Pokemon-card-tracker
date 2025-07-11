import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor } from '../utils/colorUtils';

const CardListComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  realCards, 
  filteredCards, 
  cardsLoading, 
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getTextColorClass,
  getPrimaryButtonStyle,
  primaryStyle,
  colors
}) => {
  const [currentViewMode, setCurrentViewMode] = useState(data.viewMode || 'grid');
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Use filteredCards when available, otherwise fallback to realCards or data.cards
  const useFilteredCards = filteredCards && filteredCards.length >= 0; // Allow empty arrays (filtered to 0 results)
  const cardsToDisplay = useFilteredCards ? filteredCards.map(card => ({
    id: card.id || card.slabSerial || `card-${Math.random()}`,
    name: card.name || card.cardName || 'Unknown Card',
    setName: card.setName || card.set || 'Unknown Set',
    year: card.year || new Date().getFullYear(),
    grade: card.grade || 'Ungraded',
    gradingCompany: card.gradingCompany || 'RAW',
    category: card.category || 'other',
    originalCurrentValueAmount: card.originalCurrentValueAmount || card.currentValueAUD || 0,
    originalCurrentValueCurrency: card.originalCurrentValueCurrency || 'AUD',
    originalInvestmentAmount: card.originalInvestmentAmount || card.investmentAUD || 0,
    originalInvestmentCurrency: card.originalInvestmentCurrency || 'AUD',
    currentValue: card.currentValueAUD || card.originalCurrentValueAmount || 0,
    profit: (card.currentValueAUD || card.originalCurrentValueAmount || 0) - (card.investmentAUD || card.originalInvestmentAmount || 0),
    imageUrl: card.imageUrl || card.image || '/card-images/DefaultCard.png',
    certificationNumber: card.certificationNumber || card.slabSerial || '',
    slabSerial: card.slabSerial || card.id || '',
    hasImage: card.hasImage || !!card.imageUrl,
    dateAdded: card.dateAdded || card.createdAt || new Date(),
    collection: card.collection || 'Default Collection'
  })) : (realCards && realCards.length > 0 && !cardsLoading) ? realCards.map(card => ({
    id: card.id || card.slabSerial || `card-${Math.random()}`,
    name: card.name || card.cardName || 'Unknown Card',
    setName: card.setName || card.set || 'Unknown Set',
    year: card.year || new Date().getFullYear(),
    grade: card.grade || 'Ungraded',
    gradingCompany: card.gradingCompany || 'RAW',
    category: card.category || 'other',
    originalCurrentValueAmount: card.originalCurrentValueAmount || card.currentValueAUD || 0,
    originalCurrentValueCurrency: card.originalCurrentValueCurrency || 'AUD',
    originalInvestmentAmount: card.originalInvestmentAmount || card.investmentAUD || 0,
    originalInvestmentCurrency: card.originalInvestmentCurrency || 'AUD',
    currentValue: card.currentValueAUD || card.originalCurrentValueAmount || 0,
    profit: (card.currentValueAUD || card.originalCurrentValueAmount || 0) - (card.investmentAUD || card.originalInvestmentAmount || 0),
    imageUrl: card.imageUrl || card.image || '/card-images/DefaultCard.png',
    certificationNumber: card.certificationNumber || card.slabSerial || '',
    slabSerial: card.slabSerial || card.id || '',
    hasImage: card.hasImage || !!card.imageUrl,
    dateAdded: card.dateAdded || card.createdAt || new Date(),
    collection: card.collection || 'Default Collection'
  })) : data.cards || [];
  
  // Helper function to get grading company colors
  const getGradingCompanyColorHelper = (company, grade) => {
    const gradeNum = parseInt(grade);
    let backgroundColor, textColor;
    
    if (company === 'PSA') {
      if (gradeNum === 10) {
        backgroundColor = colors.warning;
        textColor = colors.background;
      } else if (gradeNum >= 8) {
        backgroundColor = colors.success;
        textColor = colors.background;
      } else if (gradeNum >= 7) {
        backgroundColor = colors.success;
        textColor = colors.background;
      } else {
        backgroundColor = colors.error;
        textColor = colors.background;
      }
    } else if (company === 'BGS' || company === 'BECKETT') {
      backgroundColor = colors.info;
      textColor = colors.background;
    } else if (company === 'SGC') {
      backgroundColor = colors.info;
      textColor = colors.background;
    } else if (company === 'CGC') {
      backgroundColor = colors.secondary;
      textColor = colors.background;
    } else if (company === 'CSG') {
      backgroundColor = colors.secondary;
      textColor = colors.background;
    } else {
      // Default
      backgroundColor = colors.textSecondary;
      textColor = colors.background;
    }
    
    return { style: { backgroundColor, color: textColor } };
  };

  // Generate card styles based on configuration
  const getCardStyle = () => {
    const cardConfig = config.components?.cards || {};
    const baseStyle = {
      ...getSurfaceStyle('primary'),
      borderRadius: cardConfig.cornerRadius || '12px',
      border: cardConfig.border === 'none' ? 'none' : `${cardConfig.borderWidth || '0.5px'} solid ${colors.border}`,
      transition: cardConfig.transition === 'all' ? 'all 0.2s ease' : 'none'
    };

    // Apply card style variations first
    if (cardConfig.style === 'outlined') {
      baseStyle.boxShadow = 'none';
      baseStyle.border = `${cardConfig.borderWidth || '0.5px'} solid ${colors.border}`;
    } else {
      // Apply shadow based on configuration for elevated and flat styles
      if (cardConfig.shadow !== 'none') {
        if (cardConfig.shadow === 'large') {
          baseStyle.boxShadow = `0 20px 25px -5px ${colors.shadow || colors.border}40, 0 10px 10px -5px ${colors.shadow || colors.border}20`;
        } else if (cardConfig.shadow === 'medium') {
          baseStyle.boxShadow = `0 10px 15px -3px ${colors.shadow || colors.border}40, 0 4px 6px -2px ${colors.shadow || colors.border}30`;
        } else { // small
          baseStyle.boxShadow = `0 4px 6px -1px ${colors.shadow || colors.border}40, 0 2px 4px -1px ${colors.shadow || colors.border}20`;
        }
      }
    }

    return baseStyle;
  };

  const getCardContentPadding = () => {
    const cardConfig = config.components?.cards || {};
    const paddingMap = {
      'compact': '8px',
      'comfortable': '16px',
      'spacious': '24px'
    };
    return paddingMap[cardConfig.padding] || cardConfig.contentPadding || '16px';
  };

  const getCardImageRadius = () => {
    const cardConfig = config.components?.cards || {};
    return cardConfig.imageRadius || '8px';
  };

  const getCardHoverEffect = () => {
    const cardConfig = config.components?.cards || {};
    return cardConfig.hoverEffect || 'lift';
  };
  
  const handleCardSelect = (cardId, isSelected) => {
    const newSelected = new Set(selectedCards);
    if (isSelected) {
      newSelected.add(cardId);
    } else {
      newSelected.delete(cardId);
    }
    setSelectedCards(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedCards.size === cardsToDisplay.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cardsToDisplay.map(card => card.id)));
    }
  };
  
  const clearSelection = () => {
    setSelectedCards(new Set());
    setShowBulkActions(false);
  };

  // Show/hide bulk actions based on selection
  useEffect(() => {
    if (selectedCards.size > 0) {
      setShowBulkActions(true);
    } else {
      setShowBulkActions(false);
    }
  }, [selectedCards]);

  // Handle bulk actions
  const handleBulkAction = (actionId) => {
    switch (actionId) {
      case 'move':
        alert(`Move ${selectedCards.size} cards to another collection`);
        break;
      case 'sell':
        alert(`Mark ${selectedCards.size} cards as sold`);
        break;
      case 'export':
        alert(`Export ${selectedCards.size} cards to CSV/PDF`);
        break;
      case 'duplicate':
        alert(`Duplicate ${selectedCards.size} cards`);
        break;
      case 'edit':
        alert(`Bulk edit ${selectedCards.size} cards`);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${selectedCards.size} cards? This action cannot be undone.`)) {
          alert(`Delete ${selectedCards.size} cards`);
          clearSelection();
        }
        break;
      default:
        break;
    }
  };

  const closeBulkActions = () => {
    setShowBulkActions(false);
    // Don't clear selection, just hide the panel
  };
  
  const CardItem = ({ card, isSelected, onSelect }) => {
    const isHovered = hoveredCard === card.id;
    
    // Use the real production logic - originalInvestmentAmount and originalCurrentValueAmount for display
    const displayInvestmentAmount = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
    const displayValueAmount = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
    
    // For profit calculation, use AUD values if available, otherwise convert display amounts
    const investmentAUD = parseFloat(card.investmentAUD) || displayInvestmentAmount;
    const currentValueAUD = parseFloat(card.currentValueAUD) || displayValueAmount;
    const profit = currentValueAUD - investmentAUD;
    
    const profitColor = profit > 0 ? colors.success : 
                       profit < 0 ? colors.error : 
                       colors.textSecondary;
    
    // Set info for display - use actual card properties
    const cardName = card.cardName || card.card || card.name || 'Unknown Card';
    const setInfo = `${card.setName || card.set || 'Unknown Set'} • ${card.year || 'Unknown Year'}`;
    const truncatedSet = setInfo.length > 25 ? `${setInfo.substring(0, 25)}...` : setInfo;
    
    if (currentViewMode === 'list') {
      return (
        <div
          className={`relative group cursor-pointer transition-all duration-200 ${
            isSelected
              ? 'ring-2'
              : ''
          }`}
          style={{
            ...(isSelected ? {
              '--tw-ring-color': colors.secondary,
              borderColor: colors.secondary
            } : {}),
            ...getCardStyle(),
            ...(isHovered ? getBackgroundColorStyle('surfaceSecondary') : {}),
            padding: getCardContentPadding()
          }}
          onMouseEnter={() => setHoveredCard(card.id)}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onSelect(card.id, !isSelected)}
        >
          <div className="flex items-center space-x-3">
            {/* Selection Checkbox */}
            <div className="shrink-0">
              <div
                className="size-4 rounded flex items-center justify-center cursor-pointer transition-all duration-200 focus:ring-2"
                style={{
                  backgroundColor: isSelected ? colors.secondary : 'transparent',
                  border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${isSelected ? colors.secondary : colors.border}`,
                  '--tw-ring-color': `${colors.secondary}33`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(card.id, !isSelected);
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(card.id, !isSelected);
                  }
                }}
              >
                {isSelected && (
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: colors.background}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            
            {/* Card Image - Thumbnail */}
            <div className="shrink-0">
              <div className="w-10 h-16 overflow-hidden relative"
                   style={{
                     ...getBackgroundColorStyle('surfaceSecondary'),
                     borderRadius: getCardImageRadius()
                   }}>
                <img
                  src={card.imageUrl || card.image}
                  alt={card.name}
                  className="size-full object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    e.target.src = '/card-images/DefaultCard.png';
                  }}
                />
                {/* Grade Badge - Bottom Right Overlay */}
                <div className="absolute bottom-0 right-0">
                  <div className={`inline-flex items-center px-1 py-0.5 rounded-tl-md font-semibold shadow-sm ${
                    getGradingCompanyColorHelper(card.gradingCompany, card.grade).className || ''
                  }`}
                       style={{
                         fontSize: '0.625rem',
                         lineHeight: '0.75rem',
                         ...getGradingCompanyColorHelper(card.gradingCompany, card.grade).style
                       }}>
                    {card.grade}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card Details - Flexible width */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold line-clamp-2`}
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    ...getTextColorStyle('primary')
                  }}>
                {cardName}
              </h3>
              <p className={`line-clamp-1`}
                 style={{
                   fontSize: '0.75rem',
                   lineHeight: '1rem',
                   ...getTextColorStyle('secondary')
                 }}>
                {truncatedSet}
              </p>
            </div>
            
            {/* Financial Info - Compact */}
            <div className="shrink-0 text-right">
              <div className={`font-semibold`}
                   style={{
                     fontSize: '0.875rem',
                     lineHeight: '1.25rem',
                     ...getTextColorStyle('primary')
                   }}>
                {formatCurrency(displayValueAmount)}
              </div>
              <div className={`font-semibold`}
                   style={{
                     fontSize: '0.875rem',
                     lineHeight: '1.25rem',
                     color: profitColor
                   }}>
                {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Grid view (existing implementation with improvements)
    return (
      <div
        className={`relative group cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'ring-2'
            : ''
        } ${isHovered && getCardHoverEffect() === 'lift' ? 'scale-105' : ''}`}
        style={{
          ...(isSelected ? {
            '--tw-ring-color': colors.secondary,
            borderColor: colors.secondary
          } : {}),
          ...getCardStyle()
        }}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => onSelect(card.id, !isSelected)}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <div
            className="size-4 rounded flex items-center justify-center cursor-pointer transition-all duration-200 focus:ring-2"
            style={{
              backgroundColor: isSelected ? colors.secondary : 'transparent',
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${isSelected ? colors.secondary : colors.border}`,
              '--tw-ring-color': `${colors.secondary}33`
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(card.id, !isSelected);
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelect(card.id, !isSelected);
              }
            }}
          >
            {isSelected && (
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: colors.background}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        
        {/* Card Image */}
        <div className="aspect-[5/8.5] overflow-hidden relative"
             style={{
               ...getBackgroundColorStyle('surfaceSecondary'),
               borderRadius: getCardImageRadius()
             }}>
          <img
            src={card.imageUrl || card.image}
            alt={card.name}
            className="size-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              e.target.src = '/card-images/DefaultCard.png';
            }}
          />
          
          {/* Grade Badge - Bottom Right Overlay */}
          <div className="absolute bottom-2 right-2">
            <div className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-xs shadow-lg ${
              getGradingCompanyColorHelper(card.gradingCompany, card.grade).className || ''
            }`}
                 style={{
                   fontSize: '0.75rem',
                   lineHeight: '1rem',
                   ...getGradingCompanyColorHelper(card.gradingCompany, card.grade).style
                 }}>
              {card.gradingCompany && card.gradingCompany !== 'RAW' ? `${card.gradingCompany} ${card.grade}` : card.grade}
            </div>
          </div>
        </div>
        
        {/* Card Details */}
        <div style={{padding: getCardContentPadding()}}>
          {/* Fixed height container for card name and set - 64px total */}
          <div className="h-16 flex flex-col justify-start mb-4 text-center">
            <div className="h-10 flex items-start justify-center">
              <h3 className={`font-semibold line-clamp-2`}
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    ...getTextColorStyle('primary')
                  }}>
                {cardName}
              </h3>
            </div>
            <div className="h-5 flex items-center justify-center">
              <p className={`line-clamp-1`}
                 style={{
                   fontSize: '0.75rem',
                   lineHeight: '1.25rem',
                   ...getTextColorStyle('secondary')
                 }}>
                {truncatedSet}
              </p>
            </div>
          </div>
          
          {/* Fixed height container for financial info - 88px total */}
          <div className="text-center" style={{ height: '88px' }}>
            {/* Value section - 40px */}
            <div className="h-10 flex flex-col justify-center mb-2">
              <div className="h-4 flex items-center justify-center">
                <div className={`font-medium`}
                     style={{
                       fontSize: '0.75rem',
                       lineHeight: '1rem',
                       ...getTextColorStyle('secondary')
                     }}>
                  Value
                </div>
              </div>
              <div className="h-6 flex items-center justify-center">
                <div className={`font-semibold`}
                     style={{
                       fontSize: '0.875rem',
                       lineHeight: '1.25rem',
                       ...getTextColorStyle('primary')
                     }}>
                  {formatCurrency(displayValueAmount)}
                </div>
              </div>
            </div>
            
            {/* Profit section - 40px */}
            <div className="h-10 flex flex-col justify-center">
              <div className="h-4 flex items-center justify-center">
                <div className={`font-medium`}
                     style={{
                       fontSize: '0.75rem',
                       lineHeight: '1rem',
                       ...getTextColorStyle('secondary')
                     }}>
                  Profit
                </div>
              </div>
              <div className="h-6 flex items-center justify-center">
                <div className={`font-semibold`}
                     style={{
                       fontSize: '0.875rem',
                       lineHeight: '1.25rem',
                       color: profitColor
                     }}>
                  {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className={`flex items-center h-10 px-1 rounded-lg gap-1`} 
                 style={{...getInteractiveStyle('default'), border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`}}>
              <button
                onClick={() => setCurrentViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200`}
                style={currentViewMode === 'grid' ? 
                  { ...getPrimaryButtonStyle() } : 
                  getTextColorStyle('muted')
                }
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200`}
                style={currentViewMode === 'list' ? 
                  { ...getPrimaryButtonStyle() } : 
                  getTextColorStyle('muted')
                }
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Card Count */}
            <div style={{
                   fontSize: '0.875rem', // 14px - more accessible
                   lineHeight: '1.25rem',
                   ...getTextColorStyle('secondary')
                 }}>
              {cardsToDisplay.length} cards {useFilteredCards ? '(Filtered)' : (realCards && realCards.length > 0 && !cardsLoading ? '(Live Data)' : '(Demo)')}
            </div>
          </div>
          
          {/* Selection Controls */}
          {data.showSelectionControls && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 border`}
                style={{
                  ...getInteractiveStyle('secondary'),
                  fontSize: '0.875rem', // 14px - more accessible
                  lineHeight: '1.25rem'
                }}
              >
                {selectedCards.size === cardsToDisplay.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedCards.size > 0 && (
                <button
                  onClick={clearSelection}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 border`}
                  style={{
                    ...getInteractiveStyle('default'),
                    fontSize: '0.875rem', // 14px - more accessible
                    lineHeight: '1.25rem',
                    ...getTextColorStyle('muted')
                  }}
                >
                  Clear ({selectedCards.size})
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Cards Grid/List */}
        <div className={
          currentViewMode === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
            : 'grid gap-3'
        }
        style={
          currentViewMode === 'list' 
            ? { gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }
            : {}
        }>
          {cardsToDisplay.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              isSelected={selectedCards.has(card.id)}
              onSelect={handleCardSelect}
            />
          ))}
        </div>
        
        {/* Selection Summary */}
        {selectedCards.size > 0 && (
          <div className={`mt-6 p-4 rounded-lg border`}
               style={{
                 backgroundColor: `${colors.secondary}20`,
                 borderColor: `${colors.secondary}80`
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium`}
                   style={{
                     fontSize: '0.875rem', // 14px - more accessible
                     lineHeight: '1.25rem',
                     ...getTextColorStyle('primary')
                   }}>
                  {selectedCards.size} card{selectedCards.size === 1 ? '' : 's'} selected
                </p>
                <p style={{
                     fontSize: '0.75rem', // 12px - minimum accessible size
                     lineHeight: '1rem',
                     ...getTextColorStyle('secondary')
                   }}>
                  Total Value: {formatCurrency(
                    cardsToDisplay
                      .filter(card => selectedCards.has(card.id))
                      .reduce((sum, card) => {
                        const cardValue = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
                        return sum + cardValue;
                      }, 0)
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 border`}
                  style={{
                    ...getPrimaryButtonStyle(),
                    fontSize: '0.875rem', // 14px - more accessible
                    lineHeight: '1.25rem'
                  }}
                >
                  Actions
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Multi-Select Action Panel */}
      {showBulkActions && selectedCards.size > 0 && (
        <MultiSelectActionPanel
          selectedCards={selectedCards}
          cardsToDisplay={cardsToDisplay}
          onClose={closeBulkActions}
          onAction={handleBulkAction}
          colors={colors}
          isDarkMode={isDarkMode}
          formatCurrency={formatCurrency}
          getSurfaceStyle={getSurfaceStyle}
          getInteractiveStyle={getInteractiveStyle}
          getTextColorClass={getTextColorClass}
          getPrimaryButtonStyle={getPrimaryButtonStyle}
        />
      )}
    </>
  );
};

const MultiSelectActionPanel = ({ 
  selectedCards, 
  cardsToDisplay, 
  onClose, 
  onAction, 
  colors, 
  isDarkMode, 
  formatCurrency, 
  getSurfaceStyle, 
  getInteractiveStyle, 
  getTextColorClass,
  getPrimaryButtonStyle
}) => {
  const selectedCardData = cardsToDisplay.filter(card => selectedCards.has(card.id));
  
  // Use the same real card property logic as CardItem
  const totalValue = selectedCardData.reduce((sum, card) => {
    const cardValue = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
    return sum + cardValue;
  }, 0);
  
  const totalProfit = selectedCardData.reduce((sum, card) => {
    const displayInvestmentAmount = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
    const displayValueAmount = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
    const investmentAUD = parseFloat(card.investmentAUD) || displayInvestmentAmount;
    const currentValueAUD = parseFloat(card.currentValueAUD) || displayValueAmount;
    const profit = currentValueAUD - investmentAUD;
    return sum + profit;
  }, 0);

  const actions = [
    {
      id: 'move',
      label: 'Move to Collection',
      icon: '📁',
      description: `Move ${selectedCards.size} cards to another collection`,
      isPrimary: false
    },
    {
      id: 'sell',
      label: 'Mark as Sold',
      icon: '💰',
      description: 'Record sale and move to sold items',
      isPrimary: false
    },
    {
      id: 'export',
      label: 'Export Selected',
      icon: '📊',
      description: 'Export card data to CSV/PDF',
      isPrimary: false
    },
    {
      id: 'duplicate',
      label: 'Duplicate Cards',
      icon: '📄',
      description: 'Create copies of selected cards',
      isPrimary: false
    },
    {
      id: 'edit',
      label: 'Bulk Edit',
      icon: '✏️',
      description: 'Edit multiple cards at once',
      isPrimary: false
    },
    {
      id: 'delete',
      label: 'Delete Cards',
      icon: '🗑️',
      description: 'Permanently delete selected cards',
      isDangerous: true
    }
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center">
      {/* Backdrop with soft fade */}
      <div className="absolute inset-0" onClick={onClose} style={{
        background: `linear-gradient(to top, ${colors.overlay || colors.background}60 0%, ${colors.overlay || colors.background}30 40%, transparent 70%)`
      }}></div>
      
      {/* Panel */}
      <div className={`relative mb-4 rounded-xl border backdrop-blur-md w-full max-w-3xl mx-6`}
           style={{
             ...getSurfaceStyle('primary'),
             boxShadow: `0 4px 6px -1px ${colors.shadow || colors.border}40, 0 2px 4px -1px ${colors.shadow || colors.border}20`
           }}>
        
        {/* Compact Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`size-8 rounded-full flex items-center justify-center`}
                   style={{ 
                     backgroundColor: isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`, 
                     color: colors.secondary 
                   }}>
                <span className="text-sm font-bold">{selectedCards.size}</span>
              </div>
              <div>
                <h3 className={`text-base font-semibold ${getTextColorClass('primary')}`}>
                  {selectedCards.size} Card{selectedCards.size === 1 ? '' : 's'} Selected
                </h3>
                <div className="flex items-center space-x-3 text-xs">
                  <span className={getTextColorClass('secondary')}>
                    Value: <span className="font-medium">{formatCurrency(totalValue)}</span>
                  </span>
                  <span className={getTextColorClass('secondary')}>
                    Profit: <span className={`font-medium`} style={{color: totalProfit >= 0 ? colors.success : colors.error}}>
                      {formatCurrency(totalProfit)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-all duration-200 ${getTextColorClass('muted')}`}
              style={getInteractiveStyle('default')}
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Actions */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className={`p-3 rounded-lg border transition-all duration-200 text-center group hover:scale-105 ${
                  action.isPrimary
                    ? 'border-transparent'
                    : ''
                }`}
                style={{
                  ...(action.isPrimary ? {
                    ...getPrimaryButtonStyle()
                  } : action.isDangerous ? {
                    backgroundColor: isDarkMode ? `${colors.error}1A` : `${colors.error}0D`,
                    color: colors.error,
                    borderColor: colors.error
                  } : {
                    ...getSurfaceStyle('secondary'),
                    borderColor: colors.border
                  })
                }}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg">{action.icon}</span>
                  <span className="font-medium text-xs leading-tight">{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardListComponent;
export { MultiSelectActionPanel }; 