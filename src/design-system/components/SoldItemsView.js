import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
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
  formatDate,
  className = '',
  ...props 
}) => {
  const { isDarkMode } = useTheme();
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());

  // Filter out invalid or empty invoice entries
  const validItems = useMemo(() => {
    return items.filter(invoice => 
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
    const getFinancialYear = (dateStr) => {
      try {
        const date = new Date(dateStr);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        // Financial year runs from July to June
        if (month >= 6) { // July (6) onwards
          return `${year} - ${year + 1}`;
        } else {
          return `${year - 1} - ${year}`;
        }
      } catch (error) {
        console.error("Error calculating financial year for date:", dateStr, error);
        return "Unknown Year";
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
          totalProfit: 0
        };
      }
      
      grouped[financialYear].invoices.push(invoice);
      grouped[financialYear].totalInvestment += Number(invoice.totalInvestment) || 0;
      grouped[financialYear].totalSale += Number(invoice.totalSale) || 0;
      grouped[financialYear].totalProfit += Number(invoice.totalProfit) || 0;
    });
    
    // Sort invoices by date (newest first)
    Object.values(grouped).forEach(yearGroup => {
      yearGroup.invoices.sort((a, b) => {
        return new Date(b.dateSold) - new Date(a.dateSold);
      });
    });
    
    return grouped;
  }, [validItems]);

  // Toggle expanded state for financial years
  const toggleYear = (year) => {
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
  const toggleInvoice = (invoiceId) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  // Expand 'current' financial year by default on first render
  useEffect(() => {
    // Find the current financial year
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let currentFinancialYear;
    if (month >= 6) { // July onwards
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
  const handlePrintInvoice = (invoice) => {
    console.log("Print invoice requested:", invoice);
    toastService.info(`Printing invoice for ${invoice.buyer}`);
    if (onPrintInvoice) {
      onPrintInvoice(invoice);
    }
  };

  return (
    <div className={`min-h-screen pt-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#10121A] text-gray-900 dark:text-white ${className}`} {...props}>
      {validItems.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No sold items found</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">When you sell cards from your collection, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Financial Years */}
          {Object.entries(groupedByYear).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yearGroup]) => (
            <div key={year} className="mb-6">
              {/* Year Header */}
              <button
                onClick={() => toggleYear(year)}
                className="w-full flex flex-col overflow-hidden"
              >
                {/* Main header with clean background */}
                <div className="w-full p-4 sm:py-4 sm:px-6 flex items-center justify-between bg-white dark:bg-[#1B2131] rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-gray-600 dark:text-gray-400">
                      calendar_today
                    </span>
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      Financial Year {year}
                    </h2>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-base sm:text-lg font-medium ${yearGroup.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {yearGroup.totalProfit >= 0 ? '' : '-'}${Math.abs(yearGroup.totalProfit).toFixed(2)}
                    </span>
                    <span className="material-icons text-gray-400 ml-2">
                      {expandedYears.has(year) ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>
                
                {/* Stats summary */}
                <div className={`grid grid-cols-3 w-full bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700 mt-px`}>
                  {/* Investment */}
                  <div className="py-2 px-4 flex flex-col items-center border-r border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Investment</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">${yearGroup.totalInvestment.toFixed(2)}</span>
                  </div>
                  
                  {/* Sale */}
                  <div className="py-2 px-4 flex flex-col items-center border-r border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Sale</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">${yearGroup.totalSale.toFixed(2)}</span>
                  </div>
                  
                  {/* Profit */}
                  <div className="py-2 px-4 flex flex-col items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Profit</span>
                    <span className={`text-sm font-medium ${yearGroup.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {yearGroup.totalProfit >= 0 ? '' : '-'}${Math.abs(yearGroup.totalProfit).toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Invoices for the Year */}
              {expandedYears.has(year) && (
                <div className={`mt-1 space-y-2 bg-white dark:bg-[#1B2131] p-4 rounded-md`}>
                  {yearGroup.invoices
                    .filter(invoice => invoice && invoice.cards && invoice.cards.length > 0)
                    .map((invoice) => {
                      const cards = invoice.cards || [];
                      
                      return (
                        <div key={invoice.id || Math.random().toString(36).substring(2, 15)} className="bg-white dark:bg-[#1B2131]">
                          {/* Invoice Header */}
                          <InvoiceHeader
                            title={invoice.buyer || 'Unknown Buyer'}
                            subtitle={formatDate ? formatDate(invoice.dateSold) : invoice.dateSold}
                            totalInvestment={invoice.totalInvestment}
                            totalSale={invoice.totalSale}
                            totalProfit={invoice.totalProfit}
                            isExpanded={expandedInvoices.has(invoice.id)}
                            onToggle={() => toggleInvoice(invoice.id)}
                            onPrint={() => handlePrintInvoice(invoice)}
                            cardCount={cards.length}
                          />
                          
                          {/* Invoice Cards */}
                          {expandedInvoices.has(invoice.id) && (
                            <div className="space-y-2 p-4 sm:p-6">
                              {cards.map((card) => (
                                <InvoiceCard
                                  key={card.id || card.slabSerial || Math.random().toString(36).substring(2, 11)}
                                  card={card}
                                  getImageUrl={getCardImageUrl}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

SoldItemsView.propTypes = {
  /** Array of sold items grouped by invoice */
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    buyer: PropTypes.string,
    dateSold: PropTypes.string,
    cards: PropTypes.array,
    totalInvestment: PropTypes.number,
    totalSale: PropTypes.number,
    totalProfit: PropTypes.number
  })),
  /** Function to get image URL for a card */
  getCardImageUrl: PropTypes.func,
  /** Handler for printing an invoice */
  onPrintInvoice: PropTypes.func,
  /** Function to format dates */
  formatDate: PropTypes.func,
  /** Additional class names */
  className: PropTypes.string
};

export default SoldItemsView;
