import React from 'react';
import PropTypes from 'prop-types';

const ImageModal = ({ isOpen, onClose, imageUrl, alt }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{
        height: '100vh',
        minHeight: '100vh'
      }}
    >
      <div className="relative w-full max-w-2xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-8 right-0 text-white hover:text-gray-300 p-1"
        >
          <span className="material-icons">close</span>
        </button>
        <div 
          className="relative w-full" 
          style={{ maxHeight: 'calc(100vh - 6rem)' }}
        >
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto object-contain rounded-lg"
            style={{ maxHeight: 'calc(100vh - 6rem)' }}
          />
        </div>
      </div>
    </div>
  );
};

ImageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  imageUrl: PropTypes.string.isRequired,
  alt: PropTypes.string
};

export default ImageModal;
