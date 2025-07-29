import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { toast } from '../../design-system';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';
import { collection, addDoc } from 'firebase/firestore';
import { Modal, Icon, ConfirmDialog } from '../../design-system';
import ModalButton from '../../design-system/atoms/ModalButton';
function EditListingModal({ isOpen, onClose, listing, onListingDeleted, onListingUpdated }) {
  const { preferredCurrency } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  

  const [formData, setFormData] = useState({
    price: '',
    note: '',
    location: '',
    markAsSold: false,
    markAsPending: false,
  });

  const [originalFormData, setOriginalFormData] = useState({
    price: '',
    note: '',
    location: '',
    status: 'available',
  });

  // Initialize form data when listing changes
  useEffect(() => {
    if (!listing) return;

    const initialData = {
      price: listing.listingPrice || '',
      note: listing.note || '',
      location: listing.location || '',
      status: listing.status || 'available',
    };

    setOriginalFormData(initialData);
    setFormData({
      ...initialData,
      markAsSold: false,
      markAsPending: false,
    });
  }, [listing]);

  // Check if form has changes
  const hasChanges = () => {
    if (!listing) return false;
    
    return (
      formData.price !== originalFormData.price ||
      formData.note !== originalFormData.note ||
      formData.location !== originalFormData.location ||
      formData.markAsSold ||
      formData.markAsPending
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
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

  const handleSubmit = async e => {
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
      } else if (formData.markAsPending) {
        // Mark as pending
        await handleMarkAsPending();
      } else {
        // Update the existing listing
        const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
        const updateData = {
          listingPrice: formData.price,
          note: formData.note,
          location: formData.location,
          timestampUpdated: serverTimestamp(),
        };

        // If currently pending and no markAsPending flag, mark as available
        if (originalFormData.status === 'pending' && !formData.markAsPending) {
          updateData.status = 'available';
        }

        await updateDoc(listingRef, updateData);

        toast.success('Listing updated successfully');
        
        // Notify parent of the update
        if (onListingUpdated) {
          onListingUpdated(listing.id, updateData);
        }
      }

      onClose(); // Close the modal after successful update
    } catch (error) {
      logger.error('Error updating listing:', error);
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPending = async () => {
    try {
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'pending',
        listingPrice: formData.price,
        note: formData.note,
        location: formData.location,
        timestampUpdated: serverTimestamp(),
      });

      toast.success('Listing marked as pending');
    } catch (error) {
      logger.error('Error marking listing as pending:', error);
      throw error;
    }
  };

  const handleMarkAsSold = async () => {
    try {
      // 1. Create a new document in the sold-items collection
      const soldItemsRef = collection(
        firestoreDb,
        `users/${listing.userId}/sold-items`
      );

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
        timestampSold: serverTimestamp(),
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

    setIsDeleting(true);
    
    try {
      // Simple delete like dashboard functionality
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await deleteDoc(listingRef);
      
      // Update isListed flag in the original card document
      if (listing.card && listing.card.slabSerial && listing.userId) {
        const cardRef = doc(
          firestoreDb,
          `users/${listing.userId}/cards/${listing.card.slabSerial}`
        );
        try {
          await updateDoc(cardRef, { isListed: false });
        } catch (cardError) {
          logger.warn('Could not update card isListed flag:', cardError);
        }
      }

      toast.success('Listing deleted successfully');
      
      // Notify parent component about the deletion
      if (onListingDeleted) {
        onListingDeleted(listing.id);
      }

      // Close the modal
      onClose();
    } catch (error) {
      logger.error('Error deleting listing:', error);
      toast.error('Failed to delete listing. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !listing) return null;



  return createPortal(
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteListing}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
        zIndex="60"
      />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Listing"
        size="modal-width-70"
        position="right"
        closeOnClickOutside={true}
        zIndex="50"
        footer={
          <div className="flex w-full items-center justify-between">
            <ModalButton
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </ModalButton>
            <div className="flex items-center space-x-3">
              <ModalButton
                variant="destructive"
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={isSubmitting || isDeleting}
                leftIcon={<Icon name="delete" />}
              >
                Delete Listing
              </ModalButton>
              <ModalButton
                type="submit"
                form="edit-listing-form"
                disabled={isSubmitting || !hasChanges()}
                variant={formData.markAsSold ? "success" : formData.markAsPending ? "secondary" : "primary"}
                leftIcon={
                  formData.markAsSold ? <Icon name="check_circle" /> : 
                  formData.markAsPending ? <Icon name="schedule" /> : 
                  <Icon name="edit" />
                }
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 size-4 animate-spin rounded-full border-y-2 border-white"></span>
                    {formData.markAsSold ? 'Processing...' : formData.markAsPending ? 'Processing...' : 'Updating...'}
                  </>
                ) : formData.markAsSold ? (
                  'Mark as Sold'
                ) : formData.markAsPending ? (
                  'Mark as Pending'
                ) : (
                  'Update Listing'
                )}
              </ModalButton>
            </div>
          </div>
        }
      >
        <form
          id="edit-listing-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.markAsSold}
                  onChange={e => {
                    handleInputChange('markAsSold', e.target.checked);
                    if (e.target.checked) {
                      handleInputChange('markAsPending', false);
                    }
                  }}
                  className="size-5 rounded border-gray-300 bg-white text-purple-600 focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:focus:ring-purple-400"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Mark as sold
                </span>
              </label>
            </div>

            {originalFormData.status === 'available' && (
              <div className="flex items-center">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.markAsPending}
                    onChange={e => {
                      handleInputChange('markAsPending', e.target.checked);
                      if (e.target.checked) {
                        handleInputChange('markAsSold', false);
                      }
                    }}
                    className="size-5 rounded border-gray-300 bg-white text-purple-600 focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:focus:ring-purple-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Mark as pending
                  </span>
                </label>
              </div>
            )}

            {originalFormData.status === 'pending' && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/30 dark:bg-yellow-900/20">
                <div className="flex items-center">
                  <Icon name="schedule" className="mr-2 size-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    This listing is currently marked as pending. Update to make it available again.
                  </span>
                </div>
              </div>
            )}
          </div>

          {!formData.markAsSold && !formData.markAsPending && (
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
                    onChange={e => handleInputChange('price', e.target.value)}
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
                  onChange={e => handleInputChange('location', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#1B2131] dark:text-white dark:placeholder:text-gray-400"
                  placeholder="Enter your location (e.g., Sydney)"
                />
              </div>
            </div>
          )}

          {!formData.markAsSold && !formData.markAsPending && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Note (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={e => handleInputChange('note', e.target.value)}
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
                  <svg
                    className="size-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Attention
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      Marking this card as sold will remove it from the
                      marketplace and add it to your sold items. This action
                      cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.markAsPending && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-900/20">
              <div className="flex">
                <div className="shrink-0">
                  <Icon name="schedule" className="size-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Mark as Pending
                  </h3>
                  <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                    <p>
                      This will mark the listing as pending, indicating it's temporarily unavailable but not sold.
                      You can mark it as available again later by editing the listing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </>,
    document.body
  );
}

export default EditListingModal;
