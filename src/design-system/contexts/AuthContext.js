import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  Fragment,
} from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase'; // Import from the main app's firebase config
import { toast } from 'react-hot-toast';

/**
 * Auth Context for the design system with subscription management
 *
 * This context provides authentication-related functionality and subscription management
 * to components that need user information and subscription status.
 */
const AuthContext = createContext();

// Helper function to handle Firebase errors
const handleFirebaseError = error => {
  console.error('Firebase authentication error:', error);

  // Standard error messages
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'Invalid email address',
    'auth/requires-recent-login': 'Please log in again to complete this action',
    'auth/popup-closed-by-user': 'Authentication popup was closed',
    'auth/cancelled-popup-request': 'Authentication popup was cancelled',
    'auth/unauthorized-domain':
      'This domain is not authorized for authentication',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/account-exists-with-different-credential':
      'An account already exists with the same email address',
    'auth/invalid-credential': 'Invalid credentials. Please try again',
    'auth/user-disabled': 'This account has been disabled',
    'auth/api-key-not-valid':
      'Firebase API key is invalid or not properly formatted. Check your environment variables.',
    'auth/api-key-not-valid-please-pass-a-valid-api-key':
      'Firebase API key is invalid. Check your environment variables and API key restrictions.',
    'auth/network-request-failed':
      'Network error. Please check your connection',
  };

  // Get specific message or use generic one
  return errorMessages[error.code] || `Authentication error: ${error.message}`;
};

// Helper function to calculate days remaining in trial
const calculateDaysRemaining = (trialEndsAt, status) => {
  if (status !== 'free_trial' || !trialEndsAt) return 0;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Auth Provider Component
 *
 * Wraps the application to provide authentication functionality and subscription management
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'loading', // 'loading', 'free_trial', 'free', 'premium', 'expired'
    planType: null,
    trialEndsAt: null,
    subscriptionId: null,
    customerId: null,
    daysRemaining: null,
  });

  // Clear any error when component unmounts or when dependencies change
  useEffect(() => {
    return () => setError(null);
  }, []);

  // Check subscription status for a user
  const checkUserSubscription = async userId => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Check if user has subscription data
      if (!userData.subscriptionStatus) {
        // User without subscription data - start free trial
        // This includes both new users and existing users who haven't been migrated yet
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        const newSubscriptionData = {
          status: 'free_trial',
          planType: 'free_trial',
          trialEndsAt: trialEndsAt.toISOString(),
          subscriptionId: null,
          customerId: null,
          daysRemaining: 7,
        };

        // Save to Firestore (merge with existing user data if any)
        await setDoc(
          userRef,
          {
            subscriptionStatus: 'free_trial',
            planType: 'free_trial',
            trialEndsAt: trialEndsAt.toISOString(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setSubscriptionData(newSubscriptionData);

        // Show a welcome message for the trial
        setTimeout(() => {
          toast.success(
            '🎉 Welcome to your 7-day Premium trial! Enjoy all features!',
            {
              duration: 5000,
            }
          );
        }, 1000);
      } else {
        // Existing user with subscription data - check current status
        const daysRemaining = calculateDaysRemaining(
          userData.trialEndsAt,
          userData.subscriptionStatus
        );

        // Check if trial has expired
        if (
          userData.subscriptionStatus === 'free_trial' &&
          daysRemaining <= 0
        ) {
          // Trial expired - move to free plan
          await updateDoc(userRef, {
            subscriptionStatus: 'free',
            planType: 'free',
            updatedAt: serverTimestamp(),
          });

          setSubscriptionData({
            status: 'free',
            planType: 'free',
            trialEndsAt: userData.trialEndsAt,
            subscriptionId: userData.subscriptionId || null,
            customerId: userData.customerId || null,
            daysRemaining: 0,
          });

          // Show trial expired message
          setTimeout(() => {
            toast.error(
              'Your free trial has expired. Upgrade to Premium to continue using all features!',
              {
                duration: 6000,
              }
            );
          }, 1000);
        } else {
          // Use existing subscription data
          setSubscriptionData({
            status: userData.subscriptionStatus,
            planType: userData.planType || userData.subscriptionStatus,
            trialEndsAt: userData.trialEndsAt,
            subscriptionId: userData.subscriptionId || null,
            customerId: userData.customerId || null,
            daysRemaining: daysRemaining,
          });
        }
      }
    } catch (error) {
      setSubscriptionData({
        status: 'free',
        planType: 'free',
        trialEndsAt: null,
        subscriptionId: null,
        customerId: null,
        daysRemaining: 0,
      });
    }
  };

  // Set up the auth state listener
  useEffect(() => {
    let isMounted = true;
    let unsubscribeSubscription = null;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!isMounted) return;

      if (user) {
        try {
          // Set the current user
          setUser(user);
          // Check subscription status
          await checkUserSubscription(user.uid);

          // Set up real-time subscription listener - ADDED for immediate updates
          const userRef = doc(db, 'users', user.uid);
          unsubscribeSubscription = onSnapshot(
            userRef,
            doc => {
              if (doc.exists()) {
                const userData = doc.data();
                if (userData.subscriptionStatus || userData.planType) {
                  console.log(
                    '🔄 Subscription updated in real-time:',
                    userData.subscriptionStatus,
                    userData.planType
                  );

                  // Calculate days remaining for real-time updates
                  const daysRemaining = calculateDaysRemaining(
                    userData.trialEndsAt,
                    userData.subscriptionStatus
                  );

                  // Update subscription data immediately
                  setSubscriptionData({
                    status: userData.subscriptionStatus,
                    planType: userData.planType || userData.subscriptionStatus,
                    trialEndsAt: userData.trialEndsAt,
                    subscriptionId: userData.subscriptionId || null,
                    customerId: userData.customerId || null,
                    daysRemaining: daysRemaining,
                  });

                  // Show success message for premium upgrades (only once)
                  if (userData.subscriptionStatus === 'premium') {
                    const hasShownPremiumWelcome = localStorage.getItem(
                      'hasShownPremiumWelcome'
                    );
                    if (!hasShownPremiumWelcome) {
                      localStorage.setItem('hasShownPremiumWelcome', 'true');
                      setTimeout(() => {
                        toast.success(
                          '🎉 Welcome to Premium! All features are now unlocked.',
                          {
                            duration: 5000,
                          }
                        );
                      }, 1000);
                    }
                  } else {
                    // Clear the flag if user is no longer premium (downgraded/cancelled)
                    localStorage.removeItem('hasShownPremiumWelcome');
                  }
                }
              }
            },
            error => {
              console.error('Subscription listener error:', error);
            }
          );
        } catch (err) {
          setUser(user);
        }
      } else {
        setUser(null);
        setSubscriptionData({
          status: 'loading',
          planType: null,
          trialEndsAt: null,
          subscriptionId: null,
          customerId: null,
          daysRemaining: null,
        });

        // Clean up subscription listener when user logs out
        if (unsubscribeSubscription) {
          unsubscribeSubscription();
          unsubscribeSubscription = null;
        }
      }

      // Add a small delay to prevent flashing
      setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 100);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (unsubscribeSubscription) {
        unsubscribeSubscription();
      }
    };
  }, []);

  // Helper function to create a user document in Firestore
  const createUserDocument = async user => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const { email, displayName, photoURL } = user;
        const createdAt = serverTimestamp();

        await setDoc(userRef, {
          email,
          displayName: displayName || email.split('@')[0],
          photoURL,
          createdAt,
        });

        // console.log("User document created successfully");
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  };

  // Sign up function
  const signUp = async ({ email, password, displayName }) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      // Create user document in Firestore
      await createUserDocument(result.user);

      // Set new user flag for onboarding
      localStorage.setItem('isNewUser', 'true');

      toast.success(
        'Account created successfully! Your 7-day free trial has started.'
      );
      return result.user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Sign in function with remember me functionality
  const signIn = async ({ email, password, remember = false }) => {
    try {
      setError(null);
      // Explicitly set persistence to local
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Clear any new user flag for sign-ins
      localStorage.removeItem('isNewUser');

      toast.success('Signed in successfully!');
      return userCredential.user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Google sign in function
  const signInWithGoogle = async () => {
    try {
      setError(null);
      // console.log("Starting Google sign-in process...");

      // Use popup for Google sign-in
      const result = await signInWithPopup(auth, googleProvider);
      // console.log("Google sign-in successful:", result.user?.email);

      // Check if this is a new user
      const isFirstSignIn = result?.additionalUserInfo?.isNewUser;

      // Try to create user document
      try {
        await createUserDocument(result.user);
        // console.log("User document created after Google sign-in");
      } catch (docError) {
        console.error(
          'Failed to create user document after Google sign-in:',
          docError
        );
      }

      toast.success('Signed in with Google successfully!');

      // After successful Google sign-in, clear any previous plan choice
      localStorage.removeItem('chosenPlan');

      // Check if this is a truly new user
      const isNewAccount =
        isFirstSignIn ||
        result.user.metadata.creationTime ===
          result.user.metadata.lastSignInTime;

      // Only set the isNewUser flag for brand new accounts
      if (isNewAccount) {
        // console.log("Brand new Google account detected, setting isNewUser flag");
        localStorage.setItem('isNewUser', 'true');
        toast.success('Welcome! Your 7-day free trial has started.');
      } else {
        // console.log("Existing Google account detected, not setting isNewUser flag");
        // Ensure we clear any existing flag for sign-ins
        localStorage.removeItem('isNewUser');
      }

      return result.user;
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const errorMessage = handleFirebaseError(err);
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    }
  };

  // Apple Sign In
  const signInWithApple = async () => {
    try {
      setError(null);
      // Explicitly set persistence to local
      await setPersistence(auth, browserLocalPersistence);
      // console.log("Starting Apple sign-in process...");
      const provider = new OAuthProvider('apple.com');

      // Use popup for Apple sign-in
      const result = await signInWithPopup(auth, provider);
      // console.log("Apple sign-in successful:", result.user?.email);

      // Check if this is a new user
      const isFirstSignIn = result?.additionalUserInfo?.isNewUser;

      // Try to create user document
      try {
        await createUserDocument(result.user);
        // console.log("User document created after Apple sign-in");
      } catch (docError) {
        console.error(
          'Failed to create user document after Apple sign-in:',
          docError
        );
      }

      toast.success('Signed in with Apple successfully!');

      // After successful Apple sign-in, clear any previous plan choice
      localStorage.removeItem('chosenPlan');

      // Check if this is a truly new user
      const isNewAccount =
        isFirstSignIn ||
        result.user.metadata.creationTime ===
          result.user.metadata.lastSignInTime;

      // Only set the isNewUser flag for brand new accounts
      if (isNewAccount) {
        // console.log("Brand new Apple account detected, setting isNewUser flag");
        localStorage.setItem('isNewUser', 'true');
        toast.success('Welcome! Your 7-day free trial has started.');
      } else {
        // console.log("Existing Apple account detected, not setting isNewUser flag");
        // Ensure we clear any existing flag for sign-ins
        localStorage.removeItem('isNewUser');
      }

      return result.user;
    } catch (err) {
      console.error('Apple sign-in error:', err);
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        const errorMessage = handleFirebaseError(err);
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);

      // Clear premium welcome flag so it can be shown again on next upgrade
      localStorage.removeItem('hasShownPremiumWelcome');

      toast.success('Signed out successfully!');
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Reset password function
  const resetPassword = async email => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Get fresh token function for API calls
  const getAuthToken = async () => {
    if (!user) return null;

    try {
      // Get the token directly from the current user
      return user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Update subscription status (for when user upgrades/downgrades)
  const updateSubscriptionStatus = async (newStatus, additionalData = {}) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        subscriptionStatus: newStatus,
        planType: newStatus,
        updatedAt: serverTimestamp(),
        ...additionalData,
      };

      // Update Firestore
      await updateDoc(userRef, updateData);

      // Calculate days remaining for the new status
      const daysRemaining = calculateDaysRemaining(
        additionalData.trialEndsAt || null,
        newStatus
      );

      // Update local state immediately
      setSubscriptionData(prev => ({
        ...prev,
        status: newStatus,
        planType: newStatus,
        ...additionalData,
        daysRemaining: daysRemaining,
      }));

      return true;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user, // For backward compatibility
        loading,
        error,
        subscriptionData,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        logout,
        signOut: logout, // Alias for backward compatibility
        resetPassword,
        getAuthToken,
        updateSubscriptionStatus,
        checkUserSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
