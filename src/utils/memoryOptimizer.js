/**
 * Memory optimization utilities for handling large card collections
 */

import logger from './logger';

// Virtual scrolling helper - only render visible items
export class VirtualList {
  constructor(items, itemHeight, containerHeight) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.scrollTop = 0;
  }

  get visibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.ceil(
      (this.scrollTop + this.containerHeight) / this.itemHeight
    );

    return {
      items: this.items.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex,
      totalHeight: this.items.length * this.itemHeight,
      offsetY: startIndex * this.itemHeight,
    };
  }

  setScrollTop(scrollTop) {
    this.scrollTop = scrollTop;
  }
}

// Pagination helper for large datasets
export const paginateData = (data, page = 1, pageSize = 50) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: data.slice(startIndex, endIndex),
    currentPage: page,
    pageSize,
    totalItems: data.length,
    totalPages: Math.ceil(data.length / pageSize),
    hasNextPage: endIndex < data.length,
    hasPrevPage: page > 1,
  };
};

// Debounce function to reduce re-renders
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memory-efficient image loading
export const loadImageWithFallback = async (
  url,
  fallbackUrl = '/placeholder.png'
) => {
  return new Promise(resolve => {
    const img = new Image();

    img.onload = () => {
      resolve(url);
    };

    img.onerror = () => {
      logger.warn(`Failed to load image: ${url}`, { context: { file: 'memoryOptimizer', purpose: 'image-loading' } });
      resolve(fallbackUrl);
    };

    img.src = url;
  });
};

// Clean up old data from memory
export const cleanupOldData = (data, maxAge = 3600000) => {
  // 1 hour default
  const now = Date.now();
  return data.filter(item => {
    const itemAge = now - (item.lastAccessed || item.createdAt || 0);
    return itemAge < maxAge;
  });
};

// Batch operations to reduce memory spikes
export const batchProcess = async (items, batchSize, processor) => {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Allow browser to breathe between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
};

export default {
  VirtualList,
  paginateData,
  debounce,
  throttle,
  loadImageWithFallback,
  cleanupOldData,
  batchProcess,
};
