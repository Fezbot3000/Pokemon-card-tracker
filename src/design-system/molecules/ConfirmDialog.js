import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Button from '../atoms/Button';
import LoggingService from '../../services/LoggingService';

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
  variant = 'danger',
  zIndex = "55000",
  loading = false,
}) => {
  // Effect to ensure UI is reset if the dialog is closed unexpectedly
  useEffect(() => {
    // Cleanup function to ensure UI is unlocked if dialog is unmounted
    return () => {
      // Note: Don't remove 'modal-open' class here as other modals might still be open
      // The base Modal component handles scroll position and modal-open class properly
      
      // Ensure any "blocked" UI elements are re-enabled
      const blockers = document.querySelectorAll(
        '.modal-backdrop, .modal-overlay'
      );
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
      LoggingService.error('Error in confirmation action:', error);
      // Still close the dialog on error to prevent UI from getting stuck
      handleClose();
    }
  };

  // Centralized close handler to ensure proper cleanup
  const handleClose = () => {
    // Note: Don't remove 'modal-open' class here as other modals might still be open
    // The base Modal component handles scroll position management properly
    
    // Remove any stray modal overlay elements (but not modal-open class)
    const overlays = document.querySelectorAll(
      '.modal-backdrop, .modal-overlay'
    );
    overlays.forEach(el => el.parentNode?.removeChild(el));

    // Finally, call the provided onClose callback
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="contextual"
      closeOnClickOutside={true}
      zIndex={zIndex}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            className="min-w-[80px]"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            className="min-w-[80px]"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmText}
          </Button>
        </>
      }
    >
      <div className="text-gray-700 dark:text-gray-300">{message}</div>
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
  variant: PropTypes.string,
  zIndex: PropTypes.string,
  loading: PropTypes.bool,
};

export default ConfirmDialog;
