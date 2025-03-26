import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500 text-gray-900 dark:text-white page-no-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-8 text-white">
            Pokémon Card Tracker
          </h1>
          <p className="text-xl sm:text-2xl mb-12 text-gray-100">
            Track, manage, and analyze your Pokémon card collection with ease.
            Get real-time values and insights for your investments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {currentUser ? (
              <Link 
                to="/dashboard" 
                className="btn bg-white text-gray-900 hover:bg-gray-50 text-lg px-8 py-4 inline-flex items-center gap-2 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <span className="material-icons">dashboard</span>
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="btn bg-blue-600 text-white hover:bg-blue-700 text-lg px-8 py-4 inline-flex items-center gap-2 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <span className="material-icons">login</span>
                  Login / Sign Up
                </Link>
                <Link 
                  to="/pricing" 
                  className="btn bg-green-600 text-white hover:bg-green-700 text-lg px-8 py-4 inline-flex items-center gap-2 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <span className="material-icons">sell</span>
                  View Pricing
                </Link>
              </>
            )}
          </div>
        </div>

        {/* App Screenshots */}
        <div className="mt-16 relative">
          {/* Desktop Screenshot */}
          <div className="relative z-10 rounded-xl shadow-2xl overflow-hidden bg-[#1B2131] p-4">
            <img 
              src="/Dashboardexample.png" 
              alt="Pokemon Card Tracker Dashboard"
              className="w-full rounded-lg"
            />
          </div>
          
          {/* Mobile Screenshot - Positioned to overlap */}
          <div className="absolute -bottom-20 right-0 md:right-[10%] w-48 z-20 rounded-xl shadow-2xl overflow-hidden bg-[#1B2131] p-2">
            <img 
              src="/mobileexample.png" 
              alt="Pokemon Card Tracker Mobile View"
              className="w-full rounded-lg"
            />
          </div>
        </div>
        
        {/* Features Section - Moved below screenshots */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="material-icons text-4xl text-white mb-4">
              track_changes
            </span>
            <h3 className="text-xl font-semibold mb-2 text-white">Track Your Collection</h3>
            <p className="text-gray-100">
              Keep detailed records of your cards, including purchase prices, current values, and condition ratings.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="material-icons text-4xl text-white mb-4">
              trending_up
            </span>
            <h3 className="text-xl font-semibold mb-2 text-white">Monitor Performance</h3>
            <p className="text-gray-100">
              Watch your investment grow with real-time value tracking and profit/loss calculations.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="material-icons text-4xl text-white mb-4">
              insights
            </span>
            <h3 className="text-xl font-semibold mb-2 text-white">Gain Insights</h3>
            <p className="text-gray-100">
              Get detailed analytics and insights about your collection's performance and market trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 