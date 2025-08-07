import { 
  collection, 
  doc, 
  getDoc, 
  increment,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';
import logger from '../utils/logger';
import { toast } from '../design-system';

/**
 * Social Service for handling follow/unfollow functionality
 * and managing social relationships in the marketplace
 */
class SocialService {
  
  /**
   * Follow a seller - creates following relationship and updates counters
   * @param {string} userId - Current user ID (follower)
   * @param {string} sellerId - Seller ID to follow
   * @param {string} sellerName - Seller display name
   * @param {string} sellerProfileImage - Seller profile image URL (optional)
   * @returns {Promise<boolean>} Success status
   */
  static async followUser(userId, sellerId, sellerName = 'Seller', sellerProfileImage = null) {
    if (!userId || !sellerId || userId === sellerId) {
      logger.warn('SocialService.followUser: Invalid parameters', { userId, sellerId });
      return false;
    }

    try {
      // Use a transaction to ensure consistency
      return await runTransaction(firestoreDb, async (transaction) => {
        // === ALL READS FIRST ===
        
        // Check if already following
        const followingRef = doc(firestoreDb, `users/${userId}/following/${sellerId}`);
        const followingDoc = await transaction.get(followingRef);
        
        if (followingDoc.exists()) {
          logger.info('User is already following this seller');
          toast.info('You are already following this seller');
          return false;
        }

        // References for other documents
        const followerRef = doc(firestoreDb, `users/${sellerId}/followers/${userId}`);
        const sellerProfileRef = doc(firestoreDb, 'marketplaceProfiles', sellerId);
        const userProfileRef = doc(firestoreDb, 'marketplaceProfiles', userId);

        // Get profile documents (all reads must happen before writes)
        const userProfileDoc = await transaction.get(userProfileRef);
        const sellerProfileDoc = await transaction.get(sellerProfileRef);
        
        // Extract data from reads
        const userProfile = userProfileDoc.exists() ? userProfileDoc.data() : {};
        const followerName = userProfile.displayName || 'Anonymous';
        const sellerProfileExists = sellerProfileDoc.exists();
        const userProfileExists = userProfileDoc.exists();

        // === ALL WRITES SECOND ===
        
        // Create following relationship
        transaction.set(followingRef, {
          followedAt: serverTimestamp(),
          sellerName,
          sellerProfileImage,
          notificationsEnabled: true
        });

        // Create follower relationship
        transaction.set(followerRef, {
          followedAt: serverTimestamp(),
          followerName,
          followerProfileImage: null // Can add profile images later
        });

        // Update seller's follower count
        if (sellerProfileExists) {
          transaction.update(sellerProfileRef, {
            followerCount: increment(1),
            lastActiveDate: serverTimestamp()
          });
        } else {
          // Create seller profile if it doesn't exist
          transaction.set(sellerProfileRef, {
            userId: sellerId,
            displayName: sellerName,
            followerCount: 1,
            followingCount: 0,
            lastActiveDate: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }

        // Update user's following count
        if (userProfileExists) {
          transaction.update(userProfileRef, {
            followingCount: increment(1),
            lastActiveDate: serverTimestamp()
          });
        } else {
          // Create user profile if it doesn't exist
          transaction.set(userProfileRef, {
            userId,
            displayName: followerName,
            followerCount: 0,
            followingCount: 1,
            lastActiveDate: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }

        return true;
      });
    } catch (error) {
      logger.error('Error following user:', error);
      toast.error('Failed to follow seller');
      return false;
    }
  }

  /**
   * Unfollow a seller - removes following relationship and updates counters
   * @param {string} userId - Current user ID (follower)
   * @param {string} sellerId - Seller ID to unfollow
   * @returns {Promise<boolean>} Success status
   */
  static async unfollowUser(userId, sellerId) {
    if (!userId || !sellerId || userId === sellerId) {
      logger.warn('SocialService.unfollowUser: Invalid parameters', { userId, sellerId });
      return false;
    }

    try {
      return await runTransaction(firestoreDb, async (transaction) => {
        // === ALL READS FIRST ===
        
        // Check if currently following
        const followingRef = doc(firestoreDb, `users/${userId}/following/${sellerId}`);
        const followingDoc = await transaction.get(followingRef);
        
        if (!followingDoc.exists()) {
          logger.info('User is not following this seller');
          toast.info('You are not following this seller');
          return false;
        }

        // References for updates
        const followerRef = doc(firestoreDb, `users/${sellerId}/followers/${userId}`);
        const sellerProfileRef = doc(firestoreDb, 'marketplaceProfiles', sellerId);
        const userProfileRef = doc(firestoreDb, 'marketplaceProfiles', userId);

        // Get profile documents (all reads must happen before writes)
        const sellerProfileDoc = await transaction.get(sellerProfileRef);
        const userProfileDoc = await transaction.get(userProfileRef);
        
        const sellerProfileExists = sellerProfileDoc.exists();
        const userProfileExists = userProfileDoc.exists();

        // === ALL WRITES SECOND ===
        
        // Remove following relationship
        transaction.delete(followingRef);

        // Remove follower relationship
        transaction.delete(followerRef);

        // Update seller's follower count
        if (sellerProfileExists) {
          transaction.update(sellerProfileRef, {
            followerCount: increment(-1),
            lastActiveDate: serverTimestamp()
          });
        }

        // Update user's following count
        if (userProfileExists) {
          transaction.update(userProfileRef, {
            followingCount: increment(-1),
            lastActiveDate: serverTimestamp()
          });
        }

        return true;
      });
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow seller');
      return false;
    }
  }

  /**
   * Check if current user is following a specific seller
   * @param {string} userId - Current user ID
   * @param {string} sellerId - Seller ID to check
   * @returns {Promise<boolean>} Following status
   */
  static async isFollowing(userId, sellerId) {
    if (!userId || !sellerId || userId === sellerId) {
      return false;
    }

    try {
      const followingRef = doc(firestoreDb, `users/${userId}/following/${sellerId}`);
      const followingDoc = await getDoc(followingRef);
      return followingDoc.exists();
    } catch (error) {
      logger.error('Error checking following status:', error);
      return false;
    }
  }

  /**
   * Get list of users that current user is following
   * @param {string} userId - Current user ID
   * @returns {Promise<Array>} Array of following relationships
   */
  static async getFollowingList(userId) {
    if (!userId) {
      logger.warn('SocialService.getFollowingList: No userId provided');
      return [];
    }

    try {
      const followingRef = collection(firestoreDb, `users/${userId}/following`);
      const followingQuery = query(followingRef, orderBy('followedAt', 'desc'));
      const followingSnapshot = await getDocs(followingQuery);
      
      const followingList = [];
      followingSnapshot.forEach(doc => {
        followingList.push({
          sellerId: doc.id,
          ...doc.data()
        });
      });

      return followingList;
    } catch (error) {
      logger.error('Error getting following list:', error);
      return [];
    }
  }

  /**
   * Get list of users following the current user
   * @param {string} userId - Current user ID
   * @returns {Promise<Array>} Array of follower relationships
   */
  static async getFollowersList(userId) {
    if (!userId) {
      logger.warn('SocialService.getFollowersList: No userId provided');
      return [];
    }

    try {
      const followersRef = collection(firestoreDb, `users/${userId}/followers`);
      const followersQuery = query(followersRef, orderBy('followedAt', 'desc'));
      const followersSnapshot = await getDocs(followersQuery);
      
      const followersList = [];
      followersSnapshot.forEach(doc => {
        followersList.push({
          followerId: doc.id,
          ...doc.data()
        });
      });

      return followersList;
    } catch (error) {
      logger.error('Error getting followers list:', error);
      return [];
    }
  }

  /**
   * Get social statistics for a user
   * @param {string} userId - User ID to get stats for
   * @returns {Promise<Object>} Social stats object
   */
  static async getSocialStats(userId) {
    if (!userId) {
      return { followerCount: 0, followingCount: 0 };
    }

    try {
      const profileRef = doc(firestoreDb, 'marketplaceProfiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        return {
          followerCount: data.followerCount || 0,
          followingCount: data.followingCount || 0,
          lastActiveDate: data.lastActiveDate
        };
      }

      return { followerCount: 0, followingCount: 0 };
    } catch (error) {
      logger.error('Error getting social stats:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  }

  /**
   * Get seller IDs that the user is following (for marketplace filtering)
   * @param {string} userId - Current user ID
   * @returns {Promise<Set>} Set of seller IDs being followed
   */
  static async getFollowedSellerIds(userId) {
    if (!userId) {
      return new Set();
    }

    try {
      const followingList = await this.getFollowingList(userId);
      const sellerIds = new Set(followingList.map(follow => follow.sellerId));
      
      logger.debug('SocialService.getFollowedSellerIds:', {
        userId,
        followingCount: followingList.length,
        sellerIds: Array.from(sellerIds)
      });

      return sellerIds;
    } catch (error) {
      logger.error('Error getting followed seller IDs:', error);
      return new Set();
    }
  }

  /**
   * Toggle follow status for a seller
   * @param {string} userId - Current user ID
   * @param {string} sellerId - Seller ID to toggle
   * @param {string} sellerName - Seller display name
   * @param {string} sellerProfileImage - Seller profile image URL (optional)
   * @returns {Promise<boolean>} New following status
   */
  static async toggleFollow(userId, sellerId, sellerName = 'Seller', sellerProfileImage = null) {
    const isCurrentlyFollowing = await this.isFollowing(userId, sellerId);
    
    if (isCurrentlyFollowing) {
      const success = await this.unfollowUser(userId, sellerId);
      if (success) {
        toast.success(`Unfollowed ${sellerName}`);
        return false;
      }
      return true; // Keep current state if unfollow failed
    } else {
      const success = await this.followUser(userId, sellerId, sellerName, sellerProfileImage);
      if (success) {
        toast.success(`Now following ${sellerName}`);
        return true;
      }
      return false; // Keep current state if follow failed
    }
  }
}

export default SocialService;
