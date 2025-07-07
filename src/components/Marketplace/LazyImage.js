import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function LazyImage({ src, alt, className, placeholder, onLoad, onError, onClick }) {
  const [imageSrc, setImageSrc] = useState(placeholder || null);
  const [imageRef, setImageRef] = useState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let observer;
    
    if (imageRef && src) {
      if (IntersectionObserver) {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setImageSrc(src);
                observer.unobserve(imageRef);
              }
            });
          },
          { threshold: 0.1, rootMargin: '50px' }
        );
        observer.observe(imageRef);
      } else {
        // Fallback for browsers that don't support IntersectionObserver
        setImageSrc(src);
      }
    }
    
    return () => {
      if (observer && observer.unobserve && imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    setIsError(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setIsError(true);
    setIsLoaded(true);
    if (onError) onError(e);
  };

  return (
    <div className={`relative ${className}`} ref={setImageRef} onClick={onClick}>
      {/* Placeholder or loading state */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      )}
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
          <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">broken_image</span>
        </div>
      )}
      
      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  onClick: PropTypes.func
};

export default LazyImage;
