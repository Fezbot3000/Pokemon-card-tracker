import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { useTheme } from '../design-system';
import db from '../services/db';
import { formatCurrency, formatCondensed } from '../utils/formatters';
import { toast } from 'react-hot-toast';
import { StatisticsSummary, SearchToolbar, Card, ConfirmDialog } from '../design-system';
import SaleModal from './SaleModal';
import MoveCardsModal from './MoveCardsModal';

// Replace FinancialSummary component with individual stat cards
const StatCard = memo(({ label, value, isProfit = false }) => {
  // Determine color class based on profit status
  const colorClass = isProfit
    ? value >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
    : 'text-gray-900 dark:text-white';
    
  // Helper function to format value
  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

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

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    // Try to parse the date
    const date = new Date(dateString);
    
    // Check if valid date
    if (isNaN(date.getTime())) return dateString;
    
    // Format as DD/MM/YYYY
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    // Return original string if parsing fails
    return dateString;
  }
};

const CardList = ({ 
  cards, 
  exchangeRate, 
  onCardClick, 
  onDeleteCard, 
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardsToDelete, setCardsToDelete] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedCardsToMove, setSelectedCardsToMove] = useState([]);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

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
          // Return original string if parsing fails
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

  // Listen for card-images-cleanup event to revoke blob URLs when collections are deleted
  useEffect(() => {
    const handleCardImagesCleanup = (event) => {
      const { cardIds } = event.detail;
      
      // Revoke blob URLs for the specified card IDs
      cardIds.forEach(cardId => {
        if (cardImages[cardId]) {
          try {
            URL.revokeObjectURL(cardImages[cardId]);
            console.log(`Revoked blob URL for card ${cardId} in CardList component`);
          } catch (error) {
            console.error(`Error revoking blob URL for card ${cardId}:`, error);
          }
        }
      });
      
      // Update the cardImages state to remove the revoked URLs
      setCardImages(prev => {
        const newImages = { ...prev };
        cardIds.forEach(cardId => {
          delete newImages[cardId];
        });
        return newImages;
      });
    };
    
    // Add event listener
    window.addEventListener('card-images-cleanup', handleCardImagesCleanup);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('card-images-cleanup', handleCardImagesCleanup);
    };
  }, [cardImages]);

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
      // Return original string if parsing fails
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
    { field: 'investmentAUD', label: 'Paid' },
    { field: 'potentialProfit', label: 'Profit' },
    { field: 'datePurchased', label: 'Purchase Date' },
    { field: 'player', label: 'Player Name' }
  ];

  // Function to get the label for a sort field
  const getSortFieldLabel = (field) => {
    // Handle different format variations (like 'currentValue' vs 'currentValueAUD')
    const normalizedField = field.replace(/AUD$/, ''); // Remove AUD suffix if present
    
    // First, try to find an exact match
    let option = sortOptions.find(opt => opt.field === field);
    
    // If no exact match, try with normalized field
    if (!option) {
      option = sortOptions.find(opt => 
        opt.field.toLowerCase().includes(normalizedField.toLowerCase()) || 
        normalizedField.toLowerCase().includes(opt.field.toLowerCase())
      );
    }
    
    return option ? option.label : field;
  };

  const handleSortChange = (field) => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('desc');  // Default to descending for new sort fields
    }
  };

  const handleSelectCard = (e, cardId) => {
    // If e is a boolean (direct from Card component), convert it
    if (typeof e === 'boolean') {
      const isSelected = e;
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        if (!isSelected) {
          newSet.delete(cardId);
        } else {
          newSet.add(cardId);
        }
        return newSet;
      });
      return;
    }
    
    // Otherwise, handle as normal event
    // If e exists, stop propagation to prevent triggering the card click
    if (e && typeof e.stopPropagation === 'function') {
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

  const handleSelectAll = () => {
    // If all cards are already selected, deselect all
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      // Otherwise, select all cards
      const allCardIds = filteredCards.map(card => card.slabSerial);
      setSelectedCards(new Set(allCardIds));
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

  // Memoized filtered and sorted cards to ensure stable keys and prevent duplicate key warnings
  const filteredCards = useMemo(() => {
    let filtered = cards;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(card =>
        (card.card && card.card.toLowerCase().includes(lowerFilter)) ||
        (card.player && card.player.toLowerCase().includes(lowerFilter))
      );
    }
    // Sort cards
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    // Ensure uniqueness by combining slabSerial and collection as fallback key
    return filtered.map((card, idx) => ({ ...card, _uniqueKey: `${card.slabSerial || 'unknown'}-${card.collection || 'none'}-${idx}` }));
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
  const generateInvoiceId = async () => {
    try {
      // Get existing sold cards from IndexedDB
      const existingSoldCards = await db.getSoldCards();
      
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
    } catch (error) {
      // Fallback to timestamp-based ID if there's an error
      return `INV-${Date.now()}`;
    }
  };

  const handleSaleConfirm = async ({ buyer, dateSold, soldPrices, totalSalePrice, totalProfit }) => {
    try {
      // Generate a new invoice ID for this transaction
      const invoiceId = await generateInvoiceId();
      
      const selectedCardsData = selectedCardsForSale.map(card => ({
        ...card,
        finalValueAUD: parseFloat(soldPrices[card.slabSerial]),
        finalProfitAUD: parseFloat(soldPrices[card.slabSerial]) - card.investmentAUD,
        dateSold,
        buyer,
        invoiceId // Add the invoice ID to each card
      }));

      // Get existing sold cards from IndexedDB
      const existingSoldCards = await db.getSoldCards();

      // Add the new cards to sold cards in IndexedDB
      await db.saveSoldCards([...existingSoldCards, ...selectedCardsData]);

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

      // Save to database
      await db.saveCollections(updatedCollections);
      
      // Update state in parent first
      if (onDeleteCard) {
        await onDeleteCard(cardIds);
      }

      // Update local state after parent state is updated
      setCollections(updatedCollections);
      setSelectedCards(new Set());
      setShowSaleModal(false);
      setSelectedCardsForSale([]);

      // Always show success message and refresh page, even if there were non-critical errors
      // This ensures the user sees success and gets a fresh state
      toast.success(`${selectedCardsData.length} card${selectedCardsData.length > 1 ? 's' : ''} marked as sold`, {
        id: 'delete-success', // Add an ID to prevent duplicate toasts
        duration: 2000, // 2 seconds
      });
      
      // Use a separate timeout for page refresh to ensure it happens
      // This decouples it from the toast system which might have issues
      setTimeout(() => {
        window.location.reload();
      }, 500); // Changed from 2500ms to 500ms for faster refresh after deletion
    } catch (error) {
      // Fallback to timestamp-based ID if there's an error
      toast.error('Failed to mark cards as sold. Please try again.');
    }
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

  const handleCardDelete = async (cardToDelete) => {
    if (!cardToDelete || !cardToDelete.slabSerial) {
      toast.error('Failed to delete card: Invalid card data');
      return;
    }
    try {
      // Correctly call the onDeleteCard prop passed from App.js
      if (onDeleteCard) {
        await onDeleteCard(cardToDelete); // Pass the full card object
      } else {
        toast.error('Deletion setup error.');
      }
    } catch (err) {
      toast.error(`Failed to delete card: ${err.message || 'Unknown error'}`);
    }
    // Always close the modal and clear selection after delete
    setShowCardDetails(false);
    setSelectedCard(null);
    setSelectedCards(new Set());
  };

  const handleBulkDelete = async (cardsToDelete) => {
    try {
      // Create a copy of the collections
      const updatedCollections = { ...collections };
      const cardIds = Array.isArray(cardsToDelete) ? cardsToDelete : [cardsToDelete];

      // Remove the cards from all collections
      Object.keys(updatedCollections).forEach(collectionName => {
        if (Array.isArray(updatedCollections[collectionName])) {
          updatedCollections[collectionName] = updatedCollections[collectionName].filter(
            card => !cardIds.includes(card.slabSerial)
          );
        }
      });

      // Save to database
      await db.saveCollections(updatedCollections);
      
      // Update state in parent first - wrap in try/catch to prevent errors here from failing the whole operation
      try {
        if (onDeleteCard) {
          // Process each card ID individually instead of passing the array
          for (const cardId of cardIds) {
            await onDeleteCard(cardId); // Pass single ID string
          }
        }
      } catch (innerError) {
        // Log error but don't fail the operation - the database update already succeeded
        console.warn('Warning: Error updating app state after deletion, but database was updated successfully.');
      }

      // Update local state after parent state is updated
      setCollections(updatedCollections);
      setSelectedCards(new Set());
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);
      
      // Always show success message and refresh page, even if there were non-critical errors
      // This ensures the user sees success and gets a fresh state
      toast.success(`${cardIds.length} card${cardIds.length > 1 ? 's' : ''} deleted`, {
        id: 'delete-success', // Add an ID to prevent duplicate toasts
        duration: 2000, // 2 seconds
      });
      
      // Use a separate timeout for page refresh to ensure it happens
      // This decouples it from the toast system which might have issues
      setTimeout(() => {
        window.location.reload();
      }, 500); // Changed from 2500ms to 500ms for faster refresh after deletion
    } catch (error) {
      toast.error('Failed to delete cards');
      // Don't throw error here, just handle it locally
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);
      setSelectedCards(new Set());
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const cardsToDelete = Array.from(selectedCards);
      await handleBulkDelete(cardsToDelete);
    } catch (error) {
      toast.error('Failed to delete cards');
    }
  };

  const handleDeleteClick = () => {
    const selectedCardsArray = Array.from(selectedCards);
    setCardsToDelete(selectedCardsArray);
    setShowDeleteModal(true);
  };

  const handleMoveCards = () => {
    if (selectedCards.size === 0) return;
    
    // Get the cards to move
    const cardsToMove = filteredCards.filter(card => selectedCards.has(card.slabSerial));
    setSelectedCardsToMove(cardsToMove);
    
    // Filter collections to remove both "Sold" and lowercase "sold"
    const filteredCollections = Object.keys(collections).filter(collection => {
      const lowerCase = collection.toLowerCase();
      return collection !== 'All Cards' && 
             collection !== selectedCollection &&
             lowerCase !== 'sold' &&
             !lowerCase.includes('sold');
    });
    
    // Only show modal if there are valid collections to move to
    if (filteredCollections.length > 0) {
      setShowMoveModal(true);
    } else {
      toast.error('No valid collections to move cards to. Create a new collection first.');
    }
  };

  const handleMoveConfirm = async (targetCollection) => {
    try {
      // Get the cards to move
      const cardsToMove = cards.filter(card => selectedCards.has(card.slabSerial));
      
      // Update each card's collection
      for (const card of cardsToMove) {
        const updatedCard = { ...card, collection: targetCollection };
        await db.saveCollections({
          ...collections,
          [targetCollection]: [...(collections[targetCollection] || []), updatedCard],
          [selectedCollection]: collections[selectedCollection].filter(c => c.slabSerial !== card.slabSerial)
        });
      }

      // Update state
      setShowMoveModal(false);
      setSelectedCardsToMove([]);
      setSelectedCards(new Set());
      
      // Show success message
      toast.success(`Successfully moved ${cardsToMove.length} card${cardsToMove.length > 1 ? 's' : ''} to ${targetCollection}`);
      
      // Update collections in parent component
      if (setCollections) {
        const updatedCollections = { ...collections };
        updatedCollections[targetCollection] = [...(collections[targetCollection] || []), ...cardsToMove];
        updatedCollections[selectedCollection] = collections[selectedCollection].filter(card => !selectedCards.has(card.slabSerial));
        setCollections(updatedCollections);
      }
    } catch (error) {
      toast.error('Error moving cards. Please try again.');
    }
  };

  return (
    <div className="pt-16 sm:pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Stats Section */}
      <StatisticsSummary 
        statistics={[
          {
            label: 'Paid',
            value: totals.investment,
            formattedValue: formatCondensed(totals.investment)
          },
          {
            label: 'Value',
            value: totals.value,
            formattedValue: formatCondensed(totals.value)
          },
          {
            label: 'Profit',
            value: totals.profit,
            formattedValue: formatCondensed(totals.profit),
            isProfit: true
          },
          {
            label: 'Cards',
            value: filteredCards.length,
            icon: 'style'
          }
        ]}
        className="mb-3 sm:mb-4"
      />

      {/* Controls Section */}
      <div className="mb-4">
        <SearchToolbar 
          searchValue={filter}
          onSearchChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOption={getSortFieldLabel(sortField)}
          sortOptions={sortOptions.map(option => option.label)}
          onSortChange={(optionLabel) => {
            const option = sortOptions.find(o => o.label === optionLabel);
            if (option) {
              handleSortChange(option.field);
            }
          }}
          onAddCard={onAddCard}
        />
      </div>

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">search_off</span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No cards found</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4`}>
          {filteredCards.map(card => (
            <Card
              key={card._uniqueKey}
              card={card}
              cardImage={cardImages[card.slabSerial]}
              onClick={() => onCardClick(card)} 
              isSelected={selectedCards.has(card.slabSerial)}
              onSelect={(selected) => handleSelectCard(selected, card.slabSerial)}
              className=""
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCards.map(card => (
            <div
              key={card._uniqueKey}
              className={`bg-white dark:bg-[#0F0F0F] rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md ${selectedCards.has(card.slabSerial) ? 'ring-2 ring-[#E6185C]' : 'border border-[#ffffff33] dark:border-[#ffffff1a]'}`}
            >
              <div className="flex p-4 items-center">
                {/* Card selection checkbox */}
                <div className="mr-4">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.slabSerial)}
                    onChange={(e) => handleSelectCard(e, card.slabSerial)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    aria-label={`Select ${card.card}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Card image (small) */}
                <div 
                  className="relative w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer mr-4"
                  onClick={() => onCardClick(card)}
                >
                  {cardImages[card.slabSerial] ? (
                    <img
                      src={cardImages[card.slabSerial]} 
                      alt={`${card.player} - ${card.card}`} 
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#1B2131]">
                      <span className="material-icons text-xl text-gray-400 dark:text-gray-600">image</span>
                    </div>
                  )}
                </div>
                
                {/* Card details */}
                <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onCardClick(card)}>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-base sm:text-lg truncate">
                    {card.card}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {card.player || 'Unknown Player'}
                  </p>
                  
                  {/* Card metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Paid:</span>
                      <span className="ml-2 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatCurrency(card.investmentAUD, true)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="ml-2 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatCurrency(card.currentValueAUD, true)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Profit:</span>
                      <span className={`ml-2 font-medium text-xs sm:text-sm ${(card.currentValueAUD - card.investmentAUD) >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatCurrency(card.currentValueAUD - card.investmentAUD, true)}
                      </span>
                    </div>
                    {card.datePurchased && (
                      <div className="flex items-center">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Purchased:</span>
                        <span className="ml-2 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                          {formatDate(card.datePurchased)}
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
        <div className={`fixed bottom-0 left-0 w-full flex items-center gap-1 px-2 py-2 rounded-t-md shadow-2xl bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700 z-50
          ${window.innerWidth >= 640 ? 'left-1/2 transform -translate-x-1/2 w-auto rounded-md border justify-center gap-3 py-3 px-6 min-h-[64px] h-auto' : ''}
        `}>
          <span className="text-xs sm:text-sm text-gray-900 dark:text-white mr-2 min-w-max">{selectedCards.size} selected</span>
          <button
            onClick={() => {
              setSelectedCardsForSale(cards.filter(card => selectedCards.has(card.id)));
              setShowSaleModal(true);
            }}
            className={`${window.innerWidth < 640 ? 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-xs min-w-[48px]' : 'flex flex-row items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-base min-w-[96px]'}`}
          >
            <span className="material-icons text-base text-yellow-400">sell</span>
            <span className={`${window.innerWidth < 640 ? 'hidden sm:inline' : 'inline ml-1'}`}>Sell</span>
          </button>
          <button
            onClick={handleMoveCards}
            className={`${window.innerWidth < 640 ? 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-xs min-w-[48px]' : 'flex flex-row items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-base min-w-[96px]'}`}
          >
            <span className="material-icons text-base text-[#60a5fa]">drive_file_move</span>
            <span className={`${window.innerWidth < 640 ? 'hidden sm:inline' : 'inline ml-1'}`}>Move</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className={`${window.innerWidth < 640 ? 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-xs min-w-[48px]' : 'flex flex-row items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-base min-w-[64px]'}`}
          >
            <span className="material-icons text-base text-red-400">delete</span>
            <span className={`${window.innerWidth < 640 ? 'hidden sm:inline' : 'inline ml-1'}`}>Delete</span>
          </button>
          <button
            onClick={handleSelectAll}
            className={`${window.innerWidth < 640 ? 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-xs min-w-[48px]' : 'flex flex-row items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-base min-w-[96px]'}`}
          >
            <span className="material-icons text-base text-[#60a5fa]">done_all</span>
            <span className={`${window.innerWidth < 640 ? 'hidden sm:inline' : 'inline ml-1'}`}>Select All</span>
          </button>
          <button
            onClick={() => setSelectedCards(new Set())}
            className={`${window.innerWidth < 640 ? 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-xs min-w-[48px]' : 'flex flex-row items-center gap-2 px-4 py-2 rounded-md bg-white dark:bg-[#252B3B] hover:bg-gray-100 dark:hover:bg-[#323B4B] text-gray-900 dark:text-white text-base min-w-[64px]'}`}
          >
            <span className="material-icons text-base">close</span>
            <span className={`${window.innerWidth < 640 ? 'hidden sm:inline' : 'inline ml-1'}`}>Clear</span>
          </button>
        </div>
      )}

      {/* Card Details Modal */}
      {showCardDetails && selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null); // Clear hook state first
            setShowCardDetails(false); // Then clear local state
          }}
          onUpdate={handleCardUpdate} // Uses the local update handler
          onDelete={handleCardDelete}  // CHANGED: Use local handleCardDelete instead of onDeleteCard
          exchangeRate={exchangeRate}
        />
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
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCardsToDelete([]);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Cards"
        message={`Are you sure you want to delete ${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <MoveCardsModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setSelectedCardsToMove([]);
        }}
        onConfirm={handleMoveConfirm}
        selectedCards={selectedCardsToMove}
        collections={Object.keys(collections).filter(collection => {
          const lowerCase = collection.toLowerCase();
          return collection !== 'All Cards' && 
                 collection !== selectedCollection &&
                 lowerCase !== 'sold' &&
                 !lowerCase.includes('sold');
        })}
        currentCollection={selectedCollection}
      />
    </div>
  );
};

export default CardList;