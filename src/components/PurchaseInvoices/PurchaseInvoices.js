import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, StatisticsSummary } from '../../design-system';
import db from '../../services/db';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from './CreateInvoiceModal';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import PurchaseInvoicePDF from '../PurchaseInvoicePDF';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import featureFlags from '../../utils/featureFlags';

/**
 * PurchaseInvoices component
 * 
 * Displays and manages purchase invoices for Pokemon cards
 */
const PurchaseInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useAuth();
  
  // Handle editing an invoice
  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowCreateModal(true);
  };
  
  // Handle exporting all invoices as a zip file
  const handleExportAllInvoices = async () => {
    if (invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }
    
    try {
      toast.loading('Preparing invoices for export...', { id: 'export-zip' });
      
      const zip = new JSZip();
      
      // Create a folder for the invoices
      const invoicesFolder = zip.folder('purchase-invoices');
      
      // Process each invoice
      for (const invoice of invoices) {
        try {
          // Ensure cards array exists
          const cards = invoice.cards || [];
          
          // Create the PDF document
          const pdfDocument = (
            <PurchaseInvoicePDF 
              seller={invoice.seller || ''}
              date={invoice.date || ''}
              cards={cards}
              invoiceNumber={invoice.invoiceNumber || ''}
              notes={invoice.notes || ''}
              totalAmount={invoice.totalAmount || 0}
              profile={profile}
            />
          );
          
          // Generate the PDF blob using @react-pdf/renderer's pdf function
          const pdfBlob = await pdf(pdfDocument).toBlob();
          
          if (pdfBlob) {
            // Generate a filename based on invoice details
            const fileName = `Invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
            
            // Add the PDF to the zip file
            invoicesFolder.file(fileName, pdfBlob);
          }
        } catch (invoiceError) {
          console.error(`Error processing invoice ${invoice.id}:`, invoiceError);
          // Continue with other invoices even if one fails
        }
      }
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Save the zip file
      saveAs(zipBlob, `Purchase-Invoices-${new Date().toISOString().split('T')[0]}.zip`);
      
      toast.success('All invoices exported successfully!', { id: 'export-zip' });
    } catch (error) {
      console.error('Error exporting invoices:', error);
      toast.error('Failed to export invoices', { id: 'export-zip' });
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
      if (field === 'date' || field === 'timestamp' || field === 'totalAmount' || field === 'cardCount') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
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
  
  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount) => {
    // Convert to number and handle invalid values
    const num = parseFloat(amount || 0);
    if (isNaN(num)) return '$0.00';
    
    // Format with commas and 2 decimal places
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
    
    // Format currency without abbreviations
    const formatFullCurrency = (amount) => {
      // Convert to number and handle invalid values
      const num = parseFloat(amount || 0);
      if (isNaN(num)) return '$0.00';
      
      // Format with commas and 2 decimal places, no abbreviations
      return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    return [
      {
        label: 'Total Spent',
        value: totalSpent,
        formattedValue: formatFullCurrency(totalSpent),
        isProfit: false
      },
      {
        label: 'Cards Purchased',
        value: totalCards,
        formattedValue: totalCards.toString(), // Ensure it's a string with no abbreviations
        icon: 'style'
      },
      {
        label: 'Avg Cost/Card',
        value: avgCostPerCard,
        formattedValue: formatFullCurrency(avgCostPerCard),
        isProfit: false
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
  const handleDownloadInvoice = async (invoice) => {
    // Debug profile data
    console.log('Profile when downloading invoice:', profile);
    
    // Create a unique filename for the invoice
    const fileName = `purchase-invoice-${invoice.invoiceNumber || invoice.id}-${invoice.date.replace(/\//g, '-')}.pdf`;
    
    try {
      // Show loading toast
      toast.loading('Generating PDF...', { id: 'pdf-download' });
      
      // Get detailed card information for the invoice
      const cardDetails = await getCardDetails(invoice);
      
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
      
      toast.success('Invoice downloaded successfully', { id: 'pdf-download' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF', { id: 'pdf-download' });
    }
  };
  
  // Get detailed card information for the invoice
  const getCardDetails = async (invoice) => {
    try {
      // If we have card IDs, fetch the full card details
      if (invoice.cards && invoice.cards.length > 0) {
        // Log the card data for debugging
        console.log('Card data from invoice:', invoice.cards);
        
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
        
        console.log('Processed cards for PDF:', processedCards);
        return processedCards;
      }
      return [];
    } catch (error) {
      console.error('Error fetching card details:', error);
      return [];
    }
  };

  // Load purchase invoices with improved cloud synchronization
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        
        // First try to fetch directly from Firestore if online
        let firestoreInvoices = [];
        let loadedFromFirestore = false;
        
        if (currentUser && navigator.onLine && featureFlags.enableFirestoreSync) {
          try {
            // Import Firebase modules
            const { collection, query, getDocs } = await import('firebase/firestore');
            
            // Create a reference to the user's purchase invoices collection
            const invoicesRef = collection(firestoreDb, 'users', currentUser.uid, 'purchaseInvoices');
            const q = query(invoicesRef);
            
            // Get all purchase invoices for the current user
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              firestoreInvoices = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure the ID is set correctly
                return { ...data, id: doc.id };
              });
              
              // Update local database with Firestore data
              for (const invoice of firestoreInvoices) {
                // Clean the invoice object to remove undefined values
                const cleanedInvoice = {};
                Object.entries(invoice).forEach(([key, value]) => {
                  if (value !== undefined) {
                    cleanedInvoice[key] = value;
                  }
                });
                await db.savePurchaseInvoice(cleanedInvoice);
              }
              
              // Set invoices from Firestore
              setInvoices(firestoreInvoices);
              loadedFromFirestore = true;
              console.log(`Loaded ${firestoreInvoices.length} invoices directly from Firestore`);
            }
          } catch (firestoreError) {
            console.error('Error loading invoices from Firestore:', firestoreError);
          }
        }
        
        // If we couldn't load from Firestore, fall back to local database
        if (!loadedFromFirestore) {
          // Try to sync invoices from Firebase first
          try {
            await db.syncPurchaseInvoicesFromFirestore();
            console.log('Synced purchase invoices from Firebase');
          } catch (syncError) {
            console.error('Error syncing invoices from Firebase:', syncError);
          }
          
          // Get purchase invoices from local database for the current user only
          const purchaseInvoices = await db.getPurchaseInvoices(currentUser?.uid) || [];
          setInvoices(purchaseInvoices);
          console.log(`Loaded ${purchaseInvoices.length} invoices from local database for user ${currentUser?.uid}`);
        }
      } catch (error) {
        console.error('Error loading purchase invoices:', error);
        toast.error('Failed to load purchase invoices');
      } finally {
        setLoading(false);
      }
    };

    const loadProfile = async () => {
      try {
        // First try to load from IndexedDB
        const userProfile = await db.getProfile();
        console.log('Profile loaded from IndexedDB:', userProfile);
        
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // If not found in IndexedDB, try loading from Firestore
          console.log('Profile not found in IndexedDB, trying Firestore...');
          if (currentUser && currentUser.uid) {
            const profileRef = doc(firestoreDb, 'users', currentUser.uid);
            const profileDoc = await getDoc(profileRef);
            
            if (profileDoc.exists()) {
              const firestoreProfile = profileDoc.data();
              console.log('Profile loaded from Firestore:', firestoreProfile);
              
              // Save to IndexedDB for future use
              await db.saveProfile(firestoreProfile);
              
              setProfile(firestoreProfile);
            } else {
              console.log('No profile found in Firestore');
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    if (currentUser) {
      loadInvoices();
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  return (
    <div className="pt-16 sm:pt-20 w-full px-1 sm:px-2">
      {/* Statistics Summary */}
      {!loading && invoices.length > 0 && (
        <StatisticsSummary statistics={getInvoiceStatistics()} className="mb-4" />
      )}
      
      <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-md p-6">
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No purchase invoices found
            </div>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <div className="w-full sm:w-1/2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 rounded-lg 
                            border border-gray-200 dark:border-gray-700/50 
                            bg-white dark:bg-[#000000] text-gray-900 dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                            placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    search
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {filteredInvoices.length} of {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} found
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  onClick={handleExportAllInvoices}
                  title="Export all invoices as a zip file"
                >
                  <span className="material-icons text-sm">archive</span>
                  Export All
                </button>
                <button 
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create New Invoice
                </button>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-[#000000]">
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#000000]"
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
              <tbody className="bg-white dark:bg-[#1B2131] divide-y divide-gray-200 dark:divide-gray-700">
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
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this invoice?')) {
                            try {
                              await db.deletePurchaseInvoice(invoice.id);
                              setInvoices(prev => prev.filter(i => i.id !== invoice.id));
                              toast.success('Invoice deleted successfully');
                            } catch (error) {
                              console.error('Error deleting invoice:', error);
                              toast.error('Failed to delete invoice');
                            }
                          }
                        }}
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
        )}
      </div>
      
      {/* Create/Edit Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingInvoice(null); // Reset editing state when closing
        }}
        onSave={async (newInvoice) => {
          if (!newInvoice) return;
          
          try {
            if (editingInvoice) {
              console.log('Updating invoice in local state:', newInvoice);
              
              // Update existing invoice in local state immediately
              // This ensures the UI reflects the changes without needing to refresh from Firestore
              setInvoices(prev => prev.map(inv => 
                inv.id === newInvoice.id ? newInvoice : inv
              ));
            } else {
              console.log('Adding new invoice to local state:', newInvoice);
              
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
          
          // Prevent event propagation
          return false;
        }}
        editingInvoice={editingInvoice}
      />
    </div>
  );
};

export default PurchaseInvoices;
