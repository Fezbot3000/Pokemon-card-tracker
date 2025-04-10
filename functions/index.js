const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Add better logging for Stripe initialization
let stripe;
try {
  const stripeSecretKey = functions.config().stripe.secret_key;
  // Trim any whitespace and remove quotes if they exist
  const cleanKey = stripeSecretKey.trim().replace(/^['"]|['"]$/g, '');
  console.log('Initializing Stripe with key starting with:', cleanKey.substring(0, 7));
  stripe = require('stripe')(cleanKey);
} catch (error) {
  console.error('Error initializing Stripe:', error);
  // Initialize with an invalid key to prevent crashes, but functions will return errors
  stripe = require('stripe')('invalid_key');
}

// Initialize Firebase Admin SDK if not already initialized
let admin;
try {
  admin = require('firebase-admin');
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

// Check subscription status function
exports.checkSubscriptionStatus = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = data.userId || context.auth.uid;
  console.log(`Checking subscription for user: ${userId}`);

  try {
    // First, check the Firestore database for subscription information
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    
    if (subscriptionDoc.exists) {
      const firestoreSubscription = subscriptionDoc.data();
      console.log(`Found subscription in Firestore: ${JSON.stringify(firestoreSubscription)}`);
      
      // If we have a subscription with active status, return it immediately
      if (firestoreSubscription.status === 'active' || firestoreSubscription.status === 'trialing') {
        console.log(`Returning active subscription from Firestore for user: ${userId}`);
        return {
          status: firestoreSubscription.status,
          customer: firestoreSubscription.customerId,
          subscriptionId: firestoreSubscription.subscriptionId,
          plan: firestoreSubscription.plan || 'Premium'
        };
      } else {
        console.log(`Firestore subscription status is not active: ${firestoreSubscription.status}`);
      }
    } else {
      console.log(`No subscription found in Firestore for user: ${userId}, checking Stripe...`);
    }
    
    // If no active subscription found in Firestore or we want to verify with Stripe directly,
    // proceed with the original Stripe checks
    // Query Stripe customers to find the customer associated with this userId
    // First check just by looking for all customers and then filter manually
    // This avoids the 'metadata' parameter error
    const customers = await stripe.customers.list({
      limit: 100,
      expand: ['data.subscriptions']
    });

    console.log(`Found ${customers.data.length} total customers`);
    
    // Filter customers manually based on metadata
    let userCustomers = customers.data.filter(customer => 
      customer.metadata && customer.metadata.client_reference_id === userId
    );
    
    console.log(`Found ${userCustomers.length} customers by client_reference_id`);

    // Debug customer metadata
    customers.data.forEach((customer, index) => {
      console.log(`Customer ${index} metadata:`, customer.metadata);
      if (customer.email) {
        console.log(`Customer ${index} email:`, customer.email);
      }
    });

    // If no customers found, check by email
    if (userCustomers.length === 0 && context.auth.token.email) {
      console.log(`No customers found by client_reference_id, checking by email: ${context.auth.token.email}`);
      const emailCustomers = await stripe.customers.list({
        email: context.auth.token.email,
        expand: ['data.subscriptions']
      });
      userCustomers = emailCustomers.data;
      console.log(`Found ${userCustomers.length} customers by email`);
      
      // Print detailed info about customers found by email
      userCustomers.forEach((customer, index) => {
        console.log(`Email Customer ${index} id:`, customer.id);
        console.log(`Email Customer ${index} metadata:`, customer.metadata);
        if (customer.subscriptions && customer.subscriptions.data.length > 0) {
          console.log(`Email Customer ${index} has ${customer.subscriptions.data.length} subscriptions`);
          customer.subscriptions.data.forEach((sub, subIndex) => {
            console.log(`Email Customer ${index} subscription ${subIndex} status:`, sub.status);
          });
        }
      });
    }

    // Check if any customer has an active subscription
    for (const customer of userCustomers) {
      console.log(`Checking subscriptions for customer:`, customer.id);
      
      if (customer.subscriptions && customer.subscriptions.data.length > 0) {
        console.log(`Customer has ${customer.subscriptions.data.length} subscriptions`);
        
        // Log all subscription statuses for debugging
        customer.subscriptions.data.forEach((sub, index) => {
          console.log(`Subscription ${index} status: ${sub.status}, id: ${sub.id}`);
        });
        
        const activeSubscriptions = customer.subscriptions.data.filter(
          sub => sub.status === 'active' || sub.status === 'trialing'
        );

        console.log(`Customer ${customer.id} has ${activeSubscriptions.length} active subscriptions`);

        if (activeSubscriptions.length > 0) {
          // Check if any of the active subscriptions is for the free plan
          const freeSubscriptions = activeSubscriptions.filter(sub => {
            return sub.items.data.some(item => {
              return item.price.unit_amount === 0;
            });
          });

          console.log(`Found ${freeSubscriptions.length} free subscriptions out of ${activeSubscriptions.length} active subscriptions`);

          // Return 'active' if they have a paid subscription, 'free' if they only have a free plan
          if (activeSubscriptions.length > freeSubscriptions.length) {
            const result = { 
              status: 'active',
              customer: customer.id,
              subscriptionId: activeSubscriptions[0].id,
              plan: activeSubscriptions[0].items.data[0].price.nickname || 'Premium'
            };
            console.log('Returning active subscription:', result);
            return result;
          } else if (freeSubscriptions.length > 0) {
            const result = { 
              status: 'free',
              customer: customer.id,
              subscriptionId: freeSubscriptions[0].id,
              plan: 'Free Plan'
            };
            console.log('Returning free subscription:', result);
            return result;
          }
        }
      } else {
        console.log(`Customer ${customer.id} has no subscriptions`);
      }
    }

    // If we get here, no active subscription was found
    console.log('No active subscription found');
    return { status: 'inactive' };
  } catch (error) {
    console.error('Error checking subscription:', error);
    console.error('Error details:', error.message);
    if (error.type) console.error('Stripe error type:', error.type);
    if (error.stack) console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Add a function to fix subscription status
exports.fixSubscriptionStatus = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = data.userId || context.auth.uid;
  console.log(`Attempting to fix subscription for user: ${userId}`);

  try {
    // First, check if there's already a subscription in Firestore to debug
    const existingSubDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (existingSubDoc.exists) {
      console.log('Current subscription in Firestore:', existingSubDoc.data());
    } else {
      console.log('No existing subscription found in Firestore');
    }

    // Query Stripe customers to find the customer associated with this userId by email
    if (!context.auth.token.email) {
      throw new functions.https.HttpsError('failed-precondition', 'User email is required');
    }

    console.log(`Looking up customer by email: ${context.auth.token.email}`);
    const emailCustomers = await stripe.customers.list({
      email: context.auth.token.email,
      expand: ['data.subscriptions']
    });
    
    console.log(`Found ${emailCustomers.data.length} customers by email`);
    
    // Dump raw customer data for debugging in a cleaner format
    if (emailCustomers.data.length > 0) {
      emailCustomers.data.forEach((customer, i) => {
        console.log(`Customer ${i} ID: ${customer.id}`);
        console.log(`Customer ${i} email: ${customer.email}`);
        console.log(`Customer ${i} metadata:`, customer.metadata);
        
        if (customer.subscriptions && customer.subscriptions.data.length > 0) {
          console.log(`Customer ${i} has ${customer.subscriptions.data.length} subscriptions:`);
          customer.subscriptions.data.forEach((sub, j) => {
            console.log(`- Subscription ${j} ID: ${sub.id}, Status: ${sub.status}`);
            if (sub.items && sub.items.data.length > 0) {
              sub.items.data.forEach((item, k) => {
                console.log(`  - Item ${k} ID: ${item.id}, Price: ${item.price.id}, Amount: ${item.price.unit_amount}`);
              });
            }
          });
        } else {
          console.log(`Customer ${i} has no subscriptions`);
        }
      });
    }
    
    let activeSubscription = null;
    let customerId = null;
    
    // Check each customer for active subscriptions
    for (const customer of emailCustomers.data) {
      console.log(`Checking customer ${customer.id}`);
      
      if (customer.subscriptions && customer.subscriptions.data.length > 0) {
        console.log(`Customer has ${customer.subscriptions.data.length} subscriptions`);
        
        const activeSubscriptions = customer.subscriptions.data.filter(
          sub => sub.status === 'active' || sub.status === 'trialing'
        );
        
        console.log(`Found ${activeSubscriptions.length} active subscriptions`);
        
        if (activeSubscriptions.length > 0) {
          // Sort by creation date descending to get the newest subscription first
          activeSubscriptions.sort((a, b) => 
            new Date(b.created) - new Date(a.created)
          );
          
          activeSubscription = activeSubscriptions[0];
          customerId = customer.id;
          console.log(`Selected active subscription ${activeSubscription.id} (newest)`);
          break;
        }
      }
    }
    
    // If no active subscription found, try looking for subscriptions directly
    if (!activeSubscription) {
      console.log('No active subscription found via customers. Trying direct subscription lookup...');
      
      // Get all subscriptions (up to 100) and filter for this user's email
      const allSubscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: 'active',
        expand: ['data.customer']
      });
      
      console.log(`Found ${allSubscriptions.data.length} total active subscriptions`);
      
      // Find subscriptions where the customer email matches
      const matchingSubscriptions = allSubscriptions.data.filter(sub => 
        sub.customer && 
        sub.customer.email === context.auth.token.email
      );
      
      console.log(`Found ${matchingSubscriptions.length} subscriptions matching email`);
      
      if (matchingSubscriptions.length > 0) {
        // Sort by creation date descending to get the newest subscription first
        matchingSubscriptions.sort((a, b) => 
          new Date(b.created) - new Date(a.created)
        );
        
        activeSubscription = matchingSubscriptions[0];
        customerId = activeSubscription.customer.id;
        console.log(`Selected active subscription ${activeSubscription.id} from direct lookup`);
      }
    }
    
    if (!activeSubscription) {
      console.log('No active subscription found via any method');
      // Check if we have an existing inactive record and update it
      const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
      
      if (subscriptionDoc.exists) {
        console.log('Updating inactive subscription record');
        await admin.firestore().collection('subscriptions').doc(userId).update({
          status: 'inactive',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { 
          status: 'inactive',
          updated: true,
          message: 'Subscription record updated to inactive'
        };
      }
      
      return { 
        status: 'inactive',
        updated: false,
        message: 'No active subscription found and no record to update'
      };
    }

    // We found an active subscription, let's update Firestore
    console.log(`Found active subscription ${activeSubscription.id}, updating Firestore`);
    
    // Ensure the customer has firebaseUID metadata
    await stripe.customers.update(customerId, {
      metadata: { 
        firebaseUID: userId,
        client_reference_id: userId
      }
    });
    
    // Get plan details
    let planName = 'Premium';
    if (activeSubscription.items && 
        activeSubscription.items.data && 
        activeSubscription.items.data.length > 0 &&
        activeSubscription.items.data[0].price && 
        activeSubscription.items.data[0].price.nickname) {
      planName = activeSubscription.items.data[0].price.nickname;
    }
    
    const subscription = {
      status: activeSubscription.status,
      customerId: customerId,
      subscriptionId: activeSubscription.id,
      plan: planName,
      priceId: activeSubscription.items.data[0].price.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if this is a new record
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    if (!subscriptionDoc.exists) {
      subscription.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    // Update the subscription record
    await admin.firestore().collection('subscriptions').doc(userId).set(subscription, { merge: true });
    
    console.log(`Updated subscription for user ${userId} with data:`, subscription);
    
    return {
      status: activeSubscription.status,
      updated: true,
      message: 'Subscription record updated successfully',
      subscription: subscription
    };
  } catch (error) {
    console.error('Error fixing subscription:', error);
    console.error('Error details:', error.message);
    if (error.type) console.error('Stripe error type:', error.type);
    if (error.stack) console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Webhook handler for Stripe events
exports.stripeWebhook = functions.https.onRequest(async (request, response) => {
  const signature = request.headers['stripe-signature'];
  const endpointSecret = functions.config().stripe.webhook_secret;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody,
      signature,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`Received Stripe webhook event: ${event.type}`);
  
  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Checkout session completed: ${session.id}`);
        
        // Extract Firebase user ID from metadata
        const firebaseUid = session.metadata?.firebaseUID;
        if (!firebaseUid) {
          console.error('No Firebase UID found in session metadata');
          break;
        }
        
        console.log(`Processing successful checkout for user: ${firebaseUid}`);
        
        // For checkout.session.completed, set up the subscription data
        if (session.subscription) {
          console.log(`Associated subscription: ${session.subscription}`);
          
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Update the user's subscription status in Firestore
          const admin = require('firebase-admin');
          if (!admin.apps.length) {
            admin.initializeApp();
          }
          
          await admin.firestore().collection('subscriptions').doc(firebaseUid).set({
            status: subscription.status,
            customerId: session.customer,
            subscriptionId: subscription.id,
            plan: 'Premium', // You can get this from the plan details if needed
            priceId: subscription.items.data[0].price.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          console.log(`Updated subscription status for user ${firebaseUid} to ${subscription.status}`);
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscriptionEvent = event.data.object;
        console.log(`Subscription ${subscriptionEvent.id} status is ${subscriptionEvent.status}`);
        
        // Find the Firebase user ID from the customer
        try {
          const customer = await stripe.customers.retrieve(subscriptionEvent.customer);
          const firebaseUserId = customer.metadata?.firebaseUID;
          
          if (firebaseUserId) {
            console.log(`Found Firebase user ID: ${firebaseUserId}`);
            
            // Update the subscription in Firestore
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
              admin.initializeApp();
            }
            
            await admin.firestore().collection('subscriptions').doc(firebaseUserId).set({
              status: subscriptionEvent.status,
              customerId: subscriptionEvent.customer,
              subscriptionId: subscriptionEvent.id,
              plan: 'Premium', // You can get this from the plan details if needed
              priceId: subscriptionEvent.items.data[0].price.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`Updated subscription status for user ${firebaseUserId} to ${subscriptionEvent.status}`);
          } else {
            console.error(`No Firebase user ID found for customer: ${subscriptionEvent.customer}`);
          }
        } catch (error) {
          console.error('Error updating customer subscription:', error);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log(`Subscription ${deletedSubscription.id} was deleted/canceled`);
        
        try {
          const customer = await stripe.customers.retrieve(deletedSubscription.customer);
          const firebaseUserId = customer.metadata?.firebaseUID;
          
          if (firebaseUserId) {
            console.log(`Found Firebase user ID for deleted subscription: ${firebaseUserId}`);
            
            // Update the subscription in Firestore
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
              admin.initializeApp();
            }
            
            await admin.firestore().collection('subscriptions').doc(firebaseUserId).set({
              status: 'inactive',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              cancellationReason: deletedSubscription.cancellation_details?.reason || 'unknown'
            }, { merge: true });
            
            console.log(`Updated subscription status for user ${firebaseUserId} to inactive (deleted)`);
          }
        } catch (error) {
          console.error('Error handling subscription deletion:', error);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a response to acknowledge receipt of the event
    response.json({ received: true, success: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    response.status(500).json({ received: true, error: error.message });
  }
});

// Add a test function for debugging Stripe customer integration
exports.testStripeCustomers = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    console.log('Running test Stripe customers function');
    
    // List all customers from Stripe
    const allCustomers = await stripe.customers.list({
      limit: 10
    });
    
    console.log(`Found ${allCustomers.data.length} customers in Stripe`);
    
    // Test creating a customer
    const testCustomer = await stripe.customers.create({
      email: context.auth.token.email,
      metadata: {
        client_reference_id: context.auth.uid,
        source: 'debug_test'
      }
    });
    
    console.log('Successfully created test customer:', testCustomer.id);
    
    return {
      success: true,
      customersCount: allCustomers.data.length,
      testCustomerId: testCustomer.id,
      message: `Found ${allCustomers.data.length} existing customers and created test customer ${testCustomer.id}`
    };
  } catch (error) {
    console.error('Error in testStripeCustomers:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Add a function to create a Stripe checkout session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    console.log('Creating checkout session for user:', context.auth.uid);
    console.log('Data received:', JSON.stringify(data));
    
    let lineItems = [];
    
    // Check if we have productId and priceData
    if (data.productId && data.priceData) {
      console.log('Using product-based pricing with:', {
        productId: data.productId,
        priceData: data.priceData
      });
      
      lineItems = [{
        price_data: {
          ...data.priceData,
          product: data.productId
        },
        quantity: 1
      }];
    } else if (data.priceId) {
      // Fallback to price ID if provided
      console.log('Using price ID:', data.priceId);
      const priceId = data.priceId.startsWith('price_') ? data.priceId : `price_${data.priceId}`;
      
      lineItems = [{
        price: priceId,
        quantity: 1
      }];
    } else {
      throw new Error('Must provide either productId and priceData, or priceId');
    }
    
    // Construct the success and cancel URLs
    const baseUrl = data.baseUrl || 'http://localhost:3000';
    const successUrl = data.successUrl || `${baseUrl}/?checkout_success=true`;
    const cancelUrl = data.cancelUrl || `${baseUrl}/dashboard/pricing`;
    
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);
    
    // Create a customer if one doesn't exist
    let customerId;
    
    // Try to find an existing customer
    console.log('Looking for existing customer with email:', context.auth.token.email);
    const customers = await stripe.customers.list({
      email: context.auth.token.email,
      limit: 1
    });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('Found existing customer:', customerId);
    } else {
      // Create a new customer
      console.log('Creating new customer with email:', context.auth.token.email);
      const newCustomer = await stripe.customers.create({
        email: context.auth.token.email,
        metadata: {
          firebaseUID: context.auth.uid
        }
      });
      customerId = newCustomer.id;
      console.log('Created new customer:', customerId);
    }
    
    // Create the checkout session
    console.log('Creating checkout session with:', { 
      customer: customerId,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUID: context.auth.uid
      }
    });
    
    console.log('Created checkout session:', session.id);
    console.log('Checkout URL:', session.url);
    
    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for specific Stripe error types
    if (error.type) {
      console.error('Stripe error type:', error.type);
    }
    
    if (error.raw) {
      console.error('Stripe raw error:', error.raw);
    }
    
    throw new functions.https.HttpsError('internal', 
      `Stripe Error: ${error.message}. Please check the Firebase logs for more details.`);
  }
});

// Add a test function to check the Stripe price
exports.testStripePrice = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    const priceId = data.priceId || 'bIY2aL2oC2kBaXe9AA';
    const productId = data.productId || 'prod_S2EYR7XWZewDLv';
    
    // Test with and without price_ prefix
    const testResults = [];
    let product = null;
    
    // Try to get product info
    try {
      console.log(`Testing product ID: ${productId}`);
      product = await stripe.products.retrieve(productId);
      console.log(`Product exists: ${product.id}, name: ${product.name}`);
    } catch (error) {
      console.log(`Product ${productId} doesn't exist:`, error.message);
    }
    
    // Try with original ID
    try {
      console.log(`Testing price ID directly: ${priceId}`);
      const price = await stripe.prices.retrieve(priceId);
      testResults.push({
        id: priceId,
        exists: true,
        price: {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount
        }
      });
    } catch (error) {
      console.log(`Price ${priceId} doesn't exist:`, error.message);
      testResults.push({
        id: priceId,
        exists: false,
        error: error.message
      });
    }
    
    // Try with price_ prefix
    if (!priceId.startsWith('price_')) {
      const prefixedId = `price_${priceId}`;
      try {
        console.log(`Testing price ID with prefix: ${prefixedId}`);
        const price = await stripe.prices.retrieve(prefixedId);
        testResults.push({
          id: prefixedId,
          exists: true,
          price: {
            id: price.id,
            active: price.active,
            currency: price.currency,
            unit_amount: price.unit_amount
          }
        });
      } catch (error) {
        console.log(`Price ${prefixedId} doesn't exist:`, error.message);
        testResults.push({
          id: prefixedId,
          exists: false,
          error: error.message
        });
      }
    }
    
    // List active prices
    const activePrices = await stripe.prices.list({
      active: true,
      limit: 10
    });
    
    console.log(`Found ${activePrices.data.length} active prices`);
    
    // Test creating a price using the product ID
    let testPrice = null;
    try {
      if (product) {
        console.log(`Testing price creation with product: ${productId}`);
        // Create a test price with a unique lookup_key to avoid duplicates
        const timestamp = new Date().getTime();
        testPrice = await stripe.prices.create({
          product: productId,
          unit_amount: 1299,
          currency: 'usd',
          recurring: {
            interval: 'month'
          },
          lookup_key: `test_price_${timestamp}`,
          metadata: {
            test: 'true',
            created_from: 'test_function'
          }
        });
        console.log(`Successfully created test price: ${testPrice.id}`);
      }
    } catch (error) {
      console.log(`Failed to create test price:`, error.message);
    }
    
    return {
      testResults,
      activePrices: activePrices.data.map(p => ({
        id: p.id,
        active: p.active,
        currency: p.currency,
        unit_amount: p.unit_amount,
        product: p.product
      })),
      product: product ? {
        id: product.id,
        name: product.name,
        active: product.active,
        description: product.description
      } : null,
      testPrice: testPrice ? {
        id: testPrice.id,
        active: testPrice.active,
        product: testPrice.product,
        unit_amount: testPrice.unit_amount,
        currency: testPrice.currency
      } : null
    };
  } catch (error) {
    console.error('Error in testStripePrice:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Add a new function for direct subscription checking
exports.directSubscriptionCheck = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = data.userId || context.auth.uid;
  const userEmail = data.email || context.auth.token.email;
  
  if (!userEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required for direct subscription check');
  }
  
  console.log(`Direct subscription check for user: ${userId}, email: ${userEmail}`);

  try {
    // Try direct customer lookup by email first
    console.log(`Looking up customers by email: ${userEmail}`);
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 100,
      expand: ['data.subscriptions']
    });
    
    console.log(`Found ${customers.data.length} customers by email`);
    
    // Check each customer for active subscriptions
    for (const customer of customers.data) {
      console.log(`Checking customer: ${customer.id}`);
      
      if (customer.subscriptions && customer.subscriptions.data.length > 0) {
        console.log(`Customer has ${customer.subscriptions.data.length} subscriptions`);
        
        // Log all subscription statuses for debugging
        customer.subscriptions.data.forEach((sub, index) => {
          console.log(`Subscription ${index} status: ${sub.status}, id: ${sub.id}`);
        });
        
        // Find active subscriptions
        const activeSubscriptions = customer.subscriptions.data.filter(
          sub => sub.status === 'active' || sub.status === 'trialing'
        );
        
        console.log(`Found ${activeSubscriptions.length} active subscriptions`);
        
        if (activeSubscriptions.length > 0) {
          // Get the most recent active subscription
          activeSubscriptions.sort((a, b) => new Date(b.created) - new Date(a.created));
          const subscription = activeSubscriptions[0];
          
          // Get subscription details
          const plan = subscription.items.data[0].price.nickname || 'Premium';
          
          console.log(`Found active subscription: ${subscription.id}, plan: ${plan}`);
          
          // Save to Firestore for future reference
          await admin.firestore().collection('subscriptions').doc(userId).set({
            status: subscription.status,
            customerId: customer.id,
            subscriptionId: subscription.id,
            plan: plan,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          return {
            success: true,
            message: 'Active subscription found and saved',
            subscription: {
              status: subscription.status,
              customerId: customer.id,
              subscriptionId: subscription.id,
              plan: plan,
            }
          };
        }
      }
    }
    
    // If no active subscriptions found, try looking directly at subscriptions
    console.log('No active subscriptions found via customers. Trying to search recent subscriptions...');
    
    // Get recent subscriptions (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      expand: ['data.customer']
    });
    
    console.log(`Found ${subscriptions.data.length} recent subscriptions`);
    
    // Check each subscription for a match with our user
    for (const subscription of subscriptions.data) {
      if (!subscription.customer) continue;
      
      // Extract customer information
      const customer = subscription.customer;
      
      // Check if this customer matches our user's email
      if (customer.email && customer.email.toLowerCase() === userEmail.toLowerCase()) {
        console.log(`Found subscription matching user email: ${subscription.id}`);
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Get plan details
          const plan = subscription.items.data[0].price.nickname || 'Premium';
          
          console.log(`Found active subscription: ${subscription.id}, plan: ${plan}`);
          
          // Update customer metadata to include our user ID for future lookups
          await stripe.customers.update(customer.id, {
            metadata: { 
              firebaseUID: userId,
              client_reference_id: userId 
            }
          });
          
          // Save to Firestore for future reference
          await admin.firestore().collection('subscriptions').doc(userId).set({
            status: subscription.status,
            customerId: customer.id,
            subscriptionId: subscription.id,
            plan: plan,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          return {
            success: true,
            message: 'Active subscription found in recent subscriptions',
            subscription: {
              status: subscription.status,
              customerId: customer.id,
              subscriptionId: subscription.id,
              plan: plan,
            }
          };
        }
      }
    }
    
    console.log('No subscriptions found for this user with direct check');
    return { success: false, message: 'No active subscription found with direct check' };
  } catch (error) {
    console.error('Error during direct subscription check:', error);
    return { success: false, message: error.message };
  }
});

// Add a function to create a Stripe customer portal session
exports.createCustomerPortalSession = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  console.log(`Creating customer portal session for user: ${userId}`);

  try {
    // First, try to find the customer ID by querying Firestore
    const subscriptionDoc = await admin.firestore().collection('subscriptions').doc(userId).get();
    let customerId = null;

    if (subscriptionDoc.exists) {
      const firestoreSubscription = subscriptionDoc.data();
      customerId = firestoreSubscription.customerId;
      console.log(`Found customer ID in Firestore: ${customerId}`);
    }

    // If not found in Firestore, look up in Stripe by email
    if (!customerId && context.auth.token.email) {
      console.log(`Looking up customer by email: ${context.auth.token.email}`);
      const customers = await stripe.customers.list({
        email: context.auth.token.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Found customer ID in Stripe: ${customerId}`);
      }
    }

    // If still not found, look up by metadata
    if (!customerId) {
      console.log(`Looking up customer by Firebase UID metadata`);
      const customers = await stripe.customers.list({
        limit: 100
      });

      const matchingCustomer = customers.data.find(customer => 
        customer.metadata && 
        (customer.metadata.firebaseUID === userId || 
         customer.metadata.client_reference_id === userId)
      );

      if (matchingCustomer) {
        customerId = matchingCustomer.id;
        console.log(`Found customer ID by metadata: ${customerId}`);
      }
    }

    // If still no customer found, return error
    if (!customerId) {
      console.log(`No customer found for user ${userId}`);
      throw new functions.https.HttpsError(
        'not-found', 
        'No subscription found for this account'
      );
    }

    // Create a customer portal session
    const baseUrl = data.baseUrl || 'http://localhost:3000';
    const returnUrl = data.returnUrl || `${baseUrl}/dashboard`;

    console.log(`Creating portal session for customer ${customerId} with return URL ${returnUrl}`);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`Created portal session: ${session.id}, URL: ${session.url}`);
    return {
      success: true,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 