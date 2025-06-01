# Statistics Summary System - Technical Documentation

## Overview
The Statistics Summary System provides real-time financial analytics and collection insights for the Pokemon Card Tracker. It calculates investment performance, profit margins, collection values, and displays comprehensive statistics with multi-currency support and dynamic formatting.

## File Locations
- **Primary Component**: `src/design-system/StatisticsSummary.js`
- **Calculation Utils**: `src/utils/cardCalculations.js`
- **Currency Utils**: `src/utils/currencyFormatting.js`
- **Statistics Hooks**: `src/hooks/useStatistics.js`

## Architecture Overview

### Statistics Component Structure
```javascript
const StatisticsSummary = ({
  statistics,
  viewMode,
  displayMetric,
  onDisplayMetricChange,
  onViewModeChange,
  className = ''
}) => {
  // Component implementation
};
```

### Statistics Data Structure
```javascript
const statisticsShape = {
  totalCards: number,           // Total number of cards
  totalInvestment: number,      // Total amount invested
  totalCurrentValue: number,    // Current total value
  totalProfit: number,         // Total profit/loss
  averageCard: number,         // Average value per card
  profitMargin: number,        // Profit margin percentage
  collections: {               // Per-collection breakdown
    [collectionName]: {
      cardCount: number,
      totalInvestment: number,
      totalCurrentValue: number,
      totalProfit: number,
      profitMargin: number
    }
  }
};
```

## Core Statistics Calculations

### 1. Card Value Calculations (`cardCalculations.js`)

#### Total Portfolio Value
```javascript
export const calculateCardTotals = (cards, currency = 'AUD') => {
  if (!cards || cards.length === 0) {
    return {
      totalCards: 0,
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalProfit: 0,
      averageCard: 0,
      profitMargin: 0
    };
  }

  const currencyField = currency === 'USD' ? 'USD' : 'AUD';
  const investmentField = `investment${currencyField}`;
  const currentValueField = `currentValue${currencyField}`;

  let totalInvestment = 0;
  let totalCurrentValue = 0;
  let totalCards = 0;

  cards.forEach(card => {
    const quantity = Math.max(1, parseInt(card.quantity) || 1);
    const investment = parseFloat(card[investmentField]) || 0;
    const currentValue = parseFloat(card[currentValueField]) || 0;

    totalCards += quantity;
    totalInvestment += (investment * quantity);
    totalCurrentValue += (currentValue * quantity);
  });

  const totalProfit = totalCurrentValue - totalInvestment;
  const profitMargin = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
  const averageCard = totalCards > 0 ? totalCurrentValue / totalCards : 0;

  return {
    totalCards,
    totalInvestment: Math.round(totalInvestment * 100) / 100,
    totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    averageCard: Math.round(averageCard * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100
  };
};
```

#### Collection-Specific Statistics
```javascript
export const calculateCollectionStatistics = (cards, currency = 'AUD') => {
  if (!cards || cards.length === 0) return {};

  const collections = {};
  const currencyField = currency === 'USD' ? 'USD' : 'AUD';
  const investmentField = `investment${currencyField}`;
  const currentValueField = `currentValue${currencyField}`;

  cards.forEach(card => {
    const collection = card.collection || card.collectionId || 'Unknown';
    const quantity = Math.max(1, parseInt(card.quantity) || 1);
    const investment = parseFloat(card[investmentField]) || 0;
    const currentValue = parseFloat(card[currentValueField]) || 0;

    if (!collections[collection]) {
      collections[collection] = {
        cardCount: 0,
        totalInvestment: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageCard: 0,
        topCards: [],
        categories: new Set(),
        yearRange: { min: null, max: null }
      };
    }

    const col = collections[collection];
    col.cardCount += quantity;
    col.totalInvestment += (investment * quantity);
    col.totalCurrentValue += (currentValue * quantity);
    
    // Track card categories
    if (card.category) {
      col.categories.add(card.category);
    }
    
    // Track year range
    if (card.year) {
      const year = parseInt(card.year);
      if (!col.yearRange.min || year < col.yearRange.min) {
        col.yearRange.min = year;
      }
      if (!col.yearRange.max || year > col.yearRange.max) {
        col.yearRange.max = year;
      }
    }
    
    // Track top value cards
    const cardValue = currentValue * quantity;
    col.topCards.push({
      name: card.cardName || 'Unknown Card',
      value: cardValue,
      quantity: quantity
    });
  });

  // Calculate derived statistics for each collection
  Object.keys(collections).forEach(collectionName => {
    const col = collections[collectionName];
    col.totalProfit = col.totalCurrentValue - col.totalInvestment;
    col.profitMargin = col.totalInvestment > 0 ? 
      (col.totalProfit / col.totalInvestment) * 100 : 0;
    col.averageCard = col.cardCount > 0 ? 
      col.totalCurrentValue / col.cardCount : 0;
    
    // Sort and limit top cards
    col.topCards = col.topCards
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Convert categories set to array
    col.categories = Array.from(col.categories);
    
    // Round financial values
    col.totalInvestment = Math.round(col.totalInvestment * 100) / 100;
    col.totalCurrentValue = Math.round(col.totalCurrentValue * 100) / 100;
    col.totalProfit = Math.round(col.totalProfit * 100) / 100;
    col.profitMargin = Math.round(col.profitMargin * 100) / 100;
    col.averageCard = Math.round(col.averageCard * 100) / 100;
  });

  return collections;
};
```

#### Performance Metrics
```javascript
export const calculatePerformanceMetrics = (cards, currency = 'AUD') => {
  if (!cards || cards.length === 0) return {};

  const currencyField = currency === 'USD' ? 'USD' : 'AUD';
  const investmentField = `investment${currencyField}`;
  const currentValueField = `currentValue${currencyField}`;

  let bestPerformers = [];
  let worstPerformers = [];
  let highestValue = { card: null, value: 0 };
  let mostExpensive = { card: null, investment: 0 };
  let recentAdditions = [];

  cards.forEach(card => {
    const investment = parseFloat(card[investmentField]) || 0;
    const currentValue = parseFloat(card[currentValueField]) || 0;
    const profit = currentValue - investment;
    const profitMargin = investment > 0 ? (profit / investment) * 100 : 0;

    // Track best and worst performers
    const cardWithMetrics = {
      ...card,
      profit,
      profitMargin,
      investment,
      currentValue
    };

    bestPerformers.push(cardWithMetrics);
    worstPerformers.push(cardWithMetrics);

    // Track highest value card
    if (currentValue > highestValue.value) {
      highestValue = { card, value: currentValue };
    }

    // Track most expensive investment
    if (investment > mostExpensive.investment) {
      mostExpensive = { card, investment };
    }

    // Track recent additions (within last 30 days)
    const addedDate = new Date(card.addedAt || card.datePurchased);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (addedDate > thirtyDaysAgo) {
      recentAdditions.push(cardWithMetrics);
    }
  });

  // Sort performers
  bestPerformers.sort((a, b) => b.profitMargin - a.profitMargin);
  worstPerformers.sort((a, b) => a.profitMargin - b.profitMargin);
  recentAdditions.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  return {
    bestPerformers: bestPerformers.slice(0, 5),
    worstPerformers: worstPerformers.slice(0, 5),
    highestValue,
    mostExpensive,
    recentAdditions: recentAdditions.slice(0, 10),
    totalCards: cards.length,
    averageInvestment: cards.reduce((sum, card) => 
      sum + (parseFloat(card[investmentField]) || 0), 0) / cards.length,
    averageCurrentValue: cards.reduce((sum, card) => 
      sum + (parseFloat(card[currentValueField]) || 0), 0) / cards.length
  };
};
```

### 2. Currency Formatting (`currencyFormatting.js`)

#### Multi-Currency Formatter
```javascript
export const formatCurrency = (amount, currency = 'AUD', options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    showCode = false,
    compact = false
  } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? (currency === 'USD' ? '$0.00' : '$0.00') : '0.00';
  }

  const numericAmount = Number(amount);

  // Handle compact notation for large numbers
  if (compact && Math.abs(numericAmount) >= 1000) {
    return formatCompactCurrency(numericAmount, currency, options);
  }

  const formatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits
  };

  try {
    const formatted = new Intl.NumberFormat('en-AU', formatOptions).format(numericAmount);
    
    if (!showSymbol) {
      return formatted.replace(/[A-Z$\s]/g, '');
    }
    
    if (showCode) {
      return `${formatted} ${currency}`;
    }
    
    return formatted;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return showSymbol ? `$${numericAmount.toFixed(2)}` : numericAmount.toFixed(2);
  }
};

const formatCompactCurrency = (amount, currency, options) => {
  const absAmount = Math.abs(amount);
  let suffix = '';
  let scaledAmount = amount;

  if (absAmount >= 1000000) {
    scaledAmount = amount / 1000000;
    suffix = 'M';
  } else if (absAmount >= 1000) {
    scaledAmount = amount / 1000;
    suffix = 'K';
  }

  const formatted = formatCurrency(scaledAmount, currency, {
    ...options,
    maximumFractionDigits: 1,
    compact: false
  });

  return `${formatted}${suffix}`;
};
```

#### Percentage Formatting
```javascript
export const formatPercentage = (value, options = {}) => {
  const {
    minimumFractionDigits = 1,
    maximumFractionDigits = 1,
    showSign = true,
    showPercent = true
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return showPercent ? '0.0%' : '0.0';
  }

  const numericValue = Number(value);
  let sign = '';
  
  if (showSign && numericValue > 0) {
    sign = '+';
  }

  const formatted = numericValue.toLocaleString('en-AU', {
    minimumFractionDigits,
    maximumFractionDigits
  });

  return `${sign}${formatted}${showPercent ? '%' : ''}`;
};
```

### 3. Statistics Hook (`useStatistics.js`)

#### Real-time Statistics Calculation
```javascript
export const useStatistics = (cards, currency = 'AUD') => {
  const [statistics, setStatistics] = useState(null);
  const [collectionStats, setCollectionStats] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  // Memoized calculations to prevent unnecessary recalculations
  const calculatedStats = useMemo(() => {
    if (!cards || cards.length === 0) {
      return {
        totalCards: 0,
        totalInvestment: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        averageCard: 0,
        profitMargin: 0
      };
    }

    return calculateCardTotals(cards, currency);
  }, [cards, currency]);

  const calculatedCollectionStats = useMemo(() => {
    return calculateCollectionStatistics(cards, currency);
  }, [cards, currency]);

  const calculatedPerformanceMetrics = useMemo(() => {
    return calculatePerformanceMetrics(cards, currency);
  }, [cards, currency]);

  // Update state when calculations change
  useEffect(() => {
    setStatistics(calculatedStats);
    setCollectionStats(calculatedCollectionStats);
    setPerformanceMetrics(calculatedPerformanceMetrics);
    setLoading(false);
  }, [calculatedStats, calculatedCollectionStats, calculatedPerformanceMetrics]);

  return {
    statistics,
    collectionStats,
    performanceMetrics,
    loading,
    refresh: () => setLoading(true) // Force recalculation
  };
};
```

## Statistics Summary Component

### 1. Main Component Structure

#### StatisticsSummary Component
```javascript
const StatisticsSummary = ({
  statistics,
  viewMode,
  displayMetric,
  onDisplayMetricChange,
  onViewModeChange,
  className = ''
}) => {
  const { formatUserCurrency } = useCurrency();
  const [showTooltip, setShowTooltip] = useState(null);

  // Display metric options
  const displayMetrics = [
    { value: 'currentValueAUD', label: 'Current Value', icon: '💰' },
    { value: 'investmentAUD', label: 'Investment', icon: '💸' },
    { value: 'totalProfit', label: 'Profit/Loss', icon: '📈' },
    { value: 'profitMargin', label: 'Profit Margin', icon: '📊' }
  ];

  // View mode options
  const viewModes = [
    { value: 'grid', label: 'Grid', icon: '⊞' },
    { value: 'list', label: 'List', icon: '☰' }
  ];

  if (!statistics) {
    return (
      <div className={`statistics-summary loading ${className}`}>
        <div className="loading-placeholder">
          <div className="skeleton-text"></div>
          <div className="skeleton-metrics"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`statistics-summary ${className}`}>
      <div className="statistics-header">
        <h2 className="statistics-title">Collection Overview</h2>
        <div className="statistics-controls">
          <DisplayMetricSelector
            value={displayMetric}
            onChange={onDisplayMetricChange}
            options={displayMetrics}
          />
          <ViewModeSelector
            value={viewMode}
            onChange={onViewModeChange}
            options={viewModes}
          />
        </div>
      </div>

      <div className="statistics-grid">
        <StatisticCard
          title="Total Cards"
          value={statistics.totalCards}
          icon="🃏"
          format="number"
          tooltip="Total number of cards in your collection"
        />
        
        <StatisticCard
          title="Total Investment"
          value={statistics.totalInvestment}
          icon="💸"
          format="currency"
          tooltip="Total amount invested in your collection"
          className={statistics.totalInvestment > 0 ? 'positive' : ''}
        />
        
        <StatisticCard
          title="Current Value"
          value={statistics.totalCurrentValue}
          icon="💰"
          format="currency"
          tooltip="Current total value of your collection"
          className={statistics.totalCurrentValue > statistics.totalInvestment ? 'positive' : 'negative'}
        />
        
        <StatisticCard
          title="Total Profit"
          value={statistics.totalProfit}
          icon="📈"
          format="currency"
          tooltip="Total profit or loss from your collection"
          className={statistics.totalProfit >= 0 ? 'positive' : 'negative'}
          showTrend={true}
        />
        
        <StatisticCard
          title="Profit Margin"
          value={statistics.profitMargin}
          icon="📊"
          format="percentage"
          tooltip="Profit margin percentage"
          className={statistics.profitMargin >= 0 ? 'positive' : 'negative'}
          showTrend={true}
        />
        
        <StatisticCard
          title="Average per Card"
          value={statistics.averageCard}
          icon="🎯"
          format="currency"
          tooltip="Average current value per card"
        />
      </div>
    </div>
  );
};
```

### 2. Statistic Card Component

#### Individual Metric Display
```javascript
const StatisticCard = ({
  title,
  value,
  icon,
  format = 'number',
  tooltip,
  className = '',
  showTrend = false,
  previousValue = null
}) => {
  const { formatUserCurrency } = useCurrency();
  const [showTooltip, setShowTooltip] = useState(false);

  const formatValue = (val, fmt) => {
    switch (fmt) {
      case 'currency':
        return formatUserCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'number':
        return Number(val).toLocaleString();
      default:
        return String(val);
    }
  };

  const getTrendIcon = () => {
    if (!showTrend || previousValue === null) return null;
    
    if (value > previousValue) return '↗️';
    if (value < previousValue) return '↘️';
    return '➡️';
  };

  return (
    <div 
      className={`statistic-card ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="statistic-header">
        <span className="statistic-icon">{icon}</span>
        <h3 className="statistic-title">{title}</h3>
        {showTrend && <span className="trend-icon">{getTrendIcon()}</span>}
      </div>
      
      <div className="statistic-value">
        {formatValue(value, format)}
      </div>
      
      {showTooltip && tooltip && (
        <div className="statistic-tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
};
```

### 3. Advanced Statistics Display

#### Performance Breakdown Component
```javascript
const PerformanceBreakdown = ({ performanceMetrics, currency }) => {
  const { formatUserCurrency } = useCurrency();

  if (!performanceMetrics || Object.keys(performanceMetrics).length === 0) {
    return null;
  }

  return (
    <div className="performance-breakdown">
      <h3>Performance Analysis</h3>
      
      <div className="performance-sections">
        <div className="performance-section">
          <h4>Top Performers</h4>
          <div className="performer-list">
            {performanceMetrics.bestPerformers?.slice(0, 3).map((card, index) => (
              <div key={index} className="performer-item positive">
                <span className="card-name">{card.cardName}</span>
                <span className="profit-margin">
                  {formatPercentage(card.profitMargin)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="performance-section">
          <h4>Underperformers</h4>
          <div className="performer-list">
            {performanceMetrics.worstPerformers?.slice(0, 3).map((card, index) => (
              <div key={index} className="performer-item negative">
                <span className="card-name">{card.cardName}</span>
                <span className="profit-margin">
                  {formatPercentage(card.profitMargin)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="highlights">
        <div className="highlight-item">
          <span className="highlight-label">Highest Value Card:</span>
          <span className="highlight-value">
            {performanceMetrics.highestValue?.card?.cardName} - 
            {formatUserCurrency(performanceMetrics.highestValue?.value)}
          </span>
        </div>
        
        <div className="highlight-item">
          <span className="highlight-label">Largest Investment:</span>
          <span className="highlight-value">
            {performanceMetrics.mostExpensive?.card?.cardName} - 
            {formatUserCurrency(performanceMetrics.mostExpensive?.investment)}
          </span>
        </div>
      </div>
    </div>
  );
};
```

## Data Visualization

### Chart Integration
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const StatisticsChart = ({ data, type = 'line' }) => {
  const chartData = useMemo(() => {
    if (type === 'portfolio-value') {
      return data.map(item => ({
        date: item.date,
        value: item.totalCurrentValue,
        investment: item.totalInvestment
      }));
    }
    
    if (type === 'collection-breakdown') {
      return Object.entries(data).map(([name, stats]) => ({
        name,
        value: stats.totalCurrentValue,
        percentage: (stats.totalCurrentValue / data.total * 100).toFixed(1)
      }));
    }
    
    return data;
  }, [data, type]);

  if (type === 'line') {
    return (
      <LineChart width={400} height={200} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
        <Line type="monotone" dataKey="investment" stroke="#82ca9d" />
      </LineChart>
    );
  }

  if (type === 'pie') {
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];
    
    return (
      <PieChart width={300} height={200}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percentage }) => `${name}: ${percentage}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
      </PieChart>
    );
  }

  return null;
};
```

## Export and Reporting

### Statistics Export
```javascript
export const exportStatistics = (statistics, collectionStats, format = 'csv') => {
  const data = {
    summary: statistics,
    collections: collectionStats,
    exportDate: new Date().toISOString(),
    currency: 'AUD' // or from user preference
  };

  if (format === 'csv') {
    return exportToCSV(data);
  } else if (format === 'json') {
    return exportToJSON(data);
  } else if (format === 'pdf') {
    return exportToPDF(data);
  }
};

const exportToCSV = (data) => {
  const rows = [
    ['Metric', 'Value'],
    ['Total Cards', data.summary.totalCards],
    ['Total Investment', data.summary.totalInvestment],
    ['Current Value', data.summary.totalCurrentValue],
    ['Total Profit', data.summary.totalProfit],
    ['Profit Margin', `${data.summary.profitMargin}%`],
    ['Average per Card', data.summary.averageCard],
    [''],
    ['Collection Breakdown', ''],
    ...Object.entries(data.collections).map(([name, stats]) => [
      name, stats.totalCurrentValue
    ])
  ];

  return rows.map(row => row.join(',')).join('\n');
};
```

## Performance Optimizations

### Memoization and Caching
```javascript
// Memoized calculation wrapper
const useMemoizedStatistics = (cards, currency) => {
  return useMemo(() => {
    const startTime = performance.now();
    const stats = calculateCardTotals(cards, currency);
    const endTime = performance.now();
    
    console.log(`Statistics calculation took ${endTime - startTime}ms`);
    return stats;
  }, [cards, currency]);
};

// Statistics caching
const StatisticsCache = {
  cache: new Map(),
  
  generateKey(cards, currency) {
    const cardHashes = cards.map(card => 
      `${card.id}-${card.investmentAUD}-${card.currentValueAUD}-${card.lastModified}`
    ).join('|');
    return `${cardHashes}-${currency}`;
  },
  
  get(cards, currency) {
    const key = this.generateKey(cards, currency);
    return this.cache.get(key);
  },
  
  set(cards, currency, statistics) {
    const key = this.generateKey(cards, currency);
    this.cache.set(key, {
      statistics,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 10) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
};
```

## Future Enhancement Opportunities

1. **Historical Tracking**: Track statistics over time with trend analysis
2. **Goal Setting**: Set and track collection value goals
3. **Market Comparison**: Compare collection performance to market indices
4. **Advanced Analytics**: Machine learning insights and predictions
5. **Real-time Updates**: Live statistics updates with WebSocket integration
6. **Custom Metrics**: User-defined calculation formulas
7. **Benchmark Comparisons**: Compare against other collectors (anonymized)
8. **Tax Reporting**: Generate tax-ready profit/loss reports
