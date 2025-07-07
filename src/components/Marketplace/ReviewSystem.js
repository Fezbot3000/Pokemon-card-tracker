import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../design-system';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

function ReviewSystem({ sellerId, listingId, onReviewSubmitted }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [sellerStats, setSellerStats] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    wouldRecommend: true,
  });

  // Check if user can review this seller
  useEffect(() => {
    if (!user || !sellerId || !listingId) return;

    const checkCanReview = async () => {
      try {
        // Check if user has already reviewed this listing
        const reviewRef = doc(
          firestoreDb,
          'reviews',
          `${listingId}_${user.uid}`
        );
        const reviewSnap = await getDoc(reviewRef);

        if (reviewSnap.exists()) {
          setCanReview(false);
        } else {
          // Check if user has purchased from this listing
          const conversationRef = doc(
            firestoreDb,
            'conversations',
            `${listingId}_${user.uid}`
          );
          const conversationSnap = await getDoc(conversationRef);

          setCanReview(conversationSnap.exists() && user.uid !== sellerId);
        }
      } catch (error) {
        logger.error('Error checking review eligibility:', error);
      }
    };

    checkCanReview();
  }, [user, sellerId, listingId]);

  // Load seller stats and reviews
  useEffect(() => {
    if (!sellerId) return;

    const loadSellerData = async () => {
      setLoading(true);
      try {
        // Load seller stats
        const statsRef = doc(firestoreDb, 'sellerStats', sellerId);
        const statsSnap = await getDoc(statsRef);

        if (statsSnap.exists()) {
          setSellerStats(statsSnap.data());
        } else {
          setSellerStats({
            totalReviews: 0,
            averageRating: 0,
            totalSales: 0,
            recommendationRate: 0,
          });
        }

        // Load recent reviews
        const reviewsQuery = query(
          collection(firestoreDb, 'reviews'),
          where('sellerId', '==', sellerId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReviews(reviewsData);
      } catch (error) {
        logger.error('Error loading seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [sellerId]);

  const handleSubmitReview = async () => {
    if (!user || !sellerId || !listingId) return;

    setSubmitting(true);
    try {
      const reviewId = `${listingId}_${user.uid}`;
      const reviewRef = doc(firestoreDb, 'reviews', reviewId);

      // Save the review
      await setDoc(reviewRef, {
        ...reviewData,
        sellerId,
        listingId,
        buyerId: user.uid,
        buyerName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });

      // Update seller stats
      const statsRef = doc(firestoreDb, 'sellerStats', sellerId);
      const statsSnap = await getDoc(statsRef);

      if (statsSnap.exists()) {
        const currentStats = statsSnap.data();
        const newTotalReviews = currentStats.totalReviews + 1;
        const newAverageRating =
          (currentStats.averageRating * currentStats.totalReviews +
            reviewData.rating) /
          newTotalReviews;
        const newRecommendations =
          currentStats.totalRecommendations +
          (reviewData.wouldRecommend ? 1 : 0);
        const newRecommendationRate =
          (newRecommendations / newTotalReviews) * 100;

        await updateDoc(statsRef, {
          totalReviews: increment(1),
          averageRating: newAverageRating,
          totalRecommendations: newRecommendations,
          recommendationRate: newRecommendationRate,
        });
      } else {
        await setDoc(statsRef, {
          sellerId,
          totalReviews: 1,
          averageRating: reviewData.rating,
          totalSales: 0,
          totalRecommendations: reviewData.wouldRecommend ? 1 : 0,
          recommendationRate: reviewData.wouldRecommend ? 100 : 0,
        });
      }

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setCanReview(false);

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      // Reload seller data
      window.location.reload();
    } catch (error) {
      logger.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = rating => {
    return (
      <div className="flex gap-1">
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
      <div className="flex items-center justify-center py-8">
        <div className="size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seller Stats */}
      {sellerStats && (
        <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Seller Rating
          </h3>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {sellerStats.averageRating.toFixed(1)}
              </div>
              <div className="mt-1 flex justify-center">
                {renderStars(Math.round(sellerStats.averageRating))}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Average Rating
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {sellerStats.totalReviews}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Total Reviews
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {sellerStats.recommendationRate.toFixed(0)}%
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Would Recommend
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {sellerStats.totalSales || 0}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Total Sales
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      {canReview && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-white transition-colors hover:bg-purple-700"
        >
          <span className="material-icons text-sm">rate_review</span>
          <span>Write a Review</span>
        </button>
      )}

      {showReviewForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Write a Review
          </h3>

          {/* Rating */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() =>
                    setReviewData(prev => ({ ...prev, rating: star }))
                  }
                  className="p-1 transition-transform hover:scale-110"
                >
                  <span
                    className={`material-icons text-2xl ${
                      star <= reviewData.rating
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Comment
            </label>
            <textarea
              value={reviewData.comment}
              onChange={e =>
                setReviewData(prev => ({ ...prev, comment: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              rows={4}
              placeholder="Share your experience with this seller..."
            />
          </div>

          {/* Would Recommend */}
          <div className="mb-6">
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={reviewData.wouldRecommend}
                onChange={e =>
                  setReviewData(prev => ({
                    ...prev,
                    wouldRecommend: e.target.checked,
                  }))
                }
                className="mr-2 size-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                I would recommend this seller
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="flex-1 rounded-lg bg-purple-600 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              onClick={() => setShowReviewForm(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Reviews
          </h3>

          {reviews.map(review => (
            <div
              key={review.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {review.buyerName}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {renderStars(review.rating)}
                    {review.wouldRecommend && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <span className="material-icons text-xs">
                          check_circle
                        </span>
                        Recommends
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {review.createdAt?.toDate?.().toLocaleDateString() ||
                    'Recently'}
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ReviewSystem.propTypes = {
  sellerId: PropTypes.string.isRequired,
  listingId: PropTypes.string,
  onReviewSubmitted: PropTypes.func,
};

export default ReviewSystem;
