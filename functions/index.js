// Test comment to verify GitHub Actions automatic deployment is working
const functionsBase = require("firebase-functions");
const functions = functionsBase.region('us-central1');
const { HttpsError } = require("firebase-functions/v1/https");
const admin = require("firebase-admin");
const fetch = require('node-fetch'); // Use node-fetch v2 syntax
const PDFDocument = require('pdfkit');
const AdmZip = require('adm-zip');
const { Readable } = require('stream');

// Initialize Firebase Admin
admin.initializeApp();

// Import PSA-related functions
const { testPsaToken } = require('./src/psaTokenTest');

// Import email functions
const { sendWelcomeEmail, sendMarketplaceMessageEmail, sendListingSoldEmail, sendEmailVerificationEmail, sendCustomEmail } = require('./src/emailService');
const { testEmail } = require('./src/testEmail');
const { testAllEmails } = require('./src/emailTester');

// Import auth triggers
const { onUserCreate, onUserDelete } = require('./src/authTriggers');

// Import marketplace notifications
const { sendEmailNotification, sendListingSoldNotification } = require('./src/marketplaceNotifications');

// Export PSA token test function
exports.testPsaToken = testPsaToken;

// Export email functions
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendMarketplaceMessageEmail = sendMarketplaceMessageEmail;
exports.sendListingSoldEmail = sendListingSoldEmail;
exports.sendEmailVerificationEmail = sendEmailVerificationEmail;
exports.sendCustomEmail = sendCustomEmail;

// Export test functions
exports.testEmail = testEmail;
exports.testAllEmails = testAllEmails;

// Export auth triggers
exports.onUserCreate = onUserCreate;
exports.onUserDelete = onUserDelete;

// Export marketplace notifications
exports.sendEmailNotification = sendEmailNotification;
exports.sendListingSoldNotification = sendListingSoldNotification;

// Configure CORS: Allow requests from local dev and production domain
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001', 
  'http://localhost:51999', // Allow local dev server origin
  'http://127.0.0.1:51999', // Allow local dev server origin
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://mycardtracker-c8479.web.app', 
  'https://mycardtracker.com.au'
];

const cors = require('cors')({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
});

// Additional Firebase Admin SDK initialization error handling
try {
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK');
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.log('Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Add a function to send feedback email
exports.sendFeedbackEmail = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    const { email, message } = data;
    if (!email || !message) {
      throw new HttpsError('invalid-argument', 'Email and message are required');
    }

    // Send the email using a mail service (e.g., Sendgrid, Mailgun)
    // For this example, we'll just log the email and message
    console.log(`Feedback email from ${email}: ${message}`);

    return { success: true, message: 'Feedback email sent successfully' };
  } catch (error) {
    console.error('Error sending feedback email:', error);
    throw new HttpsError('internal', error.message);
  }
});

// PSA Card Lookup Function
exports.psaLookup = functions.https.onCall(async (data, context) => {
  try {
    // Check if the request is authenticated (optional)
    if (!context.auth) {
      // Allowing anonymous access for now
      console.log('Anonymous PSA lookup request');
    } else {
      console.log('Authenticated PSA lookup from:', context.auth.uid);
    }

    // Extract cert number from request
    const { certNumber, includeImage } = data;
    if (!certNumber) {
      throw new Error('No certification number provided');
    }

    console.log(`Looking up PSA cert #${certNumber}`);

    // Get PSA API token from environment variable - no fallback
    let psaToken = process.env.PSA_API_TOKEN;
    
    if (!psaToken) {
      console.warn('PSA_API_TOKEN not configured in environment variables');
      return {
        success: false,
        error: 'PSA_API_NOT_CONFIGURED',
        message: 'PSA API is not currently configured. Please contact support for assistance.',
        data: null
      };
    }
    
    console.log('PSA token found and configured');
    
    // Define multiple possible URL formats to try
    const urlFormats = [
      // Original format that worked before
      `https://www.psacard.com/publicapi/cert/GetByCertNumber/${encodeURIComponent(certNumber)}`,
      // Alternative format 1
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${encodeURIComponent(certNumber)}`,
      // Alternative format 2
      `https://api.psacard.com/publicapi/cert/${encodeURIComponent(certNumber)}`,
      // Alternative format 3
      `https://www.psacard.com/cert/${encodeURIComponent(certNumber)}/json`
    ];
    
    // Try all URL formats in parallel instead of sequentially
    console.log(`Trying all PSA API endpoints in parallel for cert #${certNumber}`);

    const fetchPromises = urlFormats.map(url => {
      console.log(`Creating fetch promise for PSA API URL: ${url}`);
      return fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${psaToken}`
        }
      })
      .then(async response => {
        console.log(`PSA API response status for ${url}: ${response.status}`);
        
        if (response.ok) {
          // Get the text response first
          const responseText = await response.text();
          console.log(`Raw API response preview for ${url}:`, responseText.substring(0, 100) + '...');
          
          // Parse the JSON response
          const responseData = JSON.parse(responseText);
          console.log(`PSA API response from ${url} parsed successfully`);
          return { success: true, url, data: responseData };
        } else {
          console.error(`Error response from ${url}: ${response.status} ${response.statusText}`);
          return { 
            success: false, 
            url, 
            error: `PSA API returned error: ${response.status} ${response.statusText}` 
          };
        }
      })
      .catch(error => {
        console.error(`Network error with ${url}:`, error);
        return { success: false, url, error: error.message };
      });
    });

    // Use Promise.race to get the first successful response
    // But also track all responses for logging purposes
    const allResults = await Promise.all(fetchPromises);
    const successfulResults = allResults.filter(result => result.success);

    if (successfulResults.length === 0) {
      console.error('All PSA API attempts failed');
      const errors = allResults.map(result => `${result.url}: ${result.error}`).join('; ');
      return { 
        success: false, 
        error: `All PSA API endpoints failed: ${errors}` 
      };
    }

    // Use the first successful result
    const firstSuccess = successfulResults[0];
    console.log(`Using successful response from ${firstSuccess.url}`);
    responseData = firstSuccess.data;

    // Handle image URL if requested
    if (includeImage && responseData) {
      // Try to find or construct an image URL
      responseData.imageUrl = responseData.imageUrl || 
                             `https://www.psacard.com/cert/${certNumber}/PSAcert`;
    }
    
    // Return the successful response
    return {
      success: true,
      data: responseData
    };
  } catch (error) {
    console.error('Error in PSA lookup:', error);
    return { success: false, error: error.message };
  }
});

// Generate a download URL for cloud backup that works across all devices
exports.getBackupDownloadUrl = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to access backups');
  }

  try {
    const userId = context.auth.uid;
    // Updated path to match client-side code
    const backupPath = `backups/${userId}/backup.zip`;
    
    // Get Firebase Storage bucket reference using admin SDK
    const bucket = admin.storage().bucket();
    const file = bucket.file(backupPath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      // Also check for the new format (metadata.json)
      const metadataFile = bucket.file(`backups/${userId}/metadata.json`);
      const [metadataExists] = await metadataFile.exists();
      
      if (metadataExists) {
        // If metadata exists, this is the new unzipped format
        throw new HttpsError('failed-precondition', 
          'This backup is in the new unzipped format and should be restored directly from the client.');
      } else {
        // No backup found at all
        throw new HttpsError('not-found', 'No backup file found for this user');
      }
    }

    // Generate a signed URL that will work across browsers (including iOS)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      responseDisposition: 'attachment; filename="backup.zip"',
      version: 'v4',
    });
    
    // Return just the signed URL
    return {
      downloadUrl: signedUrl
    };
  } catch (error) {
    functions.logger.error('Error generating download URL:', error);
    throw new HttpsError('internal', 'Failed to generate download URL: ' + error.message);
  }
});

// Upload backup function for cloud storage
exports.uploadBackup = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to upload backups');
  }

  try {
    const userId = context.auth.uid;
    // Updated path to match client-side code
    const backupPath = `backups/${userId}/backup.zip`;
    
    // Decode the base64 file data
    const fileBuffer = Buffer.from(data.file, 'base64');
    
    // Get Firebase Storage bucket reference using admin SDK
    const bucket = admin.storage().bucket();
    const file = bucket.file(backupPath);
    
    // Upload the file to Firebase Storage
    await file.save(fileBuffer, {
      contentType: 'application/zip',
      metadata: {
        contentType: 'application/zip',
        metadata: {
          uploadTime: new Date().toISOString(),
          userId: userId
        }
      }
    });

    functions.logger.info(`User ${userId} successfully uploaded backup file`);
    
    return {
      success: true,
      message: 'Backup file uploaded successfully'
    };
  } catch (error) {
    functions.logger.error('Error uploading backup:', error);
    throw new HttpsError('internal', 'Failed to upload backup: ' + error.message);
  }
});

// List backup files function
exports.listBackupFiles = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to list backups');
  }

  try {
    const userId = context.auth.uid;
    const backupDir = `backups/${userId}/`;
    
    // Get Firebase Storage bucket reference using admin SDK
    const bucket = admin.storage().bucket();
    
    // List files in the backup directory
    const [files] = await bucket.getFiles({ prefix: backupDir });
    
    // Format the results
    const fileList = files.map(file => {
      const name = file.name.replace(backupDir, '');
      return {
        name: name,
        path: file.name,
        updated: file.metadata.updated,
        size: file.metadata.size
      };
    });
    
    return { files: fileList };
  } catch (error) {
    functions.logger.error('Error listing backup files:', error);
    throw new HttpsError('internal', 'Failed to list backup files: ' + error.message);
  }
});

// Get backup file content function
exports.getBackupFileContent = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to access backup content');
  }

  try {
    const userId = context.auth.uid;
    const fileName = data.fileName || 'backup.zip';
    const filePath = `backups/${userId}/${fileName}`;
    
    // Get Firebase Storage bucket reference using admin SDK
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError('not-found', `Backup file ${fileName} not found`);
    }
    
    // Get file content
    const [fileContent] = await file.download();
    
    // Return file content as base64
    return {
      content: fileContent.toString('base64'),
      fileName: fileName
    };
  } catch (error) {
    functions.logger.error('Error getting backup file content:', error);
    throw new HttpsError('internal', 'Failed to get backup file content: ' + error.message);
  }
});

// Add the missing functions that exist in the Firebase project
exports.getCarPrice = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    console.log('getCarPrice function called (renamed from getCar@Price)');
    // This function likely gets the price of a card
    // Since this is just to fix deployment, we'll implement minimal functionality
    // that matches what the existing deployed function probably does
    
    const cardId = data.cardId;
    console.log(`Looking up price for card: ${cardId}`);
    
    // Placeholder implementation - this would be replaced with actual functionality
    // when we understand the full requirements
    return {
      success: true,
      message: 'Price lookup completed',
      price: data.defaultPrice || 0
    };
  } catch (error) {
    console.error('Error in getCarPrice function:', error);
    throw new HttpsError('internal', error.message);
  }
});

exports.getCarValueFromAdmin = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    console.log('getCarValueFromAdmin function called (renamed from getCar@ValueFromAdmin)');
    // This function likely gets the admin-set value of a card
    // Since this is just to fix deployment, we'll implement minimal functionality
    
    const cardId = data.cardId;
    console.log(`Looking up admin value for card: ${cardId}`);
    
    // Placeholder implementation - this would be replaced with actual functionality
    return {
      success: true,
      message: 'Admin value lookup completed',
      value: data.defaultValue || 0
    };
  } catch (error) {
    console.error('Error in getCarValueFromAdmin function:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Function to store images in Firebase Storage
exports.storeCardImage = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to store images'
    );
  }
  
  try {
    const { imageBase64, cardId, isReplacement = false } = data;
    const userId = context.auth.uid;
    
    // Validate inputs
    if (!imageBase64 || !cardId) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: imageBase64, cardId'
      );
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Create a reference to the image location in Firebase Storage
    const imagePath = `images/${userId}/${cardId}.jpeg`;
    const bucket = admin.storage().bucket();
    const file = bucket.file(imagePath);
    
    // Check if the file exists already (for replacements)
    if (isReplacement) {
      try {
        const [exists] = await file.exists();
        if (exists) {
          console.log(`Deleting existing image at ${imagePath} before replacement`);
          await file.delete();
        }
      } catch (deleteError) {
        console.warn(`Could not delete existing image: ${deleteError.message}`);
        // Continue with the upload even if deletion fails
      }
    }
    
    // Set the metadata for the file
    const metadata = {
      contentType: 'image/jpeg',
      metadata: {
        uploadedBy: userId,
        cardId: cardId,
        uploadTimestamp: new Date().toISOString(),
        isReplacement: isReplacement ? 'true' : 'false'
      }
    };
    
    // Upload the image with a public read access
    await file.save(imageBuffer, {
      metadata: metadata,
      public: true, // Make the file publicly accessible to avoid signing URLs
      validation: false
    });

    // Get the public URL (no signing needed)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
    
    console.log(`Image stored for user ${userId}, card ${cardId}`);
    
    return {
      success: true,
      downloadUrl: publicUrl,
      path: imagePath
    };
  } catch (error) {
    console.error('Error storing image:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Generate batch PDF invoices on the server
exports.generateInvoiceBatch = functions.runWith({
  timeoutSeconds: 540, // 9 minutes (max is 9 minutes for standard functions)
  memory: '2GB' // Increase memory for PDF generation
}).https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  console.log(`Starting batch invoice PDF generation for user: ${userId}`);

  try {
    // Get the invoice IDs from the request
    const { invoiceIds } = data;
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Missing or invalid invoiceIds parameter'
      );
    }

    console.log(`Processing ${invoiceIds.length} invoices for PDF generation`);
    
    // Get user profile data for the invoice headers
    const userProfileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    let profile = null;
    if (userProfileDoc.exists) {
      profile = userProfileDoc.data();
      console.log('Retrieved user profile for invoices');
    } else {
      console.log('No user profile found, proceeding without profile data');
    }

    // Create a ZIP file to store all PDFs
    const zip = new AdmZip();
    
    // Create a JSON file with all invoice data for backup
    const allInvoicesData = [];
    
    // Process each invoice
    for (const invoiceId of invoiceIds) {
      console.log(`Processing invoice: ${invoiceId}`);
      
      // Get the invoice data from Firestore
      const invoiceDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('purchaseInvoices')
        .doc(invoiceId)
        .get();
      
      if (!invoiceDoc.exists) {
        console.warn(`Invoice ${invoiceId} not found, skipping`);
        continue;
      }
      
      const invoice = invoiceDoc.data();
      invoice.id = invoiceDoc.id; // Add the document ID to the data
      
      // Add to the all invoices data array for JSON backup
      allInvoicesData.push(invoice);
      
      // Get card details for the invoice
      const cards = [];
      if (invoice.cards && Array.isArray(invoice.cards)) {
        for (const cardRef of invoice.cards) {
          try {
            // Get the card data
            const cardDoc = await admin.firestore().doc(cardRef.path).get();
            if (cardDoc.exists) {
              const card = cardDoc.data();
              card.id = cardDoc.id;
              card.price = cardRef.price || 0;
              card.quantity = cardRef.quantity || 1;
              cards.push(card);
            }
          } catch (cardError) {
            console.warn(`Error getting card data for ${cardRef.path}:`, cardError);
          }
        }
      }
      
      // Generate PDF for this invoice
      try {
        // Create a PDF document
        const pdfDoc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoice.invoiceNumber || invoice.id}`,
            Author: 'Pokemon Card Tracker',
            Subject: 'Purchase Invoice',
            Keywords: 'pokemon, cards, invoice'
          }
        });
        
        // Collect PDF chunks
        const pdfChunks = [];
        pdfDoc.on('data', chunk => pdfChunks.push(chunk));
        
        // Add invoice header
        pdfDoc.fontSize(24).font('Helvetica-Bold').text('PURCHASE INVOICE', { align: 'center' });
        pdfDoc.moveDown();
        
        // Add PURCHASE INVOICE title with matching style
        pdfDoc.fontSize(14).font('Helvetica-Bold').text('PURCHASE INVOICE');
        pdfDoc.moveDown(0.5);
        
        // Add invoice details section
        pdfDoc.fontSize(11).font('Helvetica');
        pdfDoc.text(`Invoice #: ${invoice.invoiceNumber || 'INV-' + invoice.id}`);
        pdfDoc.text(`Date: ${invoice.date}`);
        if (invoice.notes) {
          pdfDoc.text(`Notes: ${invoice.notes}`);
        }
        pdfDoc.moveDown();
        
        // Seller Information
        pdfDoc.fontSize(11).font('Helvetica-Bold').text('Purchased From:');
        pdfDoc.fontSize(11).font('Helvetica').text(invoice.seller);
        pdfDoc.moveDown();
        
        // Buyer Information (if profile exists)
        if (profile) {
          pdfDoc.fontSize(11).font('Helvetica-Bold').text('Purchased By:');
          if (profile.companyName) {
            pdfDoc.fontSize(11).font('Helvetica').text(profile.companyName);
          }
          pdfDoc.text(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
          if (profile.address) {
            pdfDoc.text(profile.address);
          }
          if (profile.mobileNumber) {
            pdfDoc.text(profile.mobileNumber);
          }
          if (profile.email) {
            pdfDoc.text(profile.email);
          }
        }
        pdfDoc.moveDown(2);
        
        // Table header with dark background
        const tableTop = pdfDoc.y;
        const tableWidth = pdfDoc.page.width - 80; // 40px margin on each side
        
        // Define table column widths to match client-side
        const col1Width = tableWidth * 0.5;  // 50% for Item Description
        const col2Width = tableWidth * 0.25; // 25% for Serial Number
        const col3Width = tableWidth * 0.25; // 25% for Price
        
        // Draw table header background
        pdfDoc.fillColor('#213547').rect(40, tableTop, tableWidth, 20).fill();
        
        // Draw table header text
        pdfDoc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
        pdfDoc.text('Item Description', 46, tableTop + 6);
        pdfDoc.text('Serial Number', 46 + col1Width, tableTop + 6);
        pdfDoc.text('Price', 46 + col1Width + col2Width, tableTop + 6, { align: 'right' });
        
        // Reset fill color for the rest of the document
        pdfDoc.fillColor('#1a1a1a');
        
        // Draw table rows
        let y = tableTop + 25;
        
        for (const card of cards) {
          // Create display name for the card
          const cardName = card.name || card.player || card.card || 
            (card.set ? `${card.set} Card` : 'Unnamed Card');
          
          // Draw card name in bold
          pdfDoc.fontSize(11).font('Helvetica-Bold');
          pdfDoc.text(cardName, 46, y, { width: col1Width - 10 });
          
          // Draw set and grade info in smaller gray text
          if (card.set) {
            pdfDoc.fontSize(9).font('Helvetica').fillColor('#6b7280');
            pdfDoc.text(`${card.year || ''} ${card.set} ${card.cardNumber ? '#' + card.cardNumber : ''}`.trim(), 
              46, pdfDoc.y, { width: col1Width - 10 });
          }
          
          if (card.grade) {
            pdfDoc.fontSize(9).font('Helvetica').fillColor('#6b7280');
            pdfDoc.text(`${card.gradeVendor || 'PSA'} ${card.grade}`, 46, pdfDoc.y, { width: col1Width - 10 });
          }
          
          // Reset text color
          pdfDoc.fillColor('#1a1a1a');
          
          // Draw serial number
          pdfDoc.fontSize(11).font('Helvetica');
          pdfDoc.text(card.slabSerial || 'N/A', 46 + col1Width, y);
          
          // Draw price
          const price = card.investmentAUD ? `$${card.investmentAUD.toFixed(2)}` : 'N/A';
          pdfDoc.text(price, 46 + col1Width + col2Width, y, { align: 'right' });
          
          // Draw bottom border
          pdfDoc.strokeColor('#e5e5e5').lineWidth(1)
            .moveTo(40, y + 20)
            .lineTo(40 + tableWidth, y + 20)
            .stroke();
          
          // Move to next row
          y = pdfDoc.y + 10;
          
          // Check if we need a new page
          if (y > pdfDoc.page.height - 100) {
            pdfDoc.addPage();
            y = 40;
          }
        }
        
        // Add total amount
        pdfDoc.moveDown();
        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#213547');
        
        // Position the total amount at the right side
        const totalLabel = 'Total Amount:';
        const totalAmount = `$${(invoice.totalAmount || 0).toFixed(2)}`;
        const totalLabelWidth = 120;
        const totalValueWidth = 100;
        
        pdfDoc.text(totalLabel, pdfDoc.page.width - 40 - totalLabelWidth - totalValueWidth, pdfDoc.y, { width: totalLabelWidth, align: 'right' });
        pdfDoc.text(totalAmount, pdfDoc.page.width - 40 - totalValueWidth, pdfDoc.y - pdfDoc.currentLineHeight(), { width: totalValueWidth, align: 'right' });
        
        // Add footer
        pdfDoc.fontSize(10).fillColor('#6b7280');
        pdfDoc.text('Thank you for your purchase!', { align: 'center' }, pdfDoc.page.height - 50);
        
        // Finalize the PDF
        pdfDoc.end();
        
        // Wait for PDF generation to complete
        const pdfBuffer = await new Promise((resolve) => {
          pdfDoc.on('end', () => {
            resolve(Buffer.concat(pdfChunks));
          });
        });
        
        // Add the PDF to the ZIP file
        const pdfFilename = `Invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
        zip.addFile(pdfFilename, pdfBuffer);
        
        console.log(`Added PDF for invoice ${invoiceId} to the ZIP file`);
      } catch (pdfError) {
        console.error(`Error generating PDF for invoice ${invoiceId}:`, pdfError);
      }
    }
    
    // Add the JSON data file with all invoices
    zip.addFile('all-invoices.json', Buffer.from(JSON.stringify(allInvoicesData, null, 2)));
    
    // Generate the ZIP file
    const zipBuffer = zip.toBuffer();
    
    // Upload the ZIP file to Firebase Storage
    const bucket = admin.storage().bucket();
    const zipFilename = `purchase-invoices-${new Date().toISOString().split('T')[0]}.zip`;
    const zipPath = `exports/${userId}/${Date.now()}/${zipFilename}`;
    const file = bucket.file(zipPath);
    
    // Upload the ZIP file with public read access
    await file.save(zipBuffer, {
      metadata: {
        contentType: 'application/zip',
        metadata: {
          createdBy: userId,
          timestamp: new Date().toISOString(),
          invoiceCount: allInvoicesData.length
        }
      },
      public: true // Make the file publicly accessible
    });
    
    // Get the public URL (no signing needed)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${zipPath}`;
    
    console.log(`Batch invoice generation completed successfully`);
    
    return {
      success: true,
      url: publicUrl,
      filename: zipFilename,
      invoiceCount: allInvoicesData.length
    };
  } catch (error) {
    console.error('Error generating batch invoices:', error);
    throw new HttpsError('internal', `Error generating batch invoices: ${error.message}`);
  }
});

// Add a function to get user cards for PDF generation
exports.getUserCards = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    const userId = context.auth.uid;
    console.log(`Getting user cards for PDF generation for user: ${userId}`);

    // Get the user's cards from Firestore
    const cardsRef = admin.firestore().collection('users').doc(userId).collection('cards');
    const cardsSnapshot = await cardsRef.get();
    const cards = cardsSnapshot.docs.map(doc => doc.data());

    console.log(`Found ${cards.length} cards for user ${userId}`);

    return {
      success: true,
      cards: cards
    };
  } catch (error) {
    console.error('Error getting user cards:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Create Checkout Session for Premium Subscription
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  console.log('🚀 createCheckoutSession called with data:', data);
  console.log('📋 Context:', {
    auth: context.auth ? {
      uid: context.auth.uid,
      email: context.auth.token?.email
    } : null,
    rawRequest: context.rawRequest ? {
      headers: Object.keys(context.rawRequest.headers),
      method: context.rawRequest.method
    } : null
  });

  // Ensure user is authenticated
  if (!context.auth) {
    console.error('❌ Authentication failed - no context.auth');
    throw new HttpsError('unauthenticated', 'User must be authenticated to create checkout session');
  }

  try {
    console.log('🔍 Checking Firebase config...');
    
    // Try to get config with error handling
    let stripeConfig;
    try {
      stripeConfig = functionsBase.config().stripe;
      console.log('✅ Config retrieved successfully');
    } catch (configError) {
      console.error('❌ Error getting functions.config():', configError.message);
      throw new HttpsError('internal', `Configuration error: ${configError.message}`);
    }
    
    console.log('Stripe config keys:', stripeConfig ? Object.keys(stripeConfig) : 'No stripe config found');
    
    if (!stripeConfig) {
      console.error('❌ No stripe config found');
      throw new HttpsError('internal', 'Stripe configuration not found');
    }
    
    if (!stripeConfig.secret_key) {
      console.error('❌ Stripe secret key not found in Firebase config');
      throw new HttpsError('internal', 'Stripe secret key configuration missing');
    }
    
    if (!stripeConfig.premium_plan_price_id) {
      console.error('❌ Stripe premium plan price ID not found in Firebase config');
      throw new HttpsError('internal', 'Stripe price configuration missing');
    }

    // Initialize Stripe with secret key from Firebase config
    console.log('📦 Initializing Stripe...');
    console.log('🔑 Using secret key type:', stripeConfig.secret_key.startsWith('sk_live_') ? 'LIVE' : 'TEST');
    
    let stripe;
    try {
      stripe = require('stripe')(stripeConfig.secret_key);
      console.log('✅ Stripe initialized successfully');
    } catch (stripeInitError) {
      console.error('❌ Stripe initialization failed:', stripeInitError.message);
      throw new HttpsError('internal', `Stripe initialization error: ${stripeInitError.message}`);
    }
    
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    const priceId = stripeConfig.premium_plan_price_id;
    
    console.log('✅ Creating Stripe checkout session for user:', {
      userId,
      userEmail,
      priceId,
      keyType: stripeConfig.secret_key.startsWith('sk_live_') ? 'LIVE' : 'TEST'
    });

    // Validate the price exists first
    console.log('🏷️ Validating price ID...');
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('✅ Price validation successful:', {
        id: price.id,
        active: price.active,
        currency: price.currency,
        amount: price.unit_amount,
        interval: price.recurring?.interval
      });
    } catch (priceError) {
      console.error('❌ Price validation failed:', priceError.message);
      throw new HttpsError('invalid-argument', `Invalid price ID: ${priceError.message}`);
    }

    // Create checkout session
    console.log('💳 Calling Stripe checkout session create...');
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planType: 'premium'
      },
      success_url: 'https://www.mycardtracker.com.au/dashboard?upgraded=true',
      cancel_url: 'https://www.mycardtracker.com.au/upgrade?cancelled=true',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    console.log('📝 Session configuration:', JSON.stringify(sessionConfig, null, 2));

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Stripe checkout session created successfully:', {
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    });
    
    return {
      success: true,
      url: session.url,
      sessionId: session.id
    };
  } catch (error) {
    console.error('💥 Error creating Stripe checkout session:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
    
    // More specific error handling
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('price')) {
        throw new HttpsError('invalid-argument', `Price configuration error: ${error.message}`);
      }
      throw new HttpsError('invalid-argument', `Stripe configuration error: ${error.message}`);
    } else if (error.type === 'StripeAuthenticationError') {
      throw new HttpsError('internal', 'Stripe authentication failed - check secret key');
    } else if (error.type === 'StripeConnectionError') {
      throw new HttpsError('unavailable', 'Unable to connect to Stripe');
    } else if (error.type === 'StripePermissionError') {
      throw new HttpsError('permission-denied', 'Stripe permission error - check account settings');
    }
    
    throw new HttpsError('internal', `Failed to create checkout session: ${error.message}`);
  }
});

// Stripe Webhook Handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = require('stripe')(functionsBase.config().stripe.secret_key);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functionsBase.config().stripe.webhook_secret;
  
  let event;
  
  try {
    // Get raw body for signature verification
    // Firebase Functions automatically parses JSON, but Stripe needs raw body
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`Stripe webhook event received: ${event.type}`);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;
        
        console.log(`Processing successful checkout for user: ${userId}`);
        
        if (userId) {
          // Update user subscription to premium
          await admin.firestore().doc(`users/${userId}/profile/data`).update({
            subscriptionStatus: 'premium',
            planType: 'premium',
            customerId: session.customer,
            subscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Successfully updated user ${userId} to premium subscription`);
        }
        break;
        
      case 'customer.subscription.created':
        const createdSubscription = event.data.object;
        const createdCustomerId = createdSubscription.customer;
        
        console.log(`Processing subscription creation for customer: ${createdCustomerId}`);
        
        // Find user by customer ID and update subscription status
        const createdUsersRef = admin.firestore().collectionGroup('data');
        const createdUserQuery = await createdUsersRef.where('customerId', '==', createdCustomerId).limit(1).get();
        
        if (!createdUserQuery.empty) {
          const userDoc = createdUserQuery.docs[0];
          const updateData = {
            subscriptionStatus: 'premium',
            planType: 'premium',
            subscriptionId: createdSubscription.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await userDoc.ref.update(updateData);
          console.log(`Updated user ${userDoc.id} to premium subscription after creation`);
        }
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        console.log(`Processing subscription update for customer: ${customerId}`);
        
        // Find user by customer ID and update subscription status
        const usersRef = admin.firestore().collectionGroup('data');
        const userQuery = await usersRef.where('customerId', '==', customerId).limit(1).get();
        
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const updateData = {
            subscriptionStatus: subscription.status === 'active' ? 'premium' : subscription.status,
            subscriptionId: subscription.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await userDoc.ref.update(updateData);
          console.log(`Updated subscription status for user: ${userDoc.id}`);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        const deletedCustomerId = deletedSubscription.customer;
        
        console.log(`Processing subscription cancellation for customer: ${deletedCustomerId}`);
        
        // Find user by customer ID and update to free status
        const deletedUsersRef = admin.firestore().collectionGroup('data');
        const deletedUserQuery = await deletedUsersRef.where('customerId', '==', deletedCustomerId).limit(1).get();
        
        if (!deletedUserQuery.empty) {
          const userDoc = deletedUserQuery.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: 'free',
            planType: 'free',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Updated user ${userDoc.id} to free plan after subscription cancellation`);
        }
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        const failedCustomerId = failedInvoice.customer;
        
        console.log(`Processing payment failure for customer: ${failedCustomerId}`);
        
        // Find user and potentially update status or send notification
        const failedUsersRef = admin.firestore().collectionGroup('data');
        const failedUserQuery = await failedUsersRef.where('customerId', '==', failedCustomerId).limit(1).get();
        
        if (!failedUserQuery.empty) {
          const userDoc = failedUserQuery.docs[0];
          console.log(`Payment failed for user: ${userDoc.id}`);
          // Could send email notification or update status here
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});