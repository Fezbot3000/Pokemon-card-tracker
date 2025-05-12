import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { useTheme } from '../design-system';
import db from '../services/db';
import { formatCurrency, formatCondensed } from '../utils/formatters';
import { toast } from 'react-hot-toast';
import { StatisticsSummary, SearchToolbar, Card, ConfirmDialog } from '../design-system';
import SaleModal from './SaleModal';
import MoveCardsModal from './MoveCardsModal';
import CreateInvoiceModal from './PurchaseInvoices/CreateInvoiceModal';

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
  const [showPurchaseInvoiceModal, setShowPurchaseInvoiceModal] = useState(false);
  const [selectedCardsForPurchase, setSelectedCardsForPurchase] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');  // For dropdown selection

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
    { field: 'currentValueAUD', label: 'Current Value' },
    { field: 'investmentAUD', label: 'Paid' },
    { field: 'potentialProfit', label: 'Profit' },
    { field: 'datePurchased', label: 'Purchase Date' },
    { field: 'player', label: 'Player Name' },
    { field: 'cardNumber', label: 'Card Number' }
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
            card => !cardIds.includes(card.slabSerial)
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
      setSelectedCards(new Set());
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);
      
      // Always show success message and refresh page, even if there were non-critical errors
      // This ensures the user sees success and gets a fresh state
      toast.success(`${cardIds.length} card${cardIds.length > 1 ? 's' : ''} deleted`, {
        id: 'delete-success', // Add an ID to prevent duplicate toasts
        duration: 3000,
      });
      
      // Re-enable auto-refresh for production
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Deletion failed with error:', error);
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
        // Set both collection and collectionId properties for compatibility
        const updatedCard = { 
          ...card, 
          collection: targetCollection,
          collectionId: targetCollection,
          lastMoved: new Date().toISOString() // Add timestamp for verification
        };
        
        // Add card to target collection
        updatedCollections[targetCollection].push(updatedCard);
        
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
          await shadowSync.shadowWriteCard(card.slabSerial, updatedCard, targetCollection);
          console.log(`[CardList] Successfully synced card ${card.slabSerial} to Firestore in collection ${targetCollection}`);
        } catch (syncError) {
          // Log but don't fail the operation
          console.error(`[CardList] Error syncing card ${card.slabSerial} to Firestore:`, syncError);
        }
      }
      
      // Save updated collections to database
      await db.saveCollections(updatedCollections);

      // Update state
      setShowMoveModal(false);
      setSelectedCardsToMove([]);
      setSelectedCards(new Set());
      
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
    <div className="pt-16 sm:pt-32 w-full px-1 sm:px-2">
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
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 sm:gap-2`}>
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
        <div className={`fixed bottom-0 sm:bottom-[56px] left-0 w-full flex items-center justify-between px-4 py-3 rounded-t-md shadow-2xl bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700 z-50 sm:z-40
          ${window.innerWidth >= 640 ? 'left-1/2 transform -translate-x-1/2 w-auto rounded-md border min-h-[64px] h-auto' : 'mb-[60px]'}
        `}>
          <span className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">{selectedCards.size} selected</span>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 rounded-md bg-white dark:bg-[#252B3B] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select action...</option>
              <option value="sell">Sell</option>
              <option value="purchase">Purchase Invoice</option>
              <option value="move">Move</option>
              <option value="delete">Delete</option>
              <option value="selectAll">Select All</option>
              <option value="clear">Clear Selection</option>
            </select>
            
            <button
              onClick={() => {
                switch(selectedAction) {
                  case 'sell':
                    setSelectedCardsForSale(cards.filter(card => selectedCards.has(card.id)));
                    setShowSaleModal(true);
                    break;
                  case 'purchase':
                    setSelectedCardsForPurchase(cards.filter(card => selectedCards.has(card.id)));
                    setShowPurchaseInvoiceModal(true);
                    break;
                  case 'move':
                    handleMoveCards();
                    break;
                  case 'delete':
                    handleDeleteClick();
                    break;
                  case 'selectAll':
                    handleSelectAll();
                    break;
                  case 'clear':
                    setSelectedCards(new Set());
                    break;
                  default:
                    // No action selected
                    break;
                }
                // Reset the dropdown after action
                setSelectedAction('');
              }}
              disabled={!selectedAction}
              className={`px-4 py-2 rounded-md ${selectedAction ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'} text-white font-medium transition-colors flex items-center gap-2`}
            >
              <span className="material-icons text-base">navigate_next</span>
              <span>Next</span>
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
      
      {/* Purchase Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showPurchaseInvoiceModal}
        onClose={() => {
          setShowPurchaseInvoiceModal(false);
          setSelectedCardsForPurchase([]);
          setSelectedCards(new Set());
        }}
        onSave={(newInvoice) => {
          toast.success('Purchase invoice created successfully!');
          setShowPurchaseInvoiceModal(false);
          setSelectedCardsForPurchase([]);
          setSelectedCards(new Set());
          
          // Navigate to Purchase Invoices page after successful save
          setTimeout(() => {
            // Use window.location to navigate to the Purchase Invoices page
            window.location.href = '/#/purchase-invoices';
          }, 300); // Short delay to ensure toast is visible
        }}
        preSelectedCards={selectedCardsForPurchase}
      />
    </div>
  );
};

export default CardList;
