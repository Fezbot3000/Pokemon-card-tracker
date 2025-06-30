import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';

/**
 * Service for handling collection sharing functionality
 */
class SharingService {
  /**
   * Get shared collection data and increment view count
   * @param {string} shareId - The share ID
   * @returns {Promise<Object>} The shared collection data
   */
  async getSharedCollection(shareId) {
    try {
      const shareDocRef = doc(firestoreDb, 'shared-collections', shareId);
      const shareDoc = await getDoc(shareDocRef);

      if (!shareDoc.exists()) {
        throw new Error('Collection not found or no longer shared');
      }

      const shareData = shareDoc.data();
      
      // Check if share is still active
      if (!shareData.isActive) {
        throw new Error('This collection is no longer being shared');
      }

      // Check if share has expired
      if (shareData.expiresAt && shareData.expiresAt.toDate() < new Date()) {
        throw new Error('This shared collection has expired');
      }

      // Increment view count
      await this.incrementViewCount(shareId);

      return {
        id: shareDoc.id,
        ...shareData
      };
    } catch (error) {
      console.error('Error getting shared collection:', error);
      throw error;
    }
  }

  /**
   * Increment the view count for a shared collection
   * @param {string} shareId - The share ID
   */
  async incrementViewCount(shareId) {
    try {
      const shareDocRef = doc(firestoreDb, 'shared-collections', shareId);
      await updateDoc(shareDocRef, {
        viewCount: increment(1),
        lastViewedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Failed to increment view count:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Generate a shareable URL for a collection
   * @param {string} shareId - The share ID
   * @returns {string} The shareable URL
   */
  generateShareUrl(shareId) {
    return `${window.location.origin}/shared/${shareId}`;
  }

  /**
   * Find the best card image for sharing from a collection
   * @param {Array} cards - Array of cards
   * @returns {string|null} The best image URL or null if none found
   */
  findBestCardImage(cards) {
        if (!cards || cards.length === 0) {
      return null;
    }

    // First, try to find the highest value card with an image
    const cardsWithImages = cards.filter(card => 
      card.imageUrl && 
      card.imageUrl.trim() !== '' && 
      !card.imageUrl.startsWith('data:') // Exclude data URLs as they're too long for meta tags
    );

        if (cardsWithImages.length === 0) {
      return null;
    }

    // Sort by value (highest first) and return the first one with an image
    const sortedByValue = cardsWithImages.sort((a, b) => {
      const valueA = a.originalCurrentValueAmount || a.currentValueAUD || a.currentValue || 0;
      const valueB = b.originalCurrentValueAmount || b.currentValueAUD || b.currentValue || 0;
      return valueB - valueA;
    });

    const bestCard = sortedByValue[0];
    const bestValue = bestCard.originalCurrentValueAmount || bestCard.currentValueAUD || bestCard.currentValue || 0;
    
        return bestCard.imageUrl;
  }

  /**
   * Generate meta tags for social sharing
   * @param {Object} shareData - The share data
   * @param {Array} cards - Optional array of cards for dynamic image selection
   * @returns {Object} Meta tags object
   */
  generateMetaTags(shareData, cards = null) {
    const baseUrl = window.location.origin;
    const shareUrl = this.generateShareUrl(shareData.id);
    
    // Try to get a dynamic image from the cards
    let shareImage = shareData.previewImage || `${baseUrl}/logo192.png`;
    
    if (cards && cards.length > 0) {
      const cardImage = this.findBestCardImage(cards);
      if (cardImage) {
        shareImage = cardImage;
      }
    }
    
    return {
      title: `${shareData.title} - Shared Collection | Collectr`,
      description: shareData.description || `View ${shareData.ownerName}'s trading card collection with ${cards ? cards.length : 'amazing'} cards`,
      url: shareUrl,
      image: shareImage,
      type: 'website',
      siteName: 'Collectr'
    };
  }

  /**
   * Copy share URL to clipboard
   * @param {string} shareId - The share ID
   * @returns {Promise<boolean>} Success status
   */
  async copyShareUrl(shareId) {
    try {
      const shareUrl = this.generateShareUrl(shareId);
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Share collection using Web Share API if available
   * @param {Object} shareData - The share data
   * @returns {Promise<boolean>} Success status
   */
  async shareCollection(shareData) {
    const shareUrl = this.generateShareUrl(shareData.id);
    const shareContent = {
      title: shareData.title,
      text: shareData.description || `Check out ${shareData.ownerName}'s trading card collection`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareContent)) {
        await navigator.share(shareContent);
        return true;
      } else {
        // Fallback to clipboard
        return await this.copyShareUrl(shareData.id);
      }
    } catch (error) {
      console.error('Failed to share:', error);
      // Fallback to clipboard
      return await this.copyShareUrl(shareData.id);
    }
  }

  /**
   * Format collection statistics for display
   * @param {Array} cards - Array of cards
   * @returns {Object} Formatted statistics
   */
  formatCollectionStats(cards) {
    const totalCards = cards.length;
    const gradedCards = cards.filter(card => card.gradingCompany || card.gradeCompany).length;
    const categories = [...new Set(cards.map(card => card.category).filter(Boolean))];
    
    const totalValue = cards.reduce((total, card, index) => {
      const value = card.originalCurrentValueAmount || card.currentValueAUD || card.currentValue || 0;
      return total + value;
    }, 0);
    
    const averageValue = totalCards > 0 ? totalValue / totalCards : 0;

    // Grade distribution
    const gradeDistribution = {};
    cards.forEach(card => {
      const gradingCompany = card.gradingCompany || card.gradeCompany;
      if (gradingCompany && card.grade) {
        const key = `${gradingCompany} ${card.grade}`;
        gradeDistribution[key] = (gradeDistribution[key] || 0) + 1;
      }
    });

    // Set distribution
    const setDistribution = {};
    cards.forEach(card => {
      if (card.set) {
        setDistribution[card.set] = (setDistribution[card.set] || 0) + 1;
      }
    });

    // Year distribution
    const yearDistribution = {};
    cards.forEach(card => {
      if (card.year) {
        yearDistribution[card.year] = (yearDistribution[card.year] || 0) + 1;
      }
    });

    const result = {
      totalCards,
      gradedCards,
      categories: categories.length,
      totalValue,
      averageValue,
      gradeDistribution,
      setDistribution,
      yearDistribution,
      categoryList: categories
    };
    
    return result;
  }

  /**
   * Filter and sort cards based on criteria
   * @param {Array} cards - Array of cards
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered and sorted cards
   */
  filterAndSortCards(cards, filters = {}) {
    let filtered = [...cards];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(card =>
        (card.cardName || card.name || card.card)?.toLowerCase().includes(searchTerm) ||
        (card.set || card.cardSet)?.toLowerCase().includes(searchTerm) ||
        card.player?.toLowerCase().includes(searchTerm) ||
        card.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(card => card.category === filters.category);
    }

    // Apply grading filter
    if (filters.grading && filters.grading !== 'all') {
      if (filters.grading === 'graded') {
        filtered = filtered.filter(card => card.gradingCompany || card.gradeCompany);
      } else if (filters.grading === 'ungraded') {
        filtered = filtered.filter(card => !(card.gradingCompany || card.gradeCompany));
      }
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return ((a.cardName || a.name || a.card) || '').localeCompare((b.cardName || b.name || b.card) || '');
          case 'set':
            return (a.set || a.cardSet || '').localeCompare(b.set || b.cardSet || '');
          case 'year':
            return (b.year || 0) - (a.year || 0);
          case 'grade':
            return (b.grade || 0) - (a.grade || 0);
          case 'value':
            return ((b.originalCurrentValueAmount || b.currentValueAUD || b.currentValue) || 0) - ((a.originalCurrentValueAmount || a.currentValueAUD || a.currentValue) || 0);
          case 'dateAdded':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }
}

// Export singleton instance
export const sharingService = new SharingService();
export default sharingService;
