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

  // Remove all the complex post-payment logic - PostCheckout page handles this now
  useEffect(() => {
    // Simple subscription status check on mount
    if (user) {
      refreshSubscriptionStatus();
    }
  }, [user]);

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