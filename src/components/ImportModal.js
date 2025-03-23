import React from 'react';
import CSVImporter from './CSVImporter';
import BaseDataImporter from './BaseDataImporter';

const ImportModal = ({ isOpen, onClose, mode, onImport, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'price' ? 'Update Card Prices' : 'Import Base Data'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {mode === 'price' ? (
            <CSVImporter onImport={onImport} loading={loading} />
          ) : (
            <BaseDataImporter onImport={onImport} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 