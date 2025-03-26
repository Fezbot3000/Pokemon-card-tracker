import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { db } from '../services/db';
import { formatValue } from '../utils/formatters';
import { formatCurrency } from '../utils/currencyAPI';
import { useTheme } from '../contexts/ThemeContext';
import SaleModal from './SaleModal';
import ConfirmDialog from './ConfirmDialog';
import { toast } from 'react-hot-toast';

// Extracted Card component for better performance
const Card = memo(({ card, cardImage, onCardClick, isSelected, onSelect, displayMetric, onUpdateCard }) => {
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  const handleCardClick = (e) => {
    e.stopPropagation();
    onCardClick(card);
  };

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
      className={`group relative bg-white dark:bg-[#1B2131] rounded-xl shadow-sm
                  border border-gray-200 dark:border-gray-700/50 overflow-hidden
                  transition-all duration-200 hover:shadow-md cursor-pointer
                  ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={handleCardClick}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e, card.slabSerial);
          }}
          className="w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label={`Select ${card.card}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Card image */}
      <div className="card-image">
        <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden flex items-center justify-center">
          {cardImage ? (
            <img
              src={cardImage} 
              alt={`${card.player} - ${card.card}`}
              className="w-full h-full object-contain"
              loading="lazy"
              style={{
                borderRadius: '0.5rem'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">image</span>
            </div>
          )}
        </div>
      </div>

      {/* Card details with center alignment */}
      <div className="px-3 sm:px-6 pb-3 sm:pb-6 text-center">
        {/* Card name */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-lg truncate">
          {card.card}
        </h3>

        {/* Player name */}
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-4 truncate">
          {card.player || 'Unknown Player'}
        </p>

        {/* Stats - Stacked vertically with improved typography */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Investment</div>
            <div className="text-sm sm:text-xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(card.investmentAUD)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Current Value</div>
            <div className="text-sm sm:text-xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(card.currentValueAUD)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Profit</div>
            <div className={`text-sm sm:text-xl font-semibold ${(card.currentValueAUD - card.investmentAUD) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(card.currentValueAUD - card.investmentAUD)}
            </div>
          </div>
        </div>
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

const CardList = ({ 
  cards, 
  exchangeRate, 
  onCardClick, 
  onDeleteCards, 
  onUpdateCard, 
  onAddCard,
  selectedCollection,
  collections,
  setCollections
}) => {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState(
    localStorage.getItem('cardListSortField') || 'currentValueAUD'
  );
  const [sortDirection, setSortDirection] = useState(
    localStorage.getItem('cardListSortDirection') || 'desc'
  );
  const [viewMode, setViewMode] = useState(localStorage.getItem('cardListViewMode') || 'grid');
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
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedCardsForSale, setSelectedCardsForSale] = useState([]);
  const [buyer, setBuyer] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardsToDelete, setCardsToDelete] = useState([]);

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

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('cardListViewMode', viewMode);
  }, [viewMode]);

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

  // Function to get the label for a sort field
  const getSortFieldLabel = (field) => {
    const option = sortOptions.find(opt => opt.field === field);
    return option ? option.label : field;
  };

  // Handle sort field change
  const handleSortChange = (field) => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('desc');  // Default to descending for new sort fields
    }
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

  // Calculate totals
  const totals = useMemo(() => {
    return cards.reduce((acc, card) => {
      acc.investment += parseFloat(card.investmentAUD) || 0;
      acc.value += parseFloat(card.currentValueAUD) || 0;
      acc.profit += (parseFloat(card.currentValueAUD) || 0) - (parseFloat(card.investmentAUD) || 0);
      return acc;
    }, { investment: 0, value: 0, profit: 0 });
  }, [cards]);

  // Reset state when collection changes
  useEffect(() => {
    setSelectedCards(new Set());
    setSelectedCardsForSale([]);
    setShowSaleModal(false);
    setBuyer('');
    setFilter('');
  }, [selectedCollection]);

  const handleMarkAsSold = () => {
    if (selectedCards.size === 0) {
      toast.error('Please select at least one card to mark as sold');
      return;
    }
    // Get the full card data for selected cards
    const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
    setSelectedCardsForSale(selectedCardData);
    setShowSaleModal(true);
  };

  // Function to generate a unique invoice ID
  const generateInvoiceId = () => {
    // Get existing sold cards
    const existingSoldCards = JSON.parse(localStorage.getItem('soldCards') || '[]');
    
    // Get the highest invoice number
    let highestNumber = 0;
    existingSoldCards.forEach(card => {
      if (card.invoiceId) {
        const match = card.invoiceId.match(/INV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestNumber) {
            highestNumber = num;
          }
        }
      }
    });
    
    // Generate next invoice number
    const nextNumber = highestNumber + 1;
    
    // Format with leading zeros (e.g., INV-0001)
    return `INV-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleSaleConfirm = async ({ buyer, dateSold, soldPrices, totalSalePrice, totalProfit }) => {
    // Generate a new invoice ID for this transaction
    const invoiceId = generateInvoiceId();
    
    const selectedCardsData = selectedCardsForSale.map(card => ({
      ...card,
      finalValueAUD: parseFloat(soldPrices[card.slabSerial]),
      finalProfitAUD: parseFloat(soldPrices[card.slabSerial]) - card.investmentAUD,
      dateSold,
      buyer,
      invoiceId // Add the invoice ID to each card
    }));

    // Get existing sold cards
    const existingSoldCards = JSON.parse(localStorage.getItem('soldCards') || '[]');

    // Add the new invoice to sold cards
    localStorage.setItem('soldCards', JSON.stringify([...existingSoldCards, ...selectedCardsData]));

    // Remove cards from all collections
    const updatedCollections = { ...collections };
    const cardIds = selectedCardsData.map(card => card.slabSerial);
    
    // Remove from each collection
    Object.keys(updatedCollections).forEach(collectionName => {
      if (Array.isArray(updatedCollections[collectionName])) {
        updatedCollections[collectionName] = updatedCollections[collectionName].filter(
          card => !cardIds.includes(card.slabSerial)
        );
      }
    });

    // Save updated collections
    await db.saveCollections(updatedCollections);
    setCollections(updatedCollections);

    // Clear selection and close modal
    setSelectedCards(new Set());
    setShowSaleModal(false);
    setSelectedCardsForSale([]);

    // Show success message using react-hot-toast only
    toast.success(`${selectedCardsData.length} card${selectedCardsData.length > 1 ? 's' : ''} marked as sold`);
  };

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

  const handleDeleteClick = () => {
    const selectedCardsArray = Array.from(selectedCards);
    setCardsToDelete(selectedCardsArray);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Create a copy of the collections
      const updatedCollections = { ...collections };

      // Remove the cards from all collections
      Object.keys(updatedCollections).forEach(collectionName => {
        if (Array.isArray(updatedCollections[collectionName])) {
          updatedCollections[collectionName] = updatedCollections[collectionName].filter(
            card => !cardsToDelete.includes(card.slabSerial)
          );
        }
      });

      // Save to database
      await db.saveCollections(updatedCollections);
      
      // Update state
      setCollections(updatedCollections);

      // Call the original onDeleteCards function
      onDeleteCards(cardsToDelete);
      
      // Clear selection
      setSelectedCards(new Set());
      setShowDeleteConfirm(false);
      setCardsToDelete([]);
      
      // Show success message
      toast.success(`${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Error deleting cards:', error);
      toast.error('Failed to delete cards');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1B2131] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">TOTAL INVESTMENT</div>
          <div className="text-2xl text-gray-900 dark:text-white font-semibold">
            {formatCurrency(totals.investment)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">TOTAL VALUE</div>
          <div className="text-2xl text-gray-900 dark:text-white font-semibold">
            {formatCurrency(totals.value)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">TOTAL PROFIT</div>
          <div className={`text-2xl font-semibold ${totals.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(totals.profit)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">TOTAL CARDS</div>
          <div className="text-2xl text-gray-900 dark:text-white font-semibold flex items-center gap-2">
            <span className="material-icons text-gray-600 dark:text-gray-300">style</span>
            {filteredCards.length}
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:flex-1">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search by name, set, or serial number..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-12 px-4 py-3 rounded-xl bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-12 w-12 flex items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'bg-white dark:bg-[#1B2131] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252B3B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                }`}
                title="Grid View"
              >
                <span className="material-icons">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`h-12 w-12 flex items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'bg-white dark:bg-[#1B2131] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252B3B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                }`}
                title="List View"
              >
                <span className="material-icons">view_list</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[208px]">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="h-12 w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1B2131] text-gray-700 dark:text-white
                       flex items-center justify-between whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <span className="truncate">Sort by {getSortFieldLabel(sortField)}</span>
              <span className="material-icons text-gray-600 dark:text-gray-300 ml-2 flex-shrink-0">
                {showSortDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 mt-2 w-full rounded-lg shadow-lg
                            bg-white dark:bg-[#1B2131] z-50 py-1">
                {sortOptions.map(option => (
                  <div
                    key={option.field}
                    className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252B3B] 
                             cursor-pointer text-gray-700 dark:text-gray-300"
                    onClick={() => handleSortChange(option.field)}
                  >
                    <span>{option.label}</span>
                    {sortField === option.field && (
                      <span className="material-icons text-gray-600 dark:text-gray-300">
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onAddCard}
            className="h-12 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          >
            Add Card
          </button>
        </div>
      </div>

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-icons text-5xl mb-4 text-gray-400">search_off</span>
          <h3 className="text-xl font-medium mb-2">No cards found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCards.map(card => (
            <div 
              key={card.slabSerial}
              className="bg-white dark:bg-[#1B2131] rounded-xl overflow-hidden transition-all duration-200 
                       hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              onClick={() => onCardClick(card)}
            >
              <Card
                card={card}
                cardImage={cardImages[card.slabSerial]}
                onCardClick={onCardClick}
                isSelected={selectedCards.has(card.slabSerial)}
                onSelect={handleSelectCard}
                displayMetric={displayMetric}
                onUpdateCard={onUpdateCard}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCards.map(card => (
            <div
              key={card.slabSerial}
              onClick={() => onCardClick(card)}
              className="bg-white dark:bg-[#1B2131] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-colors"
            >
              <div className="flex items-center p-2 sm:p-4">
                {/* Small image - consistent size on mobile and desktop */}
                <div className="flex-shrink-0 w-16 sm:w-20 h-20 sm:h-28 mr-3 sm:mr-4">
                  {cardImages[card.slabSerial] ? (
                    <img
                      src={cardImages[card.slabSerial]}
                      alt={`${card.player} - ${card.card}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
                      <span className="material-icons text-gray-400">image</span>
                    </div>
                  )}
                </div>
                
                {/* Card information - simplified for mobile */}
                <div className="flex-grow min-w-0">
                  {/* Card name - always shown */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 max-w-[70%]">
                      <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                        {card.card}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {card.player}
                      </p>
                    </div>
                    
                    {/* Checkbox - positioned to the right and properly sized for touch */}
                    <div onClick={e => e.stopPropagation()} className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.slabSerial)}
                        onChange={(e) => handleSelectCard(e, card.slabSerial)}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        aria-label={`Select ${card.card}`}
                      />
                    </div>
                  </div>
                  
                  {/* Dynamic content based on sort field */}
                  <div className="mt-1 sm:mt-2">
                    {/* Show only the relevant info based on sort field */}
                    {sortField === 'potentialProfit' && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Profit:</span>
                        <span className={`ml-2 font-medium text-sm sm:text-base ${(card.currentValueAUD - card.investmentAUD) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(card.currentValueAUD - card.investmentAUD)}
                        </span>
                      </div>
                    )}
                    
                    {sortField === 'investmentAUD' && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Investment:</span>
                        <span className="ml-2 font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                          {formatCurrency(card.investmentAUD)}
                        </span>
                      </div>
                    )}
                    
                    {sortField === 'currentValueAUD' && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Value:</span>
                        <span className="ml-2 font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                          {formatCurrency(card.currentValueAUD)}
                        </span>
                      </div>
                    )}
                    
                    {sortField === 'datePurchased' && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="ml-2 font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                          {card.datePurchased || 'N/A'}
                        </span>
                      </div>
                    )}
                    
                    {sortField === 'player' && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Player:</span>
                        <span className="ml-2 font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {card.player || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Cards Actions */}
      {selectedCards.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 
                      flex flex-col items-center gap-2 px-6 py-3 rounded-lg shadow-lg
                      bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 z-50">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAsSold}
              className="px-4 py-2 rounded-lg bg-green-500 text-white
                       hover:bg-green-600 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-icons text-base">sell</span>
              <span>Sell</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="px-4 py-2 rounded-lg bg-red-500 text-white
                       hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <span className="material-icons text-base">delete</span>
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedCards(new Set())}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span className="material-icons text-base">close</span>
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          setSelectedCardsForSale([]);
          setSelectedCards(new Set());
        }}
        selectedCards={selectedCardsForSale}
        onConfirm={handleSaleConfirm}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCardsToDelete([]);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Cards"
        message={`Are you sure you want to delete ${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  );
};

export default CardList;