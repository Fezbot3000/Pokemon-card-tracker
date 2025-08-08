import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase-unified';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import LoginModal from '../design-system/components/LoginModal';
import ImageModal from '../design-system/atoms/ImageModal'; // Import ImageModal component
import MarketplaceImageService from '../services/MarketplaceImageService';
import logger from '../services/LoggingService';

const PublicMarketplace = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cardImages, setCardImages] = useState({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Add state for selected image
  const navigate = useNavigate();
  const { formatAmountForDisplay } = useUserPreferences();

  // Load card images using centralized service
  const loadCardImages = useCallback(async listingsData => {
    if (!listingsData || listingsData.length === 0) return;

    const newCardImages = await MarketplaceImageService.loadCardImages(listingsData, cardImages);
    setCardImages(newCardImages);
  }, [cardImages]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);

        const marketplaceRef = collection(firestoreDb, 'marketplaceItems');

        // Use a simple query without composite index to avoid deployment issues
        const marketplaceQuery = query(
            marketplaceRef,
            where('status', '==', 'available'),
            limit(50)
          );

        const querySnapshot = await getDocs(marketplaceQuery);
        let listingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort manually on the client side
          listingsData.sort((a, b) => {
            const timeA =
              a.timestampListed?.seconds || a.createdAt?.seconds || 0;
            const timeB =
              b.timestampListed?.seconds || b.createdAt?.seconds || 0;
            return timeB - timeA;
          });

        setListings(listingsData);

        // Load card images after getting listings
        await loadCardImages(listingsData);
      } catch (err) {
        logger.error('Error fetching marketplace listings:', err);
        
        // Provide specific error messages for common network issues
        let errorMessage = 'Unable to load marketplace listings. Please try again later.';
        
        if (err.code === 'failed-precondition' || err.message?.includes('offline')) {
          errorMessage = 'You appear to be offline. Please check your internet connection.';
        } else if (err.message?.includes('ERR_BLOCKED_BY_CLIENT') || err.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
          errorMessage = 'Network request blocked. Please check if you have ad blockers or firewall restrictions that might be blocking Firebase requests.';
        } else if (err.code === 'permission-denied') {
          errorMessage = 'Permission denied. Unable to access marketplace data.';
        } else if (err.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [loadCardImages]);

  const handleSignUpPrompt = () => {
    navigate('/login');
  };

  const formatPrice = (price, currency = 'AUD') => {
    return formatAmountForDisplay(price, currency);
  };

  // Get card name using same logic as MarketplaceCard
  const getCardName = listing => {
    const card = listing.card || {};
    return (
      card.cardName ||
      card.card ||
      card.name ||
      card.player ||
      listing.title ||
      'Unnamed Card'
    );
  };

  // Get card image using loaded images
  const getCardImage = listing => {
    const card = listing.card || {};
    const cardId = card.slabSerial || card.id || listing.cardId;
    return cardImages[cardId] || null;
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>
          Pokemon Card Marketplace Australia | Buy & Sell Trading Cards
        </title>
        <meta
          name="description"
          content="Browse Pokemon cards for sale in Australia. Find graded cards, vintage collections, and rare Pokemon cards from trusted sellers. Join our secure marketplace today!"
        />
        <meta
          name="keywords"
          content="pokemon cards for sale australia, buy pokemon cards online, sell pokemon cards australia, pokemon card marketplace, graded pokemon cards for sale, vintage pokemon cards australia, PSA pokemon cards, BGS pokemon cards, pokemon trading cards marketplace"
        />
        <meta
          property="og:title"
          content="Pokemon Card Marketplace Australia | Buy & Sell Trading Cards"
        />
        <meta
          property="og:description"
          content="Browse Pokemon cards for sale in Australia. Find graded cards, vintage collections, and rare Pokemon cards from trusted sellers."
        />
        <meta
          property="og:url"
          content="https://www.mycardtracker.com.au/marketplace"
        />
        <meta property="og:type" content="website" />
        <link
          rel="canonical"
          href="https://www.mycardtracker.com.au/marketplace"
        />

        {/* Structured Data for Marketplace */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Pokemon Card Marketplace Australia',
            description: 'Browse Pokemon cards for sale in Australia. Find graded cards, vintage collections, and rare Pokemon cards from trusted sellers.',
            url: 'https://www.mycardtracker.com.au/marketplace',
            mainEntity: {
              '@type': 'Marketplace',
              name: 'MyCardTracker Marketplace',
              description: 'Secure marketplace for buying and selling Pokemon trading cards in Australia',
              areaServed: {
                '@type': 'Country',
                name: 'Australia'
              },
              acceptedPaymentMethod: [
                'http://purl.org/goodrelations/v1#PayPal',
                'http://purl.org/goodrelations/v1#ByBankTransferInAdvance'
              ],
              category: 'Trading Cards',
              itemListElement: listings?.slice(0, 10).map((listing, index) => ({
                '@type': 'Product',
                position: index + 1,
                name: getCardName(listing),
                description: `${getCardName(listing)} - ${listing.condition || 'Good'} condition`,
                image: getCardImage(listing) || 'https://www.mycardtracker.com.au/card-images/DefaultCard.png',
                offers: {
                  '@type': 'Offer',
                  price: listing.price || 0,
                  priceCurrency: listing.currency || 'AUD',
                  availability: 'https://schema.org/InStock',
                  seller: {
                    '@type': 'Person',
                    name: listing.sellerName || 'Card Seller'
                  }
                },
                category: 'Pokemon Trading Cards'
              })) || []
            }
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
            Secure Trading Platform
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Pokemon Card
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Marketplace
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Discover rare Pokemon cards, graded collectibles, and vintage
            treasures from trusted sellers across Australia.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={handleSignUpPrompt}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700"
            >
              Join to Buy & Sell
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white/10 hover:bg-white/20 border-white/20 rounded-xl border px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all duration-300"
            >
              Contact Sellers
            </button>
          </div>
        </div>
      </section>

      {/* Marketplace Content */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
              Latest Listings
            </h2>
            <p className="text-gray-400">
              Browse the newest Pokemon cards available in our marketplace
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="size-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="py-12 text-center">
              <div className="mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6">
                <div className="mb-4 text-4xl text-red-400">⚠️</div>
                <p className="mb-4 text-red-300">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="py-12 text-center">
              <div className="bg-white/5 mx-auto max-w-md rounded-xl p-8">
                <div className="mb-4 text-6xl">📦</div>
                <h3 className="mb-2 text-xl font-semibold">No listings yet</h3>
                <p className="mb-6 text-gray-400">
                  Be the first to list your Pokemon cards!
                </p>
                <button
                  onClick={handleSignUpPrompt}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                  Create First Listing
                </button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {listings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-white/5 hover:bg-white/10 group overflow-hidden rounded-xl transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden">
                    {getCardImage(listing) ? (
                      <img
                        src={getCardImage(listing)}
                        alt={getCardName(listing)}
                        className="size-full cursor-pointer object-contain transition-transform duration-300 group-hover:scale-105"
                        onClick={() =>
                          setSelectedImage({
                            src: getCardImage(listing),
                            alt: getCardName(listing),
                          })
                        }
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <span className="text-4xl">🎴</span>
                      </div>
                    )}
                    {listing.card?.grade && (
                      <div className="absolute right-2 top-2 rounded-lg bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
                        {listing.card.grader
                          ? `${listing.card.grader} ${listing.card.grade}`
                          : listing.card.grade}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 font-semibold text-white">
                      {getCardName(listing)}
                    </h3>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-400">
                        {formatPrice(
                          listing.listingPrice ||
                            listing.priceAUD ||
                            listing.price,
                          listing.currency || 'AUD'
                        )}
                      </span>
                      {listing.condition && (
                        <span className="bg-white/10 rounded-full px-2 py-1 text-xs text-gray-300">
                          {listing.condition}
                        </span>
                      )}
                    </div>

                    {listing.location && (
                      <p className="mb-3 text-sm text-gray-400">
                        📍 {listing.location}
                      </p>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="bg-white/10 hover:bg-white/20 border-white/20 w-full rounded-lg border px-4 py-2 text-white transition-colors"
                      >
                        Contact Seller
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="mt-12 text-center">
              <div className="bg-white/5 mx-auto max-w-2xl rounded-xl p-8">
                <h3 className="mb-4 text-xl font-semibold">
                  Want to see more listings?
                </h3>
                <p className="mb-6 text-gray-400">
                  Join our community to access all marketplace features, contact
                  sellers, and list your own cards for sale.
                </p>
                <button
                  onClick={handleSignUpPrompt}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700"
                >
                  Join MyCardTracker
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          backdropClassName="fixed inset-0 bg-black/50 backdrop-blur-md"
        />
      )}
      {selectedImage && (
        <ImageModal
          isOpen={Boolean(selectedImage)}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.src}
          alt={selectedImage.alt}
        />
      )}
    </div>
  );
};

export default PublicMarketplace;
