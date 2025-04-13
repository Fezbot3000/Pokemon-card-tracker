Firebase and Toast Fixes for Version 59eb174

## Firebase Initialization Fix

Fixed issue with multiple Firestore initializations that caused the error:
`FirebaseError: initializeFirestore() has already been called with different options.`

1. Updated src/services/firebase.js to use getFirestore() consistently
2. Removed enableIndexedDbPersistence code that could cause conflicts
3. Simplified the Firebase initialization for better reliability

## How to Run

1. Make sure you have all environment variables set up correctly
2. Run 'npm install' to install dependencies
3. Run 'npm start' to start the development server

## Troubleshooting

If you continue to see Firebase initialization errors, you may need to clear your browser cache or use incognito mode.

