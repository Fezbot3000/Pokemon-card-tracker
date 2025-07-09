import React, { useState } from 'react';
import { useAuth } from '../../design-system/contexts/AuthContext';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import LoggingService from '../../services/LoggingService';

const SellerReviewModal = ({
  isOpen,
  onClose,
  sellerId,
  listingId,
  chatId,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Use a transaction to ensure data consistency
      await setDoc(doc(collection(db, 'sellerReviews')), {
        sellerId,
        buyerId: user.uid,
        buyerName: user.displayName || 'Anonymous',
        listingId,
        chatId,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the seller's rating statistics
      const sellerRef = doc(db, 'users', sellerId);
      await getDoc(sellerRef);
      await setDoc(sellerRef, {
        sellerRating: rating,
        reviewCount: 1,
        lastReviewAt: serverTimestamp(),
      });

      // Remove the pending review from the chat
      if (chatId) {
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
          pendingReview: null,
          reviewCompleted: {
            completedAt: serverTimestamp(),
            reviewId: doc(collection(db, 'sellerReviews')).id,
          },
        });

        // Add a system message to the chat
        const messagesRef = collection(
          db,
          'chats',
          chatId,
          'messages'
        );
        await setDoc(doc(messagesRef), {
          text: `✅ Thank you for your review! You rated this seller ${rating} out of 5 stars.`,
          senderId: 'system',
          timestamp: serverTimestamp(),
          type: 'review_completed',
        });
      }
    } catch (error) {
      LoggingService.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setComment('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white dark:bg-gray-800">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Review Seller
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="material-icons">close</span>
            </button>
          </div>

          <div className="mb-6">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              How was your experience with this seller?
            </p>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rating *
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-300 dark:text-gray-600'
                    }`}
                  >
                    <span className="material-icons">star</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with this seller..."
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {comment.length}/500 characters
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerReviewModal;
