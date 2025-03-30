// Load environment variables based on NODE_ENV
const dotenv = require('dotenv');
const path = require('path');

// Load appropriate .env file
if (process.env.NODE_ENV === 'production') {
  dotenv.config();
  console.log('Loading production environment');
} else {
  dotenv.config();
  console.log('Loading development environment');
}

const express = require('express');
const cors = require('cors');

// Initialize other dependencies
const admin = require('firebase-admin');

// Initialize Firebase Admin (optional for development)
try {
  // Different initialization based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, use the service account file
    const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 
      require(process.env.GOOGLE_APPLICATION_CREDENTIALS) : null;
      
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      // Fallback to application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
  } else {
    // In development, use a more flexible approach
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || `firebase-adminsdk-xxxxx@${process.env.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
        // Use a private key or generate a fake one for development
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
          '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n' // This is a dummy key for development
      })
    });
  }
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.warn('Firebase Admin initialization failed:', error.message);
  console.log('Running in development mode without Firebase Admin');
}

const app = express();
const port = process.env.PORT || 3002;

// Middleware
// In production, we only allow specific origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://www.mycardtracker.com.au']
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running correctly!',
    environment: process.env.NODE_ENV || 'development',
    port: port
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running correctly!' });
});

// Log environment info
console.log('Environment variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- PORT: ${process.env.PORT || 3002}`);
console.log(`- FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL}`);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 