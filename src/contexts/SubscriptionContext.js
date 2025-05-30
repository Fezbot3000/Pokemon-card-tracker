import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { checkSubscriptionStatus } from '../services/checkSubscriptionStatus';

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

  // Load subscription status when user changes
  useEffect(() => {
    if (!user) {
      setSubscriptionStatus({ status: 'inactive' });
      setIsLoading(false);
      return;
    }

    const loadSubscriptionStatus = async () => {
      setIsLoading(true);
      try {
        const status = await checkSubscriptionStatus();
        setSubscriptionStatus(status || { status: 'inactive' });
      } catch (error) {
        console.error('Error loading subscription status:', error);
        setSubscriptionStatus({ status: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();
  }, [user?.uid]);

  const refreshSubscriptionStatus = async () => {
    if (!user) return null;
    
    setIsLoading(true);
    try {
      const status = await checkSubscriptionStatus();
      setSubscriptionStatus(status || { status: 'inactive' });
      return status;
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      setSubscriptionStatus({ status: 'error' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    subscriptionStatus,
    isLoading,
    refreshSubscriptionStatus
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}