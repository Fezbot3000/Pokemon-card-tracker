import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toast, useAuth } from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { BackupProvider, BackupProgressBar } from './design-system';
import { RestoreProvider, RestoreProgressBar } from './design-system';
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import Features from './components/Features';
import About from './components/About';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import HelpCenter from './components/HelpCenter';
import CollectingGuide from './components/CollectingGuide';
import GradingIntegration from './components/GradingIntegration';
import PokemonSets from './components/PokemonSets';
import PokemonInvestmentGuide from './components/PokemonInvestmentGuide';
import { Dashboard, DashboardIndex } from './App';
import Settings from './components/Settings';
import DashboardPricing from './components/DashboardPricing';
import PremiumFeatures from './components/PremiumFeatures';
import ComponentLibrary from './pages/ComponentLibrary';
import MarketplaceListing from './components/Marketplace/MarketplaceListing';
import PublicMarketplace from './components/PublicMarketplace';

// Root providers wrapper component
export const RootProviders = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <DesignSystemProvider>
        <SubscriptionProvider>
          <UserPreferencesProvider>
            <TutorialProvider>
              <BackupProvider>
                <BackupProgressBar />
                <RestoreProvider>
                  <RestoreProgressBar />
                  <InvoiceProvider>
                    <Toast
                      position="bottom-right"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#1B2131',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          borderRadius: '12px',
                          padding: '12px 24px',
                          fontWeight: '500'
                        }
                      }}
                    />
                    <Outlet />
                  </InvoiceProvider>
                </RestoreProvider>
              </BackupProvider>
            </TutorialProvider>
          </UserPreferencesProvider>
        </SubscriptionProvider>
      </DesignSystemProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

// Protected route wrapper for dashboard
function ProtectedDashboard() {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <Dashboard />;
}

// Login route wrapper that redirects authenticated users
function LoginRoute() {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
}

// Create and export the router
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootProviders />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <LoginRoute />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'pricing',
        element: <Pricing />,
      },
      {
        path: 'features',
        element: <Features />,
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'privacy',
        element: <Privacy />,
      },
      {
        path: 'terms',
        element: <Terms />,
      },
      {
        path: 'help-center',
        element: <HelpCenter />,
      },
      {
        path: 'collecting-guide',
        element: <CollectingGuide />,
      },
      {
        path: 'grading-integration',
        element: <GradingIntegration />,
      },
      {
        path: 'pokemon-sets',
        element: <PokemonSets />,
      },
      {
        path: 'pokemon-investment-guide',
        element: <PokemonInvestmentGuide />,
      },
      {
        path: 'marketplace',
        element: <PublicMarketplace />,
      },
      {
        path: 'marketplace/listing/:listingId',
        element: <MarketplaceListing />,
      },
      {
        path: 'dashboard',
        element: <ProtectedDashboard />,
        children: [
          {
            index: true,
            element: <DashboardIndex />,
          },
          {
            path: 'pricing',
            element: <DashboardPricing />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
      {
        path: 'premium/*',
        element: <PremiumFeatures />,
      },
      {
        path: 'component-library',
        element: <ComponentLibrary />,
      },
      {
        path: '*',
        element: <Navigate to="/" />,
      },
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
