# Secret Management System

This directory contains the centralized secret management system for the Pokemon Card Tracker app.

## How It Works

The secret management system sources all API keys and secrets exclusively from environment variables. **No fallback values or hardcoded keys are used.**

Missing environment variables will cause the application to fail with clear error messages, ensuring proper configuration.

## Files

- `secrets.js`: The main module that provides all API keys and secrets from environment variables
- `local-config.js`: Legacy file (no longer used)

## Usage

Import and use the functions from `secrets.js` to get any API key or secret:

```javascript
import { getPokemonTcgApiKey, getFirebaseConfig } from '../config/secrets';

// Get the Pokemon TCG API key
const pokemonTcgKey = getPokemonTcgApiKey();

// Get Firebase configuration
const firebaseConfig = getFirebaseConfig();
```

## Required Environment Variables

For both development and production, you must set these environment variables in your `.env` file:

### Firebase Configuration (Required)
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

### Firebase Configuration (Optional)
- `REACT_APP_FIREBASE_CLIENT_ID` (for Google OAuth - app will work without this)

### API Keys
- `REACT_APP_SENDGRID_API_KEY`
- `REACT_APP_POKEMON_TCG_API_KEY`

### Stripe Configuration
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID`

### Backend Environment Variables (for Firebase Functions)
- `PSA_API_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Local Development

1. Create a `.env` file in the project root with all required variables
2. The application will fail to start if any required environment variable is missing
3. Check the console for specific error messages about missing variables

## Error Handling

If any required environment variable is missing, the application will throw a descriptive error:

```
Missing required environment variable: REACT_APP_FIREBASE_API_KEY (Firebase API Key). Please check your .env file.
```
