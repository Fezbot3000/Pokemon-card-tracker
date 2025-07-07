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
    size === 'large' ? 'size-12' : 'size-6'
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${className}`}
    {...props}
  />
);

const Select = ({ className = '', children, ...props }) => (
  <select
    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${className}`}
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
    <div className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600`}>
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">
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
    if (cards.length > 0) {
      const filtered = sharingService.filterAndSortCards(cards, filters);
      setFilteredCards(filtered);
      
      const collectionStats = sharingService.formatCollectionStats(cards);
      setStats(collectionStats);
    }
  }, [cards, filters]);

  // Update meta tags whenever shareData or cards change
  useEffect(() => {
    if (shareData) {
      const newMetaTags = sharingService.generateMetaTags(shareData, cards);
      setMetaTags(newMetaTags);
    }
  }, [shareData, cards]);

  const loadSharedCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the share data using the service
      const shareData = await sharingService.getSharedCollection(shareId);
      setShareData(shareData);

      // Load the cards from the user's collection
      const cardsRef = collection(firestoreDb, 'users', shareData.userId, 'cards');

      let allCards = [];

      if (shareData.collectionId && shareData.collectionId !== 'all') {
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
      } else {
        // Load all collections - use simple query without orderBy to avoid updatedAt issues
        const cardsQuery = query(cardsRef);
        const cardsSnapshot = await getDocs(cardsQuery);
        allCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Sort cards by updatedAt if available, otherwise by creation order
      allCards.sort((a, b) => {
        const aDate = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bDate = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bDate - aDate; // Descending order (newest first)
      });
      
      // Debug: Show which field names were found in the cards
      if (allCards.length > 0) {
        const fieldAnalysis = {
          collectionId: allCards.filter(card => card.collectionId === shareData.collectionId).length,
          collection: allCards.filter(card => card.collection === shareData.collectionId).length,
          collectionName: allCards.filter(card => card.collectionName === shareData.collectionId).length,
          hasUpdatedAt: allCards.filter(card => !!card.updatedAt).length,
          hasCreatedAt: allCards.filter(card => !!card.createdAt).length
        };
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-4 text-6xl">😔</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Collection Not Available
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
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
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0F0F0F]">
        <div className="mx-auto max-w-7xl p-3 sm:p-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="block sm:hidden">
            <div className="mb-3 flex items-start space-x-3">
              <Avatar 
                src={shareData.ownerAvatar} 
                alt={shareData.ownerName}
                size="medium"
                fallback={shareData.ownerName?.charAt(0) || 'C'}
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                  🔥 UPDATED: {shareData.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  by {shareData.ownerName}
                </p>
                {shareData.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-500">
                    {shareData.description}
                  </p>
                )}
              </div>
            </div>
          <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats && formatCurrency(stats.totalValue, 'AUD')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Total Value
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center space-x-1 px-3 py-2 text-sm"
              >
                <span>📤</span>
                <span>Share</span>
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden items-center justify-between sm:flex">
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
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
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
        <div className="mx-auto max-w-7xl px-3 py-4 sm:p-6 lg:px-8">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4 sm:gap-4">
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {stats.totalCards}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 sm:text-sm">
                Total Cards
              </div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {stats.gradedCards}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 sm:text-sm">
                Graded Cards
              </div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {stats.categories}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 sm:text-sm">
                Categories
              </div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                {formatCurrency(Math.round(stats.averageValue), 'AUD')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 sm:text-sm">
                Avg. Card Value
              </div>
            </Card>
          </div>

          {/* Filters - Mobile optimized */}
          <div className="mb-4 rounded-lg border border-gray-700 bg-black p-3 dark:border-gray-700 dark:bg-black sm:mb-6 sm:p-4">
            {/* Mobile Layout */}
            <div className="block space-y-3 sm:hidden">
              <Input
                placeholder="Search cards..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full border-gray-600 bg-gray-800 text-sm text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full border-gray-600 bg-gray-800 text-sm text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {stats.categoryList.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
                <Select
                  value={filters.grading}
                  onChange={(e) => handleFilterChange('grading', e.target.value)}
                  className="w-full border-gray-600 bg-gray-800 text-sm text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Cards</option>
                  <option value="graded">Graded Only</option>
                  <option value="ungraded">Ungraded Only</option>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="mr-3 flex-1 border-gray-600 bg-gray-800 text-sm text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="value">Value ↓</option>
                  <option value="name">Name</option>
                  <option value="set">Set</option>
                  <option value="year">Year</option>
                  <option value="grade">Grade</option>
                  <option value="dateAdded">Date Added</option>
                </Select>
                <span className="whitespace-nowrap text-xs text-gray-300 dark:text-gray-300">
                  {filteredCards.length}/{cards.length}
                </span>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden grid-cols-1 gap-4 sm:grid md:grid-cols-5">
              <Input
                placeholder="Search cards..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full border-gray-600 bg-gray-800 text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full border-gray-600 bg-gray-800 text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Categories</option>
                {stats.categoryList.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <Select
                value={filters.grading}
                onChange={(e) => handleFilterChange('grading', e.target.value)}
                className="w-full border-gray-600 bg-gray-800 text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Cards</option>
                <option value="graded">Graded Only</option>
                <option value="ungraded">Ungraded Only</option>
              </Select>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full border-gray-600 bg-gray-800 text-white dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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

          {/* Cards Grid - Mobile optimized */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCards.map(card => (
              <Card key={card.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-[3/4] bg-gray-100 p-1 dark:bg-gray-800 sm:p-2">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name || card.card}
                      className="size-full rounded-lg object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-gray-400">
                      <span className="text-2xl sm:text-4xl">🎴</span>
                    </div>
                  )}
                  {(card.gradingCompany || card.gradeCompany || card.certificationNumber) && (
                    <Badge
                      variant="primary"
                      className="absolute right-1 top-1 text-xs sm:right-2 sm:top-2"
                    >
                      {card.gradingCompany || card.gradeCompany || 'PSA'} {card.grade}
                    </Badge>
                  )}
                </div>
                <div className="p-2 sm:p-4">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                    {card.cardName || card.name || card.card || 'Unnamed Card'}
                  </h3>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-500 sm:text-sm">
                    {card.set || card.cardSet} {card.year && `(${card.year})`}
                  </p>
                  {card.player && (
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                      {card.player}
                    </p>
                  )}
                  {(card.originalCurrentValueAmount > 0 || card.currentValueAUD > 0 || card.currentValue > 0) && (
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white sm:mt-2 sm:text-lg">
                      {formatCurrency(card.originalCurrentValueAmount || card.currentValueAUD || card.currentValue, 'AUD')}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-gray-200 py-6 text-center dark:border-gray-800 sm:mt-12 sm:py-8">
            <p className="mb-4 px-4 text-sm text-gray-500 dark:text-gray-500 sm:text-base">
              Powered by <strong>MyCardTracker</strong> - The ultimate trading card tracker
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base"
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
