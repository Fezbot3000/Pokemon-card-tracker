import React from 'react';
import PropTypes from 'prop-types';

/**
 * Avatar
 *
 * Circular user image with fallback.
 */
const sizeMap = {
  small: 'h-8 w-8 text-sm',
  medium: 'h-10 w-10 text-base',
  large: 'h-12 w-12 text-lg',
};

const Avatar = ({ src, alt, size = 'medium', fallback, className = '' }) => {
  const sizeClasses = sizeMap[size] || sizeMap.medium;
  return (
    <div
      className={`${sizeClasses} flex items-center justify-center overflow-hidden rounded-full bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-200 ${className}`}
      aria-label={alt}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="font-medium">
          {fallback || (alt ? alt.charAt(0) : '?')}
        </span>
      )}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fallback: PropTypes.node,
  className: PropTypes.string,
};

export default Avatar;
