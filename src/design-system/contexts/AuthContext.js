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
  getRedirectResult,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithRedirect
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase'; // Import from the main app's firebase config
import { toast } from 'react-hot-toast';

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

  // Clear any error when component unmounts or when dependencies change
  useEffect(() => {
    return () => setError(null);
  }, []);

  // Helper function to handle post sign-in logic
  const handlePostSignIn = async (result) => {
    // Check if this is a new user
    const isFirstSignIn = result?.additionalUserInfo?.isNewUser;
    
    // Try to create user document
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
    const isNewAccount = 
      isFirstSignIn || 
      result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    
    // Only set the isNewUser flag for brand new accounts
    if (isNewAccount) {
      console.log("Brand new Google account detected, setting isNewUser flag");
      localStorage.setItem('isNewUser', 'true');
    } else {
      console.log("Existing Google account detected, not setting isNewUser flag");
      // Ensure we clear any existing flag for sign-ins
      localStorage.removeItem('isNewUser');
    }
  };

  // Set up the auth state listener
  useEffect(() => {
    // First, check for redirect result immediately
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          // Handle post-signin logic for redirect flow
          await handlePostSignIn(result);
        }
      })
      .catch((error) => {
        if (error.code !== 'auth/popup-closed-by-user') {
          const errorMessage = handleFirebaseError(error);
          setError(errorMessage);
          toast.error(errorMessage);
        }
      });

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
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
      // Explicitly set persistence to local
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
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

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      setError(null);
      // Explicitly set persistence to local
      await setPersistence(auth, browserLocalPersistence);
      
      // Always use redirect flow - works reliably on ALL devices
      await signInWithRedirect(auth, googleProvider);
      return null; // Redirect doesn't return immediately
      
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
      // Explicitly set persistence to local
      await setPersistence(auth, browserLocalPersistence);
      console.log("Starting Apple sign-in process...");
      const provider = new OAuthProvider('apple.com');
      
      // Use popup for Apple sign-in
      const result = await signInWithPopup(auth, provider);
      console.log("Apple sign-in successful:", result.user?.email);
      
      // Check if this is a new user
      const isFirstSignIn = result?.additionalUserInfo?.isNewUser;
      
      // Try to create user document
      try {
        await createUserDocument(result.user);
        console.log("User document created after Apple sign-in");
      } catch (docError) {
        console.error("Failed to create user document after Apple sign-in:", docError);
      }
      
      toast.success('Signed in with Apple successfully!');
      
      // After successful Apple sign-in, clear any previous plan choice
      localStorage.removeItem('chosenPlan');
      
      // Check if this is a truly new user
      const isNewAccount = 
        isFirstSignIn || 
        result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      
      // Only set the isNewUser flag for brand new accounts
      if (isNewAccount) {
        console.log("Brand new Apple account detected, setting isNewUser flag");
        localStorage.setItem('isNewUser', 'true');
      } else {
        console.log("Existing Apple account detected, not setting isNewUser flag");
        // Ensure we clear any existing flag for sign-ins
        localStorage.removeItem('isNewUser');
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
  const logout = async () => {
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
