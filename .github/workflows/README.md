# GitHub Actions Workflow for Firebase Deployment

This workflow automatically deploys your Firebase Functions to Firebase when you push to the main branch.

## What it does

1. When you push to the main branch, GitHub Actions will:
   - Set up a Node.js environment
   - Install dependencies for both the main project and the functions directory
   - Set the Firebase Functions configuration (including your PriceCharting API key)
   - Deploy your Firebase Functions to Firebase

## Required Secrets

For this workflow to work, you need to add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Add these secrets:
   - `FIREBASE_TOKEN`: Your Firebase CI token (obtained via `firebase login:ci`)
   - `PRICECHARTING_API_KEY`: Your PriceCharting API key

## Troubleshooting

If the deployment fails, check the GitHub Actions logs for error messages. Common issues include:
- Missing secrets
- Syntax errors in your code
- Firebase configuration issues

## Manual Deployment

If you need to deploy manually, you can still use:
```bash
firebase deploy --only functions
```
