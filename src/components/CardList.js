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
  const { isDark } = useTheme();

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
    { value: 'potentialProfit', label: 'Profit' }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">TOTAL INVESTMENT</div>
          <div className="text-2xl text-text dark:text-text-dark text-left">
            ${totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">TOTAL VALUE</div>
          <div className="text-2xl text-text dark:text-text-dark text-left">
            ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">TOTAL PROFIT</div>
          <div className={`text-2xl ${totalProfit >= 0 ? 'text-primary' : 'text-error'} text-left`}>
            {totalProfit >= 0 ? '+' : ''}{formatValue(totalProfit, 'currency')}
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto md:flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Search by name, set, or serial number..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-text-dark px-3 py-2 rounded-md focus:outline-none focus:border-primary"
          />
        </div>
        
        <div className="flex items-center gap-4">
          {selectedCards.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 rounded-md bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-error dark:text-error hover:bg-secondary dark:hover:bg-secondary-dark transition-all duration-200 text-sm"
            >
              Delete Selected ({selectedCards.size})
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="relative" ref={valueDropdownRef}>
              <button
                onClick={() => setIsValueDropdownOpen(!isValueDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-text-dark hover:bg-secondary dark:hover:bg-secondary-dark transition-all duration-200 text-sm"
              >
                <span className="material-icons text-base">filter_list</span>
                Filter by {sortOptions.find(opt => opt.value === sortField)?.label}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSortDirection();
                  }} 
                  className="ml-2"
                >
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                </button>
              </button>

              {isValueDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-border dark:border-border-dark rounded-md shadow-lg min-w-[200px] z-[100]">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-text dark:text-text-dark"
                      onClick={() => handleSort(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative" ref={metricDropdownRef}>
              <button
                onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-border dark:border-border-dark text-text dark:text-text-dark hover:bg-gray-50 transition-all duration-200 text-sm"
              >
                <span className="material-icons text-base">visibility</span>
                View {metricOptions.find(opt => opt.value === displayMetric)?.label}
              </button>

              {isMetricDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-border dark:border-border-dark rounded-md shadow-lg min-w-[200px] z-[100]">
                  {metricOptions.map(option => (
                    <button
                      key={option.value}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-text dark:text-text-dark bg-white"
                      onClick={() => {
                        setDisplayMetric(option.value);
                        setIsMetricDropdownOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Card List */}
      <div className="space-y-2">
        {filteredCards.map(card => (
          <div
            key={card.slabSerial}
            className="flex items-center p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
            onClick={() => onCardClick(card.slabSerial)}
          >
            <div className="flex items-center gap-4 flex-1">
              <input
                type="checkbox"
                checked={selectedCards.has(card.slabSerial)}
                onChange={(e) => handleSelectCard(e, card.slabSerial)}
                className="w-5 h-5 rounded border-border dark:border-border-dark"
                onClick={(e) => e.stopPropagation()}
              />
              
              {cardImages[card.slabSerial] ? (
                <img
                  src={cardImages[card.slabSerial]}
                  alt={card.player}
                  className="w-16 h-24 object-contain bg-background dark:bg-background-dark rounded"
                />
              ) : (
                <div className="w-16 h-24 bg-background dark:bg-background-dark rounded flex items-center justify-center">
                  <span className="material-icons text-gray-400">image</span>
                </div>
              )}
              
              <div className="flex-1">
                <div className="text-sm text-gray-400">{card.set}</div>
                <div className="text-base text-text dark:text-text-dark">{card.player}</div>
                <div className="text-sm text-gray-400">Serial: {card.slabSerial}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              {editingInvestment === card.slabSerial ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    value={editValue}
                    onChange={handleInvestmentChange}
                    onKeyDown={(e) => handleInvestmentKeyDown(e, card)}
                    className="w-24 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-text-dark px-3 py-2 rounded-md focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    className="px-4 py-2 rounded-md bg-primary text-black hover:bg-primary/90 transition-all duration-200 text-sm"
                    onClick={(e) => handleInvestmentSave(e, card)}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-gray-400">Investment</div>
                    <div
                      className="text-base text-text dark:text-text-dark cursor-pointer hover:underline text-left"
                      onClick={(e) => handleInvestmentEdit(e, card)}
                    >
                      ${card.investmentAUD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </div>

                  {displayMetric !== 'investmentAUD' && (
                    <div>
                      <div className="text-sm text-gray-400">
                        {displayMetric === 'currentValueAUD' ? 'Current Value' : 'Profit'}
                      </div>
                      {displayMetric === 'currentValueAUD' ? (
                        <>
                          <div className="text-base text-text dark:text-text-dark text-left">
                            ${card.currentValueAUD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </div>
                          <div className={`text-sm ${card.potentialProfit >= 0 ? 'text-primary' : 'text-error'} text-left`}>
                            {card.potentialProfit >= 0 ? '+' : ''}{formatValue(card.potentialProfit, 'currency')}
                          </div>
                        </>
                      ) : (
                        <div className={`text-base ${card.potentialProfit >= 0 ? 'text-primary' : 'text-error'} text-left`}>
                          {card.potentialProfit >= 0 ? '+' : ''}{formatValue(card.potentialProfit, 'currency')}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        
        {filteredCards.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No cards found
          </div>
        )}
      </div>
    </div>
  );
};

export default CardList;