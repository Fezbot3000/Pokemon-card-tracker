import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import ListingDetailModal from './ListingDetailModal';
import MarketplaceNavigation from './MarketplaceNavigation';
import SellerProfile from './SellerProfile';

// Add CSS for hiding scrollbars
const scrollbarHideStyles = `
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

function DesktopMarketplaceMessages({ currentView, onViewChange }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Add the scrollbar hiding styles to the document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = scrollbarHideStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    let unsubscribe;
    
    try {
      // Query for user's chats
      const chatsRef = collection(firestoreDb, 'chats');
      
      // Validate user.uid to prevent invalid queries
      if (!user.uid || typeof user.uid !== 'string') {
        logger.error('Invalid user ID for Firestore query:', user.uid);
        setLoading(false);
        return;
      }
      
      const chatsQuery = query(
        chatsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('lastUpdated', 'desc')
      );

      // Set up real-time listener for chats with error handling
      unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        try {
          const chatsData = snapshot.docs.map(doc => {
            const chatData = {
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().lastUpdated?.toDate() || new Date()
            };
            
            // Determine if user is buyer or seller
            const isBuyer = chatData.buyerId === user.uid;
            
            // Set counterparty name based on role
            chatData.otherParticipantName = isBuyer ? 
              (chatData.sellerName || 'Seller') : 
              (chatData.buyerName || 'Buyer');
              
            return chatData;
          });
          
          setConversations(chatsData);
          setLoading(false);
          
          // If there's no active chat and we have conversations, select the first one
          if (!activeChat && chatsData.length > 0) {
            setActiveChat(chatsData[0]);
          }
        } catch (error) {
          logger.error('Error processing chats:', error);
          setLoading(false);
        }
      }, (error) => {
        // Handle specific error types
        if (error.message && error.message.includes('Missing or insufficient permissions')) {
          logger.warn('Chat permissions error - user may not be authenticated or lacks access:', error);
          // Provide user-friendly feedback
          setConversations([]);
          setLoading(false);
        } else if (error.message && error.message.includes('requires an index')) {
          logger.warn('Chat index is still building:', error);
          
          // Fall back to a simpler query without ordering
          try {
            const simpleQuery = query(
              chatsRef,
              where('participants', 'array-contains', user.uid)
            );
            
            unsubscribe = onSnapshot(simpleQuery, (snapshot) => {
              const chatsData = snapshot.docs.map(doc => {
                const chatData = {
                  id: doc.id,
                  ...doc.data(),
                  timestamp: doc.data().lastUpdated?.toDate() || new Date()
                };
                
                // Determine if user is buyer or seller
                const isBuyer = chatData.buyerId === user.uid;
                
                // Set counterparty name based on role
                chatData.otherParticipantName = isBuyer ? 
                  (chatData.sellerName || 'Seller') : 
                  (chatData.buyerName || 'Buyer');
                  
                return chatData;
              });
              
              // Sort manually on the client side
              chatsData.sort((a, b) => {
                const timeA = a.timestamp?.getTime() || 0;
                const timeB = b.timestamp?.getTime() || 0;
                return timeB - timeA; // Descending order
              });
              
              setConversations(chatsData);
              setLoading(false);
              
              // If there's no active chat and we have conversations, select the first one
              if (!activeChat && chatsData.length > 0) {
                setActiveChat(chatsData[0]);
              }
            }, (fallbackError) => {
              logger.error('Error in fallback chat listener:', fallbackError);
              setLoading(false);
            });
          } catch (fallbackSetupError) {
            logger.error('Error setting up fallback chat listener:', fallbackSetupError);
            setLoading(false);
          }
        } else {
          logger.error('Error setting up chat listener:', error);
          setLoading(false);
        }
      });
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      logger.error('Error in chat setup:', error);
      setLoading(false);
    }
  }, [user]);

  // Listen for messages when an active chat is selected
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    
    const messagesRef = collection(firestoreDb, 'chats', activeChat.id, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      try {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        
        setMessages(messagesData);
        
        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (error) {
        logger.error('Error processing messages:', error);
      }
    }, (error) => {
      logger.error('Error setting up messages listener:', error);
    });
    
    return () => {
      unsubscribe();
    };
  }, [activeChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeChat || !user) return;
    
    // Check if either user has left the chat
    const hasUserLeft = activeChat.leftBy && (activeChat.leftBy.buyer || activeChat.leftBy.seller);
    if (hasUserLeft) {
      toast.error('This chat has been closed');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Add the message to the chat's messages subcollection with the exact fields required by security rules
      const messagesRef = collection(firestoreDb, 'chats', activeChat.id, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      
      // Clear the input field
      setNewMessage('');
      setSendingMessage(false);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingMessage(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display in conversation list
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Handle leaving a chat
  const handleLeaveChat = async () => {
    if (!activeChat || !user) return;
    
    try {
      const chatRef = doc(firestoreDb, 'chats', activeChat.id);
      
      // Get the current chat document
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        toast.error('Chat not found');
        return;
      }
      
      // Get the current leftBy status or initialize it
      const chatData = chatDoc.data();
      const leftBy = chatData.leftBy || { buyer: false, seller: false };
      
      // Determine if the current user is the buyer or seller
      const isBuyer = chatData.buyerId === user.uid;
      
      // Only set the specific property based on user role
      if (isBuyer) {
        leftBy.buyer = true;
      } else {
        leftBy.seller = true;
      }
      
      // Update the chat document with the new leftBy status
      await updateDoc(chatRef, { leftBy });
      
      toast.success('You have left the chat');
    } catch (error) {
      logger.error('Error leaving chat:', error);
      toast.error('Failed to leave chat');
    }
  };

  // Handle showing card details
  const handleShowCardDetails = (chat) => {
    if (!chat.cardId || !chat.card) return;
    
    setSelectedListing({
      id: chat.cardId,
      card: chat.card,
      listingPrice: chat.listingPrice,
      currency: chat.currency,
      location: chat.location,
      userId: chat.sellerId,
      sellerName: chat.sellerName
    });
    
    setDetailModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] pt-20 px-4">
      <MarketplaceNavigation currentView={currentView} onViewChange={onViewChange} />
      <div className="flex flex-1 overflow-hidden">
      {/* Chat list - 1/3 width on desktop */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h2>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-center p-4">
              <p className="text-gray-600 dark:text-gray-400">No conversations yet</p>
              <p className="text-gray-500 dark:text-gray-500 mt-2 text-sm">
                When you contact a seller, your conversations will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {conversations.map(chat => (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  activeChat?.id === chat.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const otherUserId = chat.buyerId === user.uid ? chat.sellerId : chat.buyerId;
                        setSelectedSellerId(otherUserId);
                        setShowSellerProfile(true);
                      }}
                    >
                      {chat.otherParticipantName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {chat.card?.card || 'Card discussion'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(chat.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Chat messages - 2/3 width on desktop */}
      <div className="w-2/3 flex flex-col overflow-hidden">
        {!activeChat ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-center p-4">
              <p className="text-gray-600 dark:text-gray-400">Select a conversation</p>
              <p className="text-gray-500 dark:text-gray-500 mt-2">
                Choose a conversation from the list to view messages.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                    onClick={() => {
                      const otherUserId = activeChat.buyerId === user.uid ? activeChat.sellerId : activeChat.buyerId;
                      setSelectedSellerId(otherUserId);
                      setShowSellerProfile(true);
                    }}
                  >
                    {activeChat.otherParticipantName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {activeChat.card?.card || 'Card discussion'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {activeChat.card && (
                  <button
                    onClick={() => handleShowCardDetails(activeChat)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    View Card
                  </button>
                )}
                
                {/* Leave Chat button - disabled if user already left */}
                {(activeChat?.leftBy && 
                  ((user.uid === activeChat.buyerId && activeChat.leftBy.buyer) || 
                   (user.uid === activeChat.sellerId && activeChat.leftBy.seller))) ? (
                  <button
                    disabled
                    className="px-3 py-1 text-sm text-gray-400 dark:text-gray-500 border border-gray-400 dark:border-gray-500 rounded-md cursor-not-allowed"
                  >
                    Chat Left
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveChat}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-600 dark:border-red-400 rounded-md transition-colors"
                  >
                    Leave Chat
                  </button>
                )}
              </div>
            </div>
            
            {/* Left chat notification banner */}
            {activeChat.leftBy && (activeChat.leftBy.buyer || activeChat.leftBy.seller) && (
              <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4">
                <p>
                  {activeChat.leftBy.buyer && activeChat.leftBy.seller 
                    ? 'Both users have left this chat.' 
                    : activeChat.leftBy.buyer 
                      ? 'The buyer has left this chat.' 
                      : 'The seller has left this chat.'}
                </p>
              </div>
            )}
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No messages yet</p>
                  <p className="text-gray-500 dark:text-gray-500 mt-2">
                    Start the conversation by sending a message below.
                  </p>
                </div>
              ) : (
                messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[60%] rounded-lg px-4 py-2 ${
                        message.senderId === user?.uid 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="text-sm">{message.text}</div>
                      <div className="text-xs mt-1 opacity-70 text-right">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message input */}
            {activeChat?.leftBy && (activeChat.leftBy.buyer || activeChat.leftBy.seller) ? (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-100 dark:bg-gray-800 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {activeChat.leftBy.buyer && activeChat.leftBy.seller ? 
                    'Both users have left this chat' : 
                    (activeChat.leftBy.buyer ? 'Buyer has left this chat' : 'Seller has left this chat')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-md ${sendingMessage || !newMessage.trim() ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    <span className="material-icons">send</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
      </div>
      
      {/* Listing Detail Modal */}
      <ListingDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        listing={selectedListing}
      />
      
      {/* Seller Profile */}
      {showSellerProfile && selectedSellerId && (
        <SellerProfile
          sellerId={selectedSellerId}
          onClose={() => {
            setShowSellerProfile(false);
            setSelectedSellerId(null);
          }}
          onViewListing={(listing) => {
            setShowSellerProfile(false);
            setSelectedSellerId(null);
            // Handle viewing listing if needed
          }}
        />
      )}
    </div>
  );
}

export default DesktopMarketplaceMessages;
