# Local Development Setup Guide

This guide explains how to set up the Pokemon Card Tracker application for local development.

## Environment Variables

The application requires Firebase configuration to be set up properly. For local development, you need to create a `.env` file in the root directory with the following variables:

```
# Required Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Optional Firebase Configuration
REACT_APP_FIREBASE_CLIENT_ID=your_google_oauth_client_id

# Required API Keys
REACT_APP_SENDGRID_API_KEY=your_sendgrid_api_key
REACT_APP_POKEMON_TCG_API_KEY=your_pokemon_tcg_api_key

# Required Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID=your_stripe_premium_plan_price_id
```

## Important Notes

1. The `.env` file is excluded from version control by `.gitignore` for security reasons.
2. All required environment variables must be set - the application will fail to start if any are missing.
3. `REACT_APP_FIREBASE_CLIENT_ID` is optional - the app will work without it but Google OAuth may have limited functionality.
4. When deploying to production, ensure your production environment has these environment variables set.
5. For local development on a new computer, you'll need to manually create this file with your actual values.

## Getting Your Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. In the "Your apps" section, find your web app
5. Copy the configuration values to your `.env` file

## Starting the Application

To start the application with increased memory allocation:

```
npm run start
```

Or use the provided batch file:

```
.\start-with-memory.bat
```

## Troubleshooting

If you encounter Firebase authentication errors, verify that:
1. Your `.env` file exists and contains the correct values
2. You have installed all dependencies with `npm install`
3. Your Firebase project is properly configured in the Firebase Console
4. All required environment variables are set (check the console for specific error messages)
