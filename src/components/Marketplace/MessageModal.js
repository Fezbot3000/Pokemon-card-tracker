import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { useAuth } from '../../design-system';
import Modal from '../../design-system/molecules/Modal';
import Button from '../../design-system/atoms/Button';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

const MessageModal = ({ isOpen, onClose, listing }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  
  // Generate a thread ID based on listing ID and buyer ID
  const threadId = listing && user ? `${listing.id}_${user.uid}` : null;
  
  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !threadId || !user || !listing) return;
    
    try {
      setLoading(true);
      
      // First ensure the thread document exists
      const threadRef = doc(firestoreDb, 'marketplaceMessages', threadId);
      await setDoc(threadRef, {
        lastMessageText: newMessage.trim(),
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSenderId: user.uid,
        participants: [user.uid, listing.userId],
        listingId: listing.id,
        listingTitle: listing.card?.name || 'Card Listing'
      }, { merge: true });
      
      // Then add the message
      const messagesRef = collection(firestoreDb, 'marketplaceMessages', threadId, 'messages');
      const newMessageDoc = await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        timestamp: new Date(),
        read: false
      });
      
      // Add the message to the local state
      const newMessageObj = {
        id: newMessageDoc.id,
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        timestamp: new Date(),
        read: false
      };
      
      setMessages(prevMessages => [...prevMessages, newMessageObj]);
      
      // Clear the input field and loading state
      setNewMessage('');
      setLoading(false);
      
      // Success message
      toast.success('Message sent');
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      logger.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      toast.error('Failed to send message. Please try again.');
      setLoading(false);
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Message about ${listing?.card?.name || 'Card Listing'}`}
      size="md"
      maxWidth="max-w-lg"
      closeOnClickOutside={true}
    >
      <div className="flex flex-col h-96">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={message.id || index} 
                className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.senderId === user?.uid 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div className="text-xs mt-1 opacity-70 text-right">
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="mt-auto">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newMessage.trim() || loading}
            >
              Send
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
  listing: PropTypes.object
};

export default MessageModal;
