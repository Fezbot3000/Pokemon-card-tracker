import React from 'react';
import { NavLink } from 'react-router-dom';

function NavigationBar() {
  return (
    <div className="ios-safe-nav fixed inset-x-0 top-0 z-50 flex w-full justify-center pt-4 sm:pt-6 md:pt-8 lg:pt-12">
      <div className="bg-white/10 mx-4 rounded-xl backdrop-blur-sm">
        <div className="flex">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition-colors rounded-l-xl 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink 
            to="/login" 
            className={({ isActive }) => 
              `px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition-colors 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Login
          </NavLink>
          <NavLink 
            to="/marketplace" 
            className={({ isActive }) => 
              `px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition-colors 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Marketplace
          </NavLink>
          <NavLink 
            to="/pricing" 
            className={({ isActive }) => 
              `px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition-colors rounded-r-xl 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Pricing
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;
