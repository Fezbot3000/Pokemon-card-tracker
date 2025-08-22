import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Header, useAuth } from '../design-system';
import BottomNavBar from '../components/BottomNavBar';
import useCardsSource from '../hooks/useCardsSource';

function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('currentView');
    return saved || 'cards';
  });

  const updateCurrentView = (newView) => {
    setCurrentView(newView);
    localStorage.setItem('currentView', newView);
  };

  const { loading: dataLoading } = useCardsSource();

  if (authLoading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView={currentView}
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />
        <main className={`main-content mobile-dashboard mx-auto max-w-[1920px] ${window.innerWidth <= 768 ? 'no-header' : 'mt-4'}`}>
          <div className="flex-1 overflow-y-auto">
            <div className={`pb-20 sm:p-6 ${window.innerWidth <= 768 ? 'px-2 pt-2' : 'p-4'}`}>
              <div className="w-full px-1 pb-20 sm:px-2">
                {/* Simple loading spinner */}
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <BottomNavBar
          currentView={currentView}
          onViewChange={updateCurrentView}
          onSettingsClick={() => updateCurrentView('settings')}
        />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (dataLoading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView={currentView}
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />
        <main className={`main-content mobile-dashboard mx-auto max-w-[1920px] ${window.innerWidth <= 768 ? 'no-header' : 'mt-4'}`}>
          <div className="flex-1 overflow-y-auto">
            <div className={`pb-20 sm:p-6 ${window.innerWidth <= 768 ? 'px-2 pt-2' : 'p-4'}`}>
              <div className="w-full px-1 pb-20 sm:px-2">
                {/* Simple loading spinner */}
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <BottomNavBar
          currentView={currentView}
          onViewChange={updateCurrentView}
          onSettingsClick={() => updateCurrentView('settings')}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Outlet context={{ currentView, setCurrentView: updateCurrentView }} />
      {!location.pathname.includes('/pricing') && (
        <BottomNavBar
          currentView={
            location.pathname.includes('/settings') ? 'settings' : currentView
          }
          onViewChange={(view) => {
            try {
              if (location.pathname.includes('/settings')) {
                navigate('/dashboard', { state: { targetView: view } });
              } else {
                setTimeout(() => {
                  updateCurrentView(view);
                }, 0);
              }
            } catch (error) {
              updateCurrentView(view);
            }
          }}
          onSettingsClick={() => {
            updateCurrentView('settings');
          }}
        />
      )}
    </div>
  );
}

export { Dashboard };


