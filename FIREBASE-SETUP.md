# Firebase Setup with Restricted API Keys

This guide will help you properly configure Firebase with restricted API keys for better security.

## Step 1: Set Up Environment Variables

1. Copy `.env.local.example` to a new file called `.env.local`:
   ```
   cp .env.local.example .env.local
   ```

2. Fill in your actual Firebase configuration values in `.env.local`

## Step 2: Configure API Key Restrictions in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your API key and click **Edit**
4. Under **API restrictions**, select the following APIs:
   - Token Service API
   - Identity Toolkit API
   - Cloud Firestore API
   - Firebase Cloud Messaging API
   - Firebase Installations API
   - Firebase Management API
5. Under **Application restrictions**, select **HTTP referrers**
6. Add your allowed websites:
   - For development: `http://localhost:3000/*`, `http://localhost:5000/*`
   - For production: Add your actual domain, e.g., `https://your-domain.com/*`
7. Click **Save**

## Step 3: Configure OAuth Client ID for Google Authentication

If you're using Google Authentication:

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Under **OAuth 2.0 Client IDs**, find or create a client ID for your web application
3. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`, `http://localhost:5000`
   - For production: `https://your-domain.com`
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000`, `http://localhost:5000`
   - For production: `https://your-domain.com`
5. Copy the Client ID and update `REACT_APP_FIREBASE_CLIENT_ID` in your `.env.local` file

## Step 4: Update Firebase Security Rules

Update your Firebase security rules to protect your data:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to your project
3. Go to **Firestore Database** > **Rules** tab
4. Copy the rules from `firebase-rules.txt` file in this project
5. Click **Publish**
6. Repeat for **Storage** rules if you're using Firebase Storage

## Step 5: Testing Your Configuration

1. Stop any running development server
2. Start a fresh server:
   ```
   npm run start
   ```
3. Check the console logs to ensure all environment variables are properly loaded
4. Test authentication by signing in or creating a new account
5. If you encounter any errors, refer to the troubleshooting section below

## Troubleshooting

### Common Issues

1. **"Authentication error: Firebase: Error (auth/api-key-not-valid...)"**
   - Verify your API key is correct in `.env.local`
   - Check that you've added the correct HTTP referrers in API key restrictions
   - Make sure all required APIs are enabled for your API key

2. **"Authentication error: Firebase: Error (auth/unauthorized-domain)"**
   - Go to Firebase Console > Authentication > Settings > Authorized domains
   - Add `localhost` and your production domain

3. **"Failed to get document because the client is offline"**
   - Check your internet connection
   - Verify Firestore rules allow read/write operations

### Debug Logging

To enable more detailed Firebase logging:

```javascript
// Add this to your src/index.js file
if (process.env.NODE_ENV === 'development') {
  window.localStorage.setItem('debug', 'firebase:*');
}
```

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Cloud API Keys Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Rules](https://firebase.google.com/docs/rules) 