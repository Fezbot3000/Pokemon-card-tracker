import React, { createContext, useContext, useState, useEffect } from 'react';
import useCardData from '../hooks/useCardData';
import { useAuth } from '../design-system/contexts/AuthContext';

/**
 * Component Provider Context
 * 
 * This context provides a centralized way to manage component configurations
 * and data throughout the application. It connects the DesignSystemConfigurator
 * with the widget system.
 */
const ComponentProviderContext = createContext();

/**
 * Component Provider
 * 
 * This provider manages the state and configuration for all dynamic components.
 * It serves as the bridge between the DesignSystemConfigurator and the actual
 * components rendered throughout the application.
 */
export const ComponentProvider = ({ children }) => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const { cards, loading: cardsLoading } = useCardData();
  const { currentUser } = useAuth();

  // Default dashboard configuration
  const defaultDashboardConfig = [
    {
      id: 'dashboard-statistics',
      type: 'statistics',
      config: {
        title: 'Portfolio Summary',
        showTitle: false, // Usually displayed by parent component
        useRealData: true,
      },
      data: {
        cards: cards || [],
        useRealData: cards && cards.length > 0,
      },
      className: 'mb-3 sm:mb-4',
      enabled: true,
      order: 1
    },
    {
      id: 'dashboard-search',
      type: 'searchBar',
      config: {
        placeholder: 'Search by name, set, or serial number...',
        showFilter: true,
        showAddButton: true,
        addButtonText: 'Add Card',
        showSort: true,
        showViewToggle: true
      },
      data: {
        searchValue: '',
        // These will be provided by the parent component
        onSearch: () => {},
        onAddCard: () => {},
        onSort: () => {},
        onViewToggle: () => {}
      },
      className: 'mb-4',
      enabled: true,
      order: 2
    }
  ];

  // Initialize components with default configuration
  useEffect(() => {
    if (components.length === 0) {
      setComponents(defaultDashboardConfig);
    }
  }, []);

  // Update components when card data changes
  useEffect(() => {
    if (cards) {
      setComponents(prevComponents => 
        prevComponents.map(component => {
          if (component.type === 'statistics') {
            return {
              ...component,
              data: {
                ...component.data,
                cards: cards || [],
                useRealData: cards && cards.length > 0,
              }
            };
          }
          return component;
        })
      );
    }
  }, [cards]);

  /**
   * Get components for a specific context (e.g., dashboard, settings, etc.)
   */
  const getComponents = (context = 'dashboard') => {
    return components
      .filter(component => component.enabled && (component.context === context || !component.context))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  /**
   * Update a component's configuration
   */
  const updateComponent = (id, updates) => {
    setComponents(prevComponents =>
      prevComponents.map(component =>
        component.id === id ? { ...component, ...updates } : component
      )
    );
  };

  /**
   * Add a new component
   */
  const addComponent = (componentConfig) => {
    const newComponent = {
      id: `component-${Date.now()}`,
      enabled: true,
      order: components.length + 1,
      ...componentConfig
    };
    setComponents(prevComponents => [...prevComponents, newComponent]);
    return newComponent.id;
  };

  /**
   * Remove a component
   */
  const removeComponent = (id) => {
    setComponents(prevComponents =>
      prevComponents.filter(component => component.id !== id)
    );
  };

  /**
   * Update component order
   */
  const reorderComponents = (orderedIds) => {
    setComponents(prevComponents => {
      const reordered = orderedIds.map((id, index) => {
        const component = prevComponents.find(c => c.id === id);
        return { ...component, order: index + 1 };
      });
      return reordered;
    });
  };

  /**
   * Get component data with real-time updates
   */
  const getComponentData = (type, config = {}) => {
    switch (type) {
      case 'statistics':
        return {
          cards: cards || [],
          useRealData: cards && cards.length > 0,
          loading: cardsLoading
        };
      
      case 'searchBar':
        return {
          searchValue: '',
          loading: false
        };
      
      case 'collectionSelector':
        return {
          selectedCollection: 'All Collections',
          collections: [], // This would come from actual collection data
          loading: false
        };
      
      default:
        return { loading: false };
    }
  };

  /**
   * Check if components are still loading
   */
  const isLoading = () => {
    return loading || cardsLoading;
  };

  /**
   * Get default configuration for a component type
   */
  const getDefaultConfig = (type) => {
    const defaults = {
      statistics: {
        title: 'Statistics',
        showTitle: true,
        useRealData: true,
      },
      searchBar: {
        placeholder: 'Search...',
        showFilter: false,
        showAddButton: true,
        addButtonText: 'Add Item'
      },
      collectionSelector: {
        title: 'Collections',
        showCreateNew: true,
        showMobile: true
      }
    };
    
    return defaults[type] || {};
  };

  const value = {
    components,
    getComponents,
    updateComponent,
    addComponent,
    removeComponent,
    reorderComponents,
    getComponentData,
    getDefaultConfig,
    isLoading,
    user: currentUser,
    cardsData: {
      cards: cards || [],
      loading: cardsLoading
    }
  };

  return (
    <ComponentProviderContext.Provider value={value}>
      {children}
    </ComponentProviderContext.Provider>
  );
};

/**
 * Hook to use the Component Provider
 */
export const useComponentProvider = () => {
  const context = useContext(ComponentProviderContext);
  if (!context) {
    throw new Error('useComponentProvider must be used within a ComponentProvider');
  }
  return context;
};

/**
 * Hook to get dashboard components specifically
 */
export const useDashboardComponents = () => {
  const { getComponents, isLoading } = useComponentProvider();
  return {
    components: getComponents('dashboard'),
    loading: isLoading()
  };
};

/**
 * Hook to get component configuration
 */
export const useComponentConfig = (type) => {
  const { getDefaultConfig, getComponentData } = useComponentProvider();
  return {
    defaultConfig: getDefaultConfig(type),
    data: getComponentData(type)
  };
};

export default ComponentProvider; 