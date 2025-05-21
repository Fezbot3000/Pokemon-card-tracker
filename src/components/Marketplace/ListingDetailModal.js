import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useAuth } from '../../design-system';
import Icon from '../../design-system/atoms/Icon';
import { collection, addDoc, serverTimestamp, getDoc, doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EditListingModal from './EditListingModal';

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

function ListingDetailModal({ isOpen, onClose, listing, cardImage }) {
  const { formatAmountForDisplay } = useUserPreferences();
  const { user } = useAuth();
  const [contactingUser, setContactingUser] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // Handle closing the edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };
  
  // Add the style to the document - moved before conditional return
  React.useEffect(() => {
    // Only apply styles if modal is open
    if (!isOpen || !listing) return;
    
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.innerHTML = scrollbarHideStyles;
    document.head.appendChild(styleEl);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [isOpen, listing]);
  
  // Early return after all hooks have been called
  if (!isOpen || !listing) return null;
  
  const isOwner = user?.uid === listing.userId;
  const card = listing.card || {};
  
  // Format date
  const formattedDate = listing.timestampListed?.toDate 
    ? listing.timestampListed.toDate().toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Unknown date';
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        
        <div 
          className="fixed inset-0 flex items-center justify-center"
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-headline"
        >
          <div className="w-full h-full bg-white dark:bg-[#0F0F0F] text-left overflow-y-auto hide-scrollbar shadow-xl transform transition-all">
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F]">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Listing Details
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="flex justify-center">
                  <div className="aspect-[2/3] w-full max-w-sm bg-white dark:bg-[#1B2131] rounded-lg overflow-hidden p-4">
                    {cardImage ? (
                      <img 
                        src={cardImage} 
                        alt={(card.cardName || card.card || card.name || 'Pokemon Card')} 
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon name="image" className="text-gray-400 dark:text-gray-600 text-6xl" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Card Details */}
                <div className="flex flex-col space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(card.cardName || card.card || card.name || card.player || 'Unnamed Card').toUpperCase()}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {card.set || 'Pokemon Game'}{card.number ? ` · ${card.number}` : ''}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                      {listing.listingPrice} {listing.currency || 'AUD'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Listed on {formattedDate}
                    </div>
                  </div>
                  
                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {card.category && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
                        <p className="text-base text-gray-900 dark:text-white">{card.category}</p>
                      </div>
                    )}
                    
                    {card.year && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Year</h3>
                        <p className="text-base text-gray-900 dark:text-white">{card.year}</p>
                      </div>
                    )}
                    
                    {card.grade && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Grade</h3>
                        <p className="text-base text-gray-900 dark:text-white">{card.grade}</p>
                      </div>
                    )}
                    
                    {card.grader && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Grader</h3>
                        <p className="text-base text-gray-900 dark:text-white">{card.grader}</p>
                      </div>
                    )}
                    
                    {card.slabSerial && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Slab Serial</h3>
                        <p className="text-base text-gray-900 dark:text-white">{card.slabSerial}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Location */}
                  {listing.location && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h3>
                      <p className="text-base text-gray-900 dark:text-white flex items-center">
                        <span className="material-icons text-gray-400 mr-1 text-sm">location_on</span>
                        {listing.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Seller Note */}
                  {listing.note && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Seller Note</h3>
                      <p className="text-base text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {listing.note}
                      </p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 mt-4">
                    {isOwner ? (
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Edit Listing
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!user) {
                            toast.error('You must be logged in to contact the seller');
                            return;
                          }
                          
                          setContactingUser(true);
                          try {
                            // Get the seller ID and buyer ID
                            const sellerId = listing.userId;
                            const buyerId = user.uid;
                            
                            // Validate IDs to prevent errors
                            if (!sellerId || !buyerId) {
                              throw new Error('Missing seller or buyer ID');
                            }
                            
                            // Don't allow contacting yourself
                            if (sellerId === buyerId) {
                              toast.error('You cannot contact yourself');
                              return;
                            }
                            
                            // Create a unique chat ID based on the two user IDs and the card ID
                            const cardId = listing.card.slabSerial || listing.card.id || 'unknown';
                            const chatId = `${sellerId}_${buyerId}_${cardId}`;
                            
                            // Check if the chat already exists
                            const chatDocRef = doc(firestoreDb, 'chats', chatId);
                            const chatDoc = await getDoc(chatDocRef);
                            
                            let finalChatId;
                            
                            if (chatDoc.exists()) {
                              // Chat already exists, use its ID
                              finalChatId = chatId;
                              console.log('Using existing chat:', chatId);
                            } else {
                              console.log('Creating new chat with ID:', chatId);
                              
                              // Create the chat document with the required fields
                              // Ensure this structure matches the Firestore security rules
                              await setDoc(chatDocRef, {
                                participants: [sellerId, buyerId],
                                sellerId: sellerId,
                                buyerId: buyerId,
                                sellerName: 'Seller', // This should be replaced with actual seller name if available
                                buyerName: user.displayName || 'Buyer',
                                cardId: cardId,
                                cardTitle: listing.card.card || listing.card.name || 'Card Listing',
                                cardImage: cardImage,
                                cardSet: listing.card.set || '',
                                cardYear: listing.card.year || '',
                                price: listing.listingPrice || 0,
                                currency: listing.currency || 'USD',
                                lastUpdated: serverTimestamp(),
                                createdAt: serverTimestamp(),
                                lastMessage: '',
                                leftBy: {}, // Required empty object for the security rules
                                // Add a welcome message to the chat
                                timestamp: serverTimestamp()
                              });
                              
                              // Add a system message to the chat
                              const messagesRef = collection(firestoreDb, `chats/${chatId}/messages`);
                              await addDoc(messagesRef, {
                                text: 'Chat started about this card listing',
                                senderId: 'system',
                                timestamp: serverTimestamp()
                              });
                              
                              finalChatId = chatId;
                            }
                            
                            // Close the modal
                            onClose();
                            
                            // Navigate to messages with this chat active
                            navigate('/messages', { state: { activeChatId: finalChatId } });
                            
                          } catch (error) {
                            console.error('Error starting chat:', error);
                            toast.error('Failed to start chat. Please try again.');
                          } finally {
                            setContactingUser(false);
                          }
                        }}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        disabled={contactingUser}
                      >
                        {contactingUser ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                            <span>Starting Chat...</span>
                          </>
                        ) : (
                          <>Contact Seller</>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={onClose}
                      className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Listing Modal */}
      <EditListingModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        listing={listing}
      />
    </div>
  );
}

ListingDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listing: PropTypes.object,
  cardImage: PropTypes.string
};

export default ListingDetailModal;
