import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import FormField from '../../design-system/molecules/FormField';
import Modal from '../../design-system/molecules/Modal';
import Icon from '../../design-system/atoms/Icon';
import ModalButton from '../../design-system/atoms/ModalButton';
import LoggingService from '../../services/LoggingService';

/**
 * Modal component for creating or editing a purchase invoice
 */
const CreateInvoiceModal = ({
  isOpen,
  onClose,
  onSave,
  editingInvoice = null,
  preSelectedCards = [],
}) => {
  const [selectedCards, setSelectedCards] = useState(preSelectedCards || []);
  const [seller, setSeller] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [enlargedImage, setEnlargedImage] = useState(null);
  
  // Use refs to track initialization state and prevent infinite loops
  const hasInitialized = useRef(false);
  const lastEditingInvoiceId = useRef(null);
  const lastPreSelectedCardsLength = useRef(0);

  // Memoize the key values to prevent infinite loops
  const editingInvoiceKey = useMemo(() => {
    if (!editingInvoice) return null;
    return JSON.stringify({
      id: editingInvoice.id,
      cards: editingInvoice.cards,
      seller: editingInvoice.seller,
      date: editingInvoice.date,
      invoiceNumber: editingInvoice.invoiceNumber,
      notes: editingInvoice.notes
    });
  }, [editingInvoice]);
  const preSelectedCardsKey = useMemo(() => {
    if (!preSelectedCards || preSelectedCards.length === 0) return null;
    return JSON.stringify({
      length: preSelectedCards.length,
      firstDate: preSelectedCards[0]?.datePurchased
    });
  }, [preSelectedCards]);

  // Initialize form with editing invoice data or pre-selected cards
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal is closed
      setSelectedCards([]);
      setSeller('');
      setDate(new Date().toISOString().split('T')[0]);
      setInvoiceNumber('');
      setNotes('');
      setEnlargedImage(null);
      hasInitialized.current = false;
      lastEditingInvoiceId.current = null;
      lastPreSelectedCardsLength.current = 0;
      return;
    }

    // Prevent re-initialization if we've already initialized with the same data
    const currentEditingInvoiceKey = editingInvoiceKey;
    const currentPreSelectedCardsKey = preSelectedCardsKey;
    
    if (hasInitialized.current && 
        lastEditingInvoiceId.current === currentEditingInvoiceKey &&
        lastPreSelectedCardsLength.current === currentPreSelectedCardsKey) {
      return;
    }

    if (editingInvoice) {
      // We're in edit mode - populate form with invoice data
      setSelectedCards(editingInvoice.cards || []);
      setSeller(editingInvoice.seller || '');
      setDate(
        editingInvoice.date || new Date().toISOString().split('T')[0]
      );
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setNotes(editingInvoice.notes || '');
      
      lastEditingInvoiceId.current = currentEditingInvoiceKey;
      hasInitialized.current = true;
    } else if (preSelectedCards && preSelectedCards.length > 0) {
      // Using pre-selected cards for a new invoice
      setSelectedCards(preSelectedCards);

      // Pre-populate the purchase date from the first card's datePurchased field
      if (preSelectedCards[0]?.datePurchased) {
        setDate(preSelectedCards[0].datePurchased);
      }

      // Generate a default invoice number based on date
      const today = new Date();
      setInvoiceNumber(
        `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(
          Math.random() * 1000
        )
          .toString()
          .padStart(3, '0')}`
      );

      // Reset other fields for new invoice
      setSeller('');
      setNotes('');
      
      lastPreSelectedCardsLength.current = currentPreSelectedCardsKey;
      hasInitialized.current = true;
    }
  }, [isOpen, editingInvoiceKey, preSelectedCardsKey, editingInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate total investment amount
  const totalInvestment = selectedCards.reduce((sum, card) => {
    return (
      sum +
      (parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0)
    );
  }, 0);

  // Handle form submission
  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();

      if (selectedCards.length === 0) {
        toast.error('Please select at least one card');
        return;
      }

      if (!seller.trim()) {
        toast.error('Please enter a seller name');
        return;
      }

      try {
        // Prevent default form submission behavior that might cause navigation
        e.stopPropagation();

        // Show loading toast
        const loadingToast = toast.loading(
          editingInvoice ? 'Updating invoice...' : 'Creating invoice...'
        );

        // Prepare the card data - ensure all values are defined
        const cardData = selectedCards.map(card => {
          // Create a clean card object with no undefined values
          const cleanCard = {
            id:
              card.id ||
              `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: card.name || '',
            player: card.player || '',
            set: card.set || card.setName || '',
            year: card.year || '',
            cardNumber: card.cardNumber || '',
            grade: card.grade || '',
            gradeVendor: card.gradeVendor || '',
            slabSerial: card.slabSerial || '',
            // Use originalInvestmentAmount as primary source with investmentAUD as fallback
            originalInvestmentAmount:
              parseFloat(card.originalInvestmentAmount || card.investmentAUD) ||
              0,
            // Include image URL if available
            imageUrl: card.imageUrl || card.image || '',
            // Include all other properties that might be needed
            ...card,
          };

          return cleanCard;
        });

        const invoiceData = {
          id:
            editingInvoice?.id ||
            `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          invoiceNumber: invoiceNumber.trim(),
          seller: seller.trim(),
          date,
          notes: notes.trim(),
          cards: cardData,
          totalAmount: totalInvestment,
          cardCount: cardData.length,
          createdAt:
            editingInvoice?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Call the onSave callback
        await onSave(invoiceData);

        // Success feedback
        toast.dismiss(loadingToast);
        toast.success(
          editingInvoice
            ? 'Invoice updated successfully!'
            : 'Invoice created successfully!'
        );

        // Close modal
        setEnlargedImage(null);
        onClose();
      } catch (error) {
        LoggingService.error('Error saving invoice:', error);
        toast.error('Failed to save invoice. Please try again.');
      }
    },
    [
      selectedCards,
      seller,
      invoiceNumber,
      date,
      notes,
      totalInvestment,
      editingInvoice,
      onSave,
      onClose,
    ]
  );

  // Handle modal close
  const handleClose = useCallback(() => {
    setEnlargedImage(null);
    onClose();
  }, [onClose]);

  // Handle image click to enlarge
  const handleImageClick = useCallback((imageUrl, cardName) => {
    setEnlargedImage({ url: imageUrl, name: cardName });
  }, []);

  // Handle enlarged image close
  const handleEnlargedImageClose = useCallback(() => {
    setEnlargedImage(null);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={editingInvoice ? 'Edit Invoice Details' : 'Invoice Details'}
        position="right"
        size="modal-width-70"
        closeOnClickOutside={true}
        footer={
          <div className="flex w-full items-center justify-between">
            <ModalButton variant="secondary" onClick={handleClose}>
              Cancel
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={handleSubmit}
              leftIcon={<Icon name="receipt" />}
            >
              {editingInvoice ? 'Save Changes' : 'Create Invoice'}
            </ModalButton>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Invoice Details */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <FormField
                label="Invoice Number"
                name="invoiceNumber"
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                required={true}
              />

              <FormField
                label="Seller"
                name="seller"
                type="text"
                value={seller}
                onChange={e => setSeller(e.target.value)}
                placeholder="Enter seller name"
                required={true}
              />

              <FormField
                label="Date"
                name="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required={true}
              />

              <FormField
                label="Notes"
                name="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes about this purchase"
                multiline={true}
                rows={3}
              />

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Selected Cards
                </h3>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-black">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Card
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Set / Year
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-[#0F0F0F]">
                      {selectedCards.map(card => (
                        <tr key={card.id}>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {/* Card Image - Desktop Only */}
                              <div className="hidden shrink-0 md:block">
                                {card.imageUrl || card.image ? (
                                  <img
                                    src={card.imageUrl || card.image}
                                    alt={card.name || card.player || 'Card'}
                                    className="h-12 w-8 cursor-pointer rounded object-cover transition-opacity hover:opacity-80"
                                    onClick={() =>
                                      handleImageClick(
                                        card.imageUrl || card.image,
                                        card.name || card.player
                                      )
                                    }
                                    onError={e => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-12 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                                    <span className="material-icons text-sm text-gray-400">
                                      image
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Card Details */}
                              <div className="min-w-0 flex-1">
                                <div
                                  className="truncate text-sm font-medium text-gray-900 dark:text-white"
                                  title={
                                    card.name || card.player || 'Unnamed Card'
                                  }
                                >
                                  {card.name || card.player || 'Unnamed Card'}
                                </div>
                                <div
                                  className="truncate text-sm text-gray-500 dark:text-gray-400"
                                  title={`#${card.cardNumber}`}
                                >
                                  #{card.cardNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="truncate text-sm text-gray-900 dark:text-white"
                              title={card.set || card.setName}
                            >
                              {card.set || card.setName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {card.year}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            $
                            {parseFloat(
                              card.originalInvestmentAmount ||
                                card.investmentAUD ||
                                0
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-black">
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    Total Amount:
                  </div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    ${totalInvestment.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div
          className="bg-black/50 fixed inset-0 z-[50002] flex items-center justify-center p-8 backdrop-blur-sm"
          onClick={handleEnlargedImageClose}
        >
          <div className="relative max-h-[70vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
            {/* Close Button */}
            <button
              onClick={handleEnlargedImageClose}
              className="bg-black/50 hover:bg-black/70 absolute right-3 top-3 z-10 rounded-full p-1.5 text-white transition-all"
            >
              <span className="material-icons text-lg">close</span>
            </button>

            {/* Image Container */}
            <div className="p-4">
              <div className="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.name}
                  className="h-auto max-h-[50vh] w-full object-contain"
                  onClick={e => e.stopPropagation()}
                />
              </div>

              {/* Card Name */}
              {enlargedImage.name && (
                <div className="mt-3 text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {enlargedImage.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default CreateInvoiceModal;
