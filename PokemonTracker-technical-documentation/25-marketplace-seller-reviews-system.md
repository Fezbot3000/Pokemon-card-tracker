# Marketplace Seller Details & Reviews System Technical Documentation

## Overview

The Seller Details & Reviews System provides comprehensive seller profiles, rating mechanisms, and review management for marketplace transactions. This system builds trust between buyers and sellers through transparent feedback, detailed seller information, and performance metrics.

## Architecture

### Core Components

#### 1. SellerProfile.js
- **Purpose**: Main seller profile display component
- **Features**: Seller information, stats, listings, reviews overview
- **Location**: `src/components/Marketplace/SellerProfile.js`

#### 2. SellerProfileModal.js
- **Purpose**: Modal interface for detailed seller profile viewing
- **Features**: Comprehensive seller data, navigation, actions
- **Location**: `src/components/Marketplace/SellerProfileModal.js`

#### 3. SellerReviewModal.js
- **Purpose**: Interface for submitting and viewing seller reviews
- **Features**: Rating submission, review text, review history
- **Location**: `src/components/Marketplace/SellerReviewModal.js`

#### 4. ReviewsDisplayComponent.js
- **Purpose**: Component for displaying seller reviews and ratings
- **Features**: Review list, rating aggregation, filtering
- **Location**: `src/components/Marketplace/ReviewsDisplayComponent.js`

## Key Features

### Comprehensive Seller Profile
```javascript
const SellerProfile = ({ sellerId, isModal = false }) => {
  const [sellerData, setSellerData] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSellerProfile = async () => {
      try {
        setLoading(true);
        
        // Load seller basic information
        const sellerDoc = await getDoc(doc(firestoreDb, 'users', sellerId));
        if (sellerDoc.exists()) {
          setSellerData({
            id: sellerId,
            ...sellerDoc.data()
          });
        }

        // Load seller's active listings
        const listingsQuery = query(
          collection(firestoreDb, 'marketplaceItems'),
          where('userId', '==', sellerId),
          where('status', '==', 'available'),
          orderBy('timestampListed', 'desc'),
          limit(12)
        );
        
        const listingsSnapshot = await getDocs(listingsQuery);
        setSellerListings(listingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        // Load seller reviews
        await loadSellerReviews(sellerId);
        
      } catch (error) {
        logger.error('Error loading seller profile:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      loadSellerProfile();
    }
  }, [sellerId]);
};
```

### Rating and Review System
```javascript
const SellerReviewModal = ({ 
  isOpen, 
  onClose, 
  sellerId, 
  listingId, 
  onReviewSubmitted 
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [categories, setCategories] = useState({
    communication: 0,
    packaging: 0,
    shipping: 0,
    accuracy: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      
      const reviewData = {
        reviewerId: user.uid,
        reviewerName: user.displayName || 'Anonymous',
        sellerId,
        listingId,
        rating,
        reviewText: reviewText.trim(),
        categories,
        timestamp: new Date(),
        verified: true // Mark as verified transaction
      };

      // Submit review to Firestore
      await addDoc(collection(firestoreDb, 'sellerReviews'), reviewData);

      // Update seller's aggregate rating
      await updateSellerRating(sellerId, rating, categories);

      toast.success('Review submitted successfully!');
      onReviewSubmitted?.();
      onClose();
      
    } catch (error) {
      logger.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
};
```

### Seller Rating Aggregation
```javascript
const updateSellerRating = async (sellerId, newRating, newCategories) => {
  try {
    const sellerStatsRef = doc(firestoreDb, 'sellerStats', sellerId);
    const sellerStatsDoc = await getDoc(sellerStatsRef);
    
    let currentStats = {
      totalReviews: 0,
      averageRating: 0,
      categoryRatings: {
        communication: 0,
        packaging: 0,
        shipping: 0,
        accuracy: 0
      },
      ratingDistribution: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      }
    };

    if (sellerStatsDoc.exists()) {
      currentStats = { ...currentStats, ...sellerStatsDoc.data() };
    }

    // Calculate new aggregated rating
    const totalReviews = currentStats.totalReviews + 1;
    const currentTotal = currentStats.averageRating * currentStats.totalReviews;
    const newAverageRating = (currentTotal + newRating) / totalReviews;

    // Update category ratings
    const updatedCategoryRatings = {};
    Object.keys(newCategories).forEach(category => {
      const currentCategoryTotal = currentStats.categoryRatings[category] * currentStats.totalReviews;
      updatedCategoryRatings[category] = (currentCategoryTotal + newCategories[category]) / totalReviews;
    });

    // Update rating distribution
    const updatedDistribution = { ...currentStats.ratingDistribution };
    updatedDistribution[newRating] = (updatedDistribution[newRating] || 0) + 1;

    // Save updated stats
    await setDoc(sellerStatsRef, {
      totalReviews,
      averageRating: newAverageRating,
      categoryRatings: updatedCategoryRatings,
      ratingDistribution: updatedDistribution,
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error('Error updating seller rating:', error);
    throw error;
  }
};
```

## Database Schema

### Seller Reviews Collection
```javascript
const sellerReviewSchema = {
  reviewerId: 'string',      // User ID of reviewer
  reviewerName: 'string',    // Display name of reviewer
  sellerId: 'string',        // User ID of seller being reviewed
  listingId: 'string',       // Related marketplace listing
  rating: 'number',          // Overall rating (1-5)
  reviewText: 'string',      // Written review content
  categories: {              // Category-specific ratings
    communication: 'number', // 1-5 rating
    packaging: 'number',     // 1-5 rating
    shipping: 'number',      // 1-5 rating
    accuracy: 'number'       // 1-5 rating
  },
  timestamp: 'timestamp',    // When review was submitted
  verified: 'boolean',       // Whether transaction was verified
  helpful: 'number',         // Count of helpful votes
  reported: 'boolean',       // Whether review was reported
  response: {                // Seller response to review
    text: 'string',
    timestamp: 'timestamp'
  }
};
```

### Seller Statistics Collection
```javascript
const sellerStatsSchema = {
  sellerId: 'string',           // User ID
  totalReviews: 'number',       // Total number of reviews
  averageRating: 'number',      // Average overall rating
  categoryRatings: {            // Average category ratings
    communication: 'number',
    packaging: 'number',
    shipping: 'number',
    accuracy: 'number'
  },
  ratingDistribution: {         // Count of each rating
    1: 'number',
    2: 'number',
    3: 'number',
    4: 'number',
    5: 'number'
  },
  totalSales: 'number',         // Total completed transactions
  responseTime: 'string',       // Average response time
  joinDate: 'timestamp',        // When seller joined marketplace
  lastActive: 'timestamp',      // Last marketplace activity
  badges: ['array of strings'], // Seller achievement badges
  lastUpdated: 'timestamp'      // When stats were last calculated
};
```

## UI Components

### Seller Information Display
```javascript
const SellerInfoCard = ({ sellerData, sellerStats }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
        {sellerData.photoURL ? (
          <img
            src={sellerData.photoURL}
            alt={sellerData.displayName}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <span className="text-2xl text-gray-600 dark:text-gray-400">
            {sellerData.displayName?.charAt(0) || '?'}
          </span>
        )}
      </div>
      
      <div className="flex-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {sellerData.displayName || 'Anonymous Seller'}
        </h2>
        
        {sellerStats && (
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center">
              <span className="text-yellow-500">★</span>
              <span className="ml-1 font-semibold">
                {sellerStats.averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                ({sellerStats.totalReviews} reviews)
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span>📅 Joined {formatDate(sellerData.createdAt)}</span>
          {sellerStats?.responseTime && (
            <span>⏱️ Responds in {sellerStats.responseTime}</span>
          )}
        </div>
      </div>
    </div>
    
    {sellerStats?.badges && sellerStats.badges.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-4">
        {sellerStats.badges.map(badge => (
          <span
            key={badge}
            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
          >
            {badge}
          </span>
        ))}
      </div>
    )}
  </div>
);
```

### Rating Display Component
```javascript
const RatingDisplay = ({ rating, size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className="text-yellow-500">★</span>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className="text-yellow-500">☆</span>
        );
      } else {
        stars.push(
          <span key={i} className="text-gray-300 dark:text-gray-600">☆</span>
        );
      }
    }
    
    return stars;
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <div className="flex items-center">
        {renderStars()}
      </div>
      {showText && (
        <span className="ml-2 font-semibold">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
```

### Category Ratings Display
```javascript
const CategoryRatingsDisplay = ({ categoryRatings }) => {
  const categories = [
    { key: 'communication', label: 'Communication', icon: '💬' },
    { key: 'packaging', label: 'Packaging', icon: '📦' },
    { key: 'shipping', label: 'Shipping Speed', icon: '🚚' },
    { key: 'accuracy', label: 'Item Accuracy', icon: '✅' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-white">
        Detailed Ratings
      </h4>
      
      {categories.map(category => (
        <div key={category.key} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>{category.icon}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {category.label}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <RatingDisplay 
              rating={categoryRatings[category.key] || 0} 
              size="sm" 
              showText={false}
            />
            <span className="text-sm font-semibold">
              {(categoryRatings[category.key] || 0).toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Reviews List Component
```javascript
const ReviewsList = ({ reviews, loading }) => {
  if (loading) {
    return <ReviewsLoadingSkeleton />;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
};

const ReviewCard = ({ review }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
          <span className="text-sm">
            {review.reviewerName?.charAt(0) || '?'}
          </span>
        </div>
        
        <div>
          <div className="font-semibold text-sm">
            {review.reviewerName || 'Anonymous'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(review.timestamp)}
          </div>
        </div>
      </div>
      
      <RatingDisplay rating={review.rating} size="sm" />
    </div>
    
    {review.reviewText && (
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
        {review.reviewText}
      </p>
    )}
    
    {review.categories && (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(review.categories).map(([category, rating]) => (
          <div key={category} className="flex justify-between">
            <span className="capitalize text-gray-600 dark:text-gray-400">
              {category}:
            </span>
            <RatingDisplay rating={rating} size="sm" showText={false} />
          </div>
        ))}
      </div>
    )}
    
    {review.response && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
          Seller Response:
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {review.response.text}
        </p>
      </div>
    )}
  </div>
);
```

## Advanced Features

### Review Verification System
```javascript
const verifyReviewEligibility = async (reviewerId, sellerId, listingId) => {
  try {
    // Check if user has actually interacted with this seller
    const chatsQuery = query(
      collection(firestoreDb, 'chats'),
      where('participants', 'array-contains', reviewerId),
      where('listingId', '==', listingId)
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    const hasInteracted = chatsSnapshot.docs.some(doc => {
      const participants = doc.data().participants;
      return participants.includes(sellerId);
    });
    
    if (!hasInteracted) {
      throw new Error('You must have contacted this seller to leave a review');
    }
    
    // Check if user has already reviewed this seller for this listing
    const existingReviewQuery = query(
      collection(firestoreDb, 'sellerReviews'),
      where('reviewerId', '==', reviewerId),
      where('sellerId', '==', sellerId),
      where('listingId', '==', listingId)
    );
    
    const existingReviewSnapshot = await getDocs(existingReviewQuery);
    if (!existingReviewSnapshot.empty) {
      throw new Error('You have already reviewed this seller for this item');
    }
    
    return { eligible: true };
    
  } catch (error) {
    return { eligible: false, reason: error.message };
  }
};
```

### Seller Badge System
```javascript
const calculateSellerBadges = (sellerStats, sellerData) => {
  const badges = [];
  
  // Rating-based badges
  if (sellerStats.averageRating >= 4.8 && sellerStats.totalReviews >= 50) {
    badges.push('Top Rated Seller');
  } else if (sellerStats.averageRating >= 4.5 && sellerStats.totalReviews >= 20) {
    badges.push('Highly Rated');
  }
  
  // Volume-based badges
  if (sellerStats.totalSales >= 100) {
    badges.push('Power Seller');
  } else if (sellerStats.totalSales >= 50) {
    badges.push('Established Seller');
  }
  
  // Time-based badges
  const accountAge = new Date() - sellerData.createdAt.toDate();
  const yearsActive = accountAge / (1000 * 60 * 60 * 24 * 365);
  
  if (yearsActive >= 2) {
    badges.push('Veteran Seller');
  }
  
  // Response time badges
  if (sellerStats.responseTime === 'Within an hour') {
    badges.push('Quick Responder');
  }
  
  // Category excellence badges
  Object.entries(sellerStats.categoryRatings).forEach(([category, rating]) => {
    if (rating >= 4.8 && sellerStats.totalReviews >= 20) {
      badges.push(`${category.charAt(0).toUpperCase() + category.slice(1)} Expert`);
    }
  });
  
  return badges;
};
```

### Review Analytics
```javascript
const generateSellerAnalytics = (reviews, stats) => {
  const analytics = {
    ratingTrend: calculateRatingTrend(reviews),
    recentPerformance: calculateRecentPerformance(reviews),
    categoryStrengths: identifyStrengths(stats.categoryRatings),
    improvementAreas: identifyWeaknesses(stats.categoryRatings),
    reviewSentiment: analyzeSentiment(reviews)
  };
  
  return analytics;
};

const calculateRatingTrend = (reviews) => {
  if (!reviews || reviews.length < 5) return null;
  
  const sortedReviews = reviews.sort((a, b) => 
    a.timestamp.toDate() - b.timestamp.toDate()
  );
  
  const recent = sortedReviews.slice(-10);
  const previous = sortedReviews.slice(-20, -10);
  
  const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
  const previousAvg = previous.reduce((sum, r) => sum + r.rating, 0) / previous.length;
  
  return {
    direction: recentAvg > previousAvg ? 'improving' : 'declining',
    change: Math.abs(recentAvg - previousAvg),
    current: recentAvg
  };
};
```

## Performance Optimizations

### Lazy Loading Reviews
```javascript
const useInfiniteReviews = (sellerId, pageSize = 10) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  const loadReviews = useCallback(async (isInitial = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      let reviewsQuery = query(
        collection(firestoreDb, 'sellerReviews'),
        where('sellerId', '==', sellerId),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
      
      if (!isInitial && lastDoc) {
        reviewsQuery = query(reviewsQuery, startAfter(lastDoc));
      }
      
      const snapshot = await getDocs(reviewsQuery);
      const newReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isInitial) {
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);
      
    } catch (error) {
      logger.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [sellerId, pageSize, lastDoc, loading]);

  return { reviews, loading, hasMore, loadReviews };
};
```

### Cached Seller Stats
```javascript
const useCachedSellerStats = (sellerId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Check cache first
        const cacheKey = `seller-stats-${sellerId}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
          
          if (!isExpired) {
            setStats(data);
            setLoading(false);
            return;
          }
        }
        
        // Load from Firestore
        const statsDoc = await getDoc(doc(firestoreDb, 'sellerStats', sellerId));
        const statsData = statsDoc.exists() ? statsDoc.data() : null;
        
        setStats(statsData);
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          data: statsData,
          timestamp: Date.now()
        }));
        
      } catch (error) {
        logger.error('Error loading seller stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      loadStats();
    }
  }, [sellerId]);

  return { stats, loading };
};
```

## Security Measures

### Review Spam Prevention
```javascript
const validateReviewSubmission = async (reviewData) => {
  const { reviewerId, sellerId, reviewText } = reviewData;
  
  // Prevent self-reviews
  if (reviewerId === sellerId) {
    throw new Error('Cannot review yourself');
  }
  
  // Rate limiting - max 5 reviews per day per user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayReviewsQuery = query(
    collection(firestoreDb, 'sellerReviews'),
    where('reviewerId', '==', reviewerId),
    where('timestamp', '>=', todayStart)
  );
  
  const todayReviewsSnapshot = await getDocs(todayReviewsQuery);
  if (todayReviewsSnapshot.size >= 5) {
    throw new Error('Daily review limit exceeded');
  }
  
  // Content validation
  if (reviewText && reviewText.length > 1000) {
    throw new Error('Review text too long');
  }
  
  // Profanity filter
  if (containsProfanity(reviewText)) {
    throw new Error('Review contains inappropriate content');
  }
  
  return true;
};
```

### Review Moderation
```javascript
const moderateReview = async (reviewId, action, moderatorId) => {
  try {
    const reviewRef = doc(firestoreDb, 'sellerReviews', reviewId);
    const moderationData = {
      action, // 'approve', 'reject', 'flag'
      moderatorId,
      timestamp: new Date(),
      reason: action === 'reject' ? 'Inappropriate content' : null
    };
    
    await updateDoc(reviewRef, {
      moderation: moderationData,
      visible: action === 'approve'
    });
    
    // Log moderation action
    await addDoc(collection(firestoreDb, 'moderationLog'), {
      type: 'review_moderation',
      reviewId,
      ...moderationData
    });
    
  } catch (error) {
    logger.error('Error moderating review:', error);
    throw error;
  }
};
```

## Testing Strategy

### Unit Testing
```javascript
describe('SellerReviewsSystem', () => {
  test('calculates average rating correctly', () => {
    const ratings = [5, 4, 5, 3, 4, 5];
    const average = calculateAverageRating(ratings);
    expect(average).toBeCloseTo(4.33, 2);
  });

  test('validates review eligibility', async () => {
    const result = await verifyReviewEligibility('buyer1', 'seller1', 'listing1');
    expect(result.eligible).toBe(true);
  });

  test('prevents duplicate reviews', async () => {
    await expect(
      submitReview(duplicateReviewData)
    ).rejects.toThrow('already reviewed');
  });
});
```

### Integration Testing
```javascript
describe('SellerProfile Integration', () => {
  test('loads seller data and reviews', async () => {
    render(<SellerProfile sellerId="test-seller" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Seller')).toBeInTheDocument();
      expect(screen.getByText('★ 4.5')).toBeInTheDocument();
    });
  });
});
```

## Future Enhancements

### Advanced Analytics
- **Review Sentiment Analysis**: AI-powered sentiment scoring
- **Performance Trends**: Historical performance tracking
- **Competitive Analysis**: Compare with similar sellers
- **Predictive Ratings**: ML-based rating predictions

### Enhanced User Experience
- **Review Templates**: Quick review options for common scenarios
- **Photo Reviews**: Image attachments to reviews
- **Video Testimonials**: Video review support
- **Review Rewards**: Incentivize quality reviews

### Trust & Safety
- **Identity Verification**: Enhanced seller verification
- **Transaction History**: Complete transaction tracking
- **Dispute Resolution**: Integrated dispute handling
- **Insurance Integration**: Transaction protection services

This seller details and reviews system creates a comprehensive trust framework that promotes transparent, secure, and reliable marketplace transactions while providing valuable insights for both buyers and sellers.
