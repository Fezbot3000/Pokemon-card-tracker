import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate, 
  useLocation, 
  Link, 
  useNavigate,
  Outlet
} from 'react-router-dom';
import { 
  Header, 
  useTheme, 
  useAuth,
  toast,
  Toast, 
  SettingsModal, 
  Icon,
  RestoreProvider, useRestore,
  RestoreProgressBar,
  BackupProvider, useBackup,
  BackupProgressBar,
  toastService
} from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import db from './services/firestore/dbAdapter';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import './styles/black-background.css'; 
import './styles/ios-fixes.css';
import logger from './utils/logger';
import RestoreListener from './components/RestoreListener';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import featureFlags from './utils/featureFlags';
import { CardRepository } from './repositories/CardRepository';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db as firestoreDb, storage } from './services/firebase';
import shadowSync from './services/shadowSync';
import JSZip from 'jszip';

// Lazy load heavy components for better performance
const MobileSettingsModal = React.lazy(() => import('./components/MobileSettingsModal'));
const CardList = React.lazy(() => import('./components/CardList'));
const CardDetails = React.lazy(() => import('./components/CardDetails'));
const NewCardForm = React.lazy(() => import('./components/NewCardForm'));
const ImportModal = React.lazy(() => import('./components/ImportModal'));
const ProfitChangeModal = React.lazy(() => import('./components/ProfitChangeModal'));
const AddCardModal = React.lazy(() => import('./components/AddCardModal'));
const Home = React.lazy(() => import('./components/Home'));
const Login = React.lazy(() => import('./components/Login'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const Pricing = React.lazy(() => import('./components/Pricing'));
const PremiumFeatures = React.lazy(() => import('./components/PremiumFeatures'));
const SoldItems = React.lazy(() => import('./components/SoldItems/SoldItems'));
const PurchaseInvoices = React.lazy(() => import('./components/PurchaseInvoices/PurchaseInvoices'));
const Marketplace = React.lazy(() => import('./components/Marketplace/Marketplace'));
const MarketplaceSelling = React.lazy(() => import('./components/Marketplace/MarketplaceSelling'));
const MarketplaceMessages = React.lazy(() => import('./components/Marketplace/MarketplaceMessages'));
const CloudSync = React.lazy(() => import('./components/CloudSync'));
const DashboardPricing = React.lazy(() => import('./components/DashboardPricing'));
const ComponentLibrary = React.lazy(() => import('./pages/ComponentLibrary'));
const TutorialModal = React.lazy(() => import('./components/TutorialModal'));
const BottomNavBar = React.lazy(() => import('./components/BottomNavBar'));

// Loading component for lazy loaded routes
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-dark-bg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

// Helper function to generate a unique ID for cards without one
const generateUniqueId = () => {
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 10000);
  return `card_${timestamp}_${randomPart}`;
};

// NewUserRoute to check subscription status and redirect to pricing for new sign-ups
function NewUserRoute() {
  const { user } = useAuth();
  const { subscriptionStatus, isLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  
  useEffect(() => {
    // Avoid multiple redirects
    if (hasRedirected.current) return;
    
    // Wait until subscription status is loaded
    if (isLoading) return;
    
    // Only redirect if user is authenticated and has no subscription
    if (user && subscriptionStatus === 'none') {
      hasRedirected.current = true;
      
      // Store the intended destination
      const from = location.pathname;
      
      // Redirect to pricing page
      navigate('/pricing', { 
        state: { 
          from,
          isNewUser: true,
          message: 'Welcome! Please choose a subscription plan to continue.' 
        } 
      });
    }
  }, [user, subscriptionStatus, isLoading, navigate, location]);
  
  // Show loading state while checking subscription
  if (isLoading) {
    return <RouteLoader />;
  }
  
  // If user has subscription or no user, render the outlet
  return <Outlet />;
}

// Main Dashboard Component
function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!user) {
      // Store the current location they were trying to access
      const from = location.pathname;
      navigate('/login', { 
        state: { 
          from,
          message: 'Please log in to access your dashboard' 
        } 
      });
    }
  }, [user, navigate, location]);
  
  if (!user) {
    return <RouteLoader />;
  }
  
  return (
    <NewUserRoute />
  );
}

// Wrapper for dashboard index route (AppContent)
function DashboardIndex() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <AppContent />
    </Suspense>
  );
}

// Export the main AppContent component from here
export { AppContent };

// Import AppContent from separate file to reduce main bundle
const AppContent = React.lazy(() => import('./AppContent'));

const RootProviders = () => (
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
                  <Suspense fallback={<RouteLoader />}>
                    <Outlet />
                  </Suspense>
                </InvoiceProvider>
              </RestoreProvider>
            </BackupProvider>
          </TutorialProvider>
        </UserPreferencesProvider>
      </SubscriptionProvider>
    </DesignSystemProvider>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootProviders />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Login />
          </Suspense>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <ForgotPassword />
          </Suspense>
        ),
      },
      {
        path: 'pricing',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <Pricing />
          </Suspense>
        ),
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
            element: (
              <Suspense fallback={<RouteLoader />}>
                <DashboardPricing />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'premium/*',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <PremiumFeatures />
          </Suspense>
        ),
      },
      {
        path: 'component-library',
        element: (
          <Suspense fallback={<RouteLoader />}>
            <ComponentLibrary />
          </Suspense>
        ),
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

function App() {
  return null;
}

export default App;
