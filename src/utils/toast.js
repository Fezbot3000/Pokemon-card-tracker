/**
 * Displays a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 * @param {number} duration - How long to display the toast in milliseconds
 * @returns {HTMLElement} - The toast element
 */
export const showToast = (message, type = 'info', duration = 3000) => {
  // Remove any existing toasts with the same message
  document.querySelectorAll('.toast-notification').forEach(el => {
    if (el.textContent === message) {
      el.remove();
    }
  });

  // Create the toast element
  const toast = document.createElement('div');
  
  // Set background color based on type
  const bgColor = 
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500';
  
  // Add classes for styling - using a very high z-index to ensure visibility
  toast.className = `fixed right-4 bottom-20 z-[9999] px-6 py-3 rounded-lg shadow-lg ${bgColor} text-white transition-all duration-300 toast-notification`;
  toast.textContent = message;
  
  // Add to the DOM
  document.body.appendChild(toast);

  // Set timeout for removing the toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      // Only remove if the element still exists
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
  
  return toast;
};

/**
 * Updates an existing toast notification
 * @param {HTMLElement} toast - The toast element to update
 * @param {string} message - New message
 * @param {string} type - New type
 */
export const updateToast = (toast, message, type = 'info') => {
  if (!toast || !toast.parentNode) return;
  
  // Set background color based on type
  const bgColor = 
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500';
  
  // Update classes & text - using a very high z-index to ensure visibility
  toast.className = `fixed right-4 bottom-20 z-[9999] px-6 py-3 rounded-lg shadow-lg ${bgColor} text-white transition-all duration-300 toast-notification`;
  toast.textContent = message;
}; 