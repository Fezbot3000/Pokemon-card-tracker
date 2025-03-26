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
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';
import { toast } from 'react-hot-toast';

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
    'auth/api-key-not-valid': 'Firebase API key is invalid or not properly formatted',
    'auth/network-request-failed': 'Network error. Please check your connection'
  };
  
  // Special detailed error for API key issue
  if (error.code === 'auth/api-key-not-valid-please-pass-a-valid-api-key') {
    console.error("API Key Error Details:", error);
    return `API Key Error: The Firebase API key is not valid. Please check your configuration.`;
  }
  
  // Get specific message or use generic one
  return errorMessages[error.code] || `Authentication error: ${error.message}`;
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear any error when component unmounts or when dependencies change
  useEffect(() => {
    return () => setError(null);
  }, []);

  // Set up the auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Just set the current user without attempting to fetch or create Firestore documents yet
          setCurrentUser(user);
        } catch (err) {
          console.error("Error handling user:", err);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
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
          // User successfully authenticated with redirect
          await createUserDocument(result.user);
          toast.success('Signed in successfully!');
        }
      } catch (error) {
        console.error("Redirect error:", error);
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
      const userRef = doc(db, 'users', user.uid);
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
      
      // Create auth user
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Try to create user document, but don't fail if it errors
      try {
        await createUserDocument(user);
      } catch (docError) {
        console.error("Failed to create user document, but auth succeeded:", docError);
        // Continue with auth success even if document creation fails
      }

      toast.success('Account created successfully!');
      return user;
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
      
      // We've removed setPersistence for simplicity
      // Just sign in directly
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
      return user;
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
      
      // Use the configured provider
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google sign-in successful:", result.user?.email);
      
      // Try to create user document but don't fail if it errors
      try {
        await createUserDocument(result.user);
      } catch (docError) {
        console.error("Failed to create user document after Google sign-in:", docError);
      }
      
      toast.success('Signed in with Google successfully!');
      return result.user;
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
      const provider = new OAuthProvider('apple.com');
      
      // Use popup for Apple sign-in
      const result = await signInWithPopup(auth, provider);
      
      // Try to create user document but don't fail if it errors
      try {
        await createUserDocument(result.user);
      } catch (docError) {
        console.error("Failed to create user document after Apple sign-in:", docError);
      }
      
      toast.success('Signed in with Apple successfully!');
      return result.user;
    } catch (err) {
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