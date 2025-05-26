import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const PokemonSets = () => {
  const [selectedSet, setSelectedSet] = useState('base-set');

  const pokemonSets = [
    {
      id: 'base-set',
      name: 'Base Set (1999)',
      description: 'The original Pokemon TCG set that started it all',
      averagePrice: '1st Edition Shadowless: $1,000-$100,000+ | Unlimited: $100-$10,000+',
      rarity: 'Extremely Rare (1st Edition Shadowless), Very Rare (Unlimited)',
      investment: 'Very High',
      keyCards: [
        {
          name: 'Charizard #4',
          firstEd: 'High Six to Low Seven Figures',
          unlimited: '$5,000 - $20,000+'
        },
        {
          name: 'Blastoise #2', 
          firstEd: '$5,000 - $20,000+',
          unlimited: '$1,000 - $5,000+'
        },
        {
          name: 'Venusaur #15',
          firstEd: '$3,000 - $15,000+',
          unlimited: '$800 - $4,000+'
        },
        {
          name: 'Pikachu (Red Cheek) #58',
          firstEd: '$1,000 - $5,000+',
          unlimited: '$50 - $200+ (Yellow Cheek)'
        }
      ],
      collectorTip: 'For maximum investment potential, focus on 1st Edition Shadowless cards. Look for cards graded by reputable companies like PSA, BGS, or CGC.'
    },
    {
      id: 'jungle',
      name: 'Jungle (1999)',
      description: 'First expansion featuring Pokemon from the Kanto region',
      averagePrice: '1st Edition: $200-$3,000+ | Unlimited: $50-$500+',
      rarity: 'Very Rare (1st Edition), Rare (Unlimited)',
      investment: 'Medium-High',
      keyCards: [
        {
          name: 'Scyther #10',
          firstEd: '$300 - $1,000+',
          unlimited: '$70 - $250+'
        },
        {
          name: 'Pinsir #9',
          firstEd: '$250 - $800+',
          unlimited: '$60 - $200+'
        },
        {
          name: 'Jolteon #4',
          firstEd: '$400 - $1,500+',
          unlimited: '$100 - $400+'
        }
      ],
      collectorTip: '1st Edition Jungle cards, especially those with perfect centering, are highly desirable.'
    },
    {
      id: 'fossil',
      name: 'Fossil (1999)',
      description: 'Introduced fossil Pokemon to the TCG',
      averagePrice: '1st Edition: $150-$2,500+ | Unlimited: $40-$400+',
      rarity: 'Rare (1st Edition), Uncommon (Unlimited)',
      investment: 'Medium',
      keyCards: [
        {
          name: 'Aerodactyl #1',
          firstEd: '$200 - $800+',
          unlimited: '$50 - $200+'
        },
        {
          name: 'Kabutops #9',
          firstEd: '$180 - $700+',
          unlimited: '$40 - $180+'
        },
        {
          name: 'Lapras #10',
          firstEd: '$250 - $900+',
          unlimited: '$60 - $250+'
        }
      ],
      collectorTip: 'Look for the powerful legendary birds (Moltres, Zapdos, Articuno) in 1st Edition holos for good investment potential.'
    },
    {
      id: 'team-rocket',
      name: 'Team Rocket (2000)',
      description: 'Dark Pokemon theme with Team Rocket variants',
      averagePrice: '1st Edition: $200-$5,000+ | Unlimited: $50-$800+',
      rarity: 'Very Rare (1st Edition), Rare (Unlimited)',
      investment: 'High',
      keyCards: [
        {
          name: 'Dark Charizard #4',
          firstEd: '$1,000 - $5,000+',
          unlimited: '$200 - $800+'
        },
        {
          name: 'Dark Blastoise #3',
          firstEd: '$300 - $1,200+',
          unlimited: '$70 - $300+'
        },
        {
          name: 'Dark Dragonite #5',
          firstEd: '$250 - $1,000+',
          unlimited: '$60 - $250+'
        }
      ],
      collectorTip: 'The "Dark" versions of popular Pokemon, especially Charizard, are highly sought after. Finding 1st Edition holos in perfect condition is key.'
    }
  ];

  const currentSet = pokemonSets.find(set => set.id === selectedSet);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000' }}>
      <Helmet>
        <title>Pokemon Card Sets Price Guide Australia | Base Set, Jungle, Fossil Values 2024</title>
        <meta name="description" content="Complete Pokemon card sets price guide for Australian collectors. Track Base Set Charizard, Jungle, Fossil, and Team Rocket values. Investment potential analysis included." />
        <meta name="keywords" content="pokemon card sets prices australia, base set charizard value, jungle set pokemon cards, fossil set prices, team rocket cards value, vintage pokemon card sets, pokemon card price guide 2024, shadowless charizard price, first edition pokemon cards australia" />
        <meta property="og:title" content="Pokemon Card Sets Price Guide Australia | Vintage Card Values & Investment Analysis" />
        <meta property="og:description" content="Track Pokemon card set values from Base Set to Team Rocket. Get investment insights and price ranges for vintage Pokemon cards in Australia." />
        <link rel="canonical" href="https://www.mycardtracker.com.au/pokemon-sets" />
        
        {/* Structured Data for Pokemon Sets */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Pokemon Card Sets Price Guide",
            "description": "Complete guide to Pokemon card set values and investment potential",
            "url": "https://www.mycardtracker.com.au/pokemon-sets",
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": pokemonSets.map((set, index) => ({
                "@type": "Product",
                "position": index + 1,
                "name": set.name,
                "description": set.description,
                "offers": {
                  "@type": "AggregateOffer",
                  "priceCurrency": "AUD",
                  "lowPrice": set.averagePrice.split('-')[0].replace('$', '').replace(',', ''),
                  "highPrice": set.averagePrice.split('-')[1].replace('$', '').replace(',', '')
                }
              }))
            }
          })}
        </script>
      </Helmet>
      <NavigationBar />
      
      {/* Hero Section with proper spacing */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Pokemon Card Sets Price Guide
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            More current estimates for PSA 10 (Gem Mint) holographic cards. These are general estimates subject to significant market fluctuations. Prices for ungraded or lower-graded cards will be considerably less.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
            <p className="text-yellow-400 text-sm">
              <strong>Important:</strong> "Investment Potential" is a general guide and not financial advice. Always cross-reference prices and consider the condition and grading of the card when assessing its value.
            </p>
          </div>
        </div>
      </section>

      {/* Set Selection Tabs */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {pokemonSets.map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSet(set.id)}
                className={`p-4 rounded-lg text-left transition-all ${
                  selectedSet === set.id
                    ? 'bg-purple-500/30 border-2 border-purple-500'
                    : 'bg-white/5 border border-gray-600 hover:bg-white/10'
                }`}
              >
                <h3 className="font-bold text-white mb-2">{set.name}</h3>
                <p className="text-sm text-gray-400">{set.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Selected Set Details */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Set Information */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white mb-6">{currentSet.name}</h2>
              <p className="text-gray-300 text-lg leading-relaxed">{currentSet.description}</p>
              
              <div className="bg-white/5 rounded-xl p-6 space-y-4 border border-white/10">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <span className="text-gray-400 font-medium">Average Price Range:</span>
                    <div className="text-right">
                      <div className="text-green-400 font-bold text-lg">{currentSet.averagePrice}</div>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-400 font-medium">Rarity Level:</span>
                      <span className="text-yellow-400 font-semibold">{currentSet.rarity}</span>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-400 font-medium">Investment Potential:</span>
                      <span className="text-purple-400 font-semibold">{currentSet.investment}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Cards */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Key Cards to Track</h3>
              <div className="space-y-4">
                {currentSet.keyCards.map((card, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold">{card.name}</span>
                        <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                          🔥 High Demand
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm">
                        <div className="sm:text-right">
                          <div>1st Ed: <span className="text-green-400">{card.firstEd}</span></div>
                          <div>Unlimited: <span className="text-blue-400">{card.unlimited}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
                <h4 className="font-bold text-white mb-3">💡 Collector Tip</h4>
                <p className="text-gray-300 text-sm">
                  {currentSet.collectorTip}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-2xl font-bold text-white mb-4">Start Tracking Your Pokemon Cards</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Use our Pokemon Card Tracker to monitor your collection values, track PSA grades, and identify investment opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/login"
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105"
                >
                  Start Tracking Free
                </Link>
                <Link
                  to="/pokemon-investment-guide"
                  className="w-full sm:w-auto bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
                >
                  Investment Guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Resources Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Accurate Pricing Resources
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-3">PSA Price Guide</h3>
              <p className="text-gray-400 text-sm mb-4">
                Comprehensive guide based on graded card sales data
              </p>
              <span className="text-green-400 text-sm font-semibold">Recommended</span>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-3">eBay Sold Listings</h3>
              <p className="text-gray-400 text-sm mb-4">
                Filter by "Sold Items" to see actual selling prices
              </p>
              <span className="text-blue-400 text-sm font-semibold">Real-time Data</span>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-3">TCGPlayer</h3>
              <p className="text-gray-400 text-sm mb-4">
                Excellent for raw (ungraded) card prices and market trends
              </p>
              <span className="text-purple-400 text-sm font-semibold">Market Trends</span>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-3">CardLadder</h3>
              <p className="text-gray-400 text-sm mb-4">
                Detailed market data, indices, and individual card tracking
              </p>
              <span className="text-orange-400 text-sm font-semibold">Premium Data</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-8 border border-red-500/30 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Why Price Discrepancies Exist</h3>
            <p className="text-gray-300 mb-6 max-w-4xl mx-auto">
              The Pokemon card market has seen immense growth and volatility, especially in recent years. High-grade, rare cards consistently command top dollar, while lower-grade cards are much more affordable. Always consider condition, grading, and recent sales when assessing value.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full border border-red-500/30">
                🎯 Condition Matters
              </span>
              <span className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full border border-orange-500/30">
                📊 Market Volatility
              </span>
              <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full border border-yellow-500/30">
                🔍 Cross-Reference Prices
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PokemonSets;
