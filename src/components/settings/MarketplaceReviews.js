import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';

function MarketplaceReviews() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }
  });

  useEffect(() => {
    if (!user) return;

    const loadReviews = async () => {
      try {
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        const q = query(
          reviewsRef,
          where('sellerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const reviewsData = [];
        let totalRating = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        
        querySnapshot.forEach((doc) => {
          const review = { id: doc.id, ...doc.data() };
          reviewsData.push(review);
          totalRating += review.rating;
          breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
        });
        
        setReviews(reviewsData);
        setStats({
          totalReviews: reviewsData.length,
          averageRating: reviewsData.length > 0 ? totalRating / reviewsData.length : 0,
          ratingBreakdown: breakdown
        });
      } catch (error) {
        logger.error('Error loading marketplace reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user]);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-icons text-sm ${
              star <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center mt-1">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Average Rating
            </div>
          </div>

          {/* Total Reviews */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalReviews}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Reviews
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-3">
                  {rating}
                </span>
                <span className="material-icons text-sm text-yellow-500">star</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalReviews > 0
                          ? (stats.ratingBreakdown[rating] / stats.totalReviews) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                  {stats.ratingBreakdown[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Reviews
        </h4>
        
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="material-icons text-4xl mb-2">rate_review</span>
            <p>No reviews yet</p>
            <p className="text-sm mt-1">Start selling to receive your first review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {review.buyerName || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(review.createdAt?.toDate?.() || review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {review.listingTitle && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {review.listingTitle}
                    </div>
                  )}
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketplaceReviews;
