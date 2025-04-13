import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * CardImage Component
 * 
 * A component for displaying Pokemon card images with fallback.
 */
const CardImage = ({ 
  src, 
  alt, 
  className = '',
  width = 'w-16 h-20 sm:w-20 sm:h-24',
  ...props 
}) => {
  return (
    <div className={`${width} flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain rounded-lg"
          loading="lazy"
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
};

export default CardImage;
