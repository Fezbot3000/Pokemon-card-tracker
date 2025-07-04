import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTheme, SoldItemsView, Icon, StatisticsSummary, SimpleSearchBar, ConfirmDialog } from '../../design-system'; 
import { formatCondensed } from '../../utils/formatters';
import db from '../../services/firestore/dbAdapter';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import InvoicePDF from '../InvoicePDF';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../design-system';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb, storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import logger from '../../utils/logger';
import { useUserPreferences, availableCurrencies } from '../../contexts/UserPreferencesContext';
import { calculateSoldCardStatistics } from '../../utils/cardStatistics';
import { useSubscription } from '../../hooks/useSubscription';
import FeatureGate from '../FeatureGate';

const SoldItems = () => {
  // Check subscription access FIRST, before any hooks
  const { hasFeature } = useSubscription();
  
  // If user doesn't have sold items access, show feature gate
  if (!hasFeature('SOLD_ITEMS')) {
    return (
      <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4">
        <FeatureGate 
          feature="SOLD_ITEMS"
          customMessage="Track your sold items, generate invoices, and analyze your profit trends. This feature is available with Premium."
        />
      </div>
    );
  }

  // All other hooks AFTER the conditional return
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { preferredCurrency, convertToUserCurrency } = useUserPreferences();
  
  const [soldCards, setSoldCards] = useState([]);
  const [sortField, setSortField] = useState('dateSold');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [cardImages, setCardImages] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [invoicesMap, setInvoicesMap] = useState({});
  const [profile, setProfile] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  const [expandedBuyers, setExpandedBuyers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, invoiceId: null, buyer: null });

  // Initialize all invoices as expanded by default when soldCards change
  useEffect(() => {
    if (soldCards && Array.isArray(soldCards) && soldCards.length > 0) {
      // Group cards by buyer to get all buyer IDs
      const buyerIds = Object.keys(soldCards.reduce((groups, card) => {
        const key = card.buyer || 'Unknown';
        groups[key] = true;
        return groups;
      }, {}));
      
      // Set all buyers as collapsed by default (empty set)
      setExpandedBuyers(new Set());
    }
  }, [soldCards]);

  // Load card images from local IndexedDB and Firebase Storage
  useEffect(() => {
    // Disable image loading completely to prevent CORS errors
    return;
    
    // Cleanup function
    return () => {
      // Revoke all blob URLs when component unmounts
      Object.values(cardImages).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [soldCards, user, cardImages]);

  // Load profile when user changes
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Try Firestore first if online
        if (user && user.uid && navigator.onLine) {
          const profileRef = doc(firestoreDb, 'users', user.uid);
          const profileDoc = await getDoc(profileRef);
          
          if (profileDoc.exists()) {
            const firestoreProfile = profileDoc.data();
            setProfile(firestoreProfile);
            
            // Save to IndexedDB in the background
            db.saveProfile(firestoreProfile).catch(console.error);
            return;
          }
        }
        
        // Fall back to IndexedDB
        const userProfile = await db.getProfile();
        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  // Load sold cards data
  useEffect(() => {
    const loadSoldCards = async () => {
      try {
        setIsLoading(true);
        
        if (!user || !user.uid) {
          setSoldCards([]);
          setIsLoading(false);
          return;
        }
        
        // Load sold cards from local database
        const soldCardsResult = await db.getSoldCards(user.uid) || { data: [] };
        const localSoldCards = soldCardsResult.data || [];
        
        // Also try loading from "sold" collection as a fallback
        let soldFromCollection = [];
        try {
          const soldCollectionCards = await db.getCards('sold') || [];
          soldFromCollection = Array.isArray(soldCollectionCards) ? soldCollectionCards : [];
        } catch (error) {
          console.log('No sold collection found:', error.message);
        }
        

        
        // Use sold items if available, otherwise fall back to sold collection
        const finalSoldCards = localSoldCards.length > 0 ? localSoldCards : soldFromCollection;
        setSoldCards(finalSoldCards);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading sold cards:', error);
        toast.error('Failed to load sold items');
        setIsLoading(false);
      }
    };

    loadSoldCards();
  }, [user]);

  // Helper function to determine financial year from date
  // Defined inside component to avoid temporal dead zone issues
  const getFinancialYear = (dateStr) => {
    if (!dateStr) return 'Unknown';
    
    let date;
    // Handle Firestore Timestamp objects
    if (dateStr && typeof dateStr === 'object' && 'seconds' in dateStr) {
      date = new Date(dateStr.seconds * 1000);
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    // In Australia, financial year runs from July 1 to June 30
    // So for dates from Jan-Jun, use previous year
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based, so 0 = January, 6 = July
    
    if (month < 6) { // Jan-Jun
      return `${year-1}/${year}`;
    } else { // Jul-Dec
      return `${year}/${year+1}`;
    }
  };
  
  // Local formatCurrency function as a fallback
  const formatUserCurrency = (amount, currencyCode) => {
    if (amount === undefined || amount === null) return '0.00';
    
    // Get the currency symbol
    const currency = availableCurrencies.find(c => c.code === currencyCode) || { symbol: '$' };
    
    // Check if the amount is negative
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    
    // Format with proper thousand separators and 2 decimal places
    const formattedAmount = absoluteAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Return with proper negative sign placement
    return isNegative ? `-${currency.symbol}${formattedAmount}` : `${currency.symbol}${formattedAmount}`;
  };



  // Handle downloading a sold invoice as PDF
  const handleDownloadInvoice = async (buyer, invoice) => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-download' });
      
      // Safely format the date for filename and display
      let dateString = 'unknown-date';
      let displayDate = 'Unknown Date';
      
      if (invoice.date) {
        if (typeof invoice.date === 'string') {
          dateString = invoice.date.replace(/\//g, '-');
          displayDate = invoice.date;
        } else if (invoice.date instanceof Date) {
          dateString = invoice.date.toISOString().split('T')[0];
          displayDate = invoice.date.toLocaleDateString();
        } else if (invoice.date && typeof invoice.date === 'object' && invoice.date.seconds) {
          // Handle Firestore Timestamp
          const firestoreDate = new Date(invoice.date.seconds * 1000);
          dateString = firestoreDate.toISOString().split('T')[0];
          displayDate = firestoreDate.toLocaleDateString();
        } else {
          dateString = String(invoice.date).replace(/\//g, '-');
          displayDate = String(invoice.date);
        }
      }
      
      // Create a unique filename for the invoice
      const fileName = `sold-invoice-${buyer.replace(/\s+/g, '-')}-${dateString}.pdf`;
      
      // Create the PDF document
      const pdfDocument = (
        <InvoicePDF 
          buyer={buyer}
          date={displayDate}
          cards={invoice.cards || []}
          invoiceId={`SOLD-${Date.now()}`}
          profile={profile}
        />
      );
      
      // Generate the PDF blob
      const pdfBlob = await pdf(pdfDocument).toBlob();
      
      // Create a download link and trigger it
      const fileURL = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(fileURL);
        document.body.removeChild(link);
      }, 100);
      
      toast.success('Invoice downloaded successfully', { id: 'pdf-download' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF', { id: 'pdf-download' });
    }
  };

  // Group cards by invoice ID with proper currency handling
  const groupCardsByInvoice = (cards) => {
    // Use the already destructured convertToUserCurrency from the component scope
    const invoicesMap = {};

    cards.forEach(card => {
      // Use invoiceId if available, otherwise fall back to legacy grouping
      const key = card.invoiceId || `${card.buyer}_${card.dateSold}_${card.id || card.slabSerial}`;

      if (!invoicesMap[key]) {
        invoicesMap[key] = {
          id: card.invoiceId || key,
          buyer: card.buyer,
          dateSold: card.dateSold,
          cards: [],
          totalInvestment: 0,
          totalSale: 0,
          totalProfit: 0 // Initialize profit
        };
      }

      const cardId = card.id || card.slabSerial;
      
      // Get sale price with proper fallbacks
      const individualSalePrice = card.soldPrices && card.soldPrices[cardId]
        ? parseFloat(card.soldPrices[cardId])
        : 0;
      let effectiveSalePrice = individualSalePrice > 0 ? individualSalePrice : (parseFloat(card.soldPrice) || 0);
      
      // Handle sold price currency if different from preferred currency
      const soldPriceCurrency = card.soldPriceCurrency || 'AUD';
      if (soldPriceCurrency !== preferredCurrency.code) {
        effectiveSalePrice = convertToUserCurrency(effectiveSalePrice, soldPriceCurrency);
      }
      
      // Get investment amount with proper currency handling
      const originalInvestment = parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0;
      const originalInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';
      
      // Convert to preferred currency if needed
      let investmentInPreferredCurrency = originalInvestment;
      if (originalInvestmentCurrency !== preferredCurrency.code) {
        investmentInPreferredCurrency = convertToUserCurrency(originalInvestment, originalInvestmentCurrency);
      }
      
      // Store the complete card data
      invoicesMap[key].cards.push({
        ...card,
        effectiveSalePrice,
        originalInvestment,
        originalInvestmentCurrency,
        investmentInPreferredCurrency
      });
      
      // Update totals with converted values
      invoicesMap[key].totalInvestment += investmentInPreferredCurrency;
      invoicesMap[key].totalSale += effectiveSalePrice;
    });

    // Calculate profit after all cards are processed
    Object.keys(invoicesMap).forEach(invoiceKey => {
      invoicesMap[invoiceKey].totalProfit = invoicesMap[invoiceKey].totalSale - invoicesMap[invoiceKey].totalInvestment;
    });

    return invoicesMap;
  };
  
  // Process grouped invoices
  const groupedInvoices = useMemo(() => {
    if (!soldCards || !Array.isArray(soldCards) || soldCards.length === 0) {
      return [];
    }

    const invoices = groupCardsByInvoice(soldCards);
    return Object.values(invoices);
  }, [soldCards, preferredCurrency]);

  const filteredCards = useMemo(() => {
    if (!soldCards || !Array.isArray(soldCards)) {
      return [];
    }
    return soldCards.filter(card => 
      card.card?.toLowerCase().includes(filter.toLowerCase()) ||
      card.set?.toLowerCase().includes(filter.toLowerCase()) ||
      card.buyer?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [soldCards, filter]);

  const sortedInvoices = useMemo(() => {
    const invoicesArray = Array.isArray(groupedInvoices) ? [...groupedInvoices] : Object.values(groupedInvoices);
    return invoicesArray.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // Special case for dates
      if (sortField === 'dateSold') {
        const dateA = new Date(aValue || 0);
        const dateB = new Date(bValue || 0);
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Default comparison for strings and numbers
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [groupedInvoices, sortField, sortDirection]);

  // Prepare data for display, organized by financial year
  const displayData = useMemo(() => {
    // Safety check for soldCards
    if (!soldCards || !Array.isArray(soldCards)) {
      return [];
    }
    
    // If we have no invoices but have cards, create a simple display structure
    if ((!sortedInvoices || sortedInvoices.length === 0) && soldCards.length > 0) {
      // Create a simple structure with all cards in one group
      const currentYear = new Date().getFullYear();
      const financialYear = `${currentYear-1}/${currentYear}`;
      
      // Create a simple invoice structure
      const simpleInvoice = {
        id: 'all-cards',
        buyer: 'Various',
        dateSold: new Date().toISOString(),
        cards: soldCards,
        totalInvestment: soldCards.reduce((sum, card) => sum + (parseFloat(card.investmentAUD) || 0), 0),
        totalSale: soldCards.reduce((sum, card) => sum + (parseFloat(card.soldPrice) || 0), 0),
      };
      
      // Calculate profit
      simpleInvoice.totalProfit = simpleInvoice.totalSale - simpleInvoice.totalInvestment;
      
      return [{
        year: financialYear,
        invoices: [simpleInvoice]
      }];
    }
    
    // Normal case - we have sorted invoices
    if (!sortedInvoices || sortedInvoices.length === 0) {
      return [];
    }

    // Group invoices by financial year
    const invoicesByYear = {};
    
    sortedInvoices.forEach(invoice => {
      const year = getFinancialYear(invoice.dateSold);
      
      if (!invoicesByYear[year]) {
        invoicesByYear[year] = [];
      }
      invoicesByYear[year].push(invoice);
    });

    // Convert to array format expected by SoldItemsView
    return Object.entries(invoicesByYear).map(([year, invoices]) => ({
      year,
      invoices
    }));
  }, [sortedInvoices, soldCards]);

  // Calculate invoice totals for display
  const invoiceTotals = useMemo(() => {
    // Safety check for soldCards
    if (!soldCards || !Array.isArray(soldCards)) {
      return {};
    }
    
    // Group cards by buyer
    const buyerGroups = {};
    
    soldCards.forEach(card => {
      const buyerKey = card.buyer || 'Unknown';
      
      if (!buyerGroups[buyerKey]) {
        buyerGroups[buyerKey] = {
          cards: [],
          totalInvestment: 0,
          totalSale: 0,
          totalProfit: 0,
          date: card.dateSold || card.soldDate || new Date().toISOString()
        };
      }
      
      // Get values with proper currency conversion
      const investment = convertToUserCurrency(
        parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0),
        card.originalInvestmentCurrency || 'AUD'
      );
      
      const soldPrice = convertToUserCurrency(
        parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0),
        card.originalCurrentValueCurrency || 'AUD'
      );
      
      // Add to buyer group
      buyerGroups[buyerKey].cards.push(card);
      buyerGroups[buyerKey].totalInvestment += investment;
      buyerGroups[buyerKey].totalSale += soldPrice;
      buyerGroups[buyerKey].totalProfit += (soldPrice - investment);
      
      // Update date to the most recent sale date
      if (card.dateSold || card.soldDate) {
        const cardDate = new Date(card.dateSold || card.soldDate);
        const groupDate = new Date(buyerGroups[buyerKey].date);
        if (cardDate > groupDate) {
          buyerGroups[buyerKey].date = card.dateSold || card.soldDate;
        }
      }
    });
    
    return buyerGroups;
  }, [soldCards, convertToUserCurrency]);
  
  // Calculate statistics from sold cards using utility function
  const statistics = useMemo(() => {
    // Ensure soldCards is a valid array before passing to utility function
    const validSoldCards = soldCards && Array.isArray(soldCards) ? soldCards : [];
    const validInvoiceTotals = invoiceTotals || {};
    
    const stats = calculateSoldCardStatistics(validSoldCards, validInvoiceTotals, convertToUserCurrency);
    // Fix invoice count to show actual number of unique buyers
    return {
      ...stats,
      invoiceCount: Object.keys(validInvoiceTotals).length
    };
  }, [soldCards, invoiceTotals, convertToUserCurrency]);

  // Format statistics for StatisticsSummary component
  const formattedStatistics = useMemo(() => {
    return [
      {
        label: 'INVESTMENT TOTAL',
        value: statistics.totalInvestment,
        isMonetary: true,
        originalCurrencyCode: preferredCurrency.code
      },
      {
        label: 'SOLD FOR',
        value: statistics.totalSoldFor,
        isMonetary: true,
        originalCurrencyCode: preferredCurrency.code
      },
      {
        label: 'PROFIT',
        value: statistics.totalProfit,
        isMonetary: true,
        isProfit: true,
        originalCurrencyCode: preferredCurrency.code
      },
      {
        label: 'SOLD INVOICES',
        value: statistics.invoiceCount,
        isMonetary: false
      }
    ];
  }, [statistics, preferredCurrency.code]);

  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Group and sort invoices by financial year
  const groupedInvoicesByYear = useMemo(() => {
    // Safety check for soldCards
    if (!soldCards || !Array.isArray(soldCards)) {
      return [];
    }
    
    const groups = {};
    const invoicesObj = groupCardsByInvoice(
      soldCards.filter(card =>
        card.card?.toLowerCase().includes(filter.toLowerCase()) ||
        card.set?.toLowerCase().includes(filter.toLowerCase()) ||
        card.buyer?.toLowerCase().includes(filter.toLowerCase())
      )
    );
    
    // Ensure we have an array of invoices
    const invoices = Array.isArray(invoicesObj) ? invoicesObj : Object.values(invoicesObj);
    
    // Sort by date before grouping
    invoices.sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));
    
    invoices.forEach(invoice => {
      const financialYear = getFinancialYear(invoice.dateSold);
      
      if (!groups[financialYear]) {
        groups[financialYear] = {
          year: financialYear,
          invoices: [],
          totalInvestment: 0,
          totalSale: 0,
          totalProfit: 0
        };
      }
      
      groups[financialYear].invoices.push(invoice);
      groups[financialYear].totalInvestment += invoice.totalInvestment;
      groups[financialYear].totalSale += invoice.totalSale;
      groups[financialYear].totalProfit += invoice.totalProfit;
    });
    
    // Convert the groups object to an array and sort by year (newest first)
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
  }, [soldCards, filter]);

  const toggleYear = (year) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleInvoice = (invoiceId) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  // Calculate overall totals
  const totalsGrouped = useMemo(() => {
    return Object.values(groupedInvoicesByYear).reduce((acc, yearGroup) => ({
      totalInvestment: acc.totalInvestment + yearGroup.totalInvestment,
      totalValue: acc.totalValue + yearGroup.totalSale,
      totalProfit: acc.totalProfit + yearGroup.totalProfit
    }), { totalInvestment: 0, totalValue: 0, totalProfit: 0 });
  }, [groupedInvoicesByYear]);



  const fixDatabaseStructure = () => {
    if (window.confirm("This will delete and recreate the database to fix structure issues. Continue?")) {
      try {
        // Close any open connections
        if (db.db) {
          db.db.close();
          db.db = null;
        }
        
        // Delete the database
        const deleteRequest = indexedDB.deleteDatabase("pokemonCardTracker");
        
        deleteRequest.onsuccess = () => {
          // Create new database with correct structure
          const request = indexedDB.open("pokemonCardTracker", 1);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create collections store
            db.createObjectStore("collections", { keyPath: ["userId", "name"] });
            
            // Create other stores
            db.createObjectStore("images", { keyPath: ["userId", "id"] });
            
            db.createObjectStore("profile", { keyPath: ["userId", "id"] });
          };
          
          request.onsuccess = () => {
            // Now create and insert a test sold item
            const dbInstance = request.result;
            const transaction = dbInstance.transaction(["collections"], "readwrite");
            const store = transaction.objectStore("collections");
            
            // Test sold items array
            const testSoldItems = [
              {
                id: "test-card-1",
                slabSerial: "test-card-1",
                card: "Test Card 1",
                buyer: "Test Buyer",
                dateSold: new Date().toISOString(),
                finalValueAUD: 100,
                finalProfitAUD: 50,
                investmentAUD: 50
              }
            ];
            
            // Insert test sold items
            const request = store.put({
              userId: "anonymous",
              name: "sold",
              data: testSoldItems
            });
            
            request.onsuccess = () => {
              alert("Database has been reset with a test sold item. Refreshing page...");
              window.location.reload();
            };
            
            request.onerror = (event) => {
              console.error("Error creating test sold item:", event.target.error);
              alert("Error creating test sold item: " + event.target.error);
            };
          };
          
          request.onerror = (event) => {
            console.error("Error creating database:", event.target.error);
            alert("Error creating database: " + event.target.error);
          };
        };
        
        deleteRequest.onerror = (event) => {
          console.error("Error deleting database:", event.target.error);
          alert("Error deleting database: " + event.target.error);
        };
      } catch (error) {
        console.error("Error resetting database:", error);
        alert("Error resetting database: " + error.message);
      }
    }
  };

  const importSoldItemsFromBackup = () => {
    // Create an input element to select the backup file
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,.zip';
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        // Read the file
        const reader = new FileReader();
        const fileContent = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
        
        // Parse JSON
        const jsonData = JSON.parse(fileContent);
        
        // Look for sold cards in different possible locations
        let soldItems = [];
        
        // Check for soldCards array at top level
        if (jsonData.soldCards && Array.isArray(jsonData.soldCards)) {
          soldItems.push(...jsonData.soldCards);
        }
        
        // Check for sold items in collections
        if (jsonData.collections && typeof jsonData.collections === 'object') {
          Object.entries(jsonData.collections).forEach(([collectionName, cards]) => {
            if (collectionName.toLowerCase() === 'sold' && Array.isArray(cards)) {
              soldItems.push(...cards);
            }
          });
        }
        
        if (soldItems.length > 0) {
          // Process the sold items
          const processedSoldItems = soldItems.map(item => ({
            ...item,
            soldDate: item.soldDate || item.dateSold || new Date().toISOString(),
            buyer: item.buyer || "Import",
            finalValueAUD: parseFloat(item.finalValueAUD) || parseFloat(item.currentValueAUD) || 0,
            finalProfitAUD: parseFloat(item.finalProfitAUD) || 
              (parseFloat(item.finalValueAUD || item.currentValueAUD || 0) - parseFloat(item.investmentAUD || 0))
          }));
          
          // Get existing sold cards
          const existingSoldCards = await db.getSoldCards();
          
          // Create a Set of existing IDs to avoid duplicates
          const existingIds = new Set(existingSoldCards.map(card => card.slabSerial || card.id));
          
          // Filter out duplicates
          const newSoldItems = processedSoldItems.filter(
            item => !existingIds.has(item.slabSerial || item.id)
          );
          
          // Merge with existing sold cards
          const mergedSoldCards = [...existingSoldCards, ...newSoldItems];
          
          // Save to database
          await db.saveSoldCards(mergedSoldCards);
          alert(`Successfully imported ${newSoldItems.length} sold items. Refreshing page...`);
          window.location.reload();
        } else {
          alert("No sold items found in backup file");
        }
      } catch (error) {
        console.error("Error importing sold items:", error);
        alert("Error importing sold items: " + error.message);
      }
    };
    
    // Trigger file selection
    fileInput.click();
  };

  const forceRefreshSoldItems = () => {
    db.getSoldCards().then(soldCardsData => {
      setSoldCards(soldCardsData || []);
    }).catch(e => {
      console.error("Error force refreshing sold items:", e);
    });
  };

  const forceRefreshFromRawDB = async () => {
    try {
      // Direct database access to get the sold items
      const dbRequest = window.indexedDB.open("pokemonCardTracker", 1);
      
      dbRequest.onerror = (event) => {
        console.error("Database error:", event.target.error);
        alert("Error accessing database: " + event.target.error);
      };
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        
        // Check if the collections store exists
        if (db.objectStoreNames.contains("collections")) {
          const transaction = db.transaction(["collections"], "readonly");
          const store = transaction.objectStore("collections");
          const request = store.get(["anonymous", "sold"]);
          
          request.onsuccess = function() {
            const soldCollection = request.result;
            
            if (soldCollection && Array.isArray(soldCollection.data)) {
              setSoldCards(soldCollection.data);
              alert(`Found ${soldCollection.data.length} sold items using direct DB access. Check browser console for details.`);
            } else {
              alert("No sold items found using direct DB access. Check browser console for details.");
            }
          };
          
          request.onerror = function(event) {
            console.error("Error getting sold items:", event.target.error);
            alert("Error accessing sold items in database: " + event.target.error);
          };
        } else {
          alert("The 'collections' object store does not exist. Database may be corrupted.");
        }
      };
    } catch (error) {
      console.error("Error in direct DB access:", error);
      alert("Error in direct DB access: " + error.message);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    let date;
    // Check if this is a Firestore Timestamp object
    if (dateStr && typeof dateStr === 'object' && 'seconds' in dateStr && 'nanoseconds' in dateStr) {
      // Convert Firestore Timestamp to JavaScript Date
      date = new Date(dateStr.seconds * 1000);
    } else {
      // Regular date string
      date = new Date(dateStr);
    }
    
    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateStr);
      return 'Invalid date';
    }
    
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateSafely = (dateStr) => {
    try {
      return formatDate(dateStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Get card image URL function for SoldItemsView
  const getCardImageUrl = (card) => {
    try {
      // Always return null to prevent images from loading on the sold page
      return null;
    } catch (error) {
      console.error('Error getting card image:', error);
      return null;
    }
  };

  // Handle printing an invoice
  const handlePrintInvoice = (invoice) => {
    // Create a unique filename for the invoice
    const fileName = `invoice-${invoice.id || invoice.buyer.replace(/\s+/g, '_')}-${new Date(invoice.dateSold).toISOString().split('T')[0]}.pdf`;
    
    // Create a fake anchor element to trigger the download
    const link = document.createElement('a');
    link.href = `#/invoice/${invoice.id}`; // This doesn't actually matter for our purpose
    link.download = fileName;
    link.className = 'pdf-download-link';
    
    // Add the PDFDownloadLink to a hidden div
    const container = document.createElement('div');
    container.style.display = 'none';
    container.className = 'pdf-container';
    document.body.appendChild(container);
    
    // Render the PDF link element which will automatically trigger download
    const pdfLinkElement = (
      <PDFDownloadLink
        document={
          <InvoicePDF 
            buyer={invoice.buyer} 
            date={formatDateSafely(invoice.dateSold)}
            cards={invoice.cards} 
            invoiceId={invoice.id}
            profile={profile}
          />
        }
        fileName={fileName}
      >
        {({ blob, url, loading, error }) => {
          if (loading) {
            return 'Loading document...';
          }
          
          if (error) {
            console.error('Error generating PDF:', error);
            toast.error('Error generating PDF');
            return 'Error';
          }
          
          // When PDF is ready, trigger download programmatically
          if (blob) {
            const fileURL = URL.createObjectURL(blob);
            link.href = fileURL;
            link.click();
            
            // Clean up
            setTimeout(() => {
              URL.revokeObjectURL(fileURL);
              if (container.parentNode) {
                document.body.removeChild(container);
              }
            }, 100);
            
            toast.success('Invoice downloaded successfully');
          }
          
          return null;
        }}
      </PDFDownloadLink>
    );
    
    // Render and cleanup
    ReactDOM.render(pdfLinkElement, container);
  };

  // displayData is now defined above with financial year grouping

  // Reset sold items database (remove test data)
  const resetSoldItems = async () => {
    try {
      await db.saveSoldCards([]);  // Save empty array to clear all sold items
      setSoldCards([]);  // Clear the local state
      toast.success('Sold items database reset successfully');
      
      // Reload any imported data
      const soldCardsData = await db.getSoldCards();
      setSoldCards(soldCardsData || []);
      
    } catch (error) {
      console.error('Error resetting sold items:', error);
      toast.error('Error resetting sold items database');
    }
  };

  // Delete a specific invoice/receipt
  const showDeleteConfirmation = (invoiceId, buyer = null) => {
    setDeleteConfirmation({ isOpen: true, invoiceId, buyer });
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {

      // 1. Identify card IDs to delete associated with the invoiceId
      const cardIdsToDelete = soldCards
        .filter(card => {
          if (card.invoiceId) {
            return card.invoiceId === invoiceId;
          }
          // For legacy cards using the key format
          const legacyKey = `${card.buyer}_${card.dateSold}_${card.id || card.slabSerial}`;
          return legacyKey === invoiceId;
        })
        .map(card => card.id || card.cardId) // Get the actual card ID
        .filter(id => id); // Ensure we only have valid IDs

      if (cardIdsToDelete.length === 0) {
        logger.info(`[SoldItems] No cards found for invoice ${invoiceId} to delete. It might be an empty invoice or cards already removed.`);
        // If the invoice is just a grouping and has no separate existence, 
        // removing its cards effectively removes it. If it needs explicit deletion, 
        // that would be a separate step (e.g., db.deleteInvoiceRecord(invoiceId)).
        // For now, assuming removing cards is sufficient.
        toast.info('No cards associated with this receipt were found to delete.');
        // Potentially, still remove from expandedInvoices if it was an empty, expanded invoice
        if (expandedInvoices.has(invoiceId)) {
          const newExpandedInvoices = new Set(expandedInvoices);
          newExpandedInvoices.delete(invoiceId);
          setExpandedInvoices(newExpandedInvoices);
        }
        return;
      }

      logger.debug(`[SoldItems] Attempting to delete ${cardIdsToDelete.length} cards for invoice ${invoiceId}:`, cardIdsToDelete);

      // 2. Call the new DB method to delete from IndexedDB and trigger shadow deletion
      const deleteResult = await db.deleteSoldItemsByIds(cardIdsToDelete);

      if (deleteResult.success) {
        // 3. Update local React state for immediate UI feedback
        setSoldCards(prevSoldCards =>
          prevSoldCards.filter(card => {
            const cardIdentifier = card.id || card.cardId;
            return !cardIdsToDelete.includes(cardIdentifier);
          })
        );

        if (expandedInvoices.has(invoiceId)) {
          const newExpandedInvoices = new Set(expandedInvoices);
          newExpandedInvoices.delete(invoiceId);
          setExpandedInvoices(newExpandedInvoices);
        }
        toast.success('Receipt and associated cards deleted successfully.');
        logger.info(`[SoldItems] Successfully deleted receipt ${invoiceId} and ${cardIdsToDelete.length} cards locally.`);
      } else {
        logger.error(`[SoldItems] Failed to delete receipt ${invoiceId} from DB: ${deleteResult.message}`, deleteResult.error);
        toast.error(`Failed to delete receipt: ${deleteResult.message || 'Please try again.'}`);
      }
    } catch (error) {
      logger.error(`[SoldItems] Error in handleDeleteInvoice for invoice ${invoiceId}:`, error);
      toast.error('An unexpected error occurred while deleting the receipt.');
    }
  };

  // Add a test sold item for debugging
  const addTestSoldItem = async () => {
    try {
      const newTestItem = await db.addTestSoldItem();
      toast.success('Test sold item added successfully');
      
      // Refresh sold items
      const soldCardsData = await db.getSoldCards();
      setSoldCards(soldCardsData || []);
    } catch (error) {
      console.error('Error adding test sold item:', error);
      toast.error('Error adding test sold item');
    }
  };

  const filteredInvoices = useMemo(() => {
    let invoices = Object.entries(invoiceTotals);
    
    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      invoices = invoices.filter(([buyer, invoice]) => {
        return buyer.toLowerCase().includes(query) ||
               formatDateSafely(invoice.date).toLowerCase().includes(query) ||
               formatUserCurrency(invoice.totalProfit, preferredCurrency.code).toLowerCase().includes(query);
      });
    }
    
    // Sort by date sold (newest first)
    invoices.sort(([, invoiceA], [, invoiceB]) => {
      const dateA = new Date(invoiceA.date);
      const dateB = new Date(invoiceB.date);
      
      // Handle invalid dates by putting them at the end
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      // Sort in descending order (newest first)
      return dateB.getTime() - dateA.getTime();
    });
    
    return invoices;
  }, [invoiceTotals, searchQuery, preferredCurrency.code]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4">
        {/* Statistics Summary Skeleton - only show skeleton, no data */}
        <div className="mb-6">
          <div className="bg-white dark:bg-black rounded-xl p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'INVESTMENT TOTAL', width: 'w-20' },
                { label: 'SOLD FOR', width: 'w-16' },
                { label: 'PROFIT', width: 'w-12' },
                { label: 'SOLD INVOICES', width: 'w-4' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                    {stat.label}
                  </div>
                  <div className={`h-8 ${stat.width} bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Keep search functional, skeleton the data */}
        <div className="bg-white dark:bg-black rounded-xl">
          <div className="overflow-x-auto">
            {/* Keep search section functional */}
            <div className="flex flex-col gap-4 mb-4 p-4 sm:p-6">
              <div className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search sold items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 rounded-lg 
                            border border-gray-200 dark:border-gray-700/50 
                            bg-white dark:bg-black text-gray-900 dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                            placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    search
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Loading sold items...
                </div>
              </div>
            </div>
            
            {/* Desktop Table Skeleton - exact table structure */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Investment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sold For
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      # of Cards
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(7)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse max-w-[150px]"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-3">
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4">
      {/* Statistics Summary */}
      {soldCards && Array.isArray(soldCards) && soldCards.length > 0 && (
        <div className="mb-6">
          <StatisticsSummary statistics={formattedStatistics} />
        </div>
      )}
      
      <div className="bg-white dark:bg-black rounded-xl">
        {soldCards && Array.isArray(soldCards) && soldCards.length > 0 ? (
          <div className="overflow-x-auto">
            {/* Search Section */}
            <SimpleSearchBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search by name, set, or serial number..."
              className="mb-4"
            />
            
            {/* Results Count */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-4">
              {filteredInvoices.length} of {Object.keys(invoiceTotals).length} {Object.keys(invoiceTotals).length === 1 ? 'sale' : 'sales'} found
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Buyer
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Investment
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Sold For
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Profit
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      # of Cards
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map(([buyer, invoice]) => (
                    <React.Fragment key={buyer}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[150px] truncate" title={buyer}>
                            {buyer}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDateSafely(invoice.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {formatUserCurrency(invoice.totalInvestment, preferredCurrency.code)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {formatUserCurrency(invoice.totalSale, preferredCurrency.code)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${invoice.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatUserCurrency(invoice.totalProfit, preferredCurrency.code)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {invoice.cards.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex">
                          <button 
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-3 p-2"
                            onClick={() => handleDownloadInvoice(buyer, invoice)}
                            title="Download PDF"
                          >
                            <span className="material-icons text-xl">download</span>
                          </button>
                          <button 
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-3 p-2"
                            onClick={() => setExpandedBuyers(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(buyer)) {
                                newSet.delete(buyer);
                              } else {
                                newSet.add(buyer);
                              }
                              return newSet;
                            })}
                            title="View Details"
                          >
                            <span className="material-icons text-xl">{expandedBuyers.has(buyer) ? 'visibility_off' : 'visibility'}</span>
                          </button>
                          <button 
                            className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                            onClick={() => showDeleteConfirmation(buyer, buyer)}
                            title="Delete Sale"
                          >
                            <span className="material-icons text-xl">delete</span>
                          </button>
                        </td>
                      </tr>
                      {/* Expandable Card Details Row */}
                      {expandedBuyers.has(buyer) && (
                        <tr>
                          <td colSpan="7" className="px-0 py-0">
                            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                              <div className="p-6">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Card Details</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {invoice.cards.map((card, index) => (
                                    <div key={card.id || card.slabSerial || index} className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 dark:text-white truncate">
                                            {card.name || card.card || card.cardName || 'Unnamed Card'}
                                          </h5>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {card.set || card.setName || 'Unknown Set'}
                                          </p>
                                          {card.grade && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                              Grade: {card.grade}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right ml-4">
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Investment: {formatUserCurrency(convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD'), preferredCurrency.code)}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Sold for: {formatUserCurrency(convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD'), preferredCurrency.code)}
                                          </p>
                                          <p className={`text-sm font-medium ${(convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD')) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatUserCurrency((convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD')), preferredCurrency.code)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredInvoices.map(([buyer, invoice]) => (
                <div key={buyer} className="bg-white/5 dark:bg-white/5 rounded-xl border border-gray-200/20 dark:border-gray-700/30 overflow-hidden">
                  {/* Header with Buyer and Date */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Sold to: {buyer}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDateSafely(invoice.date)}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">
                        {invoice.cards.length} cards
                      </span>
                    </div>

                    {/* Main Content: Investment and Profit */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Investment</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatUserCurrency(invoice.totalInvestment, preferredCurrency.code)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profit</p>
                        <p className={`text-lg font-semibold ${invoice.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatUserCurrency(invoice.totalProfit, preferredCurrency.code)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200/20 dark:border-gray-700/30">
                      <button 
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        onClick={() => handleDownloadInvoice(buyer, invoice)}
                        title="Download PDF"
                      >
                        <span className="material-icons text-lg">download</span>
                      </button>
                      <button 
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        onClick={() => setExpandedBuyers(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(buyer)) {
                            newSet.delete(buyer);
                          } else {
                            newSet.add(buyer);
                          }
                          return newSet;
                        })}
                        title="View Details"
                      >
                        <span className="material-icons text-lg">{expandedBuyers.has(buyer) ? 'visibility_off' : 'visibility'}</span>
                      </button>
                      <button 
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        onClick={() => showDeleteConfirmation(buyer, buyer)}
                        title="Delete Sale"
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Card Details (inline with each invoice) */}
                  {expandedBuyers.has(buyer) && (
                    <div className="border-t border-gray-200/20 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-800 p-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Card Details</h4>
                      <div className="space-y-3">
                        {invoice.cards.map((card, index) => (
                          <div key={card.id || card.slabSerial || index} className="bg-white dark:bg-black rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 dark:text-white truncate">
                                  {card.name || card.card || card.cardName || 'Unnamed Card'}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {card.set || card.setName || 'Unknown Set'}
                                </p>
                                {card.grade && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Grade: {card.grade}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Investment: {formatUserCurrency(convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD'), preferredCurrency.code)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Sold for: {formatUserCurrency(convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD'), preferredCurrency.code)}
                                </p>
                                <p className={`text-sm font-medium ${(convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD')) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatUserCurrency((convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD')), preferredCurrency.code)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Expandable Card Details (shown when expanded) */}
            {/* Removed */}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
            <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No sold cards found</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6">When you sell cards from your collection, they will appear here.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, invoiceId: null, buyer: null })}
        onConfirm={() => {
          handleDeleteInvoice(deleteConfirmation.invoiceId);
          setDeleteConfirmation({ isOpen: false, invoiceId: null, buyer: null });
        }}
        title="Delete Sale Receipt"
        message={`Are you sure you want to delete this sale receipt${deleteConfirmation.buyer ? ` for ${deleteConfirmation.buyer}` : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SoldItems;
