import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toast } from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { CardProvider } from './contexts/CardContext';
import { BackupProvider, BackupProgressBar } from './design-system';
import { RestoreProvider, RestoreProgressBar } from './design-system';
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Critical components - loaded immediately
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';

// Lazy load non-critical components for better performance
const Features = lazy(() => import('./components/Features'));
const About = lazy(() => import('./components/About'));
const Privacy = lazy(() => import('./components/Privacy'));
const Terms = lazy(() => import('./components/Terms'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const CollectingGuide = lazy(() => import('./components/CollectingGuide'));
const GradingIntegration = lazy(() => import('./components/GradingIntegration'));
const PokemonSets = lazy(() => import('./components/PokemonSets'));
const PokemonInvestmentGuide = lazy(() => import('./components/PokemonInvestmentGuide'));


const MarketplaceListing = lazy(() => import('./components/Marketplace/MarketplaceListing'));
const PublicMarketplace = lazy(() => import('./components/PublicMarketplace'));
const SharedCollection = lazy(() => import('./components/SharedCollection'));
const UpgradePage = lazy(() => import('./components/UpgradePage'));
const Pricing = lazy(() => import('./components/Pricing'));

// Dashboard components - lazy loaded since they're behind authentication
const DashboardApp = lazy(() => import('./App').then(module => ({ default: module.Dashboard })));
const DashboardIndex = lazy(() => import('./App').then(module => ({ default: module.DashboardIndex })));

// Loading component for Suspense fallback
const LoadingFallback = () => (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div className="size-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
  </div>
);

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
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Features />
            </Suspense>
          ),
        },
        {
          path: 'about',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <About />
            </Suspense>
          ),
        },
        {
          path: 'privacy',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Privacy />
            </Suspense>
          ),
        },
        {
          path: 'terms',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Terms />
            </Suspense>
          ),
        },
        {
          path: 'help-center',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <HelpCenter />
            </Suspense>
          ),
        },
        {
          path: 'collecting-guide',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <CollectingGuide />
            </Suspense>
          ),
        },
        {
          path: 'grading-integration',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <GradingIntegration />
            </Suspense>
          ),
        },
        {
          path: 'pokemon-sets',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PokemonSets />
            </Suspense>
          ),
        },
        {
          path: 'pokemon-investment-guide',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PokemonInvestmentGuide />
            </Suspense>
          ),
        },
        {
          path: 'pricing',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Pricing />
            </Suspense>
          ),
        },
        {
          path: 'marketplace',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PublicMarketplace />
            </Suspense>
          ),
        },
        {
          path: 'marketplace/listing/:listingId',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <MarketplaceListing />
            </Suspense>
          ),
        },
        {
          path: 'shared/:shareId',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <SharedCollection />
            </Suspense>
          ),
        },
        {
          path: 'dashboard',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DashboardApp />
            </Suspense>
          ),
          children: [
            {
              index: true,
              element: (
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardIndex />
                </Suspense>
              ),
            },

          ],
        },

        {
          path: 'upgrade',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <UpgradePage />
            </Suspense>
          ),
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
