import React from 'react';

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
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
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