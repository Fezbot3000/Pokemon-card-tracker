import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
    { id: 'authentication', title: 'Authentication', icon: '🔍' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold mb-6">Getting Started with Pokémon Card Collecting</h2>
            
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">🎯 Define Your Collection Goals</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Choose your focus: specific sets, Pokémon, or eras</li>
                <li>• Set a realistic budget for your collection</li>
                <li>• Decide between vintage or modern cards</li>
                <li>• Consider long-term vs. short-term collecting</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-400 mb-4">💰 Budget Planning</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>• Start with lower-value cards to learn</li>
                  <li>• Allocate funds for storage and protection</li>
                  <li>• Track your spending with our tools</li>
                  <li>• Consider grading costs for valuable cards</li>
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-400 mb-4">📚 Research & Education</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
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
            <h2 className="text-3xl font-bold mb-6">Understanding Pokémon Card Conditions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-400 mb-4">💎 Mint (M)</h3>
                <p className="text-gray-300 text-sm mb-4">Perfect condition, no visible flaws</p>
                <ul className="space-y-1 text-gray-400 text-xs">
                  <li>• Sharp corners</li>
                  <li>• Perfect centering</li>
                  <li>• No surface wear</li>
                  <li>• Clean edges</li>
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4">⭐ Near Mint (NM)</h3>
                <p className="text-gray-300 text-sm mb-4">Excellent condition with minor flaws</p>
                <ul className="space-y-1 text-gray-400 text-xs">
                  <li>• Very minor edge wear</li>
                  <li>• Slight centering issues</li>
                  <li>• Minimal surface scratches</li>
                  <li>• Sharp corners</li>
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">✨ Excellent (EX)</h3>
                <p className="text-gray-300 text-sm mb-4">Good condition with noticeable wear</p>
                <ul className="space-y-1 text-gray-400 text-xs">
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
            <h2 className="text-3xl font-bold mb-6">Coming Soon</h2>
            <p className="text-gray-300">This section is under development. Check back soon for comprehensive guides!</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>Pokemon Card Collecting Guide Australia | PSA Grading & Investment Tips</title>
        <meta name="description" content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards. Expert advice for collectors." />
        <meta name="keywords" content="pokemon card collecting guide australia, PSA grading pokemon cards, pokemon card conditions guide, how to store pokemon cards, pokemon card market trends, fake pokemon cards identification, vintage pokemon cards collecting, first edition pokemon cards, shadowless pokemon cards, pokemon card investment tips, charizard card collecting, pokemon booster box collecting" />
        <meta property="og:title" content="Pokemon Card Collecting Guide Australia | PSA Grading & Investment Tips" />
        <meta property="og:description" content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards." />
        <link rel="canonical" href="https://www.mycardtracker.com.au/collecting-guide" />
      </Helmet>
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Expert Knowledge Base
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Collecting
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Guide
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Everything you need to know about collecting, grading, and protecting your valuable Pokémon cards.
          </p>
        </div>
      </section>

      {/* Navigation & Content */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h3 className="text-lg font-bold mb-4">Guide Sections</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
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
