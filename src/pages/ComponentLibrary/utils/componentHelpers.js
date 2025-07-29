/**
 * Component Helpers for Component Library
 * 
 * This file contains helper functions for component rendering and management
 * used throughout the Component Library.
 */

/**
 * Validates component props and provides default values
 * 
 * @param {Object} props - Component props
 * @param {Object} defaults - Default prop values
 * @returns {Object} Validated props with defaults
 */
export const validateProps = (props, defaults) => {
  return {
    ...defaults,
    ...props,
  };
};

/**
 * Creates a mock data generator for component examples
 * 
 * @param {string} type - Type of mock data to generate
 * @param {Object} options - Options for data generation
 * @returns {Object} Mock data object
 */
export const createMockData = (type, options = {}) => {
  switch (type) {
    case 'card':
      return {
        id: options.id || 'mock-card-1',
        name: options.name || 'Charizard',
        set: options.set || 'Base Set',
        condition: options.condition || 'Near Mint',
        value: options.value || 150.00,
        image: options.image || '/card-images/DefaultCard.png',
        ...options,
      };
    
    case 'user':
      return {
        id: options.id || 'mock-user-1',
        name: options.name || 'John Doe',
        email: options.email || 'john@example.com',
        avatar: options.avatar || '/avatars/default.png',
        ...options,
      };
    
    case 'collection':
      return {
        id: options.id || 'mock-collection-1',
        name: options.name || 'My Pokemon Collection',
        cardCount: options.cardCount || 150,
        totalValue: options.totalValue || 2500.00,
        ...options,
      };
    
    default:
      return {};
  }
};

/**
 * Generates sample data for component examples
 * 
 * @param {string} componentType - Type of component
 * @param {number} count - Number of items to generate
 * @returns {Array} Array of sample data
 */
export const generateSampleData = (componentType, count = 5) => {
  const samples = [];
  
  for (let i = 0; i < count; i++) {
    switch (componentType) {
      case 'cards':
        samples.push(createMockData('card', {
          id: `card-${i + 1}`,
          name: `Pokemon Card ${i + 1}`,
          value: Math.floor(Math.random() * 500) + 10,
        }));
        break;
      
      case 'users':
        samples.push(createMockData('user', {
          id: `user-${i + 1}`,
          name: `User ${i + 1}`,
        }));
        break;
      
      case 'collections':
        samples.push(createMockData('collection', {
          id: `collection-${i + 1}`,
          name: `Collection ${i + 1}`,
        }));
        break;
      
      default:
        samples.push({ id: `item-${i + 1}`, name: `Item ${i + 1}` });
    }
  }
  
  return samples;
};

/**
 * Creates a standardized component example wrapper
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {Object} props - Props to pass to component
 * @param {string} title - Example title
 * @param {string} description - Example description
 * @returns {Object} Wrapped component with metadata
 */
export const createComponentExample = (Component, props, title, description) => ({
  Component,
  props,
  title,
  description,
  key: `${title}-${Date.now()}`,
});

/**
 * Handles common component interactions for examples
 * 
 * @param {string} action - Action type
 * @param {Object} data - Action data
 * @param {Function} callback - Optional callback function
 */
export const handleComponentAction = (action, data, callback) => {
  // console.log(`Component action: ${action}`, data);
  
  if (callback) {
    callback(action, data);
  }
  
  // Add toast notification for demo purposes
  if (typeof window !== 'undefined' && window.toastService) {
    window.toastService.success(`Action: ${action} completed`);
  }
};

/**
 * Validates component accessibility attributes
 * 
 * @param {Object} props - Component props
 * @returns {Object} Validation results
 */
export const validateAccessibility = (props) => {
  const issues = [];
  
  // Check for required accessibility attributes
  if (props.role && !props['aria-label'] && !props['aria-labelledby']) {
    issues.push('Component with role should have aria-label or aria-labelledby');
  }
  
  if (props.onClick && !props.tabIndex && !props.role) {
    issues.push('Clickable component should have tabIndex or role');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}; 