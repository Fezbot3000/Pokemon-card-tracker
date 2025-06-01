# Email Systems Documentation

## Overview

The Pokemon Card Tracker app implements a comprehensive email notification system powered by SendGrid and Firebase Functions. The system handles user lifecycle emails, marketplace notifications, authentication flows, and admin communications with a robust, scalable architecture.

## Architecture

### System Components

The email system consists of three main layers:

1. **Frontend Email Service** (`src/services/emailService.js`) - Client-side interface
2. **Firebase Functions** (`functions/src/emailFunctions.js`) - Server-side triggers and handlers
3. **SendGrid Integration** (`functions/src/emailService.js`) - Email delivery service

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Firebase       │    │   SendGrid      │
│   Components    │────│   Functions     │────│   Templates     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Email Flow Architecture

```javascript
// Frontend trigger
emailService.sendMarketplaceNotification(email, sender, message, listing)
    ↓
// Firebase Function (HTTPS callable)
sendMarketplaceMessageEmail()
    ↓
// SendGrid service
emailService.sendMarketplaceMessage()
    ↓
// SendGrid API + Dynamic Template
Template: d-a3ec6f68150c4f469bebc920910993f9
```

## Frontend Email Service

### File: `src/services/emailService.js`

The frontend service provides a clean interface for triggering email functions:

```javascript
class EmailServiceHelper {
  constructor() {
    // Initialize Firebase Functions callable methods
    this.sendWelcomeEmail = httpsCallable(functions, 'sendWelcomeEmail');
    this.sendMarketplaceMessageEmail = httpsCallable(functions, 'sendMarketplaceMessageEmail');
    this.sendListingSoldEmail = httpsCallable(functions, 'sendListingSoldEmail');
    this.sendEmailVerificationEmail = httpsCallable(functions, 'sendEmailVerificationEmail');
    this.sendCustomEmail = httpsCallable(functions, 'sendCustomEmail');
    this.sendFeedbackEmail = httpsCallable(functions, 'sendFeedbackEmail');
  }
}
```

### Frontend Email Methods

**1. Marketplace Message Notifications**
```javascript
async sendMarketplaceNotification(recipientEmail, senderName, message, listingTitle) {
  try {
    const result = await this.sendMarketplaceMessageEmail({
      recipientEmail,
      senderName,
      message,
      listingTitle
    });
    return result.data;
  } catch (error) {
    console.error('Error sending marketplace message email:', error);
    throw error;
  }
}
```

**2. Listing Sold Notifications**
```javascript
async sendListingSoldNotification(userEmail, userName, listingTitle, salePrice) {
  const result = await this.sendListingSoldEmail({
    userEmail,
    userName,
    listingTitle,
    salePrice
  });
  return result.data;
}
```

**3. Email Verification**
```javascript
async sendEmailVerification(userEmail, verificationLink) {
  const result = await this.sendEmailVerificationEmail({ 
    userEmail, 
    verificationLink 
  });
  return result.data;
}
```

**4. Custom Email Messages**
```javascript
async sendCustomEmailMessage(to, subject, htmlContent) {
  const result = await this.sendCustomEmail({ to, subject, htmlContent });
  return result.data;
}
```

## Firebase Functions Backend

### File: `functions/src/emailFunctions.js`

The Firebase Functions layer handles authentication, data validation, and email triggering:

### Authentication Email Triggers

**Welcome Email (Auto-triggered)**
```javascript
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  try {
    const { email, displayName } = user;
    
    if (email) {
      await emailService.sendWelcomeEmail(email, displayName);
      console.log(`Welcome email sent to ${email}`);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
});
```

### HTTPS Callable Functions

**Marketplace Message Email**
```javascript
exports.sendMarketplaceMessageEmail = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { recipientEmail, senderName, message, listingTitle } = data;
  await emailService.sendMarketplaceMessage(recipientEmail, senderName, message, listingTitle);

  return { success: true, message: 'Marketplace message email sent successfully' };
});
```

**Listing Sold Email**
```javascript
exports.sendListingSoldEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userEmail, userName, listingTitle, salePrice } = data;
  await emailService.sendListingSold(userEmail, userName, listingTitle, salePrice);

  return { success: true, message: 'Listing sold email sent successfully' };
});
```

### Firestore Triggers

**Real-time Message Notifications**
```javascript
exports.sendMarketplaceMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const chatId = context.params.chatId;
    
    // Skip system messages
    if (message.type === 'system') {
      return;
    }

    // Get chat and user details
    const chatDoc = await db.collection('chats').doc(chatId).get();
    const chat = chatDoc.data();
    
    // Determine sender/recipient
    const senderId = message.senderId;
    const recipientId = chat.buyerId === senderId ? chat.sellerId : chat.buyerId;

    // Send notification email
    await emailService.sendMarketplaceMessage(
      recipient.email,
      recipient.displayName,
      senderName,
      cardName,
      messagePreview
    );
  });
```

**Listing Status Change Triggers**
```javascript
exports.sendListingSoldNotification = functions.firestore
  .document('marketplaceItems/{listingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to 'sold'
    if (before.status !== 'sold' && after.status === 'sold') {
      const sellerId = after.sellerId;
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      const seller = sellerDoc.data();

      await emailService.sendListingSold(
        seller.email,
        seller.displayName,
        cardName,
        `$${salePrice} AUD`
      );
    }
  });
```

## SendGrid Integration Layer

### File: `functions/src/emailService.js`

The SendGrid service handles the actual email delivery with templates and dynamic content:

### Configuration

```javascript
// SendGrid API key from Firebase config
const apiKey = functions.config().sendgrid?.api_key;
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key not configured');
}

// Dynamic template IDs
const EMAIL_TEMPLATES = {
  WELCOME: 'd-e480237baa62442b9bae651a8333b25d',
  EMAIL_VERIFICATION: 'd-80d372d269dc479697fbf3cfec743d1c',
  MARKETPLACE_MESSAGE: 'd-a3ec6f68150c4f469bebc920910993f9',
  LISTING_SOLD: 'd-a3ec6f68150c4f469bebc920910993f9'
};
```

### Core Email Service Class

```javascript
class EmailService {
  constructor() {
    this.fromEmail = 'noreply@mycardtracker.com.au';
    this.fromName = 'MyCardTracker';
  }

  async sendEmail(to, templateId, dynamicTemplateData = {}, subject = null) {
    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      templateId,
      dynamicTemplateData: {
        ...dynamicTemplateData,
        app_name: 'MyCardTracker',
        app_url: 'https://mycardtracker.com.au',
        support_email: 'support@mycardtracker.com.au'
      }
    };

    const result = await sgMail.send(msg);
    return result;
  }
}
```

### Email Type Implementations

**Welcome Email**
```javascript
async sendWelcomeEmail(userEmail, userName) {
  return this.sendEmail(
    userEmail,
    EMAIL_TEMPLATES.WELCOME,
    {
      user_name: userName || 'Card Collector',
      login_url: 'https://mycardtracker.com.au/login'
    }
  );
}
```

**Marketplace Message**
```javascript
async sendMarketplaceMessage(userEmail, senderName, message, listingTitle) {
  return this.sendEmail(
    userEmail,
    EMAIL_TEMPLATES.MARKETPLACE_MESSAGE,
    {
      sender_name: senderName,
      message: message,
      listing_title: listingTitle,
      marketplace_url: 'https://mycardtracker.com.au/marketplace'
    }
  );
}
```

**Listing Sold Notification**
```javascript
async sendListingSold(userEmail, userName, listingTitle, salePrice) {
  return this.sendEmail(
    userEmail,
    EMAIL_TEMPLATES.LISTING_SOLD,
    {
      user_name: userName,
      listing_title: listingTitle,
      sale_price: salePrice,
      dashboard_url: 'https://mycardtracker.com.au/dashboard'
    }
  );
}
```

## Email Templates

### SendGrid Dynamic Templates

The app uses SendGrid's dynamic template system with pre-built template IDs:

**Template Structure**:
- **Welcome Email**: `d-e480237baa62442b9bae651a8333b25d`
- **Email Verification**: `d-80d372d269dc479697fbf3cfec743d1c`
- **Marketplace Message**: `d-a3ec6f68150c4f469bebc920910993f9`
- **Listing Sold**: `d-a3ec6f68150c4f469bebc920910993f9`

### Fallback HTML Templates

### File: `functions/src/emailTemplates.js`

For testing and backup purposes, the app includes HTML template generators:

**Welcome Email Template**
```javascript
const generateWelcomeEmailHTML = (userName) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to MyCardTracker</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to MyCardTracker!</h1>
        </div>
        <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Welcome to MyCardTracker, the ultimate platform for managing your trading card collection!</p>
        </div>
    </div>
</body>
</html>
`;
```

## Authentication Email Integration

### Firebase Authentication Emails

**Password Reset Integration**
```javascript
// AuthContext.js - Frontend
const resetPassword = async (email) => {
  try {
    setError(null);
    await sendPasswordResetEmail(auth, email);
    toast.success('Password reset email sent!');
  } catch (err) {
    const errorMessage = handleFirebaseError(err);
    setError(errorMessage);
    toast.error(errorMessage);
    throw err;
  }
};
```

**Email/Password Authentication**
```javascript
// Sign up with email verification
const signUp = async ({ email, password, displayName }) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with display name
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  
  // Create user document in Firestore
  await createUserDocument(result.user);
  
  // Welcome email is automatically triggered by Firebase Auth onCreate
  return result.user;
};
```

### Custom Email Verification

**Email Verification Flow**
```javascript
// Custom email verification (if needed beyond Firebase Auth)
async sendEmailVerification(userEmail, verificationLink) {
  return this.sendEmail(
    userEmail,
    EMAIL_TEMPLATES.EMAIL_VERIFICATION,
    {
      verification_link: verificationLink,
      app_name: 'MyCardTracker'
    }
  );
}
```

## Email Configuration and Security

### Secret Management Integration

As documented in the secrets management system, SendGrid API keys are handled through the multi-tier approach:

**Configuration Priority**:
1. **Firebase Functions Config**: `firebase functions:config:set sendgrid.api_key="YOUR_KEY"`
2. **Environment Variables**: `REACT_APP_SENDGRID_API_KEY`
3. **Local Development**: `local-config.js` file

```javascript
// secrets.js integration
export const getSendGridApiKey = () => {
  usageTracker.track('sendgridApiKey');
  return process.env.REACT_APP_SENDGRID_API_KEY || 
    localConfig.SENDGRID_API_KEY || 
    null; // No fallback for security
};
```

### Firebase Functions Configuration

**Setting SendGrid API Key**:
```bash
# Production configuration
firebase functions:config:set sendgrid.api_key="SG.your_actual_api_key_here"

# Verify configuration
firebase functions:config:get
```

**Functions Environment**:
```javascript
// functions/src/emailService.js
const apiKey = functions.config().sendgrid?.api_key;
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key not configured. Please set using: firebase functions:config:set sendgrid.api_key="YOUR_KEY"');
}
```

## Email Types and Use Cases

### 1. Welcome Emails

**Trigger**: User account creation
**Template**: Welcome template with personalized greeting
**Data**: User name, login URL, app features
**Timing**: Immediate upon Firebase Auth user creation

### 2. Marketplace Notifications

**Trigger**: New message in marketplace chat
**Template**: Message notification with sender/listing details
**Data**: Sender name, message preview, listing title, marketplace URL
**Timing**: Real-time Firestore trigger

### 3. Listing Sold Alerts

**Trigger**: Marketplace item status changes to 'sold'
**Template**: Congratulations email with sale details
**Data**: Listing title, sale price, seller name, dashboard URL
**Timing**: Real-time Firestore trigger

### 4. Password Reset

**Trigger**: User requests password reset
**Template**: Firebase Auth built-in template
**Data**: Reset link, user email
**Timing**: Immediate upon reset request

### 5. Email Verification

**Trigger**: Custom verification flows (optional)
**Template**: Verification email with action link
**Data**: Verification link, app name
**Timing**: On-demand via function call

### 6. Custom Admin Emails

**Trigger**: Admin action
**Template**: Custom HTML content
**Data**: Variable content based on admin input
**Timing**: On-demand via admin interface

## Error Handling and Monitoring

### Frontend Error Handling

```javascript
// emailService.js - Frontend error handling
async sendMarketplaceNotification(recipientEmail, senderName, message, listingTitle) {
  try {
    const result = await this.sendMarketplaceMessageEmail({
      recipientEmail,
      senderName,
      message,
      listingTitle
    });
    return result.data;
  } catch (error) {
    console.error('Error sending marketplace message email:', error);
    throw error;
  }
}
```

### Backend Error Handling

```javascript
// emailFunctions.js - Firebase Functions error handling
exports.sendMarketplaceMessageEmail = functions.https.onCall(async (data, context) => {
  try {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipientEmail, senderName, message, listingTitle } = data;
    await emailService.sendMarketplaceMessage(recipientEmail, senderName, message, listingTitle);

    return { success: true, message: 'Marketplace message email sent successfully' };
  } catch (error) {
    console.error('Error sending marketplace message email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

### SendGrid Error Handling

```javascript
// emailService.js - SendGrid error handling
async sendEmail(to, templateId, dynamicTemplateData = {}, subject = null) {
  try {
    const msg = {
      to,
      from: { email: this.fromEmail, name: this.fromName },
      templateId,
      dynamicTemplateData
    };

    const result = await sgMail.send(msg);
    console.log('Email sent successfully:', { to, templateId });
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
```

## Authentication and Security

### Function Authentication

**HTTPS Callable Functions**: Require authenticated users
```javascript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
}
```

**Admin-Only Functions**: Require admin token
```javascript
if (!context.auth || !context.auth.token.admin) {
  throw new functions.https.HttpsError('permission-denied', 'Admin access required');
}
```

### Data Validation

**Input Validation**:
- Email format validation
- Required field checks
- Content length limits
- HTML sanitization for custom emails

**Security Measures**:
- User authentication required for all email triggers
- Admin-only access for custom emails
- Rate limiting through Firebase Functions
- Input sanitization for dynamic content

## Testing and Development

### Email Testing

**Development Testing**:
```javascript
// functions/src/emailTester.js
const testWelcomeEmail = async () => {
  const emailService = require('./emailService');
  await emailService.sendWelcomeEmail('test@example.com', 'Test User');
};

// SendGrid test file
// functions/sendgrid-test.js
const sgMail = require('@sendgrid/mail');
// Test SendGrid configuration and template rendering
```

**Template Testing**:
```javascript
// Use backup HTML templates for development
const { generateWelcomeEmailHTML } = require('./emailTemplates');
const htmlContent = generateWelcomeEmailHTML('Test User');
await emailService.sendCustomEmail('test@example.com', 'Welcome Test', htmlContent);
```

### Local Development

**Firebase Functions Emulator**:
```bash
# Start functions emulator
firebase emulators:start --only functions

# Test email functions locally
curl -X POST http://localhost:5001/mycardtracker-c8479/us-central1/sendWelcomeEmail \
  -H "Content-Type: application/json" \
  -d '{"data": {"userEmail": "test@example.com", "userName": "Test User"}}'
```

**Environment Setup**:
```bash
# Set local SendGrid key for testing
firebase functions:config:set sendgrid.api_key="SG.test_key_here"

# Or use local-config.js for development
echo 'export const SENDGRID_API_KEY = "SG.your_dev_key";' > src/config/local-config.js
```

## Performance Considerations

### Batch Processing

**Multiple Recipients**: For admin broadcasts or bulk notifications
```javascript
// Batch email sending for performance
async sendBulkEmail(recipients, templateId, templateData) {
  const messages = recipients.map(email => ({
    to: email,
    from: { email: this.fromEmail, name: this.fromName },
    templateId,
    dynamicTemplateData: { ...templateData, recipient_email: email }
  }));

  return sgMail.send(messages);
}
```

### Rate Limiting

**SendGrid Limits**: Respect SendGrid rate limits and quotas
**Firebase Functions**: Built-in concurrency limits
**Firestore Triggers**: Automatic batching for high-volume events

### Monitoring

**Email Delivery Tracking**:
- SendGrid webhook integration for delivery status
- Firebase Functions logs for error tracking
- Email bounce and click tracking

**Performance Metrics**:
- Email delivery success rates
- Function execution times
- Error rates by email type

## Future Enhancements

### Planned Improvements

1. **Email Preferences**: User-configurable notification settings
2. **Email Analytics**: Detailed tracking and reporting
3. **Template Versioning**: A/B testing for email templates
4. **Internationalization**: Multi-language email support
5. **Rich Content**: Advanced HTML templates with images
6. **Scheduling**: Delayed and scheduled email sending
7. **Unsubscribe Management**: One-click unsubscribe system

### Advanced Features

1. **Webhook Integration**: Real-time delivery status updates
2. **Email Queuing**: Redis-based email queue for high volume
3. **Template Editor**: In-app email template customization
4. **Segmentation**: User-based email targeting
5. **Automation**: Email sequences and drip campaigns

## Dependencies

### Frontend Dependencies
- **Firebase Functions**: `getFunctions`, `httpsCallable`
- **Firebase App**: Application instance
- **Error Handling**: Try-catch patterns

### Backend Dependencies
- **Firebase Functions**: `functions` module
- **Firebase Admin**: `admin` SDK
- **SendGrid**: `@sendgrid/mail` package
- **Firestore**: Real-time triggers and data access

### Configuration Dependencies
- **SendGrid API Key**: Required for email delivery
- **Firebase Project**: Functions deployment environment
- **Template IDs**: SendGrid dynamic template configuration

The email system provides a robust, scalable foundation for all application communications, with proper error handling, security measures, and monitoring capabilities to ensure reliable email delivery across all user interactions.
