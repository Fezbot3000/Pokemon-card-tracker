import { useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { checkSubscriptionStatus } from '../services/checkSubscriptionStatus';

export const useSubscriptionStatus = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setStatus('inactive');
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await checkSubscriptionStatus();
        setStatus(result?.status || 'inactive');
      } catch (err) {
        console.error('Error checking subscription status:', err);
        setError(err.message);
        setStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [currentUser, authLoading]);

  const refetch = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkSubscriptionStatus();
      setStatus(result?.status || 'inactive');
      return result;
    } catch (err) {
      console.error('Error refetching subscription status:', err);
      setError(err.message);
      setStatus('error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    isLoading,
    error,
    refetch,
    isActive: status === 'active'
  };
};
