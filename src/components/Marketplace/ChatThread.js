import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { useAuth } from '../../design-system';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

const ChatThread = ({ chatId, onBack, cardInfo }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [hasLeft, setHasLeft] = useState(false);
  const [otherPartyLeft, setOtherPartyLeft] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Load chat data and check if user has left
  useEffect(() => {
    if (!chatId || !user) return;
    
    const fetchChatData = async () => {
      try {
        const chatDocRef = doc(firestoreDb, 'chats', chatId);
        const chatSnapshot = await getDoc(chatDocRef);
        
        if (chatSnapshot.exists()) {
          const data = chatSnapshot.data();
          setChatData(data);
          
          // Check if user has left the chat
          const leftBy = data.leftBy || {};
          const isBuyer = user.uid === data.buyerId;
          const isSeller = user.uid === data.sellerId;
          
          if (isBuyer) {
            setHasLeft(leftBy.buyer === true);
            setOtherPartyLeft(leftBy.seller === true);
          } else if (isSeller) {
            setHasLeft(leftBy.seller === true);
            setOtherPartyLeft(leftBy.buyer === true);
          }
        }
      } catch (error) {
        logger.error('Error fetching chat data:', error);
      }
    };
    
    fetchChatData();
  }, [chatId, user]);

  // Load messages for this chat
  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    
    const messagesRef = collection(firestoreDb, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      try {
        const messagesData = snapshot.docs.map(doc => {
          // Log each message for debugging
          const messageData = doc.data();
          
          return {
            id: doc.id,
            ...messageData,
            // Normalize fields for consistent rendering
            senderId: messageData.senderId || messageData.sender,
            text: messageData.text || messageData.content,
            timestamp: messageData.timestamp?.toDate() || new Date()
          };
        });
        
        setMessages(messagesData);
        setLoading(false);
        
        // Scroll to bottom when messages change
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (error) {
        logger.error('Error loading messages:', error);
        setLoading(false);
      }
    }, (error) => {
      logger.error('Error in messages listener:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [chatId]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || !user) return;
    
    try {
      setSending(true);
      
      // Add the message to the chat's messages subcollection with all fields for compatibility
      const messagesRef = collection(firestoreDb, 'chats', chatId, 'messages');
      const messageData = {
        // Fields required by security rules
        senderId: user.uid,
        text: newMessage.trim(),
        // Additional fields for compatibility
        sender: user.uid,
        content: newMessage.trim(),
        timestamp: serverTimestamp()
      };
      
      await addDoc(messagesRef, messageData);
      
      // We can't update the chat document due to security rules preventing updates
      // The chat list will still show the conversation
      
      // Clear the input field
      setNewMessage('');
      setSending(false);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      logger.error('Error sending message:', error);
      setSending(false);
    }
  };
  
  // Handle leaving the chat
  const handleLeaveChat = async () => {
    if (!chatId || !user || !chatData) return;
    
    try {
      const isBuyer = user.uid === chatData.buyerId;
      const isSeller = user.uid === chatData.sellerId;
      
      if (!isBuyer && !isSeller) {
        logger.error('User is neither buyer nor seller in this chat');
        return;
      }
      
      // Update the leftBy field in the chat document
      const chatRef = doc(firestoreDb, 'chats', chatId);
      const leftBy = chatData.leftBy || {};
      
      if (isBuyer) {
        leftBy.buyer = true;
      } else if (isSeller) {
        leftBy.seller = true;
      }
      
      await updateDoc(chatRef, { leftBy });
      
      // Add a system message indicating the user has left
      const messagesRef = collection(firestoreDb, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: `${isBuyer ? 'Buyer' : 'Seller'} has left the chat.`,
        senderId: 'system',
        isSystemMessage: true,
        timestamp: serverTimestamp()
      });
      
      setHasLeft(true);
      toast.success('You have left the chat');
    } catch (error) {
      logger.error('Error leaving chat:', error);
      toast.error('Failed to leave chat');
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col md:h-[calc(100vh-150px)]">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700" >
        <div className="flex items-center">
          <button 
            className="mr-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={onBack}
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <div className="flex items-center">
            {cardInfo?.imageUrl && (
              <img 
                src={cardInfo.imageUrl} 
                alt={cardInfo.title || 'Card'} 
                className="mr-3 size-10 rounded-md object-cover" 
              />
            )}
            {!cardInfo?.imageUrl && (
              <div className="mr-3 flex size-10 items-center justify-center rounded-md bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                <span className="material-icons">style</span>
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {cardInfo?.counterpartyName || 'Chat'}
              </h3>
              {cardInfo?.title && (
                <p className="text-xs text-gray-600 dark:text-gray-400">{cardInfo.title}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Leave chat button */}
        <button
          className={`rounded-md px-3 py-1 text-xs font-medium ${hasLeft ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'}`}
          onClick={handleLeaveChat}
          disabled={hasLeft}
          title={hasLeft ? 'You have left this chat' : 'Leave this chat'}
        >
          {hasLeft ? 'Left Chat' : 'Leave Chat'}
        </button>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-y-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No messages yet</p>
            <p className="mt-2 text-gray-500 dark:text-gray-500">
              Start the conversation by sending a message below.
            </p>
          </div>
        ) : (
          messages.map(message => {
            // Check if this is a system message
            const isSystemMessage = message.isSystemMessage || message.senderId === 'system';
            
            // Determine if this message is from the current user
            const isFromCurrentUser = !isSystemMessage && message.senderId === user?.uid;
            
            if (isSystemMessage) {
              // Render system message
              return (
                <div key={message.id} className="my-2 flex justify-center">
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {message.text}
                  </div>
                </div>
              );
            }
            
            // Regular user message
            return (
              <div 
                key={message.id} 
                className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isFromCurrentUser
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div className="mt-1 text-right text-xs opacity-70">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Notification when other party has left */}
      {otherPartyLeft && (
        <div className="border-y border-yellow-100 bg-yellow-50 p-2 dark:border-yellow-900/30 dark:bg-yellow-900/20">
          <p className="text-center text-xs text-yellow-700 dark:text-yellow-500">
            The other party has left this chat. You can still view the conversation but no new messages can be sent.
          </p>
        </div>
      )}
      
      {/* Message input - disabled when user has left or other party has left */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 dark:border-gray-700">
        {hasLeft && (
          <div className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
            You have left this chat. You cannot send new messages.
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={hasLeft || otherPartyLeft ? "You cannot send messages in this chat" : "Type a message..."}
            className="flex-1 rounded-full border-none bg-gray-100 px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-blue-400"
            disabled={sending || hasLeft || otherPartyLeft}
          />
          <button
            type="submit"
            className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-blue-400"
            disabled={!newMessage.trim() || sending || hasLeft || otherPartyLeft}
          >
            <span className="material-icons">send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

ChatThread.propTypes = {
  chatId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  cardInfo: PropTypes.shape({
    imageUrl: PropTypes.string,
    title: PropTypes.string,
    counterpartyName: PropTypes.string
  })
};

export default ChatThread;
