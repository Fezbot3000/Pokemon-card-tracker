# Deploying the Shared PSA Database

Follow these steps to deploy the shared PSA database to your Firebase project:

## 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

## 2. Login to Firebase

```bash
firebase login
```

## 3. Initialize Firebase Functions (if not already initialized)

```bash
cd functions
npm install
```

## 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## 5. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

## 6. Verify Deployment

After deployment, check the Firebase Console to verify:
- The Firestore rules are updated
- The Firebase Functions are deployed and running

## 7. Test the Shared PSA Database

1. Search for a PSA card using the app
2. Check the Firebase Console to see if the card data is saved to the `psa_cards` collection
3. Search for the same card again and verify it's retrieved from the database (check console logs)

## 8. Monitor API Usage

Keep an eye on your PSA API usage to confirm it's decreasing as more cards are added to the shared database.
