import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../design-system';
import { preventBodyScroll, restoreBodyScroll } from '../utils/modalUtils';

const ImportModal = ({
  isOpen,
  onClose,
  onImport,
  mode = 'priceUpdate',
  loading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Add state for import options
  const [importCurrency, setImportCurrency] = useState('USD');
  const [fillMissingFields, setFillMissingFields] = useState(true);
  const [updateExistingValues, setUpdateExistingValues] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Manage body scroll prevention
  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      preventBodyScroll();
    } else {
      setModalVisible(false);
      restoreBodyScroll();
    }

    return () => {
      restoreBodyScroll();
    };
  }, [isOpen]);

  const handleDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === 'priceUpdate') {
        // For price update, allow multiple files
        const files = Array.from(e.dataTransfer.files).filter(file =>
          file.name.toLowerCase().endsWith('.csv')
        );
        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        if (e.dataTransfer.files[0].name.toLowerCase().endsWith('.csv')) {
          onImport(e.dataTransfer.files[0]);
        }
      }
    }
  };

  const handleChange = e => {
    e.preventDefault();

    if (e.target.files && e.target.files.length > 0) {
      if (mode === 'priceUpdate') {
        // For price update, allow multiple files
        const files = Array.from(e.target.files).filter(file =>
          file.name.toLowerCase().endsWith('.csv')
        );

        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        const file = e.target.files[0];

        if (file && file.name.toLowerCase().endsWith('.csv')) {
          onImport(file);
        }
      }
    }
  };

  const triggerFileInput = e => {
    // Only trigger if it's from a user action
    if (e && e.isTrusted) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleRemoveFile = index => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmitFiles = () => {
    if (selectedFiles.length > 0) {
      // Include import options with the files
      onImport(selectedFiles, {
        currency: importCurrency,
        fillMissingFields,
        updateExistingValues,
      });
    }
  };

  if (!modalVisible) return null;

  return (
    <div className="modal-content fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0B0F19]">
      <div className="sticky top-0 z-10 border-b border-gray-200 p-4 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Update Card Data
        </h1>
      </div>

      <div
        className="mx-auto max-w-4xl flex-1 overflow-y-auto p-6"
        onScroll={e => e.stopPropagation()}
      >
        <div
          className={`mb-6 rounded-lg border-2 border-dashed p-8 text-center ${
            dragActive
              ? 'bg-primary/10 border-primary'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv"
            onChange={handleChange}
            className="hidden"
          />

          <div className="mb-4">
            <span className="material-icons text-4xl text-gray-400 dark:text-gray-600">
              upload_file
            </span>
          </div>

          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Drop your CSV file(s) here or
          </p>

          <button
            onClick={triggerFileInput}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Select Files
          </button>
        </div>

        {mode === 'priceUpdate' && selectedFiles.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                onClick={handleSubmitFiles}
                disabled={loading || selectedFiles.length === 0}
                className={`rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 ${
                  loading || selectedFiles.length === 0
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }`}
              >
                {loading ? 'Processing...' : 'Update Cards'}
              </button>
            </div>

            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-[#1B2131]"
                >
                  <div className="flex items-center">
                    <span className="material-icons mr-2 text-primary">
                      description
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <select
            value={importCurrency}
            onChange={e => setImportCurrency(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="USD">USD (US Dollar)</option>
            <option value="AUD">AUD (Australian Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (British Pound)</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="fillMissing"
              checked={fillMissingFields}
              onChange={e => setFillMissingFields(e.target.checked)}
              className="form-checkbox"
            />
            <label
              htmlFor="fillMissing"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              Fill in missing data fields
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="updateExisting"
              checked={updateExistingValues}
              onChange={e => setUpdateExistingValues(e.target.checked)}
              className="form-checkbox"
            />
            <label
              htmlFor="updateExisting"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              Update existing values
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <p className="mb-2 font-medium">Required CSV columns:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Slab Serial # (required)</li>
            <li>Current Value</li>
            <li>
              Card, Player, Year, Set, Category, Condition, Population
              (optional)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
