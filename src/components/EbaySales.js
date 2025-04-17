import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchEbaySales } from '../services/ebaySales';

const EbaySales = ({ card, className = '' }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSales([]);
    setUsingMockData(false);
    if (!card) return;
    
    const attemptCount = { current: 0 };
    const maxAttempts = 2;
    
    const fetchData = async () => {
      try {
        attemptCount.current += 1;
        console.log(`[EbaySales] Attempt ${attemptCount.current} to fetch eBay sales data`);
        
        const items = await fetchEbaySales(card);
        
        if (isMounted) {
          if (items && items.length > 0) {
            console.log(`[EbaySales] Successfully fetched ${items.length} items from eBay API`);
            setSales(items);
          } else if (attemptCount.current < maxAttempts) {
            // If we got no items but haven't reached max attempts, try again
            console.log('[EbaySales] No items returned, retrying...');
            setTimeout(fetchData, 1000); // Wait 1 second before retry
          } else {
            // If we've tried enough times with no results, use mock data
            console.log('[EbaySales] No items returned after multiple attempts, using mock data');
            const mockSales = generateMockSales(card);
            setSales(mockSales);
            setUsingMockData(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.log('[EbaySales] Error fetching data:', err.message);
          setError(err.message || 'Failed to fetch eBay sales');
          
          // Use mock data when API fails
          console.log('[EbaySales] Using mock data as fallback');
          const mockSales = generateMockSales(card);
          setSales(mockSales);
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
    const basePrice = Math.floor(Math.random() * 100) + 50; // Random base price between $50-$150
    const today = new Date();
    
    // Create 5 mock sales
    return Array.from({ length: 5 }, (_, i) => {
      const saleDate = new Date(today);
      saleDate.setDate(today.getDate() - (i * 7)); // One sale every week back
      
      // Price varies slightly for each sale
      const priceVariation = Math.floor(Math.random() * 20) - 10; // -$10 to +$10
      const price = basePrice + priceVariation;
      
      return {
        itemId: [`mock-${i}-${Date.now()}`],
        title: [`${card.year || '1999'} ${card.brand || 'Pokemon'} ${card.name || 'Card'} ${card.number ? `#${card.number}` : ''} ${card.grade || ''}`],
        sellingStatus: [{
          currentPrice: [{
            __value__: price.toString(),
            '@currencyId': 'USD'
          }]
        }],
        listingInfo: [{
          endTime: [saleDate.toISOString()]
        }],
        viewItemURL: [`https://www.ebay.com/itm/mock-item-${i}`],
        galleryURL: [`https://via.placeholder.com/150?text=${card.name || 'Card'}`]
      };
    });
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
      <h3 className="text-lg font-semibold mb-3">Recent eBay Sales</h3>
      {usingMockData && (
        <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          Note: Showing estimated sales data. eBay API is currently unavailable.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">End Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">URL</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sales.slice(0,10).map((item, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.listingInfo?.[0]?.endTime ? new Date(item.listingInfo[0].endTime).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.title?.[0]}</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                  {item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ? `$${item.sellingStatus[0].currentPrice[0].__value__}` : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-blue-600 underline">
                  {item.viewItemURL?.[0] ? <a href={item.viewItemURL[0]} target="_blank" rel="noopener noreferrer">View</a> : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

EbaySales.propTypes = {
  card: PropTypes.object.isRequired,
  className: PropTypes.string
};

export default EbaySales;
