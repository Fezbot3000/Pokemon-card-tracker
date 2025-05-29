import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../design-system';
import { collection, query, where, doc, updateDoc, getDocs } from 'firebase/firestore';
import db from '../services/firestore/dbAdapter';
import { db as firestoreDb } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { StatisticsSummary, SearchToolbar, Card, ConfirmDialog } from '../design-system';
import CollectionSelector from '../design-system/components/CollectionSelector';
import SaleModal from './SaleModal';
import MoveCardsModal from './MoveCardsModal';
import CreateInvoiceModal from './PurchaseInvoices/CreateInvoiceModal';
import ListCardModal from './Marketplace/ListCardModal';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../design-system';
import { calculateCardTotals, formatStatisticsForDisplay } from '../utils/cardStatistics';
import { useCardSelection } from '../hooks';

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
const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  try {
    let date;
    
    // Check if this is a Firestore Timestamp object
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
      // Convert Firestore Timestamp to JavaScript Date
      date = new Date(dateValue.seconds * 1000);
    } else {
      // Regular date string or Date object
      date = new Date(dateValue);
    }
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date in CardList:', dateValue);
      return 'Invalid date';
    }
    
    // Format as DD/MM/YYYY
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error, dateValue);
    // Return a fallback string if parsing fails
    return 'Date error';
  }
};

const CardList = ({ 
  cards, 
  exchangeRate, 
  onCardClick, 
  onDeleteCard, 
  onDeleteCards, 
  onUpdateCard, 
  onAddCard,
  selectedCollection,
  collections,
  setCollections,
  onCollectionChange
}) => {
  // Initialize navigate function from React Router
  const navigate = useNavigate();
  const { user } = useAuth() || { user: null };
  const { formatAmountForDisplay: formatUserCurrency, preferredCurrency } = useUserPreferences();

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
  
  // Memoized filtered and sorted cards
  const filteredCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    // First filter by collection
    let filtered = cards;
    if (selectedCollection && selectedCollection !== 'All Cards') {
      filtered = filtered.filter(card => 
        card.collection === selectedCollection || 
        card.collectionId === selectedCollection
      );
    }
    
    // Then apply search filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(card => 
        (card.card && card.card.toLowerCase().includes(lowerFilter)) ||
        (card.set && card.set.toLowerCase().includes(lowerFilter)) ||
        (card.slabSerial && card.slabSerial.toLowerCase().includes(lowerFilter)) ||
        (card.player && card.player.toLowerCase().includes(lowerFilter))
      );
    }
    
    // Create a completely new sorted array to avoid mutation issues
    filtered = [...filtered];
    
    // Apply a multi-level sorting strategy for consistent ordering
    filtered.sort((a, b) => {
      // 1. First sort by the user-selected field and direction
      // Handle different field names between accounts
      let aValue, bValue;
      
      // Special handling for monetary fields that might have different naming conventions
      if (sortField === 'currentValueAUD') {
        aValue = parseFloat(a.originalCurrentValueAmount || a.currentValueAUD || 0);
        bValue = parseFloat(b.originalCurrentValueAmount || b.currentValueAUD || 0);
      } else if (sortField === 'investmentAUD') {
        aValue = parseFloat(a.originalInvestmentAmount || a.investmentAUD || 0);
        bValue = parseFloat(b.originalInvestmentAmount || b.investmentAUD || 0);
      } else if (sortField === 'potentialProfit') {
        // Calculate profit from the available fields
        const aInvestment = parseFloat(a.originalInvestmentAmount || a.investmentAUD || 0);
        const aCurrentValue = parseFloat(a.originalCurrentValueAmount || a.currentValueAUD || 0);
        const bInvestment = parseFloat(b.originalInvestmentAmount || b.investmentAUD || 0);
        const bCurrentValue = parseFloat(b.originalCurrentValueAmount || b.currentValueAUD || 0);
        aValue = aCurrentValue - aInvestment;
        bValue = bCurrentValue - bInvestment;
      } else {
        // Default fallback for other fields
        aValue = a[sortField] ?? 0;
        bValue = b[sortField] ?? 0;
      }
      
      // Handle different types of values appropriately
      let primarySort = 0;
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        primarySort = sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } 
      // Handle string values
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        primarySort = sortDirection === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }
      // Handle mixed types (convert to string for comparison)
      else {
        const aStr = String(aValue);
        const bStr = String(bValue);
        primarySort = sortDirection === 'asc' ? 
          aStr.localeCompare(bStr) : 
          bStr.localeCompare(aStr);
      }
      
      // If primary sort doesn't determine order, use secondary sorting criteria
      if (primarySort === 0) {
        // 2. Secondary sort by card name
        const aName = (a.card || '').toLowerCase();
        const bName = (b.card || '').toLowerCase();
        const nameSort = aName.localeCompare(bName);
        
        if (nameSort !== 0) return nameSort;
        
        // 3. Tertiary sort by set
        const aSet = (a.set || '').toLowerCase();
        const bSet = (b.set || '').toLowerCase();
        const setSort = aSet.localeCompare(bSet);
        
        if (setSort !== 0) return setSort;
        
        // 4. Final sort by slabSerial for absolute consistency
        const aSerial = (a.slabSerial || '').toLowerCase();
        const bSerial = (b.slabSerial || '').toLowerCase();
        return aSerial.localeCompare(bSerial);
      }
      
      return primarySort;
    });
    // Ensure uniqueness by combining slabSerial and collection as fallback key
    return filtered.map((card, idx) => ({ ...card, _uniqueKey: `${card.slabSerial || 'unknown'}-${card.collection || 'none'}-${idx}` }));
  }, [cards, filter, sortField, sortDirection, selectedCollection]);

  // Use card selection hook with filtered cards
  const { 
    selectedCards, 
    selectedCount,
    handleSelectCard, 
    handleSelectAll, 
    clearSelection,
    getSelectedCards,
    isCardSelected 
  } = useCardSelection(filteredCards);

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
  const [showPurchaseInvoiceModal, setShowPurchaseInvoiceModal] = useState(false);
  const [selectedCardsForPurchase, setSelectedCardsForPurchase] = useState([]);
  const [showListCardModal, setShowListCardModal] = useState(false);
  const [selectedCardsForListing, setSelectedCardsForListing] = useState([]);
  const [visibleCardCount, setVisibleCardCount] = useState(24); // Initial number of cards to show (4 rows of 6 cards)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

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
    clearSelection();
  }, [cards, clearSelection]);

  // Effect to load card images when the component mounts or cards change
  useEffect(() => {
    const loadCardImages = async () => {
      // Clean up existing blob URLs before loading new ones
      Object.values(cardImages).forEach(url => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.warn('Failed to revoke potential blob URL:', url, error);
          }
        }
      });
      
      const images = {};
      for (const card of cards) {
        if (card.imageUrl) {
          // Prioritize Firestore image URL if available
          images[card.slabSerial] = card.imageUrl; 
        } else {
          // Fallback: Try loading from IndexedDB if no Firestore URL
          try {
            const imageBlob = await db.getImage(card.slabSerial);
            if (imageBlob) {
              const blobUrl = URL.createObjectURL(imageBlob);
              images[card.slabSerial] = blobUrl;
            } else {
              // Explicitly set to null or undefined if not found anywhere
              images[card.slabSerial] = null; 
            }
          } catch (error) {
            console.error(`Error loading image for card ${card.slabSerial} from IndexedDB:`, error);
            images[card.slabSerial] = null; // Ensure it's null on error
          }
        }
      }
      setCardImages(images);
    };

    loadCardImages();

    // Cleanup logic remains complex due to potential blob URLs
    return () => {
      Object.entries(cardImages).forEach(([key, url]) => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.warn('Failed to revoke potential blob URL during cleanup:', url, error);
          }
        }
      });
    };
  }, [cards]); // Dependency remains on 'cards'

  // Function to refresh a single card's image
  const refreshCardImage = async (cardId) => {
    const card = cards.find(c => c.slabSerial === cardId);
    if (!card) return; // Card not found

    try {
      // Revoke the old object URL if it exists and is a blob URL
      if (cardImages[cardId] && cardImages[cardId].startsWith('blob:')) {
        URL.revokeObjectURL(cardImages[cardId]);
      }
      
      let newImageUrl = null;
      if (card.imageUrl) {
        // Prioritize updated Firestore URL
        newImageUrl = card.imageUrl;
      } else {
        // Fallback: Load the updated image from IndexedDB
        const imageBlob = await db.getImage(cardId);
        if (imageBlob) {
          newImageUrl = URL.createObjectURL(imageBlob);
        } 
      }

      setCardImages(prev => ({
        ...prev,
        [cardId]: newImageUrl // Store the new URL (Firestore or Blob)
      }));

    } catch (error) {
      console.error(`Error refreshing image for card ${cardId}:`, error);
      // Optionally set to null or keep the old image on error
      setCardImages(prev => ({
        ...prev,
        [cardId]: prev[cardId] // Keep existing on error, or set to null
      }));
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
    { field: 'card', label: 'Card Name' },
    { field: 'currentValueAUD', label: 'Current Value' },
    { field: 'investmentAUD', label: 'Paid' },
    { field: 'potentialProfit', label: 'Profit' },
    { field: 'datePurchased', label: 'Purchase Date' },
    { field: 'player', label: 'Player Name' },
    { field: 'cardNumber', label: 'Card Number' },
    { field: 'set', label: 'Set Name' }
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

  // Paginated cards - only show the number of cards specified by visibleCardCount
  const paginatedCards = useMemo(() => {
    return filteredCards.slice(0, visibleCardCount);
  }, [filteredCards, visibleCardCount]);

  // Calculate totals using the utility function - updated to use filtered cards for selected collection
  const totals = useMemo(() => calculateCardTotals(filteredCards), [filteredCards]);

  // Reset state when collection changes
  useEffect(() => {
    clearSelection();
    setSelectedCardsForSale([]);
    setShowSaleModal(false);
    setBuyer('');
    setFilter('');
    setVisibleCardCount(24); // Reset pagination when collection changes
  }, [selectedCollection]);

  // Load more cards when user scrolls to the bottom
  useEffect(() => {
    if (inView && !isLoadingMore && paginatedCards.length < filteredCards.length) {
      setIsLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setVisibleCardCount(prevCount => {
          // Calculate cards per row based on screen size
          const cardsPerRow = window.innerWidth < 640 ? 2 : // mobile
                             window.innerWidth < 768 ? 3 : // sm
                             window.innerWidth < 1024 ? 5 : // md
                             window.innerWidth < 1280 ? 6 : 7; // lg and xl
          
          // Load 2 more rows of cards
          return prevCount + (cardsPerRow * 2);
        });
        setIsLoadingMore(false);
      }, 300);
    }
  }, [inView, isLoadingMore, paginatedCards.length, filteredCards.length]);
  
  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCardCount(24);
  }, [filter]);

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
      clearSelection();
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
  const toggleSortDirection = (newDirection) => {
    // If a direction is provided, use it; otherwise toggle the current direction
    const direction = newDirection || (sortDirection === 'asc' ? 'desc' : 'asc');
    setSortDirection(direction);
    localStorage.setItem('cardListSortDirection', direction);
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
    try {
      const cardId = cardToDelete?.id || cardToDelete;
      if (!cardId) {
        console.error('Invalid card ID for deletion:', cardToDelete);
        toast.error('Failed to delete card: Invalid ID');
        return;
      }

      await onDeleteCard(cardId);
      toast.success('Card deleted successfully');
      
      // Clear selection if the deleted card was selected
      if (selectedCards.has(cardId)) {
        handleSelectCard(false, cardId);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleBulkDelete = async (cardsToDelete) => {
    try {
      // Only add detailed logging in development mode
      const isDevMode = process.env.NODE_ENV === 'development';
      
      if (isDevMode) {
        console.log('%c DELETION DEBUG - STARTING DELETION PROCESS', 'background: #ff0000; color: white; font-size: 14px;');
        console.log('Cards to delete:', cardsToDelete);
      }
      
      // Create a copy of the collections
      const updatedCollections = { ...collections };
      const cardIds = Array.isArray(cardsToDelete) ? cardsToDelete : [cardsToDelete];
      
      if (isDevMode) {
        console.log('Card IDs for deletion:', cardIds);
        console.log('Current collections before deletion:', JSON.parse(JSON.stringify(collections)));
        
        // Log each card's properties to check ID consistency
        cardIds.forEach(cardId => {
          const cardInCollection = Object.values(collections)
            .flat()
            .find(card => card.slabSerial === cardId || card.id === cardId);
          
          if (cardInCollection) {
            console.log('Found card to delete:', {
              cardId,
              slabSerial: cardInCollection.slabSerial,
              id: cardInCollection.id,
              card: cardInCollection.card,
              collection: cardInCollection.collection
            });
          } else {
            console.warn('Card not found in any collection:', cardId);
          }
        });
      }

      // Remove the cards from all collections
      Object.keys(updatedCollections).forEach(collectionName => {
        if (Array.isArray(updatedCollections[collectionName])) {
          const beforeCount = updatedCollections[collectionName].length;
          updatedCollections[collectionName] = updatedCollections[collectionName].filter(
            card => {
              // Check both id and slabSerial to ensure we catch all cards
              return !(cardIds.includes(card.id) || cardIds.includes(card.slabSerial));
            }
          );
          const afterCount = updatedCollections[collectionName].length;
          
          if (isDevMode) {
            console.log(`Collection "${collectionName}": removed ${beforeCount - afterCount} cards`);
          }
        }
      });

      // Save to database
      if (isDevMode) {
        console.log('Saving updated collections to database...');
      }
      
      try {
        await db.saveCollections(updatedCollections);
        
        if (isDevMode) {
          console.log('Database save successful');
        }
      } catch (dbError) {
        // Always log errors, even in production
        console.error('Database save failed:', dbError);
        throw dbError; // Re-throw to be caught by outer try/catch
      }
      
      // Update state in parent first
      try {
        if (onDeleteCards) {
          if (isDevMode) {
            console.log('Calling onDeleteCards with:', cardIds);
          }
          
          await onDeleteCards(cardIds);
          
          if (isDevMode) {
            console.log('onDeleteCards completed successfully');
          }
        } else if (onDeleteCard) {
          if (isDevMode) {
            console.log('Using onDeleteCard for each card');
          }
          
          for (const cardId of cardIds) {
            if (isDevMode) {
              console.log('Deleting individual card:', cardId);
            }
            
            await onDeleteCard(cardId);
          }
          
          if (isDevMode) {
            console.log('All individual deletions completed');
          }
        } else {
          console.warn('No deletion handler provided (onDeleteCards or onDeleteCard)');
        }
      } catch (innerError) {
        // Always log errors, even in production
        console.error('Error updating app state after deletion:', innerError);
        console.warn('Warning: Error updating app state after deletion, but database was updated successfully.');
      }

      // Update local state after parent state is updated
      setCollections(updatedCollections);
      clearSelection();
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);
      
      // Always show success message, but don't refresh the page
      toast.success(`${cardIds.length} card${cardIds.length > 1 ? 's' : ''} deleted`, {
        id: 'delete-success', // Add an ID to prevent duplicate toasts
        duration: 3000,
      });
      
      // Return true to indicate success
      return true;
    } catch (error) {
      console.error('Deletion failed with error:', error);
      toast.error('Failed to delete cards');
      // Don't throw error here, just handle it locally
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);
      clearSelection();
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
      
      // When in "All Cards" view, we need to find the actual collection each card belongs to
      const isAllCardsView = selectedCollection === 'All Cards';
      
      // Create a copy of collections to update
      const updatedCollections = { ...collections };
      
      // Ensure target collection exists
      if (!updatedCollections[targetCollection]) {
        updatedCollections[targetCollection] = [];
      }
      
      // Track moved cards for verification
      const movedCards = [];
      
      // Update each card's collection
      for (const card of cardsToMove) {
        // Prepare card data for the *explicit Firestore write* for the move operation
        const cardDataForFirestoreWrite = {
          ...card,
          collection: targetCollection,
          collectionId: targetCollection,
          lastMoved: new Date().toISOString(), // Add timestamp for verification
          // IMPORTANT: Do NOT set _saveDebug or _lastUpdateTime here, so shadowWriteCard attempts the write
        };
        // Ensure any pre-existing skip flags from the original card object are removed for this specific write
        delete cardDataForFirestoreWrite._saveDebug;
        delete cardDataForFirestoreWrite._lastUpdateTime;

        // Sync to Firestore if feature flag is enabled
        try {
          const shadowSync = await import('../services/shadowSync').then(module => module.default);
          // This call should now make shadowWriteCard proceed to the actual repository.updateCard
          await shadowSync.shadowWriteCard(card.slabSerial, cardDataForFirestoreWrite, targetCollection);
          console.log(`[CardList] Successfully synced card ${card.slabSerial} (move op) to Firestore in collection ${targetCollection}`);
        } catch (syncError) {
          // Log but don't fail the operation
          console.error(`[CardList] Error syncing card ${card.slabSerial} (move op) to Firestore:`, syncError);
        }

        // Now prepare the card object for updatedCollections (local state and for IndexedDB via saveCollections)
        // This version is flagged to indicate it has just been processed.
        const updatedCardForLocalStateAndIndexedDB = {
          ...cardDataForFirestoreWrite, // Base it on what was sent to Firestore
          _saveDebug: true, // Flag for db.saveCollections to know it was just handled
          _lastUpdateTime: new Date().toISOString() // Standard update tracking timestamp
        };
        
        // Add card to target collection in local state
        updatedCollections[targetCollection].push(updatedCardForLocalStateAndIndexedDB);
        
        // Remove card from source collection
        if (isAllCardsView) {
          // In "All Cards" view, find which collection the card is actually in
          Object.keys(updatedCollections).forEach(collectionName => {
            if (collectionName !== targetCollection) {
              updatedCollections[collectionName] = updatedCollections[collectionName].filter(
                c => c.slabSerial !== card.slabSerial
              );
            }
          });
        } else {
          // Normal case: remove from selected collection
          updatedCollections[selectedCollection] = updatedCollections[selectedCollection].filter(
            c => c.slabSerial !== card.slabSerial
          );
        }

        // Track this card for verification
        movedCards.push({
          id: card.slabSerial,
          name: card.card || 'Unnamed Card',
          from: isAllCardsView ? 'Unknown Collection' : selectedCollection,
          to: targetCollection
        });

        // Sync to Firestore if feature flag is enabled
        try {
          const shadowSync = await import('../services/shadowSync').then(module => module.default);
          // Make sure to pass the updated card with _saveDebug flag
          await shadowSync.shadowWriteCard(card.slabSerial, updatedCardForLocalStateAndIndexedDB, targetCollection);
          console.log(`[CardList] Successfully synced card ${card.slabSerial} to Firestore in collection ${targetCollection}`);
        } catch (syncError) {
          // Log but don't fail the operation
          console.error(`[CardList] Error syncing card ${card.slabSerial} to Firestore:`, syncError);
        }
      }
      
      // Save updated collections to database with explicit flags
      // Mark that we're doing a collection move operation
      const saveOptions = {
        preserveSold: true,
        operationType: 'moveCards'
      };
      
      await db.saveCollections(updatedCollections, saveOptions.preserveSold, saveOptions);

      // Update state
      setShowMoveModal(false);
      setSelectedCardsToMove([]);
      clearSelection();
      
      // Store move verification data in localStorage for later verification
      localStorage.setItem('lastCardMove', JSON.stringify({
        timestamp: new Date().toISOString(),
        cards: movedCards,
        targetCollection
      }));
      
      // Show success message
      toast.success(`Successfully moved ${cardsToMove.length} card${cardsToMove.length > 1 ? 's' : ''} to ${targetCollection}`);
      
      // Update collections in parent component
      if (setCollections) {
        setCollections(updatedCollections);
      }
      
      // Return true to indicate success
      return true;
    } catch (error) {
      console.error('Error moving cards:', error);
      toast.error('Error moving cards. Please try again.');
      return false;
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 pb-20">
      {/* Stats Section */}
      <StatisticsSummary 
        statistics={formatStatisticsForDisplay(totals, filteredCards.length, paginatedCards.length)}
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
          sortDirection={sortDirection}
          onSortDirectionChange={toggleSortDirection}
          onAddCard={onAddCard}
        />
      </div>

      <CollectionSelector
        selectedCollection={selectedCollection}
        collections={[
          'All Cards', 
          ...Object.keys(collections)
            .filter(collection => {
              const lowerCase = collection.toLowerCase();
              // Hide 'Default Collection' if it's empty
              if (lowerCase === 'default collection' && 
                  Array.isArray(collections[collection]) && 
                  collections[collection].length === 0) {
                return false;
              }
              // Filter out sold collections
              return lowerCase !== 'sold' && !lowerCase.includes('sold');
            })
            // Sort collections alphabetically
            .sort((a, b) => a.localeCompare(b))
        ]}
        onCollectionChange={onCollectionChange}
        onAddCollection={(newCollectionName) => {
          // Create a new collection
          const updatedCollections = {
            ...collections,
            [newCollectionName]: []
          };
          setCollections(updatedCollections);
          // Save to database
          db.saveCollections(updatedCollections);
          
          // After creating a new collection, select it
          if (typeof onCollectionChange === 'function') {
            onCollectionChange(newCollectionName);
          }
        }}
        className="mb-2"
      />

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">search_off</span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No cards found</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flex flex-col">
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 sm:gap-2`}>
            {paginatedCards.map(card => (
              <Card
                key={card._uniqueKey}
                card={card}
                investmentAUD={parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0)}
                currentValueAUD={parseFloat(card.originalCurrentValueAmount || card.currentValueAUD || 0)}
                formatUserCurrency={formatUserCurrency}
                preferredCurrency={preferredCurrency}
                originalInvestmentCurrency={card.originalInvestmentCurrency}
                originalCurrentValueCurrency={card.originalCurrentValueCurrency}
                cardImage={cardImages[card.slabSerial]}
                onClick={() => onCardClick(card)} 
                isSelected={selectedCards.has(card.slabSerial)}
                onSelect={(selected) => handleSelectCard(selected, card.slabSerial)}
                className=""
              />
            ))}
          </div>
          
          {/* Load more indicator */}
          {paginatedCards.length < filteredCards.length && (
            <div 
              ref={loadMoreRef}
              className="flex justify-center items-center py-4 mt-2"
            >
              {isLoadingMore ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading more cards...</span>
                </div>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">Scroll to load more</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="space-y-3">
            {paginatedCards.map(card => (
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
                        {formatUserCurrency(card.investmentAUD, card.originalInvestmentCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="ml-2 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatUserCurrency(card.currentValueAUD, card.originalCurrentValueCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Profit:</span>
                      <span className={`ml-2 font-medium text-xs sm:text-sm ${(parseFloat(card.originalCurrentValueAmount || card.currentValueAUD || 0) - parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0)) >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatUserCurrency(parseFloat(card.originalCurrentValueAmount || card.currentValueAUD || 0) - parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0), card.originalCurrentValueCurrency)}
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
          
          {/* Load more indicator for list view */}
          {paginatedCards.length < filteredCards.length && (
            <div 
              ref={loadMoreRef}
              className="flex justify-center items-center py-4 mt-2"
            >
              {isLoadingMore ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading more cards...</span>
                </div>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">Scroll to load more</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Cards Actions - Modern FAB Style */}
      {selectedCards.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          {/* Selection Count Badge */}
          <div className="mb-3 flex justify-center">
            <div className="bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''} selected
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#1B2131] rounded-2xl p-3 shadow-xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            {/* Sell Button */}
            <button
              onClick={() => {
                setSelectedCardsForSale(cards.filter(card => selectedCards.has(card.slabSerial)));
                setShowSaleModal(true);
              }}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="Sell selected cards"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">sell</span>
              <span className="text-xs font-medium">Sell</span>
            </button>
            
            {/* Purchase Invoice Button */}
            <button
              onClick={() => {
                setSelectedCardsForPurchase(cards.filter(card => selectedCards.has(card.slabSerial)));
                setShowPurchaseInvoiceModal(true);
              }}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="Create purchase invoice"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">receipt</span>
              <span className="text-xs font-medium">Invoice</span>
            </button>
            
            {/* List on Marketplace Button */}
            <button
              onClick={() => {
                // Use the existing bulk listing logic
                (async () => {
                  try {
                    console.log("Starting bulk listing flow");
                    
                    if (!user || !user.uid) {
                      toast.error('You must be logged in to list cards');
                      return;
                    }
                    
                    const selectedCardObjects = cards.filter(card => selectedCards.has(card.slabSerial));
                    
                    if (selectedCardObjects.length === 0) {
                      toast.error('No cards selected for listing');
                      return;
                    }
                    
                    const loadingToast = toast.loading('Checking marketplace status...');
                    
                    try {
                      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
                      const checkPromises = selectedCardObjects.map(async (card) => {
                        if (!card.slabSerial) return { ...card, isActuallyListed: false };
                        
                        const existingQuery = query(
                          marketplaceRef,
                          where('cardId', '==', card.slabSerial),
                          where('status', '==', 'available')
                        );
                        
                        try {
                          const snapshot = await getDocs(existingQuery);
                          const isActuallyListed = !snapshot.empty;
                          return { ...card, isActuallyListed };
                        } catch (error) {
                          console.error(`Error checking listing status for ${card.slabSerial}:`, error);
                          return { ...card, isActuallyListed: false };
                        }
                      });
                      
                      const checkedCards = await Promise.all(checkPromises);
                      toast.dismiss(loadingToast);
                      
                      const cardsToList = checkedCards.filter(card => !card.isActuallyListed);
                      
                      const cardsNeedingUpdate = checkedCards.filter(card => 
                        Boolean(card.isListed) !== Boolean(card.isActuallyListed)
                      );
                      
                      if (cardsNeedingUpdate.length > 0) {
                        console.log(`Found ${cardsNeedingUpdate.length} cards with out-of-sync isListed flags`);
                        
                        const updatePromises = cardsNeedingUpdate.map(card => {
                          if (!card.slabSerial) return Promise.resolve();
                          
                          const cardRef = doc(firestoreDb, `users/${user.uid}/cards/${card.slabSerial}`);
                          return updateDoc(cardRef, { isListed: card.isActuallyListed })
                            .then(() => {
                              console.log(`Updated isListed flag for ${card.card || card.slabSerial} to ${card.isActuallyListed}`);
                            })
                            .catch(error => {
                              console.error(`Error updating isListed flag for ${card.slabSerial}:`, error);
                            });
                        });
                        
                        await Promise.all(updatePromises);
                      }
                      
                      if (cardsToList.length === 0) {
                        toast.error('All selected cards are already listed on the marketplace');
                        return;
                      }
                      
                      setSelectedCardsForListing(cardsToList);
                      setShowListCardModal(true);
                    } catch (error) {
                      toast.dismiss(loadingToast);
                      toast.error('Error checking marketplace status');
                      console.error('Error in bulk listing flow:', error);
                    }
                  } catch (error) {
                    toast.error('Error starting bulk listing process');
                    console.error('Error in bulk listing flow:', error);
                  }
                })();
              }}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="List on marketplace"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">storefront</span>
              <span className="text-xs font-medium">List</span>
            </button>
            
            {/* Move Button */}
            <button
              onClick={handleMoveCards}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="Move to collection"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">drive_file_move</span>
              <span className="text-xs font-medium">Move</span>
            </button>
            
            {/* Delete Button */}
            <button
              onClick={handleDeleteClick}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="Delete selected cards"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">delete</span>
              <span className="text-xs font-medium">Delete</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            
            {/* Select All Button */}
            <button
              onClick={handleSelectAll}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title={selectedCards.size === cards.length ? "Deselect all" : "Select all"}
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">
                {selectedCards.size === cards.length ? 'deselect' : 'select_all'}
              </span>
              <span className="text-xs font-medium">
                {selectedCards.size === cards.length ? 'Deselect' : 'All'}
              </span>
            </button>
            
            {/* Clear Selection Button */}
            <button
              onClick={clearSelection}
              className="group flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gray-400 hover:bg-gray-500 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              title="Clear selection"
            >
              <span className="material-icons text-lg mb-0.5 group-hover:scale-110 transition-transform duration-200">clear</span>
              <span className="text-xs font-medium">Clear</span>
            </button>
          </div>
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
          clearSelection();
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
      
      {/* Purchase Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showPurchaseInvoiceModal}
        onClose={() => {
          setShowPurchaseInvoiceModal(false);
          setSelectedCardsForPurchase([]);
          clearSelection();
        }}
        onSave={(newInvoice) => {
          // Toast is already shown in the CreateInvoiceModal component
          setShowPurchaseInvoiceModal(false);
          setSelectedCardsForPurchase([]);
          clearSelection();
          
          // Navigate to Purchase Invoices page after successful save using React Router
          setTimeout(() => {
            // Use React Router's navigate function for a smooth transition
            navigate('/purchase-invoices');
          }, 300); // Short delay to ensure toast is visible
        }}
        preSelectedCards={selectedCardsForPurchase}
      />

      {/* List Card Modal */}
      <ListCardModal
        isOpen={showListCardModal}
        onClose={() => {
          setShowListCardModal(false);
          setSelectedCardsForListing([]);
          clearSelection();
        }}
        selectedCards={selectedCardsForListing}
      />
    </div>
  );
};

export default CardList;
