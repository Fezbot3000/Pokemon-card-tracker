import React, { useState, useEffect, useRef, memo } from 'react';
import ImagePersistenceManager from '../utils/ImagePersistenceManager';
import db from '../services/db';
import logger from '../utils/logger';
import { useInvoiceContext } from '../contexts/InvoiceContext';

/**
 * OptimizedCard - Performance optimized card component
 * - Caches images to prevent reloading during navigation
 * - Uses ImagePersistenceManager to store image data
 */
const OptimizedCard = memo(({ card, onCardClick, ...props }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const imageRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const { isCardInInvoice } = useInvoiceContext();
  
  // Load card image with caching
  useEffect(() => {
    if (!card || !card.id) return;
    
    const loadImage = async () => {
      // First check if we already have the image URL set in state
      if (imageUrl && !isImageLoading) {
        return;
      }
      
      // Check if image is already cached
      const cachedUrl = ImagePersistenceManager.getCachedImage(card.id);
      
      if (cachedUrl) {
        // Use cached image
        setImageUrl(cachedUrl);
        setIsImageLoading(false);
        hasLoadedRef.current = true;
        return;
      }
      
      // No cached image, load from database
      setIsImageLoading(true);
      
      try {
        // Get image from database
        const cardImage = await db.getCardImage(card.id);
        
        if (cardImage) {
          // Create object URL and cache it
          const objectUrl = URL.createObjectURL(cardImage);
          setImageUrl(objectUrl);
          
          // Store in cache
          ImagePersistenceManager.cacheImage(card.id, objectUrl);
          
          // Add cleanup for the blob URL
          window.addEventListener('card-images-cleanup', (event) => {
            if (event.detail && event.detail.cardIds.includes(card.id)) {
              URL.revokeObjectURL(objectUrl);
            }
          });
        } else if (card.imageUrl) {
          // Use remote URL if available
          setImageUrl(card.imageUrl);
          ImagePersistenceManager.cacheImage(card.id, card.imageUrl);
        }
      } catch (error) {
        logger.error(`Error loading image for card ${card.id}:`, error);
        // Fallback to card.imageUrl if available
        if (card.imageUrl) {
          setImageUrl(card.imageUrl);
        }
      } finally {
        setIsImageLoading(false);
        hasLoadedRef.current = true;
      }
    };
    
    loadImage();
    
    // Cleanup function
    return () => {
      // The blob URLs will be cleaned up on card-images-cleanup event
    };
  }, [card?.id, imageUrl, isImageLoading]);
  
  const handleCardClick = (e) => {
    if (onCardClick) {
      onCardClick(e, card);
    }
  };
  
  return (
    <div className="card-container" onClick={handleCardClick} {...props}>
      <div className="card-image-container">
        {isImageLoading ? (
          <div className="card-image-loading">
            <span className="loading-spinner"></span>
          </div>
        ) : imageUrl ? (
          <img 
            ref={imageRef}
            src={imageUrl} 
            alt={card.pokemonName || 'Card'} 
            className="card-image"
            loading="lazy"
          />
        ) : (
          <div className="card-image-placeholder">
            <span className="material-icons">image_not_supported</span>
          </div>
        )}
      </div>
      
      <div className="card-details">
        <div className="flex justify-between items-start">
          <h3 className="card-title">{(card.card || card.cardName || card.pokemonName || card.name || card.player || 'Unnamed Card').toUpperCase()}</h3>
          {isCardInInvoice && card.id && isCardInInvoice(card.id) && (
            <span 
              className="material-icons text-sm text-blue-500 dark:text-blue-400 ml-1" 
              title="This card is attached to a purchase invoice"
            >
              receipt
            </span>
          )}
        </div>
        <div className="card-metadata">
          <p className="card-set">{card.setName || 'Unknown Set'}</p>
          <p className="card-number">{card.cardNumber || 'No #'}</p>
        </div>
        <div className="card-values">
          <p className="card-value">${card.currentValueAUD || 0}</p>
        </div>
      </div>
    </div>
  );
});

export default OptimizedCard;
