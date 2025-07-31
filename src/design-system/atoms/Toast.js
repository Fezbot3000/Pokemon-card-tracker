import React from 'react';
import PropTypes from 'prop-types';
import { toast, Toaster, ToastBar } from 'react-hot-toast';
import Icon from './Icon';

/**
 * Toast Component
 *
 * A wrapper around react-hot-toast to provide consistent styling and API.
 */
const Toast = ({
  position = 'bottom-right',
  reverseOrder = false,
  gutter = 8,
  containerStyle = {},
  toastOptions = {},
  ...props
}) => {
  // Default toast styling
  const defaultToastOptions = {
    duration: 3000,
    style: {
      background: '#1B2131',
      color: '#FFFFFF',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      borderRadius: '12px',
      padding: '12px 16px',
      fontWeight: '500',
      maxWidth: '350px',
    },
  };

  // Merge default options with user options
  const mergedOptions = {
    ...defaultToastOptions,
    ...toastOptions,
  };

  // Ensure toasts appear above modals (modals use z-[50000])
  const defaultContainerStyle = {
    zIndex: 60000, // Higher than modal z-index (50000)
    ...containerStyle,
  };

  return (
    <Toaster
      position={position}
      reverseOrder={reverseOrder}
      gutter={gutter}
      containerStyle={defaultContainerStyle}
      toastOptions={mergedOptions}
      {...props}
    >
      {t => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              {t.type !== 'loading' && (
                <button onClick={() => toast.dismiss(t.id)}>
                  <Icon name="close" size="sm" />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

Toast.propTypes = {
  /** Position of the toast container */
  position: PropTypes.oneOf([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ]),
  /** Whether to show toasts in reverse order */
  reverseOrder: PropTypes.bool,
  /** Space between toasts */
  gutter: PropTypes.number,
  /** Additional styles for the container */
  containerStyle: PropTypes.object,
  /** Options for the toast */
  toastOptions: PropTypes.object,
};

export default Toast;
