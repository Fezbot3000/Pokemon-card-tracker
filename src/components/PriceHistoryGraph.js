import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-hot-toast';
import { functions, httpsCallable } from '../services/firebase';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * PriceHistoryGraph Component
 * 
 * Displays a graph of historical prices for a card from PriceCharting
 */
const PriceHistoryGraph = ({ productId, condition = 'loose', className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!productId || typeof productId !== 'string' || productId.trim() === '') {
        setIsLoading(false);
        setError('No valid Product ID available to fetch price history.'); 
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const proxyPriceCharting = httpsCallable(functions, 'proxyPriceCharting');
        
        console.log('[PriceCharting] Fetching history for Product ID:', productId); 
        const response = await proxyPriceCharting({
          endpoint: 'product-prices',
          params: { 
            id: productId,
            format: 'json'
          }
        });
        
        console.log('[PriceCharting] Success'); 

        if (response.data.status !== 'success' || !response.data.prices) {
          console.warn('[PriceCharting] Error: Invalid data format received'); 
          throw new Error('Failed to retrieve price history: Invalid data format');
        }

        setPriceHistory(response.data.prices);
      } catch (error) {
        console.warn('[PriceCharting] Error:', error.message); 
        setError(error.message);
        
        if (error.message && error.message.includes('404')) {
          setError('No price history available for this card. Using sample data for visualization.');
        }
        
        const mockData = {
          'loose': {
            '2023-01-01': 100,
            '2023-02-01': 110,
            '2023-03-01': 105,
            '2023-04-01': 120,
            '2023-05-01': 115,
            '2023-06-01': 125,
            '2023-07-01': 130,
            '2023-08-01': 135,
            '2023-09-01': 140,
            '2023-10-01': 145,
            '2023-11-01': 150,
            '2023-12-01': 155,
          },
          'graded': {
            '2023-01-01': 200,
            '2023-02-01': 210,
            '2023-03-01': 205,
            '2023-04-01': 220,
            '2023-05-01': 215,
            '2023-06-01': 225,
            '2023-07-01': 230,
            '2023-08-01': 235,
            '2023-09-01': 240,
            '2023-10-01': 245,
            '2023-11-01': 250,
            '2023-12-01': 255,
          }
        };
        setPriceHistory(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [productId, condition]);

  const prepareChartData = () => {
    if (!priceHistory) {
      console.log('[Chart] No price history data available.');
      return null;
    }

    // --- Flexible Key Finding Logic --- 
    let conditionData = null;
    const conditionLower = condition.toLowerCase();
    const conditionKey = conditionLower.replace(/\s+/g, '-'); // e.g., 'psa-10'
    const isGraded = conditionLower.includes('psa') || conditionLower.includes('bgs') || conditionLower.includes('cgc') || conditionLower.includes('beckett');

    // Try direct match first (e.g., 'psa-10')
    if (priceHistory[conditionKey]) {
      conditionData = priceHistory[conditionKey];
      console.log(`[Chart] Found history using key: ${conditionKey}`);
    // Try the prop value directly (e.g., 'PSA 10' or 'loose')
    } else if (priceHistory[condition]) {
       conditionData = priceHistory[condition];
       console.log(`[Chart] Found history using key: ${condition}`);
    // If graded, try generic 'graded'
    } else if (isGraded && priceHistory['graded']) {
      conditionData = priceHistory['graded'];
      console.log(`[Chart] Found history using fallback key: graded`);
    // Try generic 'loose'
    } else if (priceHistory['loose']) {
       conditionData = priceHistory['loose'];
       console.log(`[Chart] Found history using fallback key: loose`);
    }
    // ------------------------------------

    if (!conditionData) {
      console.log(`[Chart] Could not find price history data for condition '${condition}' or fallbacks in:`, priceHistory);
      return null;
    }

    const prices = conditionData; // Use the found data
    
    // Ensure prices is an object before proceeding
    if (typeof prices !== 'object' || prices === null) {
        console.error('[Chart] Expected price history data to be an object, but received:', prices);
        return null;
    }

    const sortedPrices = Object.entries(prices)
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sortedPrices.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const data = sortedPrices.map(item => item.price);

    return {
      labels,
      datasets: [
        {
          label: `${condition.charAt(0).toUpperCase() + condition.slice(1)} Price`,
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Price History',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    }
  };

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
        <p>Error loading price history: {error}</p>
      </div>
    );
  }

  if (!priceHistory || !priceHistory[condition]) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 p-3 rounded ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No price history available for this card.</p>
      </div>
    );
  }

  const chartData = prepareChartData();

  return (
    <div className={className}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

PriceHistoryGraph.propTypes = {
  productId: PropTypes.string,
  condition: PropTypes.string,
  className: PropTypes.string
};

export default PriceHistoryGraph;
