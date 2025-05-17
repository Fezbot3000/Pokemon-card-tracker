import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  OAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { toast } from '../';
import { initErrorSuppression } from '../../utils/errorHandler';
import subscriptionManager from '../../utils/subscriptionManager';
import logger from '../../utils/logger';

/**
 * Auth Context for the design system
 * 
 * This context provides authentication-related functionality
 * to components that need user information.
 */
const AuthContext = createContext();

// Helper function to handle Firebase errors
const handleFirebaseError = (error) => {
  console.error("Firebase authentication error:", error);
  
  // Standard error messages
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'Invalid email address',
    'auth/requires-recent-login': 'Please log in again to complete this action',
    'auth/popup-closed-by-user': 'Authentication popup was closed',
    'auth/unauthorized-domain': 'This domain is not authorized for authentication',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email address',
    'auth/invalid-credential': 'Invalid credentials. Please try again',
    'auth/user-disabled': 'This account has been disabled',
    'auth/api-key-not-valid': 'Firebase API key is invalid or not properly formatted. Check your environment variables.',
    'auth/api-key-not-valid-please-pass-a-valid-api-key': 'Firebase API key is invalid. Check your environment variables and API key restrictions.',
    'auth/network-request-failed': 'Network error. Please check your connection'
  };
  
  // Get specific message or use generic one
  return errorMessages[error.code] || `Authentication error: ${error.message}`;
};

/**
 * Auth Provider Component
 * 
 * Wraps the application to provide authentication functionality
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get the Firebase auth instance
  const firebaseAuth = auth;

  // Clear any error when component unmounts or when dependencies change
  useEffect(() => {
    return () => setError(null);
  }, []);

  // Set up the auth state listener and handle redirect results
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        // Check if we have a redirect result
        const result = await getRedirectResult(firebaseAuth);
        
        if (result && result.user) {
          console.log("Redirect sign-in successful:", result.user?.email);
          
          // Check if this is a new user
          const isFirstSignIn = result?.additionalUserInfo?.isNewUser;
          
          // Try to create user document
          try {
            await createUserDocument(result.user);
            console.log("User document created after redirect sign-in");
          } catch (docError) {
            console.error("Failed to create user document after redirect sign-in:", docError);
          }
          
          toast.success('Signed in successfully!');
          
          // After successful sign-in, clear any previous plan choice
          localStorage.removeItem('chosenPlan');
          
          // Check if this is a truly new user
          const isNewAccount = 
            isFirstSignIn || 
            result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
          
          // Only set the isNewUser flag for brand new accounts
          if (isNewAccount) {
            console.log("Brand new account detected, setting isNewUser flag");
            localStorage.setItem('isNewUser', 'true');
          } else {
            console.log("Existing account detected, not setting isNewUser flag");
            // Ensure we clear any existing flag for sign-ins
            localStorage.removeItem('isNewUser');
          }
        }
      } catch (err) {
        if (err.code !== 'auth/no-auth-event') {
          console.error("Redirect sign-in error:", err);
          const errorMessage = handleFirebaseError(err);
          setError(errorMessage);
          toast.error(errorMessage);
        }
      }
    };

    // Handle redirect result first, then set up auth state listener
    handleRedirectResult().then(() => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          try {
            // Just set the current user
            setUser(user);
          } catch (err) {
            console.error("Error handling user:", err);
            setUser(user);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      
      return () => unsubscribe();
    });
  }, []);

  // Helper function to create a user document in Firestore
  const createUserDocument = async (user) => {
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
          createdAt
        });
        
        console.log("User document created successfully");
      }
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  // Sign up function
  const signUp = async ({ email, password, displayName }) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      // Create user document in Firestore
      await createUserDocument(result.user);
      
      // Set new user flag for onboarding
      localStorage.setItem('isNewUser', 'true');
      
      toast.success('Account created successfully!');
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
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      
      // Clear any new user flag for sign-ins
      localStorage.removeItem('isNewUser');
      
      toast.success('Signed in successfully!');
      return result.user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Google Sign In using redirect to avoid COOP errors
  const signInWithGoogle = async () => {
    try {
      setError(null);
      console.log("Starting Google sign-in process with redirect...");
      
      // Use redirect for Google sign-in to avoid COOP issues
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithRedirect(firebaseAuth, provider);
      
      // The actual sign-in result will be handled in the useEffect with getRedirectResult
      // This function will return before the redirect completes
      
      return null; // We won't have a user yet as the redirect hasn't completed
    } catch (err) {
      console.error("Google sign-in redirect error:", err);
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Apple Sign In using redirect to avoid COOP errors
  const signInWithApple = async () => {
    try {
      setError(null);
      console.log("Starting Apple sign-in process with redirect...");
      
      // Use redirect for Apple sign-in to avoid COOP issues
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      await signInWithRedirect(firebaseAuth, provider);
      
      // The actual sign-in result will be handled in the useEffect with getRedirectResult
      // This function will return before the redirect completes
      
      return null; // We won't have a user yet as the redirect hasn't completed
    } catch (err) {
      console.error("Apple sign-in redirect error:", err);
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      setError(null);
      
      // Clean up all Firestore subscriptions before signing out
      // This prevents console errors from unauthorized Firestore access
      try {
        logger.debug('Cleaning up all Firestore subscriptions before logout');
        subscriptionManager.cleanupAll();
        
        // Small delay to ensure all subscriptions are cleaned up
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (cleanupError) {
        logger.error('Error cleaning up subscriptions during logout:', cleanupError);
        // Continue with logout even if cleanup fails
      }
      
      // Now sign out from Firebase
      await firebaseSignOut(firebaseAuth);
      toast.success('Signed out successfully!');
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(firebaseAuth, email);
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
      console.error("Error getting auth token:", error);
      return null;
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      currentUser: user, // For backward compatibility
      loading, 
      error,
      signIn, 
      signUp,
      signInWithGoogle,
      signInWithApple,
      logout,
      signOut: logout, // Alias for backward compatibility
      resetPassword,
      getAuthToken
    }}>
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
