import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { db } from '../services/db';
import { formatValue } from '../utils/formatters';
import { formatCurrency } from '../utils/currencyAPI';
import { useTheme } from '../contexts/ThemeContext';

// Extracted Card component for better performance
const Card = memo(({ card, cardImage, onCardClick, isSelected, onSelect, displayMetric }) => {
  const { isDarkMode } = useTheme();
  
  const getDisplayValue = () => {
    switch (displayMetric) {
      case 'currentValueAUD':
        return { label: 'Current Value', value: formatCurrency(card.currentValueAUD), isProfit: false };
      case 'investmentAUD':
        return { label: 'Investment', value: formatCurrency(card.investmentAUD), isProfit: false };
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

      {/* Card details */}
      <div className="space-y-2">
        <h3 className={`font-medium line-clamp-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {card.card}
        </h3>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {displayData.label}:
          </span>
          <span className={`text-sm ${
            displayData.isProfit 
              ? displayData.profitValue >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
              : isDarkMode 
                ? 'text-gray-200' 
                : 'text-gray-800'
          }`}>
            {displayData.value}
          </span>
        </div>
      </div>
    </div>
  );
});

// Replace FinancialSummary component with individual stat cards
const StatCard = memo(({ label, value, isProfit = false }) => {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
      </div>
      <div className={`stat-value ${isProfit && value >= 0 ? 'profit-value' : isProfit && value < 0 ? 'loss-value' : ''}`}>
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

  // Load card images
  useEffect(() => {
    const loadCardImages = async () => {
      const images = {};
      for (const card of cards) {
        try {
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

  // Reset selected cards when the cards prop changes
  useEffect(() => {
    setSelectedCards(new Set());
  }, [cards]);

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
      onUpdateCard(updatedCard); // Use the onUpdateCard prop instead of onCardClick
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
            {selectedCards.size > 0 ? (
              <button
                onClick={handleDeleteSelected}
                className="delete-button"
              >
                <span className="material-icons mr-2">delete</span>
                Delete ({selectedCards.size})
              </button>
            ) : null}
            <button
              onClick={onAddCard}
              className="btn btn-primary w-[160px]"
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