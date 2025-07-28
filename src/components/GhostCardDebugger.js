import React, { useState } from 'react';
import { useCards } from '../contexts/CardContext';
import { LoggingService } from '../services/LoggingService';
import { toast } from 'react-hot-toast';

/**
 * Debug component for detecting and cleaning up ghost cards
 * This component provides manual cleanup for data consistency issues
 */
export function GhostCardDebugger({ isOpen, onClose }) {
  const { cards, detectAndCleanGhostCards } = useCards();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleDetectAndClean = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setResults(null);

    try {
      LoggingService.info('[GhostCardDebugger] Starting ghost card detection...');
      
      const detectionResults = await detectAndCleanGhostCards();
      
      if (detectionResults) {
        setResults(detectionResults);
        
        if (detectionResults.summary.ghostCardsFound > 0) {
          toast.success(
            `Found and cleaned ${detectionResults.summary.ghostCardsRemoved} ghost cards`,
            { duration: 5000 }
          );
        } else {
          toast.success('No ghost cards found - your data is clean!', { duration: 3000 });
        }
      } else {
        toast.error('Ghost card detection failed - check console for details');
      }
    } catch (error) {
      LoggingService.error('[GhostCardDebugger] Error:', error);
      toast.error(`Error during ghost card detection: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Ghost Card Debugger</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isRunning}
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This tool detects "ghost cards" - cards that appear in your interface but don't exist in the database.
            This can happen when deletion operations partially fail.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Current Status:</h3>
            <p className="text-blue-700">
              Frontend cards: <span className="font-mono">{cards.length}</span>
            </p>
          </div>

          <button
            onClick={handleDetectAndClean}
            disabled={isRunning || cards.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-semibold ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : cards.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Detecting and Cleaning...' : 'Detect & Clean Ghost Cards'}
          </button>
        </div>

        {results && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Detection Results</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Frontend Cards</div>
                <div className="text-xl font-bold">{results.summary.totalFrontendCards}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Valid Cards</div>
                <div className="text-xl font-bold text-green-600">{results.summary.validCards}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Ghost Cards Found</div>
                <div className="text-xl font-bold text-red-600">{results.summary.ghostCardsFound}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Ghost Cards Removed</div>
                <div className="text-xl font-bold text-blue-600">{results.summary.ghostCardsRemoved}</div>
              </div>
            </div>

            {results.detection.ghostCards.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Ghost Cards Details:</h4>
                <div className="max-h-40 overflow-y-auto border rounded">
                  {results.detection.ghostCards.map((ghost, index) => (
                    <div key={index} className="p-2 border-b last:border-b-0 text-sm">
                      <div className="font-mono text-red-600">ID: {ghost.id}</div>
                      <div className="text-gray-700">Name: {ghost.cardName}</div>
                      <div className="text-gray-600">Collection: {ghost.collection}</div>
                      {ghost.slabSerial && (
                        <div className="text-gray-600">Serial: {ghost.slabSerial}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.summary.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                <div className="max-h-32 overflow-y-auto border rounded">
                  {results.summary.errors.map((error, index) => (
                    <div key={index} className="p-2 border-b last:border-b-0 text-sm text-red-600">
                      {error.cardId ? `Card ${error.cardId}: ` : ''}{error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4 mt-6">
          <p className="text-xs text-gray-500">
            This is a debugging tool. Once your data is clean, you won't need to use this again.
            Results are logged to the browser console for technical review.
          </p>
        </div>
      </div>
    </div>
  );
} 