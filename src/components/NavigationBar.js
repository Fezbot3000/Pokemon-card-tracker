import React from 'react';
import { NavLink } from 'react-router-dom';

function NavigationBar() {
  return (
    <div className="w-full fixed top-0 left-0 right-0 z-50 flex justify-center pt-12">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl">
        <div className="flex">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors rounded-l-xl 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink 
            to="/login" 
            className={({ isActive }) => 
              `px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors 
               ${isActive ? 'bg-white/20' : ''}`
            }
          >
            Login
          </NavLink>
          <NavLink 
            to="/pricing" 
            className={({ isActive }) => 
              `px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors rounded-r-xl 
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