# Local Development Setup Guide

This guide explains how to set up the Pokemon Card Tracker application for local development.

## Environment Variables

The application requires Firebase configuration to be set up properly. For local development, you need to create a `.env.local` file in the root directory with the following variables:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyCVy6jUYutMLSyTCVBww38JNdKbAS6W9ak
REACT_APP_FIREBASE_AUTH_DOMAIN=mycardtracker-c8479.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mycardtracker-c8479
REACT_APP_FIREBASE_STORAGE_BUCKET=mycardtracker-c8479.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=726820232287
REACT_APP_FIREBASE_APP_ID=1:726820232287:web:fc2749f506950a78dcfea
```

## Important Notes

1. The `.env.local` file is excluded from version control by `.gitignore` for security reasons.
2. When deploying to production, ensure your production environment has these environment variables set.
3. For local development on a new computer, you'll need to manually create this file.

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
1. Your `.env.local` file exists and contains the correct values
2. You have installed all dependencies with `npm install`
3. Your Firebase project is properly configured in the Firebase Console
