import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { Link } from 'react-router-dom';

function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const openModal = (imageSrc, title, description) => {
    setModalImage({ src: imageSrc, title, description });
  };

  const closeModal = () => {
    setModalImage(null);
  };

  if (currentUser) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>MyCardTracker | Track, Value & Trade Trading Cards</title>
        <meta name="description" content="Australia's #1 trading card tracker. Manage your collection, track graded cards, monitor investments, and trade in our secure marketplace. Free to start!" />
        <meta name="keywords" content="track graded trading cards, card price tracker, card value tracker, card investment calculator, tcg collection manager, card grading tracker, card market prices australia, vintage card tracker, card portfolio tracker, card condition tracker, card rarity guide, card set completion tracker" />
        <meta property="og:title" content="MyCardTracker | Track, Value & Trade Trading Cards" />
        <meta property="og:description" content="Australia's #1 trading card tracker. Manage your collection, track graded cards, monitor investments, and trade in our secure marketplace. Free to start!" />
        <meta property="og:url" content="https://www.mycardtracker.com.au" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.mycardtracker.com.au" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.mycardtracker.com.au/#organization",
                "name": "MyCardTracker",
                "alternateName": "My Card Tracker",
                "url": "https://www.mycardtracker.com.au",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.mycardtracker.com.au/logo192.png"
                },
                "description": "Australia's premier trading card tracking and marketplace platform",
                "areaServed": "Australia",
                "serviceType": "Digital Platform"
              },
              {
                "@type": "WebSite",
                "@id": "https://www.mycardtracker.com.au/#website",
                "url": "https://www.mycardtracker.com.au",
                "name": "MyCardTracker",
                "description": "Track, value, and trade trading cards with Australia's #1 card tracker",
                "publisher": {
                  "@id": "https://www.mycardtracker.com.au/#organization"
                },
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://www.mycardtracker.com.au/search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "SoftwareApplication",
                "name": "MyCardTracker",
                "applicationCategory": "CollectionManagement",
                "operatingSystem": "Web Browser",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "AUD",
                  "description": "Free tier with 50 cards, premium plans available"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "reviewCount": "150"
                },
                "featureList": [
                  "Trading card collection tracking",
                  "Graded card integration",
                  "Investment analytics",
                  "Secure marketplace",
                  "Price monitoring"
                ]
              }
            ]
          })}
        </script>
      </Helmet>
      <NavigationBar />
      
      {/* Modal for enlarged images */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="relative max-w-4xl max-h-[60vh] w-full">
            <button 
              onClick={closeModal}
              className="absolute -top-12 right-0 text-white/70 hover:text-white text-2xl font-bold z-10"
            >
              ✕
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
              <img 
                src={modalImage.src} 
                alt={modalImage.title}
                className="w-full h-auto max-h-[40vh] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="mt-4 text-center">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{modalImage.title}</h3>
                <p className="text-gray-300">{modalImage.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-16 sm:pt-20 md:pt-24 lg:pt-28">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 mt-8 sm:mt-12 md:mt-16 lg:mt-20">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Australia's #1 Collectibles Platform
          </div>
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            Track, Value & Trade
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your Trading Cards
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
            The ultimate platform for serious collectors. Track your collection, 
            monitor investments, and trade with verified collectors.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
            <button 
              onClick={() => navigate('/login')}
              className="w-full max-w-xs sm:max-w-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
            >
              Get Started
            </button>
            <button 
              onClick={() => navigate('/pricing')}
              className="w-full max-w-xs sm:max-w-sm bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg border border-white/20 hover:border-white/30 transition-all duration-300"
            >
              View Pricing
            </button>
          </div>
          
          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-400 px-4">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-bold text-blue-400">10K+</span>
              <span>Items Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-bold text-purple-400">500+</span>
              <span>Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-bold text-pink-400">1K+</span>
              <span>Marketplace Listings</span>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-5 h-8 sm:w-6 sm:h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-0.5 h-2 sm:w-1 sm:h-3 bg-white/50 rounded-full mt-1.5 sm:mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              See it in action
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-4">
              Real screenshots from the Collectibles Tracker platform
            </p>
          </div>

          {/* Main Screenshots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center mb-16">
            {/* Desktop Screenshot */}
            <div className="relative group order-2 lg:order-1">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <button 
                  onClick={() => openModal('/screenshots/dashboard.png', 'Desktop Dashboard', 'Complete collection overview with advanced analytics and real-time valuations')}
                  className="w-full cursor-pointer"
                >
                  <img 
                    src="/screenshots/dashboard.png" 
                    alt="Desktop Dashboard" 
                    className="w-full rounded-xl sm:rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300"
                  />
                </button>
                <div className="mt-4 sm:mt-6 text-center">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Desktop Dashboard</h3>
                  <p className="text-sm sm:text-base text-gray-400">Complete collection overview with advanced analytics</p>
                </div>
              </div>
            </div>

            {/* Mobile Screenshot */}
            <div className="relative group order-1 lg:order-2">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl sm:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <button 
                  onClick={() => openModal('/screenshots/phonemockup.png', 'Mobile Experience', 'Track your collection anywhere with our mobile-optimized interface')}
                  className="w-full cursor-pointer"
                >
                  <img 
                    src="/screenshots/phonemockup.png" 
                    alt="Mobile App" 
                    className="w-full max-w-xs sm:max-w-sm mx-auto rounded-xl sm:rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300"
                  />
                </button>
                <div className="mt-4 sm:mt-6 text-center">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">Mobile Experience</h3>
                  <p className="text-sm sm:text-base text-gray-400">Track your collection anywhere, anytime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Everything you need in one platform section */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Everything you need in
              <span className="block text-blue-400">one platform</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-4">
              Professional tools for serious collectors and investors
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
            {[
              { icon: '📊', title: 'Portfolio Tracking', desc: 'Monitor your collection value in real-time' },
              { icon: '🏪', title: 'Marketplace', desc: 'Buy and sell with verified collectors' },
              { icon: '🔍', title: 'Price Discovery', desc: 'Get accurate valuations instantly' },
              { icon: '📱', title: 'Mobile Ready', desc: 'Access your collection anywhere' },
              { icon: '🔒', title: 'Secure Trading', desc: 'Safe transactions with escrow protection' },
              { icon: '📈', title: 'Investment Analytics', desc: 'Track performance and trends' }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature Screenshots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                src: '/screenshots/addcards.png',
                title: 'Add Items',
                description: 'Easy collection management with bulk import and grading integration'
              },
              {
                src: '/screenshots/marketplace.png',
                title: 'Marketplace',
                description: 'Buy and sell with verified collectors in a secure environment'
              },
              {
                src: '/screenshots/invoicepaeg.png',
                title: 'Invoices',
                description: 'Professional invoice management and transaction tracking'
              },
              {
                src: '/screenshots/marketplacemessages.png',
                title: 'Messages',
                description: 'Secure communication with buyers and sellers'
              }
            ].map((feature, index) => (
              <div key={index} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur group-hover:blur-lg transition-all duration-300"></div>
                <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <button 
                    onClick={() => openModal(feature.src, feature.title, feature.description)}
                    className="w-full cursor-pointer"
                  >
                    <div className="aspect-square bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl mb-4 overflow-hidden">
                      <img 
                        src={feature.src} 
                        alt={feature.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  </button>
                  <h3 className="font-semibold mb-2 text-center">{feature.title}</h3>
                  <p className="text-xs text-gray-400 text-center leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Trusted by collectors
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of collecting enthusiasts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-icons">star</span>
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "I was able to sell my rare collectible for a great price thanks to the marketplace. The grading integration made it easy to price my item accurately."
              </p>
              <div className="font-semibold">Marcus, Sydney</div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-icons">star</span>
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "I've been using Collectibles Tracker for a few months now and it's been a game changer for my collection. The investment tracking features are incredibly useful."
              </p>
              <div className="font-semibold">Sarah, Melbourne</div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-icons">star</span>
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "I was blown away by the ease of use and features of Collectibles Tracker. It's the perfect platform for any serious collector."
              </p>
              <div className="font-semibold">James, Brisbane</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Unlock the full potential of MyCardTracker
          </h2>
          <p className="text-xl text-gray-300 mb-16">
            Get access to all features and tools for a low monthly fee
          </p>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 max-w-md mx-auto">
            <div className="text-6xl font-bold mb-4">
              <span className="text-4xl text-gray-400">$</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">12.99</span>
            </div>
            <div className="text-gray-400 mb-8">per month</div>
            
            <ul className="space-y-4 text-left mb-12">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-green-400 text-sm">check</span>
                </span>
                <span>Unlimited item tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-green-400 text-sm">check</span>
                </span>
                <span>Grading integration</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-green-400 text-sm">check</span>
                </span>
                <span>Marketplace access</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-green-400 text-sm">check</span>
                </span>
                <span>Investment analytics</span>
              </li>
            </ul>

            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;