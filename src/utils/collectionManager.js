import { toast } from 'react-hot-toast';
import logger from './logger';
import db from '../services/firestore/dbAdapter';
import CardRepository from '../repositories/CardRepository';
import firestoreService from '../services/firestore/firestoreService';

/**
 * Collection management utility
 * Handles creating, renaming, and deleting collections
 */
export const collectionManager = {
  /**
   * Delete a collection and all its cards
   */
  async deleteCollection(name, { collections, user, selectedCollection, setCollections, setSelectedCollection }) {
    try {
      logger.log("collectionManager: Attempting to delete collection:", name);
      
      // Prevent deletion of any collection for data protection
      toast.error(`Cannot delete collections - this feature is disabled to protect your data`);
      return false;
    } catch (error) {
      logger.error("Error deleting collection:", error);
      toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
      throw error;
    }
  },

  /**
   * Create a new collection
   */
  async createCollection(name, { collections, setCollections, setSelectedCollection }) {
    if (!name || collections[name]) {
      logger.warn('Attempted to create an existing or empty collection:', name);
      return false;
    }

    try {
      const newCollections = { ...collections, [name]: [] };
      await db.saveCollections(newCollections);
      setCollections(newCollections);
      setSelectedCollection(name);
      localStorage.setItem('selectedCollection', name);
      
      toast.success(`Collection "${name}" created successfully`);
      logger.log('Created new collection:', name);
      
      return true;
    } catch (error) {
      logger.error('Error creating collection:', error);
      toast.error(`Failed to create collection: ${error.message}`);
      return false;
    }
  },

  /**
   * Rename a collection
   */
  async renameCollection(oldName, newName, { collections, setCollections, selectedCollection, setSelectedCollection }) {
    if (!oldName || !newName || oldName === newName) {
      return false;
    }

    // Protect special collections from being renamed
    if (oldName === 'All Cards' || oldName.toLowerCase() === 'sold') {
      toast.error(`Cannot rename the "${oldName}" collection - it is protected`);
      return false;
    }

    if (collections[newName]) {
      toast.error(`Collection "${newName}" already exists`);
      return false;
    }

    try {
      const newCollections = { ...collections };
      newCollections[newName] = newCollections[oldName];
      delete newCollections[oldName];
      
      await db.saveCollections(newCollections);
      setCollections(newCollections);
      
      if (selectedCollection === oldName) {
        setSelectedCollection(newName);
        localStorage.setItem('selectedCollection', newName);
      }
      
      toast.success(`Collection renamed from "${oldName}" to "${newName}"`);
      logger.log(`Renamed collection from "${oldName}" to "${newName}"`);
      
      return true;
    } catch (error) {
      logger.error('Error renaming collection:', error);
      toast.error(`Failed to rename collection: ${error.message}`);
      return false;
    }
  }
};
