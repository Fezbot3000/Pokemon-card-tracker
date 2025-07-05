import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../design-system';
import { useAuth } from '../../design-system';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction, 
  serverTimestamp 
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

const SellerReviewModal = ({ isOpen, onClose, sellerId, listingId, chatId }) => {
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
      await runTransaction(firestoreDb, async (transaction) => {
        // Add the review to the reviews collection
        const reviewsRef = collection(firestoreDb, 'sellerReviews');
        const reviewData = {
          sellerId,
          buyerId: user.uid,
          buyerName: user.displayName || 'Anonymous',
          listingId,
          chatId,
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Add the review
        const reviewDocRef = doc(reviewsRef);
        transaction.set(reviewDocRef, reviewData);

        // Update the seller's rating statistics
        const sellerRef = doc(firestoreDb, 'users', sellerId);
        const sellerDoc = await transaction.get(sellerRef);
        
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          const currentRating = sellerData.sellerRating || 0;
          const currentReviewCount = sellerData.reviewCount || 0;
          
          // Calculate new average rating
          const newReviewCount = currentReviewCount + 1;
          const newRating = ((currentRating * currentReviewCount) + rating) / newReviewCount;
          
          transaction.update(sellerRef, {
            sellerRating: newRating,
            reviewCount: newReviewCount,
            lastReviewAt: serverTimestamp()
          });
        } else {
          // If seller document doesn't exist, create it with initial rating
          transaction.set(sellerRef, {
            sellerRating: rating,
            reviewCount: 1,
            lastReviewAt: serverTimestamp()
          }, { merge: true });
        }

        // Remove the pending review from the chat
        if (chatId) {
          const chatRef = doc(firestoreDb, 'chats', chatId);
          transaction.update(chatRef, {
            pendingReview: null,
            reviewCompleted: {
              completedAt: serverTimestamp(),
              reviewId: reviewDocRef.id
            }
          });

          // Add a system message to the chat
          const messagesRef = collection(firestoreDb, 'chats', chatId, 'messages');
          const messageDocRef = doc(messagesRef);
          transaction.set(messageDocRef, {
            text: `✅ Thank you for your review! You rated this seller ${rating} out of 5 stars.`,
            senderId: 'system',
            timestamp: serverTimestamp(),
            type: 'review_completed'
          });
        }
      });

      toast.success('Review submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"

    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              How was your experience with this seller?
            </p>
            
            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating *
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating 
                        ? 'text-yellow-400' 
                        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                    }`}
                  >
                    <span className="material-icons">star</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this seller..."
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {comment.length}/500 characters
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
