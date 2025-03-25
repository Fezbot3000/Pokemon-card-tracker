import { 
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

class CardService {
  constructor() {
    this.db = db;
  }

  async addCard(userId, cardData) {
    try {
      const cardsRef = collection(this.db, `users/${userId}/cards`);
      const cardRef = doc(cardsRef);
      const newCard = {
        ...cardData,
        id: cardRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId
      };

      await setDoc(cardRef, newCard);
      return cardRef.id;
    } catch (error) {
      console.error('Error adding card:', error);
      throw new Error('Failed to add card');
    }
  }

  async updateCard(userId, cardId, cardData) {
    try {
      const cardRef = doc(this.db, `users/${userId}/cards`, cardId);
      const updatedCard = {
        ...cardData,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(cardRef, updatedCard);
      return cardId;
    } catch (error) {
      console.error('Error updating card:', error);
      throw new Error('Failed to update card');
    }
  }

  async deleteCard(userId, cardId) {
    try {
      await deleteDoc(doc(this.db, `users/${userId}/cards`, cardId));
    } catch (error) {
      console.error('Error deleting card:', error);
      throw new Error('Failed to delete card');
    }
  }

  async getAllCards(userId) {
    try {
      const cardsRef = collection(this.db, `users/${userId}/cards`);
      const snapshot = await getDocs(cardsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting cards:', error);
      throw new Error('Failed to get cards');
    }
  }

  async getSoldCards(userId) {
    try {
      const cardsRef = collection(this.db, `users/${userId}/cards`);
      const q = query(cardsRef, where("status", "==", "sold"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting sold cards:', error);
      throw new Error('Failed to get sold cards');
    }
  }

  async markAsSold(userId, cardId, soldData) {
    try {
      const cardRef = doc(this.db, `users/${userId}/cards`, cardId);
      const soldCard = {
        ...soldData,
        status: 'sold',
        soldAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(cardRef, soldCard);
      return cardId;
    } catch (error) {
      console.error('Error marking card as sold:', error);
      throw new Error('Failed to mark card as sold');
    }
  }
}

export const cardService = new CardService(); 