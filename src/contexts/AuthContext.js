import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  OAuthProvider,
  connectAuthEmulator
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db as firestoreDb, googleProvider } from '../firebase'; // Rename to firestoreDb
import { toast } from 'react-hot-toast';
import { useAutoSync } from './AutoSyncContext';
import logger from '../utils/logger';
import featureFlags from '../utils/featureFlags';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

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
  
  // Special detailed error for API key issue
  if (error.code === 'auth/api-key-not-valid-please-pass-a-valid-api-key') {
    console.error("API Key Error Details:", error);
    return `API Key Error: The Firebase API key is not valid or restricted. Please check your configuration and API key restrictions.`;
  }
  
  // Get specific message or use generic one
  return errorMessages[error.code] || `Authentication error: ${error.message}`;
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { performAutoSync } = useAutoSync();

  // Clear any error when component unmounts or when dependencies change
  useEffect(() => {
    return () => setError(null);
  }, []);

  // Connect to Auth emulator in development if needed
  useEffect(() => {
    // Uncomment this when testing locally with Firebase emulators
    // if (process.env.NODE_ENV === 'development') {
    //   connectAuthEmulator(auth, 'http://localhost:9099');
    // }
  }, []);

  // Setup auth state listener to handle when user signs in/out
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError(null);

      if (user) {
        // User is signed in
        // Use localStorage to check if we've already synced for this user session
        const syncKey = `cloud_sync_completed_${user.uid}`;
        const hasSynced = localStorage.getItem(syncKey);
        
        if ((!hasSynced || window.location.href.includes('force_sync=true')) && featureFlags.enableFirestoreSync) {
          try {
            // Attempt to sync data from the cloud with force=true to ensure we get the latest data
            logger.debug('Login detected, forcing cloud data sync to ensure cross-browser compatibility...');
            const syncResult = await databaseService.syncFromCloud({ force: true });
            
            if (syncResult) {
              logger.debug('Successfully synced data from cloud');
              toast.success('Your cards have been synced from the cloud');
            } else {
              logger.debug('No cloud data sync was needed or available');
            }
            
            // Mark that we've completed sync for this session
            localStorage.setItem(syncKey, 'true');
          } catch (syncError) {
            logger.error('Error syncing from cloud:', syncError);
            toast.error('Could not sync your cards from the cloud. Please try again later.');
          }
        }
      } else {
        // User signed out, clear sync markers
        const userSyncKeys = Object.keys(localStorage).filter(key => key.startsWith('cloud_sync_completed_'));
        userSyncKeys.forEach(key => localStorage.removeItem(key));
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Check for redirect result on component mount (for social auth)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Redirect sign-in successful:", result.user?.email);
          
          // Clear the redirect flag
          localStorage.removeItem('googleSignInRedirect');
          
          // Try to create user document but don't fail if it errors
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
          const isNewAccount = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
          
          if (isNewAccount) {
            console.log("Brand new account detected, setting isNewUser flag");
            localStorage.setItem('isNewUser', 'true');
          } else {
            console.log("Existing account detected, not setting isNewUser flag");
            localStorage.removeItem('isNewUser');
            
            // Trigger auto-sync for existing users after successful login
            if (performAutoSync) {
              try {
                await performAutoSync();
              } catch (syncError) {
                console.error('Error during auto-sync:', syncError);
              }
            }
          }
          
          // Navigate to dashboard after successful redirect sign-in
          // Use a small delay to ensure state is updated
          setTimeout(() => {
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
              console.log("Navigating to dashboard after redirect sign-in");
              window.location.href = '/dashboard';
            }
          }, 100);
        } else {
          // Check if we were expecting a redirect result but didn't get one
          const wasRedirecting = localStorage.getItem('googleSignInRedirect');
          if (wasRedirecting) {
            console.log("Expected redirect result but didn't receive one");
            localStorage.removeItem('googleSignInRedirect');
          }
        }
      } catch (error) {
        console.error("Redirect error:", error);
        
        // Clear the redirect flag on error
        localStorage.removeItem('googleSignInRedirect');
        
        const errorMessage = handleFirebaseError(error);
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    handleRedirectResult();
  }, []);

  // Helper function to create a user document in Firestore - only called explicitly
  const createUserDocument = async (user) => {
    if (!user) return null;

    try {
      const userRef = doc(firestoreDb, 'users', user.uid);
      const userData = {
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        collections: {
          'Default Collection': []
        },
        authProvider: user.providerData?.[0]?.providerId || 'password'
      };

      await setDoc(userRef, userData, { merge: true });
      return userData;
    } catch (error) {
      console.error("Error creating user document:", error);
      // Don't throw the error, just return null
      return null;
    }
  };

  // Sign up function
  const signUp = async ({ email, password, displayName }) => {
    try {
      setError(null);
      console.log("Starting sign up process...");
      
      // Create auth user
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created successfully:", user.uid);
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      console.log("Profile updated with display name:", displayName);
      
      // Try to create user document, but don't fail if it errors
      try {
        await createUserDocument(user);
        console.log("User document created in Firestore");
      } catch (docError) {
        console.error("Failed to create user document, but auth succeeded:", docError);
        // Continue with auth success even if document creation fails
      }

      toast.success('Account created successfully!');
      return user;
    } catch (err) {
      console.error("Sign up error:", err);
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (remember) {
        // Set persistence to LOCAL if remember me is checked
        localStorage.setItem('rememberMe', 'true');
      }
      toast.success('Signed in successfully!');
      
      // Trigger auto-sync after successful login
      if (performAutoSync) {
        try {
          await performAutoSync();
        } catch (syncError) {
          console.error('Error during auto-sync:', syncError);
        }
      }
      
      return result.user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      setError(null);
      console.log("Starting Google sign-in process...");
      
      // Improved PWA detection for iOS
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator.standalone === true) ||
                    document.referrer.includes('android-app://') ||
                    (window.location.href.includes('?utm_source=homescreen'));
      
      console.log("PWA detection:", {
        displayMode: window.matchMedia('(display-mode: standalone)').matches,
        navigatorStandalone: window.navigator.standalone,
        androidApp: document.referrer.includes('android-app://'),
        isPWA
      });
      
      if (isPWA) {
        // Use redirect for PWA to avoid popup issues
        console.log("PWA detected, using redirect sign-in");
        
        // Store that we're starting a redirect flow
        localStorage.setItem('googleSignInRedirect', 'true');
        
        await signInWithRedirect(auth, googleProvider);
        // Note: This function will not return as the page redirects
        // The result will be handled by handleRedirectResult on return
        return null; // Explicitly return null to indicate redirect flow
      } else {
        // Use popup for regular browser
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Google sign-in successful:", result.user?.email);
        
        // Try to create user document but don't fail if it errors
        try {
          await createUserDocument(result.user);
          console.log("User document created after Google sign-in");
        } catch (docError) {
          console.error("Failed to create user document after Google sign-in:", docError);
        }
        
        toast.success('Signed in with Google successfully!');
        
        // After successful Google sign-in, clear any previous plan choice
        localStorage.removeItem('chosenPlan');
        
        // Check if this is a truly new user
        const isNewAccount = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        
        if (isNewAccount) {
          console.log("Brand new Google account detected, setting isNewUser flag");
          localStorage.setItem('isNewUser', 'true');
        } else {
          console.log("Existing Google account detected, not setting isNewUser flag");
          localStorage.removeItem('isNewUser');
          
          // Trigger auto-sync for existing users after successful login
          if (performAutoSync) {
            try {
              await performAutoSync();
            } catch (syncError) {
              console.error('Error during auto-sync:', syncError);
            }
          }
        }
        
        return result.user;
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
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
      console.log("Starting Apple sign-in process...");
      const provider = new OAuthProvider('apple.com');
      
      // Use popup for Apple sign-in
      const result = await signInWithPopup(auth, provider);
      console.log("Apple sign-in successful:", result.user?.email);
      
      // Check if this is a new user more reliably by checking if this is their first sign-in
      const isFirstSignIn = result?.additionalUserInfo?.isNewUser;
      
      // Try to create user document but don't fail if it errors
      try {
        await createUserDocument(result.user);
        console.log("User document created after Apple sign-in");
      } catch (docError) {
        console.error("Failed to create user document after Apple sign-in:", docError);
      }
      
      toast.success('Signed in with Apple successfully!');
      
      // After successful Apple sign-in, clear any previous plan choice
      localStorage.removeItem('chosenPlan');
      
      // Check if this is a truly new user (by comparing creation and last sign-in times)
      // Also use the isNewUser flag from the result if available
      const isNewAccount = 
        isFirstSignIn || 
        result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      
      // Log the determination process
      console.log("New account detection (Apple):", {
        isFirstSignIn,
        creationTime: result.user.metadata.creationTime,
        lastSignInTime: result.user.metadata.lastSignInTime,
        isSameTime: result.user.metadata.creationTime === result.user.metadata.lastSignInTime,
        finalDecision: isNewAccount
      });
      
      // Only set the isNewUser flag for brand new accounts
      if (isNewAccount) {
        console.log("Brand new Apple account detected, setting isNewUser flag");
        localStorage.setItem('isNewUser', 'true');
      } else {
        console.log("Existing Apple account detected, not setting isNewUser flag");
        // Ensure we clear any existing flag for sign-ins
        localStorage.removeItem('isNewUser');
        
        // Trigger auto-sync for existing users after successful login
        if (performAutoSync) {
          try {
            await performAutoSync();
          } catch (syncError) {
            console.error('Error during auto-sync:', syncError);
          }
        }
      }
      
      return result.user;
    } catch (err) {
      console.error("Apple sign-in error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const errorMessage = handleFirebaseError(err);
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
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
    if (!currentUser) return null;
    
    // Just return the current user's token if available
    try {
      // Get the token directly from the current user
      return currentUser.getIdToken();
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    getAuthToken,
    signInWithGoogle,
    signInWithApple
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 