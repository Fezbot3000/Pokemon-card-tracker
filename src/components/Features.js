import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'collection-management',
      title: 'Collection Management',
      subtitle: 'Organize and track your entire collection',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <svg className="size-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
      description:
        'Add, organize, and track your Pokemon cards with detailed information, condition tracking, and search capabilities.',
      benefits: [
        'Easy card addition',
        'Condition and grade tracking',
        'Collection organization tools',
        'Filtering and search options',
        'Card value tracking',
        'Collection statistics',
      ],
      image: '/screenshots/addcards.png',
      details: `
        Manage your Pokemon card collection with tools designed for collectors. Add cards, track conditions, and organize your collection efficiently.

        **Key Features:**
        - Card search and addition
        - Condition grading (1-10 scale)
        - Collection value tracking
        - Search and filtering
        - Basic statistics
        - Collection organization by sets
        - Card information storage
        - Photo documentation
        - Purchase price tracking
      `,
    },
    {
      id: 'marketplace',
      title: 'Marketplace',
      subtitle: 'Buy and sell cards',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <svg className="size-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      ),
      description:
        'Connect with other collectors to buy and sell cards through our marketplace with integrated messaging.',
      benefits: [
        'Create card listings',
        'Browse available cards',
        'Integrated messaging system',
        'Multi-currency display',
        'Search and filtering',
        'User profiles',
      ],
      image: '/screenshots/marketplace.png',
      details: `
        Our marketplace allows collectors to list cards for sale and browse available items from other users.

        **Marketplace Features:**
        - Create and manage listings
        - Browse cards from other collectors
        - Integrated chat and messaging
        - Multi-currency price display
        - Search and filtering options
        - User profiles and seller information
        - Mark items as sold or pending
        - Location-based filtering
      `,
    },
    {
      id: 'analytics',
      title: 'Collection Statistics',
      subtitle: 'Track your collection performance',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
          <svg className="size-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      ),
      description:
        "View basic statistics about your collection's value and track profit/loss on your investments.",
      benefits: [
        'Investment vs value tracking',
        'Profit/loss calculations',
        'Collection totals',
        'Card count statistics',
        'Sold items tracking',
        'Basic financial reports',
      ],
      image: '/screenshots/dashboard.png',
      details: `
        Get insights into your collection with basic statistics and financial tracking.

        **Statistics Features:**
        - Total investment amount
        - Current collection value
        - Profit/loss calculations
        - Card count by collection
        - Sold items tracking
        - Purchase vs sale price comparison
        - Collection performance overview
        - Basic export capabilities
      `,
    },
    {
      id: 'cloud-sync',
      title: 'Cloud Backup & Sync',
      subtitle: 'Never lose your data',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <svg className="size-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
      ),
      description:
        'Automatic cloud synchronization ensures your collection data is always backed up and accessible from any device.',
      benefits: [
        'Automatic cloud backup',
        'Multi-device synchronization',
        'Real-time updates',
        'Data security',
        'Access from anywhere',
        'Firebase reliability',
      ],
      image: '/screenshots/dashboard.png',
      details: `
        Your collection data is automatically backed up and synchronized across all your devices using Firebase cloud infrastructure.

        **Cloud Features:**
        - Real-time synchronization across devices
        - Automatic data backup
        - Access from any device with internet
        - Secure cloud storage
        - Data integrity protection
        - Firebase infrastructure reliability
      `,
    },
    {
      id: 'invoicing',
      title: 'Purchase Invoices',
      subtitle: 'Track your purchases',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20">
          <svg className="size-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      ),
      description:
        'Generate basic invoices for your card purchases to help track your investments and expenses.',
      benefits: [
        'PDF invoice generation',
        'Purchase tracking',
        'Basic invoice templates',
        'Buyer information storage',
        'Invoice management',
        'Simple record keeping',
      ],
      image: '/screenshots/invoicepaeg.png',
      details: `
        Create and manage basic purchase invoices to track your card investments and maintain records.

        **Invoice Features:**
        - Generate PDF invoices
        - Track purchase information
        - Store buyer/seller details
        - Basic invoice templates
        - Invoice history and management
        - Simple expense tracking
        - Purchase date recording
        - Basic totals and calculations
      `,
    },
  ];

  const additionalFeatures = [
    {
      title: 'Search & Filtering',
      description: 'Find cards quickly with search and filter options',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <svg className="size-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Photo Storage',
      description: 'Upload and store photos of your cards',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
          <svg className="size-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Collection Sharing',
      description: 'Share your collections with other collectors',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <svg className="size-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Data Export',
      description: 'Export your collection data in various formats',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
          <svg className="size-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Responsive Design',
      description: 'Works on desktop, tablet, and mobile devices',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20">
          <svg className="size-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      ),
    },
    {
      title: 'Secure Authentication',
      description: 'Safe login with Firebase authentication',
      icon: (
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
          <svg className="size-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      ),
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
            Collection Management Tools
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Collection Features
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              for Pokemon Collectors
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Essential tools to manage, track, and organize your Pokemon card collection
            with cloud backup and marketplace features
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
              Main Features
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              Essential tools for Pokemon card collection management
            </p>
          </div>

          {/* Feature Navigation */}
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ${
                  activeFeature === index
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white/10 border border-white/20 hover:bg-white/20 text-gray-300 backdrop-blur-sm hover:border-white/30'
                }`}
              >
                <div className={`flex size-6 items-center justify-center rounded-lg ${
                  activeFeature === index 
                    ? 'bg-white/20' 
                    : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                }`}>
                  <svg className={`size-4 ${
                    activeFeature === index ? 'text-white' : 'text-blue-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {index === 0 && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    )}
                    {index === 1 && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    )}
                    {index === 2 && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    )}
                    {index === 3 && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    )}
                    {index === 4 && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    )}
                  </svg>
                </div>
                {feature.title}
              </button>
            ))}
          </div>

          {/* Active Feature Display */}
          <div className="border-white/10 rounded-3xl border bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-sm">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex justify-center">
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
                  {features[activeFeature].benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center">
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
                    .map((line) => {
                      if (
                        line.trim().startsWith('**') &&
                        line.trim().endsWith('**')
                      ) {
                        return (
                          <h4
                            key={`header-${line.replace(/\*\*/g, '').trim()}`}
                            className="mb-2 mt-4 text-lg font-bold text-blue-400"
                          >
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        );
                      } else if (line.trim().startsWith('- ')) {
                        return (
                          <li key={`list-${line.substring(2).trim()}`} className="mb-1 ml-4 text-gray-300">
                            {line.substring(2)}
                          </li>
                        );
                      } else if (line.trim()) {
                        return (
                          <p
                            key={`para-${line.trim()}`}
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
                  className={`${features[activeFeature].id === 'mobile-app' ? 'aspect-[9/16]' : 'aspect-square'} overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50`}
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
              More tools to support your collection management
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {additionalFeatures.map((feature) => (
              <div
                key={feature.title || feature.name}
                className="border-white/10 hover:border-white/20 group rounded-2xl border bg-gradient-to-br from-white/10 to-white/5 p-6 text-center backdrop-blur-sm transition-all duration-300"
              >
                <div className="mb-4 transition-transform duration-300 group-hover:scale-110 flex justify-center">
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
            Ready to Organize Your Collection?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:mb-12 sm:text-lg md:text-xl">
            Start managing your Pokemon card collection with our web-based
            tracking and marketplace tools.
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
