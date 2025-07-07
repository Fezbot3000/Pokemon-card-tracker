import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { doc, getDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { db as firestoreDb, storage } from '../services/firebase';
import db from '../services/firestore/dbAdapter';
import logger from './logger';

/**
 * Data Export Manager
 * Handles exporting user data as ZIP files
 */
export const exportDataManager = {
  /**
   * Export all data as a ZIP file or JSON file for personal data export
   * @param {Object} options - Export options
   * @param {boolean} options.personalDataExport - Whether this is a personal data export
   * @param {boolean} options.returnBlob - Whether to return the blob instead of downloading
   * @param {Object} user - Current user object
   * @param {string} selectedCollection - Currently selected collection
   * @returns {Promise<Blob|void>}
   */
  async exportData(options = {}, user, selectedCollection) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if this is a personal data export
        if (options.personalDataExport) {
          // Show loading toast
          toast.loading('Preparing personal data export...', {
            id: 'export-data',
          });

          // Get current user ID
          const userId = user?.uid;
          if (!userId) {
            toast.error('You must be logged in to export your data', {
              id: 'export-data',
            });
            reject(new Error('User not authenticated'));
            return;
          }

          // Create a new ZIP file for personal data export
          const zip = new JSZip();

          // Create an images folder in the ZIP
          const imagesFolder = zip.folder('images');

          // Fetch user document from Firestore
          let userDocument = {};
          try {
            const userDocRef = doc(firestoreDb, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              userDocument = userDocSnap.data();
              // Remove any sensitive fields
              delete userDocument.apiKeys;
            }
          } catch (error) {
            logger.error('Error fetching user document:', error);
            // Continue anyway - we'll still export other data
          }

          // Get ALL collections data
          const allCollections = await db.getCollections();

          // Get profile data
          const profileData = await db.getProfile();

          // Get sold cards data
          const soldCardsData = await db.getSoldCards();

          // Get purchase invoices data
          const purchaseInvoicesData = await db.getPurchaseInvoices();

          // Get user preferences from localStorage
          const userPreferences = {
            theme: localStorage.getItem('theme') || 'light',
            cardListSortField:
              localStorage.getItem('cardListSortField') || 'name',
            cardListSortDirection:
              localStorage.getItem('cardListSortDirection') || 'asc',
            cardListDisplayMetric:
              localStorage.getItem('cardListDisplayMetric') || 'value',
            preferredCurrency:
              localStorage.getItem('preferredCurrency') || 'USD',
            featureFlags: JSON.parse(
              localStorage.getItem('appFeatureFlags') || '{}'
            ),
          };

          // Process collections and their cards
          const processedCollections = {};
          const cardImageMap = new Map(); // Map to track which cards have images

          // Convert allCollections object to array format for iteration
          const collectionsArray = Object.entries(allCollections).map(
            ([name, data]) => ({ name, data })
          );

          for (const collection of collectionsArray) {
            const collectionName = collection.name;
            const cards = collection.data || [];

            processedCollections[collectionName] = [];

            for (const card of cards) {
              // Create a clean copy of the card without internal fields
              const cleanCard = { ...card };

              // Remove internal fields
              delete cleanCard._lastUpdateTime;
              delete cleanCard._syncStatus;
              delete cleanCard._localId;

              // Track card IDs for image mapping
              if (cleanCard.id) {
                cardImageMap.set(cleanCard.id, cleanCard);
              }
              if (cleanCard.slabSerial) {
                cardImageMap.set(cleanCard.slabSerial, cleanCard);
              }

              processedCollections[collectionName].push(cleanCard);
            }
          }

          // Process sold items
          const processedSoldItems = [];

          for (const soldCard of soldCardsData) {
            // Create a clean copy of the sold card without internal fields
            const cleanSoldCard = { ...soldCard };

            // Remove internal fields
            delete cleanSoldCard._lastUpdateTime;
            delete cleanSoldCard._syncStatus;
            delete cleanSoldCard._localId;

            // Track card IDs for image mapping
            if (cleanSoldCard.id) {
              cardImageMap.set(cleanSoldCard.id, cleanSoldCard);
            }
            if (cleanSoldCard.slabSerial) {
              cardImageMap.set(cleanSoldCard.slabSerial, cleanSoldCard);
            }

            processedSoldItems.push(cleanSoldCard);
          }

          // Create a progress indicator element
          const progressContainer = document.createElement('div');
          progressContainer.style.position = 'fixed';
          progressContainer.style.top = '50%';
          progressContainer.style.left = '50%';
          progressContainer.style.transform = 'translate(-50%, -50%)';
          progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          progressContainer.style.padding = '20px';
          progressContainer.style.borderRadius = '10px';
          progressContainer.style.zIndex = '9999';
          progressContainer.style.color = 'white';
          progressContainer.style.width = '300px';
          progressContainer.style.textAlign = 'center';

          const progressTitle = document.createElement('h3');
          progressTitle.textContent = 'Downloading Images';
          progressTitle.style.margin = '0 0 10px 0';

          const progressText = document.createElement('div');
          progressText.textContent = 'Fetching image list...';
          progressText.style.marginBottom = '10px';

          const progressBarContainer = document.createElement('div');
          progressBarContainer.style.width = '100%';
          progressBarContainer.style.backgroundColor = '#444';
          progressBarContainer.style.borderRadius = '5px';
          progressBarContainer.style.overflow = 'hidden';

          const progressBar = document.createElement('div');
          progressBar.style.width = '0%';
          progressBar.style.height = '20px';
          progressBar.style.backgroundColor = '#4CAF50';
          progressBar.style.transition = 'width 0.3s';

          const progressStats = document.createElement('div');
          progressStats.style.marginTop = '10px';
          progressStats.textContent = '0/0 images';

          progressBarContainer.appendChild(progressBar);
          progressContainer.appendChild(progressTitle);
          progressContainer.appendChild(progressText);
          progressContainer.appendChild(progressBarContainer);
          progressContainer.appendChild(progressStats);
          document.body.appendChild(progressContainer);

          // Function to update progress
          const updateProgress = (current, total, message) => {
            const percent = total > 0 ? Math.round((current / total) * 100) : 0;
            progressBar.style.width = `${percent}%`;
            progressText.textContent = message || `Downloading images...`;
            progressStats.textContent = `${current}/${total} images`;
            logger.debug(
              `Export progress: ${percent}% - ${current}/${total} - ${message || ''}`
            );
          };

          // Process images
          const imagePromises = [];
          let processedImageCount = 0;

          try {
            // Fetch all images from Firebase Storage
            toast.loading('Fetching images from cloud storage...', {
              id: 'export-data',
            });

            // Get all images from Firebase Storage for this user
            const storageRef = ref(storage, `images/${userId}`);
            const cloudImagesList = await listAll(storageRef);
            const totalImages = cloudImagesList.items.length;

            logger.debug(
              `Found ${totalImages} cloud images in Firebase Storage`
            );
            updateProgress(
              0,
              totalImages,
              `Found ${totalImages} images to download`
            );

            // Process images in batches to avoid overwhelming the browser
            const batchSize = 10;
            const totalBatches = Math.ceil(totalImages / batchSize);

            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
              const batchStart = batchIndex * batchSize;
              const batchEnd = Math.min(batchStart + batchSize, totalImages);
              const batchItems = cloudImagesList.items.slice(
                batchStart,
                batchEnd
              );

              // Process each batch with Promise.all for parallel downloads
              const batchPromises = batchItems.map(async imageRef => {
                try {
                  const imageId = imageRef.name;

                  // Download the image from Firebase Storage
                  const imageUrl = await getDownloadURL(imageRef);
                  const response = await fetch(imageUrl);

                  if (!response.ok) {
                    throw new Error(
                      `Failed to fetch image: ${response.status} ${response.statusText}`
                    );
                  }

                  const imageBlob = await response.blob();

                  // Add image to ZIP
                  const extension = imageBlob.type.split('/')[1] || 'jpg';
                  const filename = `${imageId}.${extension}`;
                  await imagesFolder.file(filename, imageBlob);

                  // Update image reference in card data if this image belongs to a card
                  const card = cardImageMap.get(imageId);
                  if (card) {
                    card.imageUrl = `images/${filename}`;
                  }

                  // Also check if this is a numeric ID (which might be a slab serial)
                  if (/^\d+$/.test(imageId)) {
                    const cardBySlabSerial = cardImageMap.get(imageId);
                    if (cardBySlabSerial && cardBySlabSerial !== card) {
                      cardBySlabSerial.imageUrl = `images/${filename}`;
                    }
                  }

                  processedImageCount++;
                  updateProgress(
                    processedImageCount,
                    totalImages,
                    `Downloaded ${processedImageCount} of ${totalImages} images`
                  );

                  return { success: true, imageId };
                } catch (error) {
                  logger.error(
                    `Failed to export cloud image ${imageRef.name}:`,
                    error
                  );
                  return { success: false, imageId: imageRef.name, error };
                }
              });

              await Promise.all(batchPromises);
            }
          } catch (error) {
            logger.error('Error processing cloud images:', error);
            toast.error('Error downloading images from cloud storage', {
              id: 'export-data',
            });
          } finally {
            // Clean up the progress indicator when done
            document.body.removeChild(progressContainer);
          }

          // Create metadata with counts
          const metadata = {
            totalCards: Object.values(processedCollections).reduce(
              (sum, cards) => sum + cards.length,
              0
            ),
            totalSoldItems: processedSoldItems.length,
            totalPurchaseInvoices: purchaseInvoicesData.length,
            totalCollections: Object.keys(processedCollections).length,
            totalImages: processedImageCount,
            exportDate: new Date().toISOString(),
            userId: userId,
          };

          // Create the comprehensive personal data export
          const personalDataExport = {
            exportDate: new Date().toISOString(),
            version: '3.0',
            user: {
              profile: {
                ...profileData,
                ...userDocument,
                userId: userId,
                email: user?.email || '',
              },
              preferences: userPreferences,
            },
            collections: processedCollections,
            soldItems: processedSoldItems,
            purchaseInvoices: purchaseInvoicesData,
            metadata: metadata,
          };

          // Add the personal data JSON to the root of the ZIP
          zip.file(
            'personal_data.json',
            JSON.stringify(personalDataExport, null, 2)
          );

          // Add a README file
          const readme = `Pokemon Card Tracker - Personal Data Export
Created: ${new Date().toISOString()}
User ID: ${userId}

This ZIP file contains:
- personal_data.json: Complete export of your personal data
- /images/: All card images referenced in the data file

This export includes:
- ${metadata.totalCards} cards across ${metadata.totalCollections} collections
- ${metadata.totalSoldItems} sold items
- ${metadata.totalPurchaseInvoices} purchase invoices
- ${metadata.totalImages} images`;

          zip.file('README.txt', readme);

          // Generate the ZIP file
          toast.loading('Generating ZIP file...', { id: 'export-data' });
          const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
              level: 9,
            },
          });

          // Update toast to success
          toast.success('Personal data export created successfully!', {
            id: 'export-data',
          });

          // Create download link for ZIP file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `mycardtracker_data_${userId}_${timestamp}.zip`;
          document.body.appendChild(link);
          link.click();

          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);

          resolve();
          return;
        }

        // Regular ZIP backup export (existing functionality)
        toast.loading('Preparing backup...', { id: 'export-data' });

        // Create a new ZIP file
        const zip = new JSZip();

        // Get ALL collections data
        const allCollections = await db.getCollections();

        // Get profile data
        const profileData = await db.getProfile();

        // Get sold cards data
        const soldCardsData = await db.getSoldCards();

        // Get purchase invoices data
        const purchaseInvoicesData = await db.getPurchaseInvoices();

        // Get user preferences from localStorage
        const userPreferences = {
          theme: localStorage.getItem('theme') || 'light',
          cardListSortField:
            localStorage.getItem('cardListSortField') || 'name',
          cardListSortDirection:
            localStorage.getItem('cardListSortDirection') || 'asc',
          cardListDisplayMetric:
            localStorage.getItem('cardListDisplayMetric') || 'value',
          featureFlags: JSON.parse(
            localStorage.getItem('appFeatureFlags') || '{}'
          ),
        };

        // Create a data folder in the ZIP
        const dataFolder = zip.folder('data');

        // Create a comprehensive data file that includes everything
        const completeBackupData = {
          version: '2.0',
          exportDate: new Date().toISOString(),
          collections: allCollections,
          settings: {
            defaultCollection: selectedCollection,
          },
          profile: profileData,
          soldCards: soldCardsData,
          purchaseInvoices: purchaseInvoicesData,
          userPreferences: userPreferences,
        };

        // Add the comprehensive data file
        dataFolder.file(
          'pokemon-card-tracker-data.json',
          JSON.stringify(completeBackupData, null, 2)
        );

        // Add legacy collections.json for backward compatibility
        const collectionsData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          collections: allCollections,
          settings: {
            defaultCollection: selectedCollection,
          },
          profile: profileData,
          soldCards: soldCardsData,
        };
        dataFolder.file(
          'collections.json',
          JSON.stringify(collectionsData, null, 2)
        );

        // Create an images folder in the ZIP
        const imagesFolder = zip.folder('images');

        // Process ALL images from ALL collections and sold cards
        const imagePromises = [];

        // Process collection cards
        for (const [collectionName, cards] of Object.entries(allCollections)) {
          if (!Array.isArray(cards)) continue;

          for (const card of cards) {
            const promise = (async () => {
              try {
                const imageBlob = await db.getImage(card.slabSerial);

                if (!imageBlob) return;

                // Add image to ZIP with slab serial as filename
                const extension = imageBlob.type.split('/')[1] || 'jpg';
                const filename = `${card.slabSerial}.${extension}`;
                await imagesFolder.file(filename, imageBlob);

                // Update card with image path
                card.imagePath = `images/${filename}`;
              } catch (error) {
                // Silent fail for individual images
                logger.error(
                  `Failed to export image for card ${card.slabSerial}:`,
                  error
                );
              }
            })();
            imagePromises.push(promise);
          }
        }

        // Process sold cards images
        for (const soldCard of soldCardsData) {
          const promise = (async () => {
            try {
              // Try to get image from database
              const imageBlob = await db.getImage(soldCard.slabSerial);

              if (!imageBlob) {
                logger.debug(`No image found for card ${soldCard.slabSerial}`);
                return;
              }

              // Log successful image retrieval
              logger.debug(
                `Retrieved image for card ${soldCard.slabSerial}, type: ${imageBlob.type}, size: ${imageBlob.size} bytes`
              );

              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${soldCard.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);

              // Update card with image path
              soldCard.imagePath = `images/${filename}`;
              logger.debug(
                `Added image ${filename} to ZIP for card ${soldCard.slabSerial}`
              );
            } catch (error) {
              // Log detailed error for debugging
              logger.error(
                `Failed to export image for card ${soldCard.slabSerial}:`,
                error
              );
            }
          })();
          imagePromises.push(promise);
        }

        try {
          // Wait for all images to be processed
          await Promise.all(imagePromises);

          // Log how many images were processed
          const imageCount = imagePromises.length;
          logger.debug(`Processed ${imageCount} image promises for export`);

          // Update data files with image paths
          dataFolder.file(
            'pokemon-card-tracker-data.json',
            JSON.stringify(completeBackupData, null, 2)
          );
          dataFolder.file(
            'collections.json',
            JSON.stringify(collectionsData, null, 2)
          );

          // Add a debug file with information about the export process
          const debugInfo = {
            timestamp: new Date().toISOString(),
            collectionsCount: Object.keys(allCollections).length,
            cardsCount: Object.values(allCollections).reduce(
              (count, cards) =>
                count + (Array.isArray(cards) ? cards.length : 0),
              0
            ),
            soldCardsCount: soldCardsData.length,
            purchaseInvoicesCount: purchaseInvoicesData.length,
            imagePromisesCount: imageCount,
          };
          dataFolder.file(
            'debug-info.json',
            JSON.stringify(debugInfo, null, 2)
          );

          // Add a README file
          const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/pokemon-card-tracker-data.json: Complete backup including all collections, cards, sold items, purchase invoices, and user preferences
- /data/collections.json: Legacy format for backward compatibility
- /images/: All card images referenced in the data files

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your data will be restored including collections, cards, sold items, purchase invoices, and user preferences`;

          zip.file('README.txt', readme);

          // Generate the ZIP file with compression
          const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
              level: 9,
            },
          });

          // Update toast to success
          toast.success('Backup created successfully!', { id: 'export-data' });

          // If returnBlob option is true, return the blob directly instead of downloading
          if (options.returnBlob) {
            resolve(content);
            return;
          }

          // Create download link for ZIP file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `pokemon-card-tracker-backup-${timestamp}.zip`;
          document.body.appendChild(link);
          link.click();

          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);

          resolve();
        } catch (error) {
          logger.error('Export error:', error);
          reject(error);
        }
      } catch (error) {
        logger.error('Export error:', error);
        reject(error);
      }
    });
  },
};
