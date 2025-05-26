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
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Professional Collection Management
          </div>
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Unlock Premium
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Collection Features
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            {isNewUser ? 
              "Welcome! Choose your plan to start tracking your collection with advanced features." :
              "Upgrade to premium for advanced analytics, cloud sync, and unlimited tracking."
            }
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Direct subscription buttons for immediate visibility */}
          {currentUser && (
            <div className="text-center mb-12">
              <a
                href={`https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser?.uid || ''}&prefilled_email=${currentUser?.email || ''}`}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                Subscribe to Premium - $12.99/month
              </a>
              <p className="text-gray-400 mt-3 text-sm">Secure payment processed by Stripe</p>
            </div>
          )}
          
          {/* Premium Plan Card */}
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 group">
              {/* Best Value Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full font-bold text-sm">
                  BEST VALUE
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Premium</h2>
                <div className="flex items-baseline justify-center mb-6">
                  <span className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">$12.99</span>
                  <span className="text-xl text-gray-400 ml-2">/month</span>
                </div>
                <p className="text-gray-300 text-lg">For serious collectors who want advanced features</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  'Track unlimited cards',
                  'Advanced analytics',
                  'Unlimited collections',
                  'Automatic cloud backup',
                  'Sync across all devices',
                  'Priority customer support'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-black text-xs">✓</span>
                    </div>
                    <span className="text-gray-200">{feature}</span>
                  </div>
                ))}
              </div>
              
              {currentUser ? (
                <a
                  href={`https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser?.uid || ''}&prefilled_email=${currentUser?.email || ''}`}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 text-center block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Subscribe Now
                </a>
              ) : (
                <Link 
                  to="/login" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 text-center block"
                >
                  Sign Up to Subscribe
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cloud Backup Benefits Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Why Choose 
              <span className="block text-blue-400">Cloud Backup?</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Professional tools for serious collectors and investors
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: '🔒',
                title: 'Data Security',
                description: 'Your collection data is securely stored in the cloud, protected against device loss or damage.'
              },
              {
                icon: '📱',
                title: 'Multi-Device Access',
                description: 'Access and manage your collection from any device, anywhere - your phone, tablet, or computer.'
              },
              {
                icon: '🔄',
                title: 'Automatic Sync',
                description: 'Changes automatically sync across all your devices, keeping your collection up-to-date everywhere.'
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                question: 'Can I cancel my subscription anytime?',
                answer: "Yes, you can cancel your subscription at any time. You'll continue to have premium access until the end of your billing period."
              },
              {
                question: 'What happens to my data if I cancel?',
                answer: 'Your cloud data will remain stored for 30 days after cancellation. You can download a local backup before canceling to keep your data.'
              },
              {
                question: 'How often is data synced to the cloud?',
                answer: 'Data is synced whenever you make changes and manually trigger a backup, ensuring your collection is always up-to-date.'
              },
              {
                question: 'Is my data secure?',
                answer: 'We use industry-standard encryption and security practices to protect your collection data in the cloud.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to enhance your collection experience?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Join thousands of collectors optimizing their collectible investments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            {currentUser ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
                >
                  Sign In
                </Link>
                <Link 
                  to="/login?signup=true" 
                  className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
                >
                  Sign Up Now
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-xl font-bold mb-4">Collectibles Tracker</h3>
              <p className="text-gray-400 text-sm mb-6">
                Australia's most trusted platform for collectible management and trading.
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
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help-center" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/collecting-guide" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Collecting Guide</Link></li>
                <li><Link to="/grading-integration" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Grading Integration</Link></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/about" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              {new Date().getFullYear()} Collectibles Tracker. Made with ❤️ for collectors worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Pricing; 