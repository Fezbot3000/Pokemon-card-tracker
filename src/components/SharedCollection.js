import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { Card, Button, formatCurrency } from '../design-system';
import sharingService from '../services/sharingService';

// Simple components to replace missing design system components
const Spinner = ({ size = 'medium' }) => (
  <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${
    size === 'large' ? 'h-12 w-12' : 'h-6 w-6'
  }`}></div>
);

const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    {...props}
  />
);

const Select = ({ className = '', children, ...props }) => (
  <select
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    {...props}
  >
    {children}
  </select>
);

const Avatar = ({ src, alt, size = 'medium', fallback }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-10 w-10',
    large: 'h-12 w-12'
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="text-gray-600 dark:text-gray-300 font-medium">
          {fallback || alt?.charAt(0) || '?'}
        </span>
      )}
    </div>
  );
};

const SharedCollection = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'value',
    category: 'all',
    grading: 'all'
  });
  const [stats, setStats] = useState(null);
  const [metaTags, setMetaTags] = useState({});

  useEffect(() => {
    loadSharedCollection();
  }, [shareId]);

  useEffect(() => {
    console.log('=== CARDS EFFECT TRIGGERED ===');
    console.log('Cards length:', cards.length);
    console.log('Filters:', filters);
    
    if (cards.length > 0) {
      console.log('Processing cards for display...');
      const filtered = sharingService.filterAndSortCards(cards, filters);
      console.log('Filtered cards:', filtered.length);
      setFilteredCards(filtered);
      
      console.log('Calculating collection stats...');
      const collectionStats = sharingService.formatCollectionStats(cards);
      console.log('Stats calculated:', collectionStats);
      setStats(collectionStats);
    } else {
      console.log('No cards to process');
    }
  }, [cards, filters]);

  // Update meta tags whenever shareData or cards change
  useEffect(() => {
    if (shareData) {
      const newMetaTags = sharingService.generateMetaTags(shareData, cards);
      setMetaTags(newMetaTags);
      console.log('Meta tags updated with cards:', newMetaTags);
    }
  }, [shareData, cards]);

  const loadSharedCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== LOADING SHARED COLLECTION ===');
      console.log('Share ID:', shareId);

      // Get the share data using the service
      const shareData = await sharingService.getSharedCollection(shareId);
      console.log('Share data loaded:', shareData);
      setShareData(shareData);

      // Load the cards from the user's collection
      const cardsRef = collection(firestoreDb, 'users', shareData.userId, 'cards');
      
      console.log('Loading cards for user:', shareData.userId);
      console.log('Collection ID:', shareData.collectionId);

      let allCards = [];

      if (shareData.collectionId && shareData.collectionId !== 'all') {
        console.log('Loading specific collection:', shareData.collectionId);
        
        // Query for cards using multiple possible field names
        // We need to run separate queries since Firestore doesn't support OR queries across different fields
        const queries = [
          // Query by collectionId field
          query(cardsRef, where('collectionId', '==', shareData.collectionId)),
          // Query by collection field  
          query(cardsRef, where('collection', '==', shareData.collectionId)),
          // Query by collectionName field
          query(cardsRef, where('collectionName', '==', shareData.collectionId))
        ];

        // Execute all queries and combine results
        const queryPromises = queries.map(async (q, index) => {
          try {
            const snapshot = await getDocs(q);
            console.log(`Query ${index + 1} (${['collectionId', 'collection', 'collectionName'][index]}) found:`, snapshot.docs.length, 'cards');
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (error) {
            console.warn(`Query ${index + 1} failed:`, error);
            return [];
          }
        });

        const queryResults = await Promise.all(queryPromises);
        
        // Combine and deduplicate results (same card might be found by multiple queries)
        const cardMap = new Map();
        queryResults.forEach(cards => {
          cards.forEach(card => {
            if (!cardMap.has(card.id)) {
              cardMap.set(card.id, card);
            }
          });
        });
        
        allCards = Array.from(cardMap.values());
        console.log(`Total unique cards found across all queries: ${allCards.length}`);
        
      } else {
        // Load all collections - use simple query without orderBy to avoid updatedAt issues
        console.log('Loading all collections');
        const cardsQuery = query(cardsRef);
        const cardsSnapshot = await getDocs(cardsQuery);
        allCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Query results - all cards found:', allCards.length);
      }

      // Sort cards by updatedAt if available, otherwise by creation order
      allCards.sort((a, b) => {
        const aDate = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bDate = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bDate - aDate; // Descending order (newest first)
      });

      console.log('Final processed cards:', allCards.length);
      console.log('Sample card (first one):', allCards[0]);
      
      // Debug: Show which field names were found in the cards
      if (allCards.length > 0) {
        const fieldAnalysis = {
          collectionId: allCards.filter(card => card.collectionId === shareData.collectionId).length,
          collection: allCards.filter(card => card.collection === shareData.collectionId).length,
          collectionName: allCards.filter(card => card.collectionName === shareData.collectionId).length,
          hasUpdatedAt: allCards.filter(card => !!card.updatedAt).length,
          hasCreatedAt: allCards.filter(card => !!card.createdAt).length
        };
        console.log('Field analysis for found cards:', fieldAnalysis);
      }
      
      setCards(allCards);
    } catch (err) {
      console.error('=== ERROR LOADING SHARED COLLECTION ===');
      console.error('Error details:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      setError(err.message || 'Failed to load collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleShare = async () => {
    if (shareData) {
      const success = await sharingService.shareCollection(shareData);
      if (success) {
        // Toast notification would be shown by the service
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Collection Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="primary">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Helmet>
        <title>{metaTags.title}</title>
        <meta name="description" content={metaTags.description} />
        <meta property="og:title" content={metaTags.title} />
        <meta property="og:description" content={metaTags.description} />
        <meta property="og:type" content={metaTags.type} />
        <meta property="og:url" content={metaTags.url} />
        <meta property="og:image" content={metaTags.image} />
        <meta property="og:site_name" content={metaTags.siteName} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTags.title} />
        <meta name="twitter:description" content={metaTags.description} />
        <meta name="twitter:image" content={metaTags.image} />
      </Helmet>

      {/* Header */}
      <div className="bg-white dark:bg-[#0F0F0F] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar 
                src={shareData.ownerAvatar} 
                alt={shareData.ownerName}
                size="large"
                fallback={shareData.ownerName?.charAt(0) || 'C'}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔥 UPDATED: {shareData.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  by {shareData.ownerName}
                </p>
                {shareData.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {shareData.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center space-x-2"
              >
                <span>📤</span>
                <span>Share</span>
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats && formatCurrency(stats.totalValue, 'AUD')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  Total Collection Value
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalCards}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                Total Cards
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.gradedCards}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                Graded Cards
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.categories}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                Categories
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(Math.round(stats.averageValue), 'AUD')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                Avg. Card Value
              </div>
            </Card>
          </div>

          {/* Filters - Updated with black background instead of Card component */}
          <div className="bg-black dark:bg-black p-4 mb-6 rounded-lg border border-gray-700 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Search cards..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600 text-white dark:text-white"
              />
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600 text-white dark:text-white"
              >
                <option value="all">All Categories</option>
                {stats.categoryList.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <Select
                value={filters.grading}
                onChange={(e) => handleFilterChange('grading', e.target.value)}
                className="w-full bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600 text-white dark:text-white"
              >
                <option value="all">All Cards</option>
                <option value="graded">Graded Only</option>
                <option value="ungraded">Ungraded Only</option>
              </Select>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600 text-white dark:text-white"
              >
                <option value="value">Sort by Value (High to Low)</option>
                <option value="name">Sort by Name</option>
                <option value="set">Sort by Set</option>
                <option value="year">Sort by Year</option>
                <option value="grade">Sort by Grade</option>
                <option value="dateAdded">Sort by Date Added</option>
              </Select>
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-300 dark:text-gray-300">
                  {filteredCards.length} of {cards.length} cards
                </span>
              </div>
            </div>
          </div>

          {/* Cards Grid - Now showing all filtered cards without pagination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {filteredCards.map(card => (
              <Card key={card.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative p-2">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name || card.card}
                      className="w-full h-full object-contain rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🎴</span>
                    </div>
                  )}
                  {(card.gradingCompany || card.gradeCompany || card.certificationNumber) && (
                    <Badge
                      variant="primary"
                      className="absolute top-2 right-2"
                    >
                      {card.gradingCompany || card.gradeCompany || 'PSA'} {card.grade}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {card.cardName || card.name || card.card || 'Unnamed Card'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-500 truncate">
                    {card.set || card.cardSet} {card.year && `(${card.year})`}
                  </p>
                  {card.player && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {card.player}
                    </p>
                  )}
                  {(card.originalCurrentValueAmount > 0 || card.currentValueAUD > 0 || card.currentValue > 0) && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                      {formatCurrency(card.originalCurrentValueAmount || card.currentValueAUD || card.currentValue, 'AUD')}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              Powered by <strong>MyCardTracker</strong> - The ultimate trading card tracker
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
            >
              Start Your Own Collection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedCollection;
