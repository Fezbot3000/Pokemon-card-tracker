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
      description:
        'Add, organize, and track your Pokemon cards with detailed information, condition tracking, and powerful search capabilities.',
      benefits: [
        'Easy card addition with search',
        'Condition and grade tracking',
        'Collection organization tools',
        'Advanced filtering options',
        'Card value tracking',
        'Collection statistics',
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
      `,
    },
    {
      id: 'marketplace',
      title: 'Secure Marketplace',
      subtitle: 'Buy and sell with confidence',
      icon: '🏪',
      description:
        'Connect with verified collectors worldwide in our secure marketplace with built-in protection and escrow services.',
      benefits: [
        'Verified seller profiles',
        'Secure payment processing',
        'Buyer protection guarantee',
        'Integrated messaging system',
        'Shipping tracking',
        'Dispute resolution service',
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
      `,
    },
    {
      id: 'analytics',
      title: 'Portfolio Analytics',
      subtitle: 'Track performance and value trends',
      icon: '📊',
      description:
        "Professional-grade analytics to understand your collection's performance, market trends, and investment potential.",
      benefits: [
        'Real-time value tracking',
        'ROI calculations',
        'Market trend analysis',
        'Performance reports',
        'Price alerts',
        'Portfolio diversification insights',
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
      `,
    },
    {
      id: 'cloud-sync',
      title: 'Cloud Backup & Sync',
      subtitle: 'Never lose your data',
      icon: '☁️',
      description:
        'Automatic cloud synchronization ensures your collection data is always safe, backed up, and accessible from any device.',
      benefits: [
        'Automatic cloud backup',
        'Multi-device synchronization',
        'Version history',
        'Offline access',
        'Data export options',
        '99.9% uptime guarantee',
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
      `,
    },
    {
      id: 'mobile-app',
      title: 'Mobile Application',
      subtitle: 'Manage on the go',
      icon: '📱',
      description:
        'Full-featured mobile app with barcode scanning, photo capture, and offline capabilities for managing your collection anywhere.',
      benefits: [
        'Barcode scanning',
        'High-quality photo capture',
        'Offline functionality',
        'Push notifications',
        'Touch-optimized interface',
        'Location-based features',
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
      `,
    },
    {
      id: 'invoicing',
      title: 'Professional Invoicing',
      subtitle: 'Streamline your sales',
      icon: '📄',
      description:
        'Create professional invoices, track payments, and manage your selling business with integrated accounting features.',
      benefits: [
        'Custom invoice templates',
        'Automated payment tracking',
        'Tax calculation',
        'Client management',
        'Payment reminders',
        'Financial reporting',
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
      `,
    },
  ];

  const additionalFeatures = [
    {
      title: 'Advanced Search',
      description: 'Find any card instantly with powerful search filters',
      icon: '🔍',
    },
    {
      title: 'Price Tracking',
      description: 'Monitor market values and price trends over time',
      icon: '💰',
    },
    {
      title: 'Grading Integration',
      description: 'Connect with PSA, BGS, and other grading services',
      icon: '🏆',
    },
    {
      title: 'Insurance Documentation',
      description: 'Generate reports for insurance and tax purposes',
      icon: '🛡️',
    },
    {
      title: 'Community Features',
      description: 'Connect with other collectors and share collections',
      icon: '👥',
    },
    {
      title: 'API Access',
      description: 'Integrate with other tools and services',
      icon: '🔌',
    },
    {
      title: 'Custom Reports',
      description: 'Generate detailed reports for any purpose',
      icon: '📈',
    },
    {
      title: 'Multi-Language Support',
      description: 'Available in multiple languages worldwide',
      icon: '🌍',
    },
  ];

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-purple-500/5 blur-3xl"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Professional Collection Tools
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Powerful Features
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              for Serious Collectors
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Everything you need to manage, track, and grow your collection with
            professional-grade tools and analytics
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              to="/login?signup=true"
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-center text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              to="/help-center"
              className="bg-white/10 border-white/20 hover:bg-white/20 w-full rounded-2xl border px-8 py-4 text-center text-lg font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 sm:w-auto"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
              Core Features
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              Comprehensive tools designed specifically for collectibles
              management
            </p>
          </div>

          {/* Feature Navigation */}
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  activeFeature === index
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-white/10 border-white/20 hover:bg-white/20 border text-gray-300 backdrop-blur-sm'
                }`}
              >
                <span className="mr-2">{feature.icon}</span>
                {feature.title}
              </button>
            ))}
          </div>

          {/* Active Feature Display */}
          <div className="from-white/10 to-white/5 border-white/10 rounded-3xl border bg-gradient-to-br p-8 backdrop-blur-sm">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-4 text-4xl">
                  {features[activeFeature].icon}
                </div>
                <h3 className="mb-2 text-3xl font-bold">
                  {features[activeFeature].title}
                </h3>
                <p className="mb-4 text-xl text-blue-400">
                  {features[activeFeature].subtitle}
                </p>
                <p className="mb-6 leading-relaxed text-gray-300">
                  {features[activeFeature].description}
                </p>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {features[activeFeature].benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center">
                      <div className="mr-3 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-400">
                        <span className="text-xs text-black">✓</span>
                      </div>
                      <span className="text-gray-200">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="prose prose-invert max-w-none text-sm">
                  {features[activeFeature].details
                    .split('\n')
                    .map((line, index) => {
                      if (
                        line.trim().startsWith('**') &&
                        line.trim().endsWith('**')
                      ) {
                        return (
                          <h4
                            key={index}
                            className="mb-2 mt-4 text-lg font-bold text-blue-400"
                          >
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        );
                      } else if (line.trim().startsWith('- ')) {
                        return (
                          <li key={index} className="mb-1 ml-4 text-gray-300">
                            {line.substring(2)}
                          </li>
                        );
                      } else if (line.trim()) {
                        return (
                          <p
                            key={index}
                            className="mb-3 leading-relaxed text-gray-300"
                          >
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                </div>
              </div>

              <div className="relative">
                <div
                  className={`${features[activeFeature].id === 'mobile-app' ? 'aspect-[9/16]' : 'aspect-square'} from-gray-800/50 to-gray-900/50 overflow-hidden rounded-2xl bg-gradient-to-br`}
                >
                  <img
                    src={features[activeFeature].image}
                    alt={features[activeFeature].title}
                    className={`size-full ${features[activeFeature].id === 'mobile-app' ? 'object-contain' : 'object-cover'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
              Additional Features
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              Even more tools to enhance your collecting experience
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {additionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="from-white/10 to-white/5 border-white/10 hover:border-white/20 group rounded-2xl border bg-gradient-to-br p-6 text-center backdrop-blur-sm transition-all duration-300"
              >
                <div className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
            Ready to Transform Your Collection?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:mb-12 sm:text-lg md:text-xl">
            Join thousands of collectors who trust Collectibles Tracker to
            manage their valuable collections.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              to="/login?signup=true"
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-center text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              to="/help-center"
              className="bg-white/10 border-white/20 hover:bg-white/20 w-full rounded-2xl border px-8 py-4 text-center text-lg font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 sm:w-auto"
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
