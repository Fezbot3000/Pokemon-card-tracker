import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';
import { collection, addDoc } from 'firebase/firestore';
import { Modal } from '../../design-system';
import { useAuth } from '../../design-system';

function EditListingModal({ isOpen, onClose, listing, onListingDeleted }) {
  const { preferredCurrency } = useUserPreferences();
  const { user } = useAuth(); // Get current authenticated user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    note: '',
    location: '',
    markAsSold: false
  });

  // Initialize form data when listing changes
  useEffect(() => {
    if (!listing) return;
    
    setFormData({
      price: listing.listingPrice || '',
      note: listing.note || '',
      location: listing.location || '',
      markAsSold: false
    });
  }, [listing]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.markAsSold) {
      const numericPrice = parseFloat(formData.price);
      if (!formData.price || isNaN(numericPrice) || numericPrice <= 0) {
        return { isValid: false, error: 'Please enter a valid price' };
      }
    }
    return { isValid: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!listing) {
      toast.error('No listing data available');
      return;
    }
    
    const { isValid, error } = validateForm();
    
    if (!isValid) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.markAsSold) {
        // Move to sold-items collection
        await handleMarkAsSold();
      } else {
        // Update the existing listing
        const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
        await updateDoc(listingRef, {
          listingPrice: formData.price,
          note: formData.note,
          location: formData.location,
          timestampUpdated: serverTimestamp()
        });
        
        toast.success('Listing updated successfully');
      }
      
      onClose(); // Close the modal after successful update
    } catch (error) {
      logger.error('Error updating listing:', error);
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsSold = async () => {
    try {
      // 1. Create a new document in the sold-items collection
      const soldItemsRef = collection(firestoreDb, `users/${listing.userId}/sold-items`);
      
      // Prepare the sold item data
      const soldItemData = {
        ...listing.card,
        saleAmount: parseFloat(formData.price),
        saleCurrency: preferredCurrency.code,
        originalSaleAmount: parseFloat(formData.price),
        originalSaleCurrency: preferredCurrency.code,
        saleDate: new Date(),
        soldFrom: 'marketplace',
        soldNote: formData.note || '',
        timestampSold: serverTimestamp()
      };
      
      // Add to sold-items collection
      await addDoc(soldItemsRef, soldItemData);
      
      // 2. Delete the listing from marketplaceItems
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await deleteDoc(listingRef);
      
      toast.success('Card marked as sold and moved to sold items');
    } catch (error) {
      logger.error('Error marking item as sold:', error);
      throw error; // Re-throw to be caught by the parent try/catch
    }
  };

  const handleDeleteListing = async () => {
    if (!listing || !listing.id) {
      toast.error('No listing data available');
      return;
    }

    // Check if user is authenticated
    if (!user || !user.uid) {
      toast.error('You must be logged in to delete a listing');
      return;
    }

    // Check if user owns the listing
    if (listing.userId && listing.userId !== user.uid) {
      toast.error('You can only delete your own listings');
      return;
    }

    setIsDeleting(true);
    logger.info('Starting deletion process for listing:', listing.id);

    try {
      // Use a batch to ensure atomic operation
      const batch = writeBatch(firestoreDb);
      
      // Get a direct reference to the document
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      
      // First verify the document exists
      const docSnap = await getDoc(listingRef);
      
      if (!docSnap.exists()) {
        logger.warn(`Document at marketplaceItems/${listing.id} does not exist or has already been deleted`);
        toast.success('Listing has been removed');
        setShowDeleteConfirmation(false);
        onClose();
        
        // Still notify parent to update UI
        if (typeof onListingDeleted === 'function') {
          onListingDeleted(listing.id);
        }
        return;
      }
      
      // Update status to 'archived' first, then delete
      batch.update(listingRef, { status: 'archived', timestampArchived: serverTimestamp() });
      batch.delete(listingRef);
      
      // Also update the isListed flag in the original card document
      if (listing.card && listing.card.slabSerial && listing.userId) {
        const cardRef = doc(firestoreDb, `users/${listing.userId}/cards/${listing.card.slabSerial}`);
        // Check if the card document exists before updating
        const cardDoc = await getDoc(cardRef);
        if (cardDoc.exists()) {
          logger.info(`Updating isListed flag for card: ${listing.card.slabSerial}`);
          batch.update(cardRef, { isListed: false });
        } else {
          logger.warn(`Card document not found for: ${listing.card.slabSerial}`);
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      // Verify deletion was successful
      const verifySnap = await getDoc(listingRef);
      if (!verifySnap.exists()) {
        logger.info(`Successfully deleted document at: marketplaceItems/${listing.id}`);
        toast.success('Listing deleted successfully');
      } else {
        throw new Error('Document still exists after deletion');
      }
      
      // Update UI
      setShowDeleteConfirmation(false);
      
      // Notify parent component about the deletion
      if (typeof onListingDeleted === 'function') {
        onListingDeleted(listing.id);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      logger.error('Error deleting listing:', error);
      logger.error('Listing details:', { id: listing.id, userId: listing.userId, userAuth: user?.uid });
      toast.error('Failed to delete listing. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !listing) return null;
  
  // Delete confirmation modal
  const DeleteConfirmationModal = () => (
    <Modal
      isOpen={showDeleteConfirmation}
      onClose={() => setShowDeleteConfirmation(false)}
      title="Delete Listing"
      closeOnClickOutside={!isDeleting}
    >
      <div className="p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="size-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Are you sure you want to delete this listing?</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This action will permanently remove the listing from the marketplace. This action cannot be undone.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row-reverse">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteListing}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
          >
            {isDeleting ? (
              <>
                <span className="mr-2 size-4 animate-spin rounded-full border-y-2 border-white"></span>
                Deleting...
              </>
            ) : (
              'Delete Listing'
            )}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setShowDeleteConfirmation(false)}
            className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-900 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      <DeleteConfirmationModal />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Listing"
        size="2xl"
        closeOnClickOutside={true}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isSubmitting || isDeleting}
              className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-base font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-[#0F0F0F] dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete Listing
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-listing-form"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-base font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-y-2 border-white"></span>
                  {formData.markAsSold ? 'Processing...' : 'Updating...'}
                </>
              ) : (
                formData.markAsSold ? 'Mark as Sold' : 'Update Listing'
              )}
            </button>
          </>
        }
      >
        <form id="edit-listing-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.markAsSold}
                onChange={(e) => handleInputChange('markAsSold', e.target.checked)}
                className="size-5 rounded border-gray-300 bg-white text-purple-600 focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:focus:ring-purple-400"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Mark as sold</span>
            </label>
          </div>

          {!formData.markAsSold && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price ({preferredCurrency.code}) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                    {preferredCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-8 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:text-white dark:placeholder:text-gray-400"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required={!formData.markAsSold}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:text-white dark:placeholder:text-gray-400"
                  placeholder="Enter your location (e.g., Sydney)"
                />
              </div>
            </div>
          )}

          {!formData.markAsSold && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Note (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:text-white dark:placeholder:text-gray-400"
                placeholder="Add a note about this card..."
                rows="4"
              />
            </div>
          )}

          {formData.markAsSold && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/20">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="size-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Attention</h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      Marking this card as sold will remove it from the marketplace and add it to your sold items.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}

export default EditListingModal;
