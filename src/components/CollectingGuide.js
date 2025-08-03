import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const CollectingGuide = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'card-conditions', title: 'Card Conditions', icon: '💎' },
    { id: 'grading', title: 'Grading Guide', icon: '🏆' },
    { id: 'storage', title: 'Storage & Protection', icon: '🛡️' },
    { id: 'market-trends', title: 'Market Trends', icon: '📈' },
    { id: 'authentication', title: 'Authentication', icon: '🔍' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Getting Started with Pokémon Card Collecting
            </h2>

            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                🎯 Define Your Collection Goals
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Choose your focus: specific sets, Pokémon, or eras</li>
                <li>• Set a realistic budget for your collection</li>
                <li>• Decide between vintage or modern cards</li>
                <li>• Consider long-term vs. short-term collecting</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-green-400">
                  💰 Budget Planning
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Start with lower-value cards to learn</li>
                  <li>• Allocate funds for storage and protection</li>
                  <li>• Track your spending with our tools</li>
                  <li>• Consider grading costs for valuable cards</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-purple-400">
                  📚 Research & Education
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Study price guides and market trends</li>
                  <li>• Join collecting communities</li>
                  <li>• Learn about card variations</li>
                  <li>• Understand printing processes</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'card-conditions':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Understanding Pokémon Card Conditions
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-green-400">
                  💎 Mint (M)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Perfect condition, no visible flaws
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Sharp corners</li>
                  <li>• Perfect centering</li>
                  <li>• No surface wear</li>
                  <li>• Clean edges</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-blue-400">
                  ⭐ Near Mint (NM)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Excellent condition with minor flaws
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Very minor edge wear</li>
                  <li>• Slight centering issues</li>
                  <li>• Minimal surface scratches</li>
                  <li>• Sharp corners</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-yellow-400">
                  ✨ Excellent (EX)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Good condition with noticeable wear
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Light edge wear</li>
                  <li>• Minor corner wear</li>
                  <li>• Some surface scratches</li>
                  <li>• Good overall appearance</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">Coming Soon</h2>
            <p className="text-gray-300">
              This section is under development. Check back soon for
              comprehensive guides!
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>
          Pokemon Card Collecting Guide Australia | PSA Grading & Investment
          Tips
        </title>
        <meta
          name="description"
          content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards. Expert advice for collectors."
        />
        <meta
          name="keywords"
          content="pokemon card collecting guide australia, PSA grading pokemon cards, pokemon card conditions guide, how to store pokemon cards, pokemon card market trends, fake pokemon cards identification, vintage pokemon cards collecting, first edition pokemon cards, shadowless pokemon cards, pokemon card investment tips, charizard card collecting, pokemon booster box collecting"
        />
        <meta
          property="og:title"
          content="Pokemon Card Collecting Guide Australia | PSA Grading & Investment Tips"
        />
        <meta
          property="og:description"
          content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards."
        />
        <link
          rel="canonical"
          href="https://www.mycardtracker.com.au/collecting-guide"
        />

        {/* Structured Data for Collecting Guide */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to Collect Pokemon Cards: Complete Beginner Guide',
            description: 'Step-by-step guide to collecting Pokemon cards, including grading, storage, and identifying valuable cards.',
            image: 'https://www.mycardtracker.com.au/screenshots/Dashboard.png',
            estimatedCost: {
              '@type': 'MonetaryAmount',
              currency: 'AUD',
              value: '50'
            },
            totalTime: 'PT30M',
            step: [
              {
                '@type': 'HowToStep',
                name: 'Choose Your Collection Focus',
                text: 'Decide whether to collect vintage cards (1998-2003), modern cards, or specific Pokemon. Focus helps guide purchasing decisions.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep', 
                name: 'Learn Card Conditions and Grading',
                text: 'Understand the PSA grading scale (1-10) and how condition affects value. Learn to spot centering issues, surface scratches, and edge wear.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Set Up Proper Storage',
                text: 'Use penny sleeves, toploaders, and card savers to protect your cards. Store in a cool, dry place away from direct sunlight.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Research Market Values',
                text: 'Use PSA auction prices, sold eBay listings, and price tracking tools to understand current market values before buying.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Start with Key Cards',
                text: 'Begin with iconic cards like Base Set Charizard, Blastoise, and Venusaur. These maintain value and are good entry points.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              }
            ]
          })}
        </script>
      </Helmet>
      <NavigationBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Expert Knowledge Base
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Collecting
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Guide
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Everything you need to know about collecting, grading, and
            protecting your valuable Pokémon cards.
          </p>
        </div>
      </section>

      {/* Navigation & Content */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h3 className="mb-4 text-lg font-bold">Guide Sections</h3>
                <nav className="space-y-2">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="mr-3">{section.icon}</span>
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 rounded-2xl p-8">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CollectingGuide;
