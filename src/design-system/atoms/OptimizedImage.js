import React from 'react';
import PropTypes from 'prop-types';

/**
 * OptimizedImage component with WebP support and fallbacks
 * For screenshots, falls back to simple img tag to avoid broken responsive variants
 * Includes lazy loading and responsive sizing when variants exist
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  sizes,
  ...props
}) => {
  // For screenshots, use simple img tag to avoid broken responsive variants
  if (src.includes('/screenshots/')) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        {...props}
      />
    );
  }

  // Generate WebP version path by replacing extension
  const webpSrc = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  
  // Generate different sizes for responsive images
  const generateSrcSet = (baseSrc) => {
    if (!sizes) return baseSrc;
    
    const extension = baseSrc.split('.').pop();
    const basePath = baseSrc.replace(`.${extension}`, '');
    
    return [
      `${basePath}-320w.${extension} 320w`,
      `${basePath}-640w.${extension} 640w`,
      `${basePath}-960w.${extension} 960w`,
      `${basePath}-1280w.${extension} 1280w`
    ].join(', ');
  };

  return (
    <picture>
      {/* WebP source with responsive sizes */}
      <source
        srcSet={sizes ? generateSrcSet(webpSrc) : webpSrc}
        sizes={sizes}
        type="image/webp"
      />
      
      {/* AVIF source for even better compression (future enhancement) */}
      {/* <source
        srcSet={sizes ? generateSrcSet(src.replace(/\.(png|jpg|jpeg)$/i, '.avif')) : src.replace(/\.(png|jpg|jpeg)$/i, '.avif')}
        sizes={sizes}
        type="image/avif"
      /> */}
      
      {/* Fallback PNG/JPG */}
      <img
        src={src}
        srcSet={sizes ? generateSrcSet(src) : undefined}
        sizes={sizes}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        {...props}
      />
    </picture>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  loading: PropTypes.oneOf(['lazy', 'eager']),
  decoding: PropTypes.oneOf(['async', 'sync', 'auto']),
  sizes: PropTypes.string,
};

export default OptimizedImage;