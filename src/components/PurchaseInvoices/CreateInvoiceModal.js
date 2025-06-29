import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import db from '../../services/firestore/dbAdapter';
import FormField from '../../design-system/molecules/FormField';
import Modal from '../../design-system/molecules/Modal';
import Button from '../../design-system/atoms/Button';
import Icon from '../../design-system/atoms/Icon';

/**
 * Modal component for creating or editing a purchase invoice
 */
const CreateInvoiceModal = ({ isOpen, onClose, onSave, editingInvoice = null, preSelectedCards = [] }) => {
  const [selectedCards, setSelectedCards] = useState(preSelectedCards || []);
  const [seller, setSeller] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [enlargedImage, setEnlargedImage] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
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
      return;
    }
    
    if (editingInvoice) {
      // We're in edit mode - populate form with invoice data
      console.log('Initializing form with editing invoice data:', editingInvoice);
      setSelectedCards(editingInvoice.cards || []);
      setSeller(editingInvoice.seller || '');
      setDate(editingInvoice.date || new Date().toISOString().split('T')[0]);
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setNotes(editingInvoice.notes || '');
    } else if (preSelectedCards && preSelectedCards.length > 0) {
      // Using pre-selected cards for a new invoice
      console.log('Initializing form with pre-selected cards');
      setSelectedCards(preSelectedCards);
      
      // Pre-populate the purchase date from the first card's datePurchased field
      if (preSelectedCards[0].datePurchased) {
        setDate(preSelectedCards[0].datePurchased);
      }
      
      // Generate a default invoice number based on date
      const today = new Date();
      setInvoiceNumber(`INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
      
      // Reset other fields for new invoice
      setSeller('');
      setNotes('');
    }
  }, [isOpen, editingInvoice, preSelectedCards]);
  
  // Calculate total investment amount
  const totalInvestment = selectedCards.reduce((sum, card) => {
    return sum + (parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0);
  }, 0);
  
  // Handle form submission
  const handleSubmit = async (e) => {
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
      const loadingToast = toast.loading(editingInvoice ? 'Updating invoice...' : 'Creating invoice...');
      
      // Prepare the card data - ensure all values are defined
      const cardData = selectedCards.map(card => {
        // Create a clean card object with no undefined values
        const cleanCard = {
          id: card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: card.name || '',
          player: card.player || '',
          set: card.set || card.setName || '',
          year: card.year || '',
          cardNumber: card.cardNumber || '',
          grade: card.grade || '',
          gradeVendor: card.gradeVendor || '',
          slabSerial: card.slabSerial || '',
          // Use originalInvestmentAmount as primary source with investmentAUD as fallback
          originalInvestmentAmount: parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0,
          // Include image URL if available
          imageUrl: card.imageUrl || card.image || '',
          // Include all other properties that might be needed
          ...card
        };
        
        return cleanCard;
      });
      
      const invoiceData = {
        id: editingInvoice?.id || `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: invoiceNumber.trim(),
        seller: seller.trim(),
        date,
        notes: notes.trim(),
        cards: cardData,
        totalAmount: totalInvestment,
        cardCount: cardData.length,
        createdAt: editingInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Call the onSave callback
      await onSave(invoiceData);
      
      // Success feedback
      toast.dismiss(loadingToast);
      toast.success(editingInvoice ? 'Invoice updated successfully!' : 'Invoice created successfully!');
      
      // Close modal
      handleClose();
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice. Please try again.');
    }
  };

  // Handle modal close
  const handleClose = () => {
    setEnlargedImage(null);
    onClose();
  };
  
  // Handle image click to enlarge
  const handleImageClick = (imageUrl, cardName) => {
    setEnlargedImage({ url: imageUrl, name: cardName });
  };
  
  // Handle enlarged image close
  const handleEnlargedImageClose = () => {
    setEnlargedImage(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={editingInvoice ? "Edit Invoice Details" : "Invoice Details"}
        position="right"
        size="2xl"
        closeOnClickOutside={false}
        footer={
          <div className="flex justify-between w-full">
            <Button 
              variant="secondary" 
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              leftIcon={<Icon name="receipt" />}
            >
              {editingInvoice ? 'Save Changes' : 'Create Invoice'}
            </Button>
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
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required={true}
              />
              
              <FormField
                label="Seller"
                name="seller"
                type="text"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder="Enter seller name"
                required={true}
              />
              
              <FormField
                label="Date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required={true}
              />
              
              <FormField
                label="Notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this purchase"
                multiline={true}
                rows={3}
              />
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Selected Cards
                </h3>
                <div className="overflow-y-auto max-h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-black">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Card
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Set / Year
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#0F0F0F] divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedCards.map((card) => (
                        <tr key={card.id}>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {/* Card Image - Desktop Only */}
                              <div className="hidden md:block flex-shrink-0">
                                {card.imageUrl || card.image ? (
                                  <img
                                    src={card.imageUrl || card.image}
                                    alt={card.name || card.player || 'Card'}
                                    className="h-12 w-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleImageClick(card.imageUrl || card.image, card.name || card.player)}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <span className="material-icons text-gray-400 text-sm">image</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Card Details */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={card.name || card.player || 'Unnamed Card'}>
                                  {card.name || card.player || 'Unnamed Card'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate" title={`#${card.cardNumber}`}>
                                  #{card.cardNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white truncate" title={card.set || card.setName}>
                              {card.set || card.setName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {card.year}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            ${parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-black rounded-lg">
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
          className="fixed inset-0 z-[9999] bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={handleEnlargedImageClose}
        >
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden">
            {/* Close Button */}
            <button
              onClick={handleEnlargedImageClose}
              className="absolute top-3 right-3 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1.5 text-white transition-all"
            >
              <span className="material-icons text-lg">close</span>
            </button>
            
            {/* Image Container */}
            <div className="p-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.name}
                  className="w-full h-auto object-contain max-h-[50vh]"
                  onClick={(e) => e.stopPropagation()}
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
    </>
  );
};

export default CreateInvoiceModal;
