import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';

function Pricing() {
  // Add page-no-padding class to body when component mounts
  useEffect(() => {
    document.body.classList.add('page-no-padding');
    
    // Clean up function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('page-no-padding');
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500 text-gray-900 dark:text-white page-no-padding">
      <NavigationBar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 pt-28">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold mb-8 text-white">
            Choose Your Plan
          </h1>
          <p className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto text-gray-100">
            Select the plan that works best for your Pokémon card collection needs.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="p-8 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Free</h2>
                <div className="flex items-baseline mb-6">
                  <span className="text-5xl font-extrabold text-white">$0</span>
                  <span className="text-xl text-gray-200 ml-2">/month</span>
                </div>
                <p className="text-gray-200 mb-6">Perfect for casual collectors just getting started.</p>
                <hr className="border-white/20 mb-6" />
              </div>
              
              <div className="space-y-4 flex-grow mb-8">
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Track up to 50 cards</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Basic analytics</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Weekly price updates</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Up to 3 collections</span>
                </div>
                <div className="flex items-center opacity-50">
                  <span className="material-icons text-gray-300 mr-2">remove_circle</span>
                  <span className="text-gray-100">CSV data export</span>
                </div>
                <div className="flex items-center opacity-50">
                  <span className="material-icons text-gray-300 mr-2">remove_circle</span>
                  <span className="text-gray-100">Priority support</span>
                </div>
              </div>
              
              <Link 
                to="/login" 
                className="w-full bg-white text-gray-900 hover:bg-gray-100 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
          
          {/* Premium Tier */}
          <div className="bg-blue-600 rounded-3xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl relative">
            {/* Popular badge */}
            <div className="absolute top-0 right-0 mt-4 mr-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            
            <div className="p-8 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Premium</h2>
                <div className="flex items-baseline mb-6">
                  <span className="text-5xl font-extrabold text-white">$9.99</span>
                  <span className="text-xl text-blue-200 ml-2">/month</span>
                </div>
                <p className="text-blue-100 mb-6">For serious collectors who want advanced features.</p>
                <hr className="border-blue-400 mb-6" />
              </div>
              
              <div className="space-y-4 flex-grow mb-8">
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Unlimited cards</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Advanced analytics and insights</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Daily price updates</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Unlimited collections</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">CSV data export</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Priority support</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-yellow-300 mr-2">check_circle</span>
                  <span className="text-white">Market trends and alerts</span>
                </div>
              </div>
              
              <Link 
                to="/login" 
                className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">Can I switch between plans?</h3>
              <p className="text-gray-200">Yes, you can upgrade or downgrade your plan at any time. Your data will be preserved when upgrading.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">How accurate are the card valuations?</h3>
              <p className="text-gray-200">Our valuations are based on recent market data and are updated regularly to ensure accuracy.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">Do you offer annual subscriptions?</h3>
              <p className="text-gray-200">Yes, annual subscriptions are available with a 20% discount compared to monthly billing.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">Is my data secure?</h3>
              <p className="text-gray-200">We use industry-standard encryption and security practices to protect your collection data.</p>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to start tracking your collection?</h2>
          <p className="text-xl mb-8 text-gray-200">Join thousands of collectors optimizing their Pokémon card investments.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="btn-marketing-primary"
            >
              <span className="material-icons">dashboard</span>
              Try for Free
            </Link>
            <Link 
              to="/login" 
              className="btn-marketing-secondary"
            >
              <span className="material-icons">stars</span>
              Go Premium
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing; 