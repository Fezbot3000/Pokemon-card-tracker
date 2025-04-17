import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { functions, httpsCallable } from '../services/firebase';

/**
 * RecentSales Component
 * 
 * Displays recently sold items for a card from eBay
 */
const RecentSales = ({ productId, productName, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [recentSales, setRecentSales] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentSales = async () => {
      try {
        if (!productName) {
          throw new Error('Product name is required to fetch recent sales from eBay.');
        }

        setIsLoading(true);
        setError(null);

        const proxyEbayCompleted = httpsCallable(functions, 'proxyEbayCompleted');
        console.log('[eBay] Fetching sales for:', productName);
        const ebayResponse = await proxyEbayCompleted({ query: productName });
        console.log('[eBay] Success:', ebayResponse.data);
        const items = ebayResponse.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

        if (!Array.isArray(items)) {
          console.warn('[eBay] Invalid response format from eBay proxy:', ebayResponse.data);
          throw new Error('Invalid response format for recent sales from eBay');
        }

        const processedSales = items.map(item => ({
          id: item.itemId?.[0],
          title: item.title?.[0],
          price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
          currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
          endDate: item.listingInfo?.[0]?.endTime?.[0],
          imageUrl: item.galleryURL?.[0],
          itemUrl: item.viewItemURL?.[0],
          condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'N/A'
        }));

        processedSales.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

        setRecentSales(processedSales);
      } catch (error) {
        console.warn('[eBay] Error:', error.message);
        setError(error.message);
        toast.error(`Failed to load recent sales: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentSales();
  }, [productName]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Render component
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 p-3 rounded ${className}`}>
        <p>Error loading recent sales: {error}</p>
      </div>
    );
  }

  if (!recentSales || recentSales.length === 0) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 p-3 rounded ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No recent sales available for this card.</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold mb-3">Recent Sales</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {recentSales.slice(0, 10).map((sale, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(sale.endDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {sale.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {sale.currency} {parseFloat(sale.price).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  eBay
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

RecentSales.propTypes = {
  productId: PropTypes.string,
  productName: PropTypes.string.isRequired,
  className: PropTypes.string
};

export default RecentSales;
