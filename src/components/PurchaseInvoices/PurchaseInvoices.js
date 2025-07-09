import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useAuth,
  StatisticsSummary,
  SimpleSearchBar,
  ConfirmDialog,
} from '../../design-system';
import { formatCurrency } from '../../design-system/utils/formatters';
import db from '../../services/firestore/dbAdapter';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from './CreateInvoiceModal';
import { pdf } from '@react-pdf/renderer';
import PurchaseInvoicePDF from '../PurchaseInvoicePDF';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import {
  db as firestoreDb,
  functions,
  httpsCallable,
} from '../../services/firebase';
import featureFlags from '../../utils/featureFlags';
import logger from '../../utils/logger';
import { useSubscription } from '../../hooks/useSubscription';
import FeatureGate from '../FeatureGate';
import LoggingService from '../../services/LoggingService';

/**
 * PurchaseInvoices component
 *
 * Displays and manages purchase invoices for Pokemon cards
 */
const PurchaseInvoices = () => {
  // Move ALL hooks to the top before any conditional logic
  const { hasFeature } = useSubscription();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    invoice: null,
  });
  const { currentUser } = useAuth();

  // Move ALL remaining hooks to the top
  const handleModalClose = useCallback(() => {
    setShowCreateModal(false);
    setEditingInvoice(null); // Reset editing state when closing
  }, []);

  const handleModalSave = useCallback(
    async newInvoice => {
      if (!newInvoice) return;

      try {
        if (editingInvoice) {
          // Update existing invoice in local state immediately
          setInvoices(prev =>
            prev.map(inv => (inv.id === newInvoice.id ? newInvoice : inv))
          );
        } else {
          // For new invoices, add to local state immediately
          setInvoices(prev => [newInvoice, ...prev]);
        }

        setShowCreateModal(false);
        setEditingInvoice(null);
      } catch (error) {
        LoggingService.error('Error handling invoice save:', error);
        setShowCreateModal(false);
        setEditingInvoice(null);
      }
    },
    [editingInvoice]
  );

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);

      // Load directly from Firestore if online
      if (currentUser && navigator.onLine && featureFlags.enableFirestoreSync) {
        try {
          // Create a reference to the user's purchase invoices collection
          const invoicesRef = collection(
            firestoreDb,
            'users',
            currentUser.uid,
            'purchaseInvoices'
          );
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
          LoggingService.error(
            'Error loading invoices from Firestore:',
            firestoreError
          );
        }
      }

      // Fall back to local database only if Firestore failed
      const purchaseInvoices =
        (await db.getPurchaseInvoices(currentUser?.uid)) || [];
      setInvoices(purchaseInvoices);
    } catch (error) {
      LoggingService.error('Error loading purchase invoices:', error);
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
          db.saveProfile(firestoreProfile).catch(LoggingService.error);
          return;
        }
      }

      // Fall back to IndexedDB
      const userProfile = await db.getProfile();
      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      LoggingService.error('Error loading profile:', error);
    }
  }, [currentUser]);

  // Load purchase invoices with improved cloud synchronization
  useEffect(() => {
    if (currentUser) {
      loadInvoices();
      loadProfile();
    }
  }, [currentUser]);

  // Filter invoices based on search query
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) {
      return invoices;
    }

    const query = searchQuery.toLowerCase();
    return invoices.filter(invoice => {
      return (
        // Search in invoice number
        (invoice.invoiceNumber &&
          invoice.invoiceNumber.toLowerCase().includes(query)) ||
        // Search in seller
        (invoice.seller && invoice.seller.toLowerCase().includes(query)) ||
        // Search in date
        (invoice.date && invoice.date.toLowerCase().includes(query)) ||
        // Search in notes
        (invoice.notes && invoice.notes.toLowerCase().includes(query)) ||
        // Search in card names (if available)
        (invoice.cards &&
          Array.isArray(invoice.cards) &&
          invoice.cards.some(
            card =>
              (card.name && card.name.toLowerCase().includes(query)) ||
              (card.set && card.set.toLowerCase().includes(query))
          ))
      );
    });
  }, [invoices, searchQuery]);

  // If user doesn't have invoicing access, show feature gate
  if (!hasFeature('INVOICING')) {
    return (
      <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-4">
        <FeatureGate
          feature="INVOICING"
          customMessage="Create and manage purchase invoices for your card transactions. Track your investments and generate professional invoices. This feature is available with Premium."
        />
      </div>
    );
  }

  // Handle editing an invoice
  const handleEditInvoice = invoice => {
    setEditingInvoice(invoice);
    setShowCreateModal(true);
  };

  // Handle delete confirmation
  const showDeleteConfirmation = invoice => {
    setDeleteConfirmation({ isOpen: true, invoice });
  };

  const handleDeleteInvoice = async invoice => {
    try {
      await db.deletePurchaseInvoice(invoice.id);
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      LoggingService.error('Error deleting invoice:', error);
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
      toast.loading('Generating PDF invoices on the server...', {
        id: 'server-batch',
      });
      setIsGeneratingBatch(true);

      // Get all invoice IDs from filtered invoices
      const invoiceIds = filteredInvoices.map(invoice => invoice.id);

      // Call the Cloud Function
      const generateBatchFn = httpsCallable(functions, 'generateInvoiceBatch');
      const result = await generateBatchFn({ invoiceIds });

      if (result.data && result.data.success) {
        // Success - provide download link for ZIP file
        toast.success(
          `Successfully generated ${result.data.invoiceCount} invoice PDFs!`,
          { id: 'server-batch' }
        );

        // Create a temporary link to download the ZIP file
        const downloadLink = document.createElement('a');
        downloadLink.href = result.data.url;
        downloadLink.download = result.data.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Show success message
        setTimeout(() => {
          toast.success(
            'Your invoice PDFs have been downloaded as a ZIP file',
            { duration: 6000 }
          );
        }, 1000);
      } else {
        toast.error('Failed to generate invoice PDFs', { id: 'server-batch' });
      }
    } catch (error) {
      LoggingService.error('Error in server batch PDF generation:', error);
      toast.error(`Error: ${error.message || 'Unknown error'}`, {
        id: 'server-batch',
      });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Handle sorting
  const handleSort = field => {
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
  const getOrdinalSuffix = day => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  // Format date to "17th Feb 25" format
  const formatDate = dateString => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    // Get day with ordinal suffix
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);

    // Get month abbreviation
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
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
        originalCurrencyCode: 'AUD',
      },
      {
        label: 'Cards Purchased',
        value: totalCards,
        formattedValue: totalCards.toString(), // Ensure it's a string with no abbreviations
        icon: 'style',
      },
      {
        label: 'Avg Cost/Card',
        value: avgCostPerCard, // Pass raw value
        isMonetary: true,
        originalCurrencyCode: 'AUD',
      },
      {
        label: 'Sellers',
        value: uniqueSellers,
        formattedValue: uniqueSellers.toString(), // Ensure it's a string with no abbreviations
        icon: 'person',
      },
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
        toast.loading('Generating PDF...', {
          id: options.toastId || 'pdf-download',
        });
      }

      // Get detailed card information for the invoice
      const cardDetails = await getCardDetails(invoice);

      // Debug: Log the card details to see what data we have
      // LoggingService.info('Invoice data for PDF generation:', invoice);
      // LoggingService.info('Card details for PDF:', cardDetails);
      // LoggingService.info('First card details:', cardDetails[0]);

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
        toast.success('Invoice downloaded successfully', {
          id: options.toastId || 'pdf-download',
        });
      }

      // Return success for sequential downloads
      return { success: true, fileName };
    } catch (error) {
      logger.error('Error generating PDF:', error);

      if (!options.silent) {
        toast.error('Error generating PDF', {
          id: options.toastId || 'pdf-download',
        });
      }

      // Return error for sequential downloads
      return { success: false, error, fileName };
    }
  };

  // Get detailed card information for the invoice
  const getCardDetails = async invoice => {
    try {
      // If we have card IDs, fetch the full card details
      if (invoice.cards && invoice.cards.length > 0) {
        // Log the card data for debugging
        // LoggingService.info('Card data from invoice:', invoice.cards);

        // Process cards to ensure they have proper display names
        const processedCards = invoice.cards.map(card => {
          // Create a copy of the card to avoid modifying the original
          const processedCard = { ...card };

          // If the card doesn't have a name property but has a set property,
          // create a display name using the set
          if (
            !processedCard.name &&
            !processedCard.player &&
            processedCard.set
          ) {
            processedCard.displayName = `${processedCard.set} Card`;
          } else {
            processedCard.displayName =
              processedCard.name || processedCard.player || 'Unnamed Card';
          }

          return processedCard;
        });

        // LoggingService.info('Processed cards for PDF:', processedCards);
        return processedCards;
      }
      return [];
    } catch (error) {
      LoggingService.error('Error fetching card details:', error);
      return [];
    }
  };

  return (
    <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-4">
      {/* Statistics Summary */}
      {!loading && invoices.length > 0 && (
        <div className="mb-6">
          <StatisticsSummary
            statistics={getInvoiceStatistics()}
            className="mb-4"
          />
        </div>
      )}

      <div className="rounded-xl bg-white dark:bg-black">
        {loading ? (
          <div className="overflow-x-auto">
            {/* Search Section Skeleton - matches exact real layout */}
            <div className="mb-4 flex flex-col gap-4">
              <div className="w-full">
                <div className="relative">
                  <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute left-3 top-1/2 size-5 -translate-y-1/2 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                </div>
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 sm:w-auto"></div>
              </div>
            </div>

            {/* Desktop Table Skeleton - matches exact table structure */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 w-8 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 w-10 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                    <th className="px-6 py-3 text-right">
                      <div className="ml-auto h-3 w-20 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 w-14 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="h-3 w-12 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-black">
                  {[...Array(2)].map((_, i) => (
                    <tr key={`loading-skeleton-${i + 1}`}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 max-w-[150px] animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="size-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex space-x-3">
                          <div className="size-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                          <div className="size-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                          <div className="size-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Skeleton - matches exact mobile layout */}
            <div className="space-y-4 md:hidden">
              {[...Array(2)].map((_, i) => (
                <div
                  key={`mobile-skeleton-${i + 1}`}
                  className="bg-white/5 dark:bg-white/5 border-gray-200/20 dark:border-gray-700/30 rounded-xl border p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-2 h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-1 h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    <div className="text-right">
                      <div className="mb-1 ml-auto h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="h-5 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="size-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="size-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="size-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16">
            {/* Invoice Icon */}
            <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">
                receipt_long
              </span>
            </div>

            {/* Main Message */}
            <h3 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
              No Purchase Invoices Yet
            </h3>

            {/* Description */}
            <p className="mb-8 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
              Keep track of your card purchases by creating invoices. This helps
              you monitor your investments and calculate profits when you sell.
            </p>

            {/* Instructions */}
            <div className="mx-auto mb-8 max-w-md rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
              <h4 className="mb-3 flex items-center gap-2 text-lg font-medium text-blue-900 dark:text-blue-100">
                <span className="material-icons text-xl">info</span>
                How to Create an Invoice
              </h4>
              <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>Go to your Cards page</li>
                <li>Use multi-select to choose cards</li>
                <li>Click "Create Invoice" from the actions menu</li>
              </ol>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-500">
                💡 Benefits of tracking purchases:
              </p>
              <ul className="space-y-1 text-sm text-gray-500 dark:text-gray-500">
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
            <div className="mb-4 px-4 text-sm text-gray-500 dark:text-gray-400">
              {filteredInvoices.length} of {invoices.length}{' '}
              {invoices.length === 1 ? 'invoice' : 'invoices'} found
            </div>

            <div className="mb-4 flex flex-col gap-4 px-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                {isGeneratingBatch ? (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <span className="material-icons animate-spin">
                      autorenew
                    </span>
                    <span className="hidden sm:inline">
                      Generating PDFs on server...
                    </span>
                    <span className="sm:hidden">Generating...</span>
                  </div>
                ) : (
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto"
                    onClick={handleServerBatchGeneration}
                    disabled={invoices.length === 0}
                    title="Generate PDF invoices for all items"
                  >
                    <span className="material-icons text-base">
                      cloud_download
                    </span>
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
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      Invoice #{' '}
                      {sortField === 'invoiceNumber' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleSort('date')}
                    >
                      Date{' '}
                      {sortField === 'date' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleSort('seller')}
                    >
                      Seller{' '}
                      {sortField === 'seller' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleSort('totalAmount')}
                    >
                      Total Amount{' '}
                      {sortField === 'totalAmount' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleSort('cardCount')}
                    >
                      # of Cards{' '}
                      {sortField === 'cardCount' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-black">
                  {getSortedInvoices().map(invoice => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div
                          className="max-w-[150px] truncate"
                          title={invoice.seller}
                        >
                          {invoice.seller}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {invoice.cardCount}
                      </td>
                      <td className="flex whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <button
                          className="mr-3 p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                          onClick={() => handleDownloadInvoice(invoice)}
                          title="Download PDF"
                        >
                          <span className="material-icons text-xl">
                            download
                          </span>
                        </button>
                        <button
                          className="mr-3 p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                          onClick={() => handleEditInvoice(invoice)}
                          title="Edit Invoice"
                        >
                          <span className="material-icons text-xl">edit</span>
                        </button>
                        <button
                          className="p-2 text-gray-700 transition-colors hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
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
            <div className="space-y-4 md:hidden">
              {getSortedInvoices().map(invoice => (
                <div
                  key={invoice.id}
                  className="bg-white/5 dark:bg-white/5 border-gray-200/20 dark:border-gray-700/30 rounded-xl border p-4"
                >
                  {/* Header with Invoice Number and Date */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Invoice #{invoice.invoiceNumber}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {invoice.cardCount} cards
                    </span>
                  </div>

                  {/* Main Content: Seller and Amount */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Seller
                      </p>
                      <p
                        className="truncate text-sm font-medium text-gray-900 dark:text-white"
                        title={invoice.seller}
                      >
                        {invoice.seller}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Amount
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-gray-200/20 dark:border-gray-700/30 flex justify-end space-x-2 border-t pt-3">
                    <button
                      className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                      onClick={() => handleDownloadInvoice(invoice)}
                      title="Download PDF"
                    >
                      <span className="material-icons text-lg">download</span>
                    </button>
                    <button
                      className="flex size-10 items-center justify-center rounded-lg bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      onClick={() => handleEditInvoice(invoice)}
                      title="Edit Invoice"
                    >
                      <span className="material-icons text-lg">edit</span>
                    </button>
                    <button
                      className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
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
        onClose={handleModalClose}
        onSave={handleModalSave}
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
