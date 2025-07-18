import React from 'react';

/**
 * OptimizedImage component with WebP support and fallbacks
 * Automatically serves WebP when supported, PNG as fallback
 * Includes lazy loading and responsive sizing
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

export default OptimizedImage; 