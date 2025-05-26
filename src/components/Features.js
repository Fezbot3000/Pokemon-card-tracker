import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'collection-management',
      title: 'Advanced Collection Management',
      subtitle: 'Organize and track your entire collection',
      icon: '📦',
      description: 'Add, organize, and track your Pokemon cards with detailed information, condition tracking, and powerful search capabilities.',
      benefits: [
        'Easy card addition with search',
        'Condition and grade tracking',
        'Collection organization tools',
        'Advanced filtering options',
        'Card value tracking',
        'Collection statistics'
      ],
      image: '/screenshots/addcards.png',
      details: `
        Manage your Pokemon card collection with professional tools designed for serious collectors. Add cards quickly, track conditions, and organize your collection efficiently.

        **Key Features:**
        - Quick card search and addition
        - Condition grading (1-10 scale)
        - Collection value tracking
        - Advanced search and filtering
        - Card statistics and analytics
        - Collection organization by sets
        - Detailed card information
        - Photo documentation
        - Purchase price tracking
      `
    },
    {
      id: 'marketplace',
      title: 'Secure Marketplace',
      subtitle: 'Buy and sell with confidence',
      icon: '🏪',
      description: 'Connect with verified collectors worldwide in our secure marketplace with built-in protection and escrow services.',
      benefits: [
        'Verified seller profiles',
        'Secure payment processing',
        'Buyer protection guarantee',
        'Integrated messaging system',
        'Shipping tracking',
        'Dispute resolution service'
      ],
      image: '/screenshots/marketplace.png',
      details: `
        Our marketplace creates a trusted environment for collectors to buy and sell with confidence. Every transaction is protected with our comprehensive security measures.

        **Marketplace Features:**
        - Identity verification for all users
        - Secure escrow payment system
        - Comprehensive seller ratings
        - Integrated chat and messaging
        - Professional listing tools
        - Automated shipping integration
        - Insurance options for high-value items
        - Global shipping calculator
        - Multi-currency support
        - Advanced search and filtering
        - Price history and market analytics
        - Auction and fixed-price listings
      `
    },
    {
      id: 'analytics',
      title: 'Portfolio Analytics',
      subtitle: 'Track performance and value trends',
      icon: '📊',
      description: 'Professional-grade analytics to understand your collection\'s performance, market trends, and investment potential.',
      benefits: [
        'Real-time value tracking',
        'ROI calculations',
        'Market trend analysis',
        'Performance reports',
        'Price alerts',
        'Portfolio diversification insights'
      ],
      image: '/screenshots/dashboard.png',
      details: `
        Make informed decisions with comprehensive analytics that track your collection's performance over time. Our advanced algorithms provide insights that help you optimize your collecting strategy.

        **Analytics Features:**
        - Real-time market value updates
        - Historical price tracking
        - ROI and profit/loss calculations
        - Market trend analysis
        - Set performance comparisons
        - Acquisition cost tracking
        - Price alert notifications
        - Custom reporting tools
        - Export capabilities for tax purposes
        - Portfolio diversification analysis
        - Predictive market insights
        - Comparative market analysis
      `
    },
    {
      id: 'cloud-sync',
      title: 'Cloud Backup & Sync',
      subtitle: 'Never lose your data',
      icon: '☁️',
      description: 'Automatic cloud synchronization ensures your collection data is always safe, backed up, and accessible from any device.',
      benefits: [
        'Automatic cloud backup',
        'Multi-device synchronization',
        'Version history',
        'Offline access',
        'Data export options',
        '99.9% uptime guarantee'
      ],
      image: '/screenshots/dashboard.png',
      details: `
        Your collection data is precious. Our enterprise-grade cloud infrastructure ensures it's always protected and accessible when you need it.

        **Cloud Features:**
        - Real-time synchronization across devices
        - Automatic incremental backups
        - 30-day version history
        - Offline mode with sync when connected
        - Multiple export formats
        - Enterprise-grade security
        - Redundant data centers
        - 99.9% uptime SLA
        - GDPR compliant data handling
      `
    },
    {
      id: 'mobile-app',
      title: 'Mobile Application',
      subtitle: 'Manage on the go',
      icon: '📱',
      description: 'Full-featured mobile app with barcode scanning, photo capture, and offline capabilities for managing your collection anywhere.',
      benefits: [
        'Barcode scanning',
        'High-quality photo capture',
        'Offline functionality',
        'Push notifications',
        'Touch-optimized interface',
        'Location-based features'
      ],
      image: '/screenshots/phonemockup.png',
      details: `
        Our mobile app brings the full power of Collectibles Tracker to your smartphone and tablet. Perfect for card shows, shops, and on-the-go collection management.

        **Mobile Features:**
        - Advanced barcode and QR code scanning
        - Professional photo capture with auto-cropping
        - Offline mode for areas with poor connectivity
        - Push notifications for important updates
        - Touch-optimized interface design
        - GPS location tracking for purchases
        - Voice notes and dictation
        - Quick add functionality
        - Batch photo upload
        - Mobile-exclusive features
        - Apple Watch and Android Wear support
        - Augmented reality card recognition
      `
    },
    {
      id: 'invoicing',
      title: 'Professional Invoicing',
      subtitle: 'Streamline your sales',
      icon: '📄',
      description: 'Create professional invoices, track payments, and manage your selling business with integrated accounting features.',
      benefits: [
        'Custom invoice templates',
        'Automated payment tracking',
        'Tax calculation',
        'Client management',
        'Payment reminders',
        'Financial reporting'
      ],
      image: '/screenshots/invoicepaeg.png',
      details: `
        Transform your collecting hobby into a professional business with our comprehensive invoicing and payment tracking system.

        **Invoicing Features:**
        - Professional invoice templates
        - Automated payment tracking
        - Multi-currency support
        - Tax calculation and reporting
        - Client database management
        - Payment reminder automation
        - Financial reporting and analytics
        - Integration with popular payment processors
        - Expense tracking
        - Profit/loss reporting
        - Export to accounting software
        - Custom branding options
      `
    }
  ];

  const additionalFeatures = [
    {
      title: 'Advanced Search',
      description: 'Find any card instantly with powerful search filters',
      icon: '🔍'
    },
    {
      title: 'Price Tracking',
      description: 'Monitor market values and price trends over time',
      icon: '💰'
    },
    {
      title: 'Grading Integration',
      description: 'Connect with PSA, BGS, and other grading services',
      icon: '🏆'
    },
    {
      title: 'Insurance Documentation',
      description: 'Generate reports for insurance and tax purposes',
      icon: '🛡️'
    },
    {
      title: 'Community Features',
      description: 'Connect with other collectors and share collections',
      icon: '👥'
    },
    {
      title: 'API Access',
      description: 'Integrate with other tools and services',
      icon: '🔌'
    },
    {
      title: 'Custom Reports',
      description: 'Generate detailed reports for any purpose',
      icon: '📈'
    },
    {
      title: 'Multi-Language Support',
      description: 'Available in multiple languages worldwide',
      icon: '🌍'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Professional Collection Tools
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Powerful Features
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              for Serious Collectors
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Everything you need to manage, track, and grow your collection with professional-grade tools and analytics
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link 
              to="/login?signup=true" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
            >
              Get Started
            </Link>
            <Link 
              to="/help-center" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Core Features
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for collectibles management
            </p>
          </div>

          {/* Feature Navigation */}
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeFeature === index
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="mr-2">{feature.icon}</span>
                {feature.title}
              </button>
            ))}
          </div>

          {/* Active Feature Display */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-4xl mb-4">{features[activeFeature].icon}</div>
                <h3 className="text-3xl font-bold mb-2">{features[activeFeature].title}</h3>
                <p className="text-xl text-blue-400 mb-4">{features[activeFeature].subtitle}</p>
                <p className="text-gray-300 mb-6 leading-relaxed">{features[activeFeature].description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {features[activeFeature].benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-black text-xs">✓</span>
                      </div>
                      <span className="text-gray-200">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="prose prose-invert max-w-none text-sm">
                  {features[activeFeature].details.split('\n').map((line, index) => {
                    if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                      return <h4 key={index} className="text-lg font-bold text-blue-400 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                    } else if (line.trim().startsWith('- ')) {
                      return <li key={index} className="text-gray-300 ml-4 mb-1">{line.substring(2)}</li>;
                    } else if (line.trim()) {
                      return <p key={index} className="text-gray-300 mb-3 leading-relaxed">{line}</p>;
                    }
                    return null;
                  })}
                </div>
              </div>
              
              <div className="relative">
                <div className={`${features[activeFeature].id === 'mobile-app' ? 'aspect-[9/16]' : 'aspect-square'} bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl overflow-hidden`}>
                  <img 
                    src={features[activeFeature].image} 
                    alt={features[activeFeature].title}
                    className={`w-full h-full ${features[activeFeature].id === 'mobile-app' ? 'object-contain' : 'object-cover'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Additional Features
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Even more tools to enhance your collecting experience
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Transform Your Collection?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Join thousands of collectors who trust Collectibles Tracker to manage their valuable collections.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link 
              to="/login?signup=true" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
            >
              Get Started
            </Link>
            <Link 
              to="/help-center" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
