import React, { useState } from 'react';

const FilterSection = ({ 
  onSort, 
  onViewChange, 
  currentSort = 'Player Name',
  currentView = 'Investment',
  sortDirection = 'ascending'
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAscending, setIsAscending] = useState(sortDirection === 'ascending');

  const sortOptions = [
    'Current Value',
    'Investment',
    'Profit',
    'Purchase Date',
    'Player Name'
  ];

  const viewOptions = ['Current Value', 'Investment', 'Profit'];

  return (
    <div className="filter-section">
      <input
        type="text"
        placeholder="Search by name, set, or serial number..."
        className="search-input"
      />
      
      <div className="filter-row">
        <div className="sort-container">
          <button 
            className="sort-button"
            onClick={() => setIsSortOpen(!isSortOpen)}
          >
            <div className="sort-header">
              <span className="material-icons sort-icon">sort</span>
              Sort by {currentSort}
            </div>
            <span className="material-icons">expand_more</span>
          </button>

          {isSortOpen && (
            <div className="sort-dropdown">
              {sortOptions.map((option) => (
                <div
                  key={option}
                  className={`sort-option ${option === currentSort ? 'active' : ''}`}
                  onClick={() => {
                    onSort(option);
                    setIsSortOpen(false);
                  }}
                >
                  {option === currentSort && (
                    <span className="material-icons">check</span>
                  )}
                  {option}
                </div>
              ))}
              <div 
                className="sort-direction"
                onClick={() => {
                  setIsAscending(!isAscending);
                  onSort(currentSort, !isAscending ? 'ascending' : 'descending');
                }}
              >
                <span className="material-icons">
                  {isAscending ? 'arrow_upward' : 'arrow_downward'}
                </span>
                Sort {isAscending ? 'Ascending' : 'Descending'}
              </div>
            </div>
          )}
        </div>

        <div className="view-container">
          <button 
            className="view-button"
            onClick={() => setIsViewOpen(!isViewOpen)}
          >
            <div className="view-header">
              <span className="material-icons">visibility</span>
              View {currentView}
            </div>
            <span className="material-icons">expand_more</span>
          </button>

          {isViewOpen && (
            <div className="sort-dropdown">
              {viewOptions.map((option) => (
                <div
                  key={option}
                  className={`sort-option ${option === currentView ? 'active' : ''}`}
                  onClick={() => {
                    onViewChange(option);
                    setIsViewOpen(false);
                  }}
                >
                  {option === currentView && (
                    <span className="material-icons">check</span>
                  )}
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="column-headers">
        <div className="column-header active">
          Current Value
          <span className="material-icons">check</span>
        </div>
        <div className="column-header">Investment</div>
        <div className="column-header">Profit</div>
        <div className="column-header">Purchase Date</div>
        <div className="column-header">Player Name</div>
      </div>
    </div>
  );
};

export default FilterSection; 