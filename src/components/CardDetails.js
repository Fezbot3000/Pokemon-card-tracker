import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatValue } from '../utils/formatters';
import { db } from '../services/db';

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
    setEditedCard(prev => ({
      ...prev,
      [name]: numValue,
      potentialProfit: name === 'currentValueAUD' ? 
        numValue - prev.investmentAUD : 
        name === 'investmentAUD' ? 
        prev.currentValueAUD - numValue : 
        prev.potentialProfit
    }));
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

  const profit = (editedCard.currentValueAUD || 0) - (editedCard.investmentAUD || 0);
  const profitPercentage = editedCard.investmentAUD ? (profit / editedCard.investmentAUD * 100) : 0;

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200">
        <button 
          className="text-3xl text-gray-600 hover:text-primary transition-colors" 
          onClick={handleClose}
        >
          ×
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {saveMessage && (
              <div 
                className={`px-4 py-2 rounded-md text-sm ${
                  saveMessage.type === 'error' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {saveMessage.text}
              </div>
            )}
            <button 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
          <button 
            className="p-2 text-gray-600 hover:text-red-600 transition-colors" 
            onClick={handleDelete}
          >
            <span className="material-icons">delete</span>
          </button>
          <div className="relative">
            <button 
              className="p-2 text-gray-600 hover:text-primary transition-colors"
              onClick={handleEditMenuToggle}
            >
              <span className="material-icons">more_vert</span>
            </button>
            {isEditMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] z-50">
                <button 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  onClick={() => handleFieldEdit('player')}
                >
                  Edit Player Name
                </button>
                <button 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  onClick={() => handleFieldEdit('number')}
                >
                  Edit Card Number
                </button>
                <button 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  onClick={() => handleFieldEdit('year')}
                >
                  Edit Year
                </button>
                <button 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  onClick={() => handleFieldEdit('notes')}
                >
                  Edit Notes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div 
              className={`
                relative aspect-[3/4] rounded-lg overflow-hidden
                ${cardImage ? 'bg-gray-50' : 'bg-white'}
                border-2 border-dashed border-gray-300 hover:border-primary transition-colors
                cursor-pointer
              `}
              onClick={() => document.getElementById('card-image').click()}
            >
              <input
                type="file"
                id="card-image"
                className="hidden"
                accept="image/*"
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
                    <span className="material-icons text-4xl text-gray-400">add_photo_alternate</span>
                    <p className="text-sm text-gray-400 mt-2">Click to add image</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Card Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Player</label>
                  <input
                    type="text"
                    name="player"
                    value={editedCard.player || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Card Name</label>
                  <input
                    type="text"
                    name="card"
                    value={editedCard.card || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Set</label>
                  <input
                    type="text"
                    name="set"
                    value={editedCard.set || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Year</label>
                  <input
                    type="text"
                    name="year"
                    value={editedCard.year || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={editedCard.category || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Condition</label>
                  <input
                    type="text"
                    name="condition"
                    value={editedCard.condition || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="slabSerial"
                    value={editedCard.slabSerial}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Investment (AUD)</label>
                  <input
                    type="number"
                    name="investmentAUD"
                    value={editedCard.investmentAUD}
                    onChange={handleNumberInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Current Value (AUD)</label>
                  <input
                    type="number"
                    name="currentValueAUD"
                    value={editedCard.currentValueAUD}
                    onChange={handleNumberInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm text-gray-500">Profit/Loss</h3>
                    <div className={`text-xl font-bold ${profit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                      {profit >= 0 ? '+' : ''}{formatValue(profit, 'currency')}
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm text-gray-500">Return</h3>
                    <div className={`text-xl font-bold ${profit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                      {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                    </div>
                  </div>
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