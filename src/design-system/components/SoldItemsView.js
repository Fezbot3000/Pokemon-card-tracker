import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import toastService from '../utils/toast';
import InvoiceHeader from '../molecules/invoice/InvoiceHeader';
import InvoiceCard from '../molecules/invoice/InvoiceCard';
import Icon from '../atoms/Icon';

/**
 * SoldItemsView Component
 *
 * A component to display sold Pokemon cards grouped by financial year and invoice.
 * Does NOT include the summary section - that's a separate component.
 */
const SoldItemsView = ({
  items = [],
  getCardImageUrl,
  onPrintInvoice,
  onDeleteInvoice,
  formatDate,
  className = '',
  formatUserCurrency,
  originalCurrencyCode,
}) => {
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  const [loadedInvoiceImages, setLoadedInvoiceImages] = useState(new Set()); // Track which invoice images have been loaded
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper function to safely format dates, handling Firestore Timestamp objects
  const formatDateSafely = dateValue => {
    if (!dateValue) return '';

    // If formatDate function is provided, use it
    if (formatDate) {
      return formatDate(dateValue);
    }

    // Otherwise, handle it ourselves
    let date;
    // Check if this is a Firestore Timestamp object
    if (
      dateValue &&
      typeof dateValue === 'object' &&
      'seconds' in dateValue &&
      'nanoseconds' in dateValue
    ) {
      // Convert Firestore Timestamp to JavaScript Date
      date = new Date(dateValue.seconds * 1000);
    } else {
      // Regular date string or Date object
      date = new Date(dateValue);
    }

    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filter out invalid or empty invoice entries
  const validItems = useMemo(() => {
    return items.filter(
      invoice =>
        invoice &&
        invoice.dateSold &&
        invoice.cards &&
        invoice.cards.length > 0 &&
        invoice.buyer // Only include invoices with a buyer name
    );
  }, [items]);

  // Group items by financial year
  const groupedByYear = useMemo(() => {
    const grouped = {};

    // Helper to determine financial year
    const getFinancialYear = dateStr => {
      try {
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

        // Check if date is valid
        if (isNaN(date.getTime())) {
          return 'Unknown Year';
        }

        const month = date.getMonth();
        const year = date.getFullYear();

        // Financial year runs from July to June
        if (month >= 6) {
          // July (6) onwards
          return `${year} - ${year + 1}`;
        } else {
          return `${year - 1} - ${year}`;
        }
      } catch (error) {
        return 'Unknown Year';
      }
    };

    // Group all items by financial year first
    if (!validItems || !validItems.length) return grouped;

    validItems.forEach(invoice => {
      if (!invoice || !invoice.dateSold) return;

      const financialYear = getFinancialYear(invoice.dateSold);

      if (!grouped[financialYear]) {
        grouped[financialYear] = {
          year: financialYear,
          invoices: [],
          totalInvestment: 0,
          totalSale: 0,
          totalProfit: 0,
        };
      }

      grouped[financialYear].invoices.push(invoice);
      grouped[financialYear].totalInvestment +=
        Number(invoice.totalInvestment) || 0;
      grouped[financialYear].totalSale += Number(invoice.totalSale) || 0;
      grouped[financialYear].totalProfit += Number(invoice.totalProfit) || 0;
    });

    // Sort invoices by date (newest first)
    Object.values(grouped).forEach(yearGroup => {
      yearGroup.invoices.sort((a, b) => {
        // Helper function to safely convert any date format to milliseconds
        const getDateMillis = dateValue => {
          if (!dateValue) return 0;

          // Handle Firestore Timestamp objects
          if (
            dateValue &&
            typeof dateValue === 'object' &&
            'seconds' in dateValue &&
            'nanoseconds' in dateValue
          ) {
            return dateValue.seconds * 1000;
          }

          // Handle regular date strings or Date objects
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };

        return getDateMillis(b.dateSold) - getDateMillis(a.dateSold);
      });
    });

    return grouped;
  }, [validItems]);

  // Toggle expanded state for financial years
  const toggleYear = year => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // Toggle expanded state for invoices
  const toggleInvoice = invoiceId => {
    const newExpandedInvoices = new Set(expandedInvoices);

    if (expandedInvoices.has(invoiceId)) {
      newExpandedInvoices.delete(invoiceId);
    } else {
      newExpandedInvoices.add(invoiceId);
      // Add to loaded invoice images when expanding
      setLoadedInvoiceImages(prev => new Set([...prev, invoiceId]));
    }

    setExpandedInvoices(newExpandedInvoices);
  };

  // On desktop, we'll pre-load all invoice images
  useEffect(() => {
    if (!isMobile) {
      // On desktop, mark all invoices as loaded
      const allInvoiceIds = new Set();
      validItems.forEach(invoice => {
        if (invoice && invoice.id) {
          allInvoiceIds.add(invoice.id);
        }
      });
      setLoadedInvoiceImages(allInvoiceIds);
    }
  }, [validItems, isMobile]);

  // Expand 'current' financial year by default on first render
  useEffect(() => {
    // Find the current financial year
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let currentFinancialYear;
    if (month >= 6) {
      // July onwards
      currentFinancialYear = `${year} - ${year + 1}`;
    } else {
      currentFinancialYear = `${year - 1} - ${year}`;
    }

    // Set current financial year as expanded if it exists in our data
    if (groupedByYear[currentFinancialYear]) {
      setExpandedYears(new Set([currentFinancialYear]));
    } else if (Object.keys(groupedByYear).length > 0) {
      // If current financial year doesn't exist, expand the most recent one
      const years = Object.keys(groupedByYear).sort().reverse();
      setExpandedYears(new Set([years[0]]));
    }
  }, [groupedByYear]);

  // Handle printing an invoice
  const handlePrintInvoice = invoice => {
    toastService.info(`Printing invoice for ${invoice.buyer}`);
    if (onPrintInvoice) {
      onPrintInvoice(invoice);
    }
  };

  // Handle deleting an invoice
  const handleDeleteInvoice = invoice => {
    if (onDeleteInvoice) {
      onDeleteInvoice(invoice.id);
    }
  };

  return (
    <>
      {validItems.length > 0 ? (
        <div className={`space-y-6 sm:space-y-8 ${className}`}>
          {Object.entries(groupedByYear).map(([year, yearGroup]) => (
            <div key={year} className="mb-6">
              <button
                className="flex w-full flex-col"
                onClick={() => toggleYear(year)}
              >
                <div className="flex items-center justify-between rounded-t-md border border-gray-200 bg-white p-4 dark:border-[#ffffff1a] dark:bg-black">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {year} Financial Year
                  </h2>
                  <Icon
                    name={
                      expandedYears.has(year) ? 'expand_less' : 'expand_more'
                    }
                    className="text-gray-500 dark:text-gray-400"
                  />
                </div>

                {/* Year Summary */}
                <div className="grid w-full grid-cols-3 rounded-b-md border-x border-b border-gray-200 bg-white dark:border-[#ffffff1a] dark:bg-black">
                  {/* Investment */}
                  <div className="flex flex-col items-center p-4">
                    <span className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:text-sm">
                      Investment
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white sm:text-base">
                      ${yearGroup.totalInvestment.toFixed(2)}
                    </span>
                  </div>

                  {/* Sale */}
                  <div className="flex flex-col items-center border-x border-gray-200 p-4 dark:border-[#ffffff1a]">
                    <span className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:text-sm">
                      Sale
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white sm:text-base">
                      ${yearGroup.totalSale.toFixed(2)}
                    </span>
                  </div>

                  {/* Profit */}
                  <div className="flex flex-col items-center p-4">
                    <span className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:text-sm">
                      Profit
                    </span>
                    <span
                      className={`text-sm font-medium sm:text-base ${yearGroup.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {yearGroup.totalProfit >= 0 ? '' : '-'}$
                      {Math.abs(yearGroup.totalProfit).toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Invoices for the Year */}
              {expandedYears.has(year) && (
                <div className="mt-4 space-y-4">
                  {yearGroup.invoices
                    .filter(
                      invoice =>
                        invoice && invoice.cards && invoice.cards.length > 0
                    )
                    .map(invoice => {
                      const cards = invoice.cards || [];

                      return (
                        <div
                          key={
                            invoice.id ||
                            Math.random().toString(36).substring(2, 15)
                          }
                          className="overflow-hidden rounded-md border border-gray-200 bg-white dark:border-[#ffffff1a] dark:bg-black"
                        >
                          {/* Invoice Header */}
                          <InvoiceHeader
                            title={invoice.buyer || 'Unknown Buyer'}
                            subtitle={formatDateSafely(invoice.dateSold)}
                            totalInvestment={invoice.totalInvestment}
                            totalSale={invoice.totalSale}
                            totalProfit={invoice.totalProfit}
                            isExpanded={expandedInvoices.has(invoice.id)}
                            onToggle={() => toggleInvoice(invoice.id)}
                            onPrint={() => handlePrintInvoice(invoice)}
                            onDelete={() => handleDeleteInvoice(invoice)}
                            cardCount={cards.length}
                            formatUserCurrency={formatUserCurrency}
                            originalCurrencyCode={originalCurrencyCode}
                          />

                          {/* Invoice Cards */}
                          <div
                            className={`accordion-content ${expandedInvoices.has(invoice.id) ? 'open' : ''}`}
                          >
                            {expandedInvoices.has(invoice.id) && (
                              <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                                {/* Only load images if this invoice has been marked for loading */}
                                {cards.map(card => (
                                  <InvoiceCard
                                    key={
                                      card.id ||
                                      card.slabSerial ||
                                      Math.random()
                                        .toString(36)
                                        .substring(2, 11)
                                    }
                                    card={card}
                                    getImageUrl={
                                      loadedInvoiceImages.has(invoice.id)
                                        ? getCardImageUrl
                                        : null
                                    }
                                    lazyLoad={true}
                                    hideSoldImages={true}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Icon
            name="receipt_long"
            size="xl"
            className="mb-4 text-gray-400 dark:text-gray-600"
          />
          <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">
            No Sold Items
          </h3>
          <p className="max-w-md text-center text-gray-600 dark:text-gray-400">
            You haven't sold any cards yet. When you do, they'll appear here.
          </p>
        </div>
      )}
    </>
  );
};

SoldItemsView.propTypes = {
  /** Array of sold items grouped by invoice */
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      buyer: PropTypes.string,
      dateSold: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      cards: PropTypes.array,
      totalInvestment: PropTypes.number,
      totalSale: PropTypes.number,
      totalProfit: PropTypes.number,
    })
  ),
  /** Function to get image URL for a card */
  getCardImageUrl: PropTypes.func,
  /** Handler for printing an invoice */
  onPrintInvoice: PropTypes.func,
  /** Handler for deleting an invoice */
  onDeleteInvoice: PropTypes.func,
  /** Function to format dates */
  formatDate: PropTypes.func,
  /** Additional class names */
  className: PropTypes.string,
  /** Currency formatting function from UserPreferencesContext */
  formatUserCurrency: PropTypes.func,
  /** Original currency code for the amounts being formatted */
  originalCurrencyCode: PropTypes.string,
};

export default SoldItemsView;
