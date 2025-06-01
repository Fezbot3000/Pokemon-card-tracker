# Authentication & Authorization System

## Overview

The Pokemon Card Tracker uses Firebase Authentication with custom authorization patterns for role-based access control. The system supports multiple authentication methods, persistent sessions, and admin-only features.

## Authentication Implementation

### Firebase Authentication Setup

**Core Configuration:**
- Firebase Auth with email/password and Google OAuth
- Browser local persistence for automatic sign-in
- Custom error handling with user-friendly messages
- New user detection and onboarding flow

**AuthContext Provider (`design-system/contexts/AuthContext.js`):**
```javascript
// Centralized authentication state management
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth state listener with auto-persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Auto-create Firestore user document
        await createUserDocument(user);
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);
};
```

### Authentication Methods

#### 1. Email/Password Authentication
- Standard Firebase email/password sign-in
- Password reset functionality via Firebase
- Custom error handling for user experience
- Automatic persistence configuration

#### 2. Google OAuth Integration
- Google Sign-In with popup flow
- New user detection for onboarding
- Automatic Firestore document creation
- Profile information extraction

**Google Sign-In Implementation:**
```javascript
const signInWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    
    // Check if this is a new account
    const isNewAccount = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    
    if (isNewAccount) {
      localStorage.setItem('isNewUser', 'true');
    }
    
    return result.user;
  } catch (err) {
    // Handle errors
  }
};
```

## Authorization System

### Role-Based Access Control

**Admin Detection:**
The system uses simple email-based admin detection:

```javascript
// AdminDashboard.js
const isAdmin = currentUser && (
  currentUser.email === 'your-admin-email@example.com' || 
  currentUser.email.endsWith('@yourcompany.com')
);
```

**Admin Features:**
- PSA database management
- User data analytics
- System maintenance tools
- Export capabilities

### Protected Routes

**ProtectedRoute Component:**
```javascript
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

**Route Protection Implementation:**
- Dashboard and settings require authentication
- Admin routes check for admin role
- Automatic redirect to login for unauthenticated users
- Loading states during auth verification

## User Document Management

### Firestore User Documents

**User Document Structure:**
```javascript
// users/{uid}
{
  uid: "user-firebase-uid",
  email: "user@example.com",
  displayName: "User Name",
  firstName: "First",
  lastName: "Last",
  photoURL: "https://...",
  createdAt: serverTimestamp(),
  lastLoginAt: serverTimestamp(),
  isAdmin: false,
  preferences: {
    currency: "USD",
    theme: "dark",
    autoBackup: true
  }
}
```

**Auto-Creation Process:**
1. User signs in/registers with Firebase Auth
2. AuthContext detects new user
3. Firestore document created automatically
4. Profile information populated from auth provider
5. Default preferences set

### User Profile Management

**Profile Update System:**
```javascript
const updateUserProfile = async (profileData) => {
  try {
    // Update Firebase Auth profile
    await updateProfile(auth.currentUser, {
      displayName: profileData.displayName,
      photoURL: profileData.photoURL
    });
    
    // Update Firestore document
    await updateDoc(doc(firestoreDb, 'users', currentUser.uid), {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      updatedAt: serverTimestamp()
    });
    
    toast.success('Profile updated successfully');
  } catch (error) {
    handleError(error);
  }
};
```

## Session Management

### Persistence Strategy

**Local Persistence:**
- Browser local persistence for cross-session authentication
- Automatic sign-in on app load
- Auth state preservation across browser restarts

**Loading States:**
```javascript
// Auth loading management
const [loading, setLoading] = useState(true);

useEffect(() => {
  let isMounted = true;
  
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!isMounted) return;
    
    // Small delay to prevent auth flashing
    setTimeout(() => {
      if (isMounted) {
        setUser(user);
        setLoading(false);
      }
    }, 100);
  });
  
  return () => {
    isMounted = false;
    unsubscribe();
  };
}, []);
```

### New User Onboarding

**New User Detection:**
1. Check metadata for creation time vs last sign-in time
2. Set localStorage flag for new users
3. Redirect to onboarding flow
4. Clear flag after onboarding completion

**Onboarding Flow:**
- Welcome message and tutorial
- Default collection creation
- Preference setup
- Dashboard introduction

## Security Considerations

### Data Access Control

**Firestore Security Rules:**
```javascript
// Security rules for user documents
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User's subcollections
    match /users/{userId}/{collection=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Local Data Protection:**
- User ID verification on data operations
- IndexedDB data scoped to authenticated user
- Security verification tools in admin panel

### Error Handling

**Firebase Error Mapping:**
```javascript
const handleFirebaseError = (error) => {
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
  };
  
  return errorMessages[error.code] || 'An error occurred. Please try again.';
};
```

## Integration Points

### Context Providers

**Auth Integration:**
- UserPreferencesContext uses auth state for persistence
- CardContext scopes data to authenticated user
- All data operations require valid auth state

**Component Integration:**
```javascript
// useAuth hook usage
const { currentUser, loading, signIn, signOut } = useAuth();

// Conditional rendering based on auth state
if (loading) return <LoadingSpinner />;
if (!currentUser) return <Navigate to="/login" />;
```

### Data Scoping

**User-Scoped Operations:**
All data operations automatically scope to the authenticated user:

```javascript
// Example: Loading user collections
const loadCollections = async () => {
  if (!currentUser?.uid) return;
  
  const collections = await db.getCollections(currentUser.uid);
  return collections;
};
```

## Performance Optimizations

### Auth State Caching

**Persistence Benefits:**
- Eliminates re-authentication on page refresh
- Faster app initialization
- Improved user experience
- Reduced Firebase Auth API calls

### Loading State Management

**Auth Loading Strategy:**
1. Show loading spinner during auth verification
2. 100ms delay to prevent auth state flashing
3. Graceful fallback to login page
4. Maintain loading state across components

## Error Recovery

### Auth State Recovery

**Connection Issues:**
- Offline auth state preservation
- Retry logic for failed auth operations
- Graceful degradation when Firebase unavailable

**Error Boundaries:**
- React error boundaries around auth components
- Fallback UI for auth failures
- User-friendly error messages

## Future Enhancements

### Planned Features

1. **Multi-Factor Authentication:**
   - SMS verification
   - Authenticator app integration
   - Recovery codes

2. **Enhanced Role System:**
   - Granular permissions
   - Role hierarchy
   - Dynamic role assignment

3. **Session Management:**
   - Session timeout
   - Concurrent session limits
   - Device management

4. **Audit Logging:**
   - Login attempt tracking
   - Security event logging
   - Admin action auditing

## Testing Strategy

### Authentication Testing

**Unit Tests:**
- Auth hook functionality
- Error handling scenarios
- State management

**Integration Tests:**
- Sign-in/sign-out flows
- Protected route access
- User document creation

**Security Tests:**
- Authorization bypass attempts
- Data access validation
- Admin function protection

## Monitoring & Analytics

### Auth Metrics

**Key Metrics:**
- User sign-up rates
- Login success/failure rates
- Session duration
- Feature usage by user type

**Error Tracking:**
- Authentication failures
- Authorization errors
- Session timeout issues
- API call failures

This authentication and authorization system provides a robust foundation for user management while maintaining simplicity and security. The system scales well and provides clear separation between authenticated and unauthenticated experiences.
