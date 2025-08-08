import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';
import Modal from '../../design-system/molecules/Modal';
import Button from '../../design-system/atoms/Button';
import Icon from '../../design-system/atoms/Icon';
import LoggingService from '../../services/LoggingService';

function ListCardModal({ isOpen, onClose, selectedCards }) {
  const { user } = useAuth();
  const { preferredCurrency } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingData, setListingData] = useState({});
  const [userLocation, setUserLocation] = useState('');

  // Initialize listing data when component mounts or selectedCards changes
  // Consolidated the two previous useEffect hooks into one
  useEffect(() => {
    if (
      !isOpen ||
      !selectedCards ||
      !Array.isArray(selectedCards) ||
      selectedCards.length === 0
    )
      return;

    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          setUserLocation(profileData.location || '');
        }
      } catch (error) {
        logger.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();

    const initialData = {};
    selectedCards.forEach(card => {
      if (!card) return; // Skip null/undefined cards

      // Use a unique identifier that's guaranteed to exist
      const cardId =
        card.slabSerial || card.id || card._id || JSON.stringify(card);
      initialData[cardId] = {
        price: '',
        note: '',
        location: userLocation || '',
      };
    });

    setListingData(initialData);
  }, [selectedCards, isOpen, user, userLocation]);

  // Update location when userLocation is loaded
  useEffect(() => {
    if (userLocation && listingData) {
      const updatedData = {};
      Object.keys(listingData).forEach(cardId => {
        updatedData[cardId] = {
          ...listingData[cardId],
          location: listingData[cardId].location || userLocation,
        };
      });
      setListingData(updatedData);
    }
  }, [userLocation, listingData]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling when modal is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Return null early but AFTER all hooks are defined
  if (!isOpen) return null;

  const handleInputChange = (cardId, field, value) => {
    setListingData(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [field]: value,
      },
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const errors = {};

    // First check if listingData is valid
    if (!listingData || Object.keys(listingData).length === 0) {
      return {
        isValid: false,
        errors: { general: 'No listing data available' },
      };
    }

    Object.keys(listingData).forEach(cardId => {
      const cardData = listingData[cardId] || {
        price: '',
        note: '',
        location: '',
      };
      const numericPrice = parseFloat(cardData.price);

      if (!cardData.price || isNaN(numericPrice) || numericPrice <= 0) {
        errors[cardId] = 'Please enter a valid price';
        isValid = false;
      }
    });

    return { isValid, errors };
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const { isValid, errors } = validateForm();

    if (!isValid) {
      // Show errors
      Object.values(errors).forEach(error => {
        toast.error(error);
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user's marketplace profile
      const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Create a basic profile if one doesn't exist
        await setDoc(profileRef, {
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          location: '',
          bio: '',
        });
      }

      // Check if user already has listings for these cards
      const listingsRef = collection(firestoreDb, 'marketplaceListings');
      const existingListingsQuery = query(
        listingsRef,
        where('sellerId', '==', user.uid),
        where(
          'cardId',
          'in',
          selectedCards.map(
            card => card.slabSerial || card.id || card._id || JSON.stringify(card)
          )
        )
      );

      const existingListingsSnapshot = await getDocs(existingListingsQuery);
      const existingListings = [];

      existingListingsSnapshot.forEach(doc => {
        existingListings.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Process each card
      for (const card of selectedCards) {
        if (!card) continue; // Skip null/undefined cards

        const cardId =
          card.slabSerial || card.id || card._id || JSON.stringify(card);
        const cardData = listingData[cardId] || {
          price: '',
          note: '',
          location: '',
        };

        // Check if this card already has a listing
        const existingListing = existingListings.find(
          listing => listing.cardId === cardId
        );

        if (existingListing) {
          // Update existing listing
          await updateDoc(doc(firestoreDb, 'marketplaceListings', existingListing.id), {
            price: parseFloat(cardData.price),
            note: cardData.note || '',
            location: cardData.location || '',
            updatedAt: serverTimestamp(),
            currencyCode: preferredCurrency.code,
          });

          LoggingService.logEvent('marketplace_listing_updated', {
            listingId: existingListing.id,
            cardId,
            price: parseFloat(cardData.price),
            currencyCode: preferredCurrency.code,
          });
        } else {
          // Create new listing
          const newListing = {
            sellerId: user.uid,
            sellerName: user.displayName || '',
            sellerPhotoURL: user.photoURL || '',
            cardId,
            cardData: card,
            price: parseFloat(cardData.price),
            note: cardData.note || '',
            location: cardData.location || '',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            currencyCode: preferredCurrency.code,
          };

          const docRef = await addDoc(listingsRef, newListing);

          LoggingService.logEvent('marketplace_listing_created', {
            listingId: docRef.id,
            cardId,
            price: parseFloat(cardData.price),
            currencyCode: preferredCurrency.code,
          });
        }
      }

      toast.success(
        `Successfully listed ${selectedCards.length} card${
          selectedCards.length > 1 ? 's' : ''
        }`
      );
      onClose();
    } catch (error) {
      logger.error('Error listing cards:', error);
      toast.error('Failed to list cards. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`List ${selectedCards?.length || 0} Card${
        selectedCards?.length !== 1 ? 's' : ''
      } for Sale`}
      size="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Listing...' : 'List for Sale'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedCards?.map((card, index) => {
          if (!card) return null;

          return (
            <div
              key={
                card.slabSerial || card.id || card._id || JSON.stringify(card)
              }
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex flex-col gap-4 md:flex-row">
                {/* Card Image */}
                <div className="flex-shrink-0">
                  <div className="relative h-40 w-32 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name || 'Card'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon
                          name="image"
                          size="xl"
                          className="text-gray-400 dark:text-gray-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    {card.name || `Card ${index + 1}`}
                  </h3>
                  <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    {card.set && <div>Set: {card.set}</div>}
                    {card.number && <div>Number: {card.number}</div>}
                    {card.grade && (
                      <div>
                        Grade: {card.grade} ({card.gradingCompany || 'Unknown'})
                      </div>
                    )}
                    {card.slabSerial && (
                      <div>Serial: {card.slabSerial}</div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Price ({preferredCurrency.code})
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 dark:text-gray-400">
                              {preferredCurrency.symbol}
                            </span>
                          </div>
                          <input
                            type="number"
                            value={
                              listingData[
                                card.slabSerial ||
                                  card.id ||
                                  card._id ||
                                  JSON.stringify(card)
                              ]?.price || ''
                            }
                            onChange={e =>
                              handleInputChange(
                                card.slabSerial ||
                                  card.id ||
                                  card._id ||
                                  JSON.stringify(card),
                                'price',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Note (Optional)
                        </label>
                        <textarea
                          value={
                            listingData[
                              card.slabSerial ||
                                card.id ||
                                card._id ||
                                JSON.stringify(card)
                            ]?.note || ''
                          }
                          onChange={e =>
                            handleInputChange(
                              card.slabSerial ||
                                card.id ||
                                card._id ||
                                JSON.stringify(card),
                              'note',
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
                          placeholder="Add a note about this card..."
                          rows="3"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Location (Optional)
                        </label>
                        <input
                          type="text"
                          value={
                            listingData[
                              card.slabSerial ||
                                card.id ||
                                card._id ||
                                JSON.stringify(card)
                            ]?.location || ''
                          }
                          onChange={e =>
                            handleInputChange(
                              card.slabSerial ||
                                card.id ||
                                card._id ||
                                JSON.stringify(card),
                              'location',
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
                          placeholder="Enter your location (e.g., Sydney)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </form>
    </Modal>
  );
}

export default ListCardModal;
