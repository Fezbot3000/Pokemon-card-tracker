import React, { useState } from 'react';
import { Button, Icon } from '../../design-system';
import { useAuth } from '../../design-system';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';

/**
 * Buy Now button for instant marketplace purchases
 * Integrates with Stripe Connect for payment processing
 */
function BuyNowButton({ 
  listing, 
  onPurchaseStart, 
  className = '',
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false 
}) {
  const { user } = useAuth();
  const { formatAmountForDisplay } = useUserPreferences();
  const [loading, setLoading] = useState(false);

  // Log for debugging price display issue
  if (listing && (!listing.listingPrice || listing.listingPrice === 0)) {
    logger.warn('BuyNowButton: Listing missing price data:', {
      listingId: listing.id,
      listingPrice: listing.listingPrice,
      price: listing.price,
      currency: listing.currency,
      fullListing: listing
    });
  }

  // Don't show if no user, no listing, or user owns the listing
  if (!user || !listing || user.uid === listing.userId) {
    return null;
  }

  // Don't show if listing is not available
  if (listing.status !== 'available') {
    return null;
  }

  const handleBuyNow = async () => {
    if (loading || disabled) return;

    try {
      setLoading(true);
      
      logger.info('Buy Now clicked:', {
        listingId: listing.id,
        sellerId: listing.userId,
        amount: listing.price,
        currency: listing.currency,
        buyerId: user.uid
      });

      // Call the parent handler to start purchase flow
      if (onPurchaseStart) {
        await onPurchaseStart(listing);
      }
      
    } catch (error) {
      logger.error('Error starting purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuyNow}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      leftIcon={loading ? 
        <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" /> :
        <Icon name="shopping_cart" />
      }
    >
      {loading ? 'Processing...' : `Buy Now ${formatAmountForDisplay(listing.listingPrice || listing.price, listing.currency || 'AUD')}`}
    </Button>
  );
}

export default BuyNowButton;
