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
   * Generate meta tags for social sharing
   * @param {Object} shareData - The share data
   * @returns {Object} Meta tags object
   */
  generateMetaTags(shareData) {
    const baseUrl = window.location.origin;
    const shareUrl = this.generateShareUrl(shareData.id);
    
    return {
      title: `${shareData.title} - Shared Collection | Collectr`,
      description: shareData.description || `View ${shareData.ownerName}'s trading card collection`,
      url: shareUrl,
      image: shareData.previewImage || `${baseUrl}/logo192.png`,
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
    console.log('=== FORMATTING COLLECTION STATS ===');
    console.log('Cards received:', cards);
    console.log('Cards length:', cards.length);
    
    if (cards.length > 0) {
      console.log('Sample card structure:', cards[0]);
      console.log('Sample card fields:', Object.keys(cards[0]));
    }
    
    const totalCards = cards.length;
    const gradedCards = cards.filter(card => card.gradingCompany || card.gradeCompany).length;
    const categories = [...new Set(cards.map(card => card.category).filter(Boolean))];
    
    console.log('Calculating total value...');
    const totalValue = cards.reduce((total, card, index) => {
      const value = card.originalCurrentValueAmount || card.currentValueAUD || card.currentValue || 0;
      if (index < 3) { // Log first 3 cards
        console.log(`Card ${index} value calculation:`, {
          originalCurrentValueAmount: card.originalCurrentValueAmount,
          currentValueAUD: card.currentValueAUD,
          currentValue: card.currentValue,
          finalValue: value,
          cardName: card.cardName || card.card || card.name
        });
      }
      return total + value;
    }, 0);
    
    console.log('Total value calculated:', totalValue);
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
    
    console.log('Final stats result:', result);
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
