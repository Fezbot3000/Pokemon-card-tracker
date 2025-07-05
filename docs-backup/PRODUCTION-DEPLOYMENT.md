# Pokemon Card Tracker - Production Deployment Guide

This guide provides steps for deploying the Pokemon Card Tracker application to production using Firebase Hosting and Functions.

## Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Firebase project configured
3. Environment variables configured
4. Domain name (optional, for custom domain)

## Deployment Method 1: Firebase Hosting (Recommended)

### Step 1: Build the Application

```bash
# Build for production
npm run build:prod
```

### Step 2: Deploy to Firebase

```bash
# Deploy hosting and functions
npm run deploy

# Or deploy only hosting
npm run deploy:hosting

# Or deploy only functions
npm run deploy:functions
```

### Step 3: Configure Custom Domain (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration steps
4. Firebase will automatically provision SSL certificates

## Deployment Method 2: Static Hosting Services

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build:prod`
3. Set output directory: `build`
4. Deploy automatically on git push

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build:prod`
3. Set publish directory: `build`
4. Deploy automatically on git push

## Environment Configuration

Make sure these environment variables are configured:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Firebase Functions

The application uses Firebase Cloud Functions for:
- PSA database lookups
- Email notifications
- Exchange rate updates
- Marketplace notifications

Functions are deployed automatically with `npm run deploy` or `firebase deploy --only functions`.

## Monitoring and Troubleshooting

### Firebase Console
- Monitor hosting metrics
- Check function logs
- Review Firestore usage

### Performance Monitoring
- Use Firebase Performance Monitoring
- Monitor Core Web Vitals
- Track user engagement

### Error Monitoring
- Check Firebase Crashlytics
- Monitor function error rates
- Review user feedback

## Security Considerations

1. **Firestore Rules**: Ensure proper security rules are in place
2. **API Keys**: Keep API keys secure and rotate regularly
3. **CORS**: Configure CORS properly for production domains
4. **Authentication**: Implement proper user authentication flows

## Backup and Recovery

1. **Firestore Backup**: Set up automated Firestore backups
2. **Storage Backup**: Configure Firebase Storage backup rules
3. **Code Backup**: Ensure code is backed up in version control

## Performance Optimization

1. **Build Optimization**: Use `npm run build:prod` for optimized builds
2. **Image Optimization**: Compress images before upload
3. **Caching**: Configure proper caching headers
4. **CDN**: Use Firebase CDN for global content delivery 