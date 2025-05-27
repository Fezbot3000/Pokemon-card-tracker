import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
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
  
  // Generate a chat ID based on listing ID and buyer ID
  const chatId = listing && user ? `${listing.id}_${user.uid}` : null;
  
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
      
      // Check if a chat already exists for this listing and user
      const chatsRef = collection(firestoreDb, 'chats');
      const existingChatQuery = query(chatsRef, where('cardId', '==', listing.id), 
                                    where('participants', 'array-contains', user.uid));
      const existingChatSnapshot = await getDocs(existingChatQuery);
      
      let existingChatId = null;
      if (!existingChatSnapshot.empty) {
        existingChatId = existingChatSnapshot.docs[0].id;
      }
      
      // If chat doesn't exist, create it
      if (!existingChatId) {
        // Get seller's display name
        let sellerName = 'Seller';
        try {
          const sellerDoc = await getDoc(doc(firestoreDb, 'users', listing.userId));
          if (sellerDoc.exists()) {
            sellerName = sellerDoc.data().displayName || 'Seller';
          }
        } catch (error) {
          logger.error('Error fetching seller data:', error);
        }
        
        // First create the chat document with all required fields - using exact structure required by security rules
        const chatRef = doc(firestoreDb, 'chats', chatId);
        const chatData = {
          // Essential fields required by security rules
          participants: [user.uid, listing.userId],
          
          // Additional metadata fields
          cardId: listing.id,
          lastMessage: newMessage.trim(),
          lastUpdated: serverTimestamp(),
          cardTitle: listing.card?.name || listing.card?.card || 'Card Listing',
          cardImage: listing.card?.imageUrl || 
                    listing.card?.cloudImageUrl || 
                    null,
          sellerName,
          buyerName: user.displayName || 'Buyer',
          buyerId: user.uid,
          sellerId: listing.userId,
          createdAt: serverTimestamp()
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
      
      // Close the modal and show success message
      onClose();
      
      // Store the chatId in localStorage so the Messages component can auto-open this chat
      localStorage.setItem('openChatId', existingChatId || chatId);
      
      // Navigate to messages tab
      onViewChange('marketplace-messages');
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
      title={`Message about ${listing?.card?.name || 'Card Listing'}`}
      size="md"
      maxWidth="max-w-lg"
      closeOnClickOutside={true}
      zIndex={100}
    >
      <div className="flex flex-col h-96">
        {/* Message form */}
        <div className="flex-1 p-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Contact about:</h3>
            <div className="flex items-center">
              {listing?.card?.imageUrl ? (
                <img 
                  src={listing.card.imageUrl} 
                  alt={listing?.card?.name || listing?.card?.card || 'Card'}
                  className="w-12 h-12 object-cover rounded-md mr-3" 
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 mr-3">
                  <span className="material-icons">style</span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {listing?.card?.name || listing?.card?.card || 'Card Listing'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {listing?.listingPrice} {listing?.currency}
                </p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-center text-red-500 py-2 mb-4">{error}</div>
          )}
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage}>
          <div className="flex flex-col space-y-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white min-h-[100px]"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newMessage.trim() || loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
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
