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
    const urlParams = new URLSearchParams(window.location.search);
    const isFromPayment = urlParams.has('checkout_success');
    const sessionPaid = sessionStorage.getItem('justPaid') === 'true';
    
    if (isFromPayment || sessionPaid) {
      // Clear the session flag immediately to prevent loops
      sessionStorage.removeItem('justPaid');
      
      // Add a flag to local storage to indicate this was a successful payment
      localStorage.setItem('recentPayment', 'true');
      localStorage.setItem('paymentTimestamp', Date.now().toString());
      
      // Clean up URL parameters immediately to prevent refresh issues
      if (isFromPayment) {
        const url = new URL(window.location);
        url.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', url.toString());
      }
      
      // Delay the subscription check to allow webhook processing
      setTimeout(() => {
        postPaymentCheck();
      }, 3000); // 3 second delay for webhook processing
    } else if (localStorage.getItem('recentPayment') === 'true') {
      // Check if payment was recent (within last 10 minutes)
      const paymentTimestamp = localStorage.getItem('paymentTimestamp');
      const isRecentPayment = paymentTimestamp && 
        (Date.now() - parseInt(paymentTimestamp)) < 10 * 60 * 1000;
      
      if (isRecentPayment) {
        postPaymentCheck();
      } else {
        // Clean up old payment flags
        localStorage.removeItem('recentPayment');
        localStorage.removeItem('paymentTimestamp');
      }
    }
  }, []);
  
  // New function to handle post-payment subscription verification
  const postPaymentCheck = async () => {
    if (isLoading) {
      console.log('Subscription check already in progress, skipping duplicate');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Starting post-payment subscription verification...');
      
      // First, wait a bit more to ensure webhook has processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try the fix method which does a direct email lookup in Stripe
      console.log('Attempting subscription fix...');
      const fixResult = await fixSubscription();
      
      // If fix was successful, we're done
      if (fixResult.success && fixResult.status === 'active') {
        console.log('Subscription fix successful, clearing payment flags');
        localStorage.removeItem('recentPayment');
        localStorage.removeItem('paymentTimestamp');
        
        // Show success message
        console.log('Subscription activated successfully');
        
        // If we're on the pricing page, redirect to dashboard
        if (window.location.pathname.includes('/pricing')) {
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
        return;
      }
      
      // If fix wasn't successful, try direct verification with longer delays
      console.log('Fix unsuccessful, attempting direct verification...');
      await verifySubscriptionWithRetry();
      
    } catch (error) {
      console.error('Error in post-payment check:', error);
      
      // Don't clear payment flags on error - allow retry
      console.log('Post-payment check failed, will retry on next load');
      
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enhanced verification with better retry logic
  const verifySubscriptionWithRetry = async () => {
    const maxAttempts = 3;
    const baseDelay = 5000; // Start with 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Verification attempt ${attempt}/${maxAttempts}`);
        
        // Clear cache before each attempt
        clearSubscriptionCache();
        
        const status = await checkSubscriptionStatus();
        
        if (status.status === 'active') {
          console.log('Subscription verified as active');
          setSubscriptionStatus(status);
          
          // Clear payment flags on success
          localStorage.removeItem('recentPayment');
          localStorage.removeItem('paymentTimestamp');
          
          // Redirect if on pricing page
          if (window.location.pathname.includes('/pricing')) {
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          }
          return true;
        }
        
        // If not active and we have more attempts, wait before retry
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Verification attempt ${attempt} failed:`, error);
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log('All verification attempts exhausted');
    return false;
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