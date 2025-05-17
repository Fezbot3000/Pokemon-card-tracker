/**
 * Subscription Manager
 * 
 * A utility to track and manage all active Firestore subscriptions.
 * This ensures that all subscriptions are properly cleaned up when a user logs out,
 * preventing console errors related to unauthorized Firestore access.
 */

import logger from './logger';

class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.isCleaningUp = false;
  }

  /**
   * Register a subscription with an optional name
   * @param {Function} unsubscribeFn - The function returned by onSnapshot
   * @param {string} [name] - Optional name for the subscription for debugging
   * @returns {string} - ID of the registered subscription
   */
  register(unsubscribeFn, name = '') {
    if (typeof unsubscribeFn !== 'function') {
      logger.warn('Attempted to register a non-function subscription');
      return null;
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(id, {
      unsubscribe: unsubscribeFn,
      name: name || id,
      timestamp: Date.now()
    });

    logger.debug(`Registered subscription: ${name || id}`);
    return id;
  }

  /**
   * Unregister a specific subscription
   * @param {string} id - The subscription ID to unregister
   */
  unregister(id) {
    if (!this.subscriptions.has(id)) {
      return;
    }

    const subscription = this.subscriptions.get(id);
    try {
      subscription.unsubscribe();
      logger.debug(`Unregistered subscription: ${subscription.name}`);
    } catch (error) {
      logger.error(`Error unregistering subscription ${subscription.name}:`, error);
    }

    this.subscriptions.delete(id);
  }

  /**
   * Clean up all active subscriptions
   */
  cleanupAll() {
    if (this.isCleaningUp) {
      return;
    }

    this.isCleaningUp = true;
    logger.debug(`Cleaning up ${this.subscriptions.size} active subscriptions`);

    // Create a copy of the subscription IDs to avoid issues with deletion during iteration
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    subscriptionIds.forEach(id => {
      const subscription = this.subscriptions.get(id);
      try {
        subscription.unsubscribe();
        logger.debug(`Cleaned up subscription: ${subscription.name}`);
      } catch (error) {
        logger.error(`Error cleaning up subscription ${subscription.name}:`, error);
      }
      this.subscriptions.delete(id);
    });

    this.isCleaningUp = false;
    logger.debug('All subscriptions cleaned up');
  }

  /**
   * Get the count of active subscriptions
   * @returns {number} - Number of active subscriptions
   */
  getActiveCount() {
    return this.subscriptions.size;
  }
}

// Create a singleton instance
const subscriptionManager = new SubscriptionManager();

export default subscriptionManager;
