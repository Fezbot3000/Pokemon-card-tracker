import React, { useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import db from '../services/firestore/dbAdapter';
import { CardRepository } from '../repositories/CardRepository';
import featureFlags from '../utils/featureFlags';

/**
 * MoveVerification Component
 *
 * A utility component that verifies card movements between collections
 * by checking both local storage and cloud storage.
 */
const MoveVerification = () => {
  const { user } = useAuth();
  const [lastMoveData, setLastMoveData] = useState(null);
  const [lastChangeData, setLastChangeData] = useState(null);
  const [verificationResults, setVerificationResults] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load last move data from localStorage on mount
  useEffect(() => {
    try {
      const lastMove = localStorage.getItem('lastCardMove');
      if (lastMove) {
        setLastMoveData(JSON.parse(lastMove));
      }

      const lastChange = localStorage.getItem('lastCollectionChange');
      if (lastChange) {
        setLastChangeData(JSON.parse(lastChange));
      }
    } catch (error) {
      console.error('Error loading verification data:', error);
    }
  }, []);

  // Function to verify card movements
  const verifyCardMovements = async () => {
    setIsVerifying(true);
    setVerificationResults(null);

    try {
      const results = {
        localVerification: { success: false, details: [] },
        cloudVerification: { success: false, details: [] },
      };

      // Verify in local storage
      const collections = await db.getCollections();

      // Check batch move
      if (lastMoveData && lastMoveData.cards && lastMoveData.cards.length > 0) {
        const targetCollection = lastMoveData.targetCollection;

        if (collections[targetCollection]) {
          let allFound = true;

          for (const movedCard of lastMoveData.cards) {
            // Check if card exists in target collection
            const foundInTarget = collections[targetCollection].some(
              card => card.slabSerial === movedCard.id
            );

            // Check if card is removed from source collection
            let removedFromSource = true;
            if (
              movedCard.from !== 'Unknown Collection' &&
              collections[movedCard.from]
            ) {
              removedFromSource = !collections[movedCard.from].some(
                card => card.slabSerial === movedCard.id
              );
            }

            results.localVerification.details.push({
              cardId: movedCard.id,
              cardName: movedCard.name,
              foundInTarget,
              removedFromSource,
              success: foundInTarget && removedFromSource,
            });

            if (!foundInTarget || !removedFromSource) {
              allFound = false;
            }
          }

          results.localVerification.success = allFound;
        }
      }

      // Check single card move via dropdown
      if (lastChangeData) {
        const targetCollection = lastChangeData.to;

        if (collections[targetCollection]) {
          // Check if card exists in target collection
          const foundInTarget = collections[targetCollection].some(
            card => card.slabSerial === lastChangeData.cardId
          );

          // Check if card is removed from source collection
          let removedFromSource = true;
          if (
            lastChangeData.from !== 'Unknown Collection' &&
            collections[lastChangeData.from]
          ) {
            removedFromSource = !collections[lastChangeData.from].some(
              card => card.slabSerial === lastChangeData.cardId
            );
          }

          results.localVerification.details.push({
            cardId: lastChangeData.cardId,
            cardName: lastChangeData.cardName,
            foundInTarget,
            removedFromSource,
            success: foundInTarget && removedFromSource,
          });

          if (!foundInTarget || !removedFromSource) {
            results.localVerification.success = false;
          }
        }
      }

      // Verify in cloud storage if feature flag is enabled
      if (featureFlags.enableFirestoreSync && user) {
        const repository = new CardRepository(user.uid);

        // Check batch move
        if (
          lastMoveData &&
          lastMoveData.cards &&
          lastMoveData.cards.length > 0
        ) {
          let allFoundInCloud = true;

          for (const movedCard of lastMoveData.cards) {
            try {
              // Get card from Firestore
              const cloudCard = await repository.getCard(movedCard.id);

              const foundInTargetCollection =
                cloudCard &&
                (cloudCard.collectionId === lastMoveData.targetCollection ||
                  cloudCard.collection === lastMoveData.targetCollection);

              results.cloudVerification.details.push({
                cardId: movedCard.id,
                cardName: movedCard.name,
                foundInTargetCollection,
                success: foundInTargetCollection,
              });

              if (!foundInTargetCollection) {
                allFoundInCloud = false;
              }
            } catch (error) {
              console.error(
                `Error verifying card ${movedCard.id} in cloud:`,
                error
              );
              results.cloudVerification.details.push({
                cardId: movedCard.id,
                cardName: movedCard.name,
                error: error.message,
                success: false,
              });
              allFoundInCloud = false;
            }
          }

          results.cloudVerification.success = allFoundInCloud;
        }

        // Check single card move via dropdown
        if (lastChangeData) {
          try {
            // Get card from Firestore
            const cloudCard = await repository.getCard(lastChangeData.cardId);

            const foundInTargetCollection =
              cloudCard &&
              (cloudCard.collectionId === lastChangeData.to ||
                cloudCard.collection === lastChangeData.to);

            results.cloudVerification.details.push({
              cardId: lastChangeData.cardId,
              cardName: lastChangeData.cardName,
              foundInTargetCollection,
              success: foundInTargetCollection,
            });

            if (!foundInTargetCollection) {
              results.cloudVerification.success = false;
            }
          } catch (error) {
            console.error(
              `Error verifying card ${lastChangeData.cardId} in cloud:`,
              error
            );
            results.cloudVerification.details.push({
              cardId: lastChangeData.cardId,
              cardName: lastChangeData.cardName,
              error: error.message,
              success: false,
            });
            results.cloudVerification.success = false;
          }
        }
      } else {
        results.cloudVerification.success = 'skipped';
        results.cloudVerification.details.push({
          message:
            'Cloud verification skipped - feature flag disabled or user not logged in',
        });
      }

      setVerificationResults(results);
    } catch (error) {
      console.error('Error verifying card movements:', error);
      setVerificationResults({
        error: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Function to clear verification data
  const clearVerificationData = () => {
    localStorage.removeItem('lastCardMove');
    localStorage.removeItem('lastCollectionChange');
    setLastMoveData(null);
    setLastChangeData(null);
    setVerificationResults(null);
  };

  if (!lastMoveData && !lastChangeData) {
    return (
      <div className="mb-4 mt-16 rounded-lg bg-white p-4 shadow dark:bg-[#1B2131] sm:mt-20">
        <h2 className="mb-2 text-lg font-semibold">
          Card Movement Verification
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          No recent card movements detected. Move some cards between collections
          to verify.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 mt-16 rounded-lg bg-white p-4 shadow dark:bg-[#1B2131] sm:mt-20">
      <h2 className="mb-2 text-lg font-semibold">Card Movement Verification</h2>

      {lastMoveData && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Batch Move
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Moved {lastMoveData.cards.length} card(s) to "
            {lastMoveData.targetCollection}" at{' '}
            {new Date(lastMoveData.timestamp).toLocaleString()}
          </p>
          <ul className="mt-2 text-sm">
            {lastMoveData.cards.map((card, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-400">
                • {card.name} (from: {card.from})
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastChangeData && (
        <div className="mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Collection Dropdown Change
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Moved "{lastChangeData.cardName}" from "{lastChangeData.from}" to "
            {lastChangeData.to}" at{' '}
            {new Date(lastChangeData.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {verificationResults && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
            Verification Results
          </h3>

          <div className="mb-3">
            <div className="flex items-center">
              <span className="mr-2 font-medium">Local Storage:</span>
              {verificationResults.localVerification.success === true ? (
                <span className="font-medium text-green-500">✓ Success</span>
              ) : (
                <span className="font-medium text-red-500">✗ Failed</span>
              )}
            </div>
            <ul className="mt-1 text-sm">
              {verificationResults.localVerification.details.map(
                (detail, index) => (
                  <li
                    key={index}
                    className={`${detail.success ? 'text-green-500' : 'text-red-500'}`}
                  >
                    • {detail.cardName}:{' '}
                    {detail.success ? 'Correctly moved' : 'Move failed'}
                    {!detail.success && (
                      <span>
                        {!detail.foundInTarget &&
                          ' (Not found in target collection)'}
                        {!detail.removedFromSource &&
                          ' (Not removed from source collection)'}
                      </span>
                    )}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="mb-3">
            <div className="flex items-center">
              <span className="mr-2 font-medium">Cloud Storage:</span>
              {verificationResults.cloudVerification.success === true ? (
                <span className="font-medium text-green-500">✓ Success</span>
              ) : verificationResults.cloudVerification.success ===
                'skipped' ? (
                <span className="font-medium text-gray-500">⚠ Skipped</span>
              ) : (
                <span className="font-medium text-red-500">✗ Failed</span>
              )}
            </div>
            <ul className="mt-1 text-sm">
              {verificationResults.cloudVerification.details.map(
                (detail, index) => (
                  <li
                    key={index}
                    className={`${detail.success ? 'text-green-500' : detail.message ? 'text-gray-500' : 'text-red-500'}`}
                  >
                    {detail.message
                      ? `• ${detail.message}`
                      : `• ${detail.cardName}: ${detail.success ? 'Correctly synced to cloud' : 'Cloud sync failed'}`}
                    {detail.error && ` (Error: ${detail.error})`}
                  </li>
                )
              )}
            </ul>
          </div>

          {verificationResults.error && (
            <div className="mt-2 text-red-500">
              Error during verification: {verificationResults.error}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex space-x-3">
        <button
          onClick={verifyCardMovements}
          disabled={isVerifying}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify Movements'}
        </button>
        <button
          onClick={clearVerificationData}
          className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          Clear Data
        </button>
      </div>
    </div>
  );
};

export default MoveVerification;
