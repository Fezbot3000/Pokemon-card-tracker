import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import { useAuth } from '../../design-system';
import Modal from '../../design-system/molecules/Modal';
import Icon from '../../design-system/atoms/Icon';
import ModalButton from '../../design-system/atoms/ModalButton';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

const MessageModal = ({
  isOpen,
  onClose,
  listing,
  prefilledMessage = '',
  onViewChange,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Generate a chat ID based on listing type (specific item or general chat)
  const chatId =
    listing && user
      ? listing.isGeneralChat
        ? `general_${[user.uid, listing.userId].sort().join('_')}`
        : `${listing.id}_${user.uid}`
      : null;

  // Set the pre-filled message when it changes
  useEffect(() => {
    if (prefilledMessage) {
      setNewMessage(prefilledMessage);
    }
  }, [prefilledMessage, isOpen]);

  // Handle sending a new message and creating a chat thread
  const handleSendMessage = async e => {
    e.preventDefault();

    if (!newMessage.trim() || !chatId || !user || !listing) {
      logger.warn('Missing required data:', {
        hasMessage: !!newMessage.trim(),
        hasChatId: !!chatId,
        hasUser: !!user,
        hasListing: !!listing,
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Log critical data for debugging
      logger.debug('Message attempt data:', {
        buyerId: user.uid,
        sellerId: listing.userId,
        chatId,
        listingId: listing.id,
      });

      // Validate required fields
      if (!listing.userId) {
        logger.error('Seller ID missing from listing:', listing);
        throw new Error('Seller ID is missing from the listing');
      }

      // Check if a chat already exists for this listing/conversation and user
      const chatsRef = collection(firestoreDb, 'chats');
      let existingChatQuery;

      if (listing.isGeneralChat) {
        // For general chats, look for existing general conversation between these users
        existingChatQuery = query(
          chatsRef,
          where('participants', 'array-contains', user.uid),
          where('isGeneralChat', '==', true)
        );
      } else {
        // For specific listing chats, use the original logic
        existingChatQuery = query(
          chatsRef,
          where('cardId', '==', listing.id),
          where('participants', 'array-contains', user.uid)
        );
      }

      const existingChatSnapshot = await getDocs(existingChatQuery);

      let existingChatId = null;
      if (!existingChatSnapshot.empty) {
        if (listing.isGeneralChat) {
          // For general chats, find the one with the specific seller
          const existingChat = existingChatSnapshot.docs.find(doc => {
            const chatData = doc.data();
            return chatData.participants.includes(listing.userId);
          });
          if (existingChat) {
            existingChatId = existingChat.id;
          }
        } else {
          // For listing-specific chats, use the first match
          existingChatId = existingChatSnapshot.docs[0].id;
        }
      }

      // If chat doesn't exist, create it
      if (!existingChatId) {
        // Get seller's display name from marketplace profile
        let sellerName = 'Seller';
        try {
          // Try to get seller name from marketplace profile first
          const sellerProfileDoc = await getDoc(
            doc(firestoreDb, 'marketplaceProfiles', listing.userId)
          );
          if (sellerProfileDoc.exists()) {
            const sellerProfileData = sellerProfileDoc.data();
            sellerName =
              sellerProfileData.displayName ||
              sellerProfileData.username ||
              'Seller';
          } else {
            // Fallback to users collection if marketplace profile doesn't exist
            const sellerDoc = await getDoc(
              doc(firestoreDb, 'users', listing.userId)
            );
            if (sellerDoc.exists()) {
              const sellerData = sellerDoc.data();
              sellerName =
                sellerData.displayName || sellerData.username || 'Seller';
            }
          }
        } catch (error) {
          logger.error('Error fetching seller data:', error);
          // Use a fallback name if we can't fetch seller data
          sellerName = 'Seller';
        }

        // Get buyer's display name from marketplace profile
        let buyerName = 'Buyer';
        try {
          // Try to get buyer name from marketplace profile first
          const buyerProfileDoc = await getDoc(
            doc(firestoreDb, 'marketplaceProfiles', user.uid)
          );
          if (buyerProfileDoc.exists()) {
            const buyerProfileData = buyerProfileDoc.data();
            buyerName =
              buyerProfileData.displayName ||
              buyerProfileData.username ||
              user.displayName ||
              user.username ||
              'Buyer';
          } else {
            // Fallback to user auth data
            buyerName = user.displayName || user.username || 'Buyer';
          }
        } catch (error) {
          logger.error('Error fetching buyer data:', error);
          // Use fallback name
          buyerName = user.displayName || user.username || 'Buyer';
        }

        // First create the chat document with all required fields - using exact structure required by security rules
        const chatRef = doc(firestoreDb, 'chats', chatId);
        const chatData = {
          // Essential fields required by security rules
          participants: [user.uid, listing.userId],

          // Additional metadata fields
          cardId: listing.isGeneralChat ? null : listing.id || null,
          lastMessage: newMessage.trim(),
          lastUpdated: serverTimestamp(),
          cardTitle: listing.isGeneralChat
            ? 'General Discussion'
            : listing.cardName ||
              listing.card?.name ||
              listing.card?.cardName ||
              listing.card?.card ||
              'Card Listing',
          cardImage: listing.isGeneralChat
            ? null
            : listing.card?.imageUrl || listing.card?.cloudImageUrl || null,
          listingPrice: listing.isGeneralChat
            ? null
            : listing.priceAUD || listing.price || listing.listingPrice || null,
          currency: listing.isGeneralChat ? null : listing.currency || 'AUD',
          location: listing.isGeneralChat ? null : listing.location || null,
          status: listing.isGeneralChat ? null : listing.status || 'for sale',
          sellerName,
          buyerName,
          buyerId: user.uid,
          sellerId: listing.userId,
          createdAt: serverTimestamp(),
          isGeneralChat: listing.isGeneralChat || false,
        };

        // Log the chat data for debugging
        logger.debug('Creating chat with data:', {
          chatId,
          participants: chatData.participants,
          buyerId: chatData.buyerId,
          sellerId: chatData.sellerId,
          listingPrice: chatData.listingPrice,
          cardId: chatData.cardId,
          location: chatData.location,
        });

        // Debug log the original listing data
        logger.debug('Original listing data:', {
          id: listing.id,
          priceAUD: listing.priceAUD,
          price: listing.price,
          listingPrice: listing.listingPrice,
          location: listing.location,
          currency: listing.currency,
          status: listing.status,
        });

        // Create the chat document first
        try {
          await setDoc(chatRef, chatData);
          logger.debug('Chat document created successfully');
        } catch (chatError) {
          logger.error('Error creating chat document:', chatError);
          throw new Error(`Chat creation failed: ${chatError.message}`);
        }

        // Verify the chat was created before adding messages
        const chatCheck = await getDoc(chatRef);
        if (!chatCheck.exists()) {
          throw new Error('Failed to create chat document');
        }

        // Add the first message to the messages subcollection
        const messagesRef = collection(
          firestoreDb,
          'chats',
          chatId,
          'messages'
        );
        await addDoc(messagesRef, {
          // Required fields that match security rules
          senderId: user.uid, // This must match request.auth.uid in rules
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
        });

        logger.debug('New chat and message created successfully');
        existingChatId = chatId;
      } else {
        // Chat exists, just add the message
        const messagesRef = collection(
          firestoreDb,
          'chats',
          existingChatId,
          'messages'
        );

        // Try to update chat document with proper display names if they're missing
        try {
          const existingChatRef = doc(firestoreDb, 'chats', existingChatId);
          const existingChatDoc = await getDoc(existingChatRef);

          if (existingChatDoc.exists()) {
            const chatData = existingChatDoc.data();
            let updates = {};
            let needsUpdate = false;

            // Update seller name if missing or generic
            if (!chatData.sellerName || chatData.sellerName === 'Seller') {
              try {
                const sellerProfileDoc = await getDoc(
                  doc(firestoreDb, 'marketplaceProfiles', listing.userId)
                );
                if (sellerProfileDoc.exists()) {
                  const sellerProfileData = sellerProfileDoc.data();
                  const newSellerName =
                    sellerProfileData.displayName ||
                    sellerProfileData.username ||
                    'Seller';
                  if (newSellerName !== 'Seller') {
                    updates.sellerName = newSellerName;
                    needsUpdate = true;
                  }
                }
              } catch (error) {
                logger.error(
                  'Error fetching seller profile for update:',
                  error
                );
              }
            }

            // Update buyer name if missing or generic
            if (!chatData.buyerName || chatData.buyerName === 'Buyer') {
              try {
                const buyerProfileDoc = await getDoc(
                  doc(firestoreDb, 'marketplaceProfiles', user.uid)
                );
                if (buyerProfileDoc.exists()) {
                  const buyerProfileData = buyerProfileDoc.data();
                  const newBuyerName =
                    buyerProfileData.displayName ||
                    buyerProfileData.username ||
                    user.displayName ||
                    user.username ||
                    'Buyer';
                  if (newBuyerName !== 'Buyer') {
                    updates.buyerName = newBuyerName;
                    needsUpdate = true;
                  }
                }
              } catch (error) {
                logger.error('Error fetching buyer profile for update:', error);
              }
            }

            // Update the chat document if needed
            if (needsUpdate) {
              try {
                await updateDoc(existingChatRef, updates);
                logger.debug(
                  'Updated existing chat with proper names:',
                  updates
                );
              } catch (updateError) {
                logger.error(
                  'Error updating chat with proper names:',
                  updateError
                );
                // Continue anyway, this is not critical
              }
            }
          }
        } catch (error) {
          logger.error('Error checking/updating existing chat:', error);
          // Continue anyway, this is not critical
        }

        await addDoc(messagesRef, {
          // Required fields that match security rules
          senderId: user.uid, // This must match request.auth.uid in rules
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
        });

        // We can't update the chat document as per new security rules
        // Instead, we'll have to create a new chat if needed
        logger.debug('Chat exists, message added successfully');
      }

      // Clear the input field and loading state
      setNewMessage('');
      setLoading(false);

      onClose();

      // Navigate to messages tab with URL update (same as MarketplaceNavigation)
      navigate('/dashboard/marketplace-messages', { replace: true });
      
      // Still use state for instant navigation
      setTimeout(() => {
        if (onViewChange && typeof onViewChange === 'function') {
          onViewChange('marketplace-messages');
        }
      }, 0);

      // Dispatch custom event to open the specific chat with improved timing
      const attemptOpenChat = (attempts = 0) => {
        const maxAttempts = 5;
        const targetChatId = existingChatId || chatId;
        
        window.dispatchEvent(
          new CustomEvent('openSpecificChat', {
            detail: { chatId: targetChatId },
          })
        );
        
        // Retry if chat didn't open and we haven't exceeded max attempts
        if (attempts < maxAttempts) {
          setTimeout(() => {
            attemptOpenChat(attempts + 1);
          }, 200 * (attempts + 1)); // Increasing delay: 200ms, 400ms, 600ms, etc.
        }
      };

      // Initial attempt after 300ms to ensure messages component has loaded
      setTimeout(() => {
        attemptOpenChat();
      }, 300);

      toast.success('Message sent! Opening your conversation...');
    } catch (error) {
      logger.error('Error sending message:', error);

      // Enhanced error logging for debugging
      logger.error('Message sending error details:', {
        errorMessage: error.message,
        errorCode: error.code,
        userId: user?.uid,
        listingId: listing?.id,
        sellerId: listing?.userId,
        chatId,
        listingData: {
          isGeneralChat: listing?.isGeneralChat,
          priceAUD: listing?.priceAUD,
          location: listing?.location,
          currency: listing?.currency
        }
      });

      // Check for specific error types
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error.message.includes('Missing or insufficient permissions')) {
        errorMessage = 'Permission denied. You may not have access to contact this seller.';
      } else if (error.message.includes('Firestore has already been started')) {
        errorMessage = 'Connection issue. Please refresh and try again.';
      } else if (error.message.includes('Chat creation failed')) {
        errorMessage = 'Could not create conversation. Please try again.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const cardName =
    listing?.card?.name ||
    listing?.card?.cardName ||
    listing?.cardName ||
    'Card Listing';
  const cardImage =
    listing?.card?.imageUrl ||
    listing?.card?.cloudImageUrl ||
    listing?.card?.img ||
    null;
  const price = listing?.listingPrice || listing?.price;
  const currency = listing?.currency || 'AUD';

  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Message"
      position="right"
      size="modal-width-60"
      closeOnClickOutside={false}
              zIndex="60"
      footer={
        <div className="flex w-full items-center justify-between">
          <ModalButton variant="secondary" onClick={onClose}>
            Close
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
            leftIcon={loading ? null : <Icon name="send" />}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="size-4 animate-spin rounded-full border-b-2 border-white"></div>
                Sending...
              </div>
            ) : (
              'Send Message'
            )}
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Card Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Contact about:
          </h3>
          <div className="flex items-center gap-4">
            {cardImage ? (
              <img
                src={cardImage}
                alt={cardName}
                className="size-16 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                <Icon name="image" size="lg" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
                {listing?.isGeneralChat ? 'General Discussion' : cardName}
              </p>
              {!listing?.isGeneralChat && price && (
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  ${price} {currency}
                </p>
              )}
              {listing?.location && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {listing.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <Icon name="error" className="text-red-500" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Message Form */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={
              listing?.isGeneralChat
                ? "Hi! I'd like to discuss your Pokemon cards."
                : "Hi! I'm interested in this card. Is it still available?"
            }
            className="min-h-[120px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
            disabled={loading}
          />
        </div>
      </div>
    </Modal>,
    document.body
  );
};

MessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listing: PropTypes.object,
  prefilledMessage: PropTypes.string,
  onViewChange: PropTypes.func.isRequired,
};

export default MessageModal;
