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
import db from '../services/db';

class CardRepository {
  constructor(userId) {
    this.userId = userId;
    this.collectionsRef = collection(firestoreDb, 'users', userId, 'collections');
    this.cardsRef = collection(firestoreDb, 'users', userId, 'cards');
    this.soldCardsRef = collection(firestoreDb, 'users', userId, 'soldCards');
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
      // First, get all cards in this collection
      const cardsQuery = query(this.cardsRef, where('collectionId', '==', collectionId));
      const querySnapshot = await getDocs(cardsQuery);
      
      // If there are cards, delete them and their images
      if (!querySnapshot.empty) {
        const cardIds = querySnapshot.docs.map(doc => doc.id);
        console.log(`Deleting ${cardIds.length} cards from collection ${collectionId}`);
        
        // Get card data before deleting to ensure we have all information needed for cleanup
        const cardData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Emit an event that can be captured by components to clean up blob URLs
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-images-cleanup', {
            detail: { cardIds }
          }));
        }
        
        // Delete all cards and their images
        await this.deleteCards(cardIds);
        
        // Also ensure images are deleted from IndexedDB
        // This is important because deleteCards might not properly clean up IndexedDB images
        for (const cardId of cardIds) {
          try {
            await db.deleteImage(cardId);
            console.log(`Successfully deleted image for card ${cardId} from IndexedDB`);
          } catch (imageError) {
            console.warn(`Error deleting image for card ${cardId} from IndexedDB:`, imageError);
            // Continue with deletion even if individual image deletion fails
          }
        }
      }
      
      // Finally, delete the collection itself
      const collectionRef = doc(this.collectionsRef, collectionId);
      await deleteDoc(collectionRef);
      
      console.log(`Collection ${collectionId} deleted successfully with all associated data`);
      return true;
    } catch (error) {
      console.error(`Error deleting collection ${collectionId}:`, error);
      throw error;
    }
  }

  // Card Operations
  async createCard(cardData, imageFile = null) {
    try {
      // Check if card already exists by slabSerial or id to prevent duplicates
      const cardId = cardData.id || cardData.slabSerial;
      
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
          
          return this.updateCard(existingCardById.id, cardData);
        }
      }

      // Generate a new ID if not provided
      const finalCardId = cardId || doc(collection(this.db, 'temp')).id;
      
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
        slabSerial: cardData.slabSerial || finalCardId, // Ensure slabSerial is set
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
      if (!isSilentUpdate) {
        console.log(`[CardRepository] updateCard called for ${cardId}`, {
          timestamp: dataCopy.timestamp || new Date().toISOString(),
          collection: dataCopy.collection || dataCopy.collectionId,
          hasDebugFlag: dataCopy._saveDebug || false
        });
      }
      
      // Check for _lastUpdateTime to track this as a managed update rather than recursive
      const isTrackedUpdate = dataCopy._lastUpdateTime ? true : false;
      if (isTrackedUpdate && !isSilentUpdate) {
        console.log(`[CardRepository] Processing tracked card update for ${cardId} (${dataCopy._lastUpdateTime})`);
      }
      
      // Determine the collection
      const targetCollection = dataCopy.collection || dataCopy.collectionId;
      
      if (!targetCollection && !isSilentUpdate) {
        console.warn("[CardRepository] No collection specified for card update");
      }
      
      if (!isSilentUpdate) {
        console.log(`[CardRepository] Checking if card ${cardId} exists in Firestore`);
      }
      
      // Reference to the card in Firestore
      const cardRef = doc(this.cardsRef, cardId);

      // First check if the card exists at all (regardless of collection)
      const docSnap = await getDoc(cardRef);
      
      if (docSnap.exists()) {
        if (!isSilentUpdate) {
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
        
        // Only include collection fields if targetCollection is defined
        if (targetCollection) {
          updateData.collection = targetCollection;
          updateData.collectionId = targetCollection;
        } else {
          // If no new collection is specified but there's an existing one, preserve it
          if (oldCollection) {
            updateData.collection = oldCollection;
            updateData.collectionId = oldCollection;
          }
          // Otherwise, don't include collection fields at all
        }
        
        // Check if collection has changed
        if (targetCollection && oldCollection && targetCollection !== oldCollection) {
          if (!isSilentUpdate) {
            console.log(`[CardRepository] Card ${cardId} is moving from collection '${oldCollection}' to '${targetCollection}'`);
          }
          
          // Track the previous collection
          updateData.previousCollection = oldCollection;
          
          const updateStart = performance.now();
          await updateDoc(cardRef, updateData);
          const updateEnd = performance.now();
          
          if (!isSilentUpdate) {
            console.log(`[CardRepository] Card ${cardId} moved to collection '${targetCollection}' in ${(updateEnd - updateStart).toFixed(2)}ms`);
          }
        } else {
          // Standard update (no collection change)
          const updateStart = performance.now();
          await updateDoc(cardRef, updateData);
          const updateEnd = performance.now();
          
          if (!isSilentUpdate) {
            console.log(`[CardRepository] Card ${cardId} updated (no collection change) in ${(updateEnd - updateStart).toFixed(2)}ms`);
          }
        }
      } else {
        // Document doesn't exist, create it instead
        if (!isSilentUpdate) {
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
        
        // Only include collection fields if targetCollection is defined
        if (targetCollection) {
          createData.collection = targetCollection;
          createData.collectionId = targetCollection;
        }
        
        const createStart = performance.now();
        await setDoc(cardRef, createData);
        const createEnd = performance.now();
        
        if (!isSilentUpdate) {
          console.log(`[CardRepository] Card ${cardId} created in ${(createEnd - createStart).toFixed(2)}ms`);
        }
      }
      
      const endTime = performance.now();
      if (!isSilentUpdate) {
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
      // Ensure cardId is a string
      const id = typeof cardId === 'object' ? cardId.slabSerial : String(cardId);
      
      const cardRef = doc(this.cardsRef, id);
      const storageRef = ref(storage, `users/${this.userId}/cards/${id}.jpg`);
      
      // Only delete the image if we're not moving the card between collections
      if (!options.preserveImage) {
        // Delete image from Firebase storage
        try {
          await deleteObject(storageRef);
        } catch (error) {
          console.log('Error deleting image from Firebase storage:', error);
          // Continue with deletion even if image deletion fails
        }
        
        // Delete image from IndexedDB
        try {
          await db.deleteImage(id);
        } catch (error) {
          console.log('Error deleting image from IndexedDB:', error);
          // Continue with deletion even if image deletion fails
        }
      }
      
      // Delete the card document from Firestore
      await deleteDoc(cardRef);
      console.log(`Card ${id} deleted from Firestore`);
      
      return true;
    } catch (error) {
      console.error(`Error deleting card ${cardId}:`, error);
      throw error;
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
      const cardRef = doc(this.cardsRef, cardId);
      const soldCardRef = doc(this.soldCardsRef);
      
      // Get the card data
      const cardSnap = await getDoc(cardRef);
      if (!cardSnap.exists()) {
        throw new Error('Card not found');
      }

      const cardData = cardSnap.data();
      
      // Ensure soldPrice exists and is a number
      if (typeof soldData.soldPrice !== 'number' || isNaN(soldData.soldPrice)) {
        throw new Error('Invalid soldPrice: must be a number');
      }
      
      // Ensure we have a valid invoiceId
      if (!soldData.invoiceId) {
        soldData.invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // Check if this card has already been marked as sold by querying for soldCards with this originalCardId
      const existingSoldCardsQuery = query(
        this.soldCardsRef,
        where('originalCardId', '==', cardId),
        limit(1)
      );
      
      const existingSoldCardsSnapshot = await getDocs(existingSoldCardsQuery);
      
      if (!existingSoldCardsSnapshot.empty) {
        const existingSoldCard = existingSoldCardsSnapshot.docs[0];
        return {
          id: existingSoldCard.id,
          ...existingSoldCard.data(),
          alreadyExists: true
        };
      }
      
      // Get the investment value
      const investmentValue = parseFloat(cardData.investmentAUD) || 0;
      const soldPrice = parseFloat(soldData.soldPrice) || 0;
      const profit = soldPrice - investmentValue;
      
      // Create sold card document with all fields from the original card
      // plus the sold data fields
      const soldCard = {
        ...cardData,
        originalCardId: cardId, // Keep track of the original card ID
        soldDate: serverTimestamp(),
        soldPrice: soldPrice,
        finalValueAUD: soldPrice, // Add this field to match expected naming
        profit: profit,
        finalProfitAUD: profit, // Add this field to match expected naming
        buyer: soldData.buyer || 'Unknown',
        dateSold: soldData.dateSold || new Date().toISOString().split('T')[0],
        invoiceId: soldData.invoiceId // Use the exact invoiceId provided
      };

      // First add the sold card document
      await setDoc(soldCardRef, soldCard);
      
      // Then delete the original card document
      await deleteDoc(cardRef);
      
      // If the card belonged to a collection, update the collection's card count
      if (cardData.collectionId) {
        try {
          const collectionRef = doc(this.collectionsRef, cardData.collectionId);
          const collectionDoc = await getDoc(collectionRef);
          
          if (collectionDoc.exists()) {
            const collectionData = collectionDoc.data();
            await updateDoc(collectionRef, {
              cardCount: Math.max((collectionData.cardCount || 0) - 1, 0),
              updatedAt: serverTimestamp()
            });
          }
        } catch (collectionError) {
          console.error("Error updating collection card count:", collectionError);
        }
      }

      const result = { 
        id: soldCardRef.id, 
        ...soldCard,
        soldDate: new Date() // Convert serverTimestamp for immediate use
      };
      
      return result;
    } catch (error) {
      console.error("Error marking card as sold:", error);
      throw error;
    }
  }

  async getSoldCards(pageSize = 20, lastDoc = null) {
    let q = query(
      this.soldCardsRef,
      orderBy('soldDate', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    return {
      cards: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  }

  // Specialized method for importing sold cards from backup
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
      const { getUsdToAudRate } = await import('../utils/currencyAPI');
      
      // Parse CSV file
      const parsedData = await parseCSVFile(file);
      
      // Validate the structure based on import mode
      const validation = validateCSVStructure(parsedData, importMode);
      if (!validation.success) {
        throw new Error(validation.error);
      }
      
      // Get current exchange rate
      const exchangeRate = await getUsdToAudRate();
      
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
      const collectionRef = doc(this.db, 'collections', collectionId);
      await deleteDoc(collectionRef);
      
      // Delete all cards in the collection from Firestore
      const batch = writeBatch(this.db);
      for (const card of cards) {
        if (card.id) {
          const cardRef = doc(this.db, 'cards', card.id);
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
      // 1. Delete all cards in Firestore
      const cardsSnapshot = await getDocs(this.cardsRef);
      const deleteCardPromises = [];
      
      cardsSnapshot.forEach(doc => {
        deleteCardPromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deleteCardPromises);
      
      // 2. Delete all collections in Firestore
      const collectionsSnapshot = await getDocs(this.collectionsRef);
      const deleteCollectionPromises = [];
      
      collectionsSnapshot.forEach(doc => {
        deleteCollectionPromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deleteCollectionPromises);
      
      // 3. Delete all images in Firebase Storage
      try {
        const storageRef = ref(storage, `users/${this.userId}`);
        const listResult = await listAll(storageRef);
        
        // Delete all items in the directory
        const deleteImagePromises = [];
        
        // Delete all files in the main directory
        listResult.items.forEach(itemRef => {
          deleteImagePromises.push(deleteObject(itemRef));
        });
        
        // Delete all files in the cards subdirectory if it exists
        const cardsRef = ref(storage, `users/${this.userId}/cards`);
        try {
          const cardsListResult = await listAll(cardsRef);
          cardsListResult.items.forEach(itemRef => {
            deleteImagePromises.push(deleteObject(itemRef));
          });
        } catch (error) {
          // Cards directory might not exist, which is fine
          console.log("No cards directory found or error listing it:", error);
        }
        
        await Promise.all(deleteImagePromises);
      } catch (storageError) {
        console.warn("Error deleting storage items, continuing with reset:", storageError);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting all user data:", error);
      throw error;
    }
  }
}

export { CardRepository }; 