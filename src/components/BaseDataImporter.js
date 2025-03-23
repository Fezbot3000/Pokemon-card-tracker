import React, { useState } from 'react';

const BaseDataImporter = ({ onImport, loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [importError, setImportError] = useState(null);

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file selection from file input
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  // Process the selected file
  const handleFiles = (file) => {
    setImportError(null);
    
    // Check file type
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setImportError("Please upload a CSV file");
      return;
    }

    // Call the parent component's import handler with the file and mode
    onImport(file, 'baseData');
  };

  return (
    <div className="csv-importer">
      <h2>Import Base Card Data</h2>
      <div 
        className={`drop-area ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="base-data-upload" 
          accept=".csv" 
          onChange={handleChange}
          disabled={loading}
        />
        <label htmlFor="base-data-upload" className={loading ? 'disabled' : ''}>
          {loading ? 'Processing...' : 'Drag and drop a CSV file or click to browse'}
        </label>
      </div>
      
      {importError && (
        <div className="error-message">
          {importError}
        </div>
      )}
      
      <div className="import-instructions">
        <h3>Import Instructions</h3>
        <p>Your CSV file should include the following columns:</p>
        <ul>
          <li><strong>Slab Serial #</strong> - Unique identifier for each card</li>
          <li><strong>Date Purchased</strong> - When you bought the card</li>
          <li><strong>Quantity</strong> - Number of cards</li>
          <li><strong>Current Value</strong> - Current value in USD (will be converted to AUD)</li>
          <li><strong>Investment</strong> - Amount invested in USD (will be converted to AUD)</li>
          <li><strong>Card</strong> - Card name</li>
          <li><strong>Player</strong> - Pokémon name</li>
          <li><strong>Year</strong> - Card year</li>
          <li><strong>Set</strong> - Card set</li>
        </ul>
        <p>This import will capture all base data including investment values. All USD values will be converted to AUD using the current exchange rate.</p>
      </div>
    </div>
  );
};

export default BaseDataImporter;