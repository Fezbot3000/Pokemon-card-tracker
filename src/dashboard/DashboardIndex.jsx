import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { AppContent } from '../App';

function DashboardIndex() {
  const { currentView, setCurrentView } = useOutletContext();
  const location = useLocation();

  useEffect(() => {
    try {
      if (location.state?.targetView) {
        setTimeout(() => {
          setCurrentView(location.state.targetView);
        }, 0);
        window.history.replaceState({}, '', location.pathname);
      }
    } catch (error) {
      if (location.state?.targetView) {
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [location.state, location.pathname, setCurrentView]);

  return <AppContent currentView={currentView} setCurrentView={setCurrentView} />;
}

export { DashboardIndex };


