import { useCallback } from 'react';
import { CardRepository } from '../../repositories/CardRepository';
import logger from '../../utils/logger';
import LoggingService from '../../services/LoggingService';

// CRUD operations for cards. Requires currentUser, setCards, setLoading, setError.
export default function useCardCrud({ currentUser, setCards, setLoading, setError }) {
  // Update a card
  const updateCard = useCallback(
    async (updatedCard) => {
      const cardId = updatedCard?.id || updatedCard?.slabSerial;
      if (!updatedCard || !cardId) {
        logger.error('Update card failed: Invalid card data or missing ID.', updatedCard);
        setError && setError('Failed to update card: Invalid data.');
        return;
      }
      setLoading && setLoading(true);
      setError && setError(null);
      try {
        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);
          const normalizedCard = { ...updatedCard, id: cardId };
          if (updatedCard.slabSerial) normalizedCard.slabSerial = updatedCard.slabSerial;
          await repository.updateCard(normalizedCard);
          setCards && setCards((prev) => prev.map((c) => (c.id === cardId || c.slabSerial === cardId ? normalizedCard : c)));
        } else {
          setCards && setCards((prev) => prev.map((c) => (c.id === cardId || c.slabSerial === cardId ? updatedCard : c)));
        }
      } catch (err) {
        LoggingService.error(`[useCardCrud] Error updating card ${cardId}:`, err);
        logger.error('Error updating card:', err);
        setError && setError('Failed to save card update.');
      } finally {
        setLoading && setLoading(false);
      }
    },
    [currentUser, setCards, setLoading, setError]
  );

  // Delete a card
  const deleteCard = useCallback(
    async (cardId) => {
      const id = cardId?.id || cardId?.slabSerial || cardId;
      if (!id || typeof id !== 'string') {
        logger.error('Delete card failed: Invalid card ID.', { cardId, id });
        setError && setError('Failed to delete card: Invalid ID.');
        return;
      }
      setCards && setCards((prev) => prev.filter((c) => c.id !== id));
      setLoading && setLoading(true);
      setError && setError(null);
      try {
        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);
          await repository.deleteCard(id);
          logger.debug(`Card ${id} deleted from Firestore.`);
        }
      } catch (err) {
        logger.error('Error deleting card:', err);
        setError && setError('Failed to delete card from cloud.');
      } finally {
        setLoading && setLoading(false);
      }
    },
    [currentUser, setCards, setLoading, setError]
  );

  // Add a new card (supports optional image)
  const addCard = useCallback(
    async (newCardData, imageFile = null) => {
      if (!newCardData) {
        logger.error('Add card failed: Invalid card data.');
        setError && setError('Failed to add card: Invalid data.');
        return null;
      }
      setLoading && setLoading(true);
      setError && setError(null);
      try {
        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);
          try {
            const createdCard = await repository.createCard(newCardData, imageFile);
            const freshCards = await repository.getAllCards();
            setCards && setCards(freshCards);
            const refreshEvent = new CustomEvent('cardDataRefresh', {
              detail: { cards: freshCards, reason: 'add_card_operation' },
            });
            window.dispatchEvent(refreshEvent);
            LoggingService.debug('[useCardCrud] Dispatched refresh after add');
            return createdCard;
          } catch (storageError) {
            if (imageFile && storageError.code === 'storage/unauthorized') {
              const createdCard = await repository.createCard(newCardData, null);
              const freshCards = await repository.getAllCards();
              setCards && setCards(freshCards);
              const refreshEvent = new CustomEvent('cardDataRefresh', {
                detail: { cards: freshCards, reason: 'add_card_operation_no_image' },
              });
              window.dispatchEvent(refreshEvent);
              LoggingService.debug('[useCardCrud] Dispatched refresh after add (no image)');
              return createdCard;
            }
            throw storageError;
          }
        } else {
          const localCard = { ...newCardData, id: Date.now().toString() };
          setCards && setCards((prev) => [...prev, localCard]);
          return localCard;
        }
      } catch (err) {
        logger.error('Error adding card:', err);
        setError && setError('Failed to save new card.');
        return null;
      } finally {
        setLoading && setLoading(false);
      }
    },
    [currentUser, setCards, setLoading, setError]
  );

  return { addCard, updateCard, deleteCard };
}
