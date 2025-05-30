import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export const checkSubscriptionStatus = async () => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const checkSubscription = httpsCallable(functions, 'checkSubscriptionStatus');
    
    const result = await checkSubscription({ userId: currentUser.uid });
    return result.data;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    throw error;
  }
};
