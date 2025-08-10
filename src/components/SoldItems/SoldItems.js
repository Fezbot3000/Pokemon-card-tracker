import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StatisticsSummary,
  SimpleSearchBar,
  ConfirmDialog,
} from '../../design-system';
import db from '../../services/firestore/dbAdapter';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '../InvoicePDF';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../design-system';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import logger from '../../utils/logger';
import LoggingService from '../../services/LoggingService';
import {
  useUserPreferences,
  availableCurrencies,
} from '../../contexts/UserPreferencesContext';
import { calculateSoldCardStatistics } from '../../utils/cardStatistics';
import { useSubscription } from '../../hooks/useSubscription';
import FeatureGate from '../FeatureGate';

const SoldItems = () => {
  // Move all hooks to the top before any conditional logic
  const { hasFeature } = useSubscription();
  const { user } = useAuth();
  const { preferredCurrency, convertToUserCurrency } = useUserPreferences();

  const [soldCards, setSoldCards] = useState([]);
  const [cardImages] = useState({});
  const [profile, setProfile] = useState(null);
  const [expandedBuyers, setExpandedBuyers] = useState(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    invoiceId: null,
    buyer: null,
  });

  // Move ALL remaining hooks to the top
  // Initialize all invoices as expanded by default when soldCards change
  useEffect(() => {
    if (soldCards && Array.isArray(soldCards) && soldCards.length > 0) {
      // Set all buyers as collapsed by default (empty set)
      setExpandedBuyers(new Set());
    }
  }, [soldCards]);

  // Load card images from local IndexedDB and Firebase Storage
  useEffect(() => {
    // Disable image loading completely to prevent CORS errors
    return;
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
            db.saveProfile(firestoreProfile).catch(error => 
              LoggingService.error('Error saving profile to IndexedDB:', error)
            );
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
        const soldCardsResult = (await db.getSoldCards(user.uid)) || {
          data: [],
        };
        const localSoldCards = soldCardsResult.data || [];

        // Also try loading from "sold" collection as a fallback
        let soldFromCollection = [];
        try {
          const soldCollectionCards = (await db.getCards('sold')) || [];
          soldFromCollection = Array.isArray(soldCollectionCards)
            ? soldCollectionCards
            : [];
        } catch (error) {
          LoggingService.info('No sold collection found:', error.message);
        }

        // Use sold items if available, otherwise fall back to sold collection
        const finalSoldCards =
          localSoldCards.length > 0 ? localSoldCards : soldFromCollection;
        setSoldCards(finalSoldCards);
        setIsLoading(false);
      } catch (error) {
        LoggingService.error('Error loading sold cards:', error);
        toast.error('Failed to load sold items');
        setIsLoading(false);
      }
    };

    loadSoldCards();
  }, [user]);

  // Helper function to determine financial year from date


  // Local formatCurrency function as a fallback
  const formatUserCurrency = useCallback((amount, currencyCode) => {
    if (amount === undefined || amount === null) return '0.00';

    // Get the currency symbol
    const currency = availableCurrencies.find(c => c.code === currencyCode) || {
      symbol: '$',
    };

    // Check if the amount is negative
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Format with proper thousand separators and 2 decimal places
    const formattedAmount = absoluteAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Return with proper negative sign placement
    return isNegative
      ? `-${currency.symbol}${formattedAmount}`
      : `${currency.symbol}${formattedAmount}`;
  }, []);

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
        } else if (
          invoice.date &&
          typeof invoice.date === 'object' &&
          invoice.date.seconds
        ) {
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
      LoggingService.error('Error generating PDF:', error);
      toast.error('Error generating PDF', { id: 'pdf-download' });
    }
  };





  // Note: filteredCards removed as it was unused

  // Note: sortedInvoices removed as it was unused

  // Note: displayData removed as it was unused

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
          date: card.dateSold || card.soldDate || new Date().toISOString(),
        };
      }

      // Get values with proper currency conversion
      const investment = convertToUserCurrency(
        parseFloat(
          card.originalInvestmentAmount ||
            card.investmentAUD ||
            card.investment ||
            0
        ),
        card.originalInvestmentCurrency || 'AUD'
      );

      const soldPrice = convertToUserCurrency(
        parseFloat(
          card.soldPrice ||
            card.soldAmount ||
            card.finalValueAUD ||
            card.currentValueAUD ||
            0
        ),
        card.originalCurrentValueCurrency || 'AUD'
      );

      // Add to buyer group
      buyerGroups[buyerKey].cards.push(card);
      buyerGroups[buyerKey].totalInvestment += investment;
      buyerGroups[buyerKey].totalSale += soldPrice;
      buyerGroups[buyerKey].totalProfit += soldPrice - investment;

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
    const validSoldCards =
      soldCards && Array.isArray(soldCards) ? soldCards : [];
    const validInvoiceTotals = invoiceTotals || {};

    const stats = calculateSoldCardStatistics(
      validSoldCards,
      validInvoiceTotals,
      convertToUserCurrency
    );
    // Fix invoice count to show actual number of unique buyers
    return {
      ...stats,
      invoiceCount: Object.keys(validInvoiceTotals).length,
    };
  }, [soldCards, invoiceTotals, convertToUserCurrency]);

  // Format statistics for StatisticsSummary component
  const formattedStatistics = useMemo(() => {
    return [
      {
        label: 'PAID',
        value: statistics.totalInvestment,
        isMonetary: true,
        originalCurrencyCode: preferredCurrency.code,
      },
      {
        label: 'SOLD FOR',
        value: statistics.totalSoldFor,
        isMonetary: true,
        originalCurrencyCode: preferredCurrency.code,
      },
      {
        label: 'PROFIT',
        value: statistics.totalProfit,
        isMonetary: true,
        isProfit: true,
        originalCurrencyCode: preferredCurrency.code,
      },
      {
        label: 'SOLD INVOICES',
        value: statistics.invoiceCount,
        isMonetary: false,
      },
    ];
  }, [statistics, preferredCurrency.code]);

  // Note: handleSortChange removed as it was unused

  // Note: groupedInvoicesByYear removed as it was unused

  // Note: toggleYear, toggleInvoice, and totalsGrouped removed as they were unused

  // Note: fixDatabaseStructure removed as it was unused





  // Format date for display
  const formatDate = dateStr => {
    if (!dateStr) return '';

    let date;
    // Check if this is a Firestore Timestamp object
    if (
      dateStr &&
      typeof dateStr === 'object' &&
      'seconds' in dateStr &&
      'nanoseconds' in dateStr
    ) {
      // Convert Firestore Timestamp to JavaScript Date
      date = new Date(dateStr.seconds * 1000);
    } else {
      // Regular date string
      date = new Date(dateStr);
    }

    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
      LoggingService.warn('Invalid date:', dateStr);
      return 'Invalid date';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateSafely = useCallback(dateStr => {
    try {
      return formatDate(dateStr);
    } catch (error) {
      LoggingService.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, []);





  // displayData is now defined above with financial year grouping



  // Delete a specific invoice/receipt
  const showDeleteConfirmation = (invoiceId, buyer = null) => {
    setDeleteConfirmation({ isOpen: true, invoiceId, buyer });
  };

  const handleDeleteInvoice = async invoiceId => {
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
        logger.info(
          `[SoldItems] No cards found for invoice ${invoiceId} to delete. It might be an empty invoice or cards already removed.`
        );
        // If the invoice is just a grouping and has no separate existence,
        // removing its cards effectively removes it. If it needs explicit deletion,
        // that would be a separate step (e.g., db.deleteInvoiceRecord(invoiceId)).
        // For now, assuming removing cards is sufficient.
        toast.info(
          'No cards associated with this receipt were found to delete.'
        );
        // Potentially, still remove from expandedInvoices if it was an empty, expanded invoice
        if (expandedInvoices.has(invoiceId)) {
          const newExpandedInvoices = new Set(expandedInvoices);
          newExpandedInvoices.delete(invoiceId);
          setExpandedInvoices(newExpandedInvoices);
        }
        return;
      }

      logger.debug(
        `[SoldItems] Attempting to delete ${cardIdsToDelete.length} cards for invoice ${invoiceId}:`,
        cardIdsToDelete
      );

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
        logger.info(
          `[SoldItems] Successfully deleted receipt ${invoiceId} and ${cardIdsToDelete.length} cards locally.`
        );
      } else {
        logger.error(
          `[SoldItems] Failed to delete receipt ${invoiceId} from DB: ${deleteResult.message}`,
          deleteResult.error
        );
        toast.error(
          `Failed to delete receipt: ${deleteResult.message || 'Please try again.'}`
        );
      }
    } catch (error) {
      logger.error(
        `[SoldItems] Error in handleDeleteInvoice for invoice ${invoiceId}:`,
        error
      );
      toast.error('An unexpected error occurred while deleting the receipt.');
    }
  };



  const filteredInvoices = useMemo(() => {
    let invoices = Object.entries(invoiceTotals);

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      invoices = invoices.filter(([buyer, invoice]) => {
        return (
          buyer.toLowerCase().includes(query) ||
          formatDateSafely(invoice.date).toLowerCase().includes(query) ||
          formatUserCurrency(invoice.totalProfit, preferredCurrency.code)
            .toLowerCase()
            .includes(query)
        );
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
  }, [invoiceTotals, searchQuery, preferredCurrency.code, formatDateSafely, formatUserCurrency]);

  // If user doesn't have sold items access, show feature gate
  if (!hasFeature('SOLD_ITEMS')) {
    return (
      <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-4">
        <FeatureGate
          feature="SOLD_ITEMS"
          customMessage="Track your sold items, generate invoices, and analyze your profit trends. This feature is available with Premium."
        />
      </div>
    );
  }



  if (isLoading) {
    // Show nothing during loading to prevent empty state flash
    return <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-8"></div>;
  }

  return (
    <div className="p-4 pb-20 pt-16 sm:p-6 sm:pt-8">
      {/* Statistics Summary */}
      {soldCards && Array.isArray(soldCards) && soldCards.length > 0 && (
        <div className="mb-6">
          <StatisticsSummary statistics={formattedStatistics} />
        </div>
      )}

      <div>
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
            <div className="mb-4 px-4 text-sm text-gray-500 dark:text-gray-400">
              {filteredInvoices.length} of {Object.keys(invoiceTotals).length}{' '}
              {Object.keys(invoiceTotals).length === 1 ? 'sale' : 'sales'} found
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-black">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Buyer
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Investment
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Sold For
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Profit
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      # of Cards
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
                  {filteredInvoices.map(([buyer, invoice]) => (
                    <React.Fragment key={buyer}>
                      <tr>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[150px] truncate" title={buyer}>
                            {buyer}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {formatDateSafely(invoice.date)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {formatUserCurrency(
                            invoice.totalInvestment,
                            preferredCurrency.code
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {formatUserCurrency(
                            invoice.totalSale,
                            preferredCurrency.code
                          )}
                        </td>
                        <td
                          className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${invoice.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatUserCurrency(
                            invoice.totalProfit,
                            preferredCurrency.code
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {invoice.cards.length}
                        </td>
                        <td className="flex whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <button
                            className="mr-3 p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                            onClick={() =>
                              handleDownloadInvoice(buyer, invoice)
                            }
                            title="Download PDF"
                          >
                            <span className="material-icons text-xl">
                              download
                            </span>
                          </button>
                          <button
                            className="mr-3 p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                            onClick={() =>
                              setExpandedBuyers(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(buyer)) {
                                  newSet.delete(buyer);
                                } else {
                                  newSet.add(buyer);
                                }
                                return newSet;
                              })
                            }
                            title="View Details"
                          >
                            <span className="material-icons text-xl">
                              {expandedBuyers.has(buyer)
                                ? 'visibility_off'
                                : 'visibility'}
                            </span>
                          </button>
                          <button
                            className="p-2 text-gray-700 transition-colors hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                            onClick={() => showDeleteConfirmation(buyer, buyer)}
                            title="Delete Sale"
                          >
                            <span className="material-icons text-xl">
                              delete
                            </span>
                          </button>
                        </td>
                      </tr>
                      {/* Expandable Card Details Row */}
                      {expandedBuyers.has(buyer) && (
                        <tr>
                          <td colSpan="7" className="p-0">
                            <div className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                              <div className="p-6">
                                <h4 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
                                  Card Details
                                </h4>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                  {invoice.cards.map((card, index) => (
                                    <div
                                      key={card.id || card.slabSerial || `card-${index}`}
                                      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                          <h5 className="truncate font-medium text-gray-900 dark:text-white">
                                            {card.name ||
                                              card.card ||
                                              card.cardName ||
                                              'Unnamed Card'}
                                          </h5>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {card.set ||
                                              card.setName ||
                                              'Unknown Set'}
                                          </p>
                                          {card.grade && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                              Grade: {card.grade}
                                            </p>
                                          )}
                                        </div>
                                        <div className="ml-4 text-right">
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Investment:{' '}
                                            {formatUserCurrency(
                                              convertToUserCurrency(
                                                parseFloat(
                                                  card.originalInvestmentAmount ||
                                                    card.investmentAUD ||
                                                    card.investment ||
                                                    0
                                                ),
                                                card.originalInvestmentCurrency ||
                                                  'AUD'
                                              ),
                                              preferredCurrency.code
                                            )}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Sold for:{' '}
                                            {formatUserCurrency(
                                              convertToUserCurrency(
                                                parseFloat(
                                                  card.soldPrice ||
                                                    card.soldAmount ||
                                                    card.finalValueAUD ||
                                                    card.currentValueAUD ||
                                                    0
                                                ),
                                                card.originalCurrentValueCurrency ||
                                                  'AUD'
                                              ),
                                              preferredCurrency.code
                                            )}
                                          </p>
                                          <p
                                            className={`text-sm font-medium ${convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD') >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                          >
                                            {formatUserCurrency(
                                              convertToUserCurrency(
                                                parseFloat(
                                                  card.soldPrice ||
                                                    card.soldAmount ||
                                                    card.finalValueAUD ||
                                                    card.currentValueAUD ||
                                                    0
                                                ),
                                                card.originalCurrentValueCurrency ||
                                                  'AUD'
                                              ) -
                                                convertToUserCurrency(
                                                  parseFloat(
                                                    card.originalInvestmentAmount ||
                                                      card.investmentAUD ||
                                                      card.investment ||
                                                      0
                                                  ),
                                                  card.originalInvestmentCurrency ||
                                                    'AUD'
                                                ),
                                              preferredCurrency.code
                                            )}
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
            <div className="space-y-4 p-4 md:hidden">
              {filteredInvoices.map(([buyer, invoice]) => (
                <div
                  key={buyer}
                                      className="bg-white dark:bg-[#0F0F0F] border-gray-200 dark:border-gray-700 overflow-hidden rounded-xl border"
                >
                  {/* Header with Buyer and Date */}
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Sold to: {buyer}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatDateSafely(invoice.date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {invoice.cards.length} cards
                      </span>
                    </div>

                    {/* Main Content: Investment and Profit */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Investment
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatUserCurrency(
                            invoice.totalInvestment,
                            preferredCurrency.code
                          )}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Profit
                        </p>
                        <p
                          className={`text-lg font-semibold ${invoice.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatUserCurrency(
                            invoice.totalProfit,
                            preferredCurrency.code
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                                          <div className="border-gray-200 dark:border-gray-700 flex justify-end space-x-2 border-t pt-3">
                      <button
                        className="flex size-10 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                        onClick={() => handleDownloadInvoice(buyer, invoice)}
                        title="Download PDF"
                      >
                        <span className="material-icons text-lg">download</span>
                      </button>
                      <button
                        className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                        onClick={() =>
                          setExpandedBuyers(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(buyer)) {
                              newSet.delete(buyer);
                            } else {
                              newSet.add(buyer);
                            }
                            return newSet;
                          })
                        }
                        title="View Details"
                      >
                        <span className="material-icons text-lg">
                          {expandedBuyers.has(buyer)
                            ? 'visibility_off'
                            : 'visibility'}
                        </span>
                      </button>
                      <button
                        className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        onClick={() => showDeleteConfirmation(buyer, buyer)}
                        title="Delete Sale"
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Card Details (inline with each invoice) */}
                  {expandedBuyers.has(buyer) && (
                    <div className="border-gray-200 dark:border-gray-700 border-t bg-gray-50 p-4 dark:bg-gray-800">
                      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                        Card Details
                      </h4>
                      <div className="space-y-3">
                        {invoice.cards.map((card, index) => (
                          <div
                            key={card.id || card.slabSerial || `mobile-card-${index}`}
                            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black"
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h5 className="truncate font-medium text-gray-900 dark:text-white">
                                  {card.name ||
                                    card.card ||
                                    card.cardName ||
                                    'Unnamed Card'}
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
                              <div className="ml-4 text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Investment:{' '}
                                  {formatUserCurrency(
                                    convertToUserCurrency(
                                      parseFloat(
                                        card.originalInvestmentAmount ||
                                          card.investmentAUD ||
                                          card.investment ||
                                          0
                                      ),
                                      card.originalInvestmentCurrency || 'AUD'
                                    ),
                                    preferredCurrency.code
                                  )}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Sold for:{' '}
                                  {formatUserCurrency(
                                    convertToUserCurrency(
                                      parseFloat(
                                        card.soldPrice ||
                                          card.soldAmount ||
                                          card.finalValueAUD ||
                                          card.currentValueAUD ||
                                          0
                                      ),
                                      card.originalCurrentValueCurrency || 'AUD'
                                    ),
                                    preferredCurrency.code
                                  )}
                                </p>
                                <p
                                  className={`text-sm font-medium ${convertToUserCurrency(parseFloat(card.soldPrice || card.soldAmount || card.finalValueAUD || card.currentValueAUD || 0), card.originalCurrentValueCurrency || 'AUD') - convertToUserCurrency(parseFloat(card.originalInvestmentAmount || card.investmentAUD || card.investment || 0), card.originalInvestmentCurrency || 'AUD') >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {formatUserCurrency(
                                    convertToUserCurrency(
                                      parseFloat(
                                        card.soldPrice ||
                                          card.soldAmount ||
                                          card.finalValueAUD ||
                                          card.currentValueAUD ||
                                          0
                                      ),
                                      card.originalCurrentValueCurrency || 'AUD'
                                    ) -
                                      convertToUserCurrency(
                                        parseFloat(
                                          card.originalInvestmentAmount ||
                                            card.investmentAUD ||
                                            card.investment ||
                                            0
                                        ),
                                        card.originalInvestmentCurrency || 'AUD'
                                      ),
                                    preferredCurrency.code
                                  )}
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
          <div className="py-8 text-center sm:py-12">
            <span className="material-icons mb-3 text-4xl text-gray-400 dark:text-gray-600 sm:mb-4 sm:text-5xl">
              inventory_2
            </span>
            <h3 className="mb-1 text-sm font-medium text-gray-900 dark:text-white sm:mb-2 sm:text-base">
              No sold cards found
            </h3>
            <p className="mb-6 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
              When you sell cards from your collection, they will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({ isOpen: false, invoiceId: null, buyer: null })
        }
        onConfirm={() => {
          handleDeleteInvoice(deleteConfirmation.invoiceId);
          setDeleteConfirmation({
            isOpen: false,
            invoiceId: null,
            buyer: null,
          });
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
