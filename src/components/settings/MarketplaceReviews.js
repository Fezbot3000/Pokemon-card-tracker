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
      1: 0,
    },
  });

  useEffect(() => {
    if (!user) return;

    const loadReviews = async () => {
      try {
        const reviewsRef = collection(firestoreDb, 'marketplaceReviews');
        
        // Try with composite index first (sellerId + createdAt ordering)
        let querySnapshot;
        try {
          const q = query(
            reviewsRef,
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError) {
          // Fallback to simple query if composite index doesn't exist
          if (indexError.message && indexError.message.includes('requires an index')) {
            // Only show this message once per session to avoid console spam
            if (!MarketplaceReviews.indexWarningShown) {
              logger.info('MarketplaceReviews: Using fallback query (composite index not yet available)');
              MarketplaceReviews.indexWarningShown = true;
            }
            const simpleQuery = query(
              reviewsRef,
              where('sellerId', '==', user.uid)
            );
            querySnapshot = await getDocs(simpleQuery);
          } else {
            throw indexError;
          }
        }

        const reviewsData = [];
        let totalRating = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        querySnapshot.forEach(doc => {
          const review = { id: doc.id, ...doc.data() };
          reviewsData.push(review);
          totalRating += review.rating;
          breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
        });

        // Sort manually if we used the fallback query
        reviewsData.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const timeB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return timeB - timeA; // Descending order (newest first)
        });

        setReviews(reviewsData);
        setStats({
          totalReviews: reviewsData.length,
          averageRating:
            reviewsData.length > 0 ? totalRating / reviewsData.length : 0,
          ratingBreakdown: breakdown,
        });
      } catch (error) {
        logger.error('Error loading marketplace reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user]);

  const renderStars = rating => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`material-icons text-sm ${
              star <= rating
                ? 'text-yellow-500'
                : 'text-gray-300 dark:text-gray-600'
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
        <div className="size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="mt-1 flex justify-center">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Average Rating
            </div>
          </div>

          {/* Total Reviews */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalReviews}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Total Reviews
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-3 text-sm text-gray-600 dark:text-gray-400">
                  {rating}
                </span>
                <span className="material-icons text-sm text-yellow-500">
                  star
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{
                      width: `${
                        stats.totalReviews > 0
                          ? (stats.ratingBreakdown[rating] /
                              stats.totalReviews) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-gray-600 dark:text-gray-400">
                  {stats.ratingBreakdown[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Reviews
        </h4>

        {reviews.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <span className="material-icons mb-2 text-4xl">rate_review</span>
            <p>No reviews yet</p>
            <p className="mt-1 text-sm">
              Start selling to receive your first review!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div
                key={review.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {review.buyerName || 'Anonymous'}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(
                          review.createdAt?.toDate?.() || review.createdAt
                        ).toLocaleDateString()}
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
                  <p className="mt-2 text-gray-700 dark:text-gray-300">
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

// Initialize static property for warning suppression
MarketplaceReviews.indexWarningShown = false;

export default MarketplaceReviews;
