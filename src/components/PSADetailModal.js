import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import { searchByCertNumber, parsePSACardData, mergeWithExistingCard } from '../services/psaSearch';

/**
 * PSA Detail Modal Component
 * Shows PSA card details and allows users to apply data to their card
 */
const PSADetailModal = ({ 
  isOpen, 
  onClose, 
  certNumber, 
  currentCardData, 
  onApplyDetails 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [psaData, setPsaData] = useState(null);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // Fetch PSA data when cert number changes
  useEffect(() => {
    const fetchPSAData = async () => {
      if (!certNumber) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Log the cert number being searched
        console.log(`Fetching PSA data for cert number: ${certNumber}`);
        
        const data = await searchByCertNumber(certNumber);
        console.log('Raw PSA API response:', data);
        
        setPsaData(data);
        
        if (data.error) {
          setError(data.error);
          toast.error(`PSA search error: ${data.error}`);
        } else {
          try {
            const parsed = parsePSACardData(data);
            console.log('Parsed PSA data:', parsed);
            setParsedData(parsed);
            
            // Check if we have meaningful data
            const hasData = parsed.cardName || parsed.setName || parsed.grade;
            if (!hasData) {
              setError('No meaningful data found for this certification number');
              toast.error('PSA returned empty card data');
            }
          } catch (parseError) {
            console.error('Error parsing PSA data:', parseError);
            setError(`Error parsing PSA data: ${parseError.message}`);
            toast.error('Error parsing PSA data');
          }
        }
      } catch (err) {
        console.error('Error fetching PSA data:', err);
        setError(err.message || 'Failed to fetch PSA data');
        toast.error(`PSA search failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && certNumber) {
      fetchPSAData();
    }
  }, [isOpen, certNumber]);

  // Handler for applying PSA details to card
  const handleApplyDetails = () => {
    if (!parsedData) return;
    
    try {
      // Merge PSA data with existing card data
      const mergedData = mergeWithExistingCard(currentCardData, parsedData);
      onApplyDetails(mergedData);
      toast.success('PSA data applied successfully!');
      onClose();
    } catch (err) {
      console.error('Error applying PSA data:', err);
      toast.error('Failed to apply PSA data: ' + err.message);
    }
  };
  
  // Stop click propagation to prevent closing parent modal
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  // We'll create a specialized modal backdrop that doesn't close when clicked
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        e.stopPropagation(); 
        e.preventDefault();
      }}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            PSA Card Details: {certNumber}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-4">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <p className="font-medium">Error: {error}</p>
            </div>
          )}
          
          {!isLoading && parsedData && (
            <div className="space-y-6">
              {/* Card Details section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Card Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500 dark:text-gray-400">Card Name:</div>
                  <div className="font-medium">{parsedData.cardName || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Set:</div>
                  <div className="font-medium">{parsedData.setName || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Card Number:</div>
                  <div className="font-medium">{parsedData.cardNumber || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Year:</div>
                  <div className="font-medium">{parsedData.year || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Type:</div>
                  <div className="font-medium">{parsedData.cardType || 'N/A'}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">PSA Link:</div>
                  <div className="font-medium">
                    {parsedData.psaWebUrl ? (
                      <a 
                        href={parsedData.psaWebUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on PSA ↗
                      </a>
                    ) : 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Grading details section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Grading Details</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">PSA Grade</div>
                    <div className="text-xl font-bold text-center">{parsedData.grade || 'N/A'}</div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">Cert #</div>
                    <div className="text-lg font-bold text-center truncate">{parsedData.slabSerial || 'N/A'}</div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">Population</div>
                    <div className="text-xl font-bold text-center">{parsedData.population || '0'}</div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">Higher Grades</div>
                    <div className="text-xl font-bold text-center">{parsedData.populationHigher || '0'}</div>
                  </div>
                </div>
              </div>
              
              {/* Additional details section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Additional Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500 dark:text-gray-400">Certified:</div>
                  <div className="font-medium">
                    {parsedData.certificationDate ? new Date(parsedData.certificationDate).toLocaleDateString() : 'N/A'}
                  </div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Variety:</div>
                  <div className="font-medium">{parsedData.varietyType || 'N/A'}</div>
                </div>
              </div>
              
              {/* Confirmation message */}
              <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-400 text-blue-700 dark:text-blue-400 px-4 py-3 rounded relative">
                <p>Would you like to apply these PSA details to your card?</p>
                <p className="text-sm mt-1">
                  This will update card information but preserve your purchase details, values, and notes.
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-3 mt-4">
                <Button 
                  variant="secondary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleApplyDetails();
                  }}
                >
                  Apply PSA Details
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !parsedData && !error && (
            <div className="text-center py-8">
              <p>No PSA data available for this certification number.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PSADetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  certNumber: PropTypes.string,
  currentCardData: PropTypes.object,
  onApplyDetails: PropTypes.func.isRequired
};

export default PSADetailModal;
