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
      description: 'The original Pokemon TCG set that started it all',
      averagePrice:
        '1st Edition Shadowless: $1,000-$100,000+ | Unlimited: $100-$10,000+',
      rarity: 'Extremely Rare (1st Edition Shadowless), Very Rare (Unlimited)',
      investment: 'Very High',
      keyCards: [
        {
          name: 'Charizard #4',
          firstEd: 'High Six to Low Seven Figures',
          unlimited: '$5,000 - $20,000+',
        },
        {
          name: 'Blastoise #2',
          firstEd: '$5,000 - $20,000+',
          unlimited: '$1,000 - $5,000+',
        },
        {
          name: 'Venusaur #15',
          firstEd: '$3,000 - $15,000+',
          unlimited: '$800 - $4,000+',
        },
        {
          name: 'Pikachu (Red Cheek) #58',
          firstEd: '$1,000 - $5,000+',
          unlimited: '$50 - $200+ (Yellow Cheek)',
        },
      ],
      collectorTip:
        'For maximum investment potential, focus on 1st Edition Shadowless cards. Look for cards graded by reputable companies like PSA, BGS, or CGC.',
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
          unlimited: '$70 - $250+',
        },
        {
          name: 'Pinsir #9',
          firstEd: '$250 - $800+',
          unlimited: '$60 - $200+',
        },
        {
          name: 'Jolteon #4',
          firstEd: '$400 - $1,500+',
          unlimited: '$100 - $400+',
        },
      ],
      collectorTip:
        '1st Edition Jungle cards, especially those with perfect centering, are highly desirable.',
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
          unlimited: '$50 - $200+',
        },
        {
          name: 'Kabutops #9',
          firstEd: '$180 - $700+',
          unlimited: '$40 - $180+',
        },
        {
          name: 'Lapras #10',
          firstEd: '$250 - $900+',
          unlimited: '$60 - $250+',
        },
      ],
      collectorTip:
        'Look for the powerful legendary birds (Moltres, Zapdos, Articuno) in 1st Edition holos for good investment potential.',
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
          unlimited: '$200 - $800+',
        },
        {
          name: 'Dark Blastoise #3',
          firstEd: '$300 - $1,200+',
          unlimited: '$70 - $300+',
        },
        {
          name: 'Dark Dragonite #5',
          firstEd: '$250 - $1,000+',
          unlimited: '$60 - $250+',
        },
      ],
      collectorTip:
        'The "Dark" versions of popular Pokemon, especially Charizard, are highly sought after. Finding 1st Edition holos in perfect condition is key.',
    },
  ];

  const currentSet = pokemonSets.find(set => set.id === selectedSet);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000' }}>
      <Helmet>
        <title>
          Pokemon Card Sets Price Guide Australia | Base Set, Jungle, Fossil
          Values 2024
        </title>
        <meta
          name="description"
          content="Complete Pokemon card sets price guide for Australian collectors. Track Base Set Charizard, Jungle, Fossil, and Team Rocket values. Investment potential analysis included."
        />
        <meta
          name="keywords"
          content="pokemon card sets prices australia, base set charizard value, jungle set pokemon cards, fossil set prices, team rocket cards value, vintage pokemon card sets, pokemon card price guide 2024, shadowless charizard price, first edition pokemon cards australia"
        />
        <meta
          property="og:title"
          content="Pokemon Card Sets Price Guide Australia | Vintage Card Values & Investment Analysis"
        />
        <meta
          property="og:description"
          content="Track Pokemon card set values from Base Set to Team Rocket. Get investment insights and price ranges for vintage Pokemon cards in Australia."
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

      {/* Hero Section with proper spacing */}
      <section className="relative px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
            Pokemon Card Sets Price Guide
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-300">
            More current estimates for PSA 10 (Gem Mint) holographic cards.
            These are general estimates subject to significant market
            fluctuations. Prices for ungraded or lower-graded cards will be
            considerably less.
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

      {/* Set Selection Tabs */}
      <section className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            {pokemonSets.map(set => (
              <button
                key={set.id}
                onClick={() => setSelectedSet(set.id)}
                className={`rounded-lg p-4 text-left transition-all ${
                  selectedSet === set.id
                    ? 'border-2 border-purple-500 bg-purple-500/30'
                    : 'bg-white/5 hover:bg-white/10 border border-gray-600'
                }`}
              >
                <h3 className="mb-2 font-bold text-white">{set.name}</h3>
                <p className="text-sm text-gray-400">{set.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Selected Set Details */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Set Information */}
            <div className="space-y-6">
              <h2 className="mb-6 text-3xl font-bold text-white">
                {currentSet.name}
              </h2>
              <p className="text-lg leading-relaxed text-gray-300">
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
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">
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

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6">
                <h4 className="mb-3 font-bold text-white">💡 Collector Tip</h4>
                <p className="text-sm text-gray-300">
                  {currentSet.collectorTip}
                </p>
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
              <h3 className="mb-3 font-bold text-white">PSA Price Guide</h3>
              <p className="mb-4 text-sm text-gray-400">
                Comprehensive guide based on graded card sales data
              </p>
              <span className="text-sm font-semibold text-green-400">
                Recommended
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">eBay Sold Listings</h3>
              <p className="mb-4 text-sm text-gray-400">
                Filter by "Sold Items" to see actual selling prices
              </p>
              <span className="text-sm font-semibold text-blue-400">
                Real-time Data
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">TCGPlayer</h3>
              <p className="mb-4 text-sm text-gray-400">
                Excellent for raw (ungraded) card prices and market trends
              </p>
              <span className="text-sm font-semibold text-purple-400">
                Market Trends
              </span>
            </div>

            <div className="bg-white/5 border-white/10 rounded-xl border p-6">
              <h3 className="mb-3 font-bold text-white">CardLadder</h3>
              <p className="mb-4 text-sm text-gray-400">
                Detailed market data, indices, and individual card tracking
              </p>
              <span className="text-sm font-semibold text-orange-400">
                Premium Data
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-orange-500/20 p-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-white">
              Why Price Discrepancies Exist
            </h3>
            <p className="mx-auto mb-6 max-w-4xl text-gray-300">
              The Pokemon card market has seen immense growth and volatility,
              especially in recent years. High-grade, rare cards consistently
              command top dollar, while lower-grade cards are much more
              affordable. Always consider condition, grading, and recent sales
              when assessing value.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-red-400">
                🎯 Condition Matters
              </span>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/20 px-4 py-2 text-orange-400">
                📊 Market Volatility
              </span>
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-4 py-2 text-yellow-400">
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
