import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { useAuth } from '../../design-system';
import Modal from '../../design-system/molecules/Modal';
import Button from '../../design-system/atoms/Button';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

const MessageModal = ({ isOpen, onClose, listing, prefilledMessage = '', onViewChange }) => {
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Generate a chat ID based on listing type (specific item or general chat)
  const chatId = listing && user ? 
    (listing.isGeneralChat ? 
      `general_${[user.uid, listing.userId].sort().join('_')}` : 
      `${listing.id}_${user.uid}`) : 
    null;
  
  // Set the pre-filled message when it changes
  useEffect(() => {
    if (prefilledMessage) {
      setNewMessage(prefilledMessage);
    }
  }, [prefilledMessage, isOpen]);
  
  // Handle sending a new message and creating a chat thread
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || !user || !listing) {
      logger.warn('Missing required data:', { 
        hasMessage: !!newMessage.trim(), 
        hasChatId: !!chatId, 
        hasUser: !!user, 
        hasListing: !!listing 
      });
      return;
    }
    
    // Log the current user ID for debugging
    console.log('Current user ID:', user.uid);
    
    try {
      setLoading(true);
      setError(null);
      
      // Log critical data for debugging
      logger.debug('Message attempt data:', { 
        buyerId: user.uid,
        sellerId: listing.userId,
        chatId,
        listingId: listing.id
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
          const sellerProfileDoc = await getDoc(doc(firestoreDb, 'marketplaceProfiles', listing.userId));
          if (sellerProfileDoc.exists()) {
            const sellerProfileData = sellerProfileDoc.data();
            sellerName = sellerProfileData.displayName || sellerProfileData.username || 'Seller';
          } else {
            // Fallback to users collection if marketplace profile doesn't exist
            const sellerDoc = await getDoc(doc(firestoreDb, 'users', listing.userId));
            if (sellerDoc.exists()) {
              const sellerData = sellerDoc.data();
              sellerName = sellerData.displayName || sellerData.username || 'Seller';
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
          const buyerProfileDoc = await getDoc(doc(firestoreDb, 'marketplaceProfiles', user.uid));
          if (buyerProfileDoc.exists()) {
            const buyerProfileData = buyerProfileDoc.data();
            buyerName = buyerProfileData.displayName || buyerProfileData.username || user.displayName || user.username || 'Buyer';
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
          cardId: listing.isGeneralChat ? null : listing.id,
          lastMessage: newMessage.trim(),
          lastUpdated: serverTimestamp(),
          cardTitle: listing.isGeneralChat ? 'General Discussion' : (listing.cardName || listing.card?.name || listing.card?.cardName || listing.card?.card || 'Card Listing'),
          cardImage: listing.isGeneralChat ? null : (listing.card?.imageUrl || listing.card?.cloudImageUrl || null),
          listingPrice: listing.isGeneralChat ? null : (listing.priceAUD || listing.price),
          currency: listing.isGeneralChat ? null : (listing.currency || 'AUD'),
          location: listing.isGeneralChat ? null : listing.location,
          status: listing.isGeneralChat ? null : (listing.status || 'for sale'),
          sellerName,
          buyerName,
          buyerId: user.uid,
          sellerId: listing.userId,
          createdAt: serverTimestamp(),
          isGeneralChat: listing.isGeneralChat || false
        };
        
        // Log the chat data for debugging
        console.log('Chat document data:', {
          chatId,
          participants: chatData.participants,
          buyerId: chatData.buyerId,
          sellerId: chatData.sellerId
        });
        
        // Log the chat data for debugging
        logger.debug('Creating chat with data:', {
          chatId,
          participants: chatData.participants,
          buyerId: chatData.buyerId,
          sellerId: chatData.sellerId
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
        
        // Add the first message with the exact field structure required by security rules
        const messagesRef = collection(firestoreDb, 'chats', chatId, 'messages');
        const messageData = {
          // IMPORTANT: senderId must match the authenticated user's UID
          senderId: user.uid,
          text: newMessage.trim(),
          timestamp: serverTimestamp()
        };
        
        // Log the message payload before sending
        console.log('Message payload:', messageData);
        console.log('Message path:', `chats/${chatId}/messages/{messageId}`);
        
        logger.debug('Adding message with data:', {
          chatId,
          senderId: messageData.senderId,
          text: messageData.text
        });
        
        try {
          // Verify the chat document exists before adding the message
          const chatDoc = await getDoc(chatRef);
          if (!chatDoc.exists()) {
            console.error('Chat document does not exist before message creation');
            throw new Error('Chat document does not exist');
          }
          
          // Log the chat document data to verify participants
          console.log('Chat document before message:', {
            exists: chatDoc.exists(),
            data: chatDoc.data(),
            hasParticipants: chatDoc.data()?.participants ? 'yes' : 'no',
            participantsIncludeUser: chatDoc.data()?.participants?.includes(user.uid) ? 'yes' : 'no'
          });
          
          // Add the message
          await addDoc(messagesRef, messageData);
          logger.debug('Message added successfully');
        } catch (messageError) {
          logger.error('Error adding message:', messageError);
          console.error('Message error details:', {
            code: messageError.code,
            message: messageError.message,
            path: `chats/${chatId}/messages`
          });
          throw new Error(`Message creation failed: ${messageError.message}`);
        }
      } else {
        // If chat exists, just add a new message to it
        const messagesRef = collection(firestoreDb, 'chats', existingChatId, 'messages');
        
        // First, try to update the existing chat with proper names if they're missing
        try {
          const existingChatRef = doc(firestoreDb, 'chats', existingChatId);
          const existingChatDoc = await getDoc(existingChatRef);
          
          if (existingChatDoc.exists()) {
            const chatData = existingChatDoc.data();
            let needsUpdate = false;
            const updates = {};
            
            // Check if we need to update seller name
            if (!chatData.sellerName || chatData.sellerName === 'Seller') {
              try {
                const sellerProfileDoc = await getDoc(doc(firestoreDb, 'marketplaceProfiles', listing.userId));
                if (sellerProfileDoc.exists()) {
                  const sellerProfileData = sellerProfileDoc.data();
                  const newSellerName = sellerProfileData.displayName || sellerProfileData.username || 'Seller';
                  if (newSellerName !== 'Seller') {
                    updates.sellerName = newSellerName;
                    needsUpdate = true;
                  }
                }
              } catch (error) {
                logger.error('Error fetching seller profile for update:', error);
              }
            }
            
            // Check if we need to update buyer name
            if (!chatData.buyerName || chatData.buyerName === 'Buyer') {
              try {
                const buyerProfileDoc = await getDoc(doc(firestoreDb, 'marketplaceProfiles', user.uid));
                if (buyerProfileDoc.exists()) {
                  const buyerProfileData = buyerProfileDoc.data();
                  const newBuyerName = buyerProfileData.displayName || buyerProfileData.username || user.displayName || user.username || 'Buyer';
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
                logger.debug('Updated existing chat with proper names:', updates);
              } catch (updateError) {
                logger.error('Error updating chat with proper names:', updateError);
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
          sender: user.uid,  // This must match request.auth.uid in rules
          senderId: user.uid, // Additional field for compatibility
          content: newMessage.trim(),
          text: newMessage.trim(), // Additional field for compatibility
          timestamp: serverTimestamp()
        });
        
        // We can't update the chat document as per new security rules
        // Instead, we'll have to create a new chat if needed
        logger.debug('Chat exists, message added successfully');
      }
      
      // Clear the input field and loading state
      setNewMessage('');
      setLoading(false);
      
      // Success message
      toast.success('Message sent');
      
      onClose();
      
      // Navigate to messages tab
      onViewChange('marketplace-messages');
      
      // Dispatch custom event to open the specific chat (cross-device compatible)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openSpecificChat', { 
          detail: { chatId: existingChatId || chatId } 
        }));
      }, 100);
      
      toast.success('Message sent! Opening your conversation...');
      
    } catch (error) {
      logger.error('Error sending message:', error);
      
      // Detailed error logging
      if (error.message.includes('Missing or insufficient permissions')) {
        logger.error('Permission error details:', {
          userId: user?.uid,
          listingId: listing?.id,
          sellerId: listing?.userId,
          chatId,
          errorCode: error.code,
          errorMessage: error.message
        });
      }
      
      const errorMessage = error.message.includes('Missing or insufficient permissions') ?
        'Permission denied. Please try again or contact support.' :
        'Failed to send message. Please try again.';
      
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };
  

  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Message about ${listing?.card?.name || listing?.isGeneralChat ? 'General Discussion' : 'Card Listing'}`}
      size="md"
      maxWidth="max-w-lg"
      closeOnClickOutside={true}
      zIndex={100}
      className="rounded-2xl overflow-hidden"
    >
      <div className="space-y-6 pb-6 px-2">
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white -mx-8 mt-6">
          <div className="px-6">
            <h3 className="text-xl font-bold mb-4 text-center">Contact about:</h3>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              {listing?.card?.imageUrl ? (
                <img 
                  src={listing.card.imageUrl} 
                  alt={listing?.card?.name || listing?.card?.card || 'Card'}
                  className="w-16 h-16 object-cover rounded-xl shadow-md flex-shrink-0" 
                />
              ) : (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-icons text-2xl">
                    {listing?.isGeneralChat ? 'chat' : 'style'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-lg mb-1 truncate">
                  {listing?.isGeneralChat ? 'General Discussion' : 
                   (listing?.card?.name || listing?.card?.card || 'Card Listing')}
                </p>
                {!listing?.isGeneralChat && listing?.listingPrice && (
                  <p className="text-white/90 font-medium">
                    {listing.listingPrice} {listing.currency || 'AUD'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-500 text-sm">error</span>
              <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {/* Message Form */}
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Your Message
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={listing?.isGeneralChat ? 
                "Hi! I'd like to discuss your Pokemon cards." : 
                "Hi! I'm interested in this card. Is it still available?"}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-white min-h-[120px] resize-none transition-all duration-200"
              disabled={loading}
            />
          </div>
          
          <Button
            type="submit"
            variant="primary"
            disabled={!newMessage.trim() || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-md py-3 text-base font-semibold"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="material-icons text-sm">send</span>
                Send Message
              </div>
            )}
          </Button>
        </form>
      </div>
    </Modal>
  );
};

MessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listing: PropTypes.object,
  prefilledMessage: PropTypes.string,
  onViewChange: PropTypes.func.isRequired
};

export default MessageModal;
