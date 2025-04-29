import { useEffect, useCallback } from 'react';
import CacheManager from '../utils/CacheManager';
import logger from '../utils/logger';

/**
 * Custom hook for caching card images
 * Prevents unnecessary image reloading when navigating between views
 */
export const useImageCache = () => {
  // Cache an image by card ID
  const cacheImage = useCallback((cardId, imageUrl) => {
    if (!imageUrl || !cardId) return;
    
    // Store in the cache manager
    CacheManager.cacheImage(cardId, imageUrl);
  }, []);
  
  // Get a cached image
  const getCachedImage = useCallback((cardId) => {
    if (!cardId) return null;
    return CacheManager.getCachedImage(cardId);
  }, []);
  
  // Pre-fetch and cache an image
  const prefetchImage = useCallback(async (cardId, imageUrl) => {
    if (!imageUrl || !cardId || CacheManager.getCachedImage(cardId)) return;
    
    try {
      // Fetch the image and cache it
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Store both the original and object URL
      CacheManager.cacheImage(cardId, objectUrl);
      logger.debug(`Prefetched and cached image for card ${cardId}`);
      
      return objectUrl;
    } catch (error) {
      logger.error(`Failed to prefetch image for card ${cardId}:`, error);
      return imageUrl; // Fall back to original URL
    }
  }, []);
  
  // Setup cleanup on unmount
  useEffect(() => {
    // Handle cleanup for blob URLs on component unmount
    return () => {
      // No specific cleanup needed here as CacheManager persists
    };
  }, []);
  
  return {
    cacheImage,
    getCachedImage,
    prefetchImage
  };
};
