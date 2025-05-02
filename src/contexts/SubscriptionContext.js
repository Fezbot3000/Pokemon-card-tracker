import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { checkSubscriptionStatus, clearSubscriptionCache, fixSubscriptionStatus } from '../services/subscriptionService';

const SubscriptionContext = createContext();

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    status: 'loading',
    plan: null,
    customer: null,
    subscriptionId: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Clear subscription cache when user changes (login/logout)
  useEffect(() => {
    // Clear cache on user change (including login and logout)
    clearSubscriptionCache();
    
    // Reset subscription status when user logs out
    if (!user) {
      setSubscriptionStatus({ status: 'inactive' });
      setIsLoading(false);
    }
  }, [user?.uid]); // Use user.uid instead of user to ensure it triggers on actual user change

  // Check subscription status when user changes
  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      if (!user) {
        return; // Already handled in the effect above
      }

      setIsLoading(true);
      try {
        // Force a fresh check by clearing the cache first
        clearSubscriptionCache();
        const status = await checkSubscriptionStatus();
        
        if (isMounted) {
          setSubscriptionStatus(status);
        }
      } catch (error) {
        if (isMounted) {
          setSubscriptionStatus({ status: 'error', message: error.message });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      checkStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.uid]); // Use user.uid instead of user

  // Check subscription status after purchase completion
  useEffect(() => {
    // Detect if we're coming back from a successful checkout
    const isFromPayment = window.location.search.includes('checkout_success=true');
    
    if (isFromPayment) {
      clearSubscriptionCache();
      
      // Add a flag to local storage to indicate this was a successful payment
      localStorage.setItem('recentPayment', 'true');
      
      // Immediately trigger the fixSubscription method which has better success finding subscriptions
      postPaymentCheck();
    } else if (localStorage.getItem('recentPayment') === 'true') {
      postPaymentCheck();
    }
  }, []);
  
  // New function to handle post-payment subscription verification
  const postPaymentCheck = async () => {
    setIsLoading(true);
    
    try {
      // First try the fix method which does a direct email lookup in Stripe
      const fixResult = await fixSubscription();
      
      // If fix was successful, we're done
      if (fixResult.success) {
        // Clear the recent payment flag
        localStorage.removeItem('recentPayment');
        
        // If we're on the pricing page, redirect to dashboard
        if (window.location.pathname.includes('/dashboard/pricing')) {
          window.location.href = '/dashboard';
        }
        return;
      }
      
      // If fix wasn't successful, fall back to regular verification
      await verifySubscription();
    } catch (error) {
      // Fall back to regular verification
      await verifySubscription();
    } finally {
      setIsLoading(false);
      
      // Clear URL parameters
      if (window.location.search.includes('checkout_success=true')) {
        const url = new URL(window.location);
        url.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', url);
      }
    }
  };
  
  // Separate the verification logic into its own function to reuse it
  const verifySubscription = async () => {
    // Define a function to attempt verification with retry logic
    const attemptVerification = async (attempts = 1, maxAttempts = 5, delay = 2000) => {
      
      try {
        const status = await checkSubscriptionStatus();
        
        // Check if we got an active subscription
        if (status.status === 'active') {
          setSubscriptionStatus(status);
          // Clear the recent payment flag
          localStorage.removeItem('recentPayment');
          return true;
        }
        
        // If not active but we have more attempts, retry after delay
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptVerification(attempts + 1, maxAttempts, delay * 1.5);
        }
        
        // If we've exhausted all attempts, return the last status
        setSubscriptionStatus(status);
        return false;
      } catch (error) {
        
        // Retry on error if we have attempts left
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptVerification(attempts + 1, maxAttempts, delay * 1.5);
        }
        
        // If we've exhausted all attempts, throw the error
        throw error;
      }
    };
    
    // Start verification attempts
    try {
      const success = await attemptVerification();
      
      // If verification was successful, redirect to dashboard
      if (success) {
        
        // If we're not already on the dashboard, redirect there
        if (!window.location.pathname.includes('/dashboard')) {
          window.location.href = '/dashboard';
        } else if (window.location.pathname.includes('/dashboard/pricing')) {
          // Special case for when we're on the pricing page after successful payment
          window.location.href = '/dashboard';
        }
      } else {
        
        // Even without successful verification, we'll still let users continue
        // The DashboardPricing component will show a special screen
      }
    } catch (error) {
      
      // Even with error, we'll let the DashboardPricing component handle it
    }
  };

  // Method to force refresh of subscription status
  const refreshSubscriptionStatus = async () => {
    setIsLoading(true);
    clearSubscriptionCache();
    
    try {
      const status = await checkSubscriptionStatus();
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      return { status: 'error', message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Method to attempt fixing subscription issues
  const fixSubscription = async () => {
    setIsLoading(true);
    
    try {
      const result = await fixSubscriptionStatus();
      
      if (result.updated && result.status === 'active') {
        // If we successfully fixed the subscription to active, update the state
        const updatedStatus = {
          status: 'active',
          customer: result.subscription?.customerId,
          subscriptionId: result.subscription?.subscriptionId,
          plan: result.subscription?.plan || 'Premium'
        };
        setSubscriptionStatus(updatedStatus);
        return { success: true, message: 'Subscription fixed successfully' };
      } else {
        // Otherwise refresh the status to make sure we're up to date
        await refreshSubscriptionStatus();
        return { 
          success: result.updated, 
          message: result.message || 'Could not fix subscription'
        };
      }
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    subscriptionStatus,
    isLoading,
    refreshSubscriptionStatus,
    fixSubscription,
    isPremium: subscriptionStatus.status === 'active',
    // Update isFree logic: only 'inactive' means no active paid plan
    isFree: subscriptionStatus.status === 'inactive',
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
} 