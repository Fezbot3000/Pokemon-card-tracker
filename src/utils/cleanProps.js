/**
 * Utility function to remove debugging attributes from props
 * @param {Object} props - The props object to clean
 * @returns {Object} - The cleaned props object
 */
export const cleanProps = (props) => {
  if (!props) return {};
  
  const cleanedProps = { ...props };
  
  // Remove debugging attributes
  if (cleanedProps['data-component-name']) {
    delete cleanedProps['data-component-name'];
  }
  
  return cleanedProps;
};

/**
 * HOC (Higher-Order Component) that wraps a component and removes debugging attributes
 * @param {Component} Component - The React component to wrap
 * @returns {Component} - The wrapped component
 */
export const withCleanProps = (Component) => {
  return (props) => {
    const cleanedProps = cleanProps(props);
    return <Component {...cleanedProps} />;
  };
};

export default cleanProps;
