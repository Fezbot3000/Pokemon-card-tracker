import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { db } from '../services/db';
import { formatValue } from '../utils/formatters';
import { formatCurrency } from '../utils/currencyAPI';
import { useTheme } from '../contexts/ThemeContext';

// Extracted Card component for better performance
const Card = memo(({ card, cardImage, onCardClick, isSelected, onSelect, displayMetric, onUpdateCard }) => {
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  const getDisplayValue = () => {
    switch (displayMetric) {
      case 'currentValueAUD':
        return { label: 'Current Value', value: formatCurrency(card.currentValueAUD), isProfit: false };
      case 'investmentAUD':
        return { label: 'Investment', value: formatCurrency(card.investmentAUD), isProfit: false, isEditable: true };
      case 'potentialProfit':
        const profit = card.currentValueAUD - card.investmentAUD;
        return { label: 'Profit', value: formatCurrency(profit), isProfit: true, profitValue: profit };
      case 'datePurchased':
        return { label: 'Purchase Date', value: card.datePurchased || 'N/A', isProfit: false };
      case 'player':
        return { label: 'Player', value: card.player || 'N/A', isProfit: false };
      default:
        return { label: 'Current Value', value: formatCurrency(card.currentValueAUD), isProfit: false };
    }
  };

  const displayData = getDisplayValue();

  const handleEditStart = (e) => {
    e.stopPropagation();
    if (displayData.isEditable) {
      setEditValue(card.investmentAUD.toFixed(2));
      setIsEditing(true);
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleEditSave = (e) => {
    e.stopPropagation();
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue >= 0) {
      const updatedCard = {
        ...card,
        investmentAUD: Number(newValue.toFixed(2)),
        potentialProfit: Number((card.currentValueAUD - newValue).toFixed(2))
      };
      onUpdateCard(updatedCard);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEditSave(e);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div 
      className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
        ${isDarkMode ? 'bg-[#1B2131] border-gray-700/50 hover:bg-[#252B3B]' : 'bg-white border-gray-200 hover:bg-gray-50'}
        ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onCardClick(card)}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e, card.slabSerial)}
          className="w-4 h-4 accent-primary"
        />
      </div>

      {/* Card image */}
      <div className="aspect-[2/3] mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {cardImage ? (
          <img 
            src={cardImage} 
            alt={`${card.player} - ${card.card}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-icons text-4xl text-gray-400">image</span>
          </div>
        )}
      </div>

      {/* Card details - restructured layout */}
      <div className="space-y-2 text-center">
        {/* Value amount - now centered and larger */}
        <div className={`text-2xl font-medium ${
          displayData.isProfit 
            ? displayData.profitValue >= 0 
              ? 'text-green-500' 
              : 'text-red-500'
            : isDarkMode 
              ? 'text-gray-200' 
              : 'text-gray-800'
        }`} onClick={handleEditStart}>
          {isEditing && displayData.isEditable ? (
            <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                type="number"
                value={editValue}
                onChange={handleEditChange}
                onKeyDown={handleKeyDown}
                className="w-32 px-2 py-1 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
              <button
                onClick={handleEditSave}
                className="text-sm bg-primary text-white px-2 py-1 rounded hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          ) : (
            displayData.value
          )}
        </div>
        
        {/* Label - shown below the value */}
        <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {displayData.label}
        </div>
        
        {/* Card name - now below the value */}
        <h3 className={`font-medium line-clamp-2 mt-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {card.card}
        </h3>
      </div>
    </div>
  );
});

// Replace FinancialSummary component with individual stat cards
const StatCard = memo(({ label, value, isProfit = false }) => {
  // Determine color class based on profit status
  const colorClass = isProfit
    ? value >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
    : 'text-gray-900 dark:text-white';
    
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
      </div>
      <div className={`text-2xl font-medium ${colorClass}`}>
        {formatValue(value)}
      </div>
    </div>
  );
});

const CardList = ({ cards, exchangeRate, onCardClick, onDeleteCards, onUpdateCard, onAddCard }) => {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState(
    localStorage.getItem('cardListSortField') || 'currentValueAUD'
  );
  const [sortDirection, setSortDirection] = useState(
    localStorage.getItem('cardListSortDirection') || 'desc'
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [displayMetric, setDisplayMetric] = useState(() => {
    const saved = localStorage.getItem('cardListDisplayMetric');
    return saved || 'currentValueAUD';
  });
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [isValueDropdownOpen, setIsValueDropdownOpen] = useState(false);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [cardImages, setCardImages] = useState({});
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editValue, setEditValue] = useState('');
  const { isDarkMode } = useTheme();

  const valueDropdownRef = useRef(null);
  const metricDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
        setIsMetricDropdownOpen(false);
      }
      if (valueDropdownRef.current && !valueDropdownRef.current.contains(event.target)) {
        setIsValueDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('cardListSortField', sortField);
    localStorage.setItem('cardListSortDirection', sortDirection);
  }, [sortField, sortDirection]);

  useEffect(() => {
    localStorage.setItem('cardListDisplayMetric', displayMetric);
  }, [displayMetric]);

  // Reset selected cards when the cards prop changes
  useEffect(() => {
    setSelectedCards(new Set());
  }, [cards]);

  // Load card images
  useEffect(() => {
    const loadCardImages = async () => {
      // Clear previous object URLs to prevent memory leaks
      Object.values(cardImages).forEach(url => {
        URL.revokeObjectURL(url);
      });
      
      const images = {};
      for (const card of cards) {
        try {
          // Add a timestamp parameter to force refresh when the card has an imageUpdatedAt flag
          const imageBlob = await db.getImage(card.slabSerial);
          if (imageBlob) {
            const imageUrl = URL.createObjectURL(imageBlob);
            images[card.slabSerial] = imageUrl;
          }
        } catch (error) {
          console.error('Error loading image for card:', card.slabSerial, error);
        }
      }
      setCardImages(images);
    };

    loadCardImages();

    // Cleanup URLs when component unmounts or cards change
    return () => {
      Object.values(cardImages).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [cards]);

  // Function to refresh a single card's image
  const refreshCardImage = async (cardId) => {
    try {
      // Revoke the old object URL if it exists
      if (cardImages[cardId]) {
        URL.revokeObjectURL(cardImages[cardId]);
      }
      
      // Load the updated image
      const imageBlob = await db.getImage(cardId);
      if (imageBlob) {
        const imageUrl = URL.createObjectURL(imageBlob);
        setCardImages(prev => ({
          ...prev,
          [cardId]: imageUrl
        }));
      } else {
        // Remove the image if it no longer exists
        setCardImages(prev => {
          const newImages = { ...prev };
          delete newImages[cardId];
          return newImages;
        });
      }
    } catch (error) {
      console.error('Error refreshing card image:', cardId, error);
    }
  };

  // Wrap the onUpdateCard function to handle image refreshing
  const handleCardUpdate = useCallback(async (updatedCard) => {
    // If the card has an updated image, refresh it immediately
    if (updatedCard.imageUpdatedAt) {
      await refreshCardImage(updatedCard.slabSerial);
    }
    
    // Call the original onUpdateCard function
    onUpdateCard(updatedCard);
  }, [onUpdateCard, refreshCardImage]);

  // Sort options
  const sortOptions = [
    { field: 'currentValueAUD', label: 'Current Value' },
    { field: 'investmentAUD', label: 'Investment' },
    { field: 'potentialProfit', label: 'Profit' },
    { field: 'datePurchased', label: 'Purchase Date' },
    { field: 'player', label: 'Player Name' }
  ];

  // Get label for sort field
  const getSortFieldLabel = (field) => {
    const option = sortOptions.find(opt => opt.field === field);
    return option ? option.label : 'Current Value';
  };

  const metricOptions = [
    { value: 'currentValueAUD', label: 'Current Value' },
    { value: 'investmentAUD', label: 'Investment' },
    { value: 'potentialProfit', label: 'Profit' },
    { value: 'datePurchased', label: 'Purchase Date' },
    { value: 'player', label: 'Player Name' },
    { value: 'condition', label: 'Condition' },
    { value: 'set', label: 'Set' }
  ];

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  
  // Sort dropdown toggle
  const toggleSortDropdown = () => {
    // Close other dropdowns
    setIsMetricDropdownOpen(false);
    setIsValueDropdownOpen(false);
    // Toggle sort dropdown
    setShowSortDropdown(!showSortDropdown);
  };
  
  // Metric dropdown toggle
  const toggleMetricDropdown = () => {
    // Close other dropdowns
    setShowSortDropdown(false);
    setIsValueDropdownOpen(false);
    // Toggle metric dropdown
    setIsMetricDropdownOpen(!isMetricDropdownOpen);
  };
  
  // Value dropdown toggle
  const toggleValueDropdown = () => {
    // Close other dropdowns
    setShowSortDropdown(false);
    setIsMetricDropdownOpen(false);
    // Toggle value dropdown
    setIsValueDropdownOpen(!isValueDropdownOpen);
  };

  // Handle sort field change
  const handleSortChange = (field) => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('desc');  // Default to descending for new sort fields
    }
    setShowSortDropdown(false); // Close the dropdown after selection
  };

  const handleSelectCard = (e, cardId) => {
    // If e exists, stop propagation to prevent triggering the card click
    if (e) {
      e.stopPropagation();
    }
    
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e) => {
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(card => card.slabSerial)));
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCards.size} cards?`)) {
      onDeleteCards(Array.from(selectedCards));
      setSelectedCards(new Set());
    }
  };

  const handleInvestmentEdit = (e, card) => {
    e.stopPropagation(); // Prevent card click
    setEditingInvestment(card.slabSerial);
    setEditValue(card.investmentAUD.toString());
  };

  const handleInvestmentChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInvestmentSave = (e, card) => {
    e.stopPropagation(); // Prevent card click
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue >= 0) {
      const updatedCard = {
        ...card,
        investmentAUD: newValue,
        potentialProfit: card.currentValueAUD - newValue
      };
      handleCardUpdate(updatedCard);
    }
    setEditingInvestment(null);
  };

  const handleInvestmentKeyDown = (e, card) => {
    if (e.key === 'Enter') {
      handleInvestmentSave(e, card);
    } else if (e.key === 'Escape') {
      setEditingInvestment(null);
    }
  };

  // Get filtered and sorted cards
  const filteredCards = useMemo(() => {
    // Filter cards by search term
    const filtered = filter
      ? cards.filter(card => {
          const searchTerm = filter.toLowerCase();
          return (
            (card.card && card.card.toLowerCase().includes(searchTerm)) ||
            (card.player && card.player.toLowerCase().includes(searchTerm)) ||
            (card.set && card.set.toLowerCase().includes(searchTerm)) ||
            (card.slabSerial && card.slabSerial.toLowerCase().includes(searchTerm))
          );
        })
      : cards;

    // Sort cards
    return [...filtered].sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Handle undefined or null values
      if (valueA === undefined || valueA === null) valueA = '';
      if (valueB === undefined || valueB === null) valueB = '';

      // Sort by date if the field is datePurchased
      if (sortField === 'datePurchased') {
        const dateA = valueA ? new Date(valueA) : new Date(0);
        const dateB = valueB ? new Date(valueB) : new Date(0);
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Sort by string if the field contains string values
      if (typeof valueA === 'string' || typeof valueB === 'string') {
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
      
      // Sort by number for everything else
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }, [cards, filter, sortField, sortDirection]);

  // Memoized totals
  const totals = useMemo(() => {
    const totalInvestment = filteredCards.reduce((sum, card) => sum + (card.investmentAUD || 0), 0);
    const totalValue = filteredCards.reduce((sum, card) => sum + (card.currentValueAUD || 0), 0);
    return {
      totalInvestment,
      totalValue,
      totalProfit: totalValue - totalInvestment
    };
  }, [filteredCards]);

  return (
    <div className="space-y-4">
      {/* Total Cards Counter */}
      <div className="total-cards-counter">
        <span className="material-icons total-cards-icon">view_module</span>
        <span className="total-cards-text">Total Cards: {filteredCards.length}</span>
      </div>
      
      {/* Financial Summary */}
      <div className="stats-section">
        <StatCard 
          label="Total Investment" 
          value={totals.totalInvestment} 
        />
        <StatCard 
          label="Total Value" 
          value={totals.totalValue} 
        />
        <StatCard 
          label="Total Profit" 
          value={totals.totalProfit} 
          isProfit={true}
        />
      </div>
      
      {/* Filters and controls */}
      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by name, set, or serial number..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        
        <div className="controls-container">
          <div className="sort-container" ref={sortDropdownRef}>
            <button
              className="sort-button"
              onClick={toggleSortDropdown}
            >
              <div>
                <span className="material-icons">sort</span>
                <span>Sort by {getSortFieldLabel(sortField)} {sortDirection === 'asc' ? '(Asc)' : '(Desc)'}</span>
              </div>
              <span className="material-icons">
                {showSortDropdown ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>
            
            {showSortDropdown && (
              <div className="sort-dropdown">
                {sortOptions.map(option => (
                  <div
                    key={option.field}
                    className={`sort-option ${sortField === option.field ? 'active' : ''}`}
                    onClick={() => handleSortChange(option.field)}
                  >
                    <span>{option.label}</span>
                    {sortField === option.field && (
                      <span className="material-icons">
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                ))}
                
                <div className="sort-option-divider"></div>
                
                <div 
                  className="sort-option"
                  onClick={toggleSortDirection}
                >
                  <span>Change Order: {sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
                  <span className="material-icons">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="view-container" ref={metricDropdownRef}>
            <button
              onClick={toggleMetricDropdown}
              className="view-button"
            >
              <div className="flex items-center gap-2">
                <span className="material-icons">visibility</span>
                <span>View {metricOptions.find(opt => opt.value === displayMetric)?.label || 'Current Value'}</span>
              </div>
              <span className="material-icons">
                {isMetricDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            
            {isMetricDropdownOpen && (
              <div className="view-dropdown">
                {metricOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`sort-option ${option.value === displayMetric ? 'active' : ''}`}
                    onClick={() => {
                      setDisplayMetric(option.value);
                      setIsMetricDropdownOpen(false);
                    }}
                  >
                    {option.value === displayMetric && (
                      <span className="material-icons">check</span>
                    )}
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="controls-right">
            <button
              onClick={handleDeleteSelected}
              className="delete-button"
              disabled={selectedCards.size === 0}
              style={{ opacity: selectedCards.size === 0 ? 0.5 : 1 }}
            >
              <span className="material-icons mr-2">delete</span>
              Delete {selectedCards.size > 0 ? `(${selectedCards.size})` : ''}
            </button>
            <button
              onClick={onAddCard}
              className="btn btn-primary"
            >
              <span className="material-icons mr-2">add</span>
              Add Card
            </button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="card-grid">
        {filteredCards.map(card => (
          <Card
            key={card.slabSerial}
            card={card}
            cardImage={cardImages[card.slabSerial]}
            onCardClick={onCardClick}
            isSelected={selectedCards.has(card.slabSerial)}
            onSelect={handleSelectCard}
            displayMetric={displayMetric}
            onUpdateCard={onUpdateCard}
          />
        ))}
      </div>
      
      {/* Editing investment modal */}
      {editingInvestment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1B2131] p-4 rounded-xl w-96">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Edit Investment</h3>
            <input
              type="number"
              value={editValue}
              onChange={handleInvestmentChange}
              onKeyDown={(e) => handleInvestmentKeyDown(e, editingInvestment)}
              className="search-input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingInvestment(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={(e) => handleInvestmentSave(e, editingInvestment)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CardList);