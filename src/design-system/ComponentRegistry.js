import React from 'react';
import StatisticsSummary from './components/StatisticsSummary';
import SearchToolbar from './components/SearchToolbar';
import CollectionSelector from '../components/CollectionSelector';
import { calculateCardTotals, formatStatisticsForDisplay } from '../utils/cardStatistics';

/**
 * Component Registry System
 * 
 * This system provides a centralized mapping of component types to their implementations,
 * allowing components to be dynamically rendered anywhere in the application.
 * 
 * Each component type should be:
 * - Completely self-contained
 * - Accept data via props
 * - Be portable across different pages
 * - Have no hard dependencies on specific contexts (except for essential ones like theme)
 */

/**
 * Data processors - these transform raw data into component-ready formats
 */
const dataProcessors = {
  statistics: (rawData, config = {}) => {
    const { cards = [], useRealData = false } = rawData;
    
    if (useRealData && cards.length > 0) {
      const totals = calculateCardTotals(cards);
      return formatStatisticsForDisplay(totals, cards.length, cards.length);
    }
    
    // Fallback to demo data or provided config
    return config.stats || [
      { label: 'PAID', value: 0, isMonetary: true, originalCurrencyCode: 'AUD' },
      { label: 'VALUE', value: 0, isMonetary: true, originalCurrencyCode: 'AUD' },
      { label: 'PROFIT', value: 0, isMonetary: true, isProfit: true, originalCurrencyCode: 'AUD' },
      { label: 'CARDS', value: 0, isCount: true }
    ];
  },
  
  searchBar: (rawData, config = {}) => {
    return {
      placeholder: config.placeholder || 'Search...',
      showFilter: config.showFilter || false,
      showAddButton: config.showAddButton || false,
      addButtonText: config.addButtonText || 'Add',
      onSearch: rawData.onSearch || (() => {}),
      onAddCard: rawData.onAddCard || (() => {}),
      ...config
    };
  },
  
  collectionSelector: (rawData, config = {}) => {
    return {
      selectedCollection: rawData.selectedCollection || 'All Collections',
      collections: rawData.collections || [],
      onCollectionChange: rawData.onCollectionChange || (() => {}),
      onAddCollection: rawData.onAddCollection || (() => {}),
      ...config
    };
  }
};

/**
 * Component implementations
 */
const componentImplementations = {
  statistics: ({ data, config, className, ...props }) => {
    const processedData = dataProcessors.statistics(data, config);
    
    return (
      <StatisticsSummary
        statistics={processedData}
        className={className}
        {...props}
      />
    );
  },
  
  searchBar: ({ data, config, className, ...props }) => {
    const processedData = dataProcessors.searchBar(data, config);
    
    return (
      <SearchToolbar
        searchValue={data.searchValue || ''}
        onSearchChange={processedData.onSearch}
        onAddCard={processedData.onAddCard}
        className={className}
        {...processedData}
        {...props}
      />
    );
  },
  
  collectionSelector: ({ data, config, className, ...props }) => {
    const processedData = dataProcessors.collectionSelector(data, config);
    
    return (
      <CollectionSelector
        selectedCollection={processedData.selectedCollection}
        collections={processedData.collections}
        onCollectionChange={processedData.onCollectionChange}
        onAddCollection={processedData.onAddCollection}
        className={className}
        {...processedData}
        {...props}
      />
    );
  }
};

/**
 * Main Component Registry
 * 
 * This is the central registry that maps component types to their implementations.
 * New components should be added here to be available throughout the application.
 */
export class ComponentRegistry {
  static components = componentImplementations;
  static processors = dataProcessors;
  
  /**
   * Render a component by type
   * @param {string} type - The component type to render
   * @param {Object} data - Raw data to pass to the component
   * @param {Object} config - Configuration/settings for the component
   * @param {Object} props - Additional props to pass to the component
   * @returns {React.Component} The rendered component
   */
  static render(type, data = {}, config = {}, props = {}) {
    const Component = this.components[type];
    
    if (!Component) {
      console.warn(`Component type "${type}" not found in registry`);
      return null;
    }
    
    return (
      <Component
        key={props.key || `${type}-${Date.now()}`}
        data={data}
        config={config}
        {...props}
      />
    );
  }
  
  /**
   * Register a new component type
   * @param {string} type - The component type identifier
   * @param {React.Component} component - The component implementation
   * @param {Function} processor - Data processor function (optional)
   */
  static register(type, component, processor = null) {
    this.components[type] = component;
    if (processor) {
      this.processors[type] = processor;
    }
  }
  
  /**
   * Get available component types
   * @returns {Array} Array of available component type names
   */
  static getAvailableTypes() {
    return Object.keys(this.components);
  }
  
  /**
   * Check if a component type is available
   * @param {string} type - The component type to check
   * @returns {boolean} True if the component type is available
   */
  static isAvailable(type) {
    return type in this.components;
  }
}

export default ComponentRegistry; 