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
              `hover:bg-white/10 rounded-l-xl px-3 py-2 text-xs font-medium text-white transition-colors sm:px-4 sm:py-2.5 sm:text-sm md:px-5 md:py-3 ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `hover:bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors sm:px-4 sm:py-2.5 sm:text-sm md:px-5 md:py-3 ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/marketplace"
            className={({ isActive }) =>
              `hover:bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors sm:px-4 sm:py-2.5 sm:text-sm md:px-5 md:py-3 ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `hover:bg-white/10 rounded-r-xl px-3 py-2 text-xs font-medium text-white transition-colors sm:px-4 sm:py-2.5 sm:text-sm md:px-5 md:py-3 ${isActive ? 'bg-white/20' : ''}`
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
