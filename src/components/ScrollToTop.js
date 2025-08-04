import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    // Only scroll to top on actual page navigation, not modal/view switches within dashboard
    const currentPath = pathname;
    const previousPath = previousPathname.current;
    
    // Skip scroll-to-top for:
    // 1. Dashboard sub-route changes (e.g., /dashboard/cards to /dashboard/marketplace)
    // 2. Same route (modal opens/closes don't change the route meaningfully)
    const isDashboardSubNavigation = 
      currentPath.startsWith('/dashboard/') && 
      previousPath.startsWith('/dashboard/');
    
    const isSameBasePage = currentPath === previousPath;
    
    // Only scroll to top for genuine page navigation
    if (!isDashboardSubNavigation && !isSameBasePage) {
      window.scrollTo(0, 0);
    }
    
    // Update the previous pathname for next comparison
    previousPathname.current = currentPath;
  }, [pathname]);

  return null;
}

export default ScrollToTop;
