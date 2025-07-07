import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toast, useAuth } from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { CardProvider } from './contexts/CardContext';
import { BackupProvider, BackupProgressBar } from './design-system';
import { RestoreProvider, RestoreProgressBar } from './design-system';
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
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
import ComponentLibrary from './pages/ComponentLibrary';
import MarketplaceListing from './components/Marketplace/MarketplaceListing';
import PublicMarketplace from './components/PublicMarketplace';
import ProtectedRoute from './components/ProtectedRoute';
import SharedCollection from './components/SharedCollection';
import UpgradePage from './components/UpgradePage';
import Pricing from './components/Pricing';
import ScrollToTop from './components/ScrollToTop';

// Root providers wrapper component
export const RootProviders = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <DesignSystemProvider>
        <UserPreferencesProvider>
          <TutorialProvider>
            <CardProvider>
              <BackupProvider>
                <BackupProgressBar />
                <RestoreProvider>
                  <RestoreProgressBar />
                  <InvoiceProvider>
                    <Toast
                      position="top-left"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#1B2131',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          borderRadius: '12px',
                          padding: '12px 24px',
                          fontWeight: '500',
                        },
                      }}
                    />
                    <ScrollToTop />
                    <Outlet />
                  </InvoiceProvider>
                </RestoreProvider>
              </BackupProvider>
            </CardProvider>
          </TutorialProvider>
        </UserPreferencesProvider>
      </DesignSystemProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

// Create and export the router
export const router = createBrowserRouter(
  [
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
          element: <Login />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPassword />,
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
          path: 'pricing',
          element: <Pricing />,
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
          path: 'shared/:shareId',
          element: <SharedCollection />,
        },
        {
          path: 'dashboard',
          element: <Dashboard />,
          children: [
            {
              index: true,
              element: <DashboardIndex />,
            },
            {
              path: 'settings',
              element: <Settings />,
            },
          ],
        },
        {
          path: 'component-library',
          element: <ComponentLibrary />,
        },
        {
          path: 'upgrade',
          element: <UpgradePage />,
        },
        {
          path: '*',
          element: <Navigate to="/" />,
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);
