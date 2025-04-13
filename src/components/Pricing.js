import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';

function Pricing() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus, isLoading: isLoadingSubscription } = useSubscription();
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const pricingTableRef = useRef(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Load Stripe pricing table script
  useEffect(() => {
    // Only try to load if not already loaded
    if (!stripeLoaded && !document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      try {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/pricing-table.js';
        script.async = true;
        script.onload = () => {
          console.log('Stripe pricing table script loaded');
          setStripeLoaded(true);
        };
        script.onerror = () => {
          console.error('Failed to load Stripe pricing table script');
          setTableError(true);
        };
        document.body.appendChild(script);

        return () => {
          // Cleanup if needed
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {
        console.error('Error loading Stripe script:', error);
        setTableError(true);
      }
    } else if (document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]') && !stripeLoaded) {
      // Script exists but state doesn't reflect it
      setStripeLoaded(true);
    }
  }, [stripeLoaded]);

  // Add page-no-padding class to body when component mounts
  useEffect(() => {
    document.body.classList.add('page-no-padding');
    
    // Clean up function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('page-no-padding');
    };
  }, []);

  // Redirect if user already has an active subscription
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      toast.success('You already have an active subscription!');
      navigate('/dashboard');
    }
  }, [subscriptionStatus, isLoadingSubscription, navigate]);

  // Check if user was redirected from registration or NewUserRoute
  useEffect(() => {
    // Only set this flag once
    if (!isNewUser) {
      const params = new URLSearchParams(location.search);
      if (params.has('new') || location.state?.isNewUser) {
        setIsNewUser(true);
        
        // Clear the state from the location to prevent infinite loops
        if (location.state?.isNewUser) {
          window.history.replaceState({}, '', location.pathname);
        }
      }
    }
  }, [location, isNewUser]);

  // Add error handling for Stripe pricing table
  const [tableError, setTableError] = useState(false);
  
  // Handle errors in loading the pricing table
  useEffect(() => {
    if (stripeLoaded && pricingTableRef.current) {
      // Give Stripe time to load the table
      const timeoutId = setTimeout(() => {
        // Check if the pricing table exists
        const pricingTable = pricingTableRef.current.querySelector('stripe-pricing-table');
        if (!pricingTable || !pricingTable.shadowRoot) {
          console.error('Stripe pricing table failed to load properly');
          setTableError(true);
        }
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [stripeLoaded]);
  
  // Function to retry loading the pricing table
  const retryLoadPricingTable = () => {
    setTableError(false);
    setStripeLoaded(false);
    
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      script.onload = () => setStripeLoaded(true);
      document.body.appendChild(script);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500 text-gray-900 dark:text-white page-no-padding">
      <NavigationBar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 pt-28">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold mb-8 text-white">
            Choose Your Plan
          </h1>
          <p className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto text-gray-100">
            Unlock premium features to enhance your Pokemon card collection management
          </p>
        </div>
        
        {/* Direct subscription buttons for immediate visibility */}
        {currentUser && (
          <div className="text-center mb-8">
            <a
              href={`https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser?.uid || ''}&prefilled_email=${currentUser?.email || ''}`}
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 px-8 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl inline-block"
              target="_blank"
              rel="noopener noreferrer"
            >
              Subscribe to Premium - $12.99/month
            </a>
            <p className="text-white mt-2 text-sm">Secure payment processed by Stripe</p>
          </div>
        )}
        
        {/* Subscription Plans */}
        <div className="flex flex-col md:flex-row max-w-6xl mx-auto gap-8 mb-16">
          {/* Premium Tier */}
          <div className="w-full bg-white/10 backdrop-blur-sm border-2 border-yellow-400/50 rounded-3xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl relative">
            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-lg font-bold">
              BEST VALUE
            </div>
            <div className="p-8 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Premium</h2>
                <div className="flex items-baseline mb-6">
                  <span className="text-5xl font-extrabold text-white">$12.99</span>
                  <span className="text-xl text-gray-200 ml-2">/month</span>
                </div>
                <p className="text-gray-200 mb-6">For serious collectors who want advanced features</p>
                <hr className="border-white/20 mb-6" />
              </div>
              
              <div className="space-y-4 flex-grow mb-8">
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Track unlimited cards</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Advanced analytics</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Unlimited collections</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100 font-bold">Automatic cloud backup</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100 font-bold">Sync across all your devices</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-green-400 mr-2">check_circle</span>
                  <span className="text-gray-100">Priority customer support</span>
                </div>
              </div>
              
              {currentUser ? (
                <a
                  href={`https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser?.uid || ''}&prefilled_email=${currentUser?.email || ''}`}
                  className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Subscribe Now
                </a>
              ) : (
                <Link 
                  to="/login" 
                  className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center"
                >
                  Sign Up to Subscribe
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Cloud Backup Benefits Section */}
        <div className="max-w-5xl mx-auto mt-20">
          <h2 className="text-3xl font-bold mb-12 text-white text-center">Why Choose Cloud Backup?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center text-center">
              <div className="bg-purple-500/30 p-3 rounded-full mb-4">
                <span className="material-icons text-white text-3xl">security</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Data Security</h3>
              <p className="text-gray-200">Your collection data is securely stored in the cloud, protected against device loss or damage.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center text-center">
              <div className="bg-purple-500/30 p-3 rounded-full mb-4">
                <span className="material-icons text-white text-3xl">devices</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Multi-Device Access</h3>
              <p className="text-gray-200">Access and manage your collection from any device, anywhere - your phone, tablet, or computer.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center text-center">
              <div className="bg-purple-500/30 p-3 rounded-full mb-4">
                <span className="material-icons text-white text-3xl">auto_awesome</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Automatic Sync</h3>
              <p className="text-gray-200">Changes automatically sync across all your devices, keeping your collection up-to-date everywhere.</p>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">Can I cancel my subscription anytime?</h3>
              <p className="text-gray-200">Yes, you can cancel your subscription at any time. You'll continue to have premium access until the end of your billing period.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">What happens to my data if I cancel?</h3>
              <p className="text-gray-200">Your cloud data will remain stored for 30 days after cancellation. You can download a local backup before canceling to keep your data.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">How often is data synced to the cloud?</h3>
              <p className="text-gray-200">Data is synced whenever you make changes and manually trigger a backup, ensuring your collection is always up-to-date.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-white">Is my data secure?</h3>
              <p className="text-gray-200">We use industry-standard encryption and security practices to protect your collection data in the cloud.</p>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to enhance your collection experience?</h2>
          <p className="text-xl mb-8 text-gray-200">Join thousands of collectors optimizing their Pokémon card investments.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {currentUser ? (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-marketing-primary"
                >
                  <span className="material-icons">dashboard</span>
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="btn-marketing-primary"
                >
                  <span className="material-icons">login</span>
                  Sign In
                </Link>
                <Link 
                  to="/login?signup=true" 
                  className="btn-marketing-secondary"
                >
                  <span className="material-icons">person_add</span>
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing; 