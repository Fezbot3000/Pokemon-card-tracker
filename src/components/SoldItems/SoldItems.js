import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/currencyAPI';
import db from '../../services/db';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '../InvoicePDF';

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
    
    return Object.values(invoicesMap);
  };

  useEffect(() => {
    const loadSoldCards = () => {
      const savedCards = JSON.parse(localStorage.getItem('soldCards') || '[]');
      setSoldCards(savedCards);
    };

    loadSoldCards();
    window.addEventListener('storage', loadSoldCards);
    return () => window.removeEventListener('storage', loadSoldCards);
  }, []);

  const filteredCards = soldCards.filter(card => 
    card.card?.toLowerCase().includes(filter.toLowerCase()) ||
    card.player?.toLowerCase().includes(filter.toLowerCase()) ||
    card.slabSerial?.toLowerCase().includes(filter.toLowerCase()) ||
    card.buyer?.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedInvoices = groupCardsByInvoice(filteredCards).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortField === 'dateSold') {
      const dateA = new Date(aValue);
      const dateB = new Date(bValue);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return sortDirection === 'asc' 
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

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
  const groupedInvoices = useMemo(() => {
    const groups = {};
    const invoices = groupCardsByInvoice(
      soldCards.filter(card =>
        card.card?.toLowerCase().includes(filter.toLowerCase()) ||
        card.player?.toLowerCase().includes(filter.toLowerCase()) ||
        card.slabSerial?.toLowerCase().includes(filter.toLowerCase()) ||
        card.buyer?.toLowerCase().includes(filter.toLowerCase())
      )
    );

    // Sort invoices by date (newest first)
    invoices.sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));

    // Group by financial year
    invoices.forEach(invoice => {
      const fy = getFinancialYear(invoice.dateSold);
      if (!groups[fy]) {
        groups[fy] = {
          invoices: [],
          totalInvestment: 0,
          totalSale: 0,
          totalProfit: 0
        };
      }
      groups[fy].invoices.push(invoice);
      groups[fy].totalInvestment += invoice.totalInvestment;
      groups[fy].totalSale += invoice.totalSale;
      groups[fy].totalProfit += invoice.totalProfit;
    });

    return groups;
  }, [soldCards, filter]);

  // Toggle financial year expansion
  const toggleYear = (year) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  // Toggle invoice expansion
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
    return Object.values(groupedInvoices).reduce((acc, yearGroup) => ({
      totalInvestment: acc.totalInvestment + yearGroup.totalInvestment,
      totalValue: acc.totalValue + yearGroup.totalSale,
      totalProfit: acc.totalProfit + yearGroup.totalProfit
    }), { totalInvestment: 0, totalValue: 0, totalProfit: 0 });
  }, [groupedInvoices]);

  return (
    <div className="space-y-4 sold-items-mobile-fixes">
      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white dark:bg-[#1B2131] rounded-lg p-2.5 sm:p-3 shadow-sm flex flex-col">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">PAID</div>
          <div className="text-base sm:text-3xl text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.totalInvestment, true)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-lg p-2.5 sm:p-3 shadow-sm flex flex-col">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">SALE VALUE</div>
          <div className="text-base sm:text-3xl text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.totalValue, true)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-lg p-2.5 sm:p-3 shadow-sm flex flex-col">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">PROFIT</div>
          <div className={`text-base sm:text-3xl font-medium ${totals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(Math.abs(totals.totalProfit), true, totals.totalProfit < 0 ? '-' : '')}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] rounded-lg p-2.5 sm:p-3 shadow-sm flex flex-col">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">SOLD CARDS</div>
          <div className="text-base sm:text-3xl text-gray-900 dark:text-white font-medium flex items-center justify-start gap-0.5 sm:gap-1">
            <span className="material-icons text-xs sm:text-sm text-gray-600 dark:text-gray-300">style</span>
            {filteredCards.length}
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by name, player, serial number, or buyer..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-11 px-3 py-2 rounded-xl bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary shadow-sm
                       placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            />
          </div>
        </div>
      </div>

      {soldCards.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <span className="material-icons text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">No sold cards found</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">When you sell cards from your collection, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedInvoices)
            .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
            .map(([year, yearGroup]) => (
              <div key={year} className="bg-gray-50 dark:bg-[#151921] rounded-xl shadow-sm overflow-hidden">
                {/* Financial Year Header - With Sale Value */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full p-4 sm:p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1B2131]"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white text-left">
                      FY {year}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 sm:hidden">Sale Value:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(yearGroup.totalSale, true)}
                      </span>
                    </div>
                  </div>
                  <span className="material-icons text-gray-500">
                    {expandedYears.has(year) ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {/* Invoices for the Year */}
                {expandedYears.has(year) && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700/50">
                    {yearGroup.invoices.map((invoice) => (
                      <div key={invoice.id} className="bg-gray-50 dark:bg-[#151921]">
                        {/* Invoice Header - With Sale Value */}
                        <button
                          onClick={() => toggleInvoice(invoice.id)}
                          className="w-full p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#1B2131]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
                            <div className="flex flex-col sm:flex-wrap sm:items-center gap-2">
                              <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-left">
                                {invoice.buyer}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700/50">
                                  {invoice.id}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Date(invoice.dateSold).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col mt-2 sm:mt-0">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Sale Value:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(invoice.totalSale, true)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0">
                            <PDFDownloadLink
                              document={
                                <InvoicePDF
                                  buyer={invoice.buyer}
                                  date={new Date(invoice.dateSold).toLocaleDateString()}
                                  cards={invoice.cards}
                                  invoiceId={invoice.id}
                                  profile={profile}
                                />
                              }
                              fileName={`invoice-${invoice.id}.pdf`}
                              className="btn btn-sm btn-primary flex-1 sm:flex-initial"
                            >
                              {({ blob, url, loading, error }) => (
                                <div className="flex items-center justify-center w-full gap-1">
                                  <span className="material-icons text-sm">download</span>
                                  <span>{loading ? 'Generating...' : 'Invoice'}</span>
                                </div>
                              )}
                            </PDFDownloadLink>
                            <span className="material-icons text-gray-500">
                              {expandedInvoices.has(invoice.id) ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </button>

                        {/* Invoice Cards */}
                        {expandedInvoices.has(invoice.id) && (
                          <div className="space-y-2 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700/50">
                            {invoice.cards.map((card) => (
                              <div
                                key={card.slabSerial}
                                className="bg-gray-50 dark:bg-[#1B2131] rounded-xl p-3 flex items-center gap-4"
                              >
                                {/* Card Image */}
                                <div className="w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0">
                                  {cardImages[card.slabSerial] ? (
                                    <img
                                      src={cardImages[card.slabSerial]}
                                      alt={`${card.player} - ${card.card}`}
                                      className="w-full h-full object-contain rounded-lg"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                                      <span className="material-icons text-gray-400 dark:text-gray-600">image</span>
                                    </div>
                                  )}
                                </div>

                                {/* Card Details - Improved mobile layout with aligned amounts */}
                                <div className="flex-1 min-w-0">
                                  <div className="mb-2">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={card.card}>
                                      {card.card}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                      {card.player}
                                    </p>
                                  </div>

                                  <div className="flex flex-col space-y-1">
                                    <div className="flex justify-between items-center">
                                      <div className="text-xs text-gray-600 dark:text-gray-400">Profit:</div>
                                      <div className={`text-sm font-medium ${card.finalProfitAUD >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatCurrency(Math.abs(card.finalProfitAUD), true, card.finalProfitAUD < 0 ? '-' : '')}
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="text-xs text-gray-600 dark:text-gray-400">Paid:</div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(card.investmentAUD, true)}
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="text-xs text-gray-600 dark:text-gray-400">Sold:</div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(card.finalValueAUD, true)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default SoldItems; 