import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const PokemonInvestmentGuide = () => {
  const [activeTab, setActiveTab] = useState('getting-started');

  const investmentStrategies = [
    {
      id: 'vintage-focus',
      title: 'Vintage Pokemon Cards (1998-2003)',
      roi: '15-25% annually',
      risk: 'Medium-High',
      timeframe: '5-10 years',
      examples: ['Base Set Shadowless Charizard', 'First Edition Jungle Holos', 'Neo Genesis Lugia']
    },
    {
      id: 'modern-graded',
      title: 'Modern PSA 10 Cards',
      roi: '8-15% annually',
      risk: 'Medium',
      timeframe: '3-7 years',
      examples: ['Hidden Fates Shiny Charizard', 'Champions Path Charizard VMAX', 'Evolving Skies Alt Arts']
    },
    {
      id: 'japanese-exclusive',
      title: 'Japanese Exclusive Cards',
      roi: '20-40% annually',
      risk: 'High',
      timeframe: '2-5 years',
      examples: ['Japanese Base Set No Rarity', 'Trophy Cards', 'Promo Cards']
    }
  ];

  const marketTrends = [
    {
      period: '2020-2021',
      trend: 'Explosive Growth',
      description: 'Pokemon cards saw 300-500% price increases due to celebrity endorsements and pandemic collecting',
      impact: 'High'
    },
    {
      period: '2022-2023',
      trend: 'Market Correction',
      description: 'Prices stabilized and corrected 20-40% from peak highs, creating buying opportunities',
      impact: 'Medium'
    },
    {
      period: '2024+',
      trend: 'Selective Growth',
      description: 'High-grade vintage and key modern cards continue appreciating while lower-tier cards plateau',
      impact: 'Medium-High'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000' }}>
      <Helmet>
        <title>Pokemon Card Investment Guide Australia | ROI Analysis & Market Trends 2024</title>
        <meta name="description" content="Expert Pokemon card investment strategies for Australian collectors. Learn ROI potential, market trends, PSA grading impact, and which cards to buy for maximum returns in 2024." />
        <meta name="keywords" content="pokemon card investment australia, pokemon card ROI, charizard investment potential, PSA 10 pokemon cards investment, vintage pokemon card returns, pokemon card market trends 2024, best pokemon cards to invest in, pokemon card portfolio strategy, japanese pokemon cards investment, pokemon card bubble analysis" />
        <meta property="og:title" content="Pokemon Card Investment Guide Australia | ROI Analysis & Market Trends 2024" />
        <meta property="og:description" content="Expert Pokemon card investment strategies for Australian collectors. Learn ROI potential, market trends, and which cards to buy for maximum returns." />
        <link rel="canonical" href="https://www.mycardtracker.com.au/pokemon-investment-guide" />
        
        {/* Structured Data for Investment Guide */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Pokemon Card Investment Guide Australia | ROI Analysis & Market Trends 2024",
            "description": "Expert Pokemon card investment strategies for Australian collectors",
            "author": {
              "@type": "Organization",
              "name": "Pokemon Card Tracker Australia"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Pokemon Card Tracker Australia",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.mycardtracker.com.au/logo192.png"
              }
            },
            "datePublished": "2024-12-20",
            "dateModified": "2024-12-20",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "https://www.mycardtracker.com.au/pokemon-investment-guide"
            }
          })}
        </script>
      </Helmet>
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Pokemon Card Investment Guide
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Master the art of Pokemon card investing with data-driven strategies, market analysis, and ROI insights for Australian collectors.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30">
              📈 15-40% Annual ROI Potential
            </span>
            <span className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/30">
              🏆 PSA Grading Impact Analysis
            </span>
            <span className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full border border-purple-500/30">
              🇦🇺 Australia Market Focus
            </span>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
              { id: 'strategies', label: 'Investment Strategies', icon: '💰' },
              { id: 'market-analysis', label: 'Market Analysis', icon: '📊' },
              { id: 'grading-impact', label: 'Grading Impact', icon: '🏆' },
              { id: 'portfolio', label: 'Portfolio Building', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          
          {/* Getting Started */}
          {activeTab === 'getting-started' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold mb-6">Pokemon Card Investment Fundamentals</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-green-400 mb-4">💡 Why Pokemon Cards as Investments?</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li>• <strong>Proven Track Record:</strong> Base Set Charizard: $6 (1998) → $350,000+ (2022)</li>
                    <li>• <strong>Global Demand:</strong> 25+ years of sustained popularity across generations</li>
                    <li>• <strong>Limited Supply:</strong> Vintage cards have fixed, diminishing supply</li>
                    <li>• <strong>Grading Premium:</strong> PSA 10 cards command 5-20x raw card prices</li>
                    <li>• <strong>Cultural Impact:</strong> Pokemon remains the highest-grossing media franchise</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Investment Risks to Consider</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li>• <strong>Market Volatility:</strong> Prices can fluctuate 20-50% year-over-year</li>
                    <li>• <strong>Condition Sensitivity:</strong> Small condition differences = massive value gaps</li>
                    <li>• <strong>Authentication Risk:</strong> Fake cards and altered grades exist</li>
                    <li>• <strong>Liquidity Concerns:</strong> High-value cards can take months to sell</li>
                    <li>• <strong>Storage Costs:</strong> Proper storage and insurance required</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-8 border border-blue-500/30">
                <h3 className="text-2xl font-bold mb-4">🎯 Investment Allocation Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">60%</div>
                    <div className="font-semibold mb-2">Blue Chip Cards</div>
                    <div className="text-sm text-gray-300">Base Set holos, PSA 9-10 vintage staples</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">30%</div>
                    <div className="font-semibold mb-2">Growth Picks</div>
                    <div className="text-sm text-gray-300">Undervalued sets, modern chase cards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">10%</div>
                    <div className="font-semibold mb-2">Speculative</div>
                    <div className="text-sm text-gray-300">Japanese exclusives, error cards, promos</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Investment Strategies */}
          {activeTab === 'strategies' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold mb-6">Proven Investment Strategies</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {investmentStrategies.map((strategy, index) => (
                  <div key={strategy.id} className="bg-white/5 rounded-xl p-6 border border-gray-600">
                    <h3 className="text-xl font-bold text-blue-400 mb-4">{strategy.title}</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Expected ROI:</span>
                        <span className="text-green-400 font-semibold">{strategy.roi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Risk Level:</span>
                        <span className="text-yellow-400 font-semibold">{strategy.risk}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time Horizon:</span>
                        <span className="text-purple-400 font-semibold">{strategy.timeframe}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-gray-300">Key Examples:</h4>
                      <ul className="text-sm space-y-1">
                        {strategy.examples.map((example, idx) => (
                          <li key={idx} className="text-gray-400">• {example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Analysis */}
          {activeTab === 'market-analysis' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold mb-6">Pokemon Card Market Trends & Analysis</h2>
              
              <div className="space-y-6">
                {marketTrends.map((trend, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                      <h3 className="text-xl font-bold text-blue-400">{trend.period}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        trend.impact === 'High' ? 'bg-red-500/20 text-red-400' :
                        trend.impact === 'Medium-High' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {trend.trend}
                      </span>
                    </div>
                    <p className="text-gray-300">{trend.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-8 border border-green-500/30">
                <h3 className="text-2xl font-bold mb-4">🔮 2024-2025 Market Predictions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-green-400 mb-3">Bullish Factors</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li>• Pokemon's 30th anniversary approaching (2026)</li>
                      <li>• Continued celebrity and influencer involvement</li>
                      <li>• Growing Asian collector market</li>
                      <li>• Limited vintage supply becoming scarcer</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-red-400 mb-3">Bearish Risks</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li>• Economic recession reducing discretionary spending</li>
                      <li>• Overproduction of modern sets</li>
                      <li>• Potential market saturation</li>
                      <li>• Regulatory changes affecting collectibles</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-2xl font-bold mb-4">Start Building Your Pokemon Card Investment Portfolio</h3>
              <p className="text-gray-300 mb-6">
                Track your investments, monitor market trends, and maximize your ROI with our advanced Pokemon Card Tracker.
              </p>
              <Link
                to="/login"
                className="inline-block bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all transform hover:scale-105 mr-4"
              >
                Start Tracking Investments
              </Link>
              <Link
                to="/pokemon-sets"
                className="inline-block bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                Browse Pokemon Sets
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PokemonInvestmentGuide;
