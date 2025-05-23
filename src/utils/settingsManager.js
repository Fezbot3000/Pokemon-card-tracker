/**
 * Settings Modal Manager
 * Handles the settings modal state and related UI updates
 */

export const settingsManager = {
  /**
   * Opens the settings modal and updates body class
   * @param {boolean} isMobile - Whether the device is mobile
   * @param {Function} setCurrentView - Function to set current view
   * @param {Function} setShowSettings - Function to show/hide settings
   */
  openSettings: (isMobile, setCurrentView, setShowSettings) => {
    document.body.classList.add('settings-open');
    
    // For mobile, treat settings as a view
    if (isMobile) {
      setCurrentView('settings');
    }
    
    // Always show settings regardless of device
    setShowSettings(true);
  },

  /**
   * Closes the settings modal and updates body class
   * @param {boolean} isMobile - Whether the device is mobile
   * @param {string} currentView - Current view state
   * @param {Function} setCurrentView - Function to set current view
   * @param {Function} setShowSettings - Function to show/hide settings
   */
  closeSettings: (isMobile, currentView, setCurrentView, setShowSettings) => {
    document.body.classList.remove('settings-open');
    
    setShowSettings(false);
    // If we're on mobile and current view is settings,
    // go back to cards view when closing settings
    if (isMobile && currentView === 'settings') {
      setCurrentView('cards');
    }
  }
};
