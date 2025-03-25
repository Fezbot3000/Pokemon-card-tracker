import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPage from './components/auth/AuthPage';
import AppContent from './App';

// Main App component that handles authentication
function AppWithAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? 'User authenticated' : 'User not authenticated');
      setUser(currentUser);
      setLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {user ? <AppContent user={user} /> : <AuthPage />}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppWithAuth; 