import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';

/**
 * Modal component for updating card prices based on AI analysis
 */
const PriceUpdateModal = ({ 
  isOpen, 
  onClose, 
  currentValue, 
  suggestedValue, 
  explanation, 
  comparableSales,
  onConfirm 
}) => {
  const [useNewValue, setUseNewValue] = useState(true);
  const [customValue, setCustomValue] = useState(
    suggestedValue !== null ? suggestedValue.toFixed(2) : '0.00'
  );
  
  // Format dollar amounts
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    return `$${parseFloat(value).toFixed(2)}`;
  };
  
  // Calculate the change in value
  const valueChange = suggestedValue - currentValue;
  const changePercent = currentValue > 0 
    ? ((valueChange / currentValue) * 100).toFixed(1) 
    : 0;
    
  const getChangeClass = () => {
    if (valueChange > 0) return 'text-green-500';
    if (valueChange < 0) return 'text-red-500';
    return 'text-gray-500';
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="AI Card Value Analysis"
    >
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between mb-3">
            <span className="text-gray-600 dark:text-gray-300">Current Value:</span>
            <span className="font-semibold">{formatCurrency(currentValue)}</span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-600 dark:text-gray-300">AI Suggested Value:</span>
            <span className="font-semibold text-blue-500">{formatCurrency(suggestedValue)}</span>
          </div>
          
          {valueChange !== 0 && (
            <div className="flex justify-end text-sm">
              <span className={getChangeClass()}>
                {valueChange > 0 ? '+' : ''}{formatCurrency(valueChange)} ({valueChange > 0 ? '+' : ''}{changePercent}%)
              </span>
            </div>
          )}
        </div>
        
        {explanation && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Analysis:</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{explanation}</p>
          </div>
        )}
        
        {comparableSales && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Comparable Sales:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {comparableSales.map((sale, index) => (
                <div key={index} className="flex justify-between">
                  <span>
                    {sale.saleDate} (
                    {sale.url ? (
                      <a href={sale.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {sale.source}
                      </a>
                    ) : (
                      sale.source
                    )}
                    ):
                  </span>
                  <span>{formatCurrency(sale.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Update Card Value</h4>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="useAiValue"
              checked={useNewValue}
              onChange={() => setUseNewValue(true)}
              className="mr-2"
            />
            <label htmlFor="useAiValue" className="text-gray-600 dark:text-gray-300">
              Use AI suggested value ({formatCurrency(suggestedValue)})
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="useCustomValue"
              checked={!useNewValue}
              onChange={() => setUseNewValue(false)}
              className="mr-2"
            />
            <label htmlFor="useCustomValue" className="text-gray-600 dark:text-gray-300">
              Use custom value
            </label>
          </div>
          
          {!useNewValue && (
            <div className="pl-5 mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full p-2 pl-8 border dark:border-gray-700 rounded dark:bg-gray-700 dark:text-white"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={() => onConfirm(useNewValue ? suggestedValue : parseFloat(customValue))}
        >
          Update Card Value
        </Button>
      </div>
    </Modal>
  );
};

PriceUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentValue: PropTypes.number,
  suggestedValue: PropTypes.number,
  explanation: PropTypes.string,
  comparableSales: PropTypes.arrayOf(
    PropTypes.shape({
      saleDate: PropTypes.string,
      price: PropTypes.number,
      source: PropTypes.string,
      url: PropTypes.string
    })
  ),
  onConfirm: PropTypes.func.isRequired
};

PriceUpdateModal.defaultProps = {
  currentValue: 0,
  suggestedValue: 0,
  explanation: '',
  comparableSales: []
};

export default PriceUpdateModal;
