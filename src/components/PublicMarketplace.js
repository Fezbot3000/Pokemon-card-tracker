import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import LoginModal from '../design-system/components/LoginModal';
import ImageModal from '../design-system/atoms/ImageModal'; // Import ImageModal component

const PublicMarketplace = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cardImages, setCardImages] = useState({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Add state for selected image
  const navigate = useNavigate();

  // Helper function to ensure we have a string URL (same as authenticated marketplace)
  const ensureStringUrl = (imageData) => {
    if (!imageData) return null;

    // If it's already a string, return it
    if (typeof imageData === 'string') {
      return imageData;
    }

    // If it's a File object with a preview URL
    if (imageData instanceof File && window.URL) {
      return window.URL.createObjectURL(imageData);
    }

    // If it's an object with a URL property, use that
    if (typeof imageData === 'object') {
      // Check for common URL properties
      if (imageData.url) return imageData.url;
      if (imageData.src) return imageData.src;
      if (imageData.uri) return imageData.uri;
      if (imageData.href) return imageData.href;
      if (imageData.downloadURL) return imageData.downloadURL;
      if (imageData.path && typeof imageData.path === 'string') return imageData.path;

      // If it has a toString method, try that
      if (typeof imageData.toString === 'function') {
        const stringValue = imageData.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      }
    }

    // If it's a Blob with a type
    if (imageData instanceof Blob && imageData.type && imageData.type.startsWith('image/')) {
      return window.URL.createObjectURL(imageData);
    }

    // If we can't extract a URL, return null
    return null;
  };

  // Load card images (same logic as authenticated marketplace)
  const loadCardImages = async (listingsData) => {
    if (!listingsData || listingsData.length === 0) return;

    const newCardImages = {};

    // Process each listing
    for (const listing of listingsData) {
      try {
        const card = listing.card;
        if (!card) continue;

        const cardId = card.slabSerial || card.id || listing.cardId;
        if (!cardId) continue;

        // First, check if the card has an imageUrl property
        if (card.imageUrl) {
          const url = ensureStringUrl(card.imageUrl);
          if (url) {
            newCardImages[cardId] = url;
            continue;
          }
        }

        // Next, check if the card has an image property
        if (card.image) {
          const imageUrl = ensureStringUrl(card.image);
          if (imageUrl) {
            newCardImages[cardId] = imageUrl;
            continue;
          }
        }

        // Check all other possible image properties
        const possibleImageProps = ['frontImageUrl', 'backImageUrl', 'imageData', 'cardImageUrl'];
        let foundImage = false;

        for (const prop of possibleImageProps) {
          if (card[prop]) {
            const url = ensureStringUrl(card[prop]);
            if (url) {
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        if (foundImage) continue;

        // Check listing-level image properties
        const listingImageProps = ['cloudImageUrl', 'imageURL', 'imageUrl'];
        for (const prop of listingImageProps) {
          if (listing[prop]) {
            const url = ensureStringUrl(listing[prop]);
            if (url) {
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        // If we still don't have an image, set to null
        if (!foundImage) {
          newCardImages[cardId] = null;
        }
      } catch (error) {
        console.warn('Error processing image for listing:', listing.id, error);
      }
    }

    setCardImages(newCardImages);
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
        
        // First try with the same query structure as authenticated marketplace
        let marketplaceQuery;
        try {
          marketplaceQuery = query(
            marketplaceRef,
            where('status', '==', 'available'),
            orderBy('timestampListed', 'desc'),
            limit(50)
          );
        } catch (indexError) {
          // Fallback to simpler query if index is building
          console.warn('Using fallback query due to index building:', indexError);
          marketplaceQuery = query(
            marketplaceRef,
            where('status', '==', 'available'),
            limit(50)
          );
        }
        
        const querySnapshot = await getDocs(marketplaceQuery);
        let listingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Manual sort if we used fallback query
        if (listingsData.length > 0 && !listingsData[0].timestampListed) {
          // Try with different timestamp field names
          listingsData.sort((a, b) => {
            const timeA = a.timestampListed?.seconds || a.createdAt?.seconds || 0;
            const timeB = b.timestampListed?.seconds || b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        
        setListings(listingsData);
        
        // Load card images after getting listings
        await loadCardImages(listingsData);
      } catch (err) {
        console.error('Error fetching marketplace listings:', err);
        setError('Unable to load marketplace listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const handleSignUpPrompt = () => {
    navigate('/login');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(price);
  };

  // Get card name using same logic as MarketplaceCard
  const getCardName = (listing) => {
    const card = listing.card || {};
    return card.cardName || card.card || card.name || card.player || listing.title || 'Unnamed Card';
  };

  // Get card image using loaded images
  const getCardImage = (listing) => {
    const card = listing.card || {};
    const cardId = card.slabSerial || card.id || listing.cardId;
    return cardImages[cardId] || null;
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>Pokemon Card Marketplace Australia | Buy & Sell Trading Cards</title>
        <meta name="description" content="Browse Pokemon cards for sale in Australia. Find graded cards, vintage collections, and rare Pokemon cards from trusted sellers. Join our secure marketplace today!" />
        <meta name="keywords" content="pokemon cards for sale australia, buy pokemon cards online, sell pokemon cards australia, pokemon card marketplace, graded pokemon cards for sale, vintage pokemon cards australia, PSA pokemon cards, BGS pokemon cards, pokemon trading cards marketplace" />
        <meta property="og:title" content="Pokemon Card Marketplace Australia | Buy & Sell Trading Cards" />
        <meta property="og:description" content="Browse Pokemon cards for sale in Australia. Find graded cards, vintage collections, and rare Pokemon cards from trusted sellers." />
        <meta property="og:url" content="https://www.mycardtracker.com.au/marketplace" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.mycardtracker.com.au/marketplace" />
      </Helmet>
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Secure Trading Platform
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Pokemon Card
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Marketplace
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Discover rare Pokemon cards, graded collectibles, and vintage treasures from trusted sellers across Australia.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSignUpPrompt}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
            >
              Join to Buy & Sell
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Contact Sellers
            </button>
          </div>
        </div>
      </section>

      {/* Marketplace Content */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Latest Listings</h2>
            <p className="text-gray-400">Browse the newest Pokemon cards available in our marketplace</p>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md mx-auto">
                <div className="text-red-400 text-4xl mb-4">⚠️</div>
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white/5 rounded-xl p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
                <p className="text-gray-400 mb-6">Be the first to list your Pokemon cards!</p>
                <button
                  onClick={handleSignUpPrompt}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Listing
                </button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group">
                  <div className="aspect-square relative overflow-hidden">
                    {getCardImage(listing) ? (
                      <img
                        src={getCardImage(listing)}
                        alt={getCardName(listing)}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setSelectedImage({
                          src: getCardImage(listing),
                          alt: getCardName(listing)
                        })}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-4xl">🎴</span>
                      </div>
                    )}
                    {listing.card?.grade && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded-lg text-xs font-bold">
                        {listing.card.grader ? `${listing.card.grader} ${listing.card.grade}` : listing.card.grade}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">{getCardName(listing)}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl font-bold text-green-400">
                        {formatPrice(listing.listingPrice || listing.priceAUD || listing.price)}
                      </span>
                      {listing.condition && (
                        <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                          {listing.condition}
                        </span>
                      )}
                    </div>
                    
                    {listing.location && (
                      <p className="text-gray-400 text-sm mb-3">📍 {listing.location}</p>
                    )}
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
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
            <div className="text-center mt-12">
              <div className="bg-white/5 rounded-xl p-8 max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold mb-4">Want to see more listings?</h3>
                <p className="text-gray-400 mb-6">Join our community to access all marketplace features, contact sellers, and list your own cards for sale.</p>
                <button
                  onClick={handleSignUpPrompt}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
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
