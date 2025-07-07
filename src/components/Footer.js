import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-white/10 border-t bg-black px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <h3 className="mb-4 text-xl font-bold">MyCardTracker</h3>
            <p className="mb-6 text-sm text-gray-400">
              Australia's most trusted platform for trading card collection management and trading.
            </p>
          </div>
          
          <div className="col-span-1">
            <h4 className="mb-4 font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/login" className="transition-colors hover:text-white">Sign Up</Link></li>
              <li><Link to="/features" className="transition-colors hover:text-white">Features</Link></li>
              <li><Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link></li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h4 className="mb-4 font-semibold">Card Guides</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/collecting-guide" className="transition-colors hover:text-white">Collecting Guide</Link></li>
              <li><Link to="/pokemon-sets" className="transition-colors hover:text-white">Card Sets & Prices</Link></li>
              <li><Link to="/pokemon-investment-guide" className="transition-colors hover:text-white">Investment Guide</Link></li>
              <li><Link to="/grading-integration" className="transition-colors hover:text-white">Grading Integration</Link></li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h4 className="mb-4 font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/help-center" className="transition-colors hover:text-white">Help Center</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-white">About</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-white/10 border-t pt-8 text-center">
          <p className="text-sm text-gray-400">
            {new Date().getFullYear()} MyCardTracker Australia. Made with ❤️ for card collectors worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
