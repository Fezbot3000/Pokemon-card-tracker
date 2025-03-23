import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import { db } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

const CardDetails = ({ card, onClose, onUpdate, onDelete, exchangeRate }) => {
  const [editedCard, setEditedCard] = useState({
    ...card,
    investmentUSD: typeof card.investmentUSD === 'number' ? card.investmentUSD : 0,
    currentValueUSD: typeof card.currentValueUSD === 'number' ? card.currentValueUSD : 0,
    investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 0,
    currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const fileInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    if (saveMessage) {
      messageTimeoutRef.current = setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [saveMessage]);

  useEffect(() => {
    const loadCardImage = async () => {
      try {
        const imageBlob = await db.getImage(card.slabSerial);
        if (imageBlob) {
          const imageUrl = URL.createObjectURL(imageBlob);
          setCardImage(imageUrl);
        } else {
          setCardImage(null);
        }
      } catch (error) {
        console.error('Error loading card image:', error);
        setCardImage(null);
      }
    };

    loadCardImage();

    return () => {
      if (cardImage) {
        URL.revokeObjectURL(cardImage);
      }
    };
  }, [card.slabSerial]);

  const handleClose = () => {
    // Only show warning if there are actual changes
    const hasChanges = Object.keys(editedCard).some(key => {
      // Skip comparing functions, undefined values, and cardImage
      if (typeof editedCard[key] === 'function' || editedCard[key] === undefined) {
        return false;
      }
      // For numbers, compare with a small epsilon to handle floating point precision
      if (typeof editedCard[key] === 'number') {
        return Math.abs(editedCard[key] - (card[key] || 0)) > 0.001;
      }
      return editedCard[key] !== (card[key] || '');
    });

    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCard(prev => ({
      ...prev,
      [name]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    setEditedCard(prev => {
      if (name === 'investmentAUD') {
        return {
          ...prev,
          investmentAUD: numValue,
          potentialProfit: prev.currentValueAUD - numValue
        };
      } else if (name === 'currentValueAUD') {
        return {
          ...prev,
          currentValueAUD: numValue,
          potentialProfit: numValue - prev.investmentAUD
        };
      }
      return { ...prev, [name]: numValue };
    });
    setHasUnsavedChanges(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        await db.saveImage(card.slabSerial, file);
        const imageUrl = URL.createObjectURL(file);
        setCardImage(imageUrl);
      } catch (error) {
        console.error('Error saving image:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      await onUpdate(editedCard);
      setSaveMessage({
        type: 'success',
        text: 'Changes saved successfully'
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Failed to save changes'
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      onDelete(card.slabSerial);
    }
  };

  const handleEditMenuToggle = () => {
    setIsEditMenuOpen(!isEditMenuOpen);
  };

  const handleFieldEdit = (field) => {
    setEditingField(field);
    setIsEditMenuOpen(false);
    setHasUnsavedChanges(true);
  };

  const profit = editedCard.currentValueAUD - editedCard.investmentAUD;
  const profitPercentage = editedCard.investmentAUD ? (profit / editedCard.investmentAUD * 100) : 0;

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0B0F19] z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-white dark:bg-[#0B0F19] border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="material-icons">close</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
          
          <button 
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2"
          >
            <span className="material-icons">delete</span>
          </button>
          
          <button className="text-gray-500 dark:text-gray-400 p-2">
            <span className="material-icons">more_vert</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Financial Summary Box */}
        <div className="mb-8 bg-white dark:bg-[#1B2131] rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Profit/Loss</div>
              <div className={`text-xl font-medium ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{formatValue(profit, '$')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">Return</div>
              <div className={`text-xl font-medium ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div 
              className="relative aspect-[3/4] rounded-lg overflow-hidden bg-transparent border-2 border-dashed border-gray-700/50 hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: '400px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {cardImage ? (
                <img 
                  src={cardImage} 
                  alt={editedCard.player} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-icons text-4xl text-gray-600">add_photo_alternate</span>
                    <p className="text-sm text-gray-400 mt-2">Click to add image</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Card Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player</label>
                  <input
                    type="text"
                    name="player"
                    value={editedCard.player || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Name</label>
                  <input
                    type="text"
                    name="card"
                    value={editedCard.card || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Set</label>
                  <input
                    type="text"
                    name="set"
                    value={editedCard.set || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
                  <input
                    type="text"
                    name="year"
                    value={editedCard.year || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={editedCard.category || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                  <input
                    type="text"
                    name="condition"
                    value={editedCard.condition || ''}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="slabSerial"
                    value={editedCard.slabSerial}
                    onChange={handleInputChange}
                    className="input"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Financial Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (AUD)</label>
                  <input
                    type="number"
                    name="investmentAUD"
                    value={editedCard.investmentAUD}
                    onChange={handleNumberInputChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                  <input
                    type="number"
                    name="currentValueAUD"
                    value={editedCard.currentValueAUD}
                    onChange={handleNumberInputChange}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;