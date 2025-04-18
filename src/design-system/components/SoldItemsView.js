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
  className = ''
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
    <div className={`min-h-screen pt-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-[#0F0F0F] text-gray-900 dark:text-white ${className}`}>
      {
        validItems.length > 0 ? (
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(groupedByYear).map(([year, yearGroup]) => (
              <div key={year} className="mb-6">
                <button 
                  className="w-full flex flex-col"
                  onClick={() => toggleYear(year)}
                >
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1B2131] rounded-t-md border border-gray-200 dark:border-[#ffffff1a]">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {year} Financial Year
                    </h2>
                    <Icon 
                      name={expandedYears.has(year) ? "expand_less" : "expand_more"} 
                      className="text-gray-500 dark:text-gray-400" 
                    />
                  </div>

                  {/* Year Summary */}
                  <div className="grid grid-cols-3 w-full bg-white dark:bg-[#1B2131] rounded-b-md border-x border-b border-gray-200 dark:border-[#ffffff1a]">
                    {/* Investment */}
                    <div className="py-4 px-4 flex flex-col items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Investment</span>
                      <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">${yearGroup.totalInvestment.toFixed(2)}</span>
                    </div>
                    
                    {/* Sale */}
                    <div className="py-4 px-4 flex flex-col items-center border-x border-gray-200 dark:border-[#ffffff1a]">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Sale</span>
                      <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">${yearGroup.totalSale.toFixed(2)}</span>
                    </div>
                    
                    {/* Profit */}
                    <div className="py-4 px-4 flex flex-col items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Profit</span>
                      <span className={`text-sm sm:text-base font-medium ${yearGroup.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {yearGroup.totalProfit >= 0 ? '' : '-'}${Math.abs(yearGroup.totalProfit).toFixed(2)}
                      </span>
                    </div>
                  </div>

                </button>

                {/* Invoices for the Year */}
                {expandedYears.has(year) && (
                  <div className="mt-4 space-y-4">
                    {yearGroup.invoices
                      .filter(invoice => invoice && invoice.cards && invoice.cards.length > 0)
                      .map((invoice) => {
                        const cards = invoice.cards || [];
                        
                        return (
                          <div 
                            key={invoice.id || Math.random().toString(36).substring(2, 15)} 
                            className="bg-white dark:bg-[#1B2131] rounded-md border border-gray-200 dark:border-[#ffffff1a] overflow-hidden"
                          >
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
                            <div className={`accordion-content ${expandedInvoices.has(invoice.id) ? 'open' : ''}`}>
                              {expandedInvoices.has(invoice.id) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
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
            <Icon name="receipt_long" size="xl" className="text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Sold Items</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              You haven't sold any cards yet. When you do, they'll appear here.
            </p>
          </div>
        )
      }
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
