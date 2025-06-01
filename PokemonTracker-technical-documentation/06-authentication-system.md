# Authentication System - Technical Documentation

## Overview
The Authentication System provides secure user authentication using Firebase Auth with support for Google and Apple sign-in. It includes persistent authentication state management, error handling, password reset functionality, and integration with the app's data access patterns.

## File Locations
- **Primary Context**: `src/design-system/contexts/AuthContext.js`
- **Utility Functions**: `src/services/auth/authUtils.js`
- **Hook Integration**: `src/hooks/useAuth.js`
- **Firebase Config**: `src/services/firestore/firestoreConfig.js`

## Architecture Overview

### Authentication Context Provider
The `AuthContext` provides global authentication state and methods throughout the app:

```javascript
const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: () => {},
  signInWithApple: () => {},
  signOut: () => {},
  resetPassword: () => {},
  clearError: () => {}
});
```

## Core Authentication Implementation

### 1. Context Provider Setup

#### AuthProvider Component
```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Firebase Auth configuration
  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');

  // Configure providers
  useEffect(() => {
    // Google provider configuration
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // Apple provider configuration
    appleProvider.addScope('email');
    appleProvider.addScope('name');
    appleProvider.setCustomParameters({
      locale: 'en'
    });
  }, []);

  // Authentication state observer
  useEffect(() => {
    console.log('Setting up auth state observer...');
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
        setUser(user);
        setLoading(false);
        setIsInitialized(true);
        
        if (user) {
          // Clear any previous errors on successful auth
          setError(null);
          
          // Log user info for debugging
          console.log('User authenticated:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            providerId: user.providerData[0]?.providerId
          });
        }
      },
      (error) => {
        console.error('Auth state observer error:', error);
        setError({
          code: error.code,
          message: error.message
        });
        setLoading(false);
        setIsInitialized(true);
      }
    );

    return () => {
      console.log('Cleaning up auth state observer');
      unsubscribe();
    };
  }, [auth]);

  // ... rest of the provider implementation
};
```

### 2. Google Sign-In Implementation

#### Google Authentication Flow
```javascript
const signInWithGoogle = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Attempting Google sign-in...');
    
    // Clear any existing auth state
    await signOut();
    
    // Sign in with popup
    const result = await signInWithPopup(auth, googleProvider);
    
    if (result.user) {
      console.log('Google sign-in successful:', result.user.email);
      
      // Get additional user info from Google
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // Log successful authentication
      console.log('Google Auth successful:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        hasToken: !!token
      });
      
      return result.user;
    } else {
      throw new Error('No user returned from Google sign-in');
    }
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    let errorMessage = 'An error occurred during Google sign-in';
    let errorCode = error.code;
    
    // Handle specific Google Auth errors
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in was cancelled';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Pop-up was blocked by your browser. Please enable pop-ups and try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign-in was cancelled';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection and try again.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Google sign-in is not enabled. Please contact support.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    const authError = {
      code: errorCode,
      message: errorMessage,
      originalError: error
    };
    
    setError(authError);
    throw authError;
    
  } finally {
    setLoading(false);
  }
};
```

### 3. Apple Sign-In Implementation

#### Apple Authentication Flow
```javascript
const signInWithApple = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Attempting Apple sign-in...');
    
    // Clear any existing auth state
    await signOut();
    
    // Sign in with popup
    const result = await signInWithPopup(auth, appleProvider);
    
    if (result.user) {
      console.log('Apple sign-in successful:', result.user.email);
      
      // Get additional user info from Apple
      const credential = OAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // Log successful authentication
      console.log('Apple Auth successful:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        hasToken: !!token
      });
      
      return result.user;
    } else {
      throw new Error('No user returned from Apple sign-in');
    }
    
  } catch (error) {
    console.error('Apple sign-in error:', error);
    
    let errorMessage = 'An error occurred during Apple sign-in';
    let errorCode = error.code;
    
    // Handle specific Apple Auth errors
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in was cancelled';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Pop-up was blocked by your browser. Please enable pop-ups and try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign-in was cancelled';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection and try again.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Apple sign-in is not enabled. Please contact support.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid Apple credentials. Please try again.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    const authError = {
      code: errorCode,
      message: errorMessage,
      originalError: error
    };
    
    setError(authError);
    throw authError;
    
  } finally {
    setLoading(false);
  }
};
```

### 4. Sign-Out Implementation

#### Secure Sign-Out Process
```javascript
const signOut = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Signing out...');
    
    // Sign out from Firebase Auth
    await firebaseSignOut(auth);
    
    // Clear any cached data
    localStorage.removeItem('psa_cache');
    localStorage.removeItem('cardListSortField');
    localStorage.removeItem('cardListSortDirection');
    localStorage.removeItem('cardListViewMode');
    localStorage.removeItem('cardListDisplayMetric');
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('Sign-out successful');
    
  } catch (error) {
    console.error('Sign-out error:', error);
    
    const authError = {
      code: error.code || 'auth/sign-out-error',
      message: error.message || 'An error occurred during sign-out',
      originalError: error
    };
    
    setError(authError);
    throw authError;
    
  } finally {
    setLoading(false);
  }
};
```

### 5. Password Reset Functionality

#### Email-Based Password Reset
```javascript
const resetPassword = async (email) => {
  try {
    setLoading(true);
    setError(null);
    
    if (!email) {
      throw new Error('Email address is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    console.log('Sending password reset email to:', email);
    
    // Configure action code settings
    const actionCodeSettings = {
      url: window.location.origin + '/signin',
      handleCodeInApp: false
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    
    console.log('Password reset email sent successfully');
    return true;
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMessage = 'An error occurred while sending password reset email';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    const authError = {
      code: error.code || 'auth/password-reset-error',
      message: errorMessage,
      originalError: error
    };
    
    setError(authError);
    throw authError;
    
  } finally {
    setLoading(false);
  }
};
```

### 6. Token Management

#### Access Token Retrieval
```javascript
const getCurrentUserToken = async (forceRefresh = false) => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    // Get the ID token
    const token = await currentUser.getIdToken(forceRefresh);
    
    if (!token) {
      throw new Error('Failed to get user token');
    }
    
    return token;
    
  } catch (error) {
    console.error('Error getting user token:', error);
    throw error;
  }
};

const getTokenClaims = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    // Get the ID token result with claims
    const tokenResult = await currentUser.getIdTokenResult();
    
    return {
      token: tokenResult.token,
      claims: tokenResult.claims,
      authTime: tokenResult.authTime,
      expirationTime: tokenResult.expirationTime,
      issuedAtTime: tokenResult.issuedAtTime
    };
    
  } catch (error) {
    console.error('Error getting token claims:', error);
    throw error;
  }
};
```

## Authentication Hooks

### Custom useAuth Hook
```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Additional utility hooks
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);
  
  return { user, loading };
};

export const useAuthToken = () => {
  const { user } = useAuth();
  
  const getToken = useCallback(async (forceRefresh = false) => {
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    return await user.getIdToken(forceRefresh);
  }, [user]);
  
  return { getToken, user };
};
```

## Error Handling and Recovery

### Authentication Error Management
```javascript
const handleAuthError = (error) => {
  console.error('Authentication error:', error);
  
  // Categorize errors
  const errorCategories = {
    network: ['auth/network-request-failed', 'auth/timeout'],
    user: ['auth/user-not-found', 'auth/user-disabled', 'auth/user-cancelled'],
    permission: ['auth/permission-denied', 'auth/unauthorized-domain'],
    configuration: ['auth/operation-not-allowed', 'auth/api-key-not-valid'],
    temporary: ['auth/too-many-requests', 'auth/quota-exceeded']
  };
  
  let category = 'unknown';
  for (const [cat, codes] of Object.entries(errorCategories)) {
    if (codes.includes(error.code)) {
      category = cat;
      break;
    }
  }
  
  // Log error for monitoring
  console.log('Auth error category:', category, 'Code:', error.code);
  
  return {
    category,
    code: error.code,
    message: error.message,
    recoverable: ['network', 'temporary'].includes(category)
  };
};
```

### Automatic Token Refresh
```javascript
const useTokenRefresh = () => {
  const { user } = useAuth();
  const [tokenRefreshInProgress, setTokenRefreshInProgress] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const refreshToken = async () => {
      try {
        setTokenRefreshInProgress(true);
        await user.getIdToken(true); // Force refresh
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Token refresh failed:', error);
      } finally {
        setTokenRefreshInProgress(false);
      }
    };
    
    // Refresh token every 50 minutes (tokens expire after 60 minutes)
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  return { tokenRefreshInProgress };
};
```

## Authentication State Persistence

### Local Storage Integration
```javascript
const AuthStateManager = {
  // Save authentication preference
  saveAuthPreference(preference) {
    try {
      localStorage.setItem('auth_preference', JSON.stringify(preference));
    } catch (error) {
      console.warn('Failed to save auth preference:', error);
    }
  },
  
  // Get authentication preference
  getAuthPreference() {
    try {
      const saved = localStorage.getItem('auth_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to get auth preference:', error);
      return null;
    }
  },
  
  // Clear all auth-related data
  clearAuthData() {
    const authKeys = [
      'auth_preference',
      'psa_cache',
      'cardListSortField',
      'cardListSortDirection',
      'cardListViewMode',
      'cardListDisplayMetric'
    ];
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key}:`, error);
      }
    });
  }
};
```

## Security Best Practices

### Authentication Security Measures
```javascript
const SecurityManager = {
  // Validate authentication state
  validateAuthState(user) {
    if (!user) return false;
    
    // Check if token is valid
    const tokenCreationTime = user.metadata?.creationTime;
    const lastSignInTime = user.metadata?.lastSignInTime;
    
    if (!tokenCreationTime || !lastSignInTime) {
      console.warn('Invalid user metadata');
      return false;
    }
    
    // Check if sign-in is recent (within 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const signInTime = new Date(lastSignInTime).getTime();
    
    if (now - signInTime > maxAge) {
      console.warn('User session is too old');
      return false;
    }
    
    return true;
  },
  
  // Check if re-authentication is needed
  needsReAuthentication(user) {
    if (!user) return true;
    
    const lastSignInTime = user.metadata?.lastSignInTime;
    if (!lastSignInTime) return true;
    
    // Require re-auth for sensitive operations after 2 hours
    const reAuthWindow = 2 * 60 * 60 * 1000; // 2 hours
    const now = Date.now();
    const signInTime = new Date(lastSignInTime).getTime();
    
    return (now - signInTime) > reAuthWindow;
  },
  
  // Sanitize user data for logging
  sanitizeUserData(user) {
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email ? user.email.replace(/(.{2}).*@/, '$1***@') : null,
      displayName: user.displayName || 'Anonymous',
      providerId: user.providerData[0]?.providerId || 'unknown',
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified
    };
  }
};
```

## Testing and Development Utilities

### Authentication Testing Tools
```javascript
const AuthTestUtils = {
  // Create mock user for testing
  createMockUser(overrides = {}) {
    return {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      },
      providerData: [{
        providerId: 'google.com',
        uid: 'google-123',
        email: 'test@example.com'
      }],
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({
        token: 'mock-token',
        claims: { email: 'test@example.com' },
        authTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString()
      }),
      ...overrides
    };
  },
  
  // Simulate authentication flow
  async simulateSignIn(provider = 'google') {
    console.log(`Simulating ${provider} sign-in...`);
    
    const mockUser = this.createMockUser({
      providerData: [{
        providerId: provider === 'google' ? 'google.com' : 'apple.com',
        uid: `${provider}-test-123`,
        email: 'test@example.com'
      }]
    });
    
    return mockUser;
  }
};
```

## Performance Optimizations

### Authentication Performance
```javascript
// Optimize auth state changes with debouncing
const useDebounceAuthState = (delay = 500) => {
  const { user, loading } = useAuth();
  const [debouncedUser, setDebouncedUser] = useState(user);
  const [debouncedLoading, setDebouncedLoading] = useState(loading);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUser(user);
      setDebouncedLoading(loading);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [user, loading, delay]);
  
  return { user: debouncedUser, loading: debouncedLoading };
};

// Memoize auth context value
const contextValue = useMemo(() => ({
  user,
  loading,
  error,
  signInWithGoogle,
  signInWithApple,
  signOut,
  resetPassword,
  clearError,
  getCurrentUserToken,
  getTokenClaims
}), [user, loading, error]);
```

## Integration with App Components

### Route Protection
```javascript
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    // Redirect to sign-in with return URL
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  
  return children;
};
```

### User Profile Integration
```javascript
const UserProfile = () => {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL,
        provider: user.providerData[0]?.providerId,
        joinDate: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime
      });
    }
  }, [user]);
  
  return (
    <div className="user-profile">
      {userProfile && (
        <>
          <img src={userProfile.photoURL} alt={userProfile.name} />
          <h3>{userProfile.name}</h3>
          <p>{userProfile.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </>
      )}
    </div>
  );
};
```

## Future Enhancement Opportunities

1. **Multi-Factor Authentication**: Add SMS/email-based 2FA
2. **Biometric Authentication**: Support for fingerprint/face recognition
3. **Session Management**: Advanced session handling with multiple devices
4. **Role-Based Access**: Implement user roles and permissions
5. **Social Login Expansion**: Add more OAuth providers (Facebook, Twitter)
6. **Anonymous Authentication**: Support for guest users
7. **Custom Claims**: Server-side user role and permission management
8. **Auth Analytics**: Track authentication patterns and security events
