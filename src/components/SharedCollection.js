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
    sortBy: 'name',
    category: 'all',
    grading: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);
  const cardsPerPage = 12;

  useEffect(() => {
    loadSharedCollection();
  }, [shareId]);

  useEffect(() => {
    if (cards.length > 0) {
      const filtered = sharingService.filterAndSortCards(cards, filters);
      setFilteredCards(filtered);
      setCurrentPage(1);
      
      const collectionStats = sharingService.formatCollectionStats(cards);
      setStats(collectionStats);
    }
  }, [cards, filters]);

  const loadSharedCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the share data using the service
      const shareData = await sharingService.getSharedCollection(shareId);
      setShareData(shareData);

      // Load the cards from the user's collection
      const cardsRef = collection(firestoreDb, 'users', shareData.userId, 'cards');
      let cardsQuery;

      if (shareData.collectionId && shareData.collectionId !== 'all') {
        // Load specific collection
        cardsQuery = query(
          cardsRef,
          where('collectionId', '==', shareData.collectionId),
          orderBy('name')
        );
      } else {
        // Load all collections
        cardsQuery = query(cardsRef, orderBy('name'));
      }

      const cardsSnapshot = await getDocs(cardsQuery);
      const cardsData = cardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCards(cardsData);
    } catch (err) {
      console.error('Error loading shared collection:', err);
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

  const getPaginatedCards = () => {
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    return filteredCards.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);

  // Generate meta tags for social sharing
  const metaTags = shareData ? sharingService.generateMetaTags(shareData) : {};

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
                  {shareData.title}
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

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Search cards..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full"
              >
                <option value="all">All Categories</option>
                {stats.categoryList.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <Select
                value={filters.grading}
                onChange={(e) => handleFilterChange('grading', e.target.value)}
                className="w-full"
              >
                <option value="all">All Cards</option>
                <option value="graded">Graded Only</option>
                <option value="ungraded">Ungraded Only</option>
              </Select>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full"
              >
                <option value="name">Sort by Name</option>
                <option value="set">Sort by Set</option>
                <option value="year">Sort by Year</option>
                <option value="grade">Sort by Grade</option>
                <option value="value">Sort by Value</option>
                <option value="dateAdded">Sort by Date Added</option>
              </Select>
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  {filteredCards.length} of {cards.length} cards
                </span>
              </div>
            </div>
          </Card>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {getPaginatedCards().map(card => (
              <Card key={card.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🎴</span>
                    </div>
                  )}
                  {card.gradingCompany && (
                    <Badge
                      variant="primary"
                      className="absolute top-2 right-2"
                    >
                      {card.gradingCompany} {card.grade}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {card.name || 'Unnamed Card'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-500 truncate">
                    {card.set} {card.year && `(${card.year})`}
                  </p>
                  {card.player && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {card.player}
                    </p>
                  )}
                  {card.currentValue > 0 && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                      {formatCurrency(card.currentValue, 'AUD')}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "primary" : "outline"}
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              Powered by <strong>Collectr</strong> - The ultimate trading card tracker
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
