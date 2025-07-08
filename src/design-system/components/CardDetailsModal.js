import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import CardDetailsForm from './CardDetailsForm';
import SaleModal from '../../components/SaleModal';
import PriceChartingModal from '../../components/PriceChartingModal';
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import { toast } from 'react-hot-toast';

import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useSubscription } from '../../hooks/useSubscription';
import LoggingService from '../../services/LoggingService';

// Helper function to format date
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Check if the date is valid
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

/**
 * CardDetailsModal Component
 *
 * A modal for displaying and editing card details
 */
const CardDetailsModal = ({
  isOpen,
  onClose,
  card = null,
  onSave,
  onDelete,
  onMarkAsSold,
  onChange,
  image,
  imageLoadingState = 'idle',
  onImageChange,
  onImageRetry,
  className = '',
  additionalHeaderContent,
  additionalValueContent,
  additionalSerialContent,
  collections = [], // Default to empty array
  initialCollectionName = null, // Default to null
  isPsaLoading = false,
}) => {
  const [cardImage, setCardImage] = useState(null); // Start with null to implement lazy loading
  const [localImageLoadingState, setLocalImageLoadingState] = useState('idle');
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [animClass, setAnimClass] = useState('fade-in');
  const [contentLoaded, setContentLoaded] = useState(false); // Track if content has been loaded
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPsaSearching, setIsPsaSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPriceChartingSearching, setIsPriceChartingSearching] = useState(false);
  const [priceChartingModalOpen, setPriceChartingModalOpen] = useState(false);

  // Get currency formatting functions
  const { formatPreferredCurrency, formatAmountForDisplay } =
    useUserPreferences();

  // Get subscription status
  const { hasFeature } = useSubscription();

  // PriceCharting functionality removed

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Price condition type function removed

  // Calculate profit safely
  const getProfit = () => {
    if (!card) return 0;

    // Use original amounts and currencies for more accurate profit calculation
    const originalInvestment =
      card.originalInvestmentAmount !== undefined
        ? parseFloat(card.originalInvestmentAmount)
        : 0;
    const originalInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';

    const originalCurrentValue =
      card.originalCurrentValueAmount !== undefined
        ? parseFloat(card.originalCurrentValueAmount)
        : 0;
    const originalCurrentValueCurrency =
      card.originalCurrentValueCurrency || 'AUD';

    // Convert both to preferred currency using the UserPreferences context
    const investmentInPreferredCurrency =
      originalInvestment !== 0
        ? parseFloat(
            formatAmountForDisplay(
              originalInvestment,
              originalInvestmentCurrency
            ).replace(/[^0-9.-]+/g, '')
          )
        : 0;

    const currentValueInPreferredCurrency =
      originalCurrentValue !== 0
        ? parseFloat(
            formatAmountForDisplay(
              originalCurrentValue,
              originalCurrentValueCurrency
            ).replace(/[^0-9.-]+/g, '')
          )
        : 0;

    return currentValueInPreferredCurrency - investmentInPreferredCurrency;
  };

  // Handle PSA search
  const handlePsaSearch = async serialNumber => {
    // Check subscription access first
    if (!hasFeature('PSA_SEARCH')) {
      toast.error(
        'PSA search is available with Premium. Upgrade to access this feature!'
      );
      return;
    }

    if (!serialNumber) {
      toast.error('Please enter a serial number to search');
      return;
    }

    setIsPsaSearching(true);
    setSaveMessage('Searching for PSA certificate...');

    try {
      const psaData = await searchByCertNumber(serialNumber);

      // Handle error response
      if (psaData?.error) {
        LoggingService.error('PSA search error:', psaData.error);
        toast.error(psaData.message || 'Failed to find PSA data');
        setSaveMessage(
          'Failed to find PSA data. Please check the number and try again.'
        );
        return;
      }

      // Handle not found error
      if (!psaData) {
        toast.error('No PSA data found for this serial number');
        setSaveMessage('No PSA data found for this serial number');
        return;
      }

      const parsedData = parsePSACardData(psaData);
      if (!parsedData) {
        toast.error('Could not parse PSA data');
        setSaveMessage('Could not parse PSA data');
        return;
      }

      // Update card data with PSA information
      const updatedCard = {
        ...card,
        ...parsedData,
        slabSerial: serialNumber,
        condition: `PSA ${parsedData.grade}`,
        gradeCompany: 'PSA',
        psaUrl: `https://www.psacard.com/cert/${serialNumber}`,
        player: parsedData.player || card.player,
        cardName: parsedData.cardName || card.cardName,
        population: parsedData.population || card.population,
        category: parsedData.category || card.category,
        set: parsedData.set || card.set,
        year: parsedData.year || card.year,
      };

      // Call onChange with the updated card data
      onChange(updatedCard);
      toast.success('PSA data successfully loaded');
      setSaveMessage('PSA data successfully loaded');
    } catch (error) {
      LoggingService.error('Error searching PSA:', error);
      toast.error('Error searching PSA database');
      setSaveMessage('Error searching PSA database');
    } finally {
      setIsPsaSearching(false);
    }
  };

  // Handle Price Charting search
  const handlePriceChartingSearch = async (cardData) => {
    if (!cardData) {
      toast.error('No card data available for price search');
      return;
    }

    setIsPriceChartingSearching(true);
    setSaveMessage('Searching Price Charting...');

    try {
      // Open the Price Charting modal
      setPriceChartingModalOpen(true);
      toast.success('Opening Price Charting search...');
      setSaveMessage('Opening Price Charting search...');
    } catch (error) {
      LoggingService.error('Error opening Price Charting search:', error);
      toast.error('Error opening Price Charting search');
      setSaveMessage('Error opening Price Charting search');
    } finally {
      setIsPriceChartingSearching(false);
    }
  };

  // Handle applying price from Price Charting
  const handleApplyPriceChartingPrice = (priceData) => {
    if (!priceData || !priceData.price) {
      toast.error('No price data to apply');
      return;
    }

    // Update the card with the new price data
    const updatedCard = {
      ...card,
      originalCurrentValueAmount: priceData.priceInUSD,
      originalCurrentValueCurrency: 'USD',
      priceChartingData: priceData,
      priceChartingLastUpdated: new Date().toISOString(),
    };

    // Call onChange with the updated card data
    onChange(updatedCard);
    toast.success('Price Charting data applied successfully!');
    setSaveMessage('Price Charting data applied successfully!');
  };

  // Update local state when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      // On mobile, only load content when the modal opens
      if (isMobile) {
        // Set a short delay to allow the modal animation to complete
        const timer = setTimeout(() => {
          if (image) {
            setCardImage(image);
          }
          setContentLoaded(true); // Ensure content is marked as loaded
        }, 150); // 150ms delay
        return () => clearTimeout(timer);
      } else {
        // Desktop: Load content immediately
        if (image) {
          setCardImage(image);
        }
        setContentLoaded(true);
      }

      // --- REVISED ERROR CLEARING LOGIC ---
      setErrors({});
      setSaveMessage('');
      // --- END REVISED ERROR CLEARING LOGIC ---
    } else {
      // Reset animation class and content loaded state when modal closes
      setAnimClass('fade-out');
      setContentLoaded(false); // Reset content loaded state
    }
    // Dependencies that should trigger this effect. 'image' and 'isMobile' are for content loading.
    // 'card', 'card.collectionId', 'card.set', 'card.card' are critical for resetting form/error state.
  }, [
    isOpen,
    card,
    image,
    isMobile,
    card?.collectionId,
    card?.set,
    card?.card,
  ]);

  // Handle image changes (passed down to form)
  const handleImageChange = file => {
    if (onImageChange) {
      onImageChange(file);
    }
  };

  // Handle mark as sold action
  const handleMarkAsSold = () => {
    if (onMarkAsSold) {
      setIsConfirmingSold(true);
    }
  };

  // SaleModal integration for single card
  const handleSaleConfirm = saleData => {
    if (onMarkAsSold) {
      onMarkAsSold({ ...card, ...saleData });
    }
    setIsConfirmingSold(false);
  };

  const handleSaleModalClose = () => {
    setIsConfirmingSold(false);
  };

  // Handle save action
  const handleSave = async e => {
    // If this was triggered by a form submit, prevent default
    if (e?.preventDefault) {
      e.preventDefault();
    }

    // Trim whitespace from string fields
    const trimmedCard = { ...card };
    Object.keys(trimmedCard).forEach(key => {
      if (typeof trimmedCard[key] === 'string') {
        trimmedCard[key] = trimmedCard[key].trim();
      }
    });

    // Validate required fields
    const newErrors = {};
    const missingFields = [];

    // Only require cardName, investmentAUD, and datePurchased
    if (!trimmedCard.cardName) {
      newErrors.cardName = 'Card name is required';
      missingFields.push('Card Name');
    }

    if (!trimmedCard.investmentAUD) {
      newErrors.investmentAUD = 'Investment amount is required';
      missingFields.push('Investment Amount');
    } else if (isNaN(parseFloat(trimmedCard.investmentAUD))) {
      newErrors.investmentAUD = 'Must be a valid number';
      missingFields.push('Investment Amount (invalid format)');
    }

    if (!trimmedCard.datePurchased) {
      newErrors.datePurchased = 'Purchase date is required';
      missingFields.push('Purchase Date');
    }

    // Optional field validations - only validate format if value is provided
    if (
      trimmedCard.currentValueAUD &&
      isNaN(parseFloat(trimmedCard.currentValueAUD))
    ) {
      newErrors.currentValueAUD = 'Must be a valid number';
      missingFields.push('Current Value (invalid format)');
    }

    // Only show error message if there are actual errors
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Create a more specific error message
      const errorMessage =
        missingFields.length > 0
          ? `Missing or invalid: ${missingFields.join(', ')}`
          : 'Please correct the highlighted field errors below.';
      setSaveMessage(`Error: ${errorMessage}`);
      return;
    } else {
      setSaveMessage('');
    }

    // Clear errors and save
    setErrors({});

    if (onSave) {
      // Set saving state to true
      setIsSaving(true);

      try {
        // Get original amounts and currencies
        const originalInvestment =
          card.originalInvestmentAmount !== undefined
            ? parseFloat(card.originalInvestmentAmount)
            : 0;
        const originalInvestmentCurrency =
          card.originalInvestmentCurrency || 'AUD';
        const originalCurrentValue =
          card.originalCurrentValueAmount !== undefined
            ? parseFloat(card.originalCurrentValueAmount)
            : 0;
        const originalCurrentValueCurrency =
          card.originalCurrentValueCurrency || 'AUD';

        // Format the card data before saving
        const formattedCard = {
          ...trimmedCard,
          // Format date if it exists
          datePurchased: trimmedCard.datePurchased
            ? formatDate(trimmedCard.datePurchased)
            : '',
          // Convert numeric fields to numbers
          investmentAUD: trimmedCard.investmentAUD
            ? parseFloat(trimmedCard.investmentAUD)
            : 0,
          currentValueAUD: trimmedCard.currentValueAUD
            ? parseFloat(trimmedCard.currentValueAUD)
            : 0,
          quantity: trimmedCard.quantity
            ? parseInt(trimmedCard.quantity, 10)
            : 1,
          // Ensure optional fields are never undefined
          card: trimmedCard.card || trimmedCard.cardName || '', // Make sure card field has the card name
          set: trimmedCard.set || '',
          player: trimmedCard.player || '',
          category: trimmedCard.category || '',
          // Add currency information
          originalInvestmentAmount: originalInvestment,
          originalInvestmentCurrency: originalInvestmentCurrency,
          originalCurrentValueAmount: originalCurrentValue,
          originalCurrentValueCurrency: originalCurrentValueCurrency,
        };

        try {
          // Call onSave and wait for it to complete
          await onSave(formattedCard);

          // Clear any unsaved changes state
          setErrors({});
          setSaveMessage('');

          // Reset all form elements to prevent unsaved changes dialog
          const forms = document.querySelectorAll('form');
          forms.forEach(form => form.reset());

          // Close the modal with success flag
          onClose(true);
        } catch (saveError) {
          LoggingService.error('Error in onSave:', saveError);
          // Check if it's a connection error
          if (
            saveError.code === 'failed-precondition' ||
            saveError.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
            saveError.message?.includes('network error')
          ) {
            setSaveMessage(
              'Connection error. Please check your internet connection and try again.'
            );
          } else {
            setSaveMessage('Failed to save changes. Please try again.');
          }
          setErrors({});
          return;
        }
      } catch (error) {
        LoggingService.error('Error saving card:', error);
        toast.error(`Failed to save card: ${error.message}`);
      } finally {
        // Reset saving state
        setIsSaving(false);
      }
    }
  };

  // Modal footer buttons (like AddCardModal pattern)
  const modalFooter = (
    <div className="flex space-x-2">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isPsaLoading || isSaving}
      >
        Cancel
      </Button>
      {onMarkAsSold && (
        <Button
          variant="secondary"
          onClick={handleMarkAsSold}
          disabled={isPsaLoading || isSaving}
        >
          Mark as Sold
        </Button>
      )}
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={isPsaLoading || isSaving}
      >
        {isSaving ? (
          <>
            <svg
              className="-ml-1 mr-3 size-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Saving...
          </>
        ) : (
          'Save'
        )}
      </Button>
    </div>
  );

  // Create custom title with profit/loss display
  const titleWithProfit = (
    <div className="flex w-full items-center justify-between">
      <span className="text-xl font-medium">Card Details</span>
      <span
        className={`text-lg font-medium ${getProfit() >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}
        data-component-name="CardDetailsModal"
      >
        {getProfit() >= 0 ? '+' : '-'}{formatPreferredCurrency(Math.abs(getProfit()))}
      </span>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={titleWithProfit}
        position="right"
        closeOnClickOutside={true}
        size="2xl"
        className={`${className} ${animClass} card-details-modal`}
        footer={modalFooter}
      >
        <div className="space-y-6">
          {/* Main Content */}
          {contentLoaded && (
            <div className={`${animClass} relative`}>
              {/* PSA Search Loading Overlay */}
              {(isPsaSearching || isPsaLoading) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white backdrop-blur-sm dark:bg-black">
                  <div className="text-center">
                    <div className="mb-2 inline-block size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Looking up PSA information...
                    </p>
                  </div>
                </div>
              )}

              <CardDetailsForm
                card={card}
                cardImage={
                  localImageLoadingState === 'loading'
                    ? null
                    : cardImage || image
                }
                imageLoadingState={localImageLoadingState}
                onChange={onChange}
                onImageChange={handleImageChange}
                onImageRetry={onImageRetry}
                onImageClick={() => setShowEnlargedImage(true)}
                errors={errors}
                additionalValueContent={additionalValueContent}
                additionalSerialContent={additionalSerialContent}
                collections={collections.filter(
                  collection =>
                    collection.toLowerCase() !== 'sold' &&
                    !collection.toLowerCase().includes('sold')
                )}
                initialCollectionName={initialCollectionName}
                onPsaSearch={handlePsaSearch}
                isPsaSearching={isPsaSearching}
                onPriceChartingSearch={handlePriceChartingSearch}
                isPriceChartingSearching={isPriceChartingSearching}
              />
            </div>
          )}

          {/* Price history section removed */}

          {/* Loading indicator when content is not yet loaded */}
          {!contentLoaded && (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Loading card details...
              </span>
            </div>
          )}

          {/* Status message */}
          {saveMessage && (
            <div
              className={`mt-4 rounded-lg px-4 py-2 text-sm transition-all ${
                saveMessage.startsWith('Error') ||
                saveMessage.startsWith('Please fix')
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : saveMessage.startsWith('No changes to save')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </Modal>

      {/* Enlarged Image Modal */}
      {showEnlargedImage && cardImage && (
        <div
          className="bg-black/90 fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center"
          onClick={e => {
            e.stopPropagation();
            setShowEnlargedImage(false);
          }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="relative flex max-w-[90vw] items-center justify-center"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
            }}
          >
            <img
              src={cardImage}
              alt="Card preview (enlarged)"
              className="size-auto rounded-lg object-contain"
              style={{
                maxHeight: '90vh',
                maxWidth: '90vw',
              }}
            />
            <button
              className="bg-black/50 hover:bg-black/70 absolute right-4 top-4 rounded-full p-2 text-white transition-colors"
              onClick={e => {
                e.stopPropagation();
                setShowEnlargedImage(false);
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      {/* SaleModal for single card sale */}
      {isConfirmingSold && (
        <SaleModal
          isOpen={isConfirmingSold}
          onClose={handleSaleModalClose}
          selectedCards={[card]}
          onConfirm={handleSaleConfirm}
        />
      )}

      {/* Price Charting Modal */}
      <PriceChartingModal
        isOpen={priceChartingModalOpen}
        onClose={() => setPriceChartingModalOpen(false)}
        currentCardData={card}
        onApplyPrice={handleApplyPriceChartingPrice}
      />
    </>
  );
};

CardDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  card: PropTypes.object,
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  onMarkAsSold: PropTypes.func,
  onChange: PropTypes.func,
  image: PropTypes.string,
  imageLoadingState: PropTypes.string,
  onImageChange: PropTypes.func,
  onImageRetry: PropTypes.func,
  className: PropTypes.string,
  additionalHeaderContent: PropTypes.node,
  additionalValueContent: PropTypes.node,
  additionalSerialContent: PropTypes.node,
  collections: PropTypes.arrayOf(PropTypes.string), // Expect an array of strings now
  initialCollectionName: PropTypes.string, // Add prop type
  isPsaLoading: PropTypes.bool,
};

export default CardDetailsModal;
