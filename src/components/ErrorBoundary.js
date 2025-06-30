import React from 'react';
import logger from '../utils/logger';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // Instead of using useTheme, we'll check the document class directly
  // or use a simpler approach to determine dark mode
  const prefersDarkMode = () => {
    // Check if <html> has 'dark' class
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    // Fallback to media query if document is not available
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  
  const isDarkMode = prefersDarkMode();

  const isChunkError = error?.name === 'ChunkLoadError' || 
                      error?.message?.includes('Loading chunk') ||
                      error?.message?.includes('Loading CSS chunk') ||
                      error?.stack?.includes('ChunkLoadError');

  if (isChunkError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Issue</h2>
          <p className="text-gray-600 mb-6">
            The app is updating. Please wait while we refresh the page...
          </p>
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-gray-600">Refreshing automatically...</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`max-w-md w-full p-6 rounded-xl border ${
        isDarkMode ? 'bg-[#1B2131] border-gray-700/50' : 'bg-white border-gray-200'
      }`}>
        <div className="text-center mb-6">
          <span className="material-icons text-6xl text-red-500 mb-4">error_outline</span>
          <h2 className={`text-2xl font-semibold mb-2 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-900'
          }`}>
            Something went wrong
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {error.message}
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={resetErrorBoundary}
            className="w-full btn btn-primary"
          >
            Try again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full btn btn-secondary"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is a chunk loading error (React Error #310)
    const isChunkError = error?.name === 'ChunkLoadError' || 
                        error?.message?.includes('Loading chunk') ||
                        error?.message?.includes('Loading CSS chunk') ||
                        error?.stack?.includes('ChunkLoadError');
    
    // Log the error to our custom logger instead of console.error
    // This prevents errors from showing in production console
    if (process.env.NODE_ENV === 'development') {
      logger.error('Error caught by boundary:', error);
      logger.debug('Error details:', errorInfo);
    } else {
      // In production, only log to a monitoring service if available
      // or use a minimal console output that doesn't expose implementation details
      const errorMessage = error?.message || 'An unexpected error occurred';
      logger.error(`UI Error: ${errorMessage}`);
      
      // Here you could add integration with error monitoring services like Sentry
      // if (window.Sentry) {
      //   window.Sentry.captureException(error);
      // }
    }
    
    // Auto-reload for chunk loading errors
    if (isChunkError) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
