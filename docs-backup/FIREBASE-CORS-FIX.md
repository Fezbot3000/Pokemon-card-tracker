# Firebase Storage CORS Fix

## Problem
Users are getting CORS errors when trying to upload card images from the production domain `mycardtracker.com.au`:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/mycardtracker-c8479.firebaseapp.com/o?name=users%2F...' from origin 'https://mycardtracker.com.au' has been blocked by CORS policy
```

## Root Cause
Firebase Storage CORS configuration hasn't been applied to allow uploads from the production domain.

## Solution

### Step 1: Install Google Cloud SDK (if not already installed)
```bash
# Download and install from: https://cloud.google.com/sdk/docs/install
# Or use package manager:
# macOS: brew install google-cloud-sdk
# Ubuntu: sudo apt-get install google-cloud-sdk
```

### Step 2: Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project mycardtracker-c8479
```

### Step 3: Apply CORS Configuration
```bash
# Make the script executable
chmod +x setup-firebase-cors.sh

# Run the CORS setup script
./setup-firebase-cors.sh
```

### Alternative Manual Method
If the script doesn't work, apply CORS manually:

```bash
# Use the fixed CORS configuration file
gsutil cors set firebase-storage-cors-fixed.json gs://mycardtracker-c8479.firebasestorage.app

# Verify the configuration was applied
gsutil cors get gs://mycardtracker-c8479.firebasestorage.app
```

### Step 4: Verify the Fix
1. Deploy the latest version to production
2. Test adding a card with an image upload
3. Check browser console for any remaining CORS errors

## CORS Configuration Details
The CORS configuration allows:
- **Origins**: Production domain, localhost for development
- **Methods**: GET, PUT, POST, DELETE, HEAD, OPTIONS
- **Headers**: All necessary headers for file uploads
- **Max Age**: 3600 seconds (1 hour)

## Additional Notes
- This fix only needs to be applied once per Firebase project
- If you change domains, you'll need to update the CORS configuration
- The configuration includes both `mycardtracker.com.au` and `www.mycardtracker.com.au`

## Troubleshooting
If CORS errors persist:
1. Clear browser cache and cookies
2. Check that the correct Firebase project is being used
3. Verify the storage bucket name matches your project
4. Ensure the user is properly authenticated before uploading

## Files Modified
- `firebase-storage-cors-fixed.json` - Corrected CORS configuration
- `setup-firebase-cors.sh` - Automated setup script
- `FIREBASE-CORS-FIX.md` - This documentation
