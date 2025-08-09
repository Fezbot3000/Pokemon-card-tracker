import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './BottomNavBar.css';

const BottomNavBar = ({ currentView, onViewChange }) => {
  const navigate = useNavigate();

  // Helper function to check if current view is in the sold section
  const isSoldSection = () => {
    return ['sold', 'sold-items', 'purchase-invoices'].includes(currentView);
  };

  // Helper function to check if current view is in the marketplace section
  const isMarketplaceSection = () => {
    return [
      'marketplace',
      'marketplace-selling',
      'marketplace-messages',
    ].includes(currentView);
  };

  // Check if we're in an active chat in the marketplace messages section
  const isInActiveChat = () => {
    // Check if we're in marketplace messages and if there's an active chat
    if (currentView === 'marketplace-messages') {
      // Check if there's an active chat by looking for the hide-header-footer class
      return document.body.classList.contains('hide-header-footer');
    }
    return false;
  };

  // Safe navigation handler with URL update
  const handleNavigation = targetView => {
    try {
      // Update URL while preserving performance system
      navigate(`/dashboard/${targetView}`, { replace: true });
      
      // Still use state for instant navigation
      setTimeout(() => {
        if (onViewChange && typeof onViewChange === 'function') {
          onViewChange(targetView);
        }
      }, 0);
    } catch (error) {
      logger.error('Error navigating to view:', targetView, error, { context: { file: 'BottomNavBar', purpose: 'navigation' } });
      // Fallback: try direct navigation
      if (onViewChange && typeof onViewChange === 'function') {
        onViewChange(targetView);
      }
    }
  };



  // Don't render the bottom nav bar if we're in an active chat
  if (isInActiveChat()) {
    return null;
  }

  return (
    <div className="mobile-bottom-nav">
      <button
        className={`nav-button ${currentView === 'cards' ? 'active' : ''}`}
        onClick={() => handleNavigation('cards')}
      >
        <span className="material-icons nav-icon">dashboard</span>
        <span className="nav-label">Cards</span>
      </button>

      <button
        className={`nav-button ${isSoldSection() ? 'active' : ''}`}
        onClick={() => handleNavigation('purchase-invoices')}
      >
        <span className="material-icons nav-icon">sell</span>
        <span className="nav-label">Invoices</span>
      </button>

      <button
        className={`nav-button ${isMarketplaceSection() ? 'active' : ''}`}
        onClick={() => handleNavigation('marketplace')}
      >
        <span className="material-icons nav-icon">storefront</span>
        <span className="nav-label">Marketplace</span>
      </button>

      <button
        className={`nav-button ${currentView.startsWith('settings') ? 'active' : ''}`}
        onClick={() => handleNavigation('settings')}
      >
        <span className="material-icons nav-icon">settings</span>
        <span className="nav-label">Settings</span>
      </button>
    </div>
  );
};

BottomNavBar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
};

export default BottomNavBar;