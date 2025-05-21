import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import db from '../../services/db';
import FormField from '../../design-system/molecules/FormField';

/**
 * Modal component for creating or editing a purchase invoice
 */
const CreateInvoiceModal = ({ isOpen, onClose, onSave, editingInvoice = null, preSelectedCards = [] }) => {
  const [selectedCards, setSelectedCards] = useState(preSelectedCards || []);
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(preSelectedCards && preSelectedCards.length > 0 ? 2 : 1); // 1: Select Cards, 2: Invoice Details
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('All Collections');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Initialize form with editing invoice data or pre-selected cards
  useEffect(() => {
    // Only initialize the form when the modal is first opened or when switching between edit/create modes
    if (!isOpen) return;
    
    // Create a flag to track if this is the initial load
    const isInitialLoad = !seller && !invoiceNumber;
    
    if (editingInvoice && isInitialLoad) {
      // We're in edit mode - populate form with invoice data
      console.log('Initializing form with editing invoice data:', editingInvoice);
      setSelectedCards(editingInvoice.cards || []);
      setSeller(editingInvoice.seller || '');
      setDate(editingInvoice.date || new Date().toISOString().split('T')[0]);
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setNotes(editingInvoice.notes || '');
      setStep(2); // Skip to invoice details in edit mode
    } else if (preSelectedCards && preSelectedCards.length > 0 && isInitialLoad) {
      // Using pre-selected cards for a new invoice
      console.log('Initializing form with pre-selected cards');
      setSelectedCards(preSelectedCards);
      
      // Pre-populate the purchase date from the first card's datePurchased field
      if (preSelectedCards[0].datePurchased) {
        setDate(preSelectedCards[0].datePurchased);
      }
      
      setStep(2); // Skip to invoice details
    }
  }, [isOpen, editingInvoice, preSelectedCards]);

  // Load collections and cards
  useEffect(() => {
    const loadCollections = async () => {
      try {
        setLoading(true);
        const collectionsData = await db.getCollections();
        setCollections(collectionsData);
        
        // Create a flat list of all cards from all collections
        const allCards = [];
        Object.entries(collectionsData).forEach(([collectionName, cards]) => {
          if (Array.isArray(cards)) {
            cards.forEach(card => {
              // Add collection name to each card for reference
              allCards.push({
                ...card,
                collectionName
              });
            });
          }
        });
        
        setFilteredCards(allCards);
      } catch (error) {
        console.error('Error loading collections:', error);
        toast.error('Failed to load card collections');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen && currentUser) {
      loadCollections();
      // Generate a default invoice number based on date
      const today = new Date();
      setInvoiceNumber(`INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    }
  }, [isOpen, currentUser]);
  
  // Filter cards based on search query and selected collection
  useEffect(() => {
    // Start with all cards or cards from the selected collection
    let baseCards = [];
    
    if (selectedCollection === 'All Collections') {
      // Get all cards from all collections
      Object.entries(collections).forEach(([collectionName, cards]) => {
        if (Array.isArray(cards)) {
          cards.forEach(card => {
            baseCards.push({
              ...card,
              collectionName
            });
          });
        }
      });
    } else {
      // Get cards only from the selected collection
      const cards = collections[selectedCollection];
      if (Array.isArray(cards)) {
        cards.forEach(card => {
          baseCards.push({
            ...card,
            collectionName: selectedCollection
          });
        });
      }
    }
    
    // If there's a search query, filter the base cards
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseCards = baseCards.filter(card => {
        return (
          (card.name && card.name.toLowerCase().includes(query)) ||
          (card.set && card.set.toLowerCase().includes(query)) ||
          (card.cardNumber && card.cardNumber.toString().includes(query)) ||
          (card.year && card.year.toString().includes(query))
        );
      });
    }
    
    setFilteredCards(baseCards);
  }, [searchQuery, collections, selectedCollection]);
  
  // Toggle card selection
  const toggleCardSelection = (card) => {
    setSelectedCards(prevSelected => {
      const isSelected = prevSelected.some(c => c.id === card.id);
      
      if (isSelected) {
        return prevSelected.filter(c => c.id !== card.id);
      } else {
        return [...prevSelected, card];
      }
    });
  };
  
  // Check if a card is selected
  const isCardSelected = (cardId) => {
    return selectedCards.some(card => card.id === cardId);
  };
  
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
          originalInvestmentCurrency: card.originalInvestmentCurrency || 'AUD',
          investmentAUD: parseFloat(card.investmentAUD) || 0
        };
        
        // Remove any remaining undefined values
        Object.keys(cleanCard).forEach(key => {
          if (cleanCard[key] === undefined) {
            cleanCard[key] = '';
          }
        });
        
        return cleanCard;
      });
      
      // Calculate total investment
      const totalAmount = cardData.reduce((sum, card) => sum + (card.originalInvestmentAmount || card.investmentAUD || 0), 0);
      
      let invoice;
      
      if (editingInvoice) {
        // Update existing invoice - preserve the original ID
        invoice = {
          ...editingInvoice,
          id: editingInvoice.id, // Ensure we keep the original ID
          invoiceNumber: invoiceNumber || '',
          date: date || new Date().toISOString().split('T')[0],
          seller: seller || '',
          notes: notes || '',
          cards: cardData,
          totalAmount: totalAmount || 0,
          cardCount: selectedCards.length,
          lastUpdated: Date.now()
        };
        
        console.log('Saving updated invoice:', invoice);
        
        // Save updated invoice to database
        await db.savePurchaseInvoice(invoice);
        toast.dismiss(loadingToast);
        toast.success('Purchase invoice updated successfully!');
      } else {
        // Create new invoice
        invoice = {
          id: `invoice_${Date.now()}`,
          invoiceNumber: invoiceNumber || '',
          date: date || new Date().toISOString().split('T')[0],
          seller: seller || '',
          notes: notes || '',
          cards: cardData,
          totalAmount: totalAmount || 0,
          cardCount: selectedCards.length,
          timestamp: Date.now(),
          userId: currentUser.uid
        };
        
        console.log('Saving new invoice:', invoice);
        
        // Save new invoice to database
        await db.savePurchaseInvoice(invoice);
        toast.dismiss(loadingToast);
        toast.success('Purchase invoice created successfully!');
      }
      
      // Pass the invoice back to the parent component
      if (typeof onSave === 'function') {
        onSave(invoice);
      }
      
      // Reset form state before closing
      setSelectedCards([]);
      setSeller('');
      setDate(new Date().toISOString().split('T')[0]);
      setInvoiceNumber('');
      setNotes('');
      setStep(1);
      setSearchQuery('');
      
      // Close the modal
      onClose();
      
      // Prevent any default navigation
      return false;
    } catch (error) {
      console.error(`Error ${editingInvoice ? 'updating' : 'creating'} purchase invoice:`, error);
      toast.error(`Failed to ${editingInvoice ? 'update' : 'create'} purchase invoice`);
      
      // Prevent any default navigation on error
      return false;
    }
  };
  
  // Handle back button in step 2
  const handleBack = () => {
    // If cards were pre-selected, close the modal instead of going back to step 1
    if (preSelectedCards && preSelectedCards.length > 0) {
      handleClose();
    } else {
      setStep(1);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setSelectedCards([]);
    setSeller('');
    setDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setNotes('');
    setStep(1);
    setSearchQuery('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex flex-col">
      <div className="bg-white dark:bg-[#1B2131] w-full h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50">
          <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">
            {step === 1 ? 'Select Cards for Purchase Invoice' : 'Invoice Details'}
          </h2>
          <button 
            className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Card Selection Step */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  {/* Collection Filter */}
                  <div className="w-full sm:w-1/3">
                    <select
                      value={selectedCollection}
                      onChange={(e) => setSelectedCollection(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl 
                              border border-gray-200 dark:border-gray-700/50 
                              bg-white dark:bg-[#252B3B]
                              text-gray-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="All Collections">All Collections</option>
                      {Object.keys(collections).map(collection => (
                        <option key={collection} value={collection}>{collection}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Search Box */}
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cards..."
                      className="w-full px-4 py-2 rounded-xl 
                              border border-gray-200 dark:border-gray-700/50 
                              bg-white dark:bg-[#252B3B]
                              text-gray-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                              placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 dark:text-gray-400">
                      No cards found
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr key="card-selection-header-row">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Select
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Card
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Set / Year
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Grade
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-[#1B2131] divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredCards.map((card) => (
                          <tr 
                            key={card.id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                              isCardSelected(card.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => toggleCardSelection(card)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isCardSelected(card.id)}
                                onChange={() => toggleCardSelection(card)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {card.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                #{card.cardNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {card.set || card.setName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {card.year}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {card.grade ? `${card.gradeVendor || 'PSA'} ${card.grade}` : 'Ungraded'}
                              </div>
                              {card.slabSerial && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {card.slabSerial}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              ${parseFloat(card.investmentAUD || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <div className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{selectedCards.length}</span> cards selected
                  {selectedCards.length > 0 && (
                    <span className="ml-2">
                      (Total: <span className="font-medium">${totalInvestment.toFixed(2)}</span>)
                    </span>
                  )}
                </div>
                <button
                  className="px-4 py-2 rounded-lg
                           bg-primary text-white
                           hover:bg-primary/90
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStep(2)}
                  disabled={selectedCards.length === 0}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Invoice Details Step */}
              <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-20">
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
                  
                  <div className="border-t border-gray-200 dark:border-gray-700/50 pt-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Selected Cards
                    </h3>
                    <div>
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr key="header-row">
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
                        <tbody className="bg-white dark:bg-[#1B2131] divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedCards.map((card) => (
                            <tr key={card.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {card.name || card.player || 'Unnamed Card'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  #{card.cardNumber}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {card.set || card.setName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {card.year}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                ${parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700/50 pt-4">
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        Total Amount:
                      </div>
                      <div className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        ${totalInvestment.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="fixed bottom-0 left-0 right-0 flex justify-between px-6 py-4 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700/50 z-10">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg
                             bg-gray-100 dark:bg-[#252B3B] 
                             text-gray-700 dark:text-gray-300
                             hover:bg-gray-200 dark:hover:bg-[#323B4B]
                             transition-colors"
                    onClick={handleClose}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg
                             bg-primary text-white
                             hover:bg-primary/90
                             transition-colors"
                  >
                    {editingInvoice ? 'Save Changes' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
