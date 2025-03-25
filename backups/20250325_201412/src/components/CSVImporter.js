import React, { useState } from 'react';

const CSVImporter = ({ onImport, loading }) => {
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
    onImport(file, 'priceUpdate');
  };

  return (
    <div className="csv-importer">
      <h2>Update Card Prices</h2>
      <div 
        className={`drop-area ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="csv-upload" 
          accept=".csv" 
          onChange={handleChange}
          disabled={loading}
        />
        <label htmlFor="csv-upload" className={loading ? 'disabled' : ''}>
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
          <li><strong>Current Value</strong> - Current value in USD (will be converted to AUD)</li>
        </ul>
        <p>This import will ONLY update the prices of existing cards without changing other data.</p>
      </div>
    </div>
  );
};

export default CSVImporter;