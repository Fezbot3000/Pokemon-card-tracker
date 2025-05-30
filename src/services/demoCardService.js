/**
 * Demo Card Service
 * 
 * Handles the creation and management of demo cards for new user onboarding.
 * Creates a single demo card per user to help them understand how the app works.
 */

/**
 * src/services/demoCardService.js
 * 
 * This file contains the DemoCardService class, which is responsible for creating and managing demo cards for new users.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db as firestoreDb, storage } from '../firebase';
import psaDataService from './psaDataService';
import { getPSACardFromDatabase } from './psaDatabase';
import logger from '../utils/logger';

const DEMO_PSA_NUMBER = '94498822';
const DEFAULT_IMAGE_PATH = '/card-images/DefaultCard.png';

class DemoCardService {
  constructor() {
    this.userId = null;
  }

  /**
   * Initialize the service with a user ID
   * @param {string} userId - The current user's ID
   */
  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * Check if the user has already been given a demo card
   * @returns {Promise<boolean>} - True if demo card has been added
   */
  async hasDemoCardBeenAdded() {
    if (!this.userId) return false;

    try {
      const profileRef = doc(firestoreDb, 'users', this.userId, 'profile', 'userData');
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        return data.demoCardAdded === true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking demo card status:', error);
      return false;
    }
  }

  /**
   * Mark that the demo card has been added for this user
   * @returns {Promise<boolean>} - True if successful
   */
  async markDemoCardAsAdded() {
    if (!this.userId) return false;

    try {
      const profileRef = doc(firestoreDb, 'users', this.userId, 'profile', 'userData');
      
      // Get existing profile data or create new
      const profileDoc = await getDoc(profileRef);
      const existingData = profileDoc.exists() ? profileDoc.data() : {};
      
      // Update with demo card flag
      await setDoc(profileRef, {
        ...existingData,
        demoCardAdded: true,
        demoCardAddedAt: serverTimestamp()
      }, { merge: true });
      
      return true;
    } catch (error) {
      logger.error('Error marking demo card as added:', error);
      return false;
    }
  }

  /**
   * Fetch PSA card data for the demo card
   * @returns {Promise<Object>} - PSA card data with fallbacks
   */
  async fetchDemoCardData() {
    try {
      logger.debug(`Fetching demo card data for PSA #${DEMO_PSA_NUMBER}`);
      
      // Try to get from cache first
      let cardData = await psaDataService.getCardFromCache(DEMO_PSA_NUMBER);
      
      // If not in cache, try the shared database
      if (!cardData) {
        cardData = await getPSACardFromDatabase(DEMO_PSA_NUMBER);
      }
      
      if (cardData) {
        logger.debug('Successfully fetched demo card data from API/cache');
        return cardData;
      } else {
        logger.warn('Demo card data not found in database, using fallback data');
        // Return comprehensive fallback data based on the actual PSA card
        return {
          PSANumber: DEMO_PSA_NUMBER,
          Subject: 'MARIO PIKACHU-HOLO',
          Year: '2016',
          Set: 'POKEMON JAPANESE XY PROMO',
          Grade: 'PSA 10 Gem Mint',
          Population: '1920',
          CardNumber: '294',
          Rarity: 'PROMO',
          currentValueAUD: 4500,
          currentValueUSD: 3000,
          lastUpdated: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Error fetching demo card data, using fallback:', error);
      // Always return fallback data to ensure demo card creation succeeds
      return {
        PSANumber: DEMO_PSA_NUMBER,
        Subject: 'MARIO PIKACHU-HOLO',
        Year: '2016',
        Set: 'POKEMON JAPANESE XY PROMO',
        Grade: 'PSA 10 Gem Mint',
        Population: '1920',
        CardNumber: '294',
        Rarity: 'PROMO',
        currentValueAUD: 4500,
        currentValueUSD: 3000,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Upload the default image to user's storage
   * @returns {Promise<string|null>} - Image URL or null
   */
  async uploadDefaultImage() {
    if (!this.userId) return null;

    try {
      // Fetch the default image from public folder
      const response = await fetch(DEFAULT_IMAGE_PATH);
      if (!response.ok) {
        logger.warn(`Failed to fetch default image from ${DEFAULT_IMAGE_PATH}: ${response.statusText}`);
        // Return a fallback image URL instead of failing completely
        return 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Demo+Card';
      }
      
      const imageBlob = await response.blob();
      
      // Create a unique filename for the demo card
      const fileName = `demo-card-${DEMO_PSA_NUMBER}.png`;
      const imageRef = ref(storage, `users/${this.userId}/cards/${fileName}`);
      
      // Upload the image
      await uploadBytes(imageRef, imageBlob);
      
      // Get the download URL
      const imageUrl = await getDownloadURL(imageRef);
      
      logger.debug('Successfully uploaded demo card image:', imageUrl);
      return imageUrl;
    } catch (error) {
      logger.error('Error uploading default image:', error);
      // Return fallback image instead of null
      return 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Demo+Card';
    }
  }

  /**
   * Create the demo card document
   * @param {Object} psaData - PSA card data
   * @param {string} imageUrl - Image URL
   * @param {string} collectionId - Collection ID to add the card to
   * @returns {Promise<Object|null>} - Created card data or null
   */
  async createDemoCardDocument(psaData, imageUrl, collectionId) {
    if (!this.userId) {
      logger.error('No user ID set for demo card creation');
      return null;
    }

    try {
      // Use the PSA serial number as the card ID for consistency
      const cardId = `psa-${DEMO_PSA_NUMBER}`;
      const cardRef = doc(firestoreDb, 'users', this.userId, 'cards', cardId);
      
      // Create comprehensive card data with all required fields
      const cardData = {
        // Core identifiers - CRITICAL: slabSerial must match the PSA number exactly
        id: cardId,
        slabSerial: DEMO_PSA_NUMBER.toString(), // Critical for card operations - must be string
        serialNumber: DEMO_PSA_NUMBER.toString(),
        
        // Card details from PSA data
        player: psaData.Subject || 'MARIO PIKACHU-HOLO',
        cardName: psaData.Subject || 'MARIO PIKACHU-HOLO', 
        card: psaData.Subject || 'MARIO PIKACHU-HOLO', // Required field
        category: 'Pokemon',
        year: psaData.Year || '2016',
        set: psaData.Set || 'POKEMON JAPANESE XY PROMO',
        
        // Grading information
        gradingCompany: 'PSA',
        grade: psaData.Grade || 'PSA 10 Gem Mint',
        population: parseInt(psaData.Population) || 1920,
        
        // Financial details - all required fields
        datePurchased: new Date().toISOString().split('T')[0],
        quantity: 1,
        investmentAUD: 4440, // Purchase price
        currentValueAUD: psaData.currentValueAUD || 4500, // Use PSA current value if available
        paidPriceAUD: 4440, // What was actually paid (same as investment for demo)
        investmentUSD: 0,
        currentValueUSD: psaData.currentValueUSD || 0,
        paidPriceUSD: 0,
        
        // Collection assignment
        collectionId: collectionId,
        collection: 'Default Collection',
        
        // Media
        imageUrl: imageUrl,
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDemoCard: true, // Mark as demo card for identification
        
        // Additional fields that might be expected
        cardNumber: psaData.CardNumber || '294',
        rarity: psaData.Rarity || 'PROMO',
        condition: 'PSA 10',
        notes: 'Demo card to help you get started with the Pokemon Card Tracker!'
      };
      
      // Save the card
      await setDoc(cardRef, cardData);
      
      logger.debug('Successfully created demo card document with ID:', cardId);
      return {
        ...cardData,
        createdAt: new Date(),
        updatedAt: new Date(),
        _uniqueKey: `${cardId}-${collectionId}` // Add unique key for UI
      };
    } catch (error) {
      logger.error('Error creating demo card document:', error);
      return null;
    }
  }

  /**
   * Create a demo card for the user if they don't have one
   * @param {string} collectionId - Collection ID to add the card to
   * @param {string} collectionName - Collection name
   * @returns {Promise<Object|null>} - Created card or null
   */
  async createDemoCardIfNeeded(collectionId, collectionName = 'Default Collection') {
    console.log('🔍 createDemoCardIfNeeded called with:', { collectionId, collectionName, userId: this.userId });
    
    if (!this.userId) {
      console.error('❌ No user ID set for demo card service');
      return null;
    }

    try {
      // Check if demo card has already been added
      console.log('🔍 Checking if demo card already exists...');
      const hasDemo = await this.hasDemoCardBeenAdded();
      console.log('📋 Demo card check result:', hasDemo);
      
      if (hasDemo) {
        console.log('ℹ️ Demo card already exists for this user');
        return null;
      }

      // Get PSA data
      console.log('🔍 Fetching PSA data for demo card...');
      const psaData = await this.fetchDemoCardData();
      console.log('📊 PSA data retrieved:', psaData);

      // Upload default image
      console.log('🔍 Uploading default image...');
      const imageUrl = await this.uploadDefaultImage();
      console.log('🖼️ Image uploaded:', imageUrl);

      // Image upload now always returns a URL (either real or fallback)
      // so we can continue with card creation

      // Create the card document
      console.log('🔍 Creating card document...');
      const card = await this.createDemoCardDocument(psaData, imageUrl, collectionId);
      console.log('🃏 Card document created:', card);

      if (card) {
        // Mark demo card as added to prevent future creation
        console.log('🔍 Marking demo card as added...');
        await this.markDemoCardAsAdded();
        console.log('✅ Demo card marked as added');
        
        console.log('✅ Successfully created demo card for new user');
        return card;
      } else {
        console.error('❌ Failed to create demo card document');
        return null;
      }
    } catch (error) {
      console.error('❌ Error in createDemoCardIfNeeded:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const demoCardService = new DemoCardService();
export default demoCardService;
