import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Toast } from './design-system';
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
import { Dashboard, DashboardIndex } from './App';
import DashboardPricing from './components/DashboardPricing';
import PremiumFeatures from './components/PremiumFeatures';
import ComponentLibrary from './pages/ComponentLibrary';

// Root providers wrapper component
export const RootProviders = () => (
  <ErrorBoundary>
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
                    position="top-center"
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
  </ErrorBoundary>
);

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
        element: <Login />,
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
        path: 'dashboard',
        element: <Dashboard />,
        children: [
          {
            index: true,
            element: <DashboardIndex />,
          },
          {
            path: 'pricing',
            element: <DashboardPricing />,
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
