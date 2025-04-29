# Firestore Security Rules Update

To fix the permissions error when accessing the PSA database, add these rules to your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Basic rules for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // PSA card collection - allow reads for all users
    // but only allow writes from authenticated users
    match /psa_cards/{certNumber} {
      allow read: if true;  // Anyone can read PSA data
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

## How to Deploy These Rules

1. Go to the Firebase Console
2. Select your project
3. Go to Firestore Database
4. Click on the "Rules" tab
5. Replace the existing rules with the ones above
6. Click "Publish"

## Alternative: Deploy from Command Line

If you prefer to deploy from the command line:

1. Save these rules to a file named `firestore.rules`
2. Run: `firebase deploy --only firestore:rules`

These rules will allow anyone to read PSA card data but only authenticated users can write to the database. This ensures your shared PSA database is accessible to all users while preventing unauthorized modifications.
