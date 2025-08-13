import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase-unified';
import LoggingService from './LoggingService';

class ReviewService {
  constructor() {
    this.reviewsCollection = 'reviews';
    this.usersCollection = 'users';
  }

  /**
   * Create a new review
   * @param {Object} reviewData - Review data including reviewerId, revieweeId, rating, etc.
   * @returns {Promise<Object>} Created review with ID
   */
  async createReview(reviewData) {
    try {
      const review = {
        ...reviewData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestoreDb, this.reviewsCollection), review);
      
      // Update user rating summary
      await this.updateUserRatingSummary(reviewData.revieweeId);
      
      return { id: docRef.id, ...review };
    } catch (error) {
      LoggingService.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a specific user
   * @param {string} userId - User ID to get reviews for
   * @param {string} role - 'seller' or 'buyer' to filter reviews by role
   * @param {number} limitCount - Maximum number of reviews to return
   * @returns {Promise<Array>} Array of reviews
   */
  async getReviewsForUser(userId, role = null, limitCount = 10) {
    try {
      let q = query(
        collection(firestoreDb, this.reviewsCollection),
        where('revieweeId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (role) {
        // Get reviews where the user was in the specified role
        const oppositeRole = role === 'seller' ? 'buyer' : 'seller';
        q = query(
          collection(firestoreDb, this.reviewsCollection),
          where('revieweeId', '==', userId),
          where('reviewerRole', '==', oppositeRole),
          orderBy('createdAt', 'desc')
        );
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      const reviews = [];
      
      for (const doc of snapshot.docs) {
        const reviewData = { id: doc.id, ...doc.data() };
        
        // Fetch reviewer details
        const reviewerData = await this.getUserData(reviewData.reviewerId);
        reviewData.reviewerName = reviewerData?.displayName || reviewerData?.email || 'Anonymous';
        reviewData.reviewerAvatar = reviewerData?.photoURL || null;
        
        reviews.push(reviewData);
      }

      return reviews;
    } catch (error) {
      LoggingService.error('Error fetching reviews for user:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a specific transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Array>} Array of reviews for the transaction
   */
  async getReviewsForTransaction(transactionId) {
    try {
      const q = query(
        collection(firestoreDb, this.reviewsCollection),
        where('transactionId', '==', transactionId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      LoggingService.error('Error fetching reviews for transaction:', error);
      throw error;
    }
  }

  /**
   * Update user's rating summary based on all their reviews
   * @param {string} userId - User ID to update rating for
   */
  async updateUserRatingSummary(userId) {
    try {
      // Get all reviews for this user
      const q = query(
        collection(firestoreDb, this.reviewsCollection),
        where('revieweeId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(doc => doc.data());

      if (reviews.length === 0) {
        return; // No reviews to calculate from
      }

      // Calculate ratings by role
      const sellerReviews = reviews.filter(r => r.reviewerRole === 'buyer'); // Reviews of user as seller
      const buyerReviews = reviews.filter(r => r.reviewerRole === 'seller'); // Reviews of user as buyer

      const calculateAverage = (reviewList) => {
        if (reviewList.length === 0) return 0;
        const sum = reviewList.reduce((acc, r) => acc + r.rating, 0);
        return Math.round((sum / reviewList.length) * 10) / 10; // Round to 1 decimal
      };

      const ratingSummary = {
        averageRating: calculateAverage(reviews),
        totalReviews: reviews.length,
        asSellerRating: calculateAverage(sellerReviews),
        asSellerReviews: sellerReviews.length,
        asBuyerRating: calculateAverage(buyerReviews),
        asBuyerReviews: buyerReviews.length,
        lastUpdated: serverTimestamp(),
      };

      // Update user document
      const userRef = doc(firestoreDb, this.usersCollection, userId);
      await updateDoc(userRef, {
        'marketplaceProfile.ratingSummary': ratingSummary
      });

      return ratingSummary;
    } catch (error) {
      LoggingService.error('Error updating user rating summary:', error);
      throw error;
    }
  }

  /**
   * Calculate average rating from an array of reviews
   * @param {Array} reviews - Array of review objects
   * @returns {number} Average rating rounded to 1 decimal place
   */
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  /**
   * Get user data by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User data or null if not found
   */
  async getUserData(userId) {
    try {
      const userQuery = query(
        collection(firestoreDb, this.usersCollection),
        where('uid', '==', userId),
        limit(1)
      );
      
      const snapshot = await getDocs(userQuery);
      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      LoggingService.error('Error fetching user data:', error);
      return null;
    }
  }

  /**
   * Check if a user can review a transaction
   * @param {string} userId - User ID attempting to review
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<boolean>} Whether the user can review
   */
  async canUserReview(userId, transactionId) {
    try {
      // Check if user already reviewed this transaction
      const q = query(
        collection(firestoreDb, this.reviewsCollection),
        where('reviewerId', '==', userId),
        where('transactionId', '==', transactionId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      return snapshot.empty; // Can review if no existing review found
    } catch (error) {
      LoggingService.error('Error checking review eligibility:', error);
      return false;
    }
  }

  /**
   * Get rating distribution for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Rating distribution (1-5 stars with counts)
   */
  async getRatingDistribution(userId) {
    try {
      const q = query(
        collection(firestoreDb, this.reviewsCollection),
        where('revieweeId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      snapshot.docs.forEach(doc => {
        const rating = doc.data().rating;
        if (rating >= 1 && rating <= 5) {
          distribution[rating]++;
        }
      });

      return distribution;
    } catch (error) {
      LoggingService.error('Error fetching rating distribution:', error);
      throw error;
    }
  }
}

// Export singleton instance
const reviewService = new ReviewService();
export default reviewService;
