import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import db from './db';

// Subscription cache to avoid too many API calls
const subscriptionCache = {
  status: null,
  lastChecked: null,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
};

/**
 * Check if the current user has an active subscription
 * @returns {Promise<Object>} Object with subscription status and details
 */
export const checkSubscriptionStatus = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { status: 'inactive' };
  }

  // Check if we have a valid cached result
  if (subscriptionCache.status && 
      subscriptionCache.lastChecked && 
      (Date.now() - subscriptionCache.lastChecked) < subscriptionCache.cacheExpiry) {
    return subscriptionCache.status;
  }

  try {
    // First, check the local cache in IndexedDB
    try {
      const localSubscription = await db.getSubscription(currentUser.uid);
      if (localSubscription && 
          localSubscription.lastVerified && 
          (Date.now() - localSubscription.lastVerified) < 24 * 60 * 60 * 1000) { // 24 hours
        // Use locally stored subscription info if recently verified
        subscriptionCache.status = localSubscription;
        subscriptionCache.lastChecked = Date.now();
        return localSubscription;
      }
    } catch (err) {
      console.log('No local subscription data found or database error:', err);
      // Continue to server check on error
    }

    // If local data is missing or expired, check with the server
    // Explicitly specify the region for Firebase Functions
    const functions = getFunctions(undefined, 'us-central1');
    console.log('Calling checkSubscriptionStatus function for user:', currentUser.uid);
    
    try {
      const checkSubscription = httpsCallable(functions, 'checkSubscriptionStatus');
      const result = await checkSubscription({ userId: currentUser.uid });
      const subscriptionStatus = result.data;
      console.log('Received subscription status:', subscriptionStatus);

      // Add timestamp and user info to the subscription data
      subscriptionStatus.lastVerified = Date.now();
      subscriptionStatus.userId = currentUser.uid;
      
      // Try to save to local cache, but don't fail if that errors
      try {
        await db.saveSubscription(subscriptionStatus);
      } catch (dbError) {
        console.warn('Could not save subscription to local database:', dbError);
      }
      
      // Update memory cache
      subscriptionCache.status = subscriptionStatus;
      subscriptionCache.lastChecked = Date.now();
      
      return subscriptionStatus;
    } catch (functionError) {
      console.error('Error calling subscription function:', functionError);
      
      // If server check fails, fall back to a reasonable default
      // This prevents the app from hanging on subscription errors
      const fallbackStatus = { status: 'error', message: functionError.message };
      
      // Update memory cache with the error status
      subscriptionCache.status = fallbackStatus;
      subscriptionCache.lastChecked = Date.now();
      
      return fallbackStatus;
    }
  } catch (error) {
    console.error('Unexpected error checking subscription status:', error);
    // Return error status for handling in UI
    return { status: 'error', message: 'Subscription check failed' };
  }
};

/**
 * Check if the user has access to premium features
 * @returns {Promise<boolean>} Whether the user has premium access
 */
export const hasPremiumAccess = async () => {
  const subscriptionStatus = await checkSubscriptionStatus();
  return subscriptionStatus.status === 'active';
};

/**
 * Clear the subscription cache (useful after purchasing)
 */
export const clearSubscriptionCache = () => {
  subscriptionCache.status = null;
  subscriptionCache.lastChecked = null;
};

/**
 * Attempt to fix subscription issues by directly checking and updating subscription status
 * @returns {Promise<Object>} Object with updated subscription status and message
 */
export const fixSubscriptionStatus = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { status: 'inactive', updated: false, message: 'User not logged in' };
  }

  try {
    // Clear cache first
    clearSubscriptionCache();
    
    // Call the cloud function to fix the subscription
    const functions = getFunctions(undefined, 'us-central1');
    console.log('Calling fixSubscriptionStatus function for user:', currentUser.uid);
    
    const fixSubscription = httpsCallable(functions, 'fixSubscriptionStatus');
    const result = await fixSubscription({ userId: currentUser.uid });
    const fixResult = result.data;
    
    console.log('Fix subscription result:', fixResult);
    
    // Update local cache with the fixed status
    if (fixResult.updated && fixResult.subscription) {
      const subscriptionStatus = {
        status: fixResult.subscription.status,
        customer: fixResult.subscription.customerId,
        subscriptionId: fixResult.subscription.subscriptionId,
        plan: fixResult.subscription.plan || 'Premium',
        lastVerified: Date.now(),
        userId: currentUser.uid
      };
      
      // Update cache
      subscriptionCache.status = subscriptionStatus;
      subscriptionCache.lastChecked = Date.now();
      
      // Try to save to local database
      try {
        await db.saveSubscription(subscriptionStatus);
      } catch (dbError) {
        console.warn('Could not save fixed subscription to local database:', dbError);
      }
      
      return {
        status: 'active',
        success: true,
        message: 'Subscription status fixed and verified',
        subscription: subscriptionStatus
      };
    }
    
    // If fix wasn't successful with normal approach, try one more time with a direct check
    // This is similar to what the manual check button does
    if (!fixResult.updated || fixResult.status !== 'active') {
      console.log('First fix attempt unsuccessful, trying direct check...');
      
      // Make another call to specifically look for the user by email
      // This is more likely to find the subscription after a recent payment
      const directCheck = httpsCallable(functions, 'directSubscriptionCheck');
      try {
        const directResult = await directCheck({ 
          email: currentUser.email, 
          userId: currentUser.uid 
        });
        
        const directFixResult = directResult.data;
        console.log('Direct check result:', directFixResult);
        
        if (directFixResult.success && directFixResult.subscription) {
          const directSubscriptionStatus = {
            status: directFixResult.subscription.status,
            customer: directFixResult.subscription.customerId,
            subscriptionId: directFixResult.subscription.subscriptionId,
            plan: directFixResult.subscription.plan || 'Premium',
            lastVerified: Date.now(),
            userId: currentUser.uid
          };
          
          // Update cache
          subscriptionCache.status = directSubscriptionStatus;
          subscriptionCache.lastChecked = Date.now();
          
          // Try to save to local database
          try {
            await db.saveSubscription(directSubscriptionStatus);
          } catch (dbError) {
            console.warn('Could not save direct subscription to local database:', dbError);
          }
          
          return {
            status: 'active',
            success: true,
            message: 'Subscription status fixed with direct check',
            subscription: directSubscriptionStatus
          };
        }
      } catch (directError) {
        console.error('Error during direct subscription check:', directError);
        // Continue with the original result - we'll handle this below
      }
    }
    
    return fixResult;
  } catch (error) {
    console.error('Error fixing subscription status:', error);
    return { 
      status: 'error', 
      updated: false, 
      message: error.message || 'Unknown error fixing subscription'
    };
  }
};

/**
 * Add methods to the db service
 */
if (!db.saveSubscription) {
  db.saveSubscription = async (subscriptionData) => {
    const tx = db.db.transaction('subscription', 'readwrite');
    const store = tx.objectStore('subscription');
    await store.put(subscriptionData);
    return tx.complete;
  };
}

if (!db.getSubscription) {
  db.getSubscription = async (userId) => {
    const tx = db.db.transaction('subscription', 'readonly');
    const store = tx.objectStore('subscription');
    const result = await store.get(userId);
    return result;
  };
} 