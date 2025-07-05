import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, StatisticsSummary, SimpleSearchBar, ConfirmDialog } from '../../design-system';
import { formatCurrency } from '../../design-system/utils/formatters';
import db from '../../services/firestore/dbAdapter';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from './CreateInvoiceModal';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import PurchaseInvoicePDF from '../PurchaseInvoicePDF';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db as firestoreDb, functions, httpsCallable } from '../../services/firebase';
import featureFlags from '../../utils/featureFlags';
import logger from '../../utils/logger';
import { useSubscription } from '../../hooks/useSubscription';
import FeatureGate from '../FeatureGate';

/**
 * PurchaseInvoices component
 * 
 * Displays and manages purchase invoices for Pokemon cards
 */
const PurchaseInvoices = () => {
  // Check subscription access FIRST, before any hooks
  const { hasFeature } = useSubscription();
  
  // If user doesn't have invoicing access, show feature gate
  if (!hasFeature('INVOICING')) {
    return (
      <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4">
        <FeatureGate 
          feature="INVOICING"
          customMessage="Create and manage purchase invoices for your card transactions. Track your investments and generate professional invoices. This feature is available with Premium."
        />
      </div>
    );
  }

  // All other hooks AFTER the conditional return
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, invoice: null });
  const { currentUser } = useAuth();

  // Define functions that will be used in useEffect
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load directly from Firestore if online
      if (currentUser && navigator.onLine && featureFlags.enableFirestoreSync) {
        try {
          // Create a reference to the user's purchase invoices collection
          const invoicesRef = collection(firestoreDb, 'users', currentUser.uid, 'purchaseInvoices');
          const q = query(invoicesRef);
          
          // Get all purchase invoices for the current user
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const firestoreInvoices = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return { ...data, id: doc.id };
            });
            
            // Set invoices from Firestore immediately
            setInvoices(firestoreInvoices);
            
            // Update local database in the background (don't await)
            Promise.resolve().then(async () => {
              for (const invoice of firestoreInvoices) {
                const cleanedInvoice = {};
                Object.entries(invoice).forEach(([key, value]) => {
                  if (value !== undefined) {
                    cleanedInvoice[key] = value;
                  }
                });
                await db.savePurchaseInvoice(cleanedInvoice);
              }
            });
            
            return; // Exit early if we loaded from Firestore
          }
        } catch (firestoreError) {
          console.error('Error loading invoices from Firestore:', firestoreError);
        }
      }
      
      // Fall back to local database only if Firestore failed
      const purchaseInvoices = await db.getPurchaseInvoices(currentUser?.uid) || [];
      setInvoices(purchaseInvoices);
    } catch (error) {
      console.error('Error loading purchase invoices:', error);
      toast.error('Failed to load purchase invoices');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadProfile = useCallback(async () => {
    try {
      // Try Firestore first if online
      if (currentUser && currentUser.uid && navigator.onLine) {
        const profileRef = doc(firestoreDb, 'users', currentUser.uid);
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
  }, [currentUser]);

  // Load purchase invoices with improved cloud synchronization
  useEffect(() => {
    if (currentUser) {
      loadInvoices();
      loadProfile();
    }
  }, [currentUser, loadInvoices, loadProfile]);

  // Filter invoices based on search query
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) {
      return invoices;
    }
    
    const query = searchQuery.toLowerCase();
    return invoices.filter(invoice => {
      return (
        // Search in invoice number
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(query)) ||
        // Search in seller
        (invoice.seller && invoice.seller.toLowerCase().includes(query)) ||
        // Search in date
        (invoice.date && invoice.date.toLowerCase().includes(query)) ||
        // Search in notes
        (invoice.notes && invoice.notes.toLowerCase().includes(query)) ||
        // Search in card names (if available)
        (invoice.cards && Array.isArray(invoice.cards) && invoice.cards.some(card => 
          (card.name && card.name.toLowerCase().includes(query)) ||
          (card.set && card.set.toLowerCase().includes(query))
        ))
      );
    });
  }, [invoices, searchQuery]);

  // Handle editing an invoice
  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowCreateModal(true);
  };

  // Handle delete confirmation
  const showDeleteConfirmation = (invoice) => {
    setDeleteConfirmation({ isOpen: true, invoice });
  };

  const handleDeleteInvoice = async (invoice) => {
    try {
      await db.deletePurchaseInvoice(invoice.id);
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  // Handle server-side batch PDF generation
  const handleServerBatchGeneration = async () => {
    if (invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }
    
    try {
      // Show loading toast
      toast.loading('Generating PDF invoices on the server...', { id: 'server-batch' });
      setIsGeneratingBatch(true);
      
      // Get all invoice IDs from filtered invoices
      const invoiceIds = filteredInvoices.map(invoice => invoice.id);
      
      // Call the Cloud Function
      const generateBatchFn = httpsCallable(functions, 'generateInvoiceBatch');
      const result = await generateBatchFn({ invoiceIds });
      
      if (result.data && result.data.success) {
        // Success - provide download link for ZIP file
        toast.success(`Successfully generated ${result.data.invoiceCount} invoice PDFs!`, { id: 'server-batch' });
        
        // Create a temporary link to download the ZIP file
        const downloadLink = document.createElement('a');
        downloadLink.href = result.data.url;
        downloadLink.download = result.data.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Show success message
        setTimeout(() => {
          toast.success('Your invoice PDFs have been downloaded as a ZIP file', { duration: 6000 });
        }, 1000);
      } else {
        toast.error('Failed to generate invoice PDFs', { id: 'server-batch' });
      }
    } catch (error) {
      console.error('Error in server batch PDF generation:', error);
      toast.error(`Error: ${error.message || 'Unknown error'}`, { id: 'server-batch' });
    } finally {
      setIsGeneratingBatch(false);
    }
  };
  
  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default direction based on field type
      setSortField(field);
      // Default to descending for dates and numbers, ascending for text
      if (field === 'totalAmount') {
        setSortDirection('desc');
      } else if (field === 'date') {
        setSortDirection('desc');
      } else if (field === 'timestamp') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };
  
  // Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  // Format date to "17th Feb 25" format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    // Get day with ordinal suffix
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);
    
    // Get month abbreviation
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    
    // Get 2-digit year
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}${ordinalSuffix} ${month} ${year}`;
  };
  


  // Get sorted invoices
  const getSortedInvoices = () => {
    return [...filteredInvoices].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases
      if (sortField === 'totalAmount') {
        aValue = parseFloat(a.totalAmount || 0);
        bValue = parseFloat(b.totalAmount || 0);
      } else if (sortField === 'date') {
        aValue = new Date(a.date || 0).getTime();
        bValue = new Date(b.date || 0).getTime();
      } else if (sortField === 'timestamp') {
        aValue = a.timestamp || 0;
        bValue = b.timestamp || 0;
      }
      
      // Compare based on direction
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };
  
  // Calculate statistics for the summary
  const getInvoiceStatistics = () => {
    // Skip calculation if no invoices
    if (!invoices || invoices.length === 0) {
      return [];
    }

    // Calculate total spent
    const totalSpent = invoices.reduce((sum, invoice) => {
      return sum + parseFloat(invoice.totalAmount || 0);
    }, 0);

    // Calculate total cards
    const totalCards = invoices.reduce((sum, invoice) => {
      return sum + (invoice.cardCount || 0);
    }, 0);

    // Calculate average cost per card
    const avgCostPerCard = totalCards > 0 ? totalSpent / totalCards : 0;

    // Count unique sellers
    const uniqueSellers = new Set(invoices.map(invoice => invoice.seller)).size;

    return [
      {
        label: 'Total Spent',
        value: totalSpent, // Pass raw value
        isMonetary: true,
        originalCurrencyCode: 'AUD'
      },
      {
        label: 'Cards Purchased',
        value: totalCards,
        formattedValue: totalCards.toString(), // Ensure it's a string with no abbreviations
        icon: 'style'
      },
      {
        label: 'Avg Cost/Card',
        value: avgCostPerCard, // Pass raw value
        isMonetary: true,
        originalCurrencyCode: 'AUD'
      },
      {
        label: 'Sellers',
        value: uniqueSellers,
        formattedValue: uniqueSellers.toString(), // Ensure it's a string with no abbreviations
        icon: 'person'
      }
    ];
  };

  // Handle downloading an invoice as PDF
  const handleDownloadInvoice = async (invoice, options = {}) => {
    // Debug profile data if needed
    logger.debug('Profile when downloading invoice:', profile);
    
    // Create a unique filename for the invoice
    const fileName = `purchase-invoice-${invoice.invoiceNumber || invoice.id}-${invoice.date.replace(/\//g, '-')}.pdf`;
    
    try {
      // Show loading toast if not part of a batch download
      if (!options.silent) {
        toast.loading('Generating PDF...', { id: options.toastId || 'pdf-download' });
      }
      
      // Get detailed card information for the invoice
      const cardDetails = await getCardDetails(invoice);
      
      // Debug: Log the card details to see what data we have
      // console.log('Invoice data for PDF generation:', invoice);
      // console.log('Card details for PDF:', cardDetails);
      // console.log('First card details:', cardDetails[0]);
      
      // Create the PDF document
      const pdfDocument = (
        <PurchaseInvoicePDF 
          seller={invoice.seller} 
          date={formatDateForDisplay(invoice.date)}
          cards={cardDetails} 
          invoiceNumber={invoice.invoiceNumber}
          notes={invoice.notes}
          totalAmount={invoice.totalAmount}
          profile={profile}
        />
      );
      
      // Generate the PDF blob using @react-pdf/renderer's pdf function
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
      
      if (!options.silent) {
        toast.success('Invoice downloaded successfully', { id: options.toastId || 'pdf-download' });
      }
      
      // Return success for sequential downloads
      return { success: true, fileName };
    } catch (error) {
      logger.error('Error generating PDF:', error);
      
      if (!options.silent) {
        toast.error('Error generating PDF', { id: options.toastId || 'pdf-download' });
      }
      
      // Return error for sequential downloads
      return { success: false, error, fileName };
    }
  };
  
  // Get detailed card information for the invoice
  const getCardDetails = async (invoice) => {
    try {
      // If we have card IDs, fetch the full card details
      if (invoice.cards && invoice.cards.length > 0) {
        // Log the card data for debugging
        // console.log('Card data from invoice:', invoice.cards);
        
        // Process cards to ensure they have proper display names
        const processedCards = invoice.cards.map(card => {
          // Create a copy of the card to avoid modifying the original
          const processedCard = {...card};
          
          // If the card doesn't have a name property but has a set property,
          // create a display name using the set
          if (!processedCard.name && !processedCard.player && processedCard.set) {
            processedCard.displayName = `${processedCard.set} Card`;
          } else {
            processedCard.displayName = processedCard.name || processedCard.player || 'Unnamed Card';
          }
          
          return processedCard;
        });
        
        // console.log('Processed cards for PDF:', processedCards);
        return processedCards;
      }
      return [];
    } catch (error) {
      console.error('Error fetching card details:', error);
      return [];
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-20 pt-16 sm:pt-4">
      {/* Statistics Summary */}
      {!loading && invoices.length > 0 && (
        <div className="mb-6">
          <StatisticsSummary 
            statistics={getInvoiceStatistics()} 
            className="mb-4"
          />
        </div>
      )}
      
      <div className="bg-white dark:bg-black rounded-xl">
        
        {loading ? (
          <div className="overflow-x-auto">
            {/* Search Section Skeleton - matches exact real layout */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="w-full">
                <div className="relative">
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mt-2"></div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="w-full sm:w-auto h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse sm:w-48"></div>
              </div>
            </div>
            
            {/* Desktop Table Skeleton - matches exact table structure */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-8"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-10"></div>
                    </th>
                    <th className="px-6 py-3 text-right">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 ml-auto"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-14"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(2)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse max-w-[150px]"></div>
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

            {/* Mobile Cards Skeleton - matches exact mobile layout */}
            <div className="md:hidden space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white/5 dark:bg-white/5 rounded-xl p-4 border border-gray-200/20 dark:border-gray-700/30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-28"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 w-10"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 w-16 ml-auto"></div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Invoice Icon */}
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">receipt_long</span>
            </div>
            
            {/* Main Message */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
              No Purchase Invoices Yet
            </h3>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8 leading-relaxed">
              Keep track of your card purchases by creating invoices. This helps you monitor your investments and calculate profits when you sell.
            </p>
            
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 max-w-md mx-auto mb-8">
              <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <span className="material-icons text-xl">info</span>
                How to Create an Invoice
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                <li>Go to your Cards page</li>
                <li>Use multi-select to choose cards</li>
                <li>Click "Create Invoice" from the actions menu</li>
              </ol>
            </div>
            
            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                💡 Benefits of tracking purchases:
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
                <li>• Track your investment amounts</li>
                <li>• Calculate profit/loss on sales</li>
                <li>• Organize purchases by seller</li>
                <li>• Generate PDF records</li>
              </ul>
            </div>
          </div>
        ) : (
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
              {filteredInvoices.length} of {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} found
            </div>
            
            <div className="flex flex-col gap-4 mb-4 px-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {isGeneratingBatch ? (
                  <div className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center gap-2">
                    <span className="material-icons animate-spin">autorenew</span>
                    <span className="hidden sm:inline">Generating PDFs on server...</span>
                    <span className="sm:hidden">Generating...</span>
                  </div>
                ) : (
                  <button
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    onClick={handleServerBatchGeneration}
                    disabled={invoices.length === 0}
                    title="Generate PDF invoices for all items"
                  >
                    <span className="material-icons text-base">cloud_download</span>
                    <span>Generate All PDFs</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      Invoice # {sortField === 'invoiceNumber' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('date')}
                    >
                      Date {sortField === 'date' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('seller')}
                    >
                      Seller {sortField === 'seller' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('totalAmount')}
                    >
                      Total Amount {sortField === 'totalAmount' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('cardCount')}
                    >
                      # of Cards {sortField === 'cardCount' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
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
                  {getSortedInvoices().map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate" title={invoice.seller}>
                          {invoice.seller}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {invoice.cardCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex">
                        <button 
                          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-3 p-2"
                          onClick={() => handleDownloadInvoice(invoice)}
                          title="Download PDF"
                        >
                          <span className="material-icons text-xl">download</span>
                        </button>
                        <button 
                          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mr-3 p-2"
                          onClick={() => handleEditInvoice(invoice)}
                          title="Edit Invoice"
                        >
                          <span className="material-icons text-xl">edit</span>
                        </button>
                        <button 
                          className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                          onClick={() => showDeleteConfirmation(invoice)}
                          title="Delete Invoice"
                        >
                          <span className="material-icons text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {getSortedInvoices().map((invoice) => (
                <div key={invoice.id} className="bg-white/5 dark:bg-white/5 rounded-xl p-4 border border-gray-200/20 dark:border-gray-700/30">
                  {/* Header with Invoice Number and Date */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Invoice #{invoice.invoiceNumber}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(invoice.date)}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">
                      {invoice.cardCount} cards
                    </span>
                  </div>

                  {/* Main Content: Seller and Amount */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Seller</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={invoice.seller}>
                        {invoice.seller}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200/20 dark:border-gray-700/30">
                    <button 
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      onClick={() => handleDownloadInvoice(invoice)}
                      title="Download PDF"
                    >
                      <span className="material-icons text-lg">download</span>
                    </button>
                    <button 
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleEditInvoice(invoice)}
                      title="Edit Invoice"
                    >
                      <span className="material-icons text-lg">edit</span>
                    </button>
                    <button 
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      onClick={() => showDeleteConfirmation(invoice)}
                      title="Delete Invoice"
                    >
                      <span className="material-icons text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Create/Edit Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={useCallback(() => {
          setShowCreateModal(false);
          setEditingInvoice(null); // Reset editing state when closing
        }, [])}
        onSave={useCallback(async (newInvoice) => {
          if (!newInvoice) return;
          
          try {
            if (editingInvoice) {
              // console.log('Updating invoice in local state:', newInvoice);
              
              // Update existing invoice in local state immediately
              // This ensures the UI reflects the changes without needing to refresh from Firestore
              setInvoices(prev => prev.map(inv => 
                inv.id === newInvoice.id ? newInvoice : inv
              ));
            } else {
              // console.log('Adding new invoice to local state:', newInvoice);
              
              // For new invoices, add to local state immediately
              setInvoices(prev => [newInvoice, ...prev]);
            }
            
            setShowCreateModal(false);
            setEditingInvoice(null);
          } catch (error) {
            console.error('Error handling invoice save:', error);
            setShowCreateModal(false);
            setEditingInvoice(null);
          }
        }, [editingInvoice])}
        editingInvoice={editingInvoice}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, invoice: null })}
        onConfirm={() => {
          handleDeleteInvoice(deleteConfirmation.invoice);
          setDeleteConfirmation({ isOpen: false, invoice: null });
        }}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice #${deleteConfirmation.invoice?.invoiceNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default PurchaseInvoices;
