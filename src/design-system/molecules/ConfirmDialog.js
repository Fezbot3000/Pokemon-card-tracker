import React from 'react';
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
  // Handle confirm action
  const handleConfirm = async () => {
    try {
      // Call onConfirm and wait for it to complete
      await onConfirm();
      // Only close if onConfirm succeeds
      onClose();
    } catch (error) {
      console.error('Error in confirmation action:', error);
      // Still close the dialog on error to prevent UI from getting stuck
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnClickOutside={false}
    >
      <div className="p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
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
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger'])
};

export default ConfirmDialog;
