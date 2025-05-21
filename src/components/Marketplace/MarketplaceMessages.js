import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../design-system';
import { useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, getDoc, addDoc, serverTimestamp, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';

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

function MarketplaceMessages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const activeChatId = location.state?.activeChatId;

  // Handle navigation with active chat ID
  useEffect(() => {
    if (activeChatId && conversations.length > 0) {
      const chat = conversations.find(c => c.id === activeChatId);
      if (chat) {
        setActiveChat(chat);
      }
    }
  }, [activeChatId, conversations]);

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
                
                // Sort manually on the client side
                chatsData.sort((a, b) => {
                  const timeA = a.lastUpdated?.seconds || 0;
                  const timeB = b.lastUpdated?.seconds || 0;
                  return timeB - timeA; // Descending order
                });
                
                setConversations(chatsData);
                setLoading(false);
              } catch (innerError) {
                logger.error('Error processing chats in fallback listener:', innerError);
                setLoading(false);
              }
            }, (fallbackError) => {
              logger.error('Error in fallback chats listener:', fallbackError);
              setLoading(false);
            });
          } catch (fallbackSetupError) {
            logger.error('Error setting up fallback chats listener:', fallbackSetupError);
            setLoading(false);
          }
        } else {
          logger.error('Error in chats listener:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      logger.error('Error setting up chats listener:', error);
      setLoading(false);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeChat || !user) return;
    
    try {
      setSendingMessage(true);
      
      // Add the message to the chat's messages subcollection with the exact fields required by security rules
      const messagesRef = collection(firestoreDb, 'chats', activeChat.id, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      
      // We can't update the chat document due to security rules preventing updates
      // The chat list will still show the conversation
      
      // Clear the input field
      setNewMessage('');
      setSendingMessage(false);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      logger.error('Error sending message:', error);
      setSendingMessage(false);
    }
  };
  
  // Load messages for the active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    
    // Validate chat ID to prevent invalid queries
    if (!activeChat.id || typeof activeChat.id !== 'string') {
      logger.error('Invalid chat ID for Firestore query:', activeChat.id);
      return;
    }
    
    let unsubscribe;
    
    try {
      const messagesRef = collection(firestoreDb, 'chats', activeChat.id, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      
      unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        
        setMessages(messagesData);
        
        // Scroll to bottom when messages change
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }, (error) => {
        // Handle specific error types
        logger.error('Error in messages listener:', error);
        // Don't set messages to empty array to preserve any existing messages
      });
    } catch (error) {
      logger.error('Error setting up messages listener:', error);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeChat]);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for display in conversation list
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Handle leaving a chat
  const handleLeaveChat = async () => {
    if (!activeChat || !user) return;
    
    try {
      // Update the chat document to add the current user to leftParticipants array
      const chatRef = doc(firestoreDb, 'chats', activeChat.id);
      await updateDoc(chatRef, {
        leftParticipants: arrayUnion(user.uid)
      });
      
      // Return to chat list
      setActiveChat(null);
    } catch (error) {
      logger.error('Error leaving chat:', error);
    }
  };
  
  // Check if the other participant has left the chat
  const hasOtherParticipantLeft = activeChat?.leftParticipants?.includes(
    activeChat.buyerId === user?.uid ? activeChat.sellerId : activeChat.buyerId
  );
  
  // Determine the message to show when the other participant has left
  const leaveMessage = activeChat?.buyerId === user?.uid 
    ? 'The seller has left the chat.' 
    : 'The buyer has left the chat.';

  // Hide header, footer and bottom nav when in active chat
  useEffect(() => {
    const body = document.body;
    const bottomNav = document.querySelector('.fixed.sm\\:hidden.bottom-0');
    
    if (activeChat) {
      // Hide header and footer
      body.classList.add('hide-header-footer');
      
      // Directly hide bottom nav
      if (bottomNav) {
        bottomNav.style.display = 'none';
      }
    } else {
      // Show header and footer
      body.classList.remove('hide-header-footer');
      
      // Show bottom nav
      if (bottomNav) {
        bottomNav.style.display = '';
      }
    }
    
    // Cleanup function
    return () => {
      body.classList.remove('hide-header-footer');
      if (bottomNav) {
        bottomNav.style.display = '';
      }
    };
  }, [activeChat]);
  
  // Additional effect to ensure bottom nav stays hidden
  useEffect(() => {
    if (!activeChat) return;
    
    // Function to hide bottom nav
    const hideBottomNav = () => {
      const bottomNav = document.querySelector('.fixed.sm\\:hidden.bottom-0');
      if (bottomNav) {
        bottomNav.style.display = 'none';
      }
    };
    
    // Hide immediately
    hideBottomNav();
    
    // Set up an interval to keep checking and hiding
    const interval = setInterval(hideBottomNav, 100);
    
    return () => clearInterval(interval);
  }, [activeChat]);

  return (
    <>
      <style>
        {`${scrollbarHideStyles}
        .hide-header-footer header, .hide-header-footer footer {
          display: none !important;
        }
        .hide-header-footer .main-content {
          padding-top: 0 !important;
          height: 100vh !important;
        }
        .hide-header-footer .fixed.sm\:hidden.bottom-0 {
          display: none !important;
        }`}
      </style>
      <div className={`${activeChat ? 'h-screen' : 'h-[calc(100vh-120px)]'} w-screen flex flex-col overflow-hidden ${activeChat ? 'pt-0' : 'pt-16'} max-w-none mx-0 px-0 absolute left-0 right-0`}> {/* Adjust height and padding based on active chat */}
      {!activeChat ? (
      <div className="w-full px-0 sm:px-2">
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No messages yet</p>
            <p className="text-gray-500 dark:text-gray-500 mt-2">
              When you contact sellers or receive messages, they will appear here.
            </p>
          </div>
            ) : (
              <div className="space-y-4">
                {conversations.map(conversation => (
                  <div 
                    key={conversation.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setActiveChat(conversation)}
                  >
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <span className="material-icons">person</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-900 dark:text-white">{conversation.otherParticipantName}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessageTimestamp ? 
                            formatDate(conversation.lastMessageTimestamp.toDate()) : 
                            'Unknown date'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-screen w-full max-w-none mx-0 px-0">
            {/* Chat header */}
            <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <button 
                  className="mr-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => setActiveChat(null)}
                >
                  <span className="material-icons">arrow_back</span>
                </button>
                <div className="flex items-center">
                  {activeChat?.cardImage && typeof activeChat.cardImage === 'string' ? (
                    <img 
                      src={activeChat.cardImage} 
                      alt={activeChat?.cardTitle || 'Card'}
                      className="w-10 h-10 object-cover rounded-md mr-3" 
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 mr-3">
                      <span className="material-icons">style</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{activeChat?.otherParticipantName}</h3>
                    {activeChat?.cardTitle && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{activeChat.cardTitle}</p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLeaveChat}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-600 dark:border-red-400 rounded-md transition-colors"
              >
                Leave Chat
              </button>
            </div>
            
            {/* Left chat notification banner */}
            {hasOtherParticipantLeft && (
              <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 mb-4">
                <p>{leaveMessage}</p>
              </div>
            )}
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto px-2 py-4 pt-2 space-y-4 scroll-mt-16 w-full max-w-none hide-scrollbar">
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
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
            <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-4 sticky bottom-0 bg-white dark:bg-gray-800 z-10 w-full max-w-none">
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
          </div>
        )}
    </div>
    </>
  );
}

export default MarketplaceMessages;
