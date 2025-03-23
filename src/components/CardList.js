import React, { useState } from 'react';

const CardList = ({ cards, exchangeRate, onCardClick, onDeleteCards }) => {
  const [sortField, setSortField] = useState('potentialProfit');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [selectedCards, setSelectedCards] = useState(new Set());

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allCardIds = filteredCards.map(card => card.slabSerial);
      setSelectedCards(new Set(allCardIds));
    } else {
      setSelectedCards(new Set());
    }
  };

  // Handle individual card selection
  const handleCardSelect = (e, cardId) => {
    e.stopPropagation();
    const newSelected = new Set(selectedCards);
    if (e.target.checked) {
      newSelected.add(cardId);
    } else {
      newSelected.delete(cardId);
    }
    setSelectedCards(newSelected);
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (selectedCards.size === 0) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedCards.size} selected card${selectedCards.size > 1 ? 's' : ''}?`
    );
    
    if (confirmDelete) {
      onDeleteCards(Array.from(selectedCards));
      setSelectedCards(new Set());
    }
  };

  // Filter and sort cards
  const filteredCards = cards
    .filter(card => {
      // Skip filtering if no filter text
      if (!filter) return true;
      
      // Search in multiple fields
      const searchText = filter.toLowerCase();
      return (
        card.card?.toLowerCase().includes(searchText) ||
        card.player?.toLowerCase().includes(searchText) ||
        card.set?.toLowerCase().includes(searchText) ||
        card.year?.toString().includes(searchText) ||
        card.slabSerial?.toString().includes(searchText)
      );
    })
    .sort((a, b) => {
      // Get values for sorting
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Handle special cases for dates
      if (sortField === 'datePurchased') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      // Sort based on direction
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

  // Calculate totals
  const totalInvestment = cards.reduce((sum, card) => sum + (card.investmentAUD || 0), 0);
  const totalValue = cards.reduce((sum, card) => sum + (card.currentValueAUD || 0), 0);
  const totalProfit = totalValue - totalInvestment;

  return (
    <div className="card-list-container">
      <div className="card-list-summary">
        <div className="summary-item">
          <div className="summary-label">Total Investment</div>
          <div className="summary-value">
            ${totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="summary-item">
          <div className="summary-label">Total Value</div>
          <div className="summary-value">
            ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="summary-item">
          <div className="summary-label">Total Profit</div>
          <div className={`summary-value ${totalProfit >= 0 ? 'positive' : 'negative'}`}>
            {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
      </div>

      <div className="card-list-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="card-list-controls">
          <button 
            className={`sort-button ${sortField === 'potentialProfit' ? 'active' : ''}`}
            onClick={() => handleSort('potentialProfit')}
          >
            Value {sortField === 'potentialProfit' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          
          <button 
            className={`sort-button ${sortField === 'datePurchased' ? 'active' : ''}`}
            onClick={() => handleSort('datePurchased')}
          >
            Date {sortField === 'datePurchased' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>
      
      <div className="list-actions">
        <div className="select-all-container">
          <input
            type="checkbox"
            id="select-all"
            checked={selectedCards.size === filteredCards.length && filteredCards.length > 0}
            onChange={handleSelectAll}
          />
          <label htmlFor="select-all">Select All</label>
        </div>
        
        {selectedCards.size > 0 && (
          <button 
            className="delete-selected-button"
            onClick={handleDeleteSelected}
          >
            Delete Selected ({selectedCards.size})
          </button>
        )}
      </div>
      
      <div className="results-count">
        {filteredCards.length} results
      </div>
      
      <div className="card-list">
        {filteredCards.map(card => (
          <div 
            key={card.slabSerial} 
            className="card-item"
            onClick={() => onCardClick(card.slabSerial)}
          >
            <div className="card-checkbox" onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={selectedCards.has(card.slabSerial)}
                onChange={(e) => handleCardSelect(e, card.slabSerial)}
              />
            </div>
            
            <div className="card-image">
              {/* Placeholder for card image - would be replaced with actual image */}
              <div className="image-placeholder"></div>
            </div>
            
            <div className="card-info">
              <h3>{card.year} Pokemon Game</h3>
              <h2>{card.player} #{card.number}</h2>
              
              <div className="card-tags">
                <span className="tag">Holo</span>
                <span className="tag">PSA 10</span>
              </div>
            </div>
            
            <div className="card-profit">
              <div className="profit-label">Profit</div>
              <div className={`profit-value ${card.potentialProfit > 0 ? 'positive' : 'negative'}`}>
                {card.potentialProfit > 0 ? '+' : ''}${card.potentialProfit ? card.potentialProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardList;