import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, Icon } from '../../design-system';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import toast from 'react-hot-toast';
import LoggingService from '../../services/LoggingService';

const ReviewModal = ({
  isOpen,
  onClose,
  reviewerId,
  revieweeId,
  revieweeName,
  transactionId,
  transactionType = 'marketplace_sale',
  reviewerRole = 'buyer',
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        reviewerId,
        revieweeId,
        transactionId,
        transactionType,
        rating,
        comment: comment.trim(),
        reviewerRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestoreDb, 'reviews'), reviewData);
      
      toast.success('Review submitted successfully!');
      
      if (onReviewSubmitted) {
        onReviewSubmitted({ ...reviewData, id: docRef.id });
      }
      
      // Reset form
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      LoggingService.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingDescription = (rating) => {
    const descriptions = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return descriptions[rating] || '';
  };

  const getPlaceholderText = () => {
    if (reviewerRole === 'seller') {
      return 'How was your experience with this buyer? (e.g., communication, payment promptness)';
    } else {
      return 'How was your experience with this seller? (e.g., item condition, shipping speed, communication)';
    }
  };

  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review ${revieweeName || 'User'}`}
      size="md"
      closeOnClickOutside={false}
      footer={
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            leftIcon={submitting ? null : <Icon name="star" />}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="group relative p-1 text-4xl transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= (hoveredRating || rating) ? (
                  <span className="text-yellow-400 drop-shadow-sm">★</span>
                ) : (
                  <span className="text-gray-300 transition-colors group-hover:text-gray-400 dark:text-gray-600">☆</span>
                )}
              </button>
            ))}
            {(hoveredRating || rating) > 0 && (
              <span className="ml-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                {getRatingDescription(hoveredRating || rating)}
              </span>
            )}
          </div>
        </div>

        {/* Comment Section */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={getPlaceholderText()}
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
          />
          <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex">
            <Icon name="info" className="mr-2 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium">Why leave a review?</p>
              <p className="mt-1">
                Reviews help build trust in the marketplace and assist other users in making informed decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Review Guidelines */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Review Guidelines
          </h4>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>• Be honest and fair in your assessment</li>
            <li>• Focus on the transaction experience</li>
            <li>• Avoid personal attacks or inappropriate language</li>
            <li>• Reviews cannot be edited after submission</li>
          </ul>
        </div>
      </div>
    </Modal>,
    document.body
  );
};

export default ReviewModal;
