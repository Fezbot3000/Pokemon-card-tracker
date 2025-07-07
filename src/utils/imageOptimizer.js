/**
 * Image optimization utilities for lazy loading and performance
 */

// Lazy load images using Intersection Observer
export const setupImageLazyLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              img.classList.add('loaded');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    return imageObserver;
  }

  // Fallback for browsers without IntersectionObserver
  const lazyImages = document.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => {
    img.src = img.getAttribute('data-src');
    img.removeAttribute('data-src');
  });

  return null;
};

// Convert image URLs to use lazy loading
export const prepareLazyImage = (
  imageUrl,
  placeholder = '/placeholder.png'
) => {
  return {
    src: placeholder,
    'data-src': imageUrl,
    loading: 'lazy', // Native lazy loading as fallback
  };
};

// Optimize image size based on container
export const getOptimizedImageUrl = (originalUrl, width = 300) => {
  // If it's a blob URL or local file, return as is
  if (originalUrl?.startsWith('blob:') || originalUrl?.startsWith('file:')) {
    return originalUrl;
  }

  // For Firebase Storage URLs, we could add image transformation parameters
  // For now, just return the original URL
  return originalUrl;
};

// Preload critical images
export const preloadImage = url => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
};

// Clean up blob URLs when component unmounts
export const cleanupBlobUrls = urls => {
  if (Array.isArray(urls)) {
    urls.forEach(url => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  } else if (urls?.startsWith('blob:')) {
    URL.revokeObjectURL(urls);
  }
};

export default {
  setupImageLazyLoading,
  prepareLazyImage,
  getOptimizedImageUrl,
  preloadImage,
  cleanupBlobUrls,
};
