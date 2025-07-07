import React from 'react';
import PropTypes from 'prop-types';
// Import directly from source files to avoid circular dependencies
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * DesignSystemProvider
 *
 * A wrapper component that provides all the necessary context providers
 * from the design system. This makes it easy to integrate the design system
 * into any application.
 */
const DesignSystemProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
};

DesignSystemProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DesignSystemProvider;
