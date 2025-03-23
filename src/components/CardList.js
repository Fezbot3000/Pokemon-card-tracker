import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

const CardList = ({ cards, exchangeRate, onCardClick, onDeleteCards, onUpdateCard }) => {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState(() => {
    const saved = localStorage.getItem('cardListSortField');
    return saved || 'currentValueAUD';
  });
  const [sortDirection, setSortDirection] = useState(() => {
    const saved = localStorage.getItem('cardListSortDirection');
    return saved || 'desc';
  });
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

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (valueDropdownRef.current && !valueDropdownRef.current.contains(event.target)) {
        setIsValueDropdownOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
        setIsMetricDropdownOpen(false);
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
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem('cardListSortDirection', sortDirection);
  }, [sortDirection]);

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

  const sortOptions = [
    { value: 'currentValueAUD', label: 'Current Value' },
    { value: 'investmentAUD', label: 'Investment' },
    { value: 'potentialProfit', label: 'Profit' },
    { value: 'datePurchased', label: 'Purchase Date' },
    { value: 'player', label: 'Player Name' }
  ];

  const metricOptions = [
    { value: 'currentValueAUD', label: 'Current Value' },
    { value: 'investmentAUD', label: 'Investment' },
    { value: 'potentialProfit', label: 'Profit' },
    { value: 'datePurchased', label: 'Purchase Date' },
    { value: 'player', label: 'Player Name' },
    { value: 'condition', label: 'Condition' },
    { value: 'set', label: 'Set' }
  ];

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setIsValueDropdownOpen(false);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleSelectCard = (e, cardId) => {
    e.stopPropagation();
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

  // Filter and sort cards
  const filteredCards = cards
    .filter(card => {
      const searchString = filter.toLowerCase();
      return (
        card.player?.toLowerCase().includes(searchString) ||
        card.set?.toLowerCase().includes(searchString) ||
        card.slabSerial?.toString().toLowerCase().includes(searchString)
      );
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'datePurchased') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Calculate totals
  const totalInvestment = filteredCards.reduce((sum, card) => sum + card.investmentAUD, 0);
  const totalValue = filteredCards.reduce((sum, card) => sum + card.currentValueAUD, 0);
  const totalProfit = totalValue - totalInvestment;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="summary-card">
          <div className="summary-label">TOTAL INVESTMENT</div>
          <div className="summary-value">
            ${totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-label">TOTAL VALUE</div>
          <div className="summary-value">
            ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-label">TOTAL PROFIT</div>
          <div className={`text-2xl font-semibold ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatValue(totalProfit, 'currency')}
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="search-controls">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by name, set, or serial number..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="sort-controls">
          <div className="relative w-full sm:w-auto" ref={valueDropdownRef}>
            <button
              onClick={() => setIsValueDropdownOpen(!isValueDropdownOpen)}
              className="sort-btn"
            >
              <div className="sort-btn-content">
                <span className="material-icons">sort</span>
                <span>Sort by {sortOptions.find(o => o.value === sortField)?.label}</span>
              </div>
              <span className="material-icons">{isValueDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            
            {isValueDropdownOpen && (
              <div className="filter-dropdown">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    className="filter-item"
                    onClick={() => handleSort(option.value)}
                  >
                    {option.value === sortField && (
                      <span className="material-icons text-sm text-primary">check</span>
                    )}
                    {option.label}
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  <button 
                    className="filter-item"
                    onClick={toggleSortDirection}
                  >
                    <span className="material-icons text-sm">
                      {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    {sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative w-full sm:w-auto" ref={metricDropdownRef}>
            <button
              onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
              className="sort-btn"
            >
              <div className="sort-btn-content">
                <span className="material-icons">visibility</span>
                <span>View {displayMetric === 'currentValueAUD' 
                  ? 'Current Value' 
                  : displayMetric === 'investmentAUD' 
                    ? 'Investment' 
                    : 'Profit'}</span>
              </div>
              <span className="material-icons">{isMetricDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            
            {isMetricDropdownOpen && (
              <div className="view-dropdown">
                <button 
                  className="view-option border-b border-gray-700"
                  onClick={() => {
                    setDisplayMetric('currentValueAUD');
                    setIsMetricDropdownOpen(false);
                  }}
                >
                  Current Value
                </button>
                <button 
                  className="view-option border-b border-gray-700"
                  onClick={() => {
                    setDisplayMetric('investmentAUD');
                    setIsMetricDropdownOpen(false);
                  }}
                >
                  Investment
                </button>
                <button 
                  className="view-option"
                  onClick={() => {
                    setDisplayMetric('potentialProfit');
                    setIsMetricDropdownOpen(false);
                  }}
                >
                  Profit
                </button>
              </div>
            )}
          </div>

          {selectedCards.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger w-full sm:w-auto"
            >
              Delete ({selectedCards.size})
            </button>
          )}
        </div>
      </div>

      {/* Card List */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No cards found. Try adjusting your search filter.
        </div>
      ) : (
        <div>
          {filteredCards.map(card => (
            <div 
              key={card.slabSerial} 
              className="card-item"
              onClick={() => onCardClick(card.slabSerial)}
            >
              <div className="card-item-left">
                <input
                  type="checkbox"
                  checked={selectedCards.has(card.slabSerial)}
                  onChange={e => handleSelectCard(e, card.slabSerial)}
                  onClick={e => e.stopPropagation()}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                
                <div className="card-image">
                  {cardImages[card.slabSerial] ? (
                    <img src={cardImages[card.slabSerial]} alt={card.card} className="object-contain h-full w-full" />
                  ) : (
                    <div className="text-4xl text-gray-300 dark:text-gray-600">🃏</div>
                  )}
                </div>
                
                <div className="card-info">
                  <div className="card-subtitle">Pokemon Game</div>
                  <div className="card-title">{card.card}</div>
                  <div className="card-subtitle">Serial: {card.slabSerial}</div>
                </div>
              </div>

              <div className="card-item-right">
                <div className="card-value-group">
                  <div className="card-investment">Investment</div>
                  <div className="card-value">${formatValue(card.investmentAUD, 'currency', false)}</div>
                </div>
                
                <div className="card-value-group">
                  <div className="card-investment">Current Value</div>
                  <div className="card-value">${formatValue(card.currentValueAUD, 'currency', false)}</div>
                  <div className={`card-profit ${card.potentialProfit >= 0 ? 'positive' : 'negative'}`}>
                    {card.potentialProfit >= 0 ? '+' : ''}{formatValue(card.potentialProfit, 'currency', false)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList;