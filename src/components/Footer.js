import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-xl font-bold mb-4">MyCardTracker</h3>
            <p className="text-gray-400 text-sm mb-6">
              Australia's most trusted platform for trading card collection management and trading.
            </p>
          </div>
          
          <div className="col-span-1">
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/login" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link to="/features" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/pricing" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h4 className="font-semibold mb-4">Card Guides</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/collecting-guide" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Collecting Guide</Link></li>
              <li><Link to="/pokemon-sets" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Card Sets & Prices</Link></li>
              <li><Link to="/pokemon-investment-guide" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Investment Guide</Link></li>
              <li><Link to="/grading-integration" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Grading Integration</Link></li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/help-center" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/about" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-gray-400 text-sm">
            {new Date().getFullYear()} MyCardTracker Australia. Made with ❤️ for card collectors worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
