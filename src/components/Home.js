import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import NavigationBar from './NavigationBar';

function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // Call useNavigate at the top level

  // Add page-no-padding class to body when component mounts
  useEffect(() => {
    document.body.classList.add('page-no-padding');
    
    // Clean up function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('page-no-padding');
    };
  }, []);

  // Auto-navigate to dashboard if user is logged in
  useEffect(() => {
    if (currentUser && window.location.pathname === '/') {
      navigate('/dashboard'); // Use navigate defined outside
    }
  }, [currentUser, navigate]); // Add navigate to dependency array
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500 text-gray-900 dark:text-white page-no-padding">
      <NavigationBar />
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 pt-32 sm:pt-40">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-white">
            Your Ultimate Trading Card Companion
          </h1>
          <p className="text-xl sm:text-2xl mb-6 text-gray-100">
            Track, value, and manage your collection—be it Magic: The Gathering, Yu-Gi-Oh!, Pokémon, or any other.
          </p>
          <p className="text-lg mb-12 text-gray-200">
            In collaboration with SwapITT, Australia's premier trading card and collectibles destination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {currentUser ? (
              <Link 
                to="/dashboard" 
                className="bg-white text-purple-900 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-icons">dashboard</span>
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="bg-white text-purple-900 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons">login</span>
                  Login / Sign Up
                </Link>
                <Link 
                  to="/pricing" 
                  className="bg-transparent border-2 border-white text-white font-bold py-3 px-6 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons">sell</span>
                  View Pricing Plans
                </Link>
              </>
            )}
          </div>
          
          {/* App Screenshots */}
          <div className="mt-16 relative">
            {/* Desktop Screenshot */}
            <div className="relative z-10 rounded-xl shadow-2xl overflow-hidden bg-[#1B2131] p-4">
              <img 
                src="/screenshots/Dashboardexample.png" 
                alt="Card Tracker Dashboard"
                className="w-full rounded-lg"
              />
            </div>
            
            {/* Mobile Screenshot - Positioned to overlap */}
            <div className="absolute -bottom-20 right-0 md:right-[10%] w-48 z-20 rounded-xl shadow-2xl overflow-hidden bg-[#1B2131] p-2">
              <img 
                src="/mobileexample.png" 
                alt="Card Tracker Mobile View"
                className="w-full rounded-lg"
              />
            </div>
          </div>
          
          {/* Features Section */}
          <div className="mt-32 mb-10">
            <h2 className="text-3xl font-bold mb-10 text-center text-white">Features Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="material-icons text-4xl text-white mb-4">
                  local_library
                </span>
                <h3 className="text-xl font-semibold mb-2 text-white">Comprehensive Card Database</h3>
                <p className="text-gray-100">
                  Access a vast repository covering various trading card games including Pokémon, Magic: The Gathering, and Yu-Gi-Oh!
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="material-icons text-4xl text-white mb-4">
                  trending_up
                </span>
                <h3 className="text-xl font-semibold mb-2 text-white">Real-Time Price Tracking</h3>
                <p className="text-gray-100">
                  Stay updated with the latest market values and watch your investment grow with accurate data.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="material-icons text-4xl text-white mb-4">
                  folder_special
                </span>
                <h3 className="text-xl font-semibold mb-2 text-white">Collection Management</h3>
                <p className="text-gray-100">
                  Organize and monitor your collection seamlessly across multiple card games and categories.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="material-icons text-4xl text-white mb-4">
                  touch_app
                </span>
                <h3 className="text-xl font-semibold mb-2 text-white">User-Friendly Interface</h3>
                <p className="text-gray-100">
                  Navigate through intuitive and responsive design that makes tracking your collection effortless.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-20 mb-16">
            <h2 className="text-3xl font-bold mb-10 text-center text-white">Premium Plan</h2>
            <div className="max-w-lg mx-auto">
              <div className="bg-yellow-400/20 backdrop-blur-sm rounded-xl p-8 transform transition-transform hover:scale-105 border-2 border-yellow-400/50">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Premium Features</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">$12.99</span>
                    <span className="text-white text-sm">/month</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Advanced analytics and priority support</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Track unlimited cards</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Advanced analytics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Unlimited collections</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Automatic cloud backup</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Sync across all devices</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-green-400 mr-3">check_circle</span>
                    <span className="text-gray-200">Priority customer support</span>
                  </li>
                </ul>
                <div className="mt-auto text-center">
                  <Link to="/pricing" className="inline-block w-full py-3 px-6 bg-yellow-400 hover:bg-yellow-500 text-center text-gray-900 font-bold rounded-lg transition-colors">
                    Subscribe Now
                  </Link>
                  <p className="text-center text-sm text-gray-400 mt-4">
                    Secure payment processed by Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Partnership Highlight Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mt-24">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-48 flex-shrink-0">
                <img 
                  src="/swapit-logo.svg" 
                  alt="SwapITT Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load SwapITT logo:', e);
                    e.target.style.display = 'none';
                    e.target.onerror = null;
                  }}
                />
              </div>
              <div className="flex-grow">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
                  Partnering with SwapITT: Elevating Your Collecting Experience
                </h2>
                <p className="text-lg text-gray-100 mb-6">
                  We've teamed up with SwapITT, Australia's leading trading card and collectibles store, to bring you exclusive insights, deals, and community events. Explore SwapITT's extensive collection of NBA, Pokémon, Soccer, UFC, Formula 1, NFL, Baseball, NRL, One Piece, MARVEL, and more.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['NBA', 'Pokémon', 'Soccer', 'UFC', 'F1', 'NFL', 'Baseball', 'NRL', 'One Piece', 'MARVEL'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white/20 rounded-full text-sm text-white">
                      {tag}
                    </span>
                  ))}
                </div>
                <a 
                  href="https://swapitt.com.au/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-white text-purple-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span>Visit SwapITT</span>
                  <span className="material-icons text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="mt-20 mb-16">
            <h2 className="text-3xl font-bold mb-10 text-center text-white">What Our Users Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                    A
                  </div>
                  <div className="ml-4">
                    <h4 className="text-white font-semibold">Alex R.</h4>
                    <div className="flex text-yellow-400">
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-200 italic">
                  "CardTracker has revolutionized how I manage my Magic: The Gathering collection! The interface is intuitive and the price tracking feature is incredibly accurate."
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                    J
                  </div>
                  <div className="ml-4">
                    <h4 className="text-white font-semibold">Jamie L.</h4>
                    <div className="flex text-yellow-400">
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star</span>
                      <span className="material-icons text-sm">star_half</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-200 italic">
                  "An indispensable tool for any trading card enthusiast. I've been able to track my Yu-Gi-Oh collection's value with precision and the cloud backup gives me peace of mind."
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-black/30 backdrop-blur-sm py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-1">
                  <h3 className="text-xl font-bold text-white mb-4">CardTracker</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Your ultimate companion for tracking, valuing, and managing your trading card collection.
                  </p>
                </div>
                
                <div className="col-span-1">
                  <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                  <ul className="space-y-2">
                    <li><Link to="/" className="text-gray-300 hover:text-white">Home</Link></li>
                    <li><Link to="/pricing" className="text-gray-300 hover:text-white">Pricing</Link></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">Features</a></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">About Us</a></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">Contact</a></li>
                  </ul>
                </div>
                
                <div className="col-span-1">
                  <h4 className="font-semibold text-white mb-4">Legal</h4>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-gray-300 hover:text-white">Privacy Policy</a></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">Terms of Service</a></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">Cookie Policy</a></li>
                    <li><a href="#" className="text-gray-300 hover:text-white">Support</a></li>
                  </ul>
                </div>
                
                <div className="col-span-1">
                  <h4 className="font-semibold text-white mb-4">Newsletter</h4>
                  <p className="text-gray-300 text-sm mb-4">Subscribe for updates and tips.</p>
                  <form className="flex">
                    <input 
                      type="email" 
                      placeholder="Your email" 
                      className="bg-white/10 text-white placeholder-gray-400 px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 flex-grow"
                    />
                    <button 
                      type="submit"
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-r-lg font-medium"
                    >
                      <span className="material-icons text-sm">send</span>
                    </button>
                  </form>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-700 text-center">
                <p className="text-gray-400 text-sm">
                  {new Date().getFullYear()} CardTracker. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Home;