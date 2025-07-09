import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../design-system';
import { useLocation } from 'react-router-dom';
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
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { httpsCallable, getFunctions } from 'firebase/functions';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import ListingDetailModal from './ListingDetailModal';
import DesktopMarketplaceMessages from './DesktopMarketplaceMessages';
import SellerProfileModal from './SellerProfileModal';
import SellerReviewModal from './SellerReviewModal';
import LoggingService from '../../services/LoggingService';

const functions = getFunctions();

function MarketplaceMessages({ currentView, onViewChange }) {
  // Move ALL hooks to the top before any conditional logic
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);
  const [sellerProfileId, setSellerProfileId] = useState(null);
  const [sellerReviewOpen, setSellerReviewOpen] = useState(false);
  const [sellerReviewId, setSellerReviewId] = useState(null);

  const { user } = useAuth();
  const location = useLocation();
  const activeChatId = location.state?.activeChatId;
  const messagesEndRef = useRef(null);

  // Determine if we should show desktop or mobile layout
  const isDesktop = windowWidth >= 1024;

  // ALL useEffect hooks moved to top
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
                  try {
                    const chatsData = snapshot.docs.map(doc => {
                      const chatData = {
                        id: doc.id,
                        ...doc.data(),
                        timestamp:
                          doc.data().lastUpdated?.toDate() || new Date(),
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
                    chatsData.sort((a, b) => {
                      const timeA = a.lastUpdated?.seconds || 0;
                      const timeB = b.lastUpdated?.seconds || 0;
                      return timeB - timeA; // Descending order
                    });

                    // Filter out chats that have been hidden by this user
                    const filteredChats = chatsData.filter(chat => {
                      const hiddenBy = chat.hiddenBy || {};
                      return !hiddenBy[user.uid];
                    });

                    setConversations(filteredChats);
                    setLoading(false);
                  } catch (innerError) {
                    logger.error(
                      'Error processing chats in fallback listener:',
                      innerError
                    );
                    setLoading(false);
                  }
                },
                fallbackError => {
                  logger.error(
                    'Error in fallback chats listener:',
                    fallbackError
                  );
                  setLoading(false);
                }
              );
            } catch (fallbackSetupError) {
              logger.error(
                'Error setting up fallback chats listener:',
                fallbackSetupError
              );
              setLoading(false);
            }
          } else {
            logger.error('Error in chats listener:', error);
            setLoading(false);
          }
        }
      );
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

    // Listen for the custom event
    window.addEventListener('openSpecificChat', handleOpenSpecificChat);

    return () => {
      window.removeEventListener('openSpecificChat', handleOpenSpecificChat);
    };
  }, [conversations]);

  // Set up messages listener when activeChat changes
  useEffect(() => {
    if (!activeChat || !user) return;

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
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
        setMessages(messagesData);
      },
      error => {
        logger.error('Error listening to messages:', error);
      }
    );

    return () => unsubscribe();
  }, [activeChat, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  // Return desktop version for larger screens
  if (isDesktop) {
    return (
      <DesktopMarketplaceMessages
        currentView={currentView}
        onViewChange={onViewChange}
      />
    );
  }

  // Mobile version continues below

  // Helper function to fetch complete listing data
  const fetchCompleteListingData = async chat => {
    if (!chat.cardId) return null;

    try {
      // Fetch the complete listing from Firestore
      const listingRef = doc(firestoreDb, 'marketplaceItems', chat.cardId);
      const listingSnap = await getDoc(listingRef);

      if (listingSnap.exists()) {
        return {
          id: listingSnap.id,
          ...listingSnap.data(),
        };
      } else {
        // Fallback to chat data if listing no longer exists
        const cardData = chat.card || {
          name: chat.cardTitle || 'Card Listing',
          set: chat.cardSet,
          year: chat.cardYear,
          grade: chat.cardGrade,
          gradeCompany: chat.cardGradeCompany,
          slabSerial: chat.cardId,
        };

        return {
          id: chat.cardId,
          card: cardData,
          userId: chat.sellerId || chat.buyerId,
          listingPrice: chat.price || 0,
          currency: chat.currency || 'USD',
          timestampListed: chat.timestamp,
          note: chat.note || '',
          location: chat.location || '',
        };
      }
    } catch (error) {
      logger.error('Error fetching listing details:', error);
      return null;
    }
  };

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

      // Send email notification
      const sendEmailNotification = httpsCallable(
        functions,
        'sendEmailNotification'
      );
      await sendEmailNotification({
        chatId: activeChat.id,
        senderId: user.uid,
        message: newMessage.trim(),
      });
    } catch (error) {
      LoggingService.error('Error sending message:', error);
      setSendingMessage(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = timestamp => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display in conversation list
  const formatDate = timestamp => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Otherwise show full date
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle leaving a chat
  const handleLeaveChat = async () => {
    if (!activeChat || !user) return;

    try {
      const chatRef = doc(firestoreDb, 'chats', activeChat.id);
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.data();

      // Determine if user is buyer or seller
      const isBuyer = user.uid === chatData.buyerId;
      const isSeller = user.uid === chatData.sellerId;

      if (!isBuyer && !isSeller) {
        toast.error('You cannot leave this chat');
        return;
      }

      // Create a new leftBy object that exactly matches what was there before
      // This is critical for the security rules to work
      const existingLeftBy = chatData.leftBy || {};
      const newLeftBy = {};

      // Copy all existing properties
      Object.keys(existingLeftBy).forEach(key => {
        newLeftBy[key] = existingLeftBy[key];
      });

      // Set only the property we're allowed to change
      if (isBuyer) {
        newLeftBy.buyer = true;
      } else {
        newLeftBy.seller = true;
      }

      // Update the document with the new leftBy object
      await updateDoc(chatRef, { leftBy: newLeftBy });

      // Add a system message
      try {
        const messagesRef = collection(
          firestoreDb,
          'chats',
          activeChat.id,
          'messages'
        );
        await addDoc(messagesRef, {
          text: `${isBuyer ? 'Buyer' : 'Seller'} has left the chat.`,
          senderId: 'system',
          timestamp: serverTimestamp(),
        });
      } catch (messageError) {
        // If adding the message fails, just log it - we still want to leave the chat
        // LoggingService.info('Could not add system message, but chat was left');
      }

      // Close the chat
      setActiveChat(null);
      toast.success('You have left the chat');
    } catch (error) {
      LoggingService.error('Error leaving chat:', error);
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
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.data();

      // Determine if user is buyer or seller
      const isBuyer = user.uid === chatData.buyerId;
      const isSeller = user.uid === chatData.sellerId;

      if (!isBuyer && !isSeller) {
        toast.error('You cannot delete this chat');
        return;
      }

      // Create a new hiddenBy object that exactly matches what was there before
      // This is critical for the security rules to work
      const existingHiddenBy = chatData.hiddenBy || {};
      const newHiddenBy = {};

      // Copy all existing properties
      Object.keys(existingHiddenBy).forEach(key => {
        newHiddenBy[key] = existingHiddenBy[key];
      });

      // Set only the property we're allowed to change
      newHiddenBy[user.uid] = true;

      // Update the document with the new hiddenBy object
      await updateDoc(chatRef, { hiddenBy: newHiddenBy });

      // Close the chat
      setActiveChat(null);
      toast.success('Chat has been deleted');
    } catch (error) {
      LoggingService.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Check if the other participant has left the chat based on leftBy field
  const hasOtherParticipantLeft =
    activeChat &&
    user &&
    activeChat.leftBy &&
    ((activeChat.buyerId === user.uid && activeChat.leftBy.seller) ||
      (activeChat.sellerId === user.uid && activeChat.leftBy.buyer));

  // Determine the message to show when the other participant has left
  const leaveMessage =
    activeChat?.buyerId === user?.uid
      ? 'The seller has left the chat.'
      : 'The buyer has left the chat.';

  // Handle contact seller function
  const handleContactSeller = sellerId => {
    // Find existing chat with this seller
    const existingChat = conversations.find(
      chat => chat.sellerId === sellerId || chat.buyerId === sellerId
    );

    if (existingChat) {
      setActiveChat(existingChat);
    } else {
      // Create new chat logic would go here
      toast.error('Unable to start chat. Please try again.');
    }
  };

  // Handle viewing seller profile
  const handleViewSellerProfile = sellerId => {
    setSellerProfileId(sellerId);
    setSellerProfileOpen(true);
  };

  // Handle viewing seller review
  const handleViewSellerReview = sellerId => {
    setSellerReviewId(sellerId);
    setSellerReviewOpen(true);
  };

  return (
    <>
      {/* Listing Detail Modal */}
      {detailModalOpen && selectedListing && (
        <ListingDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onContactSeller={() => {
            // Already in messages, just close modal
            setDetailModalOpen(false);
            setSelectedListing(null);
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
      )}

      {/* Seller Profile Modal */}
      {sellerProfileOpen && sellerProfileId && (
        <SellerProfileModal
          isOpen={sellerProfileOpen}
          onClose={() => {
            setSellerProfileOpen(false);
            setSellerProfileId(null);
          }}
          sellerId={sellerProfileId}
          onContactSeller={handleContactSeller}
          onViewChange={onViewChange}
        />
      )}

      {/* Seller Review Modal */}
      {sellerReviewOpen && sellerReviewId && (
        <SellerReviewModal
          isOpen={sellerReviewOpen}
          onClose={() => {
            setSellerReviewOpen(false);
            setSellerReviewId(null);
          }}
          sellerId={sellerReviewId}
          listingId={activeChat?.cardId}
          chatId={activeChat?.id}
        />
      )}
      <style>
        {`
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
      <div
        className={`${activeChat ? 'min-h-screen' : 'min-h-[calc(100vh-200px)]'} flex w-full flex-col ${activeChat ? 'pt-0' : 'pt-4'} bg-gray-100 dark:bg-black`}
      >
        {!activeChat ? (
          <div className="w-full px-4 pt-20 sm:px-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="size-12 animate-spin rounded-full border-y-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16">
                {/* Messages Icon */}
                <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">
                    chat_bubble_outline
                  </span>
                </div>

                {/* Main Message */}
                <h3 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
                  No Messages Yet
                </h3>

                {/* Description */}
                <p className="mb-8 max-w-md text-center leading-relaxed text-gray-600 dark:text-gray-400">
                  Start conversations by contacting sellers about cards you're
                  interested in. Your messages will appear here.
                </p>

                {/* Action Button */}
                <button
                  onClick={() => onViewChange('marketplace')}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-8 py-3 font-medium text-white shadow-lg transition-colors hover:bg-red-600"
                >
                  <span className="material-icons text-lg">storefront</span>
                  Browse Marketplace
                </button>

                {/* Additional Info */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    💬 Connect with other collectors and start trading
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className="flex cursor-pointer items-center rounded-lg bg-white p-4 shadow transition-colors hover:bg-gray-50 dark:bg-[#0F0F0F] dark:hover:bg-gray-700"
                    onClick={() => setActiveChat(conversation)}
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                      <span className="material-icons">person</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-start justify-between">
                        <h3
                          className="cursor-pointer font-medium text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          onClick={e => {
                            e.stopPropagation();
                            const otherUserId =
                              conversation.buyerId === user.uid
                                ? conversation.sellerId
                                : conversation.buyerId;
                            handleViewSellerProfile(otherUserId);
                          }}
                        >
                          {conversation.otherParticipantName}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessageTimestamp &&
                          typeof conversation.lastMessageTimestamp.toDate ===
                            'function'
                            ? formatDate(
                                conversation.lastMessageTimestamp.toDate()
                              )
                            : formatDate(conversation.timestamp) || 'Recent'}
                        </span>
                      </div>
                      <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-0 flex h-screen w-full max-w-none flex-col px-0">
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-[#0F0F0F]">
              <div className="flex items-center">
                <button
                  className="mr-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={() => setActiveChat(null)}
                >
                  <span className="material-icons">arrow_back</span>
                </button>
                <div className="flex items-center">
                  {activeChat?.cardImage &&
                  typeof activeChat.cardImage === 'string' ? (
                    <img
                      src={activeChat.cardImage}
                      alt={activeChat?.cardTitle || 'Card'}
                      className="mr-3 size-10 cursor-pointer rounded-md object-cover transition-opacity hover:opacity-80"
                      onClick={async () => {
                        // Log the activeChat to debug
                        // LoggingService.info('Active chat data:', activeChat);

                        const listingData =
                          await fetchCompleteListingData(activeChat);
                        setSelectedListing(listingData);
                        setDetailModalOpen(true);
                      }}
                    />
                  ) : (
                    <div
                      className="mr-3 flex size-10 cursor-pointer items-center justify-center rounded-md bg-gray-200 text-gray-500 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-500"
                      onClick={async () => {
                        // Log the activeChat to debug
                        // LoggingService.info('Active chat data:', activeChat);

                        const listingData =
                          await fetchCompleteListingData(activeChat);
                        setSelectedListing(listingData);
                        setDetailModalOpen(true);
                      }}
                    >
                      <span className="material-icons">style</span>
                    </div>
                  )}
                  <div>
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
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {activeChat?.cardTitle || 'General Discussion'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="rounded-md border border-red-600 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900 dark:hover:text-red-300"
                  onClick={handleLeaveChat}
                >
                  Leave Chat
                </button>
                <button
                  className="rounded-md border border-red-600 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900 dark:hover:text-red-300"
                  onClick={handleDeleteChat}
                >
                  Delete Chat
                </button>
              </div>
            </div>

            {/* Left chat notification banner */}
            {hasOtherParticipantLeft && (
              <div className="mx-2 border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                <p>{leaveMessage}</p>
              </div>
            )}

            {/* Messages container - Scrollable area */}
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
                    className={`flex ${message.senderId === user?.uid ? 'justify-end' : message.senderId === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {message.senderId === 'system' ? (
                      <div className="max-w-[90%] rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-900/30">
                        <div className="text-center text-sm text-blue-800 dark:text-blue-200">
                          {message.text}
                        </div>
                        {message.type === 'review_request' &&
                          message.sellerId &&
                          user?.uid !== message.sellerId && (
                            <div className="mt-3 text-center">
                              <button
                                onClick={() => {
                                  setSellerReviewId(message.sellerId);
                                  setSellerReviewOpen(true);
                                }}
                                className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
                              >
                                Write Review
                              </button>
                            </div>
                          )}
                        <div className="mt-2 text-center text-xs text-blue-600 opacity-70 dark:text-blue-300">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
                    )}
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
          </div>
        )}
      </div>
    </>
  );
}

export default MarketplaceMessages;
