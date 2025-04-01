import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { checkSubscriptionStatus, clearSubscriptionCache, fixSubscriptionStatus } from '../services/subscriptionService';

const SubscriptionContext = createContext();

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const { currentUser } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    status: 'loading',
    plan: null,
    customer: null,
    subscriptionId: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check subscription status when user changes
  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      if (!currentUser) {
        if (isMounted) {
          setSubscriptionStatus({ status: 'inactive' });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const status = await checkSubscriptionStatus();
        console.log('Subscription status:', status);
        
        if (isMounted) {
          setSubscriptionStatus(status);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (isMounted) {
          setSubscriptionStatus({ status: 'error', message: error.message });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Check subscription status after purchase completion
  useEffect(() => {
    // Detect if we're coming back from a successful checkout
    const isFromPayment = window.location.search.includes('checkout_success=true');
    
    if (isFromPayment) {
      clearSubscriptionCache();
      
      // Add a flag to local storage to indicate this was a successful payment
      localStorage.setItem('recentPayment', 'true');
      localStorage.setItem('paymentTimestamp', Date.now().toString());
      
      // Immediately trigger the subscription fix and verification
      postPaymentCheck();
    } else if (localStorage.getItem('recentPayment') === 'true') {
      // If we had a recent payment but lost the URL parameter (page refresh),
      // check if we're still within the verification window (5 minutes)
      const paymentTimestamp = parseInt(localStorage.getItem('paymentTimestamp') || '0');
      const fiveMinutes = 5 * 60 * 1000;
      
      if (Date.now() - paymentTimestamp < fiveMinutes) {
        console.log('Detected recent payment from localStorage, applying fix subscription logic');
        postPaymentCheck();
      } else {
        // Clear the payment flags if we're outside the verification window
        localStorage.removeItem('recentPayment');
        localStorage.removeItem('paymentTimestamp');
      }
    }
  }, []);
  
  // Enhanced function to handle post-payment subscription verification
  const postPaymentCheck = async () => {
    setIsLoading(true);
    console.log('Running post-payment subscription check and fix...');
    
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 3000; // 3 seconds between retries
    
    const attemptFix = async () => {
      try {
        // First try the fix method which does a direct email lookup in Stripe
        const fixResult = await fixSubscription();
        console.log('Post-payment fix attempt result:', fixResult);
        
        // If fix was successful, we're done
        if (fixResult.success) {
          console.log('Subscription successfully fixed after payment!');
          // Clear the recent payment flags
          localStorage.removeItem('recentPayment');
          localStorage.removeItem('paymentTimestamp');
          
          // If we're on the pricing page, redirect to dashboard
          if (window.location.pathname.includes('/dashboard/pricing')) {
            console.log('Redirecting from pricing to dashboard after successful fix');
            window.location.href = '/dashboard';
          }
          return true;
        }
        
        // If we haven't reached max retries, wait and try again
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Fix attempt ${retryCount} unsuccessful, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptFix();
        }
        
        // If we've exhausted retries, fall back to regular verification
        console.log('Max retries reached, falling back to regular verification...');
        await verifySubscription();
        return false;
      } catch (error) {
        console.error('Error during post-payment check:', error);
        // Only retry on certain errors (e.g., not on auth errors)
        if (retryCount < maxRetries && !error.message?.includes('unauthenticated')) {
          retryCount++;
          console.log(`Error during attempt ${retryCount}, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptFix();
        }
        return false;
      }
    };
    
    try {
      await attemptFix();
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
      console.log(`Verification attempt ${attempts} of ${maxAttempts}...`);
      
      try {
        const status = await checkSubscriptionStatus();
        console.log('Verification check result:', status);
        
        // Check if we got an active subscription
        if (status.status === 'active') {
          setSubscriptionStatus(status);
          // Clear the recent payment flag
          localStorage.removeItem('recentPayment');
          return true;
        }
        
        // If not active but we have more attempts, retry after delay
        if (attempts < maxAttempts) {
          console.log(`Subscription not active yet, waiting ${delay/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptVerification(attempts + 1, maxAttempts, delay * 1.5);
        }
        
        // If we've exhausted all attempts, return the last status
        setSubscriptionStatus(status);
        return false;
      } catch (error) {
        console.error('Error during verification attempt:', error);
        
        // Retry on error if we have attempts left
        if (attempts < maxAttempts) {
          console.log(`Error during verification, waiting ${delay/1000} seconds before retry...`);
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
        console.log('Subscription verification successful, redirecting to dashboard');
        
        // If we're not already on the dashboard, redirect there
        if (!window.location.pathname.includes('/dashboard')) {
          window.location.href = '/dashboard';
        } else if (window.location.pathname.includes('/dashboard/pricing')) {
          // Special case for when we're on the pricing page after successful payment
          window.location.href = '/dashboard';
        }
      } else {
        console.warn('Could not verify subscription after multiple attempts');
        // Even without successful verification, we'll still let users continue
        // The DashboardPricing component will show a special screen
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
      // Even with error, we'll let the DashboardPricing component handle it
    }
  };

  // Method to force refresh of subscription status
  const refreshSubscriptionStatus = async () => {
    setIsLoading(true);
    clearSubscriptionCache();
    
    try {
      console.log('SubscriptionContext: Refreshing subscription status...');
      const status = await checkSubscriptionStatus();
      console.log('SubscriptionContext: Received status:', status);
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      console.error('Error refreshing subscription:', error);
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
      console.log('Fix subscription result:', result);
      
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
      console.error('Error fixing subscription:', error);
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
    isFree: subscriptionStatus.status === 'free' || subscriptionStatus.status === 'inactive',
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
} 