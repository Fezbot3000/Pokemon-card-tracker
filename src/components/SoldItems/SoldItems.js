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

const SoldItems = () => {
  const { isDarkMode } = useTheme();
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

  // Load card images
  useEffect(() => {
    const loadCardImages = async () => {
      // Clear previous object URLs to prevent memory leaks
      Object.values(cardImages).forEach(url => {
        URL.revokeObjectURL(url);
      });
      
      const images = {};
      for (const card of soldCards) {
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
  }, [soldCards]);

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

  // Load sold cards from IndexedDB
  useEffect(() => {
    const loadSoldCards = async () => {
      try {
        const soldCardsData = await db.getSoldCards();
        console.log('Loaded sold cards data:', soldCardsData);
        setSoldCards(soldCardsData || []);
        
        // Log if we found any sold cards but don't add test data
        if (!soldCardsData || soldCardsData.length === 0) {
          console.log('No sold cards found in database.');
        } else {
          console.log(`Found ${soldCardsData.length} sold cards in the database`);
        }
      } catch (error) {
        console.error('Error loading sold cards:', error);
        setSoldCards([]);
      }
    };

    loadSoldCards();
    
    // Add a window event listener to catch when import is complete
    const handleImportComplete = () => {
      console.log("Detected import completion event - refreshing sold items");
      loadSoldCards();
    };
    
    // Add listener for sold items updates (from import or marking as sold)
    const handleSoldItemsUpdated = () => {
      console.log("Detected sold-items-updated event - refreshing");
      loadSoldCards();
    };
    
    window.addEventListener('import-complete', handleImportComplete);
    window.addEventListener('sold-items-updated', handleSoldItemsUpdated);
    
    // Clean up the event listeners
    return () => {
      window.removeEventListener('import-complete', handleImportComplete);
      window.removeEventListener('sold-items-updated', handleSoldItemsUpdated);
    };
  }, []);

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
    console.log("Processing sold cards for display:", soldCards);
    // Early return for empty data
    if (!soldCards || !Array.isArray(soldCards) || soldCards.length === 0) {
      console.log("No sold cards to process");
      return [];
    }

    const invoices = groupCardsByInvoice(soldCards);
    console.log("Grouped invoices:", invoices);
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
      console.log("--- DEBUGGING SOLD ITEMS ---");
      
      // Safely check the database structure first
      const dbRequest = window.indexedDB.open("pokemonCardTracker", 1);
      
      dbRequest.onerror = (event) => {
        console.error("Database error:", event.target.error);
      };
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        console.log("Database opened successfully");
        console.log("Object store names:", Array.from(db.objectStoreNames));
        
        // Check if the collections store exists before trying to use it
        if (db.objectStoreNames.contains("collections")) {
          const transaction = db.transaction(["collections"], "readonly");
          const store = transaction.objectStore("collections");
          const request = store.getAll();
          
          request.onsuccess = function() {
            console.log("All collections in IndexedDB:", request.result);
            
            // Find the 'sold' collection specifically
            const soldCollection = request.result.find(item => item.name === 'sold');
            console.log("Sold collection in IndexedDB:", soldCollection);
            
            if (soldCollection && Array.isArray(soldCollection.data)) {
              console.log(`Found ${soldCollection.data.length} sold items`);
              alert(`Found ${soldCollection.data.length} sold items in database. Check browser console for details.`);
            } else {
              console.log("No sold items found or invalid format");
              alert("No sold items found in database. Check browser console for details.");
            }
          };
          
          request.onerror = function(event) {
            console.error("Error getting collections:", event.target.error);
            alert("Error accessing database collections. Check browser console for details.");
          };
        } else {
          console.log("The 'collections' object store does not exist yet");
          alert("The 'collections' object store does not exist yet. Check browser console for details.");
        }
      };
      
      // Also check what comes from our db service
      db.getSoldCards().then(soldCardsData => {
        console.log("Result from db.getSoldCards():", soldCardsData);
      }).catch(e => {
        console.error("Error from db.getSoldCards():", e);
      });
      
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
          console.log("Database deleted successfully");
          
          // Create new database with correct structure
          const request = indexedDB.open("pokemonCardTracker", 1);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log("Creating new database structure");
            
            // Create collections store
            console.log("Creating collections store");
            db.createObjectStore("collections", { keyPath: ["userId", "name"] });
            
            // Create other stores
            console.log("Creating images store");
            db.createObjectStore("images", { keyPath: ["userId", "id"] });
            
            console.log("Creating profile store");
            db.createObjectStore("profile", { keyPath: ["userId", "id"] });
            
            console.log("Creating subscription store");
            db.createObjectStore("subscription", { keyPath: "userId" });
          };
          
          request.onsuccess = () => {
            console.log("Database created successfully");
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
              console.log("Test sold item created successfully");
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
        console.log("Processing direct backup import for sold items:", file.name);
        
        // Read the file
        const reader = new FileReader();
        const fileContent = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
        
        // Parse JSON
        const jsonData = JSON.parse(fileContent);
        console.log("Parsed backup file, looking for sold items");
        
        // Look for sold cards in different possible locations
        let soldItems = [];
        
        // Check for soldCards array at top level
        if (jsonData.soldCards && Array.isArray(jsonData.soldCards)) {
          console.log(`Found ${jsonData.soldCards.length} sold cards in top-level soldCards array`);
          soldItems.push(...jsonData.soldCards);
        }
        
        // Check for sold items in collections
        if (jsonData.collections && typeof jsonData.collections === 'object') {
          Object.entries(jsonData.collections).forEach(([collectionName, cards]) => {
            if (collectionName.toLowerCase() === 'sold' && Array.isArray(cards)) {
              console.log(`Found ${cards.length} sold items in 'sold' collection`);
              soldItems.push(...cards);
            }
          });
        }
        
        if (soldItems.length > 0) {
          console.log(`Found ${soldItems.length} total sold items to import`);
          
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
          console.log(`Found ${existingSoldCards.length} existing sold items`);
          
          // Create a Set of existing IDs to avoid duplicates
          const existingIds = new Set(existingSoldCards.map(card => card.slabSerial || card.id));
          
          // Filter out duplicates
          const newSoldItems = processedSoldItems.filter(
            item => !existingIds.has(item.slabSerial || item.id)
          );
          
          console.log(`Adding ${newSoldItems.length} new sold items (filtered out ${processedSoldItems.length - newSoldItems.length} duplicates)`);
          
          // Merge with existing sold cards
          const mergedSoldCards = [...existingSoldCards, ...newSoldItems];
          
          // Save to database
          await db.saveSoldCards(mergedSoldCards);
          console.log(`Successfully saved ${mergedSoldCards.length} sold items to IndexedDB`);
          
          alert(`Successfully imported ${newSoldItems.length} sold items. Refreshing page...`);
          window.location.reload();
        } else {
          console.log("No sold items found in backup file");
          alert("No sold items found in the backup file. Make sure it contains a soldCards array or a 'sold' collection.");
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
      console.log("Force refresh sold items:", soldCardsData);
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
        console.log("Database opened successfully for direct access");
        
        // Check if the collections store exists
        if (db.objectStoreNames.contains("collections")) {
          const transaction = db.transaction(["collections"], "readonly");
          const store = transaction.objectStore("collections");
          const request = store.get(["anonymous", "sold"]);
          
          request.onsuccess = function() {
            const soldCollection = request.result;
            console.log("DIRECT DB ACCESS - Retrieved sold items:", soldCollection);
            
            if (soldCollection && Array.isArray(soldCollection.data)) {
              console.log(`DIRECT DB ACCESS - Found ${soldCollection.data.length} sold items`);
              // Set the sold items directly
              setSoldCards(soldCollection.data);
              alert(`Found ${soldCollection.data.length} sold items using direct DB access. Check browser console for details.`);
            } else {
              console.log("DIRECT DB ACCESS - No sold items found or invalid format");
              alert("No sold items found using direct DB access. Check browser console for details.");
            }
          };
          
          request.onerror = function(event) {
            console.error("DIRECT DB ACCESS - Error getting sold items:", event.target.error);
            alert("Error accessing sold items in database: " + event.target.error);
          };
        } else {
          console.log("DIRECT DB ACCESS - The 'collections' object store does not exist");
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
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get card image URL function for SoldItemsView
  const getCardImageUrl = (card) => {
    return cardImages[card.slabSerial] || null;
  };

  // Handle printing an invoice
  const handlePrintInvoice = (invoice) => {
    console.log("Print invoice requested:", invoice);
    
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

  useEffect(() => {
    console.log("Final display data:", displayData);
  }, [displayData]);

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

  return (
    <div className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            getCardImageUrl={(card) => cardImages[card.slabSerial || card.id] || null}
            onPrintInvoice={handlePrintInvoice}
            formatDate={formatDate}
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