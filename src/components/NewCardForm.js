import React, { useState } from 'react';

const NewCardForm = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    player: '',
    number: '',
    year: 1999,
    set: 'Base Set',
    variation: 'Holo',
    slabSerial: '',
    condition: 'PSA 10',
    investmentAUD: 0,
    datePurchased: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    quantity: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Convert numeric values
    if (['year', 'number', 'quantity', 'slabSerial'].includes(name)) {
      processedValue = value === '' ? '' : parseInt(value, 10);
    } else if (name === 'investmentAUD') {
      processedValue = value === '' ? 0 : parseFloat(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.player || !formData.slabSerial) {
      alert('Please fill in all required fields: Player and Slab Serial #');
      return;
    }
    
    // Add card with default values for missing fields
    onAdd({
      ...formData,
      currentValueUSD: 0, // Will be updated when CSV is imported
      currentValueAUD: 0,
      potentialProfit: -formData.investmentAUD, // Initial profit is negative (investment)
      category: formData.category || 'Card'
    });
  };

  return (
    <div className="new-card-form-overlay">
      <div className="new-card-form">
        <div className="form-header">
          <h2>Add New Card</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="player">Player/Card Name*</label>
              <input
                type="text"
                id="player"
                name="player"
                value={formData.player}
                onChange={handleChange}
                required
                placeholder="e.g. Charizard"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="number">Card Number</label>
              <input
                type="number"
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                placeholder="e.g. 4"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="year">Year</label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="set">Set</label>
              <input
                type="text"
                id="set"
                name="set"
                value={formData.set}
                onChange={handleChange}
                placeholder="e.g. Base Set"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="variation">Variation</label>
              <input
                type="text"
                id="variation"
                name="variation"
                value={formData.variation}
                onChange={handleChange}
                placeholder="e.g. Holo"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="slabSerial">Slab Serial #*</label>
              <input
                type="text"
                id="slabSerial"
                name="slabSerial"
                value={formData.slabSerial}
                onChange={handleChange}
                required
                placeholder="e.g. 12345678"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <input
                type="text"
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                placeholder="e.g. PSA 10"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="investmentAUD">Investment (AUD)</label>
              <input
                type="number"
                id="investmentAUD"
                name="investmentAUD"
                value={formData.investmentAUD}
                onChange={handleChange}
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="datePurchased">Date Purchased</label>
              <input
                type="date"
                id="datePurchased"
                name="datePurchased"
                value={formData.datePurchased}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCardForm;