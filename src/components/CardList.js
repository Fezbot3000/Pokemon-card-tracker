import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import db from '../services/firestore/dbAdapter';
import { db as firestoreDb } from '../services/firebase';
import { toast } from 'react-hot-toast';
import {
  StatisticsSummary,
  SearchToolbar,
  Card,
  ConfirmDialog,
  CardDetailsModal,
} from '../design-system';
import CollectionSelector from '../design-system/components/CollectionSelector';
import SaleModal from './SaleModal';
import MoveCardsModal from './MoveCardsModal';
import CreateInvoiceModal from './PurchaseInvoices/CreateInvoiceModal';
import ListCardModal from './Marketplace/ListCardModal';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../design-system';
import {
  calculateCardTotals,
  formatStatisticsForDisplay,
} from '../utils/cardStatistics';
import { useCardSelection } from '../hooks';
import {
  moveCards,
} from '../utils/moveCardsHandler';
import { useSubscription } from '../hooks/useSubscription';
import logger from '../services/LoggingService';



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
  onCollectionChange,
  onSelectionChange,
}) => {


  // Initialize navigate function from React Router
  const navigate = useNavigate();
  const { user } = useAuth() || { user: null };
  const { formatAmountForDisplay: formatUserCurrency, preferredCurrency } =
    useUserPreferences();
  const { hasFeature } = useSubscription();

  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState(
    localStorage.getItem('cardListSortField') || 'currentValueAUD'
  );
  const [sortDirection, setSortDirection] = useState(
    localStorage.getItem('cardListSortDirection') || 'desc'
  );
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('cardListViewMode') || 'grid'
  );
  const [displayMetric] = useState(() => {
    const saved = localStorage.getItem('cardListDisplayMetric');
    return saved || 'currentValueAUD';
  });

  // Memoized filtered and sorted cards
  const filteredCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];

    // First filter by collection
    let filtered = cards;
    if (selectedCollection && selectedCollection !== 'All Cards') {
      filtered = filtered.filter(
        card =>
          card.collection === selectedCollection ||
          card.collectionId === selectedCollection
      );
    }

    // Then apply search filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(
        card =>
          (card.card && card.card.toLowerCase().includes(lowerFilter)) ||
          (card.set && card.set.toLowerCase().includes(lowerFilter)) ||
          (card.slabSerial &&
            card.slabSerial.toLowerCase().includes(lowerFilter)) ||
          (card.player && card.player.toLowerCase().includes(lowerFilter)) ||
          (card.holoState && card.holoState.toLowerCase().includes(lowerFilter))
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
        aValue = parseFloat(
          a.originalCurrentValueAmount || a.currentValueAUD || 0
        );
        bValue = parseFloat(
          b.originalCurrentValueAmount || b.currentValueAUD || 0
        );
      } else if (sortField === 'investmentAUD') {
        aValue = parseFloat(a.originalInvestmentAmount || a.investmentAUD || 0);
        bValue = parseFloat(b.originalInvestmentAmount || b.investmentAUD || 0);
      } else if (sortField === 'potentialProfit') {
        // Calculate profit from the available fields
        const aInvestment = parseFloat(
          a.originalInvestmentAmount || a.investmentAUD || 0
        );
        const aCurrentValue = parseFloat(
          a.originalCurrentValueAmount || a.currentValueAUD || 0
        );
        const bInvestment = parseFloat(
          b.originalInvestmentAmount || b.investmentAUD || 0
        );
        const bCurrentValue = parseFloat(
          b.originalCurrentValueAmount || b.currentValueAUD || 0
        );
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
        primarySort =
          sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Handle string values
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        primarySort =
          sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
      }
      // Handle mixed types (convert to string for comparison)
      else {
        const aStr = String(aValue);
        const bStr = String(bValue);
        primarySort =
          sortDirection === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
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
    return filtered.map((card, idx) => ({
      ...card,
      _uniqueKey: `${card.slabSerial || 'unknown'}-${card.collection || 'none'}-${idx}`,
    }));
  }, [cards, filter, sortField, sortDirection, selectedCollection]);

  // Use card selection hook with filtered cards
  const {
    selectedCards,
    handleSelectCard,
    handleSelectAll,
    clearSelection,
  } = useCardSelection(filteredCards);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedCards);
    }
  }, [selectedCards, onSelectionChange]);

  // Clear selection when cards array changes (e.g., after move operations)
  // This prevents stale selection state when cards are moved between collections
  useEffect(() => {
    const currentCardIds = new Set(filteredCards.map(card => card.slabSerial));
    const selectedCardIds = Array.from(selectedCards);
    const hasStaleSelections = selectedCardIds.some(
      id => !currentCardIds.has(id)
    );

    if (hasStaleSelections && selectedCards.size > 0) {
      // LoggingService.info('[CardList] Clearing stale selection state after cards changed');
      clearSelection();
    }
  }, [filteredCards, selectedCards, clearSelection]);

  const [cardImages, setCardImages] = useState({});
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedCardsForSale, setSelectedCardsForSale] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardsToDelete, setCardsToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedCardsToMove, setSelectedCardsToMove] = useState([]);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showPurchaseInvoiceModal, setShowPurchaseInvoiceModal] =
    useState(false);
  const [selectedCardsForPurchase, setSelectedCardsForPurchase] = useState([]);
  const [showListCardModal, setShowListCardModal] = useState(false);
  const [selectedCardsForListing, setSelectedCardsForListing] = useState([]);
  const [visibleCardCount, setVisibleCardCount] = useState(() => {
    // console.log('[CardList INIT] visibleCardCount initialised at', Date.now());
    return 24;
  });


  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const valueDropdownRef = useRef(null);
  const metricDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        // setShowSortDropdown(false); // Not used
      }
      if (
        metricDropdownRef.current &&
        !metricDropdownRef.current.contains(event.target)
      ) {
        // setIsMetricDropdownOpen(false); // Not used
      }
      if (
        valueDropdownRef.current &&
        !valueDropdownRef.current.contains(event.target)
      ) {
        // setIsValueDropdownOpen(false); // Not used
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
            logger.warn('Failed to revoke potential blob URL:', url, error);
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
            logger.error(
              `Error loading image for card ${card.slabSerial} from IndexedDB:`,
              error
            );
            images[card.slabSerial] = null; // Ensure it's null on error
          }
        }
      }
      setCardImages(images);
    };

    loadCardImages();

    // Cleanup logic remains complex due to potential blob URLs
    return () => {
      Object.entries(cardImages).forEach(([, url]) => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            logger.warn(
              'Failed to revoke potential blob URL during cleanup:',
              url,
              error
            );
          }
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]); // Only depend on cards, not cardImages to prevent infinite loop

  // Function to refresh a single card's image
  const refreshCardImage = useCallback(async cardId => {
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
        [cardId]: newImageUrl, // Store the new URL (Firestore or Blob)
      }));
    } catch (error) {
      logger.error(`Error refreshing image for card ${cardId}:`, error);
      // Optionally set to null or keep the old image on error
      setCardImages(prev => ({
        ...prev,
        [cardId]: prev[cardId], // Keep existing on error, or set to null
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]); // Remove cardImages dependency to prevent infinite loops

  // Wrap the onUpdateCard function to handle image refreshing
  const handleCardUpdate = useCallback(
    async updatedCard => {
      // If the card has an updated image, refresh it immediately
      if (updatedCard.imageUpdatedAt) {
        await refreshCardImage(updatedCard.slabSerial);
      }

      // Call the original onUpdateCard function
      onUpdateCard(updatedCard);
    },
    [onUpdateCard, refreshCardImage]
  );

  // Sort options
  const sortOptions = [
    { field: 'card', label: 'Card Name' },
    { field: 'currentValueAUD', label: 'Current Value' },
    { field: 'investmentAUD', label: 'Paid' },
    { field: 'potentialProfit', label: 'Profit' },
    { field: 'datePurchased', label: 'Purchase Date' },
    { field: 'player', label: 'Player Name' },
    { field: 'cardNumber', label: 'Card Number' },
    { field: 'set', label: 'Set Name' },
  ];

  // Function to get the label for a sort field
  const getSortFieldLabel = field => {
    // Handle different format variations (like 'currentValue' vs 'currentValueAUD')
    const normalizedField = field.replace(/AUD$/, ''); // Remove AUD suffix if present

    // First, try to find an exact match
    let option = sortOptions.find(opt => opt.field === field);

    // If no exact match, try with normalized field
    if (!option) {
      option = sortOptions.find(
        opt =>
          opt.field.toLowerCase().includes(normalizedField.toLowerCase()) ||
          normalizedField.toLowerCase().includes(opt.field.toLowerCase())
      );
    }

    return option ? option.label : field;
  };

  const handleSortChange = field => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new sort fields
    }
  };



  // Paginated cards - only show the number of cards specified by visibleCardCount
  const paginatedCards = useMemo(() => {
    return filteredCards.slice(0, visibleCardCount);
  }, [filteredCards, visibleCardCount]);

  // Calculate totals using the utility function - updated to use filtered cards for selected collection
  const totals = useMemo(
    () => calculateCardTotals(filteredCards),
    [filteredCards]
  );

  // Reset state when collection changes
  useEffect(() => {
    clearSelection();
    setSelectedCardsForSale([]);
    setShowSaleModal(false);
    // setBuyer(''); // Commented out - variable not defined
    setFilter('');
    
    // VALIDATION TEST: Check if reset prevention is enabled
    const preventReset = localStorage.getItem('VALIDATION_DISABLE_RESET') === 'true';
    
    if (preventReset) {
      // console.log('🔬 VALIDATION: visibleCardCount reset PREVENTED');
      // Do not reset visibleCardCount for validation testing
    } else {
      // console.log('🔬 VALIDATION: visibleCardCount reset to 24');
      setVisibleCardCount(24); // Reset pagination when collection changes
    }
  }, [selectedCollection, clearSelection]);

  // Load more cards when user scrolls to the bottom
  useEffect(() => {
    if (
      inView &&
      !isLoadingMore &&
      paginatedCards.length < filteredCards.length
    ) {
      setIsLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setVisibleCardCount(prevCount => {
          // Calculate cards per row based on screen size
          const cardsPerRow =
            window.innerWidth < 640
              ? 2 // mobile
              : window.innerWidth < 768
                ? 3 // sm
                : window.innerWidth < 1024
                  ? 5 // md
                  : window.innerWidth < 1280
                    ? 6
                    : 7; // lg and xl

          // Load 2 more rows of cards
          return prevCount + cardsPerRow * 2;
        });
        setIsLoadingMore(false);
      }, 300);
    }
  }, [inView, isLoadingMore, paginatedCards.length, filteredCards.length]);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCardCount(24);
  }, [filter]);

  // const handleMarkAsSold = () => {
  //   if (selectedCards.size === 0) {
  //     toast.error('Please select at least one card to mark as sold');
  //     return;
  //   }
  //   // Get the full card data for selected cards
  //   const selectedCardData = cards.filter(card =>
  //     selectedCards.has(card.slabSerial)
  //   );
  //   setSelectedCardsForSale(selectedCardData);
  //   setShowSaleModal(true);
  // };

  // Function to generate a unique invoice ID
  const generateInvoiceId = async () => {
    try {
      // Get existing sold cards directly from Firestore
      const firestoreService = (
        await import('../services/firestore/firestoreService.js')
      ).default;
      const existingSoldItems = await firestoreService.getSoldItems();

      // Get the highest invoice number
      let highestNumber = 0;
      existingSoldItems.forEach(item => {
        if (item.invoiceId) {
          const match = item.invoiceId.match(/INV-(\d+)/);
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
      logger.error('Error generating invoice ID:', error);
      // Fallback to timestamp-based ID if there's an error
      return `INV-${Date.now()}`;
    }
  };

  const handleSaleConfirm = async ({
    buyer,
    dateSold,
    soldPrices,
    // totalSalePrice,
    // totalProfit,
  }) => {
    try {
      // Generate a new invoice ID for this transaction
      const invoiceId = await generateInvoiceId();

      const selectedCardsData = selectedCardsForSale.map(card => ({
        ...card,
        id: card.slabSerial || card.id, // Ensure each sold item has an id field
        finalValueAUD: parseFloat(soldPrices[card.slabSerial]),
        finalProfitAUD:
          parseFloat(soldPrices[card.slabSerial]) - card.investmentAUD,
        dateSold,
        buyer,
        invoiceId, // Add the invoice ID to each card
      }));

      // Save each sold card directly to Firestore
      const firestoreService = (
        await import('../services/firestore/firestoreService.js')
      ).default;
      for (const soldCard of selectedCardsData) {
        await firestoreService.saveSoldItem(soldCard);
      }

      // Remove cards from collections using the proper delete handler
      const cardIds = selectedCardsData.map(card => card.slabSerial);

      // Use the parent's delete handler which properly manages collections
      if (onDeleteCards) {
        await onDeleteCards(cardIds);
      } else if (onDeleteCard) {
        // Fallback to individual deletion if bulk delete not available
        for (const cardId of cardIds) {
          await onDeleteCard(cardId);
        }
      }

      // Clear local state
      clearSelection();
      setShowSaleModal(false);
      setSelectedCardsForSale([]);

      // Show success message
      toast.success(
        `${selectedCardsData.length} card${selectedCardsData.length > 1 ? 's' : ''} marked as sold`,
        {
          id: 'sale-success',
          duration: 2000,
        }
      );

      // Refresh page to show updated state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      logger.error('Error marking cards as sold:', error);
      toast.error(
        `Failed to mark cards as sold: ${error.message || 'Please try again.'}`
      );
    }
  };

  // Toggle sort direction
  const toggleSortDirection = newDirection => {
    // If a direction is provided, use it; otherwise toggle the current direction
    const direction =
      newDirection || (sortDirection === 'asc' ? 'desc' : 'asc');
    setSortDirection(direction);
    localStorage.setItem('cardListSortDirection', direction);
  };



  const handleCardDelete = async cardToDelete => {
    try {
      const cardId = cardToDelete?.id || cardToDelete;
      if (!cardId) {
        logger.error('Invalid card ID for deletion:', cardToDelete);
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
      logger.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleBulkDelete = async cardsToDelete => {
    try {
      // Only add detailed logging in development mode
      const isDevMode = process.env.NODE_ENV === 'development';

      if (isDevMode) {
        // LoggingService.info('%c DELETION DEBUG - STARTING DELETION PROCESS', 'background: #ff0000; color: white; font-size: 14px;');
        // LoggingService.info('Cards to delete:', cardsToDelete);
      }

      // Create a copy of the collections
      const updatedCollections = { ...collections };
      const cardIds = Array.isArray(cardsToDelete)
        ? cardsToDelete
        : [cardsToDelete];

      if (isDevMode) {
        // LoggingService.info('Card IDs for deletion:', cardIds);
        // LoggingService.info('Current collections before deletion:', JSON.parse(JSON.stringify(collections)));

        // Log each card's properties to check ID consistency
        cardIds.forEach(cardId => {
          const cardInCollection = Object.values(collections)
            .flat()
            .find(card => card.slabSerial === cardId || card.id === cardId);

          if (cardInCollection) {
            // LoggingService.info('Found card to delete:', {
            //   cardId,
            //   slabSerial: cardInCollection.slabSerial,
            //   id: cardInCollection.id,
            //   card: cardInCollection.card,
            //   collection: cardInCollection.collection
            // });
          } else {
            logger.warn('Card not found in any collection:', cardId);
          }
        });
      }

      // Remove the cards from all collections
      Object.keys(updatedCollections).forEach(collectionName => {
        if (Array.isArray(updatedCollections[collectionName])) {
          // const beforeCount = updatedCollections[collectionName].length;
          updatedCollections[collectionName] = updatedCollections[
            collectionName
          ].filter(card => {
            // Check both id and slabSerial to ensure we catch all cards
            return !(
              cardIds.includes(card.id) || cardIds.includes(card.slabSerial)
            );
          });
          // const afterCount = updatedCollections[collectionName].length;

          if (isDevMode) {
            // LoggingService.info(`Collection "${collectionName}": removed ${beforeCount - afterCount} cards`);
          }
        }
      });

      // Save to database
      if (isDevMode) {
        // LoggingService.info('Saving updated collections to database...');
      }

      try {
        await db.saveCollections(updatedCollections);

        if (isDevMode) {
          // LoggingService.info('Database save successful');
        }
      } catch (dbError) {
        // Always log errors, even in production
        logger.error('Database save failed:', dbError);
        throw dbError; // Re-throw to be caught by outer try/catch
      }

      // Update state in parent first
      try {
        if (onDeleteCards) {
          if (isDevMode) {
            // LoggingService.info('Calling onDeleteCards with:', cardIds);
          }

          await onDeleteCards(cardIds);

          if (isDevMode) {
            // LoggingService.info('onDeleteCards completed successfully');
          }
        } else if (onDeleteCard) {
          if (isDevMode) {
            // LoggingService.info('Using onDeleteCard for each card');
          }

          for (const cardId of cardIds) {
            if (isDevMode) {
              // LoggingService.info('Deleting individual card:', cardId);
            }

            await onDeleteCard(cardId);
          }

          if (isDevMode) {
            // LoggingService.info('All individual deletions completed');
          }
        } else {
          logger.warn(
            'No deletion handler provided (onDeleteCards or onDeleteCard)'
          );
        }
      } catch (innerError) {
        // Always log errors, even in production
        logger.error('Error updating app state after deletion:', innerError);
        logger.warn(
          'Warning: Error updating app state after deletion, but database was updated successfully.'
        );
      }

      // Update local state after parent state is updated
      setCollections(updatedCollections);
      clearSelection();
      setShowDeleteModal(false);
      setShowCardDetails(false);
      setSelectedCard(null);

      // Always show success message, but don't refresh the page
      toast.success(
        `${cardIds.length} card${cardIds.length > 1 ? 's' : ''} deleted`,
        {
          id: 'delete-success', // Add an ID to prevent duplicate toasts
          duration: 3000,
        }
      );

      // Return true to indicate success
      return true;
    } catch (error) {
      logger.error('Deletion failed with error:', error);
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
      setIsDeleting(true);
      
      const selectedSlabSerials = Array.from(selectedCards);
      
      // Convert slabSerials to actual card objects to get the correct document IDs
      const cardsToDelete = selectedSlabSerials.map(slabSerial => {
        // Find the card in the current cards list by slabSerial
        const card = cards.find(c => c.slabSerial === slabSerial);
        if (card) {
          // Return the card's document ID (which should be card.id)
          return card.id || card.slabSerial;
        }
        // Fallback to slabSerial if card not found
        return slabSerial;
      }).filter(Boolean);
      
      logger.info('Converting selected cards for deletion:', {
        selectedSlabSerials,
        cardsToDelete
      });
      
      await handleBulkDelete(cardsToDelete);
      
      // Clear selection after successful deletion
      if (onSelectionChange) {
        onSelectionChange(new Set());
      }
      
      toast.success(`Successfully deleted ${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''}`);
    } catch (error) {
      logger.error('Error in handleDeleteConfirm:', error);
      toast.error('Failed to delete cards');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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
    const cardsToMove = filteredCards.filter(card =>
      selectedCards.has(card.slabSerial)
    );
    setSelectedCardsToMove(cardsToMove);

    // Filter collections to remove both "Sold" and lowercase "sold"
    const filteredCollections = Object.keys(collections).filter(collection => {
      const lowerCase = collection.toLowerCase();
      return (
        collection !== 'All Cards' &&
        collection !== selectedCollection &&
        lowerCase !== 'sold' &&
        !lowerCase.includes('sold')
      );
    });

    // Only show modal if there are valid collections to move to
    if (filteredCollections.length > 0) {
      setShowMoveModal(true);
    } else {
      toast.error(
        'No valid collections to move cards to. Create a new collection first.'
      );
    }
  };

  const handleMoveConfirm = async targetCollection => {
    try {
      // Get the cards to move
      const cardsToMove = cards.filter(card =>
        selectedCards.has(card.slabSerial)
      );

      if (cardsToMove.length === 0) {
        toast.error('No cards selected to move');
        return;
      }

      // Use the robust move handler
      const success = await moveCards({
        cardsToMove,
        targetCollection,
        sourceCollection: selectedCollection,
        collections,
        setCollections,
        clearSelection,
        isAllCardsView: selectedCollection === 'All Cards',
      });

      if (success) {
        // Clear UI state only on success
        setShowMoveModal(false);
        setSelectedCardsToMove([]);

        // LoggingService.info('[CardList] Move operation completed successfully');
      } else {
        logger.warn('[CardList] Move operation failed or partially failed');
        // Don't clear the modal on failure so user can retry
      }
    } catch (error) {
      logger.error('[CardList] Error in handleMoveConfirm:', error);
      toast.error('Failed to move cards. Please try again.');
      // Don't clear the modal on error so user can retry
    }
  };

  // MOUNT DETECTION: Track if component is mounting vs re-rendering
  // useEffect(() => {
  //   const mountTime = Date.now();
  //   console.log(`🔍 CARDLIST MOUNT DETECTED at ${mountTime}`);
    
  //   // Track in global detector if available
  //   if (window.__MOUNT_DETECTOR__) {
  //     window.__MOUNT_DETECTOR__.cardListMounts++;
  //     window.__MOUNT_DETECTOR__.lastMountTime = mountTime;
  //     window.__MOUNT_DETECTOR__.mountHistory.push({
  //       timestamp: mountTime,
  //       type: 'component_mount',
  //       stackTrace: new Error().stack
  //     });
  //   }
    
  //   // Cleanup function will only run on unmount
  //   return () => {
  //     console.log(`🔍 CARDLIST UNMOUNT DETECTED at ${Date.now()}`);
  //   };
  // }, []); // Empty dependency array = only on mount/unmount

  // VISIBLE CARD COUNT RESET DETECTION
  // useEffect(() => {
  //   console.log(`🔍 CARDLIST visibleCardCount changed to: ${visibleCardCount}`);
    
  //   // Track resets specifically
  //   if (visibleCardCount === 24) {
  //     console.log(`🚨 CARDLIST visibleCardCount RESET TO 24 at ${Date.now()}`);
  //   }
  // }, [visibleCardCount]);

  return (
    <div className="w-full px-1 pb-20 sm:px-2">
      {/* Stats Section - Always show, even for empty collections */}
      <StatisticsSummary
        statistics={formatStatisticsForDisplay(
          totals,
          filteredCards.length,
          paginatedCards.length
        )}
        className="mb-3 sm:mb-4"
      />

      {/* Controls Section - Always show so users can add cards */}
      <div className="mb-4">
        <SearchToolbar
          searchValue={filter}
          onSearchChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOption={getSortFieldLabel(sortField)}
          sortOptions={sortOptions.map(option => option.label)}
          onSortChange={optionLabel => {
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

      <div className="mb-2 flex justify-end">
        <CollectionSelector
          selectedCollection={selectedCollection}
          collections={[
            'All Cards',
            ...Object.keys(collections)
              .filter(collection => {
                const lowerCase = collection.toLowerCase();
                // Hide 'Default Collection' if it's empty
                if (
                  lowerCase === 'default collection' &&
                  Array.isArray(collections[collection]) &&
                  collections[collection].length === 0
                ) {
                  return false;
                }
                // Filter out sold collections
                return lowerCase !== 'sold' && !lowerCase.includes('sold');
              })
              // Sort collections alphabetically
              .sort((a, b) => a.localeCompare(b)),
          ]}
          onCollectionChange={onCollectionChange}
          onAddCollection={newCollectionName => {
            // Create a new collection
            const updatedCollections = {
              ...collections,
              [newCollectionName]: [],
            };
            setCollections(updatedCollections);
            // Save to database
            db.saveCollections(updatedCollections);

            // After creating a new collection, select it
            if (typeof onCollectionChange === 'function') {
              onCollectionChange(newCollectionName);
            }
          }}
        />
      </div>

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div className="py-8 text-center sm:py-12">
          <span className="material-icons mb-3 text-4xl text-gray-400 dark:text-gray-600 sm:mb-4 sm:text-5xl">
            inventory_2
          </span>
          <h3 className="mb-1 text-sm font-medium text-gray-900 dark:text-white sm:mb-2 sm:text-base">
            No cards found
          </h3>
          <p className="mb-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            {cards.length === 0
              ? 'Start building your collection by adding your first card!'
              : 'Try adjusting your search or filters'}
          </p>
          {cards.length === 0 && (
            <button
              onClick={onAddCard}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <span className="material-icons mr-2 text-sm">add</span>
              Add Your First Card
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flex flex-col">
          <div
            className={`grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7`}
          >
            {paginatedCards.map(card => (
              <Card
                key={card._uniqueKey}
                card={card}
                investmentAUD={parseFloat(
                  card.originalInvestmentAmount || card.investmentAUD || 0
                )}
                currentValueAUD={parseFloat(
                  card.originalCurrentValueAmount || card.currentValueAUD || 0
                )}
                formatUserCurrency={formatUserCurrency}
                preferredCurrency={preferredCurrency}
                originalInvestmentCurrency={card.originalInvestmentCurrency}
                originalCurrentValueCurrency={card.originalCurrentValueCurrency}
                cardImage={cardImages[card.slabSerial]}
                onClick={() => onCardClick(card)}
                isSelected={selectedCards.has(card.slabSerial)}
                onSelect={selected =>
                  handleSelectCard(selected, card.slabSerial)
                }
                className=""
              />
            ))}
          </div>

          {/* Load more indicator */}
          {paginatedCards.length < filteredCards.length && (
            <div
              ref={loadMoreRef}
              className="mt-2 flex items-center justify-center py-4"
            >
              {isLoadingMore ? (
                <div className="flex items-center space-x-2">
                  <div className="size-5 animate-spin rounded-full border-y-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Loading more cards...
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Scroll to load more
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCards.map(card => (
              <div
                key={card._uniqueKey}
                className={`overflow-hidden rounded-lg bg-white transition-all duration-200 hover:shadow-md dark:bg-[#0F0F0F] ${selectedCards.has(card.slabSerial) ? 'ring-2 ring-[#E6185C]' : 'border border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-start p-3">
                  {/* Card selection checkbox */}
                  <div className="mr-3 mt-1">
                    <input
                      type="checkbox"
                      checked={selectedCards.has(card.slabSerial)}
                      onChange={e => handleSelectCard(e, card.slabSerial)}
                      className="size-4 cursor-pointer rounded border-gray-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-600"
                      aria-label={`Select ${card.card}`}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>

                  {/* Card image (better size) */}
                  <div
                    className="relative mr-3 h-20 w-16 shrink-0 cursor-pointer overflow-hidden rounded"
                    onClick={() => onCardClick(card)}
                  >
                    {cardImages[card.slabSerial] ? (
                      <img
                        src={cardImages[card.slabSerial]}
                        alt={`${card.player} - ${card.card}`}
                        className="size-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gray-100 dark:bg-[#1B2131]">
                        <span className="material-icons text-lg text-gray-400 dark:text-gray-600">
                          image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card details */}
                  <div
                    className="min-w-0 grow cursor-pointer"
                    onClick={() => onCardClick(card)}
                  >
                    <h3 className="mb-1 truncate text-base font-semibold text-gray-900 dark:text-white">
                      {card.card}
                    </h3>
                    <p className="mb-2 truncate text-sm text-gray-500 dark:text-gray-400">
                      {card.player || 'Unknown Player'}
                    </p>

                    {/* Card metadata - Compact */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Paid:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatUserCurrency(
                            parseFloat(
                              card.originalInvestmentAmount ||
                                card.investmentAUD ||
                                0
                            ),
                            card.originalInvestmentCurrency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Value:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatUserCurrency(
                            parseFloat(
                              card.originalCurrentValueAmount ||
                                card.currentValueAUD ||
                                0
                            ),
                            card.originalCurrentValueCurrency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Profit:
                        </span>
                        <span
                          className={`font-medium ${parseFloat(card.originalCurrentValueAmount || card.currentValueAUD || 0) - parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0) >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                        >
                          {formatUserCurrency(
                            parseFloat(
                              card.originalCurrentValueAmount ||
                                card.currentValueAUD ||
                                0
                            ) -
                              parseFloat(
                                card.originalInvestmentAmount ||
                                  card.investmentAUD ||
                                  0
                              ),
                            card.originalCurrentValueCurrency
                          )}
                        </span>
                      </div>
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
              className="mt-2 flex items-center justify-center py-4"
            >
              {isLoadingMore ? (
                <div className="flex items-center space-x-2">
                  <div className="size-5 animate-spin rounded-full border-y-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Loading more cards...
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Scroll to load more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Cards Actions - Modern FAB Style */}
      {selectedCards.size > 0 && (
        <>
          {/* Bottom shadow overlay for better contrast - subtle transparency */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-1/3 bg-gradient-to-t from-white/80 via-white/50 to-transparent dark:from-black/80 dark:via-black/50 dark:to-transparent"></div>

          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            {/* Selection Count Badge */}
            <div className="mb-3 flex justify-center">
              <div className="rounded-full border border-[#E5E7EB] bg-[#ffffff] px-4 py-2 shadow-lg backdrop-blur-sm dark:border-[#374151] dark:bg-[#000000]">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''}{' '}
                  selected
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-3">
              {/* Main Action Buttons Row */}
              <div className="flex max-w-[95vw] items-center gap-2 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-[#ffffff] p-2 shadow-xl backdrop-blur-sm dark:border-[#374151] dark:bg-[#000000] sm:gap-3 sm:p-3">
                {/* Sell Button */}
                <button
                  onClick={() => {
                    // Check subscription access first
                    if (!hasFeature('SOLD_ITEMS')) {
                      toast.error(
                        'Sold items tracking is available with Premium. Upgrade to track your sales!'
                      );
                      return;
                    }
                    setSelectedCardsForSale(
                      cards.filter(card => selectedCards.has(card.slabSerial))
                    );
                    setShowSaleModal(true);
                  }}
                  className={`group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-all duration-200 sm:size-16 ${
                    hasFeature('SOLD_ITEMS')
                      ? 'bg-[#22c55e] text-white hover:scale-105 hover:bg-[#16a34a] hover:shadow-lg active:scale-95'
                      : 'cursor-not-allowed bg-gray-400 text-gray-200 opacity-75'
                  }`}
                  title={
                    hasFeature('SOLD_ITEMS')
                      ? 'Sell selected cards'
                      : 'Sell selected cards (Premium feature)'
                  }
                >
                  <span
                    className={`material-icons mb-0 text-sm transition-transform duration-200 sm:mb-0.5 sm:text-lg ${
                      hasFeature('SOLD_ITEMS') ? 'group-hover:scale-110' : ''
                    }`}
                  >
                    {hasFeature('SOLD_ITEMS') ? 'sell' : 'lock'}
                  </span>
                  <span className="hidden text-xs font-medium sm:block">
                    Sell
                  </span>
                </button>

                {/* Purchase Invoice Button */}
                <button
                  onClick={() => {
                    // Check subscription access first
                    if (!hasFeature('INVOICING')) {
                      toast.error(
                        'Purchase invoices are available with Premium. Upgrade to create and manage invoices!'
                      );
                      return;
                    }
                    setSelectedCardsForPurchase(
                      cards.filter(card => selectedCards.has(card.slabSerial))
                    );
                    setShowPurchaseInvoiceModal(true);
                  }}
                  className={`group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-all duration-200 sm:size-16 ${
                    hasFeature('INVOICING')
                      ? 'bg-[#3b82f6] text-white hover:scale-105 hover:bg-[#2563eb] hover:shadow-lg active:scale-95'
                      : 'cursor-not-allowed bg-gray-400 text-gray-200 opacity-75'
                  }`}
                  title={
                    hasFeature('INVOICING')
                      ? 'Create purchase invoice'
                      : 'Create purchase invoice (Premium feature)'
                  }
                >
                  <span
                    className={`material-icons mb-0 text-sm transition-transform duration-200 sm:mb-0.5 sm:text-lg ${
                      hasFeature('INVOICING') ? 'group-hover:scale-110' : ''
                    }`}
                  >
                    {hasFeature('INVOICING') ? 'receipt' : 'lock'}
                  </span>
                  <span className="hidden text-xs font-medium sm:block">
                    Invoice
                  </span>
                </button>

                {/* List on Marketplace Button */}
                <button
                  onClick={() => {
                    // Check subscription access first
                    if (!hasFeature('MARKETPLACE_SELLING')) {
                      toast.error(
                        'Marketplace selling is available with Premium. Upgrade to list your cards for sale!'
                      );
                      return;
                    }

                    // Use the existing bulk listing logic
                    (async () => {
                      try {
                        // LoggingService.info("Starting bulk listing flow");

                        if (!user || !user.uid) {
                          toast.error('You must be logged in to list cards');
                          return;
                        }

                        const selectedCardObjects = cards.filter(card =>
                          selectedCards.has(card.slabSerial)
                        );

                        if (selectedCardObjects.length === 0) {
                          toast.error('No cards selected for listing');
                          return;
                        }

                        const loadingToast = toast.loading(
                          'Checking marketplace status...'
                        );

                        try {
                          const marketplaceRef = collection(
                            firestoreDb,
                            'marketplaceItems'
                          );
                          const checkPromises = selectedCardObjects.map(
                            async card => {
                              if (!card.slabSerial)
                                return { ...card, isActuallyListed: false };

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
                                logger.error(
                                  `Error checking listing status for ${card.slabSerial}:`,
                                  error
                                );
                                return { ...card, isActuallyListed: false };
                              }
                            }
                          );

                          const checkedCards = await Promise.all(checkPromises);
                          toast.dismiss(loadingToast);

                          const cardsToList = checkedCards.filter(
                            card => !card.isActuallyListed
                          );

                          const cardsNeedingUpdate = checkedCards.filter(
                            card =>
                              Boolean(card.isListed) !==
                              Boolean(card.isActuallyListed)
                          );

                          if (cardsNeedingUpdate.length > 0) {
                            // LoggingService.info(`Found ${cardsNeedingUpdate.length} cards with out-of-sync isListed flags`);

                            const updatePromises = cardsNeedingUpdate.map(
                              card => {
                                if (!card.slabSerial) return Promise.resolve();

                                const cardRef = doc(
                                  firestoreDb,
                                  `users/${user.uid}/cards/${card.slabSerial}`
                                );
                                return updateDoc(cardRef, {
                                  isListed: card.isActuallyListed,
                                })
                                  .then(() => {
                                    // LoggingService.info(`Updated isListed flag for ${card.card || card.slabSerial} to ${card.isActuallyListed}`);
                                  })
                                  .catch(error => {
                                    logger.error(
                                      `Error updating isListed flag for ${card.slabSerial}:`,
                                      error
                                    );
                                  });
                              }
                            );

                            await Promise.all(updatePromises);
                          }

                          if (cardsToList.length === 0) {
                            toast.error(
                              'All selected cards are already listed on the marketplace'
                            );
                            return;
                          }

                          setSelectedCardsForListing(cardsToList);
                          setShowListCardModal(true);
                        } catch (error) {
                          toast.dismiss(loadingToast);
                          toast.error('Error checking marketplace status');
                          logger.error('Error in bulk listing flow:', error);
                        }
                      } catch (error) {
                        toast.error('Error starting bulk listing process');
                        logger.error('Error in bulk listing flow:', error);
                      }
                    })();
                  }}
                  className={`group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-all duration-200 sm:size-16 ${
                    hasFeature('MARKETPLACE_SELLING')
                      ? 'bg-[#a855f7] text-white hover:scale-105 hover:bg-[#9333ea] hover:shadow-lg active:scale-95'
                      : 'cursor-not-allowed bg-gray-400 text-gray-200 opacity-75'
                  }`}
                  title={
                    hasFeature('MARKETPLACE_SELLING')
                      ? 'List on marketplace'
                      : 'List on marketplace (Premium feature)'
                  }
                >
                  <span
                    className={`material-icons mb-0 text-sm transition-transform duration-200 sm:mb-0.5 sm:text-lg ${
                      hasFeature('MARKETPLACE_SELLING')
                        ? 'group-hover:scale-110'
                        : ''
                    }`}
                  >
                    {hasFeature('MARKETPLACE_SELLING') ? 'storefront' : 'lock'}
                  </span>
                  <span className="hidden text-xs font-medium sm:block">
                    {hasFeature('MARKETPLACE_SELLING') ? 'List' : 'List'}
                  </span>
                </button>

                {/* Move Button */}
                <button
                  onClick={handleMoveCards}
                  className="group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f97316] text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#ea580c] hover:shadow-lg active:scale-95 sm:size-16"
                  title="Move to collection"
                >
                  <span className="material-icons mb-0 text-sm transition-transform duration-200 group-hover:scale-110 sm:mb-0.5 sm:text-lg">
                    drive_file_move
                  </span>
                  <span className="hidden text-xs font-medium sm:block">
                    Move
                  </span>
                </button>

                {/* Delete Button */}
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-md transition-all duration-200 sm:size-16 ${
                    isDeleting
                      ? 'cursor-not-allowed bg-red-400'
                      : 'bg-[#ef4444] hover:scale-105 hover:bg-[#dc2626] hover:shadow-lg active:scale-95'
                  }`}
                  title={isDeleting ? "Deleting cards..." : "Delete selected cards"}
                >
                  {isDeleting ? (
                    <div className="animate-spin">
                      <span className="material-icons mb-0 text-sm sm:mb-0.5 sm:text-lg">
                        hourglass_empty
                      </span>
                    </div>
                  ) : (
                    <span className="material-icons mb-0 text-sm transition-transform duration-200 group-hover:scale-110 sm:mb-0.5 sm:text-lg">
                      delete
                    </span>
                  )}
                  <span className="hidden text-xs font-medium sm:block">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </span>
                </button>

                {/* Divider */}
                <div className="mx-1 h-12 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Select All Button */}
                <button
                  onClick={handleSelectAll}
                  className="group flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#6B7280] text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#4B5563] hover:shadow-lg active:scale-95 dark:bg-[#4B5563] dark:hover:bg-[#374151] sm:size-16"
                  title={
                    selectedCards.size === cards.length
                      ? 'Deselect all'
                      : 'Select all'
                  }
                >
                  <span className="material-icons mb-0 text-sm transition-transform duration-200 group-hover:scale-110 sm:mb-0.5 sm:text-lg">
                    {selectedCards.size === cards.length
                      ? 'deselect'
                      : 'select_all'}
                  </span>
                  <span className="hidden text-xs font-medium sm:block">
                    {selectedCards.size === cards.length ? 'Deselect' : 'All'}
                  </span>
                </button>

                {/* Clear Selection Button - smaller, next to All button */}
                <button
                  onClick={clearSelection}
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#ffffff] text-[#111827] shadow-md transition-all duration-200 hover:scale-105 hover:bg-[#F3F4F6] hover:shadow-lg active:scale-95 dark:border-[#374151] dark:bg-[#000000] dark:text-[#F9FAFB] dark:hover:bg-[#111827] sm:size-16"
                  title="Clear selection"
                >
                  <span className="material-icons text-lg">
                    clear
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Card Details Modal */}
      {showCardDetails && selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null); // Clear hook state first
            setShowCardDetails(false); // Then clear local state
          }}
          onUpdate={handleCardUpdate} // Uses the local update handler
          onDelete={handleCardDelete} // CHANGED: Use local handleCardDelete instead of onDeleteCard
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
          if (!isDeleting) {
            setShowDeleteModal(false);
            setCardsToDelete([]);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Cards"
        message={`Are you sure you want to delete ${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
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
          return (
            collection !== 'All Cards' &&
            collection !== selectedCollection &&
            lowerCase !== 'sold' &&
            !lowerCase.includes('sold')
          );
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
        onSave={() => {
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
