import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import CardDetailsForm from '../design-system/components/CardDetailsForm';
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
  onApplyDetails,
  autoApply = true // New prop to control auto-applying data
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
            // Parse the PSA data into our app's format
            const parsed = parsePSACardData(data);
            console.log('Parsed PSA data:', parsed);
            setParsedData(parsed);
            
            // Check if we have meaningful data
            const hasData = parsed.cardName || parsed.setName || parsed.grade;
            if (!hasData) {
              setError('No meaningful data found for this certification number');
              toast.error('PSA returned empty card data');
            } else if (autoApply) {
              // Auto-apply the data if we have it and autoApply is true
              applyPSADetails(parsed);
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
  }, [isOpen, certNumber, autoApply]);

  // Function to apply PSA details to card
  const applyPSADetails = (data) => {
    if (!data) return;
    
    try {
      console.log('Applying PSA data to card:', data);
      console.log('Current card data:', currentCardData);
      
      // Create a direct mapping of PSA data to card fields
      // This ensures we don't lose any existing data while adding PSA data
      const mergedData = {
        ...currentCardData,
        card: data.cardName || currentCardData.card || '',
        player: data.player || currentCardData.player || '',
        set: data.setName || currentCardData.set || '',
        setName: data.setName || currentCardData.setName || currentCardData.set || '',
        year: data.year || currentCardData.year || '',
        category: 'Pokemon', // Default to Pokemon for PSA cards
        condition: `PSA ${data.grade}`,
        gradingCompany: 'PSA',
        grade: data.grade || '',
        slabSerial: data.slabSerial || currentCardData.slabSerial || '',
        population: data.population || currentCardData.population || '',
        // Preserve financial data
        datePurchased: currentCardData?.datePurchased || new Date().toISOString().split('T')[0],
        investmentAUD: currentCardData?.investmentAUD || '',
        currentValueAUD: currentCardData?.currentValueAUD || '',
        quantity: currentCardData?.quantity || 1,
        // Store PSA data for future reference
        psaData: data,
        psaSearched: true,
        // Add the PSA URL for the "View on PSA Website" button
        psaUrl: `https://www.psacard.com/cert/${data.slabSerial}`
      };
      
      console.log('Merged card data:', mergedData);
      
      onApplyDetails(mergedData);
      toast.success('PSA data applied successfully!');
      onClose();
    } catch (err) {
      console.error('Error applying PSA data:', err);
      toast.error('Failed to apply PSA data: ' + err.message);
    }
  };
  
  // Handler for applying PSA details to card (for manual button click)
  const handleApplyDetails = () => {
    applyPSADetails(parsedData);
  };
  
  // Stop click propagation to prevent closing parent modal
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  // If autoApply is true, we don't need to show the modal at all
  if (autoApply) {
    return null;
  }

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
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Searching PSA for cert number: {certNumber}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {!isLoading && parsedData && (
            <div className="space-y-6">
              {/* Card details section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Card Details</h3>
                <CardDetailsForm
                  card={parsedData}
                  onChange={(updatedCard) => {
                    setParsedData(updatedCard);
                  }}
                  errors={{}}
                />
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

          {certNumber && (
            <div className="mt-4">
              <a
                href={`https://www.psacard.com/cert/${certNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View on PSA Website
                <span className="material-icons ml-1 text-xs">open_in_new</span>
              </a>
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
  onApplyDetails: PropTypes.func.isRequired,
  autoApply: PropTypes.bool
};

export default PSADetailModal;
