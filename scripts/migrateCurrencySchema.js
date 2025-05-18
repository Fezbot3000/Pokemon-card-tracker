// migrateCurrencySchema.js
// Node.js script to migrate Firestore data to the new currency schema.

const admin = require('firebase-admin');

// --- CONFIGURATION ---
// IMPORTANT: Replace with the path to your Firebase Admin SDK service account key
// Download from Firebase Console: Project settings > Service accounts > Generate new private key
const SERVICE_ACCOUNT_PATH = './scripts/service-account-key.json'; // Adjusted path as per suggestion

const FIREBASE_PROJECT_ID = 'mycardtracker-c8479'; // Example Project ID, replace with yours
const DATABASE_URL = `https://${FIREBASE_PROJECT_ID}.firebaseio.com`;

const USER_CARDS_SUBCOLLECTION = 'cards';
const USER_SOLD_ITEMS_SUBCOLLECTION = 'sold-items';

// --- IMPORTANT --- 
// SET TO false TO EXECUTE WRITES. TRUE WILL ONLY LOG ACTIONS.
const DRY_RUN = false; 
// --- IMPORTANT --- 

// --- INITIALIZE FIREBASE ADMIN SDK ---
try {
  admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT_PATH),
    databaseURL: DATABASE_URL,
  });
  console.log('Firebase Admin SDK initialized. Project ID:', admin.app().options.credential.projectId || admin.app().options.projectId);
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Ensure SERVICE_ACCOUNT_PATH is correct and the JSON file is valid.', error);
  process.exit(1);
}

const db = admin.firestore();

// Helper function to check if a value is a number and positive
function isNumberAndPositive(value) {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Infers the original monetary value and currency from AUD and USD fields.
 * @param {object} docData - The document data.
 * @param {string} docId - The document ID for logging.
 * @param {string} audField - The name of the AUD field (e.g., 'investmentAUD').
 * @param {string} usdField - The name of the USD field (e.g., 'investmentUSD').
 * @param {string} fieldDescription - Description for logging (e.g., 'Investment').
 * @returns {{amount: number, currency: string} | null} The inferred value and currency, or null if not found.
 */
function inferMonetaryValue(docData, docId, audField, usdField, fieldDescription) {
  const audValue = docData[audField];
  const usdValue = docData[usdField];

  if (isNumberAndPositive(audValue)) {
    // console.log(`INFO: Card ${docId}: Using ${audField} (${audValue}) for ${fieldDescription}.`);
    return { amount: audValue, currency: 'AUD' };
  } else if (isNumberAndPositive(usdValue)) {
    console.warn(`WARNING: Card ${docId}: ${audField} is invalid or zero. Falling back to ${usdField} (${usdValue}) for ${fieldDescription}.`);
    return { amount: usdValue, currency: 'USD' };
  } else {
    // console.log(`INFO: Card ${docId}: No valid AUD or USD value found for ${fieldDescription}. Defaulting to 0 AUD.`);
    return { amount: 0, currency: 'AUD' }; // Default to 0 AUD if neither is valid/present
  }
}

/**
 * Migrates documents in the 'cards' subcollection for a specific user.
 * @param {admin.firestore.Firestore} db - The Firestore instance.
 * @param {string} userId - The ID of the user whose cards to migrate.
 */
async function migrateUserCardsCollection(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const collectionRef = userRef.collection(USER_CARDS_SUBCOLLECTION);
  console.log(`\nStarting migration for '${USER_CARDS_SUBCOLLECTION}' subcollection for user ${userId}...`);

  let documentsChecked = 0;
  let documentsToUpdate = 0;
  let documentsSkipped = 0; // Already migrated
  let documentsWithWarnings = 0;

  try {
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`No documents found in '${USER_CARDS_SUBCOLLECTION}' subcollection for user ${userId}.`);
      return;
    }

    for (const doc of snapshot.docs) {
      documentsChecked++;
      const cardData = doc.data();
      const cardId = doc.id;
      let updatePayload = {};
      let requiresUpdate = false;
      let hasWarning = false;

      // Check if already migrated
      if (cardData.originalInvestmentCurrency && cardData.originalCurrentValueCurrency) {
        // console.log(`INFO: Card ${cardId} for user ${userId} seems already migrated. Skipping.`);
        documentsSkipped++;
        continue;
      }

      // Investment Amount
      if (cardData.originalInvestmentAmount === undefined || cardData.originalInvestmentCurrency === undefined) {
        const investment = inferMonetaryValue(cardData, cardId, 'investmentAUD', 'investmentUSD', `User ${userId} Card Investment`);
        if (investment) {
          updatePayload.originalInvestmentAmount = investment.amount;
          updatePayload.originalInvestmentCurrency = investment.currency;
          requiresUpdate = true;
          if (investment.currency === 'USD' || (investment.amount === 0 && (!isNumberAndPositive(cardData.investmentAUD) && !isNumberAndPositive(cardData.investmentUSD)))) {
            // Warning if fell back to USD or defaulted to 0 AUD
            if (!hasWarning && (investment.currency === 'USD' || investment.amount === 0)) {
                console.warn(`WARNING: Card ${cardId} for user ${userId}: Check investment value logic.`);
                hasWarning = true; 
            }
          }
        }
      }

      // Current Value
      if (cardData.originalCurrentValueAmount === undefined || cardData.originalCurrentValueCurrency === undefined) {
        const currentValue = inferMonetaryValue(cardData, cardId, 'currentValueAUD', 'currentValueUSD', `User ${userId} Card Current Value`);
        if (currentValue) {
          updatePayload.originalCurrentValueAmount = currentValue.amount;
          updatePayload.originalCurrentValueCurrency = currentValue.currency;
          requiresUpdate = true;
           if (currentValue.currency === 'USD' || (currentValue.amount === 0 && (!isNumberAndPositive(cardData.currentValueAUD) && !isNumberAndPositive(cardData.currentValueUSD)))){
            if (!hasWarning && (currentValue.currency === 'USD' || currentValue.amount === 0)) {
                console.warn(`WARNING: Card ${cardId} for user ${userId}: Check current value logic.`);
                hasWarning = true;
            }
          }
        }
      }

      if (hasWarning) documentsWithWarnings++;

      if (requiresUpdate) {
        documentsToUpdate++;
        if (DRY_RUN) {
          console.log(`DRY RUN: Would update card ${cardId} for user ${userId} with payload:`, JSON.stringify(updatePayload));
        } else {
          await collectionRef.doc(cardId).update(updatePayload);
          console.log(`SUCCESS: Updated card ${cardId} for user ${userId}.`);
        }
      } else if (!documentsSkipped) { // only log if not skipped and not updated (e.g. no relevant fields)
        // console.log(`INFO: No update required for card ${cardId} for user ${userId}.`);
      }
    }

    console.log(`\nSummary for '${USER_CARDS_SUBCOLLECTION}' subcollection for user ${userId}:`);
    console.log(`- Documents checked: ${documentsChecked}`);
    console.log(`- Documents already migrated (skipped): ${documentsSkipped}`);
    console.log(`- Documents that would be/were updated: ${documentsToUpdate}`);
    console.log(`- Documents with warnings (fallback or default): ${documentsWithWarnings}`);

  } catch (error) {
    console.error(`Error migrating '${USER_CARDS_SUBCOLLECTION}' subcollection for user ${userId}:`, error);
  }
}

/**
 * Migrates documents in the 'sold-items' subcollection for a specific user.
 * @param {admin.firestore.Firestore} db - The Firestore instance.
 * @param {string} userId - The ID of the user whose sold items to migrate.
 */
async function migrateUserSoldItemsCollection(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const collectionRef = userRef.collection(USER_SOLD_ITEMS_SUBCOLLECTION);
  console.log(`\nStarting migration for '${USER_SOLD_ITEMS_SUBCOLLECTION}' subcollection for user ${userId}...`);

  let documentsChecked = 0;
  let documentsToUpdate = 0;
  let documentsSkipped = 0;
  let documentsWithWarnings = 0;

  try {
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`No documents found in '${USER_SOLD_ITEMS_SUBCOLLECTION}' subcollection for user ${userId}.`);
      return;
    }

    for (const doc of snapshot.docs) {
      documentsChecked++;
      const soldItemData = doc.data();
      const soldItemId = doc.id;
      let updatePayload = {};
      let requiresUpdate = false;
      let hasWarning = false;

      if (soldItemData.originalPurchaseCurrency && soldItemData.originalSaleCurrency) {
        // console.log(`INFO: Sold item ${soldItemId} for user ${userId} seems already migrated. Skipping.`);
        documentsSkipped++;
        continue;
      }

      // Purchase Price
      if (soldItemData.originalPurchaseAmount === undefined || soldItemData.originalPurchaseCurrency === undefined) {
        const purchasePrice = inferMonetaryValue(soldItemData, soldItemId, 'purchasePriceAUD', 'purchasePriceUSD', `User ${userId} Sold Item Purchase Price`);
        if (purchasePrice) {
          updatePayload.originalPurchaseAmount = purchasePrice.amount;
          updatePayload.originalPurchaseCurrency = purchasePrice.currency;
          requiresUpdate = true;
          if (purchasePrice.currency === 'USD' || (purchasePrice.amount === 0 && (!isNumberAndPositive(soldItemData.purchasePriceAUD) && !isNumberAndPositive(soldItemData.purchasePriceUSD)))){
            if(!hasWarning && (purchasePrice.currency === 'USD' || purchasePrice.amount === 0)) {
                console.warn(`WARNING: Sold item ${soldItemId} for user ${userId}: Check purchase price logic.`);
                hasWarning = true;
            }
          }
        }
      }

      // Sale Price
      if (soldItemData.originalSaleAmount === undefined || soldItemData.originalSaleCurrency === undefined) {
        const salePrice = inferMonetaryValue(soldItemData, soldItemId, 'salePriceAUD', 'salePriceUSD', `User ${userId} Sold Item Sale Price`);
        if (salePrice) {
          updatePayload.originalSaleAmount = salePrice.amount;
          updatePayload.originalSaleCurrency = salePrice.currency;
          requiresUpdate = true;
          if (salePrice.currency === 'USD' || (salePrice.amount === 0 && (!isNumberAndPositive(soldItemData.salePriceAUD) && !isNumberAndPositive(soldItemData.salePriceUSD)))){
             if(!hasWarning && (salePrice.currency === 'USD' || salePrice.amount === 0)){
                console.warn(`WARNING: Sold item ${soldItemId} for user ${userId}: Check sale price logic.`);
                hasWarning = true;
             }
          }
        }
      }

      if (hasWarning) documentsWithWarnings++;

      if (requiresUpdate) {
        documentsToUpdate++;
        if (DRY_RUN) {
          console.log(`DRY RUN: Would update sold item ${soldItemId} for user ${userId} with payload:`, JSON.stringify(updatePayload));
        } else {
          await collectionRef.doc(soldItemId).update(updatePayload);
          console.log(`SUCCESS: Updated sold item ${soldItemId} for user ${userId}.`);
        }
      } else if (!documentsSkipped) {
        // console.log(`INFO: No update required for sold item ${soldItemId} for user ${userId}.`);
      }
    }

    console.log(`\nSummary for '${USER_SOLD_ITEMS_SUBCOLLECTION}' subcollection for user ${userId}:`);
    console.log(`- Documents checked: ${documentsChecked}`);
    console.log(`- Documents already migrated (skipped): ${documentsSkipped}`);
    console.log(`- Documents that would be/were updated: ${documentsToUpdate}`);
    console.log(`- Documents with warnings (fallback or default): ${documentsWithWarnings}`);

  } catch (error) {
    console.error(`Error migrating '${USER_SOLD_ITEMS_SUBCOLLECTION}' subcollection for user ${userId}:`, error);
  }
}

async function main() {
  if (DRY_RUN) {
    console.log('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('!!! DRY RUN MODE ENABLED !!!');
    console.log('!!! No actual data will be written to Firestore. !!!');
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
  }

  const usersCollectionRef = db.collection('users');
  let usersSnapshot;
  try {
    usersSnapshot = await usersCollectionRef.get();
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return;
  }

  if (usersSnapshot.empty) {
    console.log('No users found to process.');
    return;
  }

  console.log(`Found ${usersSnapshot.docs.length} user(s) to process.`);

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`\n========================================`);
    console.log(`Processing user: ${userId}`);
    console.log(`========================================`);
    await migrateUserCardsCollection(db, userId);
    await migrateUserSoldItemsCollection(db, userId);
  }

  console.log('\nMigration script finished.');
  if (DRY_RUN) {
    console.log('This was a DRY RUN. No data was changed.');
  }
}

main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});
