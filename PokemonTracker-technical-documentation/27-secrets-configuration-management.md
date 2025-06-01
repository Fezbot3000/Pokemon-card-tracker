# Secrets and Configuration Management

## Overview

The Pokemon Card Tracker app implements a comprehensive, multi-tier secret management system designed to provide security, flexibility, and reliability across development and production environments. The system prioritizes environment variables for production security while providing fallback mechanisms for development ease and deployment reliability.

## Architecture

### Secret Priority System

The app uses a hierarchical approach to secret management with the following priority order:

1. **Environment Variables** (`REACT_APP_*`) - Production priority
2. **Local Development Config** (`local-config.js`) - Development secrets
3. **Hardcoded Fallbacks** - Last resort for reliability

```javascript
// secrets.js - Centralized secret management
export const getFirebaseConfig = () => {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "fallback_value",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "fallback_value",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "fallback_value",
    // ... additional config
  };
};
```

### Centralized Secret Management

**File**: `src/config/secrets.js`

All API keys and sensitive configuration are managed through a centralized module that provides:

- **Single Source of Truth**: All secrets accessed through one module
- **Usage Tracking**: Monitor which secrets are being accessed
- **Source Reporting**: Track whether secrets come from environment or fallback
- **Debug Support**: Development-time visibility into configuration sources

```javascript
// Track secret usage patterns
const usageTracker = {
  accessed: {},
  track(secretName) {
    this.accessed[secretName] = (this.accessed[secretName] || 0) + 1;
    return secretName;
  },
  getReport() {
    return {
      accessed: { ...this.accessed },
      timestamp: new Date().toISOString()
    };
  }
};
```

## Environment Variables

### Production Environment Variables

**Required for Production Deployment**:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google Authentication
REACT_APP_FIREBASE_CLIENT_ID=your_google_client_id

# Email Services
REACT_APP_SENDGRID_API_KEY=your_sendgrid_api_key
```

### Environment Variable Naming Convention

**Prefix Requirements**:
- All React environment variables must start with `REACT_APP_`
- This prefix makes variables accessible in the browser build
- Variables without this prefix are not available in React components

**Naming Pattern**:
```
REACT_APP_[SERVICE]_[CONFIGURATION_TYPE]
```

Examples:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_SENDGRID_API_KEY`
- `REACT_APP_FIREBASE_PROJECT_ID`

## File-Based Configuration

### Local Development Configuration

**File**: `src/config/local-config.js`

```javascript
// Local configuration file - NOT to be committed to version control
// This file contains sensitive information like API keys for local development

// Export configuration for local development
export const SENDGRID_API_KEY = 'your_local_sendgrid_key';
export const CUSTOM_API_KEY = 'your_local_custom_key';

// Additional local development secrets...
```

**Security Notes**:
- ❌ **Never commit** `local-config.js` to version control
- ✅ **Protected by** `.gitignore`
- ✅ **Development only** - not used in production
- ✅ **Team sharing** through secure channels outside git

### Environment File Protection

**.gitignore Protection**:
```gitignore
# Environment variables
.env
.env.local
.env.development
.env.development.local
.env.test
.env.test.local
.env.production
.env.production.local

# Local configuration
src/config/local-config.js
```

## Firebase Configuration Management

### Hybrid Configuration Approach

The Firebase configuration uses a hybrid approach balancing security and reliability:

```javascript
export const getFirebaseConfig = () => {
  usageTracker.track('firebase.config');
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDIxG9wMoOm0xO72YCAs4RO9YVrGjRcvLQ",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mycardtracker-c8479.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mycardtracker-c8479",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mycardtracker-c8479.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "726820232287",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:726820232287:web:fc27495f506950a78dcfea"
  };
};
```

**Configuration Strategy**:
- **Production**: Use environment variables for security
- **Development**: Environment variables or fallbacks for convenience
- **Deployment**: Fallbacks ensure deployment success even with missing env vars
- **Security**: Firebase API keys are not highly sensitive (client-side anyway)

### Firebase Security Model

**Important Security Notes**:
- Firebase API keys are **not secret** - they're client-side by design
- Real security comes from **Firestore Security Rules**
- API keys serve for **project identification**, not authentication
- **Authentication** handled through Firebase Auth with proper tokens

## API Key Management

### Current API Integrations

**1. Firebase Services**
```javascript
// Firebase configuration managed centrally
const firebaseConfig = getFirebaseConfig();
```

**2. Google Authentication**
```javascript
// Google OAuth client ID
const clientId = getGoogleClientId();
googleProvider.setCustomParameters({
  client_id: clientId,
  prompt: 'select_account'
});
```

**3. SendGrid Email Service**
```javascript
// Email service API key (more sensitive)
const sendGridApiKey = getSendGridApiKey();
// Returns null if not configured - graceful degradation
```

### Adding New API Keys

**Process for New Secrets**:

1. **Add to secrets.js**:
```javascript
export const getNewApiKey = () => {
  usageTracker.track('newApiKey');
  return process.env.REACT_APP_NEW_API_KEY || 
    localConfig.NEW_API_KEY || 
    null; // No fallback for sensitive keys
};
```

2. **Update environment documentation**
3. **Add to local-config.js template**
4. **Update deployment configurations**

## Usage Tracking and Monitoring

### Secret Usage Analytics

The system includes built-in tracking to monitor secret usage patterns:

```javascript
// Automatic usage tracking
const usageTracker = {
  accessed: {},
  track(secretName) {
    this.accessed[secretName] = (this.accessed[secretName] || 0) + 1;
    return secretName;
  },
  getReport() {
    return {
      accessed: { ...this.accessed },
      timestamp: new Date().toISOString()
    };
  }
};

// Scheduled reporting (development only)
setTimeout(() => {
  usageTracker.logReport();
}, 10000);
```

### Configuration Source Debugging

**Debug Configuration Sources**:
```javascript
export const getConfigSources = () => {
  return {
    firebase: {
      apiKey: !!process.env.REACT_APP_FIREBASE_API_KEY ? 'Environment' : 'Fallback',
      authDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Environment' : 'Fallback',
      // ... additional mappings
    },
    googleClientId: !!process.env.REACT_APP_FIREBASE_CLIENT_ID ? 'Environment' : 'Fallback',
    sendgridApiKey: !!process.env.REACT_APP_SENDGRID_API_KEY ? 'Environment' : 'Local Config'
  };
};
```

**Usage in Development**:
```javascript
// Check configuration sources
console.log('Config Sources:', getConfigSources());
console.log('Usage Report:', getSecretUsageReport());
```

## Security Best Practices

### Development Security

1. **Never Commit Secrets**:
   - Use `.gitignore` for all environment files
   - Review commits for accidental secret inclusion
   - Use `local-config.js` for development secrets

2. **Environment Separation**:
   - Different API keys for development/staging/production
   - Separate Firebase projects for environments
   - Isolated database instances

3. **Access Control**:
   - Limit team access to production secrets
   - Use IAM roles for cloud service access
   - Regular secret rotation for sensitive APIs

### Production Security

1. **Environment Variables**:
   - Store all secrets as environment variables
   - Use platform-specific secret management (Vercel, Netlify, etc.)
   - Never log environment variables in production

2. **Network Security**:
   - HTTPS enforcement for all API calls
   - Firestore security rules for data access
   - CORS configuration for API endpoints

3. **Monitoring**:
   - Monitor for secret exposure in logs
   - Track unusual API usage patterns
   - Set up alerts for authentication failures

## Deployment Configuration

### Platform-Specific Setup

**Vercel Deployment**:
```bash
# Add environment variables in Vercel dashboard
vercel env add REACT_APP_FIREBASE_API_KEY production
vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN production
# ... additional variables
```

**Netlify Deployment**:
```bash
# Netlify CLI environment setup
netlify env:set REACT_APP_FIREBASE_API_KEY your_api_key
netlify env:set REACT_APP_FIREBASE_AUTH_DOMAIN your_domain
# ... additional variables
```

**GitHub Actions**:
```yaml
# .github/workflows/deploy.yml
env:
  REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
  REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
  # ... additional secrets
```

### Environment File Templates

**Development .env Template**:
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_dev_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_dev_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_dev_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_dev_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_dev_sender_id
REACT_APP_FIREBASE_APP_ID=your_dev_app_id

# Google Authentication
REACT_APP_FIREBASE_CLIENT_ID=your_dev_google_client_id

# Optional Services
REACT_APP_SENDGRID_API_KEY=your_dev_sendgrid_key
```

## Migration and Updates

### Secret Rotation Process

1. **Generate New Keys**: Create new API keys in service dashboards
2. **Update Environment**: Deploy new environment variables
3. **Test Deployment**: Verify functionality with new keys
4. **Revoke Old Keys**: Remove old keys after successful migration

### Adding New Services

**Step-by-Step Process**:

1. **Service Setup**: Create API keys in service dashboard
2. **Code Integration**: Add getter function to `secrets.js`
3. **Environment Variables**: Define `REACT_APP_*` variables
4. **Local Development**: Add to `local-config.js` template
5. **Documentation**: Update this documentation
6. **Deployment**: Configure in deployment platforms

## Error Handling and Fallbacks

### Graceful Degradation

```javascript
// Handle missing API keys gracefully
export const getSendGridApiKey = () => {
  usageTracker.track('sendgridApiKey');
  const apiKey = process.env.REACT_APP_SENDGRID_API_KEY || 
    localConfig.SENDGRID_API_KEY || 
    null;
  
  if (!apiKey) {
    logger.warn('SendGrid API key not configured - email features disabled');
  }
  
  return apiKey;
};
```

### Feature Flags

```javascript
// Conditional feature enablement based on API key availability
const isEmailEnabled = !!getSendGridApiKey();
const isAnalyticsEnabled = !!getAnalyticsKey();

// Conditional rendering
{isEmailEnabled && <EmailFeatures />}
{isAnalyticsEnabled && <AnalyticsWidget />}
```

## Troubleshooting

### Common Issues

**1. Missing Environment Variables**:
```javascript
// Debug missing variables
console.log('Config Sources:', getConfigSources());
// Check which are using fallbacks vs environment
```

**2. Build-Time vs Runtime**:
- React environment variables are embedded at **build time**
- Changes require **rebuild** to take effect
- Use `process.env` directly, not from variables

**3. Incorrect Prefixes**:
- Must use `REACT_APP_` prefix
- Variables without prefix are not available in browser

### Debug Tools

**Configuration Checker**:
```javascript
// Add to component for debugging
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Configuration Debug:', {
      sources: getConfigSources(),
      usage: getSecretUsageReport(),
      environment: process.env.NODE_ENV
    });
  }
}, []);
```

**Environment Validation**:
```javascript
// Validate critical environment variables
const validateCriticalSecrets = () => {
  const critical = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_PROJECT_ID'
  ];
  
  const missing = critical.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('Missing critical environment variables:', missing);
  }
  
  return missing.length === 0;
};
```

## Dependencies

### Core Dependencies

- **React**: Environment variable processing
- **Firebase**: Configuration and authentication
- **Local Config**: Development secret management

### Security Dependencies

- **`.gitignore`**: File exclusion for secret protection
- **Build Process**: Environment variable injection
- **Platform Configs**: Deployment-specific secret management

## Future Enhancements

### Planned Improvements

1. **Secret Validation**: Runtime validation of secret formats
2. **Encryption**: Local development secret encryption
3. **Secret Rotation**: Automated secret rotation workflows
4. **Audit Logging**: Enhanced secret access logging
5. **Multi-Environment**: Improved environment-specific configurations

### Advanced Security Features

1. **Secret Scanning**: Automated secret detection in code
2. **Key Management**: Integration with cloud key management services
3. **Runtime Protection**: Obfuscation of secrets in browser
4. **Access Policies**: Granular secret access controls

The secrets management system provides a robust foundation for handling sensitive configuration while maintaining security, usability, and reliability across all deployment environments.
