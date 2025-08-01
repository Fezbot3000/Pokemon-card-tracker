import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import OptimizedImage from './ui/OptimizedImage';
import { getPWATimingConfig } from '../utils/pwaDetection';

function Home() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get PWA-specific timing configuration
  const { isPWA, authInitDelay } = getPWATimingConfig();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Handle initial load timing for PWA vs browser
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsInitialLoad(false);
    }, authInitDelay); // PWA: 300ms, Browser: 150ms

    return () => clearTimeout(timeout);
  }, [authInitDelay]);

  const openModal = (imageSrc, title, description) => {
    setModalImage({ src: imageSrc, title, description });
  };

  const closeModal = () => {
    setModalImage(null);
  };

  // Show loading screen while checking authentication OR during initial load
  if (loading || isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1B2131]">
        <div className="size-12 animate-spin rounded-full border-y-2 border-blue-500"></div>
      </div>
    );
  }

  if (currentUser) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>MyCardTracker | Track, Value & Trade Trading Cards</title>
        <meta
          name="description"
          content="Australia's #1 trading card tracker. Manage your collection, track graded cards, monitor investments, and trade in our secure marketplace. Free to start!"
        />
        <meta
          name="keywords"
          content="track graded trading cards, card price tracker, card value tracker, card investment calculator, tcg collection manager, card grading tracker, card market prices australia, vintage card tracker, card portfolio tracker, card condition tracker, card rarity guide, card set completion tracker"
        />
        <meta
          property="og:title"
          content="MyCardTracker | Track, Value & Trade Trading Cards"
        />
        <meta
          property="og:description"
          content="Australia's #1 trading card tracker. Manage your collection, track graded cards, monitor investments, and trade in our secure marketplace. Free to start!"
        />
        <meta property="og:url" content="https://www.mycardtracker.com.au" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.mycardtracker.com.au" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.mycardtracker.com.au/#organization',
                name: 'MyCardTracker',
                alternateName: 'My Card Tracker',
                url: 'https://www.mycardtracker.com.au',
                        logo: {
          '@type': 'ImageObject',
          url: 'https://www.mycardtracker.com.au/favicon_L-192x192.png',
                },
                description: 'Free Pokemon card tracking application',
                areaServed: 'Australia',
                serviceType: 'Digital Platform',
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.mycardtracker.com.au/#website',
                url: 'https://www.mycardtracker.com.au',
                name: 'MyCardTracker',
                description:
                  "Track, value, and trade trading cards with Australia's #1 card tracker",
                publisher: {
                  '@id': 'https://www.mycardtracker.com.au/#organization',
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target:
                    'https://www.mycardtracker.com.au/search?q={search_term_string}',
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'SoftwareApplication',
                name: 'MyCardTracker',
                applicationCategory: 'CollectionManagement',
                operatingSystem: 'Web Browser',
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: '4.8',
                  reviewCount: '150',
                },
                featureList: [
                  'Trading card collection tracking',
                  'Graded card integration',
                  'Investment analytics',
                  'Secure marketplace',
                  'Price monitoring',
                ],
              },
            ],
          })}
        </script>
      </Helmet>
      <NavigationBar />

      {/* Modal for enlarged images */}
      {modalImage && (
        <div
          className="bg-black/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div className="relative max-h-[60vh] w-full max-w-4xl">
            <button
              onClick={closeModal}
              className="text-white/70 absolute -top-12 right-0 z-10 text-2xl font-bold hover:text-white"
            >
              ✕
            </button>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm sm:p-6">
              <img
                src={modalImage.src}
                alt={modalImage.title}
                className="h-auto max-h-[40vh] w-full rounded-xl object-contain shadow-2xl"
                onClick={e => e.stopPropagation()}
              />
              <div className="mt-4 text-center">
                <h3 className="mb-2 text-xl font-bold sm:text-2xl">
                  {modalImage.title}
                </h3>
                <p className="text-gray-300">{modalImage.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Hero Section */}
      <section className="logged-out-page relative flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Background Elements */}
        <div className="hero-blur-background absolute inset-0"></div>
        <div className="hero-orb-blue absolute left-1/4 top-1/4 size-96 rounded-full blur-3xl"></div>
        <div className="hero-orb-purple absolute bottom-1/4 right-1/4 size-96 rounded-full blur-3xl"></div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          {/* Badge */}
          <div className="glass-bg-secondary glass-border-light mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Australia's #1 Collectibles Platform
          </div>

          {/* Main Headline */}
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Track, Value & Trade
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your Trading Cards
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-8 max-w-3xl px-4 text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            The ultimate platform for serious collectors. Track your collection,
            monitor investments, and trade with verified collectors.
          </p>

          {/* CTA Buttons */}
          <div className="mb-12 flex flex-col items-center justify-center gap-3 px-4 sm:mb-16 sm:gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full max-w-xs rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/25 sm:max-w-sm sm:px-8 sm:py-4 sm:text-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="glass-bg-secondary glass-border-light w-full max-w-xs rounded-2xl border px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:opacity-90 sm:max-w-sm sm:px-8 sm:py-4 sm:text-lg"
            >
              View Pricing
            </button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center justify-center gap-4 px-4 text-xs text-gray-400 sm:flex-row sm:gap-8 sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-400 sm:text-2xl">
                10K+
              </span>
              <span>Items Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-400 sm:text-2xl">
                500+
              </span>
              <span>Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-pink-400 sm:text-2xl">
                1K+
              </span>
              <span>Marketplace Listings</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce sm:bottom-8">
          <div className="border-white/30 flex h-8 w-5 justify-center rounded-full border-2 sm:h-10 sm:w-6">
            <div className="bg-white/50 mt-1.5 h-2 w-0.5 animate-pulse rounded-full sm:mt-2 sm:h-3 sm:w-1"></div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16 md:mb-20">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
              See it in action
            </h2>
            <p className="mx-auto max-w-2xl px-4 text-base text-gray-300 sm:text-lg md:text-xl">
              Real screenshots from the Collectibles Tracker platform
            </p>
          </div>

          {/* Main Screenshots */}
          <div className="mb-16 grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Desktop Screenshot */}
            <div className="group relative order-2 lg:order-1">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl transition-all duration-300 group-hover:blur-2xl sm:-inset-4 sm:rounded-3xl"></div>
              <div className="bg-white/5 border-white/10 hover:border-white/20 relative rounded-2xl border p-4 backdrop-blur-sm transition-all duration-300 sm:rounded-3xl sm:p-6 lg:p-8">
                <button
                  onClick={() =>
                    openModal(
                      '/screenshots/dashboard.png',
                      'Desktop Dashboard',
                      'Complete collection overview with advanced analytics and real-time valuations'
                    )
                  }
                  className="w-full cursor-pointer"
                >
                  <OptimizedImage
                    src="/screenshots/dashboard.png"
                    alt="Desktop Dashboard"
                    className="w-full rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105 sm:rounded-2xl"
                    loading="lazy"
                    decoding="async"
                    width="1013"
                    height="871"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </button>
                <div className="mt-4 text-center sm:mt-6">
                  <h3 className="mb-1 text-lg font-bold sm:mb-2 sm:text-xl lg:text-2xl">
                    Desktop Dashboard
                  </h3>
                  <p className="text-sm text-gray-400 sm:text-base">
                    Complete collection overview with advanced analytics
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Screenshot */}
            <div className="group relative order-1 lg:order-2">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl transition-all duration-300 group-hover:blur-2xl sm:-inset-4 sm:rounded-3xl"></div>
              <div className="bg-white/5 border-white/10 hover:border-white/20 relative rounded-2xl border p-4 backdrop-blur-sm transition-all duration-300 sm:rounded-3xl sm:p-6 lg:p-8">
                <button
                  onClick={() =>
                    openModal(
                      '/screenshots/phonemockup.png',
                      'Mobile Experience',
                      'Track your collection anywhere with our mobile-optimized interface'
                    )
                  }
                  className="w-full cursor-pointer"
                >
                  <OptimizedImage
                    src="/screenshots/phonemockup.png"
                    alt="Mobile App"
                    className="mx-auto w-full max-w-xs rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105 sm:max-w-sm sm:rounded-2xl"
                    loading="lazy"
                    decoding="async"
                    width="405"
                    height="870"
                    sizes="(max-width: 640px) 320px, 405px"
                  />
                </button>
                <div className="mt-4 text-center sm:mt-6">
                  <h3 className="mb-1 text-lg font-bold sm:mb-2 sm:text-xl lg:text-2xl">
                    Mobile Experience
                  </h3>
                  <p className="text-sm text-gray-400 sm:text-base">
                    Track your collection anywhere, anytime
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Everything you need in one platform section */}
          <div className="mb-12 text-center sm:mb-16 md:mb-20">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
              Everything you need in
              <span className="block text-blue-400">one platform</span>
            </h2>
            <p className="mx-auto max-w-2xl px-4 text-base text-gray-300 sm:text-lg md:text-xl">
              Professional tools for serious collectors and investors
            </p>
          </div>

          <div className="mb-16 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {[
              {
                icon: '📊',
                title: 'Portfolio Tracking',
                desc: 'Monitor your collection value in real-time',
              },
              {
                icon: '🏪',
                title: 'Marketplace',
                desc: 'Buy and sell with verified collectors',
              },
              {
                icon: '🔍',
                title: 'Price Discovery',
                desc: 'Get accurate valuations instantly',
              },
              {
                icon: '📱',
                title: 'Mobile Ready',
                desc: 'Access your collection anywhere',
              },
              {
                icon: '🔒',
                title: 'Secure Trading',
                desc: 'Safe transactions with escrow protection',
              },
              {
                icon: '📈',
                title: 'Investment Analytics',
                desc: 'Track performance and trends',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-[rgba(255,255,255,0.1)] bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] p-4 backdrop-blur-sm transition-all duration-300 hover:border-[rgba(255,255,255,0.2)] sm:p-6"
              >
                <div className="mb-3 text-3xl transition-transform duration-300 group-hover:scale-110 sm:mb-4 sm:text-4xl">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold sm:mb-3 sm:text-xl">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400 sm:text-base">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Feature Screenshots Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {[
              {
                src: '/screenshots/addcards.png',
                title: 'Add Items',
                description:
                  'Easy collection management with bulk import and grading integration',
              },
              {
                src: '/screenshots/marketplace.png',
                title: 'Marketplace',
                description:
                  'Buy and sell with verified collectors in a secure environment',
              },
              {
                src: '/screenshots/invoicepaeg.png',
                title: 'Invoices',
                description:
                  'Professional invoice management and transaction tracking',
              },
              {
                src: '/screenshots/marketplacemessages.png',
                title: 'Messages',
                description: 'Secure communication with buyers and sellers',
              },
            ].map((feature) => (
              <div key={feature.title} className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur transition-all duration-300 group-hover:blur-lg"></div>
                <div className="glass-border glass-bg hover:glass-border-light relative rounded-2xl border p-4 backdrop-blur-sm transition-all duration-300">
                  <button
                    onClick={() =>
                      openModal(feature.src, feature.title, feature.description)
                    }
                    className="w-full cursor-pointer"
                  >
                    <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-[rgba(31,41,55,0.5)] to-[rgba(17,24,39,0.5)]">
                      <OptimizedImage
                        src={feature.src}
                        alt={feature.title}
                        className="size-full object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                        decoding="async"
                        width="300"
                        height="300"
                        sizes="(max-width: 640px) 300px, (max-width: 1024px) 200px, 150px"
                      />
                    </div>
                  </button>
                  <h3 className="mb-2 text-center font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-center text-xs leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-black px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <h2 className="mb-6 text-4xl font-bold sm:text-5xl">
              Trusted by collectors
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of collecting enthusiasts
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass-border glass-gradient rounded-2xl border p-8 backdrop-blur-sm">
              <div className="mb-4 flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span key={`star-${i + 1}`} className="material-icons">
                    star
                  </span>
                ))}
              </div>
              <p className="mb-6 leading-relaxed text-gray-300">
                "I was able to sell my rare collectible for a great price thanks
                to the marketplace. The grading integration made it easy to
                price my item accurately."
              </p>
              <div className="font-semibold">Marcus, Sydney</div>
            </div>

            <div className="glass-border glass-gradient rounded-2xl border p-8 backdrop-blur-sm">
              <div className="mb-4 flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span key={`star-${i + 1}`} className="material-icons">
                    star
                  </span>
                ))}
              </div>
              <p className="mb-6 leading-relaxed text-gray-300">
                "I've been using Collectibles Tracker for a few months now and
                it's been a game changer for my collection. The investment
                tracking features are incredibly useful."
              </p>
              <div className="font-semibold">Sarah, Melbourne</div>
            </div>

            <div className="glass-border glass-gradient rounded-2xl border p-8 backdrop-blur-sm">
              <div className="mb-4 flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span key={`star-${i + 1}`} className="material-icons">
                    star
                  </span>
                ))}
              </div>
              <p className="mb-6 leading-relaxed text-gray-300">
                "I was blown away by the ease of use and features of
                Collectibles Tracker. It's the perfect platform for any serious
                collector."
              </p>
              <div className="font-semibold">James, Brisbane</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-black px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold sm:text-5xl">
            Unlock the full potential of MyCardTracker
          </h2>
          <p className="mb-16 text-xl text-gray-300">
            Get access to all features and tools for a low monthly fee
          </p>

          <div className="glass-border glass-gradient mx-auto max-w-md rounded-3xl border p-12 backdrop-blur-sm">
            <div className="mb-4 text-6xl font-bold">
              <span className="text-4xl text-gray-400">$</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                12.99
              </span>
            </div>
            <div className="mb-8 text-gray-400">per month</div>

            <ul className="mb-12 space-y-4 text-left">
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-green-500/20">
                  <span className="material-icons text-sm text-green-400">
                    check
                  </span>
                </span>
                <span>Unlimited item tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-green-500/20">
                  <span className="material-icons text-sm text-green-400">
                    check
                  </span>
                </span>
                <span>Grading integration</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-green-500/20">
                  <span className="material-icons text-sm text-green-400">
                    check
                  </span>
                </span>
                <span>Marketplace access</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-green-500/20">
                  <span className="material-icons text-sm text-green-400">
                    check
                  </span>
                </span>
                <span>Investment analytics</span>
              </li>
            </ul>

            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 py-4 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/25"
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
