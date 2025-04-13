# Pokémon Card Tracker - Server

This is the backend server for the Pokémon Card Tracker application.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Fill in the environment variables:

- **FIREBASE_PROJECT_ID**: Your Firebase project ID
- **GOOGLE_APPLICATION_CREDENTIALS**: Path to your Firebase service account JSON file
- **CLIENT_URL**: URL of your frontend application
- **PORT**: The port to run the server on (default is 3001)

4. Get Firebase service account credentials:
   - Go to your Firebase console
   - Navigate to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely and update the path in `.env`

## Running the server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Deployment

When deploying to production:

1. Set up the production environment variables
2. Make sure the Firebase service account has the necessary permissions
3. Set up proper error logging and monitoring 