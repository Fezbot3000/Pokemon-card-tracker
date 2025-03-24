import React from 'react';

const formatCurrency = (value) => {
  // Ensure value is a number and round to 2 decimal places
  const numValue = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};

const ProfitChangeModal = ({ isOpen, onClose, oldProfit, newProfit }) => {
  if (!isOpen) return null;

  // Ensure values are numbers
  const oldProfitNum = parseFloat(oldProfit) || 0;
  const newProfitNum = parseFloat(newProfit) || 0;
  const profitDifference = newProfitNum - oldProfitNum;
  const isPositive = profitDifference >= 0;

  return (
    <div className="profit-change-modal">
      <div className="profit-change-content">
        <h2 className="profit-change-header">Profit Change Summary</h2>
        
        <div className="profit-change-body">
          <div className="profit-stat">
            <span className="profit-label">Previous Profit</span>
            <span className={`profit-value ${oldProfitNum >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(oldProfitNum)}
            </span>
          </div>
          
          <div className="profit-stat">
            <span className="profit-label">New Profit</span>
            <span className={`profit-value ${newProfitNum >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(newProfitNum)}
            </span>
          </div>
          
          <div className="profit-stat">
            <span className="profit-label">Difference</span>
            <span className={`profit-value ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{formatCurrency(profitDifference)}
            </span>
          </div>
        </div>

        <div className="profit-change-footer">
          <button className="profit-change-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfitChangeModal; 