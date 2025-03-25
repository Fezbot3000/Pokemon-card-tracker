import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../services/db';
import { formatCurrency } from '../../utils/formatters';
import jsPDF from 'jspdf';
import { showToast } from '../../utils/toast';

const SoldItems = () => {
  const { isDarkMode } = useTheme();
  const [soldCards, setSoldCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSold: 0,
    totalProfit: 0,
    averageProfit: 0,
    bestSale: null
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  // Function to group cards by transaction
  const groupCardsByTransaction = (cards) => {
    const grouped = {};
    cards.forEach(card => {
      const key = `${card.buyer}_${card.dateSold}`;
      if (!grouped[key]) {
        grouped[key] = {
          buyer: card.buyer,
          dateSold: card.dateSold,
          cards: [],
          totalSold: 0,
          totalInvestment: 0,
          totalProfit: 0
        };
      }
      grouped[key].cards.push(card);
      grouped[key].totalSold += card.soldPriceAUD;
      grouped[key].totalInvestment += card.investmentAUD;
      grouped[key].totalProfit += card.profit;
    });
    return Object.values(grouped).sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));
  };

  // Function to get financial year from date
  const getFinancialYear = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth();
    const year = date.getFullYear();
    // If month is July or later, it's the next financial year
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Function to group transactions by financial year
  const groupTransactionsByFinancialYear = (transactions) => {
    const grouped = {};
    transactions.forEach(transaction => {
      const fy = getFinancialYear(transaction.dateSold);
      if (!grouped[fy]) {
        grouped[fy] = {
          transactions: [],
          totalSold: 0,
          totalInvestment: 0,
          totalProfit: 0,
          isOpen: true // Default to open
        };
      }
      grouped[fy].transactions.push(transaction);
      grouped[fy].totalSold += transaction.totalSold;
      grouped[fy].totalInvestment += transaction.totalInvestment;
      grouped[fy].totalProfit += transaction.totalProfit;
    });
    
    // Convert to array and sort by financial year (most recent first)
    return Object.entries(grouped)
      .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
      .map(([year, data]) => ({
        year,
        ...data
      }));
  };

  // State for tracking which accordions are open
  const [openAccordions, setOpenAccordions] = useState({});

  // Toggle accordion
  const toggleAccordion = (year) => {
    setOpenAccordions(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // Function to calculate metrics
  const calculateMetrics = (cards) => {
    if (!cards.length) return {
      totalSold: 0,
      totalProfit: 0,
      averageProfit: 0,
      bestSale: null
    };

    const totalProfit = cards.reduce((sum, card) => sum + card.profit, 0);
    const bestSale = cards.reduce((best, card) => 
      (!best || card.profit > best.profit) ? card : best
    , null);

    return {
      totalSold: cards.length,
      totalProfit,
      averageProfit: totalProfit / cards.length,
      bestSale
    };
  };

  useEffect(() => {
    const loadSoldCards = async () => {
      setIsLoading(true);
      try {
        const cards = await db.getSoldCards();
        setSoldCards(cards);
        setMetrics(calculateMetrics(cards));
      } catch (error) {
        console.error('Error loading sold cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSoldCards();
  }, []);

  const handleDeleteClick = (transaction) => {
    setCardToDelete(transaction);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;

    try {
      // Delete all cards in the transaction
      const deletePromises = cardToDelete.cards.map(card => {
        if (!card.id) {
          console.error('Card missing ID:', card);
          return Promise.reject(new Error('Card missing ID'));
        }
        return db.deleteSoldCard(card.id);
      });

      // Wait for all deletions to complete
      await Promise.all(deletePromises);
      
      // Update local state by removing all cards from this transaction
      const updatedCards = soldCards.filter(card => 
        !(card.buyer === cardToDelete.buyer && card.dateSold === cardToDelete.dateSold)
      );
      setSoldCards(updatedCards);
      
      // Recalculate metrics
      setMetrics(calculateMetrics(updatedCards));
      
      // Show success toast
      showToast('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast(error.message || 'Failed to delete transaction', 'error');
    } finally {
      setShowDeleteModal(false);
      setCardToDelete(null);
    }
  };

  // Function to handle invoice download
  const handleDownloadInvoice = (transaction) => {
    const doc = new jsPDF();
    
    // Set initial y position
    let y = 20;
    const startX = 25;
    const pageWidth = 190;
    const descriptionWidth = 80;
    
    // Helper function to split text into lines and return height needed
    const calculateTextHeight = (text, maxWidth) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines.length * 5; // 5 units per line
    };
    
    // Add company header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('Pokemon Card Sales', 105, y, { align: 'center' });
    
    // Add invoice header
    y += 20;
    doc.setFontSize(12);
    doc.text('INVOICE', 105, y, { align: 'center' });
    
    // Add date and buyer info
    y += 20;
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(transaction.dateSold).toLocaleDateString()}`, startX, y);
    doc.text(`Buyer: ${transaction.buyer}`, startX, y + 7);
    
    // Add items header
    y += 25;
    doc.setFillColor(44, 62, 80);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 20, 8, 'F');
    doc.text('Item Description', startX, y + 6);
    doc.text('Investment', 110, y + 6);
    doc.text('Sold For', 140, y + 6);
    doc.text('Profit', 170, y + 6);
    
    // Add items
    y += 15;
    doc.setTextColor(44, 62, 80);
    transaction.cards.forEach(card => {
      // Calculate height needed for this card entry
      const description = `${card.card} (Serial: ${card.serialNumber || 'N/A'})`;
      const textHeight = calculateTextHeight(description, descriptionWidth);
      
      // Check if we need a new page
      if (y + textHeight > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(10);
      // Split long text into multiple lines
      const lines = doc.splitTextToSize(description, descriptionWidth);
      doc.text(lines, startX, y);
      
      // Right align numbers, vertically centered with the text
      const numberY = y + (textHeight / 2) - 2; // Center numbers with the text block
      doc.text(formatCurrency(card.investmentAUD), 130, numberY, { align: 'right' });
      doc.text(formatCurrency(card.soldPriceAUD), 160, numberY, { align: 'right' });
      doc.text(formatCurrency(card.profit), 190, numberY, { align: 'right' });
      
      // Move to next item with proper spacing
      y += Math.max(textHeight + 5, 10); // At least 10 units between items
    });
    
    // Add summary
    y += 10;
    doc.setDrawColor(44, 62, 80);
    doc.line(20, y, pageWidth, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', startX, y);
    y += 8;
    
    // Right-aligned summary section
    doc.setFont(undefined, 'normal');
    doc.text('Total Investment:', 130, y, { align: 'right' });
    doc.text(formatCurrency(transaction.totalInvestment), 190, y, { align: 'right' });
    y += 7;
    
    doc.text('Total Sale:', 130, y, { align: 'right' });
    doc.text(formatCurrency(transaction.totalSold), 190, y, { align: 'right' });
    y += 7;
    
    doc.setFont(undefined, 'bold');
    doc.text('Total Profit:', 130, y, { align: 'right' });
    const profitColor = transaction.totalProfit >= 0 ? [46, 204, 113] : [231, 76, 60];
    doc.setTextColor(...profitColor);
    doc.text(formatCurrency(transaction.totalProfit), 190, y, { align: 'right' });
    
    // Add footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    
    // Save the PDF
    const fileName = `invoice-${transaction.buyer}-${new Date(transaction.dateSold).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    showToast('Invoice downloaded successfully', 'success');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const groupedTransactions = groupCardsByTransaction(soldCards);
  const groupedByFinancialYear = groupTransactionsByFinancialYear(groupedTransactions);

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Sold Cards</h2>
      
      <div className="space-y-4">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Cards Sold</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.totalSold}</p>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Total Profit</h3>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-500">{formatCurrency(metrics.totalProfit)}</p>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Average Profit per Card</h3>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-500">{formatCurrency(metrics.averageProfit)}</p>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm text-gray-600 dark:text-gray-400">Best Sale</h3>
            {metrics.bestSale && (
              <>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.bestSale.player} {metrics.bestSale.card}</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-500">{formatCurrency(metrics.bestSale.profit)}</p>
              </>
            )}
          </div>
        </div>

        {/* Financial Year Accordions */}
        {groupedByFinancialYear.map((fyGroup) => (
          <div key={fyGroup.year} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1B2131]">
            {/* Financial Year Header */}
            <button
              onClick={() => toggleAccordion(fyGroup.year)}
              className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#242B3D] transition-colors`}
            >
              <div className="flex items-center gap-4">
                <span className={`material-icons transform transition-transform ${
                  openAccordions[fyGroup.year] ? 'rotate-180' : ''
                } text-gray-600 dark:text-gray-400`}>
                  expand_more
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Financial Year {fyGroup.year}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fyGroup.transactions.length} transaction{fyGroup.transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Sales</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(fyGroup.totalSold)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Profit</div>
                  <div className={`font-medium ${fyGroup.totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                    {formatCurrency(fyGroup.totalProfit)}
                  </div>
                </div>
              </div>
            </button>

            {/* Transactions */}
            <div className={`transition-all duration-300 ${
              openAccordions[fyGroup.year] ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {fyGroup.transactions.map((transaction, index) => (
                  <div 
                    key={`${transaction.buyer}_${transaction.dateSold}_${index}`} 
                    className={`${
                      isDarkMode 
                        ? `${index % 2 === 0 ? 'bg-[#1B2131]' : 'bg-[#242B3D]'}` 
                        : `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                    }`}
                  >
                    {/* Transaction Header */}
                    <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`flex justify-between items-start mb-4`}>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Sold to {transaction.buyer}
                        </h3>
                        <div className="flex items-center gap-4">
                          <p className={`text-sm px-4 py-2 rounded-full ${
                            isDarkMode 
                              ? 'text-gray-400 bg-[#0B0F19]' 
                              : 'text-gray-600 bg-gray-100'
                          }`}>
                            {new Date(transaction.dateSold).toLocaleDateString()}
                          </p>
                          <button
                            onClick={() => handleDownloadInvoice(transaction)}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                            title="Download Invoice"
                          >
                            <span className="material-icons">receipt</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete Transaction"
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex-1"></div>
                        <div className="flex gap-[15px] min-w-[600px]">
                          <div className="flex flex-col items-end w-[180px]">
                            <span className="text-gray-600 dark:text-gray-400 mb-1">Total Investment</span>
                            <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(transaction.totalInvestment)}</span>
                          </div>
                          <div className="flex flex-col items-end w-[180px]">
                            <span className="text-gray-600 dark:text-gray-400 mb-1">Total Sale</span>
                            <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(transaction.totalSold)}</span>
                          </div>
                          <div className="flex flex-col items-end w-[180px]">
                            <span className="text-gray-600 dark:text-gray-400 mb-1">Total Profit</span>
                            <span className={`font-medium ${transaction.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(transaction.totalProfit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Cards */}
                    <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {transaction.cards.map((card) => (
                        <div key={card.id} className={`p-6 transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-[#2C354A]' 
                            : 'hover:bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <h4 className="text-gray-900 dark:text-white font-medium">{card.player} {card.card}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Serial Number: {card.serialNumber || 'N/A'}</p>
                            </div>
                            <div className="flex gap-[15px] min-w-[600px]">
                              <div className="flex flex-col items-end w-[180px]">
                                <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">Investment</span>
                                <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(card.investmentAUD)}</span>
                              </div>
                              <div className="flex flex-col items-end w-[180px]">
                                <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">Sold For</span>
                                <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(card.soldPriceAUD)}</span>
                              </div>
                              <div className="flex flex-col items-end w-[180px]">
                                <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">Profit</span>
                                <span className={`font-medium ${card.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatCurrency(card.profit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl shadow-lg bg-[#1B2131]">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Delete Transaction</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this entire transaction? This will remove all cards sold to {cardToDelete?.buyer} on {new Date(cardToDelete?.dateSold).toLocaleDateString()}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-400 hover:text-gray-200"
                onClick={() => {
                  setShowDeleteModal(false);
                  setCardToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={handleDeleteConfirm}
              >
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoldItems; 