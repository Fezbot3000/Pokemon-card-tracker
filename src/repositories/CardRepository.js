import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db as firestoreDb, storage } from '../services/firebase';
import db from '../services/firestore/dbAdapter';

class CardRepository {
  constructor(userId) {
    this.userId = userId;
    this.collectionsRef = collection(firestoreDb, 'users', userId, 'collections');
    this.cardsRef = collection(firestoreDb, 'users', userId, 'cards');
    this.soldCardsRef = collection(firestoreDb, 'users', userId, 'sold-items');
  }

  // Collection Operations
  async createCollection(name) {
    try {
      const collectionRef = doc(this.collectionsRef);
      const timestamp = serverTimestamp();
      const collectionData = {
        name,
        cardCount: 0,
        description: '',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await setDoc(collectionRef, collectionData);
      
      // Return a plain object with current timestamps
      return {
        id: collectionRef.id,
        name,
        cardCount: 0,
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }
  
  // Create a collection with a specific ID (used for recovery)
  async createCollectionWithId(collectionId, collectionData) {
    try {
      if (!collectionId) {
        throw new Error('Collection ID is required for recovery');
      }
      
      const collectionRef = doc(this.collectionsRef, collectionId);
      
      // Check if collection already exists to avoid overwriting
      const existingDoc = await getDoc(collectionRef);
      if (existingDoc.exists()) {
        // Just update the card count and timestamp
        await updateDoc(collectionRef, {
          cardCount: collectionData.cardCount || 0,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new collection with the specified ID
        await setDoc(collectionRef, {
          name: collectionData.name || 'Recovered Collection',
          cardCount: collectionData.cardCount || 0,
          description: collectionData.description || 'Recovered collection',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return {
        id: collectionId,
        ...collectionData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error creating collection with ID ${collectionId}:`, error);
      throw error;
    }
  }

  async getAllCollections() {
    try {
      const querySnapshot = await getDocs(this.collectionsRef);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to regular dates
        return {
          id: doc.id,
          name: data.name || '',
          cardCount: data.cardCount || 0,
          description: data.description || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('Error getting collections:', error);
      throw error;
    }
  }

  async getCollection(collectionId) {
    try {
      const docSnap = await getDoc(doc(this.collectionsRef, collectionId));
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || '',
        cardCount: data.cardCount || 0,
        description: data.description || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }

  async updateCollection(collectionId, data) {
    try {
      const collectionRef = doc(this.collectionsRef, collectionId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      await updateDoc(collectionRef, updateData);
      
      // Return updated data with current timestamp
      return {
        ...data,
        id: collectionId,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  }

  async deleteCollection(collectionId) {
    try {
      console.log(`CardRepository: Deleting collection ${collectionId}`);
      
      // Get all cards in the collection first
      const cards = await this.getCardsForCollection(collectionId);
      console.log(`Found ${cards.length} cards to delete in collection ${collectionId}`);
      
      // Extract card IDs for image cleanup
      const cardIds = cards.map(card => card.id || card.slabSerial).filter(Boolean);
      
      // Delete all images for these cards from IndexedDB
      try {
        const { deleted, failed } = await db.deleteImagesForCards(cardIds);
        console.log(`Deleted ${deleted} images, ${failed} failed during collection deletion`);
        
        // Dispatch event to notify components to clean up blob URLs
        if (cardIds.length > 0) {
          console.log(`Dispatching card-images-cleanup event for ${cardIds.length} cards`);
          window.dispatchEvent(new CustomEvent('card-images-cleanup', { 
            detail: { cardIds } 
          }));
        }
      } catch (imageError) {
        console.error('Error cleaning up images during collection deletion:', imageError);
        // Continue with deletion even if image cleanup fails
      }
      
      // Delete the collection document from Firestore
      const collectionRef = doc(firestoreDb, 'users', this.userId, 'collections', collectionId);
      await deleteDoc(collectionRef);
      
      // Delete all cards in the collection from Firestore
      const batch = writeBatch(firestoreDb);
      for (const card of cards) {
        if (card.id) {
          const cardRef = doc(this.cardsRef, card.id);
          batch.delete(cardRef);
        }
      }
      
      // Commit the batch delete operation
      if (cards.length > 0) {
        await batch.commit();
      }
      
      console.log(`Successfully deleted collection ${collectionId} and all its cards`);
    } catch (error) {
      console.error(`Error deleting collection ${collectionId}:`, error);
      throw error;
    }
  }

  // Card Operations
  async createCard(cardData, imageFile = null) {
    try {
      // Check if this is a raw card by looking at the condition field
      const isRawCard = cardData.condition?.startsWith('RAW');
      
      // For raw cards, we don't require a slabSerial, but we'll use it if provided
      // For graded cards, we'll use the slabSerial or id as the card ID
      let cardId;
      
      if (isRawCard) {
        // For raw cards, use the provided ID or generate a new one
        cardId = cardData.id || doc(collection(firestoreDb, 'temp')).id;
      } else {
        // For graded cards, use the slabSerial or provided ID
        cardId = cardData.id || cardData.slabSerial;
      }
      
      if (cardId) {
        // Check both id and slabSerial for existing card
        const existingCardById = await this.getCard(cardId);
        
        if (existingCardById) {
          console.log(`Card with ID/slabSerial ${cardId} already exists, updating instead of creating`);
          
          // If the existing card has a collection but the new data doesn't, preserve it
          if (!cardData.collection && !cardData.collectionId) {
            if (existingCardById.collection || existingCardById.collectionId) {
              cardData = {
                ...cardData,
                collection: existingCardById.collection || existingCardById.collectionId,
                collectionId: existingCardById.collection || existingCardById.collectionId
              };
            }
          }
          
          // Combine the new data with the existing card's ID into one payload
          const updatePayload = {
            ...cardData,        // Keep the new data from PSA/form
            id: existingCardById.id // Ensure the ID of the card to update is present
          };
          return this.updateCard(updatePayload); // Pass a single object
        }
      }

      // Generate a new ID if not provided
      const finalCardId = cardId || doc(collection(firestoreDb, 'temp')).id;
      
      // Create a reference to the new card document
      const cardRef = doc(this.cardsRef, finalCardId);
      
      // Handle the image upload if provided
      let imageUrl = cardData.imageUrl || null;
      if (imageFile) {
        try {
          console.log(`Attempting to upload image for card ${finalCardId}, image type: ${imageFile.type}, size: ${imageFile.size} bytes`);
          
          // Use storage reference to upload the image
          const storageRef = ref(storage, `users/${this.userId}/cards/${finalCardId}.jpg`);
          const uploadResult = await uploadBytes(storageRef, imageFile);
          console.log(`Image upload successful for card ${finalCardId}, metadata:`, uploadResult.metadata);
          
          imageUrl = await getDownloadURL(storageRef);
          console.log(`Image URL generated for card ${finalCardId}: ${imageUrl}`);
        } catch (error) {
          console.error(`Error uploading image for card ${finalCardId}:`, error);
          // Continue with card creation even if image upload fails
        }
      }
      
      // Prepare the card data with timestamps
      const newCardData = {
        ...cardData,
        id: finalCardId,
        // For raw cards, don't set slabSerial if not provided
        // For graded cards, ensure slabSerial is set to either the provided value or the card ID
        slabSerial: isRawCard ? (cardData.slabSerial || '') : (cardData.slabSerial || finalCardId),
        imageUrl,
        userId: this.userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Remove any undefined values
      Object.keys(newCardData).forEach(key => 
        newCardData[key] === undefined && delete newCardData[key]
      );
      
      // Create the card document
      await setDoc(cardRef, newCardData);
      console.log(`Card ${finalCardId} created in Firestore`);
      
      // Return the created card data (with local timestamp instead of server timestamp)
      return {
        ...newCardData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Error creating card:", error);
      throw error;
    }
  }
  
  async getCard(cardId) {
    try {
      if (!cardId) return null;
      
      // Check if it's being called from a bulk operation that might be causing performance issues
      const stack = new Error().stack;
      // If this is being called from shadowSync in a batch operation, use a more efficient approach
      const isBatchOperation = stack && (
        stack.includes('shadowWriteCard') || 
        stack.includes('importCardsForBackup')
      );
      
      if (isBatchOperation) {
        // Use a direct document fetch for performance in batch operations
        const cardRef = doc(this.cardsRef, cardId);
        const cardSnap = await getDoc(cardRef);
        
        if (cardSnap.exists()) {
          return { id: cardId, ...cardSnap.data() };
        }
        
        console.log(`Card ${cardId} not found in Firestore (batch operation)`);
        return null;
      }
      
      // For non-batch operations, use the full lookup logic
      const cardRef = doc(this.cardsRef, cardId);
      const cardSnap = await getDoc(cardRef);
      
      if (cardSnap.exists()) {
        return { id: cardId, ...cardSnap.data() };
      }

      // If not found and cardId is numeric or looks like a serial, 
      // try to find it by querying the 'slabSerial' field
      if (!isNaN(cardId) || /^\d+$/.test(cardId)) {
        const q = query(this.cardsRef, where("slabSerial", "==", cardId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Return the first match
          const doc = querySnapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      }
      
      console.log(`Card ${cardId} not found in Firestore`);
      return null;
    } catch (error) {
      console.error(`Error getting card ${cardId}:`, error);
      throw error;
    }
  }

  async getCardsByCollection(collectionId, pageSize = 500, lastDoc = null) {
    try {
      let q;
      
      // Only add collection filter if collectionId is provided and not 'all-cards'
      if (collectionId && collectionId !== 'all-cards') {
        // Filter by collectionId
        q = query(this.cardsRef, where('collectionId', '==', collectionId));
      } else {
        // Simple query for all cards without filter
        q = query(this.cardsRef);
      }
      
      // Add limit if specified
      if (pageSize) {
        q = query(q, limit(pageSize));
      }

      const querySnapshot = await getDocs(q);
      const cards = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      return [];
    }
  }

  async getAllCards() {
    if (!this.userId) {
      console.error('CardRepository: Cannot get all cards without a user ID');
      return [];
    }

    try {
      // Create a query that gets all cards for the current user
      // Order by updatedAt descending to get the most recently updated cards first
      // Limit to 1000 cards as a safeguard against excessive data transfer
      const q = query(
        this.cardsRef,
        where('userId', '==', this.userId),
        orderBy('updatedAt', 'desc'),
        limit(1000)
      );

      console.log(`CardRepository: Getting all cards for user ${this.userId}`);
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      
      // Convert query snapshot to an array of card objects
      const cards = [];
      querySnapshot.forEach((doc) => {
        const cardData = doc.data();
        
        // Add the document ID as the card ID
        cardData.id = doc.id;
        
        // Ensure timestamps are converted to Date objects
        if (cardData.createdAt && cardData.createdAt.toDate) {
          cardData.createdAt = cardData.createdAt.toDate();
        }
        if (cardData.updatedAt && cardData.updatedAt.toDate) {
          cardData.updatedAt = cardData.updatedAt.toDate();
        }
        
        cards.push(cardData);
      });
      
      console.log(`CardRepository: Found ${cards.length} cards for user ${this.userId}`);
      
      // Return the array of cards
      return cards;
    } catch (error) {
      console.error('CardRepository: Error getting all cards:', error);
      throw error;
    }
  }

  /**
   * Update a card in Firestore
   * @param {Object} data - The card data to update, including ID
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async updateCard(data) {
    try {
      // Safety check - create a copy of the data to avoid modifying the original
      const dataCopy = {...data};
      
      // Extract cardId from data using multiple possible ID fields
      let cardId = dataCopy.id || dataCopy.slabSerial;
      
      // If both are missing but we have _sourceId, use that as a fallback
      if (!cardId && dataCopy._sourceId) {
        cardId = dataCopy._sourceId;
        dataCopy.id = cardId; // Set the ID field in the data
      }

      // Skip if no cardId
      if (!cardId) {
        console.error("Cannot update card: No card ID provided", dataCopy);
        return false;
      }
      
      // Ensure ID is consistently set in the data object
      dataCopy.id = cardId;
      
      const startTime = performance.now();
      
      // Check for silent flag to reduce logging
      const isSilentUpdate = dataCopy._silentUpdate === true;
      const isDebugMode = dataCopy._saveDebug === true;
      
      // Only log in debug mode
      if (isDebugMode) {
        console.log(`[CardRepository] updateCard called for ${cardId}`, {
          timestamp: dataCopy.timestamp || new Date().toISOString(),
          collection: dataCopy.collection || dataCopy.collectionId,
          hasDebugFlag: dataCopy._saveDebug || false
        });
      }
      
      // Check for _lastUpdateTime to track this as a managed update rather than recursive
      const isTrackedUpdate = dataCopy._lastUpdateTime ? true : false;
      if (isTrackedUpdate && isDebugMode) {
        console.log(`[CardRepository] Processing tracked card update for ${cardId} (${dataCopy._lastUpdateTime})`);
      }
      
      // Clean up collection fields in the incoming data
      // Remove any existing collection fields to prevent conflicts
      delete dataCopy.collection;
      delete dataCopy.collectionId;
      
      // Get the target collection from the input data
      const targetCollection = data.collection || data.collectionId;
      
      if (!targetCollection && isDebugMode) {
        console.warn("[CardRepository] No collection specified for card update");
      }
      
      if (isDebugMode) {
        console.log(`[CardRepository] Checking if card ${cardId} exists in Firestore`);
      }
      
      // Reference to the card in Firestore
      const cardRef = doc(this.cardsRef, cardId);

      // First check if the card exists at all (regardless of collection)
      const docSnap = await getDoc(cardRef);
      
      if (docSnap.exists()) {
        if (isDebugMode) {
          console.log(`[CardRepository] Card ${cardId} found in Firestore, updating...`);
        }
        
        const existingData = docSnap.data();
        const oldCollection = existingData.collection || existingData.collectionId;
        
        // Ensure we preserve the image URL if it's not in the update data
        if (existingData.imageUrl && !dataCopy.imageUrl) {
          dataCopy.imageUrl = existingData.imageUrl;
        }
        
        // Prepare update data with non-undefined values
        let updateData = { ...dataCopy };
        
        // Remove internal fields that shouldn't be saved to Firestore
        delete updateData._silentUpdate;
        delete updateData._saveDebug;
        delete updateData._lastUpdateTime;
        
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // Add server timestamp
        updateData.updatedAt = serverTimestamp();
        
        // Set collection fields consistently
        if (targetCollection) {
          // Always use the new collection if provided
          updateData.collection = targetCollection;
          updateData.collectionId = targetCollection;
        } else if (oldCollection) {
          // If no new collection specified, preserve the existing one
          updateData.collection = oldCollection;
          updateData.collectionId = oldCollection;
        } else {
          // If no collection at all, this is an error
          console.error(`[CardRepository] No collection found for card ${cardId}`);
          return false;
        }
        
        // Check if collection has changed
        if (targetCollection && oldCollection && targetCollection !== oldCollection) {
          if (isDebugMode) {
            console.log(`[CardRepository] Card ${cardId} is moving from collection '${oldCollection}' to '${targetCollection}'`);
          }
          
          // Track the previous collection
          updateData.previousCollection = oldCollection;
          
          const updateStart = performance.now();
          await updateDoc(cardRef, updateData);
          const updateEnd = performance.now();
          
          if (isDebugMode) {
            console.log(`[CardRepository] Card ${cardId} moved to collection '${targetCollection}' in ${(updateEnd - updateStart).toFixed(2)}ms`);
          }
        } else {
          // Standard update (no collection change)
          const updateStart = performance.now();
          await updateDoc(cardRef, updateData);
          const updateEnd = performance.now();
          
          if (isDebugMode) {
            console.log(`[CardRepository] Card ${cardId} updated (no collection change) in ${(updateEnd - updateStart).toFixed(2)}ms`);
          }
        }
      } else {
        // Document doesn't exist, create it instead
        if (isDebugMode) {
          console.log(`[CardRepository] Card ${cardId} doesn't exist, creating it...`);
        }
        
        // Prepare create data
        const createData = {
          ...dataCopy,
          id: cardId, // Ensure ID is set
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Remove internal fields
        delete createData._silentUpdate;
        delete createData._saveDebug;
        delete createData._lastUpdateTime;
        
        // Remove any undefined fields to prevent Firestore errors
        Object.keys(createData).forEach(key => {
          if (createData[key] === undefined) {
            delete createData[key];
          }
        });
        
        // Only include collection fields if targetCollection is defined
        if (targetCollection) {
          createData.collection = targetCollection;
          createData.collectionId = targetCollection;
        } else {
          // Ensure collection fields are not undefined
          delete createData.collection;
          delete createData.collectionId;
        }
        
        if (isDebugMode) {
          console.log(`Card ${cardId} doesn't exist yet, creating it with the fields`, 
            Object.keys(createData).filter(k => !k.startsWith('_')));
        }
        
        // Create the card document
        await setDoc(cardRef, createData);
        
        // Return the created card data (with local timestamp instead of server timestamp)
        return {
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      const endTime = performance.now();
      if (isDebugMode) {
        console.log(`[CardRepository] Total updateCard operation for ${cardId} completed in ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      return true;
    } catch (error) {
      console.error(`[CardRepository] Error updating card:`, error);
      return false;
    }
  }

  async updateCardImage(cardId, imageFile) {
    try {
      const cardRef = doc(this.cardsRef, cardId);
      const storageRef = ref(storage, `users/${this.userId}/cards/${cardId}.jpg`);
      
      // Check if card exists first
      const cardDoc = await getDoc(cardRef);
      
      if (!cardDoc.exists()) {
        // Card doesn't exist - throw an error instead of creating a new card
        throw new Error(`Card not found: ${cardId}. Cannot upload image for a non-existent card.`);
      }
      
      // Upload new image to storage
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);
      
      // Update existing card
      await updateDoc(cardRef, {
        imageUrl,
        updatedAt: serverTimestamp()
      });

      return imageUrl;
    } catch (error) {
      console.error(`Error updating image for card ${cardId}:`, error);
      throw error;
    }
  }

  async deleteCard(cardId, options = {}) {
    try {
      // Validate input
      if (!cardId) {
        console.error('Invalid card ID provided to deleteCard:', cardId);
        throw new Error('Invalid input: Card ID is required');
      }
      
      // Ensure cardId is a string
      const id = typeof cardId === 'object' ? cardId.slabSerial : String(cardId);
      
      if (!id || id === 'undefined' || id === 'null') {
        console.error('Invalid card ID after conversion:', id);
        throw new Error('Invalid input: Card ID is invalid');
      }
      
      console.log(`Attempting to delete card with ID: ${id}`);
      
      const cardRef = doc(this.cardsRef, id);
      const storageRef = ref(storage, `users/${this.userId}/cards/${id}.jpg`);
      
      // Only delete the image if we're not moving the card between collections
      if (!options.preserveImage) {
        // Delete image from Firebase storage
        try {
          await deleteObject(storageRef);
          console.log(`Image for card ${id} deleted from Firebase storage`);
        } catch (error) {
          console.log('Error deleting image from Firebase storage:', error);
          // Continue with deletion even if image deletion fails
        }
        
        // Delete image from IndexedDB
        try {
          await db.deleteImage(id);
          console.log(`Image for card ${id} deleted from IndexedDB`);
        } catch (error) {
          console.log('Error deleting image from IndexedDB:', error);
          // Continue with deletion even if image deletion fails
        }
      }
      
      // Delete the card document from Firestore
      await deleteDoc(cardRef);
      console.log(`Card ${id} deleted from Firestore`);
      
      // Check if card exists in Firestore
      const docSnap = await getDoc(cardRef);
      
      if (!docSnap.exists()) {
        console.log(`Card ${id} not found in Firestore, cleaning up local data...`);
        // If card doesn't exist in Firestore but exists locally, clean it up
        try {
          await db.deleteImage(id);
          console.log(`Image for card ${id} deleted from IndexedDB`);
          // Force a cleanup of any local state for this card
          await db.cleanupGhostCard(id);
          return true;
        } catch (error) {
          console.log('Error cleaning up local data:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting card ${cardId}:`, error);
      // Provide a more user-friendly error message
      if (error.message.includes('Invalid input')) {
        throw error; // Already formatted nicely
      } else {
        throw new Error(`Failed to delete card: ${error.message}`);
      }
    }
  }

  /**
   * Update specific fields on a card document
   * @param {string} cardId - ID of the card to update 
   * @param {Object} fields - Fields to update
   * @returns {Promise<boolean>} - True if successful
   */
  async updateCardFields(cardId, fields) {
    try {
      if (!cardId) {
        throw new Error('Card ID is required for field updates');
      }
      
      const cardRef = doc(this.cardsRef, cardId);
      
      // Ensure the card exists before updating
      const cardDoc = await getDoc(cardRef);
      if (!cardDoc.exists()) {
        // Document doesn't exist, create it instead of updating
        console.log(`Card ${cardId} doesn't exist yet, creating it with the fields`);
        
        // Add timestamps to the new document
        const newDocData = {
          ...fields,
          id: cardId, // Ensure ID is set
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Use setDoc to create the document
        await setDoc(cardRef, newDocData);
        return true;
      }
      
      // Document exists, proceed with update
      // Add timestamps to the update
      const updateData = {
        ...fields,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(cardRef, updateData);
      
      return true;
    } catch (error) {
      console.error(`Error updating fields for card ${cardId}:`, error);
      throw error;
    }
  }

  async getCardsForCollection(collectionId) {
    try {
      if (!collectionId) {
        console.error('Collection ID is required to get cards');
        return [];
      }
      
      // Create a query against the cards collection
      const q = query(
        this.cardsRef,
        where('userId', '==', this.userId),
        where('collectionId', '==', collectionId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const cards = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      return cards;
    } catch (error) {
      console.error(`Error getting cards for collection ${collectionId}:`, error);
      return [];
    }
  }

  // Sold Cards Operations
  async markCardAsSold(cardId, soldData) {
    try {
      if (!cardId) {
        throw new Error('Card ID is required to mark a card as sold.');
      }
      let card = await this.getCard(cardId);
      const soldItemRef = doc(this.soldCardsRef, cardId); // Use cardId directly for soldItemRef

      if (!card) {
        // Card not found in 'cards' collection. Check if it's already in 'sold-items'.
        const existingSoldDoc = await getDoc(soldItemRef);
        if (existingSoldDoc.exists()) {
          console.warn(`Card ${cardId} not found in 'cards' collection, but already exists in 'sold-items'. Assuming already processed.`);
          // Optionally, return the existing sold item data or a success indicator
          return { ...existingSoldDoc.data(), id: existingSoldDoc.id, alreadySold: true }; 
        }
        // If not in 'cards' and not in 'sold-items', then it's truly not found.
        throw new Error(`Card with ID ${cardId} not found in 'cards' or 'sold-items' collections.`);
      }

      // Card was found in 'cards' collection. Proceed with marking as sold.
      // Use card.id (which is cardId if getCard was successful with it) for the sold item doc ID
      // const soldItemRef = doc(this.soldCardsRef, card.id); // This was potentially problematic if cardId isn't card.id

      // Check if this card has already been marked as sold by checking if a doc with its ID exists in sold-items
      const existingSoldDoc = await getDoc(soldItemRef);
      if (existingSoldDoc.exists()) {
        console.warn(`Card ${card.id} (${card.name || card.card}) is already marked as sold. To update, a different flow might be needed.`);
        // Return existing sold data to indicate it's already processed
        return { ...existingSoldDoc.data(), id: existingSoldDoc.id, alreadySold: true }; 
      }
      
      // Prepare the data for the new document in 'sold-items'
      // Determine soldDate: use provided Timestamp, convert from dateSold string, or use serverTimestamp
      let finalSoldDate;
      if (soldData.soldDate instanceof Timestamp) {
        finalSoldDate = soldData.soldDate;
      } else if (soldData.dateSold && typeof soldData.dateSold === 'string') {
        try {
          finalSoldDate = Timestamp.fromDate(new Date(soldData.dateSold));
        } catch (e) {
          console.warn('Invalid dateSold string, using current date for soldDate:', soldData.dateSold, e);
          finalSoldDate = serverTimestamp(); 
        }
      } else {
        finalSoldDate = serverTimestamp();
      }

      const soldItemData = {
        ...card, // Spread original card data (includes fields like name, set, year, and importantly card.id)
        originalCardId: card.id, // Explicitly store originalCardId
        
        soldDate: finalSoldDate,
        soldPrice: typeof soldData.soldPrice === 'number' ? soldData.soldPrice : 0,
        buyer: soldData.buyer || '',
        notes: soldData.notes || '',
        
        finalProfitAUD: typeof soldData.finalProfitAUD === 'number' ? soldData.finalProfitAUD : null, 
        finalValueAUD: typeof soldData.finalValueAUD === 'number' ? soldData.finalValueAUD : null,
        
        // Keep dateSold string if provided and distinct from soldDate (Timestamp object's representation)
        dateSold: soldData.dateSold || (finalSoldDate === serverTimestamp() ? new Date().toISOString().split('T')[0] : finalSoldDate.toDate().toISOString().split('T')[0]),

        status: 'sold',
        collection: 'sold',

        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp() 
      };
      
      delete soldItemData.images;
      delete soldItemData.imagePath;

      await setDoc(soldItemRef, soldItemData);
      
      // After successfully marking as sold, delete the original card from the 'cards' collection.
      try {
        await this.deleteCard(cardId, { preserveImages: false }); // Set preserveImages based on desired behavior
        console.log(`Card ${cardId} successfully moved to sold items and deleted from active collection.`);
      } catch (deleteError) {
        console.error(`Failed to delete original card ${cardId} after marking as sold:`, deleteError);
        // Consider how to handle this: The card is sold, but not removed from active. 
        // This could be a notification to the user or an attempt to retry deletion.
      }

      return { ...soldItemData, id: soldItemRef.id, createdAt: new Date(), updatedAt: new Date() }; // Simulate client-side timestamps
    } catch (error) {
      console.error('Error marking card as sold:', error);
      throw error;
    }
  }

  async getSoldCards(pageSize = 20, lastDoc = null) {
    try {
      const q = lastDoc
        ? query(this.soldCardsRef, orderBy('soldDate', 'desc'), startAfter(lastDoc), limit(pageSize))
        : query(this.soldCardsRef, orderBy('soldDate', 'desc'), limit(pageSize));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        soldDate: doc.data().soldDate?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error getting sold cards:', error);
      throw error;
    }
  }

  /**
   * Create a sold card directly from local data without requiring the original card to exist in Firestore
   * This is used as a fallback when the card exists locally but not in Firestore
   * 
   * @param {Object} soldCardData - Complete sold card data including original card properties
   * @returns {Promise<Object>} - The created sold card document
   */
  async createSoldCardDirectly(soldCardData) {
    try {
      // Validate required fields
      if (!soldCardData) {
        throw new Error('Sold card data is required');
      }

      // Ensure we have a valid soldPrice
      let soldPrice = 0;
      if (soldCardData.soldPrice !== undefined) {
        if (typeof soldCardData.soldPrice === 'string') {
          soldPrice = parseFloat(soldCardData.soldPrice);
        } else if (typeof soldCardData.soldPrice === 'number') {
          soldPrice = soldCardData.soldPrice;
        }
        
        if (isNaN(soldPrice)) {
          soldPrice = 0;
        }
      }

      // Create a new document in the soldCards collection
      const soldCardRef = doc(this.soldCardsRef);
      
      // Calculate profit values
      const investmentValue = parseFloat(soldCardData.investmentAUD) || 0;
      const profit = soldPrice - investmentValue;
      
      // Create a clean object with only the fields we need
      // This prevents any undefined or invalid values from causing issues
      const cleanData = {
        // Essential fields for a sold card
        originalCardId: soldCardData.originalCardId || soldCardData.id || `card-${Date.now()}`,
        soldDate: serverTimestamp(),
        soldPrice: soldPrice,
        finalValueAUD: soldPrice,
        profit: profit,
        finalProfitAUD: profit,
        buyer: soldCardData.buyer || 'Unknown',
        dateSold: soldCardData.dateSold || new Date().toISOString().split('T')[0],
        invoiceId: soldCardData.invoiceId || `INV-DIRECT-${Date.now()}`,
        
        // Card identification fields
        card: soldCardData.card || '',
        name: soldCardData.name || '',
        player: soldCardData.player || '',
        year: soldCardData.year || '',
        game: soldCardData.game || '',
        set: soldCardData.set || '',
        number: soldCardData.number || '',
        grade: soldCardData.grade || '',
        gradeCompany: soldCardData.gradeCompany || '',
        
        // Collection information
        collectionId: soldCardData.collectionId || '',
        collection: soldCardData.collection || '',
        collectionName: soldCardData.collectionName || '',
        
        // Financial information
        investmentAUD: investmentValue,
        currency: soldCardData.currency || 'AUD',
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // User information
        userId: this.userId
      };

      // Write to Firestore
      await setDoc(soldCardRef, cleanData);
      console.log(`Successfully created sold card directly with ID: ${soldCardRef.id}`);

      // If the card belonged to a collection, update the collection's card count
      if (cleanData.collectionId) {
        try {
          const collectionRef = doc(this.collectionsRef, cleanData.collectionId);
          const collectionDoc = await getDoc(collectionRef);
          
          if (collectionDoc.exists()) {
            const collectionData = collectionDoc.data();
            await updateDoc(collectionRef, {
              cardCount: Math.max((collectionData.cardCount || 0) - 1, 0),
              updatedAt: serverTimestamp()
            });
            console.log(`Updated collection ${cleanData.collectionId} card count after selling`);
          }
        } catch (collectionError) {
          console.error("Error updating collection card count:", collectionError);
          // Continue with the sold card creation even if collection update fails
        }
      }

      // Return the created sold card with a proper date object
      return {
        id: soldCardRef.id,
        ...cleanData,
        soldDate: new Date(), // Convert serverTimestamp for immediate use
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating sold card directly:', error);
      throw error;
    }
  }

  async importSoldCards(soldCards) {
    try {
      if (!Array.isArray(soldCards) || soldCards.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Process sold cards
      const processedCards = soldCards.map(soldCard => ({
        ...soldCard,
        soldDate: soldCard.soldDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      // First get any existing sold cards
      let existingSoldCards = [];
      try {
        existingSoldCards = await db.getSoldCards();
      } catch (error) {
        console.error('Error getting existing sold cards:', error);
      }
      
      // Merge with existing sold cards, avoiding duplicates
      const mergedCards = [...existingSoldCards];
      const existingIds = new Set(existingSoldCards.map(card => card.slabSerial));
      
      for (const card of processedCards) {
        if (!existingIds.has(card.slabSerial)) {
          mergedCards.push(card);
        }
      }
      
      // Store all sold cards in IndexedDB
      try {
        await db.saveSoldCards(mergedCards);
      } catch (dbError) {
        console.error('Error saving sold cards to IndexedDB:', dbError);
        return { 
          success: false, 
          count: 0, 
          errorCount: processedCards.length,
          error: dbError
        };
      }
      
      return { 
        success: true, 
        count: processedCards.length, 
        errorCount: 0 
      };
    } catch (error) {
      console.error('Error importing sold cards from backup:', error);
      return { 
        success: false, 
        count: 0, 
        errorCount: soldCards?.length || 0,
        error: error
      };
    }
  }

  // Real-time Listeners
  subscribeToCollection(collectionId, callback) {
    const q = query(
      this.cardsRef,
      where('collectionId', '==', collectionId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(cards);
    });
  }

  subscribeToAllCards(callback) {
    const q = query(
      this.cardsRef,
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(cards);
    });
  }

  subscribeToSoldCards(callback) {
    // Use consistent ordering by card name and slabSerial for predictable left-to-right display
    const q = query(
      this.soldCardsRef,
      orderBy('soldDate', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(cards);
    });
  }

  // Profile Operations
  async getUserProfile() {
    try {
      const profileRef = doc(firestoreDb, 'users', this.userId, 'profile', 'userData');
      const docSnap = await getDoc(profileRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserProfile(profileData) {
    try {
      const profileRef = doc(firestoreDb, 'users', this.userId, 'profile', 'userData');
      
      // Check if profile document exists
      const profileDoc = await getDoc(profileRef);
      const exists = profileDoc.exists();
      
      const dataToSave = {
        ...profileData,
        updatedAt: serverTimestamp()
      };
      
      // Use setDoc to create or overwrite the document
      await setDoc(profileRef, dataToSave);
      
      return {
        success: true,
        profile: profileData
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Batch Operations
  async importCards(file, collectionId, importMode = 'priceUpdate') {
    try {
      // Import utilities
      const { parseCSVFile, processImportedData, validateCSVStructure } = await import('../utils/dataProcessor');
      
      // Parse CSV file
      const parsedData = await parseCSVFile(file);
      
      // Validate the structure based on import mode
      const validation = validateCSVStructure(parsedData, importMode);
      if (!validation.success) {
        throw new Error(validation.error);
      }
      
      // Use a default exchange rate
      const exchangeRate = 1.5;
      
      // For price update mode, get existing cards
      let existingCards = [];
      if (importMode === 'priceUpdate') {
        // Get existing cards for the collection
        const cardsSnapshot = await getDocs(
          query(this.cardsRef, where('collectionId', '==', collectionId))
        );
        existingCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Process imported data
      const processedData = processImportedData(parsedData, existingCards, exchangeRate, importMode);
      
      // If no cards to process, return success
      if (processedData.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Create batch for Firestore operations
      const batch = writeBatch(firestoreDb);
      let batchCount = 0;
      let totalBatches = 0;
      
      // Process cards in batches (Firestore has a limit of 500 operations per batch)
      for (const card of processedData) {
        let cardRef;
        
        if (importMode === 'priceUpdate' && card.id) {
          // Update existing card
          cardRef = doc(this.cardsRef, card.id);
        } else {
          // Create new card
          cardRef = doc(this.cardsRef);
        }
        
        const cardData = {
          ...card,
          collectionId, // Ensure correct collection ID
          updatedAt: serverTimestamp()
        };
        
        if (importMode === 'priceUpdate') {
          // Only update specific fields for price updates
          batch.update(cardRef, {
            currentValueUSD: cardData.currentValueUSD,
            currentValueAUD: cardData.currentValueAUD,
            potentialProfit: cardData.potentialProfit,
            updatedAt: serverTimestamp()
          });
        } else {
          // Set all fields for base data import
          batch.set(cardRef, cardData);
        }
        
        batchCount++;
        
        // Commit batch if we reach 500 operations
        if (batchCount === 500) {
          await batch.commit();
          totalBatches++;
          batchCount = 0;
        }
      }
      
      // Commit any remaining operations
      if (batchCount > 0) {
        await batch.commit();
        totalBatches++;
      }
      
      return { success: true, count: processedData.length };
    } catch (error) {
      console.error('Error importing cards:', error);
      throw error;
    }
  }

  // Specialized method for importing cards from backup
  async importCardsForBackup(cards, collectionId) {
    try {
      // If no collection ID provided, try to get an existing one
      if (!collectionId) {
        // Default to first available collection if none specified
        const collections = await this.getAllCollections();
        if (collections.length > 0) {
          const realCollection = collections.find(c => c.id !== 'all-cards');
          if (realCollection) {
            collectionId = realCollection.id;
          } else {
            // Create a new collection if none exists
            const newCollection = await this.createCollection('Imported Cards');
            collectionId = newCollection.id;
          }
        } else {
          // Create a new collection if none exists
          const newCollection = await this.createCollection('Imported Cards');
          collectionId = newCollection.id;
        }
      }
      
      // Validate that the collection exists
      const collectionRef = doc(this.collectionsRef, collectionId);
      const collectionDoc = await getDoc(collectionRef);
      
      if (!collectionDoc.exists()) {
        // Create a new collection with a default name
        const newCollection = await this.createCollection(`Imported Collection ${new Date().toISOString().slice(0,10)}`);
        collectionId = newCollection.id;
      }
      
      // Get current card count for verification
      const beforeCount = await this.getCardCount(collectionId);
      
      // Create batch for Firestore operations
      let batch = writeBatch(firestoreDb);
      let batchCount = 0;
      let totalBatches = 0;
      let importedCount = 0;
      let errorCount = 0;
      let processedCardIds = [];
      
      // Process cards in batches (Firestore has a limit of 500 operations per batch)
      for (const card of cards) {
        try {
          // Create a new card document
          const cardRef = doc(this.cardsRef);
          
          // Prepare the card data
          const cardData = {
            ...card,
            collectionId, // Ensure correct collection ID
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          // Delete any fields that might cause issues
          delete cardData.id; // Don't preserve original ID
          
          // Add to batch
          batch.set(cardRef, cardData);
          batchCount++;
          importedCount++;
          processedCardIds.push(cardRef.id);
          
          // Commit batch if we reach 500 operations
          if (batchCount === 500) {
            await batch.commit();
            totalBatches++;
            batchCount = 0;
          }
        } catch (cardError) {
          console.error(`Error processing card:`, cardError);
          errorCount++;
        }
      }
      
      // Commit any remaining operations
      if (batchCount > 0) {
        try {
          await batch.commit();
          totalBatches++;
        } catch (batchError) {
          console.error(`Error committing final batch:`, batchError);
          errorCount += batchCount;
          importedCount -= batchCount;
        }
      }
      
      // Verify final card count
      const afterCount = await this.getCardCount(collectionId);
      
      // Update collection card count
      try {
        const collectionData = collectionDoc.data();
        await updateDoc(collectionRef, {
          cardCount: afterCount,
          updatedAt: serverTimestamp()
        });
      } catch (collectionError) {
        console.error(`Error updating collection ${collectionId} card count:`, collectionError);
      }
      
      return { 
        success: true, 
        count: importedCount, 
        errorCount: errorCount,
        collectionId: collectionId,
        processedCardIds: processedCardIds 
      };
    } catch (error) {
      console.error('Error importing cards from backup:', error);
      throw error;
    }
  }
  
  // Helper method to get card count for a collection
  async getCardCount(collectionId) {
    if (!collectionId) return 0;
    
    try {
      const q = query(this.cardsRef, where('collectionId', '==', collectionId));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Error getting card count for collection ${collectionId}:`, error);
      return 0;
    }
  }
  
  // Get or create a collection by name
  async getOrCreateCollectionByName(name) {
    try {
      if (!name) {
        throw new Error('Collection name is required');
      }
      
      // First try to find an existing collection with this name
      const collections = await this.getAllCollections();
      const existingCollection = collections.find(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingCollection) {
        return existingCollection;
      }
      
      // Create a new collection if it doesn't exist
      return await this.createCollection(name);
    } catch (error) {
      console.error(`Error getting or creating collection "${name}":`, error);
      throw error;
    }
  }
  
  // Update collection with correct card count
  async updateCollectionCardCount(collectionId) {
    try {
      if (!collectionId) return false;
      
      const collectionRef = doc(this.collectionsRef, collectionId);
      const collectionDoc = await getDoc(collectionRef);
      
      if (!collectionDoc.exists()) {
        return false;
      }
      
      const cardCount = await this.getCardCount(collectionId);
      
      await updateDoc(collectionRef, {
        cardCount: cardCount,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error(`Error updating collection ${collectionId} card count:`, error);
      return false;
    }
  }
  
  // Delete multiple cards at once
  async deleteCards(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return { success: true, count: 0 };
    }
    
    try {
      // Create batch for Firestore operations
      let batch = writeBatch(firestoreDb);
      let batchCount = 0;
      let totalBatches = 0;
      let deletedCount = 0;
      let errorCount = 0;
      
      // Track collections that need card count updates
      const affectedCollections = new Set();
      
      // First get all the cards to find their collection IDs
      for (const cardId of cardIds) {
        try {
          const cardRef = doc(this.cardsRef, cardId);
          const cardDoc = await getDoc(cardRef);
          
          if (cardDoc.exists()) {
            const cardData = cardDoc.data();
            if (cardData.collectionId) {
              affectedCollections.add(cardData.collectionId);
            }
            
            // Add delete operation to batch
            batch.delete(cardRef);
            batchCount++;
            deletedCount++;
            
            // Delete the image from IndexedDB
            try {
              await db.deleteImage(cardId);
            } catch (indexedDbError) {
              console.warn(`Error deleting image from IndexedDB for card ${cardId}:`, indexedDbError);
              // Continue with deletion even if IndexedDB image deletion fails
            }
            
            // Also try to delete the card image if it exists in Firebase Storage
            try {
              const storageRef = ref(storage, `users/${this.userId}/cards/${cardId}.jpg`);
              await deleteObject(storageRef);
            } catch (imageError) {
              // Ignore errors deleting images - they might not exist
            }
            
            // Commit batch if we reach 500 operations
            if (batchCount === 500) {
              await batch.commit();
              totalBatches++;
              batchCount = 0;
            }
          } else {
            errorCount++;
          }
        } catch (cardError) {
          console.error(`Error processing card ${cardId} for deletion:`, cardError);
          errorCount++;
        }
      }
      
      // Commit any remaining operations
      if (batchCount > 0) {
        try {
          await batch.commit();
          totalBatches++;
        } catch (batchError) {
          console.error(`Error committing final deletion batch:`, batchError);
          errorCount += batchCount;
          deletedCount -= batchCount;
        }
      }
      
      // Update card counts for affected collections
      for (const collectionId of affectedCollections) {
        await this.updateCollectionCardCount(collectionId);
      }
      
      return { success: true, count: deletedCount, errorCount: errorCount };
    } catch (error) {
      console.error('Error deleting cards:', error);
      throw error;
    }
  }

  async deleteCollection(collectionId) {
    try {
      console.log(`CardRepository: Deleting collection ${collectionId}`);
      
      // Get all cards in the collection first
      const cards = await this.getCardsForCollection(collectionId);
      console.log(`Found ${cards.length} cards to delete in collection ${collectionId}`);
      
      // Extract card IDs for image cleanup
      const cardIds = cards.map(card => card.id || card.slabSerial).filter(Boolean);
      
      // Delete all images for these cards from IndexedDB
      try {
        const { deleted, failed } = await db.deleteImagesForCards(cardIds);
        console.log(`Deleted ${deleted} images, ${failed} failed during collection deletion`);
        
        // Dispatch event to notify components to clean up blob URLs
        if (cardIds.length > 0) {
          console.log(`Dispatching card-images-cleanup event for ${cardIds.length} cards`);
          window.dispatchEvent(new CustomEvent('card-images-cleanup', { 
            detail: { cardIds } 
          }));
        }
      } catch (imageError) {
        console.error('Error cleaning up images during collection deletion:', imageError);
        // Continue with deletion even if image cleanup fails
      }
      
      // Delete the collection document from Firestore
      const collectionRef = doc(firestoreDb, 'users', this.userId, 'collections', collectionId);
      await deleteDoc(collectionRef);
      
      // Delete all cards in the collection from Firestore
      const batch = writeBatch(firestoreDb);
      for (const card of cards) {
        if (card.id) {
          const cardRef = doc(this.cardsRef, card.id);
          batch.delete(cardRef);
        }
      }
      
      // Commit the batch delete operation
      if (cards.length > 0) {
        await batch.commit();
      }
      
      console.log(`Successfully deleted collection ${collectionId} and all its cards`);
    } catch (error) {
      console.error(`Error deleting collection ${collectionId}:`, error);
      throw error;
    }
  }

  // Delete all cloud data for the current user
  async deleteAllUserData() {
    try {
      console.log(`Starting complete data deletion for user: ${this.userId}`);
      const batchSize = 500; // Firestore batch limit
      
      // Helper function to delete all documents in a collection
      const deleteCollection = async (collectionRef, logName) => {
        try {
          const snapshot = await getDocs(collectionRef);
          
          if (snapshot.empty) {
            console.log(`No documents found in ${logName} collection`);
            return 0;
          }
          
          // Use batched writes for efficiency but avoid await in forEach
          let batches = [];
          let currentBatch = writeBatch(firestoreDb);
          let count = 0;
          let totalDeleted = 0;
          
          // Group documents into batches
          snapshot.forEach(doc => {
            currentBatch.delete(doc.ref);
            count++;
            totalDeleted++;
            
            // When batch reaches limit, store it and create a new one
            if (count >= batchSize) {
              console.log(`Created batch of ${count} ${logName} deletions`);
              batches.push(currentBatch);
              currentBatch = writeBatch(firestoreDb);
              count = 0;
            }
          });
          
          // Add the final batch if it has operations
          if (count > 0) {
            console.log(`Created final batch of ${count} ${logName} deletions`);
            batches.push(currentBatch);
          }
          
          // Commit all batches sequentially
          if (batches.length > 0) {
            console.log(`Committing ${batches.length} batches for ${logName}`);
            for (const batch of batches) {
              await batch.commit();
            }
          }
          
          console.log(`Successfully deleted ${totalDeleted} ${logName} documents`);
          return totalDeleted;
        } catch (error) {
          console.error(`Error deleting ${logName} collection:`, error);
          throw error;
        }
      };
      
      // 1. Delete all cards in Firestore - use direct approach first
      try {
        console.log('Attempting direct card deletion for user:', this.userId);
        // Get all cards first
        const cardsSnapshot = await getDocs(this.cardsRef);
        
        if (!cardsSnapshot.empty) {
          console.log(`Found ${cardsSnapshot.size} cards to delete directly`);
          
          // Delete each card individually to ensure they're removed
          const deletePromises = [];
          
          cardsSnapshot.forEach(cardDoc => {
            console.log(`Directly deleting card: ${cardDoc.id}`);
            deletePromises.push(deleteDoc(cardDoc.ref));
          });
          
          // Wait for all direct deletions to complete
          await Promise.all(deletePromises);
          console.log('Direct card deletion completed successfully');
        } else {
          console.log('No cards found for direct deletion');
        }
      } catch (directDeleteError) {
        console.error('Error during direct card deletion:', directDeleteError);
        // Fall back to collection-based deletion
      }
      
      // Also try the batched collection approach as a backup
      await deleteCollection(this.cardsRef, 'cards');
      
      // 2. Delete all collections in Firestore
      await deleteCollection(this.collectionsRef, 'collections');
      
      // 3. Delete all sold items in Firestore
      const soldItemsRef = collection(firestoreDb, 'users', this.userId, 'sold-items');
      await deleteCollection(soldItemsRef, 'sold items');
      
      // 4. Delete all purchase invoices in Firestore
      const purchaseInvoicesRef = collection(firestoreDb, 'users', this.userId, 'purchase-invoices');
      await deleteCollection(purchaseInvoicesRef, 'purchase invoices');
      
      // 5. Delete any other custom collections that might exist
      // This is a safety net to catch any collections we might have missed
      try {
        // These are known subcollections we want to check
        const additionalCollections = [
          'events',          // For any event tracking
          'settings',        // For app settings
          'preferences',     // For user preferences
          'metadata',        // For any metadata
          'custom-sets'      // For any custom card sets
        ];
        
        for (const collName of additionalCollections) {
          const collRef = collection(firestoreDb, 'users', this.userId, collName);
          try {
            await deleteCollection(collRef, collName);
          } catch (collError) {
            // This collection might not exist, which is fine
            console.log(`Collection ${collName} might not exist or error:`, collError);
          }
        }
      } catch (otherCollError) {
        console.warn("Error checking for other collections:", otherCollError);
        // Continue with the reset process
      }
      
      // 6. Delete all images in Firebase Storage
      try {
        console.log('Deleting all user images from Firebase Storage');
        const storageRef = ref(storage, `users/${this.userId}`);
        const listResult = await listAll(storageRef);
        
        // Delete all items in the directory
        const deleteImagePromises = [];
        
        // Delete all files in the main directory
        if (listResult.items.length > 0) {
          console.log(`Found ${listResult.items.length} files in main storage directory`);
          listResult.items.forEach(itemRef => {
            deleteImagePromises.push(deleteObject(itemRef));
          });
        }
        
        // Process all subdirectories
        for (const prefix of listResult.prefixes) {
          try {
            console.log(`Checking subdirectory: ${prefix.fullPath}`);
            const subDirResult = await listAll(prefix);
            
            if (subDirResult.items.length > 0) {
              console.log(`Found ${subDirResult.items.length} files in ${prefix.fullPath}`);
              subDirResult.items.forEach(itemRef => {
                deleteImagePromises.push(deleteObject(itemRef));
              });
            }
            
            // Recursively process nested folders if needed
            for (const nestedPrefix of subDirResult.prefixes) {
              try {
                const nestedResult = await listAll(nestedPrefix);
                nestedResult.items.forEach(itemRef => {
                  deleteImagePromises.push(deleteObject(itemRef));
                });
              } catch (nestedError) {
                console.warn(`Error listing nested directory ${nestedPrefix.fullPath}:`, nestedError);
              }
            }
          } catch (subDirError) {
            console.warn(`Error listing subdirectory ${prefix.fullPath}:`, subDirError);
          }
        }
        
        if (deleteImagePromises.length > 0) {
          console.log(`Deleting ${deleteImagePromises.length} total files from storage`);
          await Promise.allSettled(deleteImagePromises); // Use allSettled to continue even if some deletions fail
          console.log('Storage cleanup completed');
        } else {
          console.log('No files found in storage to delete');
        }
      } catch (storageError) {
        console.warn("Error during storage cleanup, continuing with reset:", storageError);
      }
      
      console.log('All user data deletion completed successfully');
      return { success: true };
    } catch (error) {
      console.error("Error deleting all user data:", error);
      throw error;
    }
  }

  async cleanupGhostCard(cardId) {
    try {
      // Ensure cardId is a string
      const cardIdStr = String(cardId?.id || cardId || '').trim();
      if (!cardIdStr) {
        console.warn('Invalid card ID provided for cleanup:', cardId);
        return { success: false, error: 'Invalid card ID' };
      }

      // Try all possible image paths in storage
      const possiblePaths = [
        `users/${this.userId}/cards/${cardIdStr}.jpg`,
        `users/${this.userId}/${cardIdStr}.jpg`,
        `users/${this.userId}/cards/${cardIdStr}.jpeg`,
        `users/${this.userId}/${cardIdStr}.jpeg`,
        `users/${this.userId}/cards/${cardIdStr}.png`,
        `users/${this.userId}/${cardIdStr}.png`
      ];

      let imageDeleted = false;
      for (const path of possiblePaths) {
        try {
          const imageRef = ref(storage, path);
          await deleteObject(imageRef);
          console.log(`Successfully deleted ghost card image from path: ${path}`);
          imageDeleted = true;
          break; // Exit loop after successful deletion
        } catch (storageError) {
          // Continue trying other paths
          console.debug(`No image at path ${path}:`, storageError);
        }
      }

      // Clean up local image cache
      try {
        await db.deleteImagesForCards([cardIdStr]);
        window.dispatchEvent(new CustomEvent('card-images-cleanup', { 
          detail: { cardIds: [cardIdStr] } 
        }));
      } catch (imageError) {
        console.warn("Error cleaning up local image cache:", imageError);
      }

      return { success: true, imageDeleted };
    } catch (error) {
      console.error("Error cleaning up ghost card:", error);
      throw error;
    }
  }

  async deleteCard(cardId, options = {}) {
    try {
      // Ensure cardId is a string
      const cardIdStr = String(cardId?.id || cardId || '').trim();
      if (!cardIdStr) {
        console.warn('Invalid card ID provided for deletion:', cardId);
        return { success: false, error: 'Invalid card ID' };
      }

      // First try to delete from Firestore
      try {
        await deleteDoc(doc(this.cardsRef, cardIdStr));
      } catch (firestoreError) {
        // If the document doesn't exist in Firestore, that's okay
        // We still want to clean up any ghost images
        console.warn("Card not found in Firestore, attempting cleanup:", firestoreError);
      }
      
      // Try to delete image from storage and clean up local cache
      const cleanupResult = await this.cleanupGhostCard(cardIdStr);
      
      return { success: true, ...cleanupResult };
    } catch (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  }
}

export { CardRepository }; 