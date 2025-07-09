import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import db from '../services/firestore/dbAdapter';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import CardDetailsModal from '../design-system/components/CardDetailsModal';
import logger from '../services/LoggingService';

const CardDetails = memo(
  ({
    card = null,
    onClose,
    onUpdateCard,
    onDelete,
    collections = [],
    initialCollectionName = null,
  }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [editedCard, setEditedCard] = useState({
      ...card,
      id: card.id || card.slabSerial, // Ensure we have an ID for image loading
      year: card.year ? String(card.year) : '', // Convert year to string
      investmentUSD:
        typeof card.investmentUSD === 'number'
          ? String(Number(card.investmentUSD.toFixed(2)))
          : '0',
      currentValueUSD:
        typeof card.currentValueUSD === 'number'
          ? String(Number(card.currentValueUSD.toFixed(2)))
          : '0',
      investmentAUD:
        typeof card.investmentAUD === 'number'
          ? String(Number(card.investmentAUD.toFixed(2)))
          : '0',
      currentValueAUD:
        typeof card.currentValueAUD === 'number'
          ? String(Number(card.currentValueAUD.toFixed(2)))
          : '0',
      datePurchased: formatDate(card.datePurchased) || '',
      psaData: card.psaData || null,
      psaSearched: card.psaSearched || false,
    });
    const [cardImage, setCardImage] = useState(null);
    const [imageLoadingState, setImageLoadingState] = useState('loading');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const messageTimeoutRef = useRef(null);

    // Effect to update editedCard when card or initialCollectionName changes
    useEffect(() => {
      if (card) {
        // Create a complete copy of the card with all necessary fields
        const completeCard = {
          ...card,
          id: card.id || card.slabSerial,
          year: card.year ? String(card.year) : '',
          // Ensure financial values are properly formatted
          investmentUSD:
            typeof card.investmentUSD === 'number'
              ? String(Number(card.investmentUSD.toFixed(2)))
              : '0',
          currentValueUSD:
            typeof card.currentValueUSD === 'number'
              ? String(Number(card.currentValueUSD.toFixed(2)))
              : '0',
          investmentAUD:
            typeof card.investmentAUD === 'number'
              ? String(Number(card.investmentAUD.toFixed(2)))
              : '0',
          currentValueAUD:
            typeof card.currentValueAUD === 'number'
              ? String(Number(card.currentValueAUD.toFixed(2)))
              : '0',
          datePurchased: formatDate(card.datePurchased) || '',
          // Ensure collection fields are properly set
          collection:
            initialCollectionName || card.collection || card.collectionId || '',
          collectionId:
            initialCollectionName || card.collectionId || card.collection || '',
          // Ensure set fields are properly set
          set: card.set || card.setName || '',
          setName: card.setName || card.set || '',
          // Preserve PSA data
          psaData: card.psaData || null,
          psaSearched: card.psaSearched || false,
        };

        setEditedCard(completeCard);
        // Also reset unsaved changes flag when the card prop changes
        setHasUnsavedChanges(false);
      } else {
        // Handle case where card is null (e.g., adding new card - though this component might not be used for that)
        setEditedCard({});
      }
    }, [card, initialCollectionName]); // Rerun when card or initialCollectionName changes



    // Load the card image
    const loadCardImage = useCallback(async () => {
      setImageLoadingState('loading');
      try {
        // Prioritize Firestore image URL if available in the current card data
        if (editedCard.imageUrl) {
          // Revoke existing blob URL if necessary before setting the new URL
          if (cardImage && cardImage.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(cardImage);
            } catch (e) {
              logger.warn('Failed to revoke existing cardImage blob URL:', e);
            }
          }
          setCardImage(editedCard.imageUrl);
          setImageLoadingState('loaded');
          return;
        }

        // If no Firestore URL, try to load from IndexedDB
        const imageBlob = await db.getImage(card.id || card.slabSerial);
        if (imageBlob) {
          // Revoke existing blob URL if necessary before creating a new one
          if (cardImage && cardImage.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(cardImage);
            } catch (e) {
              logger.warn('Failed to revoke existing cardImage blob URL:', e);
            }
          }
          const blobUrl = URL.createObjectURL(imageBlob);
          setCardImage(blobUrl);
          setImageLoadingState('loaded');
        } else {
          setCardImage(null);
          setImageLoadingState('error');
        }
      } catch (error) {
        logger.error('Error loading card image:', error);
        if (cardImage && cardImage.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(cardImage);
          } catch (e) {
            logger.warn('Failed to revoke cardImage blob URL on error:', e);
          }
        }
        setCardImage(null);
        setImageLoadingState('error');
      }
    }, [editedCard.imageUrl, cardImage, card.id, card.slabSerial]);

    // Handle close action with confirmation for unsaved changes
    const handleClose = useCallback((saveSuccess = false, skipConfirmation = false) => {
      // If save was successful, we can close without confirmation
      if (!saveSuccess && hasUnsavedChanges && !skipConfirmation) {
        // TODO: Implement a dialog for confirmation
        if (
          !window.confirm(
            'You have unsaved changes. Are you sure you want to close?'
          )
        ) {
          return;
        }
      }

      // Clean up any blob URLs before closing
      if (
        editedCard &&
        editedCard._blobUrl &&
        editedCard._blobUrl.startsWith('blob:')
      ) {
        try {
          URL.revokeObjectURL(editedCard._blobUrl);
        } catch (e) {
          logger.warn('Failed to revoke blob URL on close:', e);
        }
      }

      // Also clean up cardImage if it's a blob URL
      if (cardImage && cardImage.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cardImage);
          // Set to null before closing to prevent invalid references
          setCardImage(null);
        } catch (e) {
          logger.warn('Failed to revoke cardImage blob URL on close:', e);
        }
      }

      // Reset unsaved changes state if save was successful
      if (saveSuccess) {
        setHasUnsavedChanges(false);
      }

      // Close the modal
      setIsOpen(false);

      // Execute onClose callback after a short delay to allow animations
      setTimeout(() => {
        onClose();
      }, 100);
    }, [hasUnsavedChanges, editedCard, cardImage, onClose]);

    // Effect to handle body scroll locking and image loading
    useEffect(() => {
      loadCardImage();

      // Effect to handle body scroll locking
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.classList.add('modal-open');
      
      // Store the current timeout ref value to avoid the stale closure issue
      // This fixes the react-hooks/exhaustive-deps warning
      const timeoutRef = messageTimeoutRef;

      return () => {
        // Restore scrolling on unmount
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.classList.remove('modal-open');

        // Clean up timeouts using the stored ref (not the .current property)
        const currentTimeout = timeoutRef.current;
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }

        // Properly clean up any blob URLs when unmounting
        if (cardImage && cardImage.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(cardImage);
            // Set cardImage to null to prevent future references
            setCardImage(null);
          } catch (e) {
            logger.warn('Failed to revoke cardImage blob URL on unmount:', e);
          }
        }
      };
    }, [cardImage, loadCardImage, handleClose]);

    // Listen for card-images-cleanup event to revoke blob URLs when collections are deleted
    useEffect(() => {
      const handleCardImagesCleanup = event => {
        const { cardIds } = event.detail;

        // If our current card's ID is in the list of cards being deleted
        if (cardIds.includes(card.id) || cardIds.includes(card.slabSerial)) {
          // Clean up any created object URLs to prevent memory leaks
          if (cardImage) {
            try {
              URL.revokeObjectURL(cardImage);
            } catch (error) {
              logger.error(
                `Error revoking blob URL for card ${card.id || card.slabSerial}:`,
                error
              );
            }

            // Clear the cardImage state
            setCardImage(null);
          }

          // Close the modal since the card is being deleted
          handleClose();
        }
      };

      // Add event listener
      window.addEventListener('card-images-cleanup', handleCardImagesCleanup);

      // Clean up event listener on component unmount
      return () => {
        window.removeEventListener(
          'card-images-cleanup',
          handleCardImagesCleanup
        );
      };
    }, [card.id, card.slabSerial, cardImage, handleClose]);

    // Handle image update
    const handleImageChange = async file => {
      if (file && (file instanceof Blob || file instanceof File)) {
        try {
          // Show loading state
          setImageLoadingState('loading');

          // Check if there's already a blob URL to revoke
          if (editedCard._blobUrl) {
            try {
              URL.revokeObjectURL(editedCard._blobUrl);
            } catch (e) {
              logger.warn('Failed to revoke previous blob URL', e);
            }
          }

          // Create a local URL for the image preview that's stable
          const localImageUrl = URL.createObjectURL(file);

          // Set card image directly from current scope
          setCardImage(localImageUrl);

          // Update the edited card with the pending image
          setEditedCard(prev => ({
            ...prev,
            imageUrl: localImageUrl,
            hasImage: true,
            _pendingImageFile: file, // Store the file for later upload
            _blobUrl: localImageUrl, // Store the blob URL for cleanup
            imageUpdatedAt: new Date().toISOString(), // Add timestamp to force refresh
          }));

          // Mark that we have unsaved changes
          setHasUnsavedChanges(true);

          // Update the loading state
          setImageLoadingState('idle');

          // Show a toast to let the user know they need to save
          toast.success('Image staged - Click Save to upload to the server');

          return file;
        } catch (error) {
          logger.error('Error processing image:', error);
          setImageLoadingState('error');

          // Try toast, but don't let it break the app
          try {
            toast.error(
              `Failed to process image: ${error.message || 'Unknown error'}`
            );
          } catch (toastError) {
            logger.error('Toast notification error:', toastError);
          }

          return null;
        }
      } else {
        logger.warn(
          `Invalid image file provided: ${file ? 'not a valid Blob/File' : 'null or undefined'}`
        );
        setImageLoadingState('error');

        try {
          toast.error('Invalid image file. Please try another image.');
        } catch (toastError) {
          logger.error('Toast notification error:', toastError);
        }

        return null;
      }
    };

    // Handle save action
    const handleSave = async () => {
      try {
        // Prepare the final card data
        let finalCardData = { ...editedCard };

        // Check if this card has a pending image to upload
        if (editedCard._pendingImageFile) {
          try {
            // Store the old blob URL for cleanup
            const oldBlobUrl = editedCard._blobUrl;

            // Show a loading toast
            const loadingToast = toast.loading('Uploading image...');

            // Now actually upload the image to Firebase
            // Always force replacement to ensure old image is deleted
            const imageUrl = await db.saveImage(
              card.id || card.slabSerial,
              editedCard._pendingImageFile,
              {
                isReplacement: true, // Always force replacement
                silent: false, // Show toast for image upload
              }
            );

            // Dismiss the loading toast
            toast.dismiss(loadingToast);

            // Check if we got a data URL (fallback for development)
            const isDataUrl = imageUrl && imageUrl.startsWith('data:');

            // Force a unique timestamp to prevent caching issues
            const timestamp = new Date().toISOString();

            // Update the finalCardData directly
            finalCardData = {
              ...finalCardData,
              imageUrl: imageUrl,
              hasImage: true,
              _isDataUrl: isDataUrl, // Flag to indicate this is a data URL
              imageUpdatedAt: timestamp, // Add timestamp to force refresh
              _pendingImageFile: null,
              _blobUrl: null,
              _forceImageRefresh: Date.now(), // Add a unique timestamp to force refresh
            };

            // Update the card image state with the new URL
            setCardImage(imageUrl);

            // Force a refresh of the image by creating an image element
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {};

            // We don't use the blob URL anymore since we have the Firebase URL
            // Revoke the blob URL after we've updated all references
            if (oldBlobUrl && oldBlobUrl.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(oldBlobUrl);
              } catch (e) {
                logger.warn('Failed to revoke blob URL during save:', e);
              }
            }

            toast.success('Image uploaded successfully');
          } catch (imageError) {
            logger.error('[CardDetails] Error uploading image:', imageError);
            toast.error(`Error uploading image: ${imageError.message}`);
            // Don't proceed with saving if image upload fails
            return;
          }
        }

        // Process the date value
        let processedDate = finalCardData.date || finalCardData.datePurchased;

        // Process the card data for saving and remove non-Firestore-compatible fields
        const processedCard = {
          ...finalCardData,
          year: finalCardData.year ? parseInt(finalCardData.year, 10) : null,
          investmentUSD: finalCardData.investmentUSD
            ? parseFloat(finalCardData.investmentUSD)
            : 0,
          currentValueUSD: finalCardData.currentValueUSD
            ? parseFloat(finalCardData.currentValueUSD)
            : 0,
          investmentAUD: finalCardData.investmentAUD
            ? parseFloat(finalCardData.investmentAUD)
            : 0,
          currentValueAUD: finalCardData.currentValueAUD
            ? parseFloat(finalCardData.currentValueAUD)
            : 0,
          datePurchased: processedDate, // Use the processed date
          // Ensure both collection properties are set for compatibility
          collection:
            finalCardData.collectionId ||
            finalCardData.collection ||
            initialCollectionName,
          collectionId:
            finalCardData.collectionId ||
            finalCardData.collection ||
            initialCollectionName,
          hasImage: finalCardData.hasImage || false, // Make sure hasImage is explicitly set
          imageUrl: finalCardData.imageUrl || null, // Make sure imageUrl is explicitly set
          imageUpdatedAt:
            finalCardData.imageUpdatedAt || new Date().toISOString(),
          // Add a debug flag
          _saveDebug: true,
        };

        // Make sure ID is explicitly set as a string
        if (card.id || card.slabSerial) {
          processedCard.id = String(card.id || card.slabSerial);
        }

        // Remove fields that shouldn't be saved to Firestore
        delete processedCard._pendingImageFile; // Remove the file object before saving to Firestore
        delete processedCard._blobUrl; // Remove the blob URL reference

        // Update the card in the database
        // Make sure we're using the function from props
        if (typeof onUpdateCard !== 'function') {
          throw new Error(
            'onUpdateCard function is not provided to CardDetails component'
          );
        }

        // Pass the processed card to the parent component's update function
        await onUpdateCard(processedCard);

        // Now update the editedCard state to match what we saved
        setEditedCard(finalCardData);

        // Reset unsaved changes flag
        setHasUnsavedChanges(false);

        // Show success message
        toast.success('Card saved successfully!');

        // Close the modal with success flag
        handleClose(true);
      } catch (error) {
        logger.error('=========== CARD SAVE ERROR ===========');
        logger.error('Error saving card:', error);
        toast.error('Error saving card: ' + error.message);
        logger.error('=========== CARD SAVE ERROR END ===========');
      }
    };

    // Handle card field changes and track if there are unsaved changes
    const handleCardChange = updatedCard => {
      setEditedCard(updatedCard);
      setHasUnsavedChanges(true);
    };

    // Clean up blob URLs when component unmounts or card changes
    useEffect(() => {
      return () => {
        // Cleanup function when component unmounts
        if (
          editedCard &&
          editedCard._blobUrl &&
          editedCard._blobUrl.startsWith('blob:')
        ) {
          try {
            URL.revokeObjectURL(editedCard._blobUrl);
          } catch (e) {
            logger.warn('Failed to revoke blob URL on unmount:', e);
          }
        }
      };
    }, [editedCard]);

    // Additional effect to ensure blob URLs are properly managed
    useEffect(() => {
      // When editedCard's imageUrl changes and is a blob URL
      if (editedCard.imageUrl && editedCard.imageUrl.startsWith('blob:')) {
        // Store the current blob URL
        const currentBlobUrl = editedCard.imageUrl;

        // Clean up function for when this blob URL is no longer needed
        return () => {
          try {
            // Only revoke if the current blob URL is different than the one in editedCard
            // This check prevents revoking a URL that might still be in use
            if (currentBlobUrl && currentBlobUrl !== editedCard.imageUrl) {
              URL.revokeObjectURL(currentBlobUrl);
            }
          } catch (e) {
            logger.warn('Failed to revoke stale blob URL:', e);
          }
        };
      }
    }, [editedCard.imageUrl]);



    return (
      <CardDetailsModal
        isOpen={isOpen}
        onClose={handleClose}
        card={editedCard}
        onSave={handleSave}
        // onDelete={onDelete} - Removed delete functionality from modal
        onMarkAsSold={async soldCardData => {
          try {
            // First get the existing sold cards
            let soldCards = (await db.getSoldCards()) || [];

            // Add the current card to the sold cards list
            soldCards.push({
              ...soldCardData,
              id: soldCardData.id || soldCardData.slabSerial,
              imageUrl: cardImage, // Include the card image URL
            });

            // Save the updated sold cards list
            await db.saveSoldCards(soldCards);

            // Remove the card from the main collection if onDelete is provided
            if (onDelete) {
              await onDelete(card);
            }

            toast.success('Card marked as sold and moved to Sold Items');
            handleClose(true);
          } catch (error) {
            logger.error('Error marking card as sold:', error);
            toast.error('Error marking card as sold: ' + error.message);
          }
        }}
        onChange={handleCardChange}
        image={cardImage}
        imageLoadingState={imageLoadingState}
        onImageChange={handleImageChange}
        onImageRetry={loadCardImage}
        className="fade-in"
        isPsaLoading={false}
        additionalSerialContent={null}
        collections={collections}
        initialCollectionName={initialCollectionName}
      />
    );
  }
);

CardDetails.propTypes = {
  card: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onUpdateCard: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  collections: PropTypes.arrayOf(PropTypes.string),
  initialCollectionName: PropTypes.string,
};

export default CardDetails;
