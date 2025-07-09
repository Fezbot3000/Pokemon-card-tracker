import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../design-system';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  // getDocs, // Removed - not used
  // limit, // Removed - not used
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import ListingDetailModal from './ListingDetailModal';
import MarketplaceNavigation from './MarketplaceNavigation';
import SellerProfileModal from './SellerProfileModal';
import db from '../../services/firestore/dbAdapter'; // Import IndexedDB service for image loading
import LoggingService from '../../services/LoggingService';

function DesktopMarketplaceMessages({ currentView, onViewChange }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);
  const [sellerProfileId, setSellerProfileId] = useState(null);
  const [cardImages, setCardImages] = useState({});
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

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
      unsubscribe = onSnapshot(
        chatsQuery,
        snapshot => {
          try {
            const chatsData = snapshot.docs.map(doc => {
              const chatData = {
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().lastUpdated?.toDate() || new Date(),
              };

              // Determine if user is buyer or seller
              const isBuyer = chatData.buyerId === user.uid;

              // Set counterparty name based on role
              chatData.otherParticipantName = isBuyer
                ? chatData.sellerName || 'Seller'
                : chatData.buyerName || 'Buyer';

              return chatData;
            });

            const filteredChats = chatsData.filter(chat => {
              // Filter out chats that have been hidden by this user
              const hiddenBy = chat.hiddenBy || {};
              return !hiddenBy[user.uid];
            });

            setConversations(filteredChats);
            setLoading(false);

            // If there's no active chat and we have conversations, select the first one
            if (!activeChat && filteredChats.length > 0) {
              setActiveChat(filteredChats[0]);
            }
          } catch (error) {
            logger.error('Error processing chats:', error);
            setLoading(false);
          }
        },
        error => {
          // Handle specific error types
          if (
            error.message &&
            error.message.includes('Missing or insufficient permissions')
          ) {
            logger.warn(
              'Chat permissions error - user may not be authenticated or lacks access:',
              error
            );
            // Provide user-friendly feedback
            setConversations([]);
            setLoading(false);
          } else if (
            error.message &&
            error.message.includes('requires an index')
          ) {
            logger.warn('Chat index is still building:', error);

            // Fall back to a simpler query without ordering
            try {
              const simpleQuery = query(
                chatsRef,
                where('participants', 'array-contains', user.uid)
              );

              unsubscribe = onSnapshot(
                simpleQuery,
                async snapshot => {
                  const chatsData = snapshot.docs.map(doc => {
                    const chatData = {
                      id: doc.id,
                      ...doc.data(),
                      timestamp: doc.data().lastUpdated?.toDate() || new Date(),
                    };

                    // Determine if user is buyer or seller
                    const isBuyer = chatData.buyerId === user.uid;

                    // Set counterparty name based on role
                    chatData.otherParticipantName = isBuyer
                      ? chatData.sellerName || 'Seller'
                      : chatData.buyerName || 'Buyer';

                    return chatData;
                  });

                  // Sort manually on the client side
                  const filteredChats = chatsData
                    .filter(chat => {
                      // Filter out chats that have been hidden by this user
                      const hiddenBy = chat.hiddenBy || {};
                      return !hiddenBy[user.uid];
                    })
                    .sort((a, b) => {
                      const timeA = a.timestamp?.getTime() || 0;
                      const timeB = b.timestamp?.getTime() || 0;
                      return timeB - timeA; // Descending order
                    });

                  setConversations(filteredChats);
                  setLoading(false);

                  // If there's no active chat and we have conversations, select the first one
                  if (!activeChat && filteredChats.length > 0) {
                    setActiveChat(filteredChats[0]);
                  }
                },
                fallbackError => {
                  logger.error(
                    'Error in fallback chat listener:',
                    fallbackError
                  );
                  setLoading(false);
                }
              );
            } catch (fallbackSetupError) {
              logger.error(
                'Error setting up fallback chat listener:',
                fallbackSetupError
              );
              setLoading(false);
            }
          } else {
            logger.error('Error setting up chat listener:', error);
            setLoading(false);
          }
        }
      );

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

  // Load card images for listings referenced in conversations
  const loadCardImages = async conversationsData => {
    if (!conversationsData || conversationsData.length === 0) return;

    // Clean up existing blob URLs before loading new ones
    Object.values(cardImages).forEach(url => {
      if (url && typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          logger.warn('Failed to revoke blob URL:', error);
        }
      }
    });

    const newCardImages = {};

    // Helper function to ensure we have a string URL
    const ensureStringUrl = imageData => {
      if (!imageData) return null;

      // If it's already a string, return it
      if (typeof imageData === 'string') {
        return imageData;
      }

      // If it's a File object with a preview URL
      if (imageData instanceof File && window.URL) {
        return window.URL.createObjectURL(imageData);
      }

      // If it's an object with a URL property, use that
      if (typeof imageData === 'object') {
        // Check for common URL properties
        if (imageData.url) return imageData.url;
        if (imageData.src) return imageData.src;
        if (imageData.uri) return imageData.uri;
        if (imageData.href) return imageData.href;
        if (imageData.downloadURL) return imageData.downloadURL;
        if (imageData.path && typeof imageData.path === 'string')
          return imageData.path;

        // If it has a toString method, try that
        if (typeof imageData.toString === 'function') {
          const stringValue = imageData.toString();
          if (stringValue !== '[object Object]') {
            return stringValue;
          }
        }
      }

      // If it's a Blob with a type
      if (
        imageData instanceof Blob &&
        imageData.type &&
        imageData.type.startsWith('image/')
      ) {
        return window.URL.createObjectURL(imageData);
      }

      // If we can't extract a URL, return null
      return null;
    };

    // Process each conversation to extract card data
    for (const conversation of conversationsData) {
      try {
        const card = conversation.card;
        if (!card) continue;

        const cardId = card.slabSerial || card.id || conversation.cardId;
        if (!cardId) continue;

        // First, check if the card has an imageUrl property
        if (card.imageUrl) {
          const url = ensureStringUrl(card.imageUrl);
          if (url) {
            newCardImages[cardId] = url;
            continue;
          }
        }

        // Next, check if the card has an image property
        if (card.image) {
          const imageUrl = ensureStringUrl(card.image);
          if (imageUrl) {
            newCardImages[cardId] = imageUrl;
            continue;
          }
        }

        // Check all other possible image properties
        const possibleImageProps = [
          'frontImageUrl',
          'backImageUrl',
          'imageData',
          'cardImageUrl',
        ];
        let foundImage = false;

        for (const prop of possibleImageProps) {
          if (card[prop]) {
            const url = ensureStringUrl(card[prop]);
            if (url) {
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        if (foundImage) continue;

        // If no image in card object, try to load from IndexedDB
        try {
          const imageBlob = await db.getImage(cardId);
          if (imageBlob) {
            const blobUrl = URL.createObjectURL(imageBlob);
            newCardImages[cardId] = blobUrl;
            continue;
          }
        } catch (dbError) {
          // Silently handle IndexedDB errors
          logger.warn(
            `Error loading image from IndexedDB for card ${cardId}:`,
            dbError
          );
        }

        // If we still don't have an image, set to null
        newCardImages[cardId] = null;
      } catch (error) {
        logger.warn('Error processing card image:', error);
      }
    }

    setCardImages(prevImages => ({
      ...prevImages,
      ...newCardImages,
    }));
  };

  // Load card images when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      loadCardImages(conversations);
    }
  }, [conversations]);

  // Listen for custom events to open specific chats (cross-device compatible)
  useEffect(() => {
    const handleOpenSpecificChat = event => {
      const { chatId } = event.detail;
      if (chatId && conversations.length > 0) {
        // Find the chat in the current conversations
        const targetChat = conversations.find(chat => chat.id === chatId);
        if (targetChat) {
          setActiveChat(targetChat);
        }
      }
    };

    // Add event listener
    window.addEventListener('openSpecificChat', handleOpenSpecificChat);

    // Cleanup
    return () => {
      window.removeEventListener('openSpecificChat', handleOpenSpecificChat);
    };
  }, [conversations]); // Re-run when conversations change

  // Listen for messages when an active chat is selected
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      firestoreDb,
      'chats',
      activeChat.id,
      'messages'
    );
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        try {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));

          setMessages(messagesData);

          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } catch (error) {
          logger.error('Error processing messages:', error);
        }
      },
      error => {
        logger.error('Error setting up messages listener:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async e => {
    e.preventDefault();

    if (!newMessage.trim() || !activeChat || !user) return;

    // Check if either user has left the chat
    const hasUserLeft =
      activeChat.leftBy &&
      (activeChat.leftBy.buyer || activeChat.leftBy.seller);
    if (hasUserLeft) {
      toast.error('This chat has been closed');
      return;
    }

    try {
      setSendingMessage(true);

      // Add the message to the chat's messages subcollection with the exact fields required by security rules
      const messagesRef = collection(
        firestoreDb,
        'chats',
        activeChat.id,
        'messages'
      );
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });

      // Clear the input field
      setNewMessage('');
      setSendingMessage(false);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      LoggingService.error('Error sending message:', error);
      setSendingMessage(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = timestamp => {
    if (!timestamp) return 'Unknown time';

    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display in conversation list
  const formatDate = timestamp => {
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

  // Handle deleting a chat
  const handleDeleteChat = async () => {
    if (!activeChat || !user) return;

    // Show confirmation dialog
    if (
      !window.confirm(
        'Are you sure you want to delete this chat? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const chatRef = doc(firestoreDb, 'chats', activeChat.id);

      // Get the current chat document
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        toast.error('Chat not found');
        return;
      }

      // Get the current hiddenBy status or initialize it
      const chatData = chatDoc.data();
      const hiddenBy = chatData.hiddenBy || {};

      // Set the hiddenBy status for the current user
      hiddenBy[user.uid] = true;

      // Update the chat document with the new hiddenBy status
      await updateDoc(chatRef, { hiddenBy });

      toast.success('Chat deleted');
    } catch (error) {
      logger.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Handle showing card details
  const handleShowCardDetails = async chat => {
    if (!chat.cardId) return;

    try {
      // Fetch the complete listing from Firestore
      const listingRef = doc(firestoreDb, 'marketplaceItems', chat.cardId);
      const listingSnap = await getDoc(listingRef);

      if (listingSnap.exists()) {
        const listingData = {
          id: listingSnap.id,
          ...listingSnap.data(),
        };
        setSelectedListing(listingData);
        setDetailModalOpen(true);
      } else {
        // Fallback to chat data if listing no longer exists
        setSelectedListing({
          id: chat.cardId,
          card: chat.card,
          listingPrice: chat.listingPrice,
          currency: chat.currency,
          location: chat.location,
          userId: chat.sellerId,
          sellerName: chat.sellerName,
        });
        setDetailModalOpen(true);
      }
    } catch (error) {
      logger.error('Error fetching listing details:', error);
      toast.error('Failed to load listing details');
    }
  };

  // Handle viewing seller profile
  const handleViewSellerProfile = sellerId => {
    setSellerProfileId(sellerId);
    setSellerProfileOpen(true);
  };

  // Handle contacting seller from profile modal
  const handleContactSeller = sellerId => {
    // Close the seller profile modal
    setSellerProfileOpen(false);
    setSellerProfileId(null);

    // Find existing chat with this seller
    const existingChat = conversations.find(
      chat => chat.sellerId === sellerId || chat.buyerId === sellerId
    );

    if (existingChat) {
      // Open existing chat
      setActiveChat(existingChat);
      toast.success('Opening existing conversation');
    } else {
      // No existing chat found - would need to create one, but that requires a specific listing
      toast(
        'To start a conversation, please contact the seller from a specific listing'
      );
    }
  };

  // Handle opening listing from seller profile
  const handleOpenListing = listing => {
    // Close seller profile modal
    setSellerProfileOpen(false);
    setSellerProfileId(null);

    // Open listing detail modal
    setSelectedListing(listing);
    setDetailModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col p-4 pb-20 sm:p-6">
      <MarketplaceNavigation
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="-mx-4 flex flex-1 overflow-hidden sm:-mx-6">
        {/* Chat list - 1/3 width on desktop */}
        <div className="flex w-1/3 flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Messages
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-y-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              {/* Messages Icon */}
              <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <span className="material-icons text-3xl text-gray-400 dark:text-gray-600">
                  chat_bubble_outline
                </span>
              </div>

              {/* Main Message */}
              <h3 className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
                No Conversations
              </h3>

              {/* Description */}
              <p className="text-center text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                When you contact sellers, conversations will appear here.
              </p>

              {/* Action Button */}
              <button
                onClick={() => onViewChange('marketplace')}
                className="mt-4 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                <span className="material-icons text-sm">storefront</span>
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="hide-scrollbar flex-1 overflow-y-auto">
              {conversations.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`cursor-pointer border-b border-gray-200 p-4 transition-colors dark:border-gray-700 ${
                    activeChat?.id === chat.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="cursor-pointer truncate font-medium text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        onClick={e => {
                          e.stopPropagation();
                          try {
                            const otherUserId =
                              chat.buyerId === user.uid
                                ? chat.sellerId
                                : chat.buyerId;

                            if (!otherUserId) {
                              toast.error('Unable to determine seller ID');
                              return;
                            }

                            handleViewSellerProfile(otherUserId);
                          } catch (error) {
                            LoggingService.error(
                              'Error opening seller profile:',
                              error
                            );
                            toast.error('Failed to open seller profile');
                          }
                        }}
                      >
                        {chat.otherParticipantName}
                      </h3>
                      <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
                        {chat.card?.card || 'Card discussion'}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(chat.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat messages - 2/3 width on desktop */}
        <div className="flex w-2/3 flex-col overflow-hidden">
          {!activeChat ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Select a conversation
                </p>
                <p className="mt-2 text-gray-500 dark:text-gray-500">
                  Choose a conversation from the list to view messages.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="cursor-pointer font-medium text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        onClick={() => {
                          const otherUserId =
                            activeChat.buyerId === user.uid
                              ? activeChat.sellerId
                              : activeChat.buyerId;
                          handleViewSellerProfile(otherUserId);
                        }}
                      >
                        {activeChat.otherParticipantName}
                      </h3>
                      <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                        {activeChat.card?.card || 'Card discussion'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Leave Chat button - disabled if user already left */}
                    {activeChat?.leftBy &&
                    ((user.uid === activeChat.buyerId &&
                      activeChat.leftBy.buyer) ||
                      (user.uid === activeChat.sellerId &&
                        activeChat.leftBy.seller)) ? (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-md border border-gray-400 px-3 py-1 text-sm text-gray-400 dark:border-gray-500 dark:text-gray-500"
                      >
                        Chat Left
                      </button>
                    ) : (
                      <button
                        onClick={handleLeaveChat}
                        className="rounded-md border border-red-600 px-3 py-1 text-sm text-red-600 transition-colors hover:text-red-800 dark:border-red-400 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Leave Chat
                      </button>
                    )}

                    {/* Delete Chat button */}
                    <button
                      onClick={handleDeleteChat}
                      className="rounded-md border border-red-600 px-3 py-1 text-sm text-red-600 transition-colors hover:text-red-800 dark:border-red-400 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete Chat
                    </button>
                  </div>
                </div>
              </div>

              {/* Left chat notification banner */}
              {activeChat.leftBy &&
                (activeChat.leftBy.buyer || activeChat.leftBy.seller) && (
                  <div className="border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                    <p>
                      {activeChat.leftBy.buyer && activeChat.leftBy.seller
                        ? 'Both users have left this chat.'
                        : activeChat.leftBy.buyer
                          ? 'The buyer has left this chat.'
                          : 'The seller has left this chat.'}
                    </p>
                  </div>
                )}

              {/* Card Info Section - Show what item they're discussing */}
              {activeChat && activeChat.cardId && (
                <div
                  className="cursor-pointer border-b border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-[#0F0F0F] dark:hover:bg-[#0F0F0F]"
                  onClick={() => handleShowCardDetails(activeChat)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Card Image */}
                      {(cardImages[activeChat.cardId] ||
                        activeChat.cardImage) && (
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                          <img
                            src={
                              cardImages[activeChat.cardId] ||
                              activeChat.cardImage
                            }
                            alt="Card"
                            className="size-full object-cover"
                            onError={e => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {activeChat.cardTitle ||
                              activeChat.cardName ||
                              activeChat.card?.name ||
                              activeChat.card?.cardName ||
                              activeChat.card?.card ||
                              'Card discussion'}
                          </h4>
                          {/* Status Tag */}
                          <div
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              activeChat.status === 'sold'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : activeChat.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}
                          >
                            {activeChat.status === 'sold'
                              ? 'SOLD'
                              : activeChat.status === 'pending'
                                ? 'PENDING'
                                : 'FOR SALE'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          {(activeChat.listingPrice || activeChat.priceAUD) && (
                            <span className="font-semibold">
                              ${activeChat.listingPrice || activeChat.priceAUD}{' '}
                              {activeChat.currency || 'AUD'}
                            </span>
                          )}
                          {activeChat.location && (
                            <>
                              <span>•</span>
                              <span>{activeChat.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Click indicator */}
                    <div className="text-gray-400 dark:text-gray-500">
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages container */}
              <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      No messages yet
                    </p>
                    <p className="mt-2 text-gray-500 dark:text-gray-500">
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
                            : 'bg-gray-200 text-gray-900 dark:bg-[#0F0F0F] dark:text-white'
                        }`}
                      >
                        <div className="text-sm">{message.text}</div>
                        <div className="mt-1 text-right text-xs opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              {activeChat?.leftBy &&
              (activeChat.leftBy.buyer || activeChat.leftBy.seller) ? (
                <div className="border-t border-gray-200 bg-gray-100 p-4 text-center dark:border-gray-700 dark:bg-[#0F0F0F]">
                  <p className="text-gray-600 dark:text-gray-400">
                    {activeChat.leftBy.buyer && activeChat.leftBy.seller
                      ? 'Both users have left this chat'
                      : activeChat.leftBy.buyer
                        ? 'Buyer has left this chat'
                        : 'Seller has left this chat'}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white"
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      className={`rounded-md px-4 py-2 ${sendingMessage || !newMessage.trim() ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
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
        onContactSeller={() => {
          // Already in messages, just close modal
          setDetailModalOpen(false);
        }}
        onReportListing={() => {
          toast.error('Reporting functionality coming soon');
        }}
        onViewSellerProfile={handleViewSellerProfile}
        onEditListing={() => {
          toast.error('Edit functionality not available in messages view');
        }}
        onMarkAsPending={() => {
          toast.error('Mark as pending not available in messages view');
        }}
        onMarkAsSold={() => {
          toast.error('Mark as sold not available in messages view');
        }}
        onViewChange={onViewChange}
      />

      {/* Seller Profile Modal */}
      {sellerProfileOpen && sellerProfileId && (
        <SellerProfileModal
          isOpen={sellerProfileOpen}
          onClose={() => {
            setSellerProfileOpen(false);
            setSellerProfileId(null);
          }}
          sellerId={sellerProfileId}
          cardImages={cardImages}
          onContactSeller={handleContactSeller}
          onOpenListing={handleOpenListing}
          onViewChange={onViewChange}
        />
      )}
    </div>
  );
}

export default DesktopMarketplaceMessages;
