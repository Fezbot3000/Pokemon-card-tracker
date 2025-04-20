import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchEbayMarketplaceInsights } from '../services/ebaySales';
import { toast } from 'react-hot-toast';

const EbaySales = ({ card, className = '', onUpdateValue }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [averagePrice, setAveragePrice] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1.5);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSales([]);
    setUsingMockData(false);
    setAveragePrice(0);
    
    if (!card) return;
    
    const fetchData = async () => {
      try {
        console.log(`[EbaySales] Fetching data for ${card.name}`);
        
        // Use the new Marketplace Insights API
        const result = await fetchEbayMarketplaceInsights(card);
        
        if (isMounted) {
          if (result && result.salesData && result.salesData.length > 0) {
            console.log(`[EbaySales] Successfully fetched ${result.salesData.length} items`);
            setSales(result.salesData);
            setAveragePrice(result.averagePrice);
            setExchangeRate(result.exchangeRate);
          } else {
            console.log('[EbaySales] No items returned, using mock data');
            const mockData = generateMockSales(card);
            setSales(mockData.salesData);
            setAveragePrice(mockData.averagePrice);
            setUsingMockData(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.log('[EbaySales] Error fetching data:', err.message);
          setError(err.message || 'Failed to fetch eBay sales');
          
          // Use mock data when API fails
          console.log('[EbaySales] Using mock data as fallback');
          const mockData = generateMockSales(card);
          setSales(mockData.salesData);
          setAveragePrice(mockData.averagePrice);
          setUsingMockData(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [card]);

  // Generate mock sales data based on card details
  const generateMockSales = (card) => {
    const basePrice = parseFloat(card.value) || (Math.floor(Math.random() * 100) + 50); // Use card value or random
    const today = new Date();
    const mockSales = [];
    
    // Create 5 mock sales
    for (let i = 0; i < 5; i++) {
      const saleDate = new Date(today);
      saleDate.setDate(today.getDate() - (i * 7)); // One sale every week back
      
      // Price varies slightly for each sale
      const priceVariation = Math.floor(Math.random() * 20) - 10; // -$10 to +$10
      const price = basePrice + priceVariation;
      
      mockSales.push({
        title: `${card.year || '1999'} ${card.set || 'Pokemon'} ${card.name || 'Card'} ${card.grade ? `PSA ${card.grade}` : 'NM'}`,
        price: {
          value: price.toFixed(2),
          currency: 'AUD'
        },
        soldDate: saleDate.toISOString(),
        condition: card.condition || (card.grade ? `PSA ${card.grade}` : 'Near Mint'),
        legacyItemId: `mock-${i}-${Date.now()}`,
        itemWebUrl: `https://www.ebay.com.au/itm/mock-item-${i}`
      });
    }
    
    return {
      salesData: mockSales,
      averagePrice: basePrice
    };
  };

  // Handle updating the card's value
  const handleUpdateValue = () => {
    if (onUpdateValue && averagePrice > 0) {
      onUpdateValue(averagePrice);
      toast.success(`Updated card value to $${averagePrice} AUD`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-AU', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Format price for display
  const formatPrice = (price, currency) => {
    if (!price) return '-';
    
    // Format as AUD
    return new Intl.NumberFormat('en-AU', { 
      style: 'currency', 
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(price);
  };

  if (loading) {
    return <div className={`p-4 text-center ${className}`}>Loading eBay sales…</div>;
  }
  
  if (error && !usingMockData) {
    return <div className={`p-4 bg-red-100 text-red-700 rounded ${className}`}>Error: {error}</div>;
  }
  
  if (!sales.length) {
    return <div className={`p-4 bg-gray-100 text-gray-500 rounded ${className}`}>No eBay sales found for this card.</div>;
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Recent eBay Sales</h3>
        {averagePrice > 0 && (
          <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-lg">
            Average: {formatPrice(averagePrice, 'AUD')}
          </span>
        )}
      </div>
      
      {usingMockData && (
        <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          Note: Showing estimated sales data. eBay API is currently unavailable.
        </div>
      )}
      
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sold Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sold Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Condition</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sales.map((item, idx) => (
              <tr key={item.legacyItemId || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  <a 
                    href={item.itemWebUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                  {formatPrice(item.price?.value, item.price?.currency)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(item.soldDate)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  {item.condition || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {averagePrice > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-sm">
            <span className="font-medium mr-1">Average Sold Price:</span>
            <span className="text-lg font-bold">{formatPrice(averagePrice, 'AUD')}</span>
          </div>
          
          <button
            onClick={handleUpdateValue}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update Current Value
          </button>
        </div>
      )}
    </div>
  );
};

EbaySales.propTypes = {
  card: PropTypes.object.isRequired,
  className: PropTypes.string,
  onUpdateValue: PropTypes.func
};

export default EbaySales;
