import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import logger from '../../utils/logger';

function MarketplaceMessages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    let unsubscribe;
    
    try {
      // Query for user's conversations
      const conversationsRef = collection(firestoreDb, 'conversations');
      const conversationsQuery = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
      );

      // Set up real-time listener for conversations
      unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
        try {
          const conversationPromises = snapshot.docs.map(async doc => {
            const conversationData = {
              id: doc.id,
              ...doc.data()
            };
            
            // Get other participant's display name
            const otherParticipantId = conversationData.participants.find(id => id !== user.uid);
            if (otherParticipantId) {
              try {
                const userDoc = await getDoc(doc(firestoreDb, 'users', otherParticipantId));
                if (userDoc.exists()) {
                  conversationData.otherParticipantName = userDoc.data().displayName || 'Unknown User';
                }
              } catch (error) {
                logger.error('Error fetching other participant data:', error);
                conversationData.otherParticipantName = 'Unknown User';
              }
            }
            
            return conversationData;
          });
          
          const conversationsData = await Promise.all(conversationPromises);
          setConversations(conversationsData);
          setLoading(false);
        } catch (error) {
          logger.error('Error processing conversations:', error);
          setLoading(false);
        }
      }, (error) => {
        logger.error('Error in conversations listener:', error);
        setLoading(false);
      });
    } catch (error) {
      logger.error('Error setting up conversations listener:', error);
      setLoading(false);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Messages</h1>
      
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
            >
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <span className="material-icons">person</span>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900 dark:text-white">{conversation.otherParticipantName}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {conversation.lastMessageTimestamp?.toDate ? 
                      new Date(conversation.lastMessageTimestamp.toDate()).toLocaleDateString() : 
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
  );
}

export default MarketplaceMessages;
