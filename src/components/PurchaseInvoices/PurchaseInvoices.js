import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth, StatisticsSummary } from '../../design-system';
import db from '../../services/db';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from './CreateInvoiceModal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PurchaseInvoicePDF from '../PurchaseInvoicePDF';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const { currentUser } = useAuth();
  
  // Handle editing an invoice
  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowCreateModal(true);
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
  
  // Get sorted invoices
  const getSortedInvoices = () => {
    return [...invoices].sort((a, b) => {
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
        value: totalSpent,
        formattedValue: formatCurrency(totalSpent),
        isProfit: false
      },
      {
        label: 'Cards Purchased',
        value: totalCards,
        icon: 'style'
      },
      {
        label: 'Avg Cost/Card',
        value: avgCostPerCard,
        formattedValue: formatCurrency(avgCostPerCard),
        isProfit: false
      },
      {
        label: 'Sellers',
        value: uniqueSellers,
        icon: 'person'
      }
    ];
  };
  
  // Handle downloading an invoice as PDF
  const handleDownloadInvoice = (invoice) => {
    // Debug profile data
    console.log('Profile when downloading invoice:', profile);
    
    // Create a unique filename for the invoice
    const fileName = `purchase-invoice-${invoice.invoiceNumber || invoice.id}-${invoice.date.replace(/\//g, '-')}.pdf`;
    
    // Create a fake anchor element to trigger the download
    const link = document.createElement('a');
    link.href = `#/purchase-invoice/${invoice.id}`; // This doesn't actually matter for our purpose
    link.download = fileName;
    link.className = 'pdf-download-link';
    
    // Add the PDFDownloadLink to a hidden div
    const container = document.createElement('div');
    container.style.display = 'none';
    container.className = 'pdf-container';
    document.body.appendChild(container);
    
    // Get detailed card information for the invoice
    const getCardDetails = async () => {
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
    
    // Get card details and render PDF
    getCardDetails().then(cardDetails => {
      // Render the PDF link element which will automatically trigger download
      const pdfLinkElement = (
        <PDFDownloadLink
          document={
            <PurchaseInvoicePDF 
              seller={invoice.seller} 
              date={formatDateForDisplay(invoice.date)}
              cards={cardDetails} 
              invoiceNumber={invoice.invoiceNumber}
              notes={invoice.notes}
              totalAmount={invoice.totalAmount}
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
    });
  };

  // Load purchase invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        
        // First try to sync invoices from Firebase
        try {
          await db.syncPurchaseInvoicesFromFirestore();
          console.log('Synced purchase invoices from Firebase');
        } catch (syncError) {
          console.error('Error syncing invoices from Firebase:', syncError);
        }
        
        // Get purchase invoices from database
        const purchaseInvoices = await db.getPurchaseInvoices() || [];
        setInvoices(purchaseInvoices);
      } catch (error) {
        // Handle error silently - the database might be initializing
        console.log('Note: Purchase invoices store might be initializing');
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
    <div className="container mx-auto px-4 py-8 mt-16 sm:mt-20">
      <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Purchase Invoices
        </h1>
        
        {/* Statistics Summary */}
        {!loading && invoices.length > 0 && (
          <StatisticsSummary statistics={getInvoiceStatistics()} />
        )}
        
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
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} found
              </div>
              <button 
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                onClick={() => setShowCreateModal(true)}
              >
                Create New Invoice
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
                      {invoice.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.cardCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex">
                      <button 
                        className="text-primary hover:text-primary/80 transition-colors mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleDownloadInvoice(invoice)}
                        title="Download PDF"
                      >
                        <span className="material-icons text-xl">download</span>
                      </button>
                      <button 
                        className="text-blue-500 hover:text-blue-700 transition-colors mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleEditInvoice(invoice)}
                        title="Edit Invoice"
                      >
                        <span className="material-icons text-xl">edit</span>
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
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
        onSave={(newInvoice) => {
          if (editingInvoice) {
            // Update existing invoice
            setInvoices(prev => prev.map(inv => 
              inv.id === newInvoice.id ? newInvoice : inv
            ));
          } else {
            // Add new invoice
            setInvoices(prev => [newInvoice, ...prev]);
          }
          setShowCreateModal(false);
          setEditingInvoice(null);
        }}
        editingInvoice={editingInvoice}
      />
    </div>
  );
};

export default PurchaseInvoices;
