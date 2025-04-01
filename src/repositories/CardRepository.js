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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../services/firebase';

class CardRepository {
  constructor(userId) {
    this.userId = userId;
    this.collectionsRef = collection(db, 'users', userId, 'collections');
    this.cardsRef = collection(db, 'users', userId, 'cards');
    this.soldCardsRef = collection(db, 'users', userId, 'soldCards');
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
        console.log(`Collection ${collectionId} already exists, updating instead of creating`);
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
    const collectionRef = doc(this.collectionsRef, collectionId);
    await deleteDoc(collectionRef);
  }

  // Card Operations
  async createCard(cardData, imageFile) {
    try {
      // Validate required fields
      if (!cardData.collectionId) {
        throw new Error("Collection ID is required");
      }
      
      const cardRef = doc(this.cardsRef);
      let imageUrl = null;

      if (imageFile) {
        const storageRef = ref(storage, `users/${this.userId}/cards/${cardRef.id}.jpg`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const card = {
        ...cardData,
        imageUrl,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      await setDoc(cardRef, card);
      
      // Update collection card count
      try {
        const collectionRef = doc(this.collectionsRef, cardData.collectionId);
        const collectionDoc = await getDoc(collectionRef);
        
        if (collectionDoc.exists()) {
          const collectionData = collectionDoc.data();
          await updateDoc(collectionRef, {
            cardCount: (collectionData.cardCount || 0) + 1,
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error updating collection card count:", error);
      }
      
      return { 
        id: cardRef.id, 
        ...card,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Error creating card:", error);
      throw error;
    }
  }

  async getCard(cardId) {
    const cardRef = doc(this.cardsRef, cardId);
    const docSnap = await getDoc(cardRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
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
      
      console.log(`Repository: Retrieved ${cards.length} cards ${collectionId ? `for collection ${collectionId}` : 'across all collections'}`);
      
      return cards;
    } catch (error) {
      console.error('Error getting cards:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  async updateCard(cardId, data) {
    const cardRef = doc(this.cardsRef, cardId);
    await updateDoc(cardRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  async updateCardImage(cardId, imageFile) {
    try {
      const cardRef = doc(this.cardsRef, cardId);
      const storageRef = ref(storage, `users/${this.userId}/cards/${cardId}.jpg`);
      
      // Check if card exists first
      const cardDoc = await getDoc(cardRef);
      
      if (!cardDoc.exists()) {
        // Card doesn't exist - throw an error instead of creating a new card
        console.error(`Card ${cardId} not found. Cannot update image for a non-existent card.`);
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

  async deleteCard(cardId) {
    const cardRef = doc(this.cardsRef, cardId);
    const storageRef = ref(storage, `users/${this.userId}/cards/${cardId}.jpg`);
    
    // Delete image from storage
    await deleteObject(storageRef);
    
    // Delete card document
    await deleteDoc(cardRef);
  }

  // Sold Cards Operations
  async markCardAsSold(cardId, soldData) {
    try {
      console.log(`Starting markCardAsSold for card ${cardId} with data:`, soldData);
      
      // Get the card data from IndexedDB
      const collections = await db.getCollections();
      let cardToMark = null;
      let collectionId = null;
      
      // Find the card in collections
      for (const [collectionName, cards] of Object.entries(collections)) {
        if (Array.isArray(cards)) {
          const card = cards.find(c => c.slabSerial === cardId);
          if (card) {
            cardToMark = card;
            collectionId = collectionName;
            break;
          }
        }
      }
      
      if (!cardToMark) {
        throw new Error('Card not found in any collection');
      }
      
      // Ensure soldPrice exists and is a number
      if (typeof soldData.soldPrice !== 'number' || isNaN(soldData.soldPrice)) {
        throw new Error('Invalid soldPrice: must be a number');
      }
      
      // Ensure we have a valid invoiceId
      if (!soldData.invoiceId) {
        console.error("No invoiceId provided in soldData");
        soldData.invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      console.log(`Using invoiceId: ${soldData.invoiceId} for card ${cardId}`);
      
      // Get existing sold cards
      const existingSoldCards = await db.getSoldCards();
      
      // Check if card is already sold
      if (existingSoldCards.some(card => card.originalCardId === cardId)) {
        console.warn(`Card ${cardId} has already been marked as sold`);
        return existingSoldCards.find(card => card.originalCardId === cardId);
      }
      
      // Get the investment value
      const investmentValue = parseFloat(cardToMark.investmentAUD) || 0;
      const soldPrice = parseFloat(soldData.soldPrice) || 0;
      const profit = soldPrice - investmentValue;
      
      console.log(`Card ${cardId} investment: ${investmentValue}, sold price: ${soldPrice}, profit: ${profit}`);
      
      // Create sold card data
      const soldCard = {
        ...cardToMark,
        originalCardId: cardId,
        soldDate: new Date().toISOString(),
        soldPrice: soldPrice,
        finalValueAUD: soldPrice,
        profit: profit,
        finalProfitAUD: profit,
        buyer: soldData.buyer || 'Unknown',
        dateSold: soldData.dateSold || new Date().toISOString().split('T')[0],
        invoiceId: soldData.invoiceId
      };

      console.log(`Created soldCard data:`, soldCard);

      // Save to IndexedDB using retryTransaction
      await db.retryTransaction(db.COLLECTIONS_STORE, 'readwrite', async (store, resolve, reject) => {
        try {
          // Save sold card
          await store.put({ userId: db.getCurrentUserId(), name: 'sold', data: [...existingSoldCards, soldCard] });
          
          // Remove from collection
          if (collectionId) {
            const updatedCollections = { ...collections };
            if (Array.isArray(updatedCollections[collectionId])) {
              updatedCollections[collectionId] = updatedCollections[collectionId].filter(
                card => card.slabSerial !== cardId
              );
              await store.put({ userId: db.getCurrentUserId(), name: collectionId, data: updatedCollections[collectionId] });
            }
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      console.log(`Successfully saved sold card to IndexedDB and updated collections`);
      return soldCard;
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
      const profileRef = doc(db, 'users', this.userId, 'profile', 'userData');
      const docSnap = await getDoc(profileRef);
      
      if (docSnap.exists()) {
        console.log("Found profile in Firebase:", docSnap.data());
        return docSnap.data();
      } else {
        console.log("No profile found in Firebase");
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserProfile(profileData) {
    try {
      console.log(`Starting updateUserProfile for user ${this.userId} with data:`, profileData);
      
      const profileRef = doc(db, 'users', this.userId, 'profile', 'userData');
      
      // Check if profile document exists
      const profileDoc = await getDoc(profileRef);
      const exists = profileDoc.exists();
      console.log(`Profile document ${exists ? 'exists' : 'does not exist'}`);
      
      const dataToSave = {
        ...profileData,
        updatedAt: serverTimestamp()
      };
      
      console.log("Saving profile data:", dataToSave);
      
      // Use setDoc to create or overwrite the document
      await setDoc(profileRef, dataToSave);
      console.log("Profile data successfully saved to Firestore");
      
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
      console.log(`Repository: Importing in ${importMode} mode for collection: ${collectionId}`);
      
      // Import utilities
      const { parseCSVFile, processImportedData, validateCSVStructure } = await import('../utils/dataProcessor');
      const { getUsdToAudRate } = await import('../utils/currencyAPI');
      
      // Parse CSV file
      const parsedData = await parseCSVFile(file);
      console.log(`Parsed ${parsedData.length} rows from CSV`);
      
      // Validate the structure based on import mode
      const validation = validateCSVStructure(parsedData, importMode);
      if (!validation.success) {
        throw new Error(validation.error);
      }
      
      // Get current exchange rate
      const exchangeRate = await getUsdToAudRate();
      console.log(`Using exchange rate: ${exchangeRate}`);
      
      // For price update mode, get existing cards
      let existingCards = [];
      if (importMode === 'priceUpdate') {
        // Get existing cards for the collection
        const cardsSnapshot = await getDocs(
          query(this.cardsRef, where('collectionId', '==', collectionId))
        );
        existingCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Found ${existingCards.length} existing cards in collection`);
      }
      
      // Process imported data
      const processedData = processImportedData(parsedData, existingCards, exchangeRate, importMode);
      console.log(`Processed ${processedData.length} cards for import`);
      
      // If no cards to process, return success
      if (processedData.length === 0) {
        console.log('No cards to import after processing');
        return { success: true, count: 0 };
      }
      
      // Create batch for Firestore operations
      const batch = writeBatch(db);
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
          collectionId,
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
          console.log(`Committed batch ${totalBatches} (${batchCount} operations)`);
          batchCount = 0;
        }
      }
      
      // Commit any remaining operations
      if (batchCount > 0) {
        await batch.commit();
        totalBatches++;
        console.log(`Committed final batch ${totalBatches} (${batchCount} operations)`);
      }
      
      console.log(`Successfully imported ${processedData.length} cards`);
      return { success: true, count: processedData.length };
    } catch (error) {
      console.error('Error importing cards:', error);
      throw error;
    }
  }

  // Specialized method for importing cards from backup
  async importCardsForBackup(cards, collectionId) {
    try {
      console.log(`Importing ${cards.length} cards for collection ID: ${collectionId || 'undefined'}`);
      
      // If no collection ID provided, try to get an existing one
      if (!collectionId) {
        // Default to first available collection if none specified
        const collections = await this.getAllCollections();
        if (collections.length > 0) {
          const realCollection = collections.find(c => c.id !== 'all-cards');
          if (realCollection) {
            collectionId = realCollection.id;
            console.log(`No collection ID provided, using first available: ${realCollection.name} (${collectionId})`);
          } else {
            // Create a new collection if none exists
            const newCollection = await this.createCollection('Imported Cards');
            collectionId = newCollection.id;
            console.log(`Created new collection for import: Imported Cards (${collectionId})`);
          }
        } else {
          // Create a new collection if none exists
          const newCollection = await this.createCollection('Imported Cards');
          collectionId = newCollection.id;
          console.log(`No collections found, created new collection: Imported Cards (${collectionId})`);
        }
      }
      
      // Validate that the collection exists
      const collectionRef = doc(this.collectionsRef, collectionId);
      const collectionDoc = await getDoc(collectionRef);
      
      if (!collectionDoc.exists()) {
        console.warn(`Collection with ID ${collectionId} not found - creating it`);
        // Create a new collection with a default name
        const newCollection = await this.createCollection(`Imported Collection ${new Date().toISOString().slice(0,10)}`);
        collectionId = newCollection.id;
        console.log(`Created new collection with ID: ${collectionId}`);
      }
      
      // Get current card count for verification
      const beforeCount = await this.getCardCount(collectionId);
      console.log(`Collection ${collectionId} has ${beforeCount} cards before import`);
      
      // Create batch for Firestore operations
      let batch = writeBatch(db);
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
            console.log(`Committed batch ${totalBatches} (${batchCount} operations)`);
            
            // Create a new batch
            batchCount = 0;
            batch = writeBatch(db);
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
          console.log(`Committed final batch ${totalBatches} (${batchCount} operations)`);
        } catch (batchError) {
          console.error(`Error committing final batch:`, batchError);
          errorCount += batchCount;
          importedCount -= batchCount;
        }
      }
      
      // Verify final card count
      const afterCount = await this.getCardCount(collectionId);
      console.log(`Collection ${collectionId} has ${afterCount} cards after import (difference: ${afterCount - beforeCount})`);
      
      // Update collection card count
      try {
        const collectionData = collectionDoc.data();
        await updateDoc(collectionRef, {
          cardCount: afterCount,
          updatedAt: serverTimestamp()
        });
        console.log(`Updated collection ${collectionId} card count to ${afterCount}`);
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
  
  // Specialized method for importing sold cards from backup
  async importSoldCards(soldCards) {
    try {
      if (!Array.isArray(soldCards) || soldCards.length === 0) {
        console.log('No sold cards to import');
        return { success: true, count: 0, errorCount: 0 };
      }
      
      console.log(`Importing ${soldCards.length} sold cards`);
      
      // Create batch for Firestore operations
      let batch = writeBatch(db);
      let batchCount = 0;
      let totalBatches = 0;
      let importedCount = 0;
      let errorCount = 0;
      
      // Process sold cards in batches
      for (const soldCard of soldCards) {
        try {
          // Skip if this card has already been marked as sold
          if (soldCard.originalCardId) {
            const existingSoldCardsQuery = query(
              this.soldCardsRef,
              where('originalCardId', '==', soldCard.originalCardId),
              limit(1)
            );
            
            const existingSoldCardsSnapshot = await getDocs(existingSoldCardsQuery);
            if (!existingSoldCardsSnapshot.empty) {
              console.log(`Card ${soldCard.originalCardId} already exists as sold, skipping`);
              continue;
            }
          }

          // Create a new sold card document
          const soldCardRef = doc(this.soldCardsRef);
          
          // Prepare sold card data
          const soldCardData = {
            ...soldCard,
            soldDate: soldCard.soldDate ? new Timestamp(
              Math.floor(new Date(soldCard.soldDate).getTime() / 1000), 
              0
            ) : serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Ensure required fields are present
            finalValueAUD: soldCard.finalValueAUD || soldCard.soldPrice || 0,
            finalProfitAUD: soldCard.finalProfitAUD || (soldCard.soldPrice - (soldCard.investmentAUD || 0)) || 0,
            buyer: soldCard.buyer || 'Unknown',
            dateSold: soldCard.dateSold || new Date().toISOString().split('T')[0],
            invoiceId: soldCard.invoiceId || `INV-LEGACY-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
          };
          
          // Delete any fields that might cause issues
          delete soldCardData.id;
          
          // Add to batch
          batch.set(soldCardRef, soldCardData);
          batchCount++;
          importedCount++;
          
          // Commit batch if we reach 500 operations
          if (batchCount === 500) {
            await batch.commit();
            totalBatches++;
            console.log(`Committed sold cards batch ${totalBatches} (${batchCount} operations)`);
            
            // Create a new batch
            batchCount = 0;
            batch = writeBatch(db);
          }
        } catch (cardError) {
          console.error(`Error processing sold card:`, cardError);
          errorCount++;
        }
      }
      
      // Commit any remaining operations
      if (batchCount > 0) {
        try {
          await batch.commit();
          totalBatches++;
          console.log(`Committed final sold cards batch ${totalBatches} (${batchCount} operations)`);
        } catch (batchError) {
          console.error(`Error committing final sold cards batch:`, batchError);
          errorCount += batchCount;
          importedCount -= batchCount;
        }
      }
      
      return { success: true, count: importedCount, errorCount: errorCount };
    } catch (error) {
      console.error('Error importing sold cards from backup:', error);
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
        console.log(`Found existing collection "${name}" (ID: ${existingCollection.id})`);
        return existingCollection;
      }
      
      // Create a new collection if it doesn't exist
      console.log(`Creating new collection "${name}"`);
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
        console.warn(`Collection with ID ${collectionId} not found for card count update`);
        return false;
      }
      
      const cardCount = await this.getCardCount(collectionId);
      
      await updateDoc(collectionRef, {
        cardCount: cardCount,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Updated collection ${collectionId} card count to ${cardCount}`);
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
      console.log(`Deleting ${cardIds.length} cards`);
      
      // Create batch for Firestore operations
      let batch = writeBatch(db);
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
            
            // Also try to delete the card image if it exists
            try {
              const storageRef = ref(storage, `users/${this.userId}/cards/${cardId}.jpg`);
              await deleteObject(storageRef);
            } catch (imageError) {
              // Ignore errors deleting images - they might not exist
              console.log(`Image for card ${cardId} not found or could not be deleted`);
            }
            
            // Commit batch if we reach 500 operations
            if (batchCount === 500) {
              await batch.commit();
              totalBatches++;
              console.log(`Committed deletion batch ${totalBatches} (${batchCount} operations)`);
              
              // Create a new batch
              batchCount = 0;
              batch = writeBatch(db);
            }
          } else {
            console.warn(`Card with ID ${cardId} not found for deletion`);
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
          console.log(`Committed final deletion batch ${totalBatches} (${batchCount} operations)`);
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
}

export default CardRepository; 