import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import db from './firestore/dbAdapter';
import logger from '../utils/logger';
import { CardRepository } from '../repositories/CardRepository';

/**
 * CloudSync service for handling incremental cloud backups and restores
 */
class CloudSyncService {
  /**
   * Perform an incremental cloud backup
   * @param {string} userId - The current user ID
   * @param {Function} setProgress - Function to update progress percentage
   * @param {Function} setStatus - Function to update status message
   * @param {Function} addLog - Function to add log messages
   * @returns {Promise<void>}
   */
  async incrementalBackup(userId, setProgress, setStatus, addLog) {
    try {
      addLog('Starting incremental cloud backup...');
      setProgress(0);
      setStatus('Initializing backup...');

      // Step 1: Get local data
      addLog('Fetching local collections...');
      const localCollections = await db.getAllCollections();
      addLog(`Found ${localCollections.length} local collections.`);

      addLog('Fetching local images...');
      const localImages = await db.getAllImages();
      addLog(`Found ${localImages.length} local images.`);
      
      setProgress(10);

      // Step 2: Check if cloud backup exists
      const backupRef = ref(storage, `backups/${userId}`);
      const listResult = await listAll(backupRef);
      
      // Check if metadata.json exists to determine if there's an existing backup
      const metadataFile = listResult.items.find(item => item.name === 'metadata.json');
      let cloudCollections = [];
      let cloudImageIds = [];
      let existingMetadata = null;
      
      if (metadataFile) {
        addLog('Existing backup found. Fetching cloud data for comparison...');
        setStatus('Comparing with cloud data...');
        
        // Download metadata
        const metadataUrl = await getDownloadURL(metadataFile);
        const metadataResponse = await fetch(metadataUrl);
        if (metadataResponse.ok) {
          existingMetadata = await metadataResponse.json();
          addLog(`Cloud backup metadata: Timestamp ${existingMetadata.timestamp}, Collections: ${existingMetadata.collectionCount}, Images: ${existingMetadata.imageCount}`);
        }
        
        // Download collections data
        const collectionsFile = listResult.items.find(item => item.name === 'collections.json');
        if (collectionsFile) {
          const collectionsUrl = await getDownloadURL(collectionsFile);
          const collectionsResponse = await fetch(collectionsUrl);
          if (collectionsResponse.ok) {
            cloudCollections = await collectionsResponse.json();
            addLog(`Downloaded cloud collections: ${cloudCollections.length} collections.`);
          }
        }
        
        // List cloud images
        const imagesRef = ref(storage, `backups/${userId}/images`);
        const imageListResult = await listAll(imagesRef);
        cloudImageIds = imageListResult.items.map(item => {
          // Extract ID from filename (e.g., '12345.png' -> '12345')
          const nameParts = item.name.split('.');
          return nameParts.slice(0, -1).join('.');
        });
        addLog(`Found ${cloudImageIds.length} images in cloud storage.`);
      } else {
        addLog('No existing backup found. Creating new backup...');
      }
      
      setProgress(20);
      
      // Step 3: Determine what's changed
      // Find collections to add/update
      const collectionsToUpdate = localCollections;
      
      // Get all valid card IDs to verify images are actually associated with cards
      addLog('Fetching all card IDs to verify image associations...');
      let allCardIds = [];
      
      // Create a CardRepository instance to fetch cards
      const cardRepo = new CardRepository(userId);
      
      // Extract card IDs from collections directly
      for (const collection of localCollections) {
        try {
          // First try to get cards directly from the collection array
          if (Array.isArray(collection)) {
            // Extract card IDs from the collection array
            const cardIds = collection.map(card => card.id || card.slabSerial).filter(Boolean);
            allCardIds = [...allCardIds, ...cardIds];
          } 
          // If collection is an object with an id property, try to fetch cards from CardRepository
          else if (collection.id) {
            try {
              const cards = await cardRepo.getCardsByCollection(collection.id);
              const cardIds = cards.map(card => card.id || card.slabSerial).filter(Boolean);
              allCardIds = [...allCardIds, ...cardIds];
            } catch (repoError) {
              addLog(`Error fetching cards from repository for collection ${collection.id}: ${repoError.message}`);
            }
          }
        } catch (error) {
          addLog(`Error processing collection for card IDs: ${error.message}`);
        }
      }
      
      // If we still don't have any card IDs, try to extract them from the collections object structure
      if (allCardIds.length === 0) {
        try {
          // Get collections as object from DB
          const collectionsObj = await db.getCollections();
          
          // Process each collection in the object
          Object.values(collectionsObj).forEach(cards => {
            if (Array.isArray(cards)) {
              const cardIds = cards.map(card => card.id || card.slabSerial).filter(Boolean);
              allCardIds = [...allCardIds, ...cardIds];
            }
          });
          
          addLog(`Extracted ${allCardIds.length} card IDs from collections object.`);
        } catch (error) {
          addLog(`Error extracting card IDs from collections object: ${error.message}`);
        }
      }
      
      addLog(`Found ${allCardIds.length} valid card IDs across all collections.`);
      
      // Filter out orphaned images that don't belong to any card
      const validLocalImages = localImages.filter(image => {
        // Check if the image ID matches any card ID
        // Note: In some cases, the image ID might be stored with the card's slabSerial instead of id
        return allCardIds.includes(image.id);
      });
      
      if (validLocalImages.length < localImages.length) {
        addLog(`Found ${localImages.length - validLocalImages.length} orphaned images that will be excluded from backup.`);
      }
      
      // Find images to add (valid images in local but not in cloud)
      const imagesToAdd = validLocalImages.filter(image => !cloudImageIds.includes(image.id));
      addLog(`Found ${imagesToAdd.length} new images to upload.`);
      
      // Find images to remove (images in cloud but not in valid local images)
      const validLocalImageIds = validLocalImages.map(image => image.id);
      const imagesToRemove = cloudImageIds.filter(id => !validLocalImageIds.includes(id));
      addLog(`Found ${imagesToRemove.length} images to remove from cloud.`);
      
      setProgress(30);
      
      // Step 4: Update metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        collectionCount: localCollections.length,
        imageCount: validLocalImages.length,
        incrementalUpdate: true,
        lastFullBackup: existingMetadata ? existingMetadata.timestamp : null
      };
      
      addLog('Uploading updated metadata...');
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataRef = ref(storage, `backups/${userId}/metadata.json`);
      await uploadBytes(metadataRef, metadataBlob);
      addLog('Metadata uploaded successfully.');
      
      setProgress(40);
      
      // Step 5: Update collections data
      addLog('Uploading collections data...');
      const collectionsBlob = new Blob([JSON.stringify(collectionsToUpdate)], { type: 'application/json' });
      const collectionsRef = ref(storage, `backups/${userId}/collections.json`);
      await uploadBytes(collectionsRef, collectionsBlob);
      addLog('Collections data uploaded successfully.');
      
      setProgress(50);
      
      // Step 6: Upload new images
      if (imagesToAdd.length > 0) {
        addLog(`Uploading ${imagesToAdd.length} new images...`);
        setStatus(`Uploading new images (0/${imagesToAdd.length})...`);
        
        let successfulUploads = 0;
        for (let i = 0; i < imagesToAdd.length; i++) {
          const image = imagesToAdd[i];
          const progress = 50 + Math.round(((i + 1) / imagesToAdd.length) * 30); // Images take 30% of progress
          setProgress(progress);
          setStatus(`Uploading image ${i + 1}/${imagesToAdd.length}`);
          
          try {
            const imageName = `${image.id}.${image.format || 'png'}`;
            const imageRef = ref(storage, `backups/${userId}/images/${imageName}`);
            
            // Determine which property to use as the blob
            let imageBlob;
            
            if (image.blob instanceof Blob) {
              addLog(`Using blob property for image ${image.id}`);
              imageBlob = image.blob;
            } else if (typeof image.data === 'string' && image.data.startsWith('data:')) {
              // Convert base64 to blob
              addLog(`Converting base64 to blob for image ${image.id}`);
              try {
                const byteString = atob(image.data.split(',')[1]);
                const mimeString = image.data.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let j = 0; j < byteString.length; j++) {
                  ia[j] = byteString.charCodeAt(j);
                }
                imageBlob = new Blob([ab], { type: mimeString });
              } catch (conversionError) {
                addLog(`Error converting base64 for image ${image.id}: ${conversionError.message}`);
                continue;
              }
            } else {
              // Try to create a simple blob if we have any usable data
              if (image.blob) {
                addLog(`Creating blob from non-Blob blob property for image ${image.id}`);
                imageBlob = new Blob([image.blob], { type: 'image/png' });
              } else if (image.data) {
                addLog(`Creating blob from non-Blob data property for image ${image.id}`);
                imageBlob = new Blob([image.data], { type: 'image/png' });
              } else {
                addLog(`Skipping image ${image.id}: no usable data found`);
                continue;
              }
            }
            
            // Upload the image
            addLog(`Uploading image ${i + 1}/${imagesToAdd.length}: ${imageName}`);
            await uploadBytes(imageRef, imageBlob);
            successfulUploads++;
          } catch (error) {
            addLog(`Error processing image ${image.id}: ${error.message}`);
            continue; // Skip this image and continue with the next one
          }
        }
        
        addLog(`New images uploaded: ${successfulUploads}/${imagesToAdd.length}`);
      } else {
        addLog('No new images to upload.');
      }
      
      setProgress(80);
      
      // Step 7: Remove deleted images
      if (imagesToRemove.length > 0) {
        addLog(`Removing ${imagesToRemove.length} deleted images from cloud...`);
        setStatus(`Removing deleted images (0/${imagesToRemove.length})...`);
        
        let successfulDeletions = 0;
        for (let i = 0; i < imagesToRemove.length; i++) {
          const imageId = imagesToRemove[i];
          const progress = 80 + Math.round(((i + 1) / imagesToRemove.length) * 15); // Deletions take 15% of progress
          setProgress(progress);
          setStatus(`Removing image ${i + 1}/${imagesToRemove.length}`);
          
          try {
            // We don't know the format, so we need to find the file in the cloud
            const imagesRef = ref(storage, `backups/${userId}/images`);
            const imageListResult = await listAll(imagesRef);
            const imageToDelete = imageListResult.items.find(item => {
              const nameParts = item.name.split('.');
              const id = nameParts.slice(0, -1).join('.');
              return id === imageId;
            });
            
            if (imageToDelete) {
              addLog(`Removing image: ${imageToDelete.name}`);
              await deleteObject(imageToDelete);
              successfulDeletions++;
            }
          } catch (error) {
            addLog(`Error removing image ${imageId}: ${error.message}`);
            continue;
          }
        }
        
        addLog(`Deleted images removed: ${successfulDeletions}/${imagesToRemove.length}`);
      } else {
        addLog('No images to remove from cloud.');
      }
      
      setProgress(95);
      
      // Step 8: Finalize
      setProgress(100);
      setStatus('Backup complete!');
      addLog('Incremental cloud backup completed successfully.');
      
      return {
        success: true,
        timestamp: metadata.timestamp,
        addedImages: imagesToAdd.length,
        removedImages: imagesToRemove.length,
        collections: localCollections.length
      };
    } catch (error) {
      logger.error('Incremental cloud backup failed:', error);
      addLog(`Incremental cloud backup failed: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      throw error;
    }
  }
}

export default new CloudSyncService();
