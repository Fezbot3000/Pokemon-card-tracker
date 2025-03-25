import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { db } from '../services/db';
import { formatValue, formatCurrency } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';
import { cardService } from '../services/cardService';
import { showToast } from '../utils/toast';

// Extracted Card component for better performance
const Card = memo(({ card, onCardClick, onCheckboxClick, isSelected }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setImageLoading(true);
        console.log(`Attempting to load image for card: ${card.slabSerial}`);
        const imageBlob = await db.getImage(card.slabSerial);
        if (imageBlob) {
          console.log(`Found image for card ${card.slabSerial}, size: ${imageBlob.size} bytes, type: ${imageBlob.type}`);
          const url = URL.createObjectURL(imageBlob);
          setImageUrl(url);
        } else {
          console.log(`No image found for card ${card.slabSerial}`);
        }
      } catch (error) {
        console.error(`Error loading image for card ${card.slabSerial}:`, error);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();

    // Cleanup
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [card.slabSerial, card.imageUpdatedAt]);

  const handleClick = (e) => {
    // Stop event propagation to prevent both checkbox and card click from firing
    e.stopPropagation();
    if (!e.target.closest('.checkbox-container')) {
      onCardClick(card);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onCheckboxClick(card.slabSerial);
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary' : ''
      } bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-[#252B3B]`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div 
        className="absolute top-2 right-2 z-10 checkbox-container"
        onClick={handleCheckboxClick}
      >
        <div className={`w-5 h-5 rounded border ${
          isSelected 
            ? 'bg-primary border-primary' 
            : 'border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800'
        } flex items-center justify-center transition-colors duration-200`}>
          {isSelected && (
            <span className="material-icons text-white text-sm">check</span>
          )}
        </div>
      </div>

      <div className="aspect-[2/3] relative">
        {imageLoading ? (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="material-icons text-4xl text-gray-400 animate-pulse">hourglass_empty</span>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`${card.player} ${card.card}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="material-icons text-4xl text-gray-400">image</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-white dark:bg-[#1B2131]">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">{card.player}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{card.card}</p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Investment</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(card.investmentAUD)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Value</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(card.currentValueAUD)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Profit</span>
            <span className={`font-medium ${card.potentialProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrency(card.potentialProfit)}
            </span>
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
  onViewChange, 
  user,
  collectionSelector
}) => {
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
  const [showBulkSoldModal, setShowBulkSoldModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkSoldDetails, setBulkSoldDetails] = useState({
    buyer: '',
    date: new Date().toISOString().split('T')[0],
    cards: []
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { isDarkMode } = useTheme();

  const valueDropdownRef = useRef(null);
  const metricDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // Add debugging useEffect
  useEffect(() => {
    console.log('CardList received onDeleteCards:', typeof onDeleteCards);
  }, [onDeleteCards]);

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

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  
  // Sort dropdown toggle
  const toggleSortDropdown = () => {
    setShowSortDropdown(!showSortDropdown);
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

  const handleSelectCard = (cardId) => {
    console.log("Handling card selection for:", cardId);
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        console.log("Removing card from selection:", cardId);
        newSet.delete(cardId);
      } else {
        console.log("Adding card to selection:", cardId);
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    console.log("Handling select all");
    setSelectedCards(prev => {
      if (prev.size === filteredCards.length) {
        console.log("Deselecting all cards");
        return new Set();
      } else {
        console.log("Selecting all cards");
        return new Set(filteredCards.map(card => card.slabSerial));
      }
    });
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      // Get the number of cards being deleted for the message
      const numCards = selectedCards.size;
      
      // Delete the selected cards
      await onDeleteCards(Array.from(selectedCards));
      
      // Clear the selected cards set and close the confirmation dialog
      setSelectedCards(new Set());
      setShowDeleteConfirmation(false);
      
      // Show success toast
      showToast(`Successfully deleted ${numCards} card${numCards !== 1 ? 's' : ''}.`, 'success');
    } catch (error) {
      console.error("Error deleting cards:", error);
      showToast(`Failed to delete cards: ${error.message || 'Unknown error'}`, 'error');
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

  // Add loading overlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">Processing sale...</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a few moments</p>
      </div>
    </div>
  );

  const handleBulkMarkAsSold = async () => {
    setIsSubmitting(true);
    const startTime = Date.now();
    
    try {
      // Create sold card records
      const soldCards = bulkSoldDetails.cards.map(cardDetail => ({
        slabSerial: cardDetail.slabSerial,
        serialNumber: cardDetail.slabSerial,
        player: cardDetail.player,
        card: cardDetail.card,
        set: cardDetail.set,
        year: cardDetail.year,
        category: cardDetail.category,
        condition: cardDetail.condition,
        investmentAUD: cardDetail.investmentAUD,
        soldPriceAUD: parseFloat(cardDetail.soldPrice) || 0,
        buyer: bulkSoldDetails.buyer,
        dateSold: new Date(bulkSoldDetails.date).toISOString(),
        profit: (parseFloat(cardDetail.soldPrice) || 0) - cardDetail.investmentAUD
      }));

      // Add cards to sold cards database one by one to handle potential errors
      const successfulSales = [];
      const errors = [];
      const serialsToDelete = [];
      
      for (const soldCard of soldCards) {
        try {
          // First add to sold cards database
          const soldCardId = await db.addSoldCard(soldCard);
          console.log(`Successfully added sold card ${soldCardId}`);
          successfulSales.push(soldCard);
          serialsToDelete.push(soldCard.slabSerial);
        } catch (cardError) {
          console.error(`Error processing sale for card ${soldCard.slabSerial}:`, cardError);
          errors.push({ card: soldCard, error: cardError });
        }
      }

      // Delete all successfully sold cards from current collection at once
      if (serialsToDelete.length > 0) {
        try {
          console.log('Attempting to delete cards:', serialsToDelete);
          if (typeof onDeleteCards !== 'function') {
            throw new Error('onDeleteCards is not a function');
          }
          await onDeleteCards(serialsToDelete);
          console.log('Successfully deleted cards from collection');
        } catch (deleteError) {
          console.error('Error deleting cards from collection:', deleteError);
          // If deletion fails, try to rollback the sold cards
          for (const soldCard of successfulSales) {
            try {
              await db.deleteSoldCard(soldCard.id);
            } catch (rollbackError) {
              console.error(`Error rolling back sold card ${soldCard.id}:`, rollbackError);
            }
          }
          throw new Error('Failed to delete cards from collection');
        }
      }
      
      // Ensure minimum loading time
      const elapsedTime = Date.now() - startTime;
      const minimumLoadingTime = 2000;
      if (elapsedTime < minimumLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
      }
      
      // Clear selected cards
      setSelectedCards(new Set());
      
      // Close modal
      setShowBulkSoldModal(false);
      setBulkSoldDetails({
        buyer: '',
        date: new Date().toISOString().split('T')[0],
        cards: []
      });

      // Show appropriate toast message
      if (successfulSales.length === soldCards.length) {
        showToast(`${soldCards.length} cards marked as sold successfully!`, 'success');
      } else if (successfulSales.length > 0) {
        showToast(`${successfulSales.length} of ${soldCards.length} cards marked as sold successfully. Some cards encountered errors.`, 'warning');
      } else {
        showToast(`Failed to mark any cards as sold.`, 'error');
      }

      // If there were any errors, log them to console
      if (errors.length > 0) {
        console.error('Errors occurred while processing sales:', errors);
      }

      // Switch to sold view if any sales were successful
      if (successfulSales.length > 0 && typeof onViewChange === 'function') {
        onViewChange('sold');
      }
    } catch (error) {
      console.error('Error marking cards as sold:', error);
      
      // Show error toast
      showToast(`Error: ${error.message || 'Failed to mark cards as sold'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSoldModalOpen = () => {
    // Initialize the bulkSoldDetails with selected cards
    const selectedCardsList = Array.from(selectedCards).map(slabSerial => 
      cards.find(card => card.slabSerial === slabSerial)
    ).filter(Boolean);

    setBulkSoldDetails(prev => ({
      ...prev,
      cards: selectedCardsList.map(card => ({
        ...card,
        soldPrice: ''
      }))
    }));
    
    setShowBulkSoldModal(true);
  };

  const loadCardImage = useCallback(async (card) => {
    if (!card.imagePath) return;
    
    const cardId = card.id || card.imagePath.split('/').pop().split('.')[0];
    try {
      const image = await cardService.getImage(user.uid, cardId);
      if (image) {
        const imageUrl = URL.createObjectURL(image);
        setCardImages(prev => ({ ...prev, [card.id]: imageUrl }));
      }
    } catch (error) {
      console.error('Error loading card image:', error);
    }
  }, [user]);

  // Add debugging log
  useEffect(() => {
    console.log('CardList component received props:', {
      hasCards: Array.isArray(cards) && cards.length > 0,
      hasExchangeRate: exchangeRate !== undefined,
      hasCardClickHandler: typeof onCardClick === 'function',
      hasDeleteCardsHandler: typeof onDeleteCards === 'function',
      hasUpdateCardHandler: typeof onUpdateCard === 'function',
      hasAddCardHandler: typeof onAddCard === 'function',
      hasViewChangeHandler: typeof onViewChange === 'function',
      hasUser: user !== undefined,
    });
  }, [cards, exchangeRate, onCardClick, onDeleteCards, onUpdateCard, onAddCard, onViewChange, user]);

  return (
    <div className="space-y-4">
      {/* Total Cards Counter */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="material-icons text-gray-600 dark:text-gray-400">view_module</span>
          <span className="text-gray-700 dark:text-gray-200 font-medium">Total Cards: {filteredCards.length}</span>
        </div>
        {/* Collection selector will be injected here from App.js */}
        {collectionSelector}
      </div>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Investment</div>
          <div className="text-xl font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalInvestment)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Value</div>
          <div className="text-xl font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalValue)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Profit</div>
          <div className={`text-xl font-medium ${totals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(totals.totalProfit)}
          </div>
        </div>
      </div>
      
      {/* Filters and controls */}
      <div className="px-4 space-y-4">
        <input
          type="text"
          placeholder="Search by name, set, or serial number..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500"
        />
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative" ref={sortDropdownRef}>
              <button
                className="flex items-center justify-between gap-2 px-4 py-2 w-48 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-colors duration-200"
                onClick={toggleSortDropdown}
              >
                <div className="flex items-center gap-2">
                  <span className="material-icons text-gray-500 dark:text-gray-400">sort</span>
                  <span className="text-sm">Sort by {getSortFieldLabel(sortField)}</span>
                </div>
                <span className="material-icons text-gray-500 dark:text-gray-400">
                  {showSortDropdown ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1B2131] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700/50 py-1 z-50">
                  {sortOptions.map(option => (
                    <button
                      key={option.field}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between text-sm ${
                        sortField === option.field 
                          ? 'bg-gray-100 dark:bg-[#252B3B] text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-colors duration-200'
                      }`}
                      onClick={() => handleSortChange(option.field)}
                    >
                      <span>{option.label}</span>
                      {sortField === option.field && (
                        <span className="material-icons text-sm">
                          {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedCards.size > 0 && (
              <>
                <button
                  onClick={handleBulkSoldModalOpen}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-200"
                >
                  <span className="material-icons">sell</span>
                  <span>Mark as Sold ({selectedCards.size})</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                  style={{ opacity: selectedCards.size === 0 ? 0.5 : 1 }}
                >
                  <span className="material-icons">delete</span>
                  <span>Delete ({selectedCards.size})</span>
                </button>
              </>
            )}
            <button
              onClick={onAddCard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
            >
              <span className="material-icons">add</span>
              <span>Add Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4">
        {filteredCards.map(card => (
          <Card
            key={card.slabSerial}
            card={card}
            onCardClick={onCardClick}
            onCheckboxClick={handleSelectCard}
            isSelected={selectedCards.has(card.slabSerial)}
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

      {/* Bulk Sold Modal */}
      {showBulkSoldModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50" onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            setShowBulkSoldModal(false);
          }
        }}>
          <div className={`w-full max-w-4xl mx-4 p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-[#1B2131]' : 'bg-white'}`}>
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Mark Cards as Sold</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Buyer<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={bulkSoldDetails.buyer}
                    onChange={(e) => setBulkSoldDetails(prev => ({ ...prev, buyer: e.target.value }))}
                    className={`input w-full ${!bulkSoldDetails.buyer.trim() ? 'border-red-500 dark:border-red-500' : ''}`}
                    placeholder="Enter buyer name"
                  />
                  {!bulkSoldDetails.buyer.trim() && (
                    <div className="text-red-500 text-xs mt-1">Please enter the buyer's name</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date Sold</label>
                  <input
                    type="date"
                    value={bulkSoldDetails.date}
                    onChange={(e) => setBulkSoldDetails(prev => ({ ...prev, date: e.target.value }))}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Selected Cards</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Array.from(selectedCards).map(slabSerial => {
                    const card = cards.find(c => c.slabSerial === slabSerial);
                    if (!card) return null;

                    const cardDetail = bulkSoldDetails.cards.find(c => c.slabSerial === slabSerial) || {
                      ...card,
                      soldPrice: ''
                    };

                    const isSoldPriceValid = cardDetail.soldPrice !== '' && !isNaN(parseFloat(cardDetail.soldPrice)) && parseFloat(cardDetail.soldPrice) >= 0;

                    return (
                      <div key={slabSerial} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{card.card}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Investment: {formatCurrency(card.investmentAUD)}
                          </div>
                        </div>
                        <div className="w-48">
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Sold Price (AUD)<span className="text-red-500 ml-1">*</span>
                          </label>
                          <input
                            type="number"
                            value={cardDetail.soldPrice}
                            onChange={(e) => {
                              const newCards = bulkSoldDetails.cards.filter(c => c.slabSerial !== slabSerial);
                              newCards.push({
                                ...cardDetail,
                                soldPrice: e.target.value
                              });
                              setBulkSoldDetails(prev => ({
                                ...prev,
                                cards: newCards
                              }));
                            }}
                            className={`input w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!isSoldPriceValid ? 'border-red-500 dark:border-red-500' : ''}`}
                            placeholder="0.00"
                            step="any"
                          />
                          {!isSoldPriceValid && (
                            <div className="text-red-500 text-xs mt-1">Please enter a valid price</div>
                          )}
                        </div>
                        <div className="w-32 text-right">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Profit</div>
                          <div className={`font-medium ${
                            parseFloat(cardDetail.soldPrice || 0) - card.investmentAUD >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}>
                            {formatCurrency(parseFloat(cardDetail.soldPrice || 0) - card.investmentAUD)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Add Summary Section */}
            <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Sale Price</div>
                  <div className="text-xl font-medium text-gray-800 dark:text-gray-200">
                    {formatCurrency(bulkSoldDetails.cards.reduce((sum, card) => sum + (parseFloat(card.soldPrice) || 0), 0))}
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Profit</div>
                  <div className={`text-xl font-medium ${
                    bulkSoldDetails.cards.reduce((sum, card) => {
                      const cardData = cards.find(c => c.slabSerial === card.slabSerial);
                      return sum + ((parseFloat(card.soldPrice) || 0) - (cardData?.investmentAUD || 0));
                    }, 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {formatCurrency(bulkSoldDetails.cards.reduce((sum, card) => {
                      const cardData = cards.find(c => c.slabSerial === card.slabSerial);
                      return sum + ((parseFloat(card.soldPrice) || 0) - (cardData?.investmentAUD || 0));
                    }, 0))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => setShowBulkSoldModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-white rounded-lg ${
                  !bulkSoldDetails.buyer.trim() || 
                  !bulkSoldDetails.cards.every(card => card.soldPrice !== '' && !isNaN(parseFloat(card.soldPrice)) && parseFloat(card.soldPrice) >= 0)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                onClick={handleBulkMarkAsSold}
                disabled={isSubmitting || 
                  !bulkSoldDetails.buyer.trim() || 
                  !bulkSoldDetails.cards.every(card => card.soldPrice !== '' && !isNaN(parseFloat(card.soldPrice)) && parseFloat(card.soldPrice) >= 0)
                }
              >
                {!bulkSoldDetails.buyer.trim() ? (
                  "Please enter buyer's name"
                ) : !bulkSoldDetails.cards.every(card => card.soldPrice !== '' && !isNaN(parseFloat(card.soldPrice)) && parseFloat(card.soldPrice) >= 0) ? (
                  "Please enter all sold prices"
                ) : (
                  "Confirm Sale"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDeleteConfirmation(false);
          }
        }}>
          <div className={`w-full max-w-md mx-4 p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-[#1B2131]' : 'bg-white'}`}>
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Delete Cards
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && <LoadingOverlay />}
    </div>
  );
};

export default memo(CardList);