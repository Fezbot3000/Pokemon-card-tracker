# Secret Management System

This directory contains the centralized secret management system for the Pokemon Card Tracker app.

## How It Works

The secret management system follows this priority order:

1. **Environment Variables**: `REACT_APP_*` variables (for production and CI/CD)
2. **Local Development Secrets**: Values in `local-config.js` (not committed to Git)
3. **Fallback Values**: Hardcoded values as a last resort

## Files

- `secrets.js`: The main module that provides all API keys and secrets
- `local-config.js`: Local development secrets (not committed to Git)

## Usage

Import and use the functions from `secrets.js` to get any API key or secret:

```javascript
import { getGeminiApiKey, getFirebaseConfig } from '../config/secrets';

// Get the Gemini API key
const geminiKey = getGeminiApiKey();

// Get Firebase configuration
const firebaseConfig = getFirebaseConfig();
```

## Environment Variables

For production deployment, set these environment variables:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_CLIENT_ID`
- `REACT_APP_GEMINI_API_KEY`
- `REACT_APP_PRICECHARTING_API_KEY`

## Local Development

1. Create a `.env.local` file in the project root with your secrets
2. For keys that don't use environment variables, add them to `local-config.js`
