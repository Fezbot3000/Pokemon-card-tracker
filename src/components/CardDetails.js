import React, { useState } from 'react';
import { formatCurrency } from '../utils/currencyAPI';

const CardDetails = ({ card, onClose, onUpdate, exchangeRate }) => {
  const [investment, setInvestment] = useState(card.investmentAUD || 0);
  const [isEditing, setIsEditing] = useState(false);

  // Calculate profit and ROI
  const profit = (card.currentValueAUD || 0) - investment;
  const roi = investment > 0 ? (profit / investment * 100) : 0;

  // Handle investment value change
  const handleInvestmentChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setInvestment(value);
  };

  // Save changes
  const handleSave = () => {
    onUpdate({
      ...card,
      investmentAUD: investment
    });
    setIsEditing(false);
  };

  return (
    <div className="card-details">
      <div className="card-details-header">
        <button className="close-button" onClick={onClose}>×</button>
        <div className="action-buttons">
          <button className="action-button">🗑️</button>
          <button className="action-button">⋮</button>
        </div>
      </div>

      <div className="card-details-content">
        <div className="card-details-main">
          <div className="card-details-image">
            {/* Card image would go here - using placeholder for now */}
            <div className="image-placeholder large"></div>
            <div className="card-tags">
              <span className="tag">Holo</span>
              <span className="tag">PSA 10</span>
            </div>
          </div>

          <div className="card-details-info">
            <h1>{card.year} Pokemon Game {card.player} #{card.number}</h1>
            
            <div className="card-value">
              <div className="value-label">Current Value</div>
              <div className="value">{formatCurrency(card.currentValueAUD, 'AUD')}</div>
            </div>

            <div className="card-meta">
              <div className="meta-item">
                <span className="meta-label">Slab Cert #</span>
                <span className="meta-value">{card.slabSerial}</span>
              </div>
              
              <div className="meta-item">
                <span className="meta-label">Date Purchased</span>
                <span className="meta-value">{card.datePurchased}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-details-investment">
          <h2>INVESTMENT</h2>
          
          <div className="investment-grid">
            <div className="investment-item">
              <div className="investment-label">Total Investment</div>
              <div className="investment-value">
                {isEditing ? (
                  <input 
                    type="number" 
                    value={investment}
                    onChange={handleInvestmentChange}
                    className="investment-input"
                    step="0.01"
                  />
                ) : (
                  <div 
                    className="clickable-value" 
                    onClick={() => setIsEditing(true)}
                  >
                    {formatCurrency(investment, 'AUD')}
                  </div>
                )}
                {isEditing && (
                  <button className="save-button" onClick={handleSave}>
                    Save
                  </button>
                )}
              </div>
            </div>
            
            <div className="investment-item">
              <div className="investment-label">Daily $ Change</div>
              <div className="investment-value">$0.00</div>
            </div>
            
            <div className="investment-item">
              <div className="investment-label">Potential Profit</div>
              <div className={`investment-value ${profit >= 0 ? 'positive' : 'negative'}`}>
                {profit >= 0 ? '+' : ''}{formatCurrency(profit, 'AUD')}
              </div>
            </div>
            
            <div className="investment-item">
              <div className="investment-label">Potential ROI</div>
              <div className={`investment-value ${roi >= 0 ? 'positive' : 'negative'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <div className="card-details-notes">
          <h2>NOTES</h2>
          <textarea 
            className="notes-textarea"
            placeholder="Add notes about this card..."
            defaultValue={card.notes || ''}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default CardDetails;