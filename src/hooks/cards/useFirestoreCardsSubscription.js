import { useEffect, useState } from 'react';
import { useAuth } from '../../design-system/contexts/AuthContext';
import { CardRepository } from '../../repositories/CardRepository';
import logger from '../../utils/logger';
import LoggingService from '../../services/LoggingService';

// Handles real-time Firestore subscription and exposes cards/loading/error
export default function useFirestoreCardsSubscription() {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for forced refresh events (e.g., after move/add operations)
  useEffect(() => {
    const handleCardDataRefresh = (event) => {
      const { cards: freshCards, reason } = event.detail;
      LoggingService.debug(
        `[useFirestoreCardsSubscription] Forced refresh (${reason}):`,
        freshCards.length,
        'cards'
      );
      setCards(freshCards);
      setLoading(false);
      setError(null);
    };

    window.addEventListener('cardDataRefresh', handleCardDataRefresh);
    return () => window.removeEventListener('cardDataRefresh', handleCardDataRefresh);
  }, []);

  useEffect(() => {
    if (currentUser) {
      logger.debug('🔥 [CARDS] Setting up Firestore listener for user:', currentUser.uid);
      setLoading(true);
      const repository = new CardRepository(currentUser.uid);

      let updateTimeout = null;
      const processUpdate = (firestoreCards) => {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          logger.debug('🔥 [CARDS] Debounced update with', firestoreCards.length, 'cards');
          const updateTime = Date.now();
          LoggingService.debug('🔥 LISTENER: setCards with', firestoreCards.length, 'cards');

          if (process.env.NODE_ENV !== 'production') {
            if (window.__INSTRUMENT_SET_CARDS__ && window.__CARD_DATA_TRACKER__) {
              window.__CARD_DATA_TRACKER__.setCardsCalls.push({
                timestamp: updateTime,
                cardCount: firestoreCards.length,
                stackTrace: new Error().stack,
                trigger: 'firestore_listener',
              });
              window.__CARD_DATA_TRACKER__.lastCall = updateTime;
            }
          }

          setCards(firestoreCards);
          setLoading(false);
          setError(null);
        }, 300);
      };

      const unsubscribe = repository.subscribeToAllCards(
        processUpdate,
        (err) => {
          logger.error('Error subscribing to Firestore cards:', err);
          setError('Failed to load cards from cloud.');
          setLoading(false);
        }
      );

      return () => {
        logger.debug('Cleaning up Firestore listener for user:', currentUser.uid);
        if (updateTimeout) clearTimeout(updateTimeout);
        unsubscribe();
      };
    }

    // No user
    logger.debug('🔥 [CARDS] No user logged in, clearing cards and setting loading to false');
    setCards([]);
    setLoading(false);
  }, [currentUser]);

  return { cards, setCards, loading, setLoading, error, setError, currentUser };
}
