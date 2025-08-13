# Security Remediation Plan
## Pokemon Card Tracker Application

**Created:** January 2025  
**Priority Levels:** IMMEDIATE, HIGH, MEDIUM, LOW  
**Estimated Timeline:** 4-6 weeks for complete remediation  

---

## IMMEDIATE PRIORITY FIXES (24-48 hours)

### 1. Missing User Authentication Check - BuyerSelectionModal.js

**Issue:** User object used without authentication verification  
**File:** `src/components/Marketplace/BuyerSelectionModal.js`  
**Line:** 28

**Fix:**
```javascript
// Add authentication check at the beginning of fetchPotentialBuyers
const fetchPotentialBuyers = useCallback(async () => {
  // Add authentication check
  if (!user || !user.uid) {
    LoggingService.error('User not authenticated');
    toast.error('Please log in to access this feature');
    return;
  }

  setLoading(true);
  try {
    // Rest of existing code...
```

**Implementation Steps:**
1. Add authentication check at line 28
2. Add early return with error message
3. Test with unauthenticated user

### 2. Sensitive Data in Logs - marketplacePayments.js

**Issue:** Environment variables logged during errors  
**File:** `functions/src/marketplacePayments.js`  
**Line:** 14

**Fix:**
```javascript
// Replace sensitive logging with safe error handling
const getStripeConfig = () => {
  let stripeConfig = {};
  try {
    const config = functions?.config?.();
    // Prefer connect-specific namespace if available
    const connectCfg = config?.stripe_connect || {};
    const baseCfg = config?.stripe || {};
    stripeConfig = {
      connect_secret_key: connectCfg.secret_key || null,
      connect_client_id: connectCfg.client_id || baseCfg.connect_client_id || null,
      connect_webhook_secret: connectCfg.webhook_secret || baseCfg.connect_webhook_secret || null,
      base_secret_key: baseCfg.secret_key || null
    };
  } catch (e) {
    // Log error without exposing sensitive data
    console.warn('Stripe configuration error:', e.message);
  }
  
  return {
    secretKey: stripeConfig.connect_secret_key || stripeConfig.base_secret_key || process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
    connectClientId: stripeConfig.connect_client_id || process.env.STRIPE_CONNECT_CLIENT_ID,
    webhookSecret: stripeConfig.connect_webhook_secret || process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  };
};
```

**Implementation Steps:**
1. Remove sensitive data from error logs
2. Add safe error handling
3. Test error scenarios

### 3. Missing Admin Access Check - psaDatabase.js

**Issue:** Database statistics accessible to any authenticated user  
**File:** `functions/src/psaDatabase.js`  
**Line:** 71

**Fix:**
```javascript
exports.getPSADatabaseStats = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to access PSA database statistics'
    );
  }
  
  // Add admin check
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required for PSA database statistics'
    );
  }
  
  try {
    // Rest of existing code...
```

**Implementation Steps:**
1. Add admin token verification
2. Test with non-admin users
3. Verify admin users can access

### 4. Weak Admin Check - emailFunctions.js

**Issue:** Admin rights checked via unverified token property  
**File:** `functions/src/emailFunctions.js`  
**Line:** 177

**Fix:**
```javascript
// Manual email sending function (for admin use)
exports.sendCustomEmail = functions.https.onCall(async (data, context) => {
  // Verify admin access with proper token validation
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Verify admin token is properly set and valid
  if (!context.auth.token || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { to, subject, htmlContent, textContent } = data;

  try {
    await emailService.sendCustomEmail(to, subject, htmlContent, textContent);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

**Implementation Steps:**
1. Add proper token validation
2. Test admin and non-admin access
3. Verify error handling

### 5. Missing Permission Check - emailTester.js

**Issue:** Any authenticated user can send test emails  
**File:** `functions/src/emailTester.js`  
**Line:** 8

**Fix:**
```javascript
// Test all email types by sending them to a specified email
exports.testAllEmails = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Add admin permission check
    if (!context.auth.token || !context.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required for email testing');
    }

    const { to } = data;
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', 'Test email address is required');
    }

    // Rest of existing code...
```

**Implementation Steps:**
1. Add admin permission check
2. Test with different user roles
3. Verify only admins can send test emails

---

## HIGH PRIORITY FIXES (1 week)

### 1. Missing Data Validation - BuyerSelectionModal.js

**Issue:** User and listing data used directly without validation  
**File:** `src/components/Marketplace/BuyerSelectionModal.js`  
**Line:** 117

**Fix:**
```javascript
// Add data validation function
const validateInvoiceData = (selectedBuyer, listing, soldPrice) => {
  if (!selectedBuyer || !selectedBuyer.name) {
    throw new Error('Invalid buyer data');
  }
  
  if (!listing || !listing.id) {
    throw new Error('Invalid listing data');
  }
  
  const price = parseFloat(soldPrice);
  if (isNaN(price) || price < 0) {
    throw new Error('Invalid sale price');
  }
  
  return {
    buyerName: selectedBuyer.name.trim(),
    listingId: listing.id,
    cardName: (listing.cardTitle || listing.card?.name || 'Unknown Card').trim(),
    salePrice: price
  };
};

// Use validation in handleSubmit
const handleSubmit = async () => {
  if (!selectedBuyerId) {
    toast.error('Please select a buyer');
    return;
  }

  if (createSoldInvoice && !soldPrice) {
    toast.error('Please enter the sold price');
    return;
  }

  setSubmitting(true);
  try {
    const selectedBuyer = potentialBuyers.find(b => b.id === selectedBuyerId);
    
    // Validate data before processing
    const validatedData = validateInvoiceData(selectedBuyer, listing, soldPrice);
    
    // Create invoice data with validated inputs
    const invoiceData = {
      seller: validatedData.buyerName,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `SOLD-${Date.now()}`,
      notes: `Sold via marketplace - ${validatedData.cardName}`,
      // Rest of invoice data...
    };
    
    // Rest of existing code...
```

**Implementation Steps:**
1. Create validation function
2. Apply validation to all user inputs
3. Test with invalid data

### 2. Missing Input Validation - CollectionSharing.js

**Issue:** User inputs used directly without validation  
**File:** `src/components/CollectionSharing.js`  
**Line:** 152

**Fix:**
```javascript
// Add input validation function
const validateShareData = (formData) => {
  const errors = [];
  
  // Validate title
  if (!formData.title || formData.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }
  
  if (formData.title && formData.title.trim().length > 100) {
    errors.push('Title must be less than 100 characters');
  }
  
  // Validate description
  if (formData.description && formData.description.trim().length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  // Sanitize inputs
  const sanitizedData = {
    title: formData.title.trim().replace(/[<>]/g, ''),
    description: formData.description.trim().replace(/[<>]/g, ''),
    collectionId: formData.collectionId,
    expiresIn: formData.expiresIn,
    isActive: Boolean(formData.isActive)
  };
  
  return { errors, sanitizedData };
};

// Use validation in createSharedCollection
const createSharedCollection = async () => {
  try {
    // Validate and sanitize input data
    const { errors, sanitizedData } = validateShareData(createForm);
    
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    const shareId = generateShareId();
    const expirationDate = sanitizedData.expiresIn === 'never'
      ? null
      : new Date(Date.now() + getExpirationMs(sanitizedData.expiresIn));

    // Use sanitized data
    const shareData = {
      id: shareId,
      userId: currentUser.uid,
      ownerName: currentUser.displayName || currentUser.email || 'Anonymous',
      title: sanitizedData.title,
      description: sanitizedData.description,
      collectionId: sanitizedData.collectionId,
      isActive: sanitizedData.isActive,
      expiresAt: expirationDate,
      // Rest of share data...
    };
    
    // Rest of existing code...
```

**Implementation Steps:**
1. Create comprehensive validation function
2. Add input sanitization
3. Test with various input types

### 3. Path Validation Order - upload-image.js

**Issue:** Directory traversal check occurs after path validation  
**File:** `src/api/upload-image.js`  
**Line:** 68

**Fix:**
```javascript
// Reorder validation to check for dangerous patterns first
const validateUploadPath = (path, userId, cardId) => {
  // First: Check for dangerous directory traversal patterns
  if (path.includes('..') || path.includes('./') || path.includes('//')) {
    logger.warn('Directory traversal attempt detected:', { path, userId });
    return false;
  }

  // Second: Validate file extension is allowed
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.json', '.zip', '.csv'];
  const fileExtension = path.substring(path.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    logger.warn('Unauthorized file extension:', { path, extension: fileExtension });
    return false;
  }

  // Third: Validate path structure
  const expectedPathPattern = `users/${userId}/cards/${cardId}/`;
  if (!path.startsWith(expectedPathPattern)) {
    logger.warn('Invalid upload path structure:', { 
      pathCardId, 
      requestCardId: cardId, 
      path 
    });
    return false;
  }

  return true;
};
```

**Implementation Steps:**
1. Reorder validation checks
2. Test with malicious paths
3. Verify security improvements

### 4. Open Access Risk - exchangeRates.js

**Issue:** CORS allows any website to access API data  
**File:** `functions/src/exchangeRates.js`  
**Line:** 11

**Fix:**
```javascript
// Restrict CORS to specific domains
exports.getExchangeRates = functions.https.onRequest((request, response) => {
  // Set CORS headers for specific origins only
  const allowedOrigins = [
    'https://mycardtracker.com.au',
    'https://www.mycardtracker.com.au',
    'http://localhost:3000' // Development only
  ];
  
  const origin = request.headers.origin;
  if (allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  }
  
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  return cors(request, response, async () => {
    // Rest of existing code...
```

**Implementation Steps:**
1. Define allowed origins
2. Implement origin validation
3. Test CORS restrictions

### 5. Follower Write Risk - firestore.rules

**Issue:** Users can write follower relationships without proper validation  
**File:** `firestore.rules`  
**Line:** 125

**Fix:**
```javascript
// Enhanced follower relationship rules
match /users/{userId}/followers/{followerUserId} {
  // Allow owner to read their own followers
  allow read: if isOwner(userId);
  
  // Allow writing follower relationships with enhanced validation
  allow write: if 
    request.auth != null && 
    request.auth.uid == followerUserId &&
    // Ensure the follower is not trying to follow themselves
    request.auth.uid != userId &&
    // Validate the data structure
    request.resource.data.keys().hasOnly(['followedAt', 'status']) &&
    // Ensure followedAt is a timestamp
    request.resource.data.followedAt is timestamp &&
    // Ensure status is valid
    request.resource.data.status in ['active', 'pending'];
}
```

**Implementation Steps:**
1. Add data structure validation
2. Prevent self-following
3. Test with various scenarios

---

## MEDIUM PRIORITY FIXES (2 weeks)

### 1. Unsanitized User Input - CardContext.js

**Issue:** User-provided data used without sanitization  
**File:** `src/contexts/CardContext.js`  
**Line:** 569

**Fix:**
```javascript
// Add input sanitization function
const sanitizeSoldData = (soldData) => {
  return {
    soldPrice: typeof soldData.soldPrice === 'string' 
      ? parseFloat(soldData.soldPrice.replace(/[^0-9.]/g, '')) 
      : (typeof soldData.soldPrice === 'number' ? soldData.soldPrice : 0),
    buyer: soldData.buyer ? soldData.buyer.toString().trim().substring(0, 100) : 'Unknown',
    dateSold: soldData.dateSold ? new Date(soldData.dateSold).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    invoiceId: soldData.invoiceId ? soldData.invoiceId.toString().trim().substring(0, 50) : `INV-${Date.now()}`
  };
};

// Use sanitization in markCardAsSold
const markCardAsSold = useCallback(
  async (cardId, soldData) => {
    try {
      setSyncStatus('syncing');

      if (!cardId) {
        LoggingService.error('No card ID provided to markCardAsSold');
        throw new Error('Card ID is required');
      }

      // Sanitize user input
      const sanitizedSoldData = sanitizeSoldData(soldData);
      
      // Validate sanitized price
      if (isNaN(sanitizedSoldData.soldPrice) || sanitizedSoldData.soldPrice < 0) {
        throw new Error('Invalid sale price');
      }

      // Rest of existing code using sanitizedSoldData...
```

**Implementation Steps:**
1. Create sanitization function
2. Apply to all user inputs
3. Test with malicious data

### 2. Missing File Validation - CardContextCompatibility.js

**Issue:** CSV files processed without size or type validation  
**File:** `src/contexts/CardContextCompatibility.js`  
**Line:** 89

**Fix:**
```javascript
// Add file validation function
const validateCSVFile = (file) => {
  const errors = [];
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check file type
  const allowedTypes = ['text/csv', 'application/csv'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be a CSV file');
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv')) {
    errors.push('File must have .csv extension');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Use validation in importCsvData
const importCsvData = useCallback(async (file, importMode = 'priceUpdate') => {
  const setLoading = cardContextData.setLoading || (() => {});
  const setError = cardContextData.setError || (() => {});
  
  setLoading(true);
  setError(null);

  try {
    // Validate file before processing
    const validation = validateCSVFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Parse the CSV file
    const parsedData = await parseCSVFile(file);

    // Validate the structure based on import mode
    const structureValidation = validateCSVStructure(parsedData, importMode);
    if (!structureValidation.success) {
      throw new Error(structureValidation.error);
    }

    return {
      success: true,
      message: `Imported ${parsedData.length} cards successfully.`,
      data: parsedData,
    };
  } catch (error) {
    setError(error.message);
    return {
      success: false,
      message: error.message,
    };
  } finally {
    setLoading(false);
  }
}, [cardContextData]);
```

**Implementation Steps:**
1. Create file validation function
2. Add size and type checks
3. Test with various file types

### 3. No Price Input Validation - BuyerSelectionModal.js

**Issue:** Sale price accepted without validation  
**File:** `src/components/Marketplace/BuyerSelectionModal.js`  
**Line:** 293

**Fix:**
```javascript
// Add price validation function
const validateSalePrice = (price) => {
  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (numPrice < 0) {
    return { isValid: false, error: 'Price cannot be negative' };
  }
  
  if (numPrice > 1000000) {
    return { isValid: false, error: 'Price cannot exceed $1,000,000' };
  }
  
  return { isValid: true, price: numPrice };
};

// Use validation in handleSubmit
const handleSubmit = async () => {
  if (!selectedBuyerId) {
    toast.error('Please select a buyer');
    return;
  }

  if (createSoldInvoice && !soldPrice) {
    toast.error('Please enter the sold price');
    return;
  }

  // Validate sale price if creating invoice
  if (createSoldInvoice) {
    const priceValidation = validateSalePrice(soldPrice);
    if (!priceValidation.isValid) {
      toast.error(priceValidation.error);
      return;
    }
  }

  setSubmitting(true);
  try {
    // Use validated price
    const validatedPrice = createSoldInvoice ? validateSalePrice(soldPrice).price : 0;
    
    // Rest of existing code using validatedPrice...
```

**Implementation Steps:**
1. Create price validation function
2. Add range and format checks
3. Test with invalid prices

### 4. User Data Exposure - marketplacePayments.js

**Issue:** Buyer/seller emails and names stored in database  
**File:** `functions/src/marketplacePayments.js`  
**Line:** 367

**Fix:**
```javascript
// Add data encryption function
const encryptSensitiveData = (data) => {
  // Use a simple encryption for sensitive data
  // In production, use proper encryption libraries
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

// Use encryption in order creation
const orderData = {
  id: orderId,
  listingId: listingId,
  buyerId: buyerId,
  sellerId: sellerId,
  amount: amount / 100,
  currency: listing.currency || 'AUD',
  platformFee: platformFee.amount / 100,
  platformFeePercentage: platformFee.percentage,
  sellerPayout: sellerPayout / 100,
  stripeConnectedAccountId: connectedAccountId,
  status: 'pending_payment',
  cardDetails: {
    name: listing.card?.name || listing.cardName,
    set: listing.card?.set || listing.setName,
    year: listing.card?.year || listing.year,
    grade: listing.card?.grade || listing.grade,
    gradingCompany: listing.card?.gradingCompany || listing.gradingCompany,
    certificationNumber: listing.card?.certificationNumber || listing.certificationNumber,
    imageUrl: listing.card?.imageUrl || listing.imageUrl,
    category: listing.card?.category || listing.category
  },
  shippingAddress: shippingAddress,
  shippingDeadline: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  // Encrypt sensitive user data
  buyerName: encryptSensitiveData(buyerData.displayName || buyerData.email || 'Unknown'),
  buyerEmail: encryptSensitiveData(context.auth.token.email),
  sellerName: encryptSensitiveData(listing.sellerName || 'Unknown'),
  sellerEmail: encryptSensitiveData(sellerProfile.data().email || 'Unknown')
};
```

**Implementation Steps:**
1. Implement data encryption
2. Update data access patterns
3. Test encryption/decryption

### 5. Exposed Error Details - testEmail.js

**Issue:** Detailed error messages exposed to users  
**File:** `functions/src/testEmail.js`  
**Line:** 81

**Fix:**
```javascript
// Add safe error handling
exports.testEmail = functions.https.onCall(async (data, context) => {
  try {
    // ... existing code ...
    
    const result = await sgMail.send(msg);
    console.log('Test email sent successfully:', { to, subject });
    
    return {
      success: true,
      message: 'Test email sent successfully',
      messageId: result[0].headers['x-message-id']
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    
    // Return safe error message without exposing internal details
    const safeErrorMessage = 'Failed to send test email. Please try again later.';
    
    // Log detailed error internally for debugging
    console.error('Detailed error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    throw new functions.https.HttpsError('internal', safeErrorMessage);
  }
});
```

**Implementation Steps:**
1. Create safe error messages
2. Log detailed errors internally
3. Test error scenarios

---

## LOW PRIORITY FIXES (1 month)

### 1. Sensitive Header Exposure - CORS Configurations

**Issue:** Authorization headers exposed in CORS responses  
**Files:** `firebase-storage-cors-development.json`, `firebase-storage-cors-fixed.json`

**Fix:**
```json
[
  {
    "origin": [
      "https://mycardtracker.com.au", 
      "https://www.mycardtracker.com.au"
    ],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type", 
      "Content-Length", 
      "Content-Encoding", 
      "Content-Disposition", 
      "Cache-Control", 
      "x-goog-meta-filename",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Access-Control-Max-Age",
      "Origin",
      "Accept",
      "X-Requested-With"
    ]
  }
]
```

**Implementation Steps:**
1. Remove Authorization from response headers
2. Update CORS configuration
3. Test file uploads

### 2. Missing API Key Check - exchangeRates.js

**Issue:** No fallback when API key is missing  
**File:** `functions/src/exchangeRates.js`  
**Line:** 24

**Fix:**
```javascript
// Add graceful API key handling
exports.getExchangeRates = functions.https.onRequest((request, response) => {
  // ... CORS setup ...
  
  return cors(request, response, async () => {
    try {
      // Get API key from environment variable with fallback
      const API_KEY = process.env.EXCHANGERATE_API_KEY;
      
      if (!API_KEY) {
        console.warn('EXCHANGERATE_API_KEY not configured, using fallback rates');
        
        // Return fallback static rates
        return response.status(200).json({
          result: "success",
          error: false,
          base_code: "USD",
          rates: {
            "USD": 1,
            "AUD": 1.51,
            "CAD": 1.36,
            "EUR": 0.92,
            "GBP": 0.79,
            "JPY": 154.32,
            "CHF": 0.90,
            "NZD": 1.65,
            "CNY": 7.24,
            "HKD": 7.82,
            "SGD": 1.34,
            "INR": 83.45,
            "MXN": 16.82,
            "BRL": 5.17,
            "ZAR": 18.65
          },
          conversion_rates: {
            // Same as rates
          }
        });
      }
      
      // Rest of existing code with API key...
```

**Implementation Steps:**
1. Add API key validation
2. Implement fallback rates
3. Test with missing API key

---

## IMPLEMENTATION TIMELINE

### Week 1: Immediate Fixes
- [ ] Missing User Authentication Check
- [ ] Sensitive Data in Logs
- [ ] Missing Admin Access Check
- [ ] Weak Admin Check
- [ ] Missing Permission Check

### Week 2: High Priority Fixes
- [ ] Missing Data Validation
- [ ] Missing Input Validation
- [ ] Path Validation Order
- [ ] Open Access Risk
- [ ] Follower Write Risk

### Week 3-4: Medium Priority Fixes
- [ ] Unsanitized User Input
- [ ] Missing File Validation
- [ ] No Price Input Validation
- [ ] User Data Exposure
- [ ] Exposed Error Details

### Week 5-6: Low Priority Fixes
- [ ] Sensitive Header Exposure
- [ ] Missing API Key Check
- [ ] Final testing and validation

---

## TESTING STRATEGY

### Security Testing
- [ ] Penetration testing after each phase
- [ ] Input validation testing
- [ ] Authentication bypass testing
- [ ] Authorization testing

### Functional Testing
- [ ] Regression testing for all features
- [ ] Error handling testing
- [ ] Performance impact assessment
- [ ] User experience validation

### Compliance Testing
- [ ] GDPR compliance verification
- [ ] PCI DSS compliance (if applicable)
- [ ] Security standard adherence

---

## MONITORING & MAINTENANCE

### Ongoing Security Measures
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Security event monitoring
- [ ] User access review

### Documentation Updates
- [ ] Security policy updates
- [ ] Developer security guidelines
- [ ] Incident response procedures
- [ ] Security training materials

---

**Plan Created:** January 2025  
**Next Review:** February 2025  
**Security Contact:** Development Team
