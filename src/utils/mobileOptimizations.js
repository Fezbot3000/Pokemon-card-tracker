/**
 * Mobile Performance Optimizations
 * Defers heavy services on mobile devices for faster initial loading
 */

// Detect if user is on mobile device
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
};

// Detect if user is on slow connection
export const isSlowConnection = () => {
  if (typeof navigator === 'undefined' || !navigator.connection) return false;
  
  const connection = navigator.connection;
  return (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.effectiveType === '3g' ||
    connection.saveData === true
  );
};

// Should defer Firebase initialization
export const shouldDeferFirebase = () => {
  return isMobileDevice() || isSlowConnection();
};

// Performance-aware component loader
export const createPerformanceAwareLoader = (importFunction, fallback = null) => {
  return () => {
    // Show fallback immediately on slow devices
    if (shouldDeferFirebase() && fallback) {
      // Defer actual loading by 100ms to allow critical render
      setTimeout(() => importFunction(), 100);
      return fallback;
    }
    
    return importFunction();
  };
};

// Intersection Observer for lazy initialization
export const createLazyInitializer = (callback, options = {}) => {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return (element) => {
    if (!element || !('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      setTimeout(callback, 1000);
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      });
    }, defaultOptions);
    
    observer.observe(element);
  };
};

// Priority-based resource loading
export const loadResourceWithPriority = (resource, priority = 'low') => {
  if (typeof window === 'undefined') return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = resource;
    
    // Set loading priority
    if ('importance' in script) {
      script.importance = priority;
    }
    
    script.onload = resolve;
    script.onerror = reject;
    
    // Defer loading on mobile
    if (shouldDeferFirebase()) {
      script.defer = true;
    }
    
    document.head.appendChild(script);
  });
};

// Network-aware fetch
export const performanceAwareFetch = (url, options = {}) => {
  const defaultOptions = {
    ...options,
  };
  
  // Add timeout for mobile devices
  if (isMobileDevice()) {
    defaultOptions.signal = AbortSignal.timeout(10000); // 10s timeout
  }
  
  return fetch(url, defaultOptions);
}; 