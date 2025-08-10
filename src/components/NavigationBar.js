import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavigationBar.css';

function NavigationBar() {
  return (
    <div className="navigation-bar">
      <div className="navigation-bar__wrapper">
        <div className="navigation-bar__links">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `navigation-bar__link navigation-bar__link--first ${isActive ? 'navigation-bar__link--active' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `navigation-bar__link ${isActive ? 'navigation-bar__link--active' : ''}`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/marketplace"
            className={({ isActive }) =>
              `navigation-bar__link ${isActive ? 'navigation-bar__link--active' : ''}`
            }
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `navigation-bar__link navigation-bar__link--last ${isActive ? 'navigation-bar__link--active' : ''}`
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
