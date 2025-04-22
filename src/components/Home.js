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
          
          {/* Social Media Links */}
          <div className="flex justify-center gap-4 mt-4">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" 
               className="text-white hover:text-gray-200 transition-colors">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.ebay.com/" target="_blank" rel="noopener noreferrer" 
               className="text-white hover:text-gray-200 transition-colors">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.5 3.5c-3.042 0-5.5 2.458-5.5 5.5v1.5H8.25v-.31c0-1.126.551-2.234 1.52-2.854a3.5 3.5 0 0 1 3.71-.063c1.038.6 1.691 1.711 1.691 2.917v.31H19.5V9c0-3.042-2.458-5.5-5.5-5.5H9.5Z" />
                <path d="M4 12v3.5C4 18.58 6.42 21 9.5 21h6c3.08 0 5.5-2.42 5.5-5.5V12H4Z" />
              </svg>
            </a>
            <a href="https://linktr.ee/" target="_blank" rel="noopener noreferrer" 
               className="text-white hover:text-gray-200 transition-colors">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.953 15.066c-.08 0-.16.02-.232.059a.646.646 0 0 0-.196.16.713.713 0 0 0-.134.232.707.707 0 0 0-.045.25c0 .08.015.16.044.245.03.08.076.16.135.23a.631.631 0 0 0 .196.16.65.65 0 0 0 .232.054.65.65 0 0 0 .25-.054.631.631 0 0 0 .196-.16.772.772 0 0 0 .13-.23.707.707 0 0 0 .05-.246.707.707 0 0 0-.05-.25.713.713 0 0 0-.13-.231.646.646 0 0 0-.196-.16.65.65 0 0 0-.25-.06zm8.65-.147h-3.233c-.265 0-.48.215-.48.48v3.234c0 .264.215.48.48.48h3.233c.265 0 .48-.216.48-.48V15.4c0-.265-.215-.48-.48-.48zm-13.653 0h3.233c.265 0 .48.215.48.48v3.234c0 .264-.215.48-.48.48H2.95c-.265 0-.48-.216-.48-.48V15.4c0-.265.215-.48.48-.48zm6.927 0h3.233c.265 0 .48.215.48.48v3.234c0 .264-.215.48-.48.48h-3.233c-.265 0-.48-.216-.48-.48V15.4c0-.265.215-.48.48-.48zm-.101-7.98h3.435c.265 0 .48.214.48.48v3.435c0 .265-.215.48-.48.48H9.826c-.265 0-.48-.215-.48-.48V7.418c0-.265.215-.48.48-.48zm.205-3.67c0-.265.215-.48.48-.48h3.03c.266 0 .481.215.481.48v3.03c0 .266-.215.48-.48.48h-3.031c-.265 0-.48-.214-.48-.48v-3.03z" />
              </svg>
            </a>
          </div>
        </div>

        {/* App Screenshots */}
        <div className="mt-16 relative">
          {/* Desktop Screenshot */}
          <div className="relative z-10 rounded-xl shadow-2xl overflow-hidden bg-[#1B2131] p-4">
            <img 
              src="/Dashboardexample.png" 
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
                <div className="flex space-x-4">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="material-icons">facebook</span>
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="material-icons">twitter</span>
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="material-icons">instagram</span>
                  </a>
                </div>
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
  );
}

export default Home;