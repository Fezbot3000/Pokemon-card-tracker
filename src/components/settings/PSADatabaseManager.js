import React, { useState } from 'react';
import { Icon, Button } from '../../design-system';
import { toast } from 'react-hot-toast';
import { useCards } from '../../contexts/CardContext';
import { useSubscription } from '../../hooks/useSubscription';
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import ConfirmDialog from '../../design-system/molecules/ConfirmDialog';
import logger from '../../utils/logger';

/**
 * Bulk PSA Data Normalisation Component
 * 
 * Allows users to run PSA data normalisation across all their PSA cards
 * at once, similar to the "Reload PSA Data" button in individual card details
 * but applied to all eligible cards in their collection.
 */
const PSADatabaseManager = () => {
  const { cards, updateCard } = useCards();
  const { hasFeature } = useSubscription();
  
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [results, setResults] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    /**
   * Check if a card is eligible for PSA normalisation
   * @param {Object} card - Card object
   * @returns {boolean} - Whether the card is eligible
   */
  const isCardEligible = (card) => {
    // Card must have a PSA serial number, be graded by PSA, and have a valid ID
    const hasValidId = (card.id || card.slabSerial || card.certificationNumber) && 
                      typeof (card.id || card.slabSerial || card.certificationNumber) === 'string';
    
    return (
      hasValidId &&
      card.slabSerial && 
      card.slabSerial.trim() !== '' &&
      (card.gradingCompany === 'PSA' || card.condition?.includes('PSA'))
    );
  };

/**
   * Normalise PSA data for a single card
   * @param {Object} card - Card to normalise
   * @returns {Promise<Object>} - Result object with success/error info
   */
  const normaliseSingleCard = async (card) => {
    try {
      logger.debug(`Normalising PSA data for card ${card.id} with serial: ${card.slabSerial}`);
      logger.debug('Card object:', { id: card.id, slabSerial: card.slabSerial, cardName: card.cardName });
      
      // Search for PSA data
      const psaData = await searchByCertNumber(card.slabSerial);
      
      if (psaData?.error) {
        return {
          success: false,
          cardId: card.id,
          cardName: card.cardName || 'Unknown',
          serial: card.slabSerial,
          error: psaData.error
        };
      }

      if (!psaData) {
        return {
          success: false,
          cardId: card.id,
          cardName: card.cardName || 'Unknown', 
          serial: card.slabSerial,
          error: 'No PSA data found'
        };
      }

      // Parse PSA data
      const parsedData = parsePSACardData(psaData);
      if (!parsedData) {
        return {
          success: false,
          cardId: card.id,
          cardName: card.cardName || 'Unknown',
          serial: card.slabSerial,
          error: 'Could not parse PSA data'
        };
      }

      // Ensure we have a valid card ID
      const cardId = card.id || card.slabSerial || card.certificationNumber;
      logger.debug('Card ID check:', { cardId, type: typeof cardId, cardIdExists: !!cardId });
      
      if (!cardId || typeof cardId !== 'string') {
        return {
          success: false,
          cardId: card.id,
          cardName: card.cardName || 'Unknown',
          serial: card.slabSerial,
          error: 'Card missing valid ID'
        };
      }

      // Update card data with PSA information (same logic as individual card modal)
      const updatedCard = {
        ...card,
        ...parsedData,
        id: cardId, // Ensure we have a valid ID
        slabSerial: card.slabSerial, // Keep original serial
        condition: `PSA ${parsedData.grade}`,
        gradeCompany: 'PSA',
        gradingCompany: 'PSA',
        psaUrl: `https://www.psacard.com/cert/${card.slabSerial}`,
        player: parsedData.player || card.player,
        cardName: parsedData.cardName || card.cardName,
        population: parsedData.population || card.population,
        category: parsedData.category || card.category,
        set: parsedData.set || card.set,
        year: parsedData.year || card.year,
      };

      // Debug: Log the complete card object before updating
      logger.debug('About to update card:', {
        id: updatedCard.id,
        type: typeof updatedCard.id,
        keys: Object.keys(updatedCard),
        fullCard: updatedCard
      });

      // Update the card in the database - CardContext expects (cardId, data)
      await updateCard(cardId, updatedCard);

      return {
        success: true,
        cardId: card.id,
        cardName: card.cardName || 'Unknown',
        serial: card.slabSerial,
        updatedFields: Object.keys(parsedData),
        changes: {
          before: {
            cardName: card.cardName || 'Not set',
            grade: card.grade || 'Not set',
            condition: card.condition || 'Not set',
            population: card.population || 'Not set',
            year: card.year || 'Not set'
          },
          after: {
            cardName: parsedData.cardName || card.cardName || 'Not set',
            grade: parsedData.grade || 'Not set',
            condition: `PSA ${parsedData.grade}`,
            population: parsedData.population || 'Not set',
            year: parsedData.year || card.year || 'Not set'
          }
        }
      };

    } catch (error) {
      logger.error(`Error normalising card ${card.id}:`, error);
      return {
        success: false,
        cardId: card.id,
        cardName: card.cardName || 'Unknown',
        serial: card.slabSerial,
        error: error.message
      };
    }
  };

  /**
   * Show confirmation dialog for bulk normalisation
   */
  const handleShowConfirmDialog = () => {
    if (!hasFeature('PSA_SEARCH')) {
      toast.error('PSA search is available with Premium. Upgrade to access this feature!');
      return;
    }

    // Find eligible cards
    const eligibleCards = cards.filter(isCardEligible);
    
    if (eligibleCards.length === 0) {
      toast.info('No PSA cards found in your collection that are eligible for normalisation.');
      return;
    }

    setShowConfirmDialog(true);
  };

  /**
   * Run bulk PSA normalisation across all eligible cards
   */
  const handleBulkNormalisation = async () => {
    // Find eligible cards
    const eligibleCards = cards.filter(isCardEligible);

    setIsNormalizing(true);
    setProgress({ current: 0, total: eligibleCards.length, stage: 'Starting...' });
    setResults(null); // Clear any previous results

    const results = {
      total: eligibleCards.length,
      successful: [],
      failed: [],
      skipped: []
    };

    logger.info(`Starting bulk PSA normalisation for ${eligibleCards.length} cards`);

    try {
      // Process cards one at a time to avoid rate limiting
      for (let i = 0; i < eligibleCards.length; i++) {
        const card = eligibleCards[i];
        setProgress({ 
          current: i + 1, 
          total: eligibleCards.length, 
          stage: `Processing ${card.cardName || card.slabSerial}...` 
        });

        const result = await normaliseSingleCard(card);
        
        if (result.success) {
          results.successful.push(result);
          logger.debug(`Successfully normalised card: ${result.cardName}`);
        } else {
          results.failed.push(result);
          logger.warn(`Failed to normalise card: ${result.cardName} - ${result.error}`);
        }

        // Small delay to avoid overwhelming the PSA service
        if (i < eligibleCards.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setResults(results);
      
      // Show summary
      const successCount = results.successful.length;
      const failCount = results.failed.length;
      
      if (successCount > 0) {
        toast.success(`Successfully normalised ${successCount} PSA cards!`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to normalise ${failCount} cards. See details below.`);
      }

      logger.info(`Bulk PSA normalisation completed: ${successCount} successful, ${failCount} failed`);
      
    } catch (error) {
      logger.error('Error during bulk PSA normalisation:', error);
      toast.error(`Bulk normalisation failed: ${error.message}`);
    } finally {
      setIsNormalizing(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  };

  // Get eligible cards count
  const eligibleCards = cards.filter(isCardEligible);
  const eligibleCount = eligibleCards.length;

  return (
    <div className="space-y-6">
      {/* Feature Check */}
      {!hasFeature('PSA_SEARCH') ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center">
            <Icon name="lock" className="mr-3 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Premium Feature Required
              </h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Bulk PSA normalisation is available with Premium subscription. Upgrade to access this feature!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
            <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Eligible PSA Cards
                </h4>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {eligibleCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cards with PSA serial numbers that can be normalised
                </p>
            </div>
              <Icon name="verified" className="text-3xl text-blue-500" />
            </div>
          </div>

          {/* Normalisation Button */}
          <div className="flex flex-col space-y-4">
            <Button
              variant="primary"
              iconLeft={<Icon name={isNormalizing ? "hourglass_empty" : "refresh"} />}
              onClick={handleShowConfirmDialog}
              disabled={isNormalizing || eligibleCount === 0}
              className="w-full sm:w-auto"
            >
              {isNormalizing 
                ? 'Normalising PSA Data...' 
                : `Normalise ${eligibleCount} PSA Cards`
              }
            </Button>

            {eligibleCount === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No PSA cards found in your collection. Add PSA graded cards with serial numbers to use this feature.
              </p>
            )}
        </div>

          {/* Progress */}
          {isNormalizing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Progress: {progress.current} of {progress.total}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-300">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                </span>
            </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ 
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` 
                  }}
                />
          </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {progress.stage}
            </p>
          </div>
          )}

                      {/* Results */}
          {results && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                Normalisation Results
              </h4>
              
              {/* Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {results.successful.length}
                </div>
                                        <div className="text-sm text-green-700 dark:text-green-300">
                      Successfully Normalised
                    </div>
              </div>
            </div>
                
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {results.failed.length}
          </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Failed
                </div>
              </div>
            </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {results.total}
                      </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Total Processed
                          </div>
                        </div>
                          </div>
                        </div>

              {/* Failed Cards Details */}
              {results.failed.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h5 className="mb-3 font-medium text-red-800 dark:text-red-200">
                    Failed Cards ({results.failed.length})
                  </h5>
                  <div className="space-y-2">
                    {results.failed.map((failure, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-red-700 dark:text-red-300">
                          {failure.cardName} (#{failure.serial})
                        </span>
                        <span className="ml-2 text-red-600 dark:text-red-400">
                          - {failure.error}
                        </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                            {/* Success Details */}
              {results.successful.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <h5 className="mb-3 font-medium text-green-800 dark:text-green-200">
                    Successfully Normalised ({results.successful.length})
                  </h5>
                  <div className="space-y-4">
                    {results.successful.slice(0, 5).map((success, index) => (
                      <div key={index} className="border border-green-300 rounded-lg p-3 bg-white dark:bg-green-900/10">
                        <div className="font-medium text-green-800 dark:text-green-200 mb-2">
                          {success.cardName} (#{success.serial})
                        </div>
                        {success.changes ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Before:</div>
                              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                <div>• Grade: {success.changes.before.grade}</div>
                                <div>• Condition: {success.changes.before.condition}</div>
                                <div>• Population: {success.changes.before.population}</div>
                                <div>• Year: {success.changes.before.year}</div>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-green-700 dark:text-green-300 mb-1">After:</div>
                              <div className="space-y-1 text-green-600 dark:text-green-400">
                                <div>• Grade: {success.changes.after.grade}</div>
                                <div>• Condition: {success.changes.after.condition}</div>
                                <div>• Population: {success.changes.after.population}</div>
                                <div>• Year: {success.changes.after.year}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Successfully updated {success.updatedFields?.length || 0} fields
                          </div>
                        )}
                      </div>
                    ))}
                    {results.successful.length > 5 && (
                      <div className="text-sm text-green-600 dark:text-green-400 text-center">
                        ... and {results.successful.length - 5} more cards successfully normalised
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
              How It Works
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Finds all PSA graded cards in your collection with serial numbers</li>
              <li>• Fetches fresh data from PSA for each card</li>
              <li>• Updates card details with the latest PSA information</li>
              <li>• Processes cards one at a time to avoid rate limiting</li>
              <li>• Preserves your existing card data while enhancing it with PSA details</li>
            </ul>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          handleBulkNormalisation();
        }}
        title="Normalise PSA Data"
        message={`This will normalise PSA data for ${eligibleCount} PSA cards in your collection. This process may take several minutes and will reload fresh data from PSA for each card.`}
        confirmText="Normalise Cards"
        cancelText="Cancel"
        variant="primary"
      />
    </div>
  );
};

export default PSADatabaseManager;