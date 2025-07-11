import React from 'react';
import ComponentRegistry from './ComponentRegistry';
import useCardData from '../hooks/useCardData';
import { useAuth } from '../design-system/contexts/AuthContext';

/**
 * Dashboard Widget System
 * 
 * This system allows for dynamic rendering of components anywhere in the application.
 * Widgets are self-contained and can be configured through the DesignSystemConfigurator.
 */

/**
 * Widget Data Provider
 * 
 * This hook provides data to widgets based on their type and configuration.
 * It centralizes data fetching and processing logic.
 */
export const useWidgetData = () => {
  const { cards, loading: cardsLoading } = useCardData();
  const { currentUser } = useAuth();
  
  const getWidgetData = (type, config = {}) => {
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
          onSearch: config.onSearch || (() => {}),
          onAddCard: config.onAddCard || (() => {})
        };
      
      case 'collectionSelector':
        return {
          selectedCollection: config.selectedCollection || 'All Collections',
          collections: config.collections || [],
          onCollectionChange: config.onCollectionChange || (() => {}),
          onAddCollection: config.onAddCollection || (() => {})
        };
      
      default:
        return {};
    }
  };
  
  return {
    getWidgetData,
    loading: cardsLoading,
    user: currentUser
  };
};

/**
 * Widget Component
 * 
 * A generic widget component that can render any registered component type.
 * This is the main building block for the dashboard and other dynamic layouts.
 */
export const Widget = ({ 
  type, 
  config = {}, 
  data = {}, 
  className = '', 
  showLoading = true,
  fallback = null,
  ...props 
}) => {
  const { getWidgetData, loading } = useWidgetData();
  
  // Get data for this widget type
  const widgetData = getWidgetData(type, config);
  
  // Merge provided data with widget data
  const finalData = { ...widgetData, ...data };
  
  // Show loading state if data is still loading
  if (loading && showLoading) {
    return <WidgetSkeleton type={type} className={className} />;
  }
  
  // Render the component using the registry
  const renderedComponent = ComponentRegistry.render(type, finalData, config, {
    className,
    ...props
  });
  
  // Return fallback if component couldn't be rendered
  if (!renderedComponent) {
    return fallback || (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Widget type "{type}" not found
      </div>
    );
  }
  
  return renderedComponent;
};

/**
 * Widget Skeleton
 * 
 * Loading state for widgets while data is being fetched.
 */
export const WidgetSkeleton = ({ type, className = '' }) => {
  const skeletons = {
    statistics: (
      <div className={`w-full rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-black ${className}`}>
        <div className="rounded-md p-2 sm:p-4 md:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0">
            {[
              { label: 'CARDS', width: 'w-8' },
              { label: 'PAID', width: 'w-16' },
              { label: 'VALUE', width: 'w-16' },
              { label: 'PROFIT', width: 'w-12' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center border-none p-2 py-3 sm:p-3 sm:py-4 md:p-4 md:py-6"
              >
                <div className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-sm">
                  {stat.label}
                </div>
                <div
                  className={`h-6 ${stat.width} animate-pulse rounded bg-gray-200 dark:bg-[#333]`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    
    searchBar: (
      <div className={`flex flex-col items-stretch justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-[#333] dark:bg-black sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${className}`}>
        <div className="min-w-0 flex-1">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
          <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
        </div>
      </div>
    ),
    
    collectionSelector: (
      <div className={`h-12 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-[#333] ${className}`}></div>
    )
  };
  
  return skeletons[type] || (
    <div className={`h-20 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-[#333] ${className}`}></div>
  );
};

/**
 * Widget Container
 * 
 * A container component that can hold multiple widgets and manage their layout.
 * Useful for dashboard layouts and complex component arrangements.
 */
export const WidgetContainer = ({ 
  widgets = [], 
  className = '', 
  layout = 'vertical',
  gap = 'md',
  ...props 
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  const layoutClasses = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };
  
  return (
    <div 
      className={`${layoutClasses[layout]} ${gapClasses[gap]} ${className}`}
      {...props}
    >
      {widgets.map((widget, index) => (
        <Widget
          key={widget.id || `widget-${index}`}
          type={widget.type}
          config={widget.config}
          data={widget.data}
          className={widget.className}
          {...widget.props}
        />
      ))}
    </div>
  );
};

/**
 * Dashboard Layout
 * 
 * A specialized layout component for dashboard pages that renders widgets
 * in a predefined structure optimized for dashboard interfaces.
 */
export const DashboardLayout = ({ 
  widgets = [], 
  className = '', 
  showContainer = true,
  ...props 
}) => {
  const containerClasses = showContainer 
    ? 'main-content mobile-dashboard mx-auto max-w-[1920px] p-4 pb-20 sm:p-6'
    : '';
  
  return (
    <div className={`${containerClasses} ${className}`} {...props}>
      <div className="w-full px-1 pb-20 sm:px-2">
        <WidgetContainer
          widgets={widgets}
          layout="vertical"
          gap="md"
        />
      </div>
    </div>
  );
};

export default Widget; 