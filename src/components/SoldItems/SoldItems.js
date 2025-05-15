import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useTheme, SoldItemsView } from '../../design-system'; 
import { formatCurrency } from '../../utils/currencyAPI';
import { formatCondensed } from '../../utils/formatters';
import db from '../../services/db';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '../InvoicePDF';
import { StatisticsSummary } from '../../design-system';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../design-system';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb, storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import logger from '../../utils/logger';

const SoldItems = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
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
  const [isLoading, setIsLoading] = useState(true);

  // Load card images from local IndexedDB and Firebase Storage
  useEffect(() => {
    // Disable image loading completely to prevent CORS errors
    return;
    
    /* Original image loading code commented out
    const loadCardImages = async () => {
      // Clear previous object URLs to prevent memory leaks
      Object.values(cardImages).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      
      const images = {};
      
      // Only log the start of the process
      if (soldCards.length > 0) {
        console.log(`Loading images for ${soldCards.length} sold cards`);
      }
      
      for (const card of soldCards) {
        const cardId = card.slabSerial || card.id;
        if (!cardId) continue;
        
        try {
          // First check if the card already has direct image URLs
          if (card.imageUrl) {
            images[cardId] = card.imageUrl;
            continue;
          }
          
          if (card.cloudImageUrl) {
            images[cardId] = card.cloudImageUrl;
            continue;
          }
          
          // Try to get image from local database
          const imageBlob = await db.getImage(cardId);
          if (imageBlob) {
            const imageUrl = URL.createObjectURL(imageBlob);
            images[cardId] = imageUrl;
            continue;
          }
          
          // If not in local database and user is logged in, try Firebase Storage
          if (user) {
            try {
              // Try with card ID
              const storageRef = ref(storage, `users/${user.uid}/card-images/${cardId}`);
              const imageUrl = await getDownloadURL(storageRef);
              images[cardId] = imageUrl;
            } catch (storageError) {
              // Try alternative paths if the main one fails
              try {
                // Some cards might be stored with different paths
                const altStorageRef = ref(storage, `users/${user.uid}/images/${cardId}`);
                const altImageUrl = await getDownloadURL(altStorageRef);
                images[cardId] = altImageUrl;
              } catch (altError) {
                // Silently fail - no need to log every missing image
              }
            }
          }
        } catch (error) {
          // Silently fail - no need to log every error
        }
      }
      
      // Only log the final result
      if (soldCards.length > 0) {
        const loadedCount = Object.keys(images).length;
        console.log(`Loaded ${loadedCount} images out of ${soldCards.length} cards`);
      }
      
      setCardImages(images);
    };

    if (soldCards.length > 0) {
      loadCardImages();
    }
    */
    
    // Cleanup function
    return () => {
      // Revoke all blob URLs when component unmounts
      Object.values(cardImages).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [soldCards, user]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await db.getProfile();
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

  // Load sold cards from IndexedDB and Firestore
  useEffect(() => {
    const loadSoldCards = async () => {
      setIsLoading(true);
      try {
        // Get local sold cards from IndexedDB
        const localSoldCards = await db.getSoldCards() || [];
        
        // Create a map of existing cards by ID to avoid duplicates
        const existingCardsMap = new Map();
        localSoldCards.forEach(card => {
          const cardId = card.id || card.slabSerial;
          if (cardId) {
            existingCardsMap.set(cardId, card);
          }
        });
        
        // If user is logged in, fetch sold items from Firestore as well
        if (user) {
          try {
            logger.log('Fetching sold items from Firestore');
            const soldItemsRef = collection(firestoreDb, `users/${user.uid}/sold-items`);
            const soldItemsSnapshot = await getDocs(soldItemsRef);
            
            // Process Firestore sold items
            soldItemsSnapshot.forEach(doc => {
              const soldItem = doc.data();
              const cardId = soldItem.id || soldItem.slabSerial;
              
              // Only add if not already in the local database or if the cloud version is newer
              if (cardId && (!existingCardsMap.has(cardId) || 
                  (soldItem.updatedAt && 
                   (!existingCardsMap.get(cardId).updatedAt || 
                    soldItem.updatedAt > existingCardsMap.get(cardId).updatedAt)))) {
                existingCardsMap.set(cardId, soldItem);
              }
            });
            
            logger.log(`Found ${soldItemsSnapshot.size} sold items in Firestore`);
          } catch (firestoreError) {
            console.error('Error fetching sold items from Firestore:', firestoreError);
          }
        }
        
        // Convert map back to array
        const mergedSoldCards = Array.from(existingCardsMap.values());
        
        // Update state with merged data
        setSoldCards(mergedSoldCards);
        
        // Also update local database with the merged data to keep it in sync
        if (mergedSoldCards.length > localSoldCards.length) {
          await db.saveSoldCards(mergedSoldCards);
        }
      } catch (error) {
        console.error('Error loading sold cards:', error);
        setSoldCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSoldCards();
    
    // Add a window event listener to catch when import is complete
    const handleImportComplete = () => {
      loadSoldCards();
    };
    
    // Add listener for sold items updates (from import or marking as sold)
    const handleSoldItemsUpdated = () => {
      loadSoldCards();
    };
    
    window.addEventListener('import-complete', handleImportComplete);
    window.addEventListener('sold-items-updated', handleSoldItemsUpdated);
    
    // Clean up the event listeners
    return () => {
      window.removeEventListener('import-complete', handleImportComplete);
      window.removeEventListener('sold-items-updated', handleSoldItemsUpdated);
    };
  }, [user]);

  // Group cards by invoice ID instead of buyer+date
  const groupCardsByInvoice = (cards) => {
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
          totalProfit: 0
        };
      }
      
      invoicesMap[key].cards.push(card);
      invoicesMap[key].totalInvestment += parseFloat(card.investmentAUD) || 0;
      invoicesMap[key].totalSale += parseFloat(card.finalValueAUD) || 0;
      invoicesMap[key].totalProfit += parseFloat(card.finalProfitAUD) || 0;
    });
    
    return invoicesMap;
  };

  // Process grouped invoices
  const groupedInvoices = useMemo(() => {
    if (!soldCards || !Array.isArray(soldCards) || soldCards.length === 0) {
      return [];
    }

    const invoices = groupCardsByInvoice(soldCards);
    return Array.isArray(invoices) ? invoices : Object.values(invoices);
  }, [soldCards]);

  const filteredCards = soldCards.filter(card => 
    card.card?.toLowerCase().includes(filter.toLowerCase()) ||
    card.set?.toLowerCase().includes(filter.toLowerCase()) ||
    card.buyer?.toLowerCase().includes(filter.toLowerCase())
  );

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

  const totals = sortedInvoices.reduce((acc, invoice) => ({
    totalInvestment: acc.totalInvestment + invoice.totalInvestment,
    totalValue: acc.totalValue + invoice.totalSale,
    totalProfit: acc.totalProfit + invoice.totalProfit
  }), { totalInvestment: 0, totalValue: 0, totalProfit: 0 });

  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get financial year from date
  const getFinancialYear = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Group and sort invoices by financial year
  const groupedInvoicesByYear = useMemo(() => {
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

  const debugIndexedDB = () => {
    // Debug function to check what's in IndexedDB
    try {
      const dbRequest = window.indexedDB.open("pokemonCardTracker", 1);
      
      dbRequest.onerror = (event) => {
        console.error("Database error:", event.target.error);
        alert("Error accessing database: " + event.target.error);
      };
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        
        // Check if the collections store exists before trying to use it
        if (db.objectStoreNames.contains("collections")) {
          const transaction = db.transaction(["collections"], "readonly");
          const store = transaction.objectStore("collections");
          const request = store.getAll();
          
          request.onsuccess = function() {
            const soldCollection = request.result.find(item => item.name === 'sold');
            
            if (soldCollection && Array.isArray(soldCollection.data)) {
              alert(`Found ${soldCollection.data.length} sold items in database. Check browser console for details.`);
            } else {
              alert("No sold items found in database. Check browser console for details.");
            }
          };
          
          request.onerror = function(event) {
            console.error("Error getting collections:", event.target.error);
            alert("Error accessing database collections: " + event.target.error);
          };
        } else {
          alert("The 'collections' object store does not exist. Database may be corrupted.");
        }
      };
      
      dbRequest.onerror = (event) => {
        console.error("Error opening database:", event.target.error);
        alert("Error opening database: " + event.target.error);
      };
    } catch (error) {
      console.error("Debug error:", error);
      alert("Error debugging database: " + error.message);
    }
  };

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
            
            db.createObjectStore("subscription", { keyPath: "userId" });
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
              alert("Database has been reset with a test sold item. Refresh the page to continue.");
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
            date={formatDate(invoice.dateSold)}
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

  const displayData = useMemo(() => {
    return sortedInvoices && sortedInvoices.length > 0 ? sortedInvoices : [];
  }, [sortedInvoices]);

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
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
        return;
      }

      // Filter out the cards from the invoice to be deleted
      const updatedSoldCards = soldCards.filter(card => {
        // For cards with invoiceId property
        if (card.invoiceId) {
          return card.invoiceId !== invoiceId;
        }
        // For legacy cards using the key format
        const legacyKey = `${card.buyer}_${card.dateSold}_${card.id || card.slabSerial}`;
        return legacyKey !== invoiceId;
      });

      // Save the updated sold cards list
      await db.saveSoldCards(updatedSoldCards);
      
      // Update local state
      setSoldCards(updatedSoldCards);
      
      // Remove from expanded invoices if it was expanded
      if (expandedInvoices.has(invoiceId)) {
        const newExpandedInvoices = new Set(expandedInvoices);
        newExpandedInvoices.delete(invoiceId);
        setExpandedInvoices(newExpandedInvoices);
      }
      
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete receipt');
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

  if (isLoading) {
    return (
      <div className="text-center py-8 sm:py-12">
        <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
        <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Loading sold items...</h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6">Please wait while we load your sold items.</p>
      </div>
    );
  }

  return (
    <div className="pt-16 sm:pt-20 w-full px-1 sm:px-2">
      {displayData && displayData.length > 0 ? (
        <div className="space-y-6">
          <StatisticsSummary
            statistics={[
              {
                label: 'Paid',
                value: totals.totalInvestment,
                formattedValue: formatCondensed(totals.totalInvestment)
              },
              {
                label: 'Value',
                value: totals.totalValue,
                formattedValue: formatCondensed(totals.totalValue)
              },
              {
                label: 'Profit',
                value: totals.totalProfit,
                formattedValue: formatCondensed(totals.totalProfit),
                isProfit: true
              },
              {
                label: 'Cards',
                value: soldCards.length,
                icon: 'style'
              }
            ]}
            className="mb-3 sm:mb-4"
          />
          
          <SoldItemsView
            items={displayData}
            getCardImageUrl={getCardImageUrl}
            onPrintInvoice={handlePrintInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            formatDate={formatDate}
            className="mt-4"
          />
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No sold cards found</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6">When you sell cards from your collection, they will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default SoldItems; 