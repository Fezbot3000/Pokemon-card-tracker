import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Button from '../atoms/Button';

/**
 * ConfirmDialog Component
 * 
 * A reusable confirmation dialog component that presents a message to the user
 * and waits for their confirmation or cancellation.
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  // Effect to ensure UI is reset if the dialog is closed unexpectedly
  useEffect(() => {
    // Cleanup function to ensure UI is unlocked if dialog is unmounted
    return () => {
      // Remove any lingering focus traps or body classes
      document.body.classList.remove('modal-open');
      
      // Ensure any "blocked" UI elements are re-enabled
      const blockers = document.querySelectorAll('.modal-backdrop, .modal-overlay');
      blockers.forEach(el => el.parentNode?.removeChild(el));
    };
  }, []);
  
  // Handle confirm action
  const handleConfirm = async () => {
    try {
      // Call onConfirm and wait for it to complete
      await onConfirm();
      // Only close if onConfirm succeeds
      handleClose();
    } catch (error) {
      console.error('Error in confirmation action:', error);
      // Still close the dialog on error to prevent UI from getting stuck
      handleClose();
    }
  };
  
  // Centralized close handler to ensure proper cleanup
  const handleClose = () => {
    // Explicitly remove any overlay classes or elements that might be blocking UI
    document.body.classList.remove('modal-open');
    const overlays = document.querySelectorAll('.modal-backdrop, .modal-overlay');
    overlays.forEach(el => el.parentNode?.removeChild(el));
    
    // Finally, call the provided onClose callback
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnClickOutside={true}
    >
      <div className="p-6">
        <div className="text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            className="min-w-[80px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            className="min-w-[80px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.node,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.string
};

export default ConfirmDialog;
