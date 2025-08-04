import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import Button from '../design-system/atoms/Button';
import CardDetailsForm from '../design-system/components/CardDetailsForm';
import {
  searchByCertNumber,
  parsePSACardData,
} from '../services/psaSearch';
import logger from '../utils/logger';

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
  autoApply = true, // New prop to control auto-applying data
}) => {
  const [isLoading, setIsLoading] = useState(false);
  // const [psaData, setPsaData] = useState(null);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // Function to apply PSA details to card - wrapped in useCallback to prevent recreation on every render
  const applyPSADetails = useCallback(data => {
    if (!data) return;

    try {
      // Extract and trim values from the 'data' object (output of processPSACardData)
      const psaMappedSetName = data.setName ? String(data.setName).trim() : ''; // e.g., "XY Promos" - from findBestMatchingSet
      const psaRawBrand = data.Brand ? String(data.Brand).trim() : ''; // e.g., "POKEMON JAPANESE XY PROMO" - raw from PSA
      const psaCardName = data.cardName ? String(data.cardName).trim() : ''; // e.g., "MARIO PIKACHU-HOLO"
      const psaCardNumber = data.cardNumber
        ? String(data.cardNumber).trim()
        : ''; // e.g., "293"
      const psaYear = data.year ? String(data.year).trim() : ''; // e.g., "2016"
      const psaGrade = data.grade ? String(data.grade).trim() : ''; // e.g., "GEM MT 10"
      const psaCertNumber = data.certNumber
        ? String(data.certNumber).trim()
        : '';
      const psaPsaUrl = data.psaUrl ? String(data.psaUrl).trim() : '';
      const psaHoloState = data.holoState ? String(data.holoState).trim() : ''; // e.g., "holo", "non-holo", etc.

      // Start with a clean slate for the fields we want to set in order
      let mergedData = {
        ...currentCardData,
      };

      // Step 1: Set category first - always 'pokemon' for PSA cards
      mergedData.category = 'pokemon';

      // Step 2: Set year - Use PSA year if available, else keep current
      if (psaYear) {
        mergedData.year = psaYear;
      } else if (currentCardData.year) {
        mergedData.year = String(currentCardData.year).trim();
      } else {
        mergedData.year = '';
      }

      // Step 3: Set the set name and raw set value
      if (psaMappedSetName) {
        mergedData.setName = psaMappedSetName;
      } else if (currentCardData.setName) {
        mergedData.setName = String(currentCardData.setName).trim();
      } else {
        mergedData.setName = '';
      }

      // Also set the raw set value for reference
      if (psaRawBrand) {
        mergedData.set = psaRawBrand;
      } else if (currentCardData.set) {
        mergedData.set = String(currentCardData.set).trim();
      } else {
        mergedData.set = '';
      }

      // Other card details: Use PSA if available, else current, else empty/default
      mergedData.cardName =
        psaCardName ||
        (currentCardData.cardName
          ? String(currentCardData.cardName).trim()
          : '');
      mergedData.cardNumber =
        psaCardNumber ||
        (currentCardData.cardNumber
          ? String(currentCardData.cardNumber).trim()
          : '');

      // Holo State: Use PSA holo state if available, else keep current
      if (psaHoloState) {
        mergedData.holoState = psaHoloState;
      } else if (currentCardData.holoState) {
        mergedData.holoState = String(currentCardData.holoState).trim();
      } else {
        mergedData.holoState = '';
      }

      // Grade related fields
      mergedData.grade = psaGrade || currentCardData.grade || ''; // General grade field, can be from PSA
      mergedData.psaGrade = psaGrade || currentCardData.psaGrade || ''; // Explicit PSA grade field
      // If psaGrade is available, attempt to parse company and grade number for 'condition'
      if (psaGrade) {
        const gradeParts = psaGrade.match(/([A-Z\s]+)(\d+|[A-Z]+)/i); // Attempt to split company and grade value
        if (gradeParts && gradeParts.length > 2) {
          const company = gradeParts[1].trim().toUpperCase();
          const gradeVal = gradeParts[2].trim();
          if (['PSA', 'CGS', 'BGS'].includes(company)) {
            mergedData.gradingCompany = company;
            mergedData.grade = gradeVal; // Overwrite general grade with specific parsed grade number/code
            mergedData.condition = `${company} ${gradeVal}`;
          } else {
            mergedData.condition = psaGrade; // Fallback to full PSA grade string if company not recognized
          }
        } else {
          mergedData.condition = psaGrade; // Fallback if regex fails
        }
      } else if (currentCardData.condition) {
        mergedData.condition = currentCardData.condition;
      } else {
        mergedData.condition = '';
      }

      mergedData.certificationNumber =
        psaCertNumber || currentCardData.certificationNumber || '';
      mergedData.psaUrl = psaPsaUrl || currentCardData.psaUrl || '';

      // Quantity & Value: Retain current or default, PSA doesn't directly provide these in a general way for merging.
      mergedData.quantity = currentCardData.quantity || 1;
      mergedData.value = currentCardData.value || ''; // Placeholder for value, typically user-input or market data

      onApplyDetails(mergedData);
      toast.success('PSA data applied successfully!');
      onClose();
    } catch (err) {
      logger.error('Error applying PSA data:', err, { context: { file: 'PSADetailModal', purpose: 'apply-psa-data' } });
      toast.error('Failed to apply PSA data: ' + err.message);
    };
  }, [currentCardData, onApplyDetails, onClose]);

  // Fetch PSA data when cert number changes
  useEffect(() => {
    const fetchPSAData = async () => {
      if (!certNumber) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await searchByCertNumber(certNumber);

        // setPsaData(data);

        if (data.error) {
          setError(data.error);
          toast.error(`PSA search error: ${data.error}`);
        } else {
          try {
            // Parse the PSA data into our app's format
            const parsed = parsePSACardData(data);
            setParsedData(parsed);

            // Check if we have meaningful data
            const hasData = parsed.cardName || parsed.setName || parsed.grade;
            if (!hasData) {
              setError(
                'No meaningful data found for this certification number'
              );
              toast.error('PSA returned empty card data');
            } else if (autoApply) {
              // Auto-apply the data if we have it and autoApply is true
              applyPSADetails(parsed);
            }
          } catch (parseError) {
            logger.error('Error parsing PSA data:', parseError, { context: { file: 'PSADetailModal', purpose: 'parse-psa-data' } });
            setError(`Error parsing PSA data: ${parseError.message}`);
            toast.error('Error parsing PSA data');
          }
        }
      } catch (err) {
        logger.error('Error fetching PSA data:', err, { context: { file: 'PSADetailModal', purpose: 'fetch-psa-data' } });
        setError(err.message || 'Failed to fetch PSA data');
        toast.error(`PSA search failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && certNumber) {
      fetchPSAData();
    }
  }, [isOpen, certNumber, autoApply, applyPSADetails]);

  // Handler for applying PSA details to card (for manual button click)
  const handleApplyDetails = () => {
    applyPSADetails(parsedData);
  };

  // Stop click propagation to prevent closing parent modal
  // const handleModalContentClick = e => {
  //   e.stopPropagation();
  // };

  // If autoApply is true, we don't need to show the modal at all
  if (autoApply) {
    return null;
  }

  // We'll create a specialized modal backdrop that doesn't close when clicked
  return (
    <div
      className="bg-black/50 fixed inset-0 z-[100] flex items-center justify-center"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            PSA Card Details: {certNumber}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4">
          {isLoading && (
            <div className="py-8 text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Searching PSA for cert number: {certNumber}
              </p>
            </div>
          )}

          {error && (
            <div className="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {!isLoading && parsedData && (
            <div className="space-y-6">
              {/* Card details section */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">Card Details</h3>
                <CardDetailsForm
                  card={parsedData}
                  onChange={updatedCard => {
                    setParsedData(updatedCard);
                  }}
                  errors={{}}
                />
              </div>

              {/* Grading details section */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">Grading Details</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      PSA Grade
                    </div>
                    <div className="text-center text-xl font-bold">
                      {parsedData.grade || 'N/A'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Cert #
                    </div>
                    <div className="truncate text-center text-lg font-bold">
                      {parsedData.slabSerial || 'N/A'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Population
                    </div>
                    <div className="text-center text-xl font-bold">
                      {parsedData.population || '0'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Higher Grades
                    </div>
                    <div className="text-center text-xl font-bold">
                      {parsedData.populationHigher || '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional details section */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">
                  Additional Details
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500 dark:text-gray-400">
                    Certified:
                  </div>
                  <div className="font-medium">
                    {parsedData.certificationDate
                      ? new Date(
                          parsedData.certificationDate
                        ).toLocaleDateString()
                      : 'N/A'}
                  </div>

                  <div className="text-gray-500 dark:text-gray-400">
                    Variety:
                  </div>
                  <div className="font-medium">
                    {parsedData.varietyType || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={e => {
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
                className="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View on PSA Website
                <span className="material-icons ml-1 text-xs">open_in_new</span>
              </a>
            </div>
          )}

          {!isLoading && !parsedData && !error && (
            <div className="py-8 text-center">
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
  autoApply: PropTypes.bool,
};

export default PSADetailModal;
