import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * CardImage Component
 * 
 * A component for displaying Pokemon card images with fallback.
 * Can be configured to hide images on the sold page to save space.
 */
const CardImage = ({ 
  src, 
  alt, 
  className = '',
  width = 'w-16 h-20 sm:w-20 sm:h-24',
  hideSoldImages = false,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);

  // If hideSoldImages is true, always show the placeholder
  const shouldShowImage = src && !imageError && !hideSoldImages;

  return (
    <div className={`${width} flex-shrink-0 ${className}`}>
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain rounded-lg"
          loading="lazy"
          onError={() => {
            console.error(`Failed to load image: ${src}`);
            setImageError(true);
          }}
          {...props}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon name="image" className="text-gray-400 dark:text-gray-600" />
        </div>
      )}
    </div>
  );
};

CardImage.propTypes = {
  /** Image source URL */
  src: PropTypes.string,
  /** Alt text for the image */
  alt: PropTypes.string.isRequired,
  /** Additional classes */
  className: PropTypes.string,
  /** Size of the card image container */
  width: PropTypes.string,
  /** Whether to hide images on the sold page */
  hideSoldImages: PropTypes.bool,
};

export default CardImage;
