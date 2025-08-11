import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import logger from '../utils/logger';

const PokemonSets = () => {
  const [selectedSet, setSelectedSet] = useState('base-set');

  // Function to extract valid price range from complex price strings
  const extractPriceRange = priceString => {
    try {
      // More comprehensive regex to handle prices with commas and + symbols
      // This will match patterns like $1,000, $100,000+, etc.
      const priceMatches = priceString.match(/\$([0-9,]+)\+?/g);
      if (!priceMatches || priceMatches.length === 0) {
        return { lowPrice: '0.00', highPrice: '0.00' };
      }

      // Convert to numbers and clean up (remove $, commas, and + symbols)
      const prices = priceMatches
        .map(price => {
          const cleanPrice = price.replace(/[$,+]/g, '');
          return parseFloat(cleanPrice);
        })
        .filter(price => !isNaN(price) && price > 0);

      if (prices.length === 0) {
        return { lowPrice: '0.00', highPrice: '0.00' };
      }

      // Get min and max prices
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Format prices with proper decimal places for structured data
      return {
        lowPrice: minPrice.toFixed(2),
        highPrice: maxPrice.toFixed(2),
      };
    } catch (error) {
      logger.warn('Error parsing price string:', priceString, error, { context: { file: 'PokemonSets', purpose: 'price-string-parsing' } });
      return { lowPrice: '0.00', highPrice: '0.00' };
    }
  };

  const pokemonSets = [
    {
      id: 'base-set',
      name: 'Base Set (1999)',
      description: 'The original Pokemon TCG set that started it all - PSA 10 pricing shown',
      averagePrice:
        '1st Edition Shadowless PSA 10: $12,000-$350,000+ | Unlimited PSA 10: $1,500-$10,200+',
      rarity: 'Extremely Rare (1st Edition Shadowless), Very Rare (Unlimited)',
      investment: 'Very High',
      keyCards: [
        {
          name: 'Charizard #4 (Holo) PSA 10',
          firstEd: '$194,000 - $347,000+',
          unlimited: '~$10,174',
        },
        {
          name: 'Blastoise #2 (Holo) PSA 10',
          firstEd: '~$30,125',
          unlimited: '~$2,000',
        },
        {
          name: 'Venusaur #15 (Holo) PSA 10',
          firstEd: '~$12,885',
          unlimited: '~$1,600',
        },
        {
          name: 'Pikachu (Red Cheek) #58 PSA 10',
          firstEd: '~$6,240',
          unlimited: '~$216 (Yellow Cheek)',
        },
      ],
      collectorTip:
        'PSA 10 Base Set cards command massive premiums. 1st Edition Shadowless cards often sell for tens to hundreds of thousands. Always verify recent sales on eBay or auction houses.',
    },
    {
      id: 'jungle',
      name: 'Jungle (1999)',
      description: 'First expansion featuring Pokemon from the Kanto region - PSA 10 pricing shown',
      averagePrice: '1st Edition PSA 10: $600-$3,800+ | Unlimited PSA 10: $127-$600+',
      rarity: 'Very Rare (1st Edition), Rare (Unlimited)',
      investment: 'Medium-High',
      keyCards: [
        {
          name: 'Scyther #10 (Holo) PSA 10',
          firstEd: '~$1,746',
          unlimited: '$500 - $600',
        },
        {
          name: 'Pinsir #9 (Holo) PSA 10',
          firstEd: '~$598',
          unlimited: '$300 - $400',
        },
        {
          name: 'Jolteon #4 (Holo) PSA 10',
          firstEd: '$2,225 - $4,500+ (~$3,832)',
          unlimited: '~$127',
        },
      ],
      collectorTip:
        'Jolteon is particularly sought-after and commands premium prices in PSA 10. 1st Edition Jungle holos with perfect centering can exceed $3,000.',
    },
    {
      id: 'fossil',
      name: 'Fossil (1999)',
      description: 'Introduced fossil Pokemon to the TCG - PSA 10 pricing shown',
      averagePrice: '1st Edition PSA 10: $1,000-$4,050+ | Unlimited PSA 10: $300-$600+',
      rarity: 'Rare (1st Edition), Uncommon (Unlimited)',
      investment: 'Medium',
      keyCards: [
        {
          name: 'Aerodactyl #1 (Holo) PSA 10',
          firstEd: '~$1,445',
          unlimited: '$300 - $400',
        },
        {
          name: 'Kabutops #9 (Holo) PSA 10',
          firstEd: '$500 - $1,288+ (~$1,005)',
          unlimited: '~$573',
        },
        {
          name: 'Lapras #10 (Holo) PSA 10',
          firstEd: '~$4,050',
          unlimited: '$400 - $500',
        },
      ],
      collectorTip:
        'Lapras is the most valuable Fossil holo in PSA 10, often reaching $4,000+. Legendary birds (Moltres, Zapdos, Articuno) also command strong premiums in perfect grade.',
    },
    {
      id: 'team-rocket',
      name: 'Team Rocket (2000)',
      description: 'Dark Pokemon theme with Team Rocket variants - PSA 10 pricing shown',
      averagePrice: '1st Edition PSA 10: $4,800-$6,500+ | Unlimited PSA 10: $1,000-$2,500+',
      rarity: 'Very Rare (1st Edition), Rare (Unlimited)',
      investment: 'High',
      keyCards: [
        {
          name: 'Dark Charizard #4 (Holo) PSA 10',
          firstEd: '~$6,541',
          unlimited: '~$2,481',
        },
        {
          name: 'Dark Blastoise #3 (Holo) PSA 10',
          firstEd: '~$5,175',
          unlimited: '~$1,000',
        },
        {
          name: 'Dark Dragonite #5 (Holo) PSA 10',
          firstEd: '$2,250 - $5,225+ (~$4,818)',
          unlimited: '$800 - $1,200',
        },
      ],
      collectorTip:
        'Dark Charizard, Dark Blastoise and Dark Dragonite regularly exceed $4,000-$6,500 in PSA 10. Note: Non-holo versions sell for significantly less (~$1,450 for Dark Charizard #21).',
    },
  ];

  const currentSet = pokemonSets.find(set => set.id === selectedSet);

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>
          Pokemon Card Price Checker FREE 2025 | Base Set Charizard Values Australia
        </title>
        <meta
          name="description"
          content="🔥 FREE Pokemon card price checker! Get instant values for Base Set Charizard, Jungle, Fossil & Team Rocket cards. See what your vintage Pokemon cards are worth in 2025!"
        />
        <meta
          name="keywords"
          content="pokemon card sets prices australia, base set charizard value, jungle set pokemon cards, fossil set prices, team rocket cards value, vintage pokemon card sets, pokemon card price guide 2024, shadowless charizard price, first edition pokemon cards australia"
        />
        <meta
          property="og:title"
          content="FREE Pokemon Card Price Checker 2025 | Instant Values Australia"
        />
        <meta
          property="og:description"
          content="🔥 Get instant values for your Pokemon cards! Base Set Charizard, Jungle, Fossil & Team Rocket prices updated daily. See what your collection is worth!"
        />
        <link
          rel="canonical"
          href="https://www.mycardtracker.com.au/pokemon-sets"
        />

        {/* Structured Data for Pokemon Sets */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Pokemon Card Sets Price Guide',
            description:
              'Complete guide to Pokemon card set values and investment potential',
            url: 'https://www.mycardtracker.com.au/pokemon-sets',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: pokemonSets.map((set, index) => ({
                '@type': 'Product',
                position: index + 1,
                name: set.name,
                description: set.description,
                offers: {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'AUD',
                  lowPrice: extractPriceRange(set.averagePrice).lowPrice,
                  highPrice: extractPriceRange(set.averagePrice).highPrice,
                },
              })),
            },
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
            PSA 10 Price Guide
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Pokemon Card
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Sets Guide
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Accurate pricing for PSA 10 (Gem Mint) holographic cards based on recent sales data through 2024-2025.
            Prices shown are from verified auction sites and price tracking services like PriceCharting.
            Ungraded or lower-graded cards sell for significantly less.
          </p>

          <div className="mx-auto mb-8 max-w-4xl rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-400">
              <strong>Important:</strong> "Investment Potential" is a general
              guide and not financial advice. Always cross-reference prices and
              consider the condition and grading of the card when assessing its
              value.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h3 className="mb-4 text-lg font-bold">Pokemon Sets</h3>
                <nav className="space-y-2">
                  {pokemonSets.map(set => (
                    <button
                      key={set.id}
                      onClick={() => setSelectedSet(set.id)}
                      className={`flex w-full items-center rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                        selectedSet === set.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="mr-3">🎴</span>
                      {set.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 rounded-2xl p-8">
                {/* Set Information */}
                <div className="mb-8">
                  <h2 className="mb-6 text-3xl font-bold">
                    {currentSet.name}
                  </h2>
                  <p className="text-lg leading-relaxed text-gray-300 mb-6">
                    {currentSet.description}
                  </p>

                  <div className="bg-white/5 border-white/10 space-y-4 rounded-xl border p-6">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <span className="font-medium text-gray-400">
                          Average Price Range:
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">
                            {currentSet.averagePrice}
                          </div>
                        </div>
                      </div>
                      <div className="border-white/10 border-t pt-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-medium text-gray-400">
                            Rarity Level:
                          </span>
                          <span className="font-semibold text-yellow-400">
                            {currentSet.rarity}
                          </span>
                        </div>
                      </div>
                      <div className="border-white/10 border-t pt-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-medium text-gray-400">
                            Investment Potential:
                          </span>
                          <span className="font-semibold text-purple-400">
                            {currentSet.investment}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Cards */}
                <div className="mb-8">
                  <h3 className="mb-6 text-2xl font-bold">
                    Key Cards to Track
                  </h3>
                  <div className="space-y-4">
                    {currentSet.keyCards.map((card) => (
                      <div
                        key={card.name || card.title}
                        className="bg-white/5 border-white/10 rounded-lg border p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-white">
                              {card.name}
                            </span>
                            <span className="whitespace-nowrap rounded-full bg-orange-500/20 px-3 py-1 text-sm text-orange-400">
                              🔥 High Demand
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            <div className="sm:text-right">
                              <div>
                                1st Ed:{' '}
                                <span className="text-green-400">
                                  {card.firstEd}
                                </span>
                              </div>
                              <div>
                                Unlimited:{' '}
                                <span className="text-blue-400">
                                  {card.unlimited}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collector Tip */}
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6">
                  <h4 className="mb-3 font-bold text-white">💡 Collector Tip</h4>
                  <p className="text-sm text-gray-300">
                    {currentSet.collectorTip}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-8">
              <h3 className="mb-4 text-2xl font-bold text-white">
                Start Tracking Your Pokemon Cards
              </h3>
              <p className="mx-auto mb-6 max-w-2xl text-gray-300">
                Use our Pokemon Card Tracker to monitor your collection values,
                track PSA grades, and identify investment opportunities.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-3 font-semibold text-white transition-all hover:scale-105 hover:from-purple-600 hover:to-pink-700 sm:w-auto"
                >
                  Start Tracking Free
                </Link>
                <Link
                  to="/pokemon-investment-guide"
                  className="bg-white/10 hover:bg-white/20 w-full rounded-lg px-8 py-3 font-semibold text-white transition-all sm:w-auto"
                >
                  Investment Guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Resources Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-center text-3xl font-bold text-transparent">
            Accurate Pricing Resources
          </h2>

          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">PriceCharting</h3>
              <p className="mb-4 text-sm text-gray-400">
                Primary source for accurate PSA graded card values with verified sales data
              </p>
              <span className="text-sm font-semibold text-green-400">
                Primary Source
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">eBay Sold Listings</h3>
              <p className="mb-4 text-sm text-gray-400">
                Filter by "Sold Items" to see actual selling prices and recent sales
              </p>
              <span className="text-sm font-semibold text-blue-400">
                Real-time Data
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">Sports Card Investor</h3>
              <p className="mb-4 text-sm text-gray-400">
                Professional tracking service for PSA graded cards with market analysis
              </p>
              <span className="text-sm font-semibold text-purple-400">
                Professional Data
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">PSA Price Guide</h3>
              <p className="mb-4 text-sm text-gray-400">
                Official PSA population reports and market values
              </p>
              <span className="text-sm font-semibold text-orange-400">
                Official Data
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-orange-500/20 p-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-white">
              Understanding PSA 10 Pricing Methodology
            </h3>
            <p className="mx-auto mb-6 max-w-4xl text-gray-300">
              All prices shown are for PSA 10 (Gem Mint) holographic cards based on recent sales data from PriceCharting, 
              eBay sold listings, and Sports Card Investor. PSA 10 cards command significant premiums - often 5-20x 
              more than raw cards. Lower grades (PSA 9, 8, etc.) sell for considerably less. Always verify recent sales 
              on auction sites before buying or selling, as prices fluctuate significantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-red-400">
                🏆 PSA 10 Only
              </span>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/20 px-4 py-2 text-orange-400">
                📊 Recent Sales Data
              </span>
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-4 py-2 text-yellow-400">
                🔍 Holo vs Non-Holo
              </span>
              <span className="rounded-full border border-green-500/30 bg-green-500/20 px-4 py-2 text-green-400">
                💎 Grade Premium Impact
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Related Resources Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Take Your Pokemon Collection Further
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover investment strategies and find rare cards to add to your collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link 
              to="/pokemon-investment-guide"
              className="group bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl p-8 hover:from-green-500/30 hover:to-blue-500/30 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">💰</span>
                <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">
                  Investment Guide
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Learn which Pokemon cards made 1000%+ returns and discover the best investment strategies for 2025.
              </p>
              <span className="text-green-400 font-semibold group-hover:underline">
                Maximize Your ROI →
              </span>
            </Link>

            <Link 
              to="/marketplace"
              className="group bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-8 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">🏪</span>
                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  Card Marketplace
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Find rare Pokemon cards from trusted sellers across Australia. Base Set Charizard, PSA 10s and more.
              </p>
              <span className="text-purple-400 font-semibold group-hover:underline">
                Shop Pokemon Cards →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PokemonSets;
