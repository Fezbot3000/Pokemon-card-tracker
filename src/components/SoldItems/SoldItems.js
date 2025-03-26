import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/currencyAPI';
import { db } from '../../services/db';
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

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1B2131] p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-700 dark:text-gray-400">TOTAL INVESTMENT</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totals.totalInvestment)}</div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-700 dark:text-gray-400">TOTAL SALE VALUE</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totals.totalValue)}</div>
        </div>
        <div className="bg-white dark:bg-[#1B2131] p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-700 dark:text-gray-400">TOTAL PROFIT</div>
          <div className={`text-2xl font-semibold mt-1 ${totals.totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
            {formatCurrency(totals.totalProfit)}
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by name, player, serial number, or buyer..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700/50 
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {soldCards.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-icons text-5xl mb-4 text-gray-500 dark:text-gray-600">inventory_2</span>
          <h3 className="text-xl font-medium mb-2 text-gray-900">No sold cards found</h3>
          <p className="text-gray-700">When you sell cards from your collection, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedInvoices.map((invoice, index) => (
            <div
              key={invoice.id}
              className="bg-white dark:bg-[#1B2131] rounded-xl shadow-sm overflow-hidden"
            >
              {/* Invoice Header */}
              <div className="p-6 border-b border-gray-300 dark:border-gray-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Sold to {invoice.buyer}
                      </h3>
                      <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700">
                        {invoice.id}
                      </span>
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
                        className="ml-2 px-3 py-1 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1"
                      >
                        {({ blob, url, loading, error }) => (
                          <>
                            <span className="material-icons text-sm">download</span>
                            {loading ? 'Generating...' : 'Download Invoice'}
                          </>
                        )}
                      </PDFDownloadLink>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-400">
                      {new Date(invoice.dateSold).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">Total Investment</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalInvestment)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">Total Sale</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalSale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">Total Profit</div>
                      <div className={`font-medium ${invoice.totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        {formatCurrency(invoice.totalProfit)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {invoice.cards.map(card => (
                  <div
                    key={`${card.slabSerial}-${card.dateSold}`}
                    className="group relative bg-gray-100 dark:bg-[#151821] rounded-xl overflow-hidden border border-gray-300 dark:border-transparent"
                  >
                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-800">
                      {cardImages[card.slabSerial] ? (
                        <img 
                          src={cardImages[card.slabSerial]} 
                          alt={`${card.player} - ${card.card}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-icons text-4xl text-gray-500 dark:text-gray-600">image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {card.card}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-400 mb-4">
                        {card.player}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-700 dark:text-gray-400">Investment</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(card.investmentAUD)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 dark:text-gray-400">Sale Value</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(card.finalValueAUD)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 dark:text-gray-400">Profit</div>
                          <div className={`font-medium ${card.finalProfitAUD >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                            {formatCurrency(card.finalProfitAUD)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoldItems; 