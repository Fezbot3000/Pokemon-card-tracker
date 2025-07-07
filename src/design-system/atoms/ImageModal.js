import React from 'react';
import PropTypes from 'prop-types';

const ImageModal = ({ isOpen, onClose, imageUrl, alt }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="bg-black/75 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}

    >
      <div className="relative w-full max-w-2xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-8 right-0 p-1 text-white hover:text-gray-300"
        >
          <span className="material-icons">close</span>
        </button>
        <div 
          className="relative w-full" 
        >
          <img
            src={imageUrl}
            alt={alt}
            className="h-auto w-full rounded-lg object-contain"
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
