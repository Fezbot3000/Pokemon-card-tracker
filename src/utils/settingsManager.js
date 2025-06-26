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
   * @param {Function} navigate - Navigation function for routing (optional, for mobile)
   */
  openSettings: (isMobile, setCurrentView, setShowSettings, navigate = null) => {
    try {
      document.body.classList.add('settings-open');
      
      // For mobile, navigate to settings page instead of modal
      if (isMobile && navigate) {
        navigate('/dashboard/settings');
        return;
      }
      
      // For desktop or when navigate is not provided, use modal
      if (isMobile) {
        setCurrentView('settings');
      }
      
      // Always show settings regardless of device
      setShowSettings(true);
    } catch (error) {
      console.error('Error opening settings:', error);
      // Fallback: just show settings modal
      setShowSettings(true);
    }
  },

  /**
   * Closes the settings modal and updates body class
   * @param {boolean} isMobile - Whether the device is mobile
   * @param {string} currentView - Current view state
   * @param {Function} setCurrentView - Function to set current view
   * @param {Function} setShowSettings - Function to show/hide settings
   * @param {string} targetView - Optional target view to navigate to after closing settings
   */
  closeSettings: (isMobile, currentView, setCurrentView, setShowSettings, targetView = null) => {
    try {
      document.body.classList.remove('settings-open');
      
      setShowSettings(false);
      
      // Handle view transition after closing settings
      if (isMobile && currentView === 'settings') {
        // If a target view is specified, navigate to it, otherwise default to cards
        const nextView = targetView || 'cards';
        
        // Use setTimeout to ensure state updates happen in the correct order
        setTimeout(() => {
          setCurrentView(nextView);
        }, 0);
      }
    } catch (error) {
      console.error('Error closing settings:', error);
      // Fallback: just hide settings modal
      setShowSettings(false);
    }
  },

  /**
   * Safely navigates from settings to a specific view
   * @param {boolean} isMobile - Whether the device is mobile
   * @param {Function} setCurrentView - Function to set current view
   * @param {Function} setShowSettings - Function to show/hide settings
   * @param {string} targetView - The view to navigate to
   */
  navigateFromSettings: (isMobile, setCurrentView, setShowSettings, targetView) => {
    try {
      if (isMobile) {
        // First close settings, then navigate to target view
        settingsManager.closeSettings(isMobile, 'settings', setCurrentView, setShowSettings, targetView);
      } else {
        // On desktop, just close the modal and set the view
        setShowSettings(false);
        setCurrentView(targetView);
      }
    } catch (error) {
      console.error('Error navigating from settings:', error);
      // Fallback: just set the target view
      setCurrentView(targetView);
    }
  }
};
