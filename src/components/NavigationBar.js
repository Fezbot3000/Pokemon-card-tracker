import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function NavigationBar() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <div className="w-full fixed top-0 left-0 right-0 z-50 flex justify-center pt-12">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl">
        <div className="flex">
          <Link 
            to="/" 
            className={`px-5 py-3 text-sm font-medium text-white hover:bg-white/10 
                       ${currentPath === '/' ? 'bg-white/20' : ''} 
                       ${currentPath === '/login' || currentPath === '/pricing' ? 'rounded-l-xl' : ''} 
                       transition-colors`}
          >
            Home
          </Link>
          <Link 
            to="/login" 
            className={`px-5 py-3 text-sm font-medium text-white hover:bg-white/10 
                       ${currentPath === '/login' ? 'bg-white/20' : ''} 
                       transition-colors`}
          >
            Login
          </Link>
          <Link 
            to="/pricing" 
            className={`px-5 py-3 text-sm font-medium text-white hover:bg-white/10 
                       ${currentPath === '/pricing' ? 'bg-white/20' : ''} 
                       ${currentPath === '/' || currentPath === '/login' ? 'rounded-r-xl' : ''} 
                       transition-colors`}
          >
            Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NavigationBar; 