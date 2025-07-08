import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for lazy loading images with intersection observer
 * @param {string} src - The image source URL
 * @param {string} placeholder - Placeholder image URL (optional)
 * @returns {Object} - { imageSrc, imageRef, isLoaded, isError }
 */
export const useLazyImage = (src, placeholder = '/placeholder.png') => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    let observer;
    let didCancel = false;

    if (imageRef.current && src) {
      if (IntersectionObserver) {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (
                !didCancel &&
                (entry.intersectionRatio > 0 || entry.isIntersecting)
              ) {
                // Start loading the image
                const img = new Image();

                img.onload = () => {
                  if (!didCancel) {
                    setImageSrc(src);
                    setIsLoaded(true);
                  }
                };

                img.onerror = () => {
                  if (!didCancel) {
                    setIsError(true);
                    // Keep placeholder on error
                  }
                };

                img.src = src;
                observer.unobserve(imageRef.current);
              }
            });
          },
          {
            threshold: 0.01,
            rootMargin: '50px',
          }
        );
        observer.observe(imageRef.current);
      } else {
        // Fallback for browsers without IntersectionObserver
        setImageSrc(src);
        setIsLoaded(true);
      }
    }

    return () => {
      didCancel = true;
      // Store current ref value to avoid stale closure
      const currentImageRef = imageRef.current;
      if (observer && observer.unobserve && currentImageRef) {
        observer.unobserve(currentImageRef);
      }
    };
  }, [src, placeholder]);

  return { imageSrc, imageRef, isLoaded, isError };
};

export default useLazyImage;
