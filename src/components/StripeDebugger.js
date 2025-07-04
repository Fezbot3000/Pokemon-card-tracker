import React, { useState } from 'react';
import { useAuth } from '../design-system/contexts/AuthContext';
import Button from '../design-system/atoms/Button';
import { toast } from 'react-hot-toast';

/**
 * StripeDebugger Component
 * 
 * Comprehensive debugging tool for Stripe integration issues
 */
const StripeDebugger = () => {
  const { user } = useAuth();
  const [debugResults, setDebugResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, status, details, error = null) => {
    const result = {
      test,
      status,
      details,
      error,
      timestamp: new Date().toISOString()
    };
    setDebugResults(prev => [...prev, result]);
    return result;
  };

  const clearResults = () => {
    setDebugResults([]);
    console.clear();
  };

  // Test 1: Environment Variables
  const testEnvironmentVariables = () => {
    console.log('🔍 Testing Environment Variables...');
    
    // Log the actual values (first few characters only for security)
    console.log('Raw environment check:');
    console.log('REACT_APP_STRIPE_PUBLISHABLE_KEY exists:', !!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
    console.log('REACT_APP_STRIPE_PUBLISHABLE_KEY preview:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.substring(0, 10) + '...');
    console.log('REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID exists:', !!process.env.REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID);
    console.log('REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID preview:', process.env.REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID?.substring(0, 10) + '...');
    
    const envVars = {
      'REACT_APP_STRIPE_PUBLISHABLE_KEY': process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
      'REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID': process.env.REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID,
      'REACT_APP_FIREBASE_PROJECT_ID': process.env.REACT_APP_FIREBASE_PROJECT_ID,
      'REACT_APP_FIREBASE_API_KEY': process.env.REACT_APP_FIREBASE_API_KEY
    };

    const results = {};
    for (const [key, value] of Object.entries(envVars)) {
      results[key] = {
        exists: !!value,
        type: value ? (key.includes('STRIPE') ? 'live' : 'set') : 'missing',
        keyType: value && key.includes('STRIPE_PUBLISHABLE_KEY') ? 
          (value.startsWith('pk_live_') ? 'LIVE' : value.startsWith('pk_test_') ? 'TEST' : 'UNKNOWN') : 'N/A',
        preview: value ? value.substring(0, 10) + '...' : 'undefined'
      };
    }

    addResult('Environment Variables', '✅ Complete', results);
    return results;
  };

  // Test 2: Stripe SDK Loading
  const testStripeSDK = async () => {
    console.log('📦 Testing Stripe SDK...');
    
    try {
      const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        throw new Error('No Stripe publishable key found');
      }

      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripeKey);
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Try to create a payment method to test if the key works
      const { error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123'
        }
      });

      const details = {
        stripeLoaded: true,
        keyType: stripeKey.startsWith('pk_live_') ? 'LIVE' : 'TEST',
        keyValid: !pmError || pmError.type !== 'invalid_request_error',
        testResult: pmError ? pmError.message : 'Key appears valid'
      };

      addResult('Stripe SDK', '✅ Success', details);
      return details;
    } catch (error) {
      console.error('Stripe SDK test failed:', error);
      addResult('Stripe SDK', '❌ Failed', null, error.message);
      throw error;
    }
  };

  // Test 3: Firebase Functions Connection
  const testFirebaseConnection = async () => {
    console.log('🔥 Testing Firebase Functions...');
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      
      // Test if function exists and is callable
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const details = {
        functionsLoaded: true,
        userAuthenticated: !!user,
        userId: user.uid,
        userEmail: user.email
      };

      addResult('Firebase Connection', '✅ Success', details);
      return { createCheckoutSession, details };
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      addResult('Firebase Connection', '❌ Failed', null, error.message);
      throw error;
    }
  };

  // Test 4: Full Checkout Session Creation
  const testCheckoutSession = async () => {
    console.log('💳 Testing Checkout Session Creation...');
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      console.log('📞 Calling createCheckoutSession...');
      const startTime = Date.now();
      
      const result = await createCheckoutSession({
        debug: true,
        testMode: false
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      const details = {
        success: true,
        duration: `${duration}ms`,
        sessionId: result.data?.sessionId,
        url: result.data?.url,
        fullResponse: result.data
      };

      addResult('Checkout Session', '✅ Success', details);
      return details;
    } catch (error) {
      console.error('Checkout session test failed:', error);
      
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        type: error.constructor.name
      };

      addResult('Checkout Session', '❌ Failed', null, errorDetails);
      throw error;
    }
  };

  // Test 5: Network and CORS
  const testNetworkAndCORS = async () => {
    console.log('🌐 Testing Network and CORS...');
    
    try {
      // Test basic network connectivity
      const response = await fetch('https://api.stripe.com/v1', {
        method: 'HEAD'
      });

      const details = {
        stripeApiReachable: response.ok,
        statusCode: response.status,
        corsHeaders: {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods')
        }
      };

      addResult('Network & CORS', '✅ Success', details);
      return details;
    } catch (error) {
      console.error('Network test failed:', error);
      addResult('Network & CORS', '❌ Failed', null, error.message);
      throw error;
    }
  };

  const testEnvironmentDifferences = async () => {
    try {
      console.log('🧪 ENVIRONMENT TEST: Starting diagnostic test');
      
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      
      const testStripeConfig = httpsCallable(functions, 'testStripeConfig');
      const result = await testStripeConfig({});
      
      console.log('🧪 ENVIRONMENT TEST: Diagnostic result:', result);
      
      if (result.data.success) {
        console.log('🧪 ENVIRONMENT ANALYSIS:');
        console.log('🧪 Has Auth:', result.data.environment.hasAuth);
        console.log('🧪 User ID:', result.data.environment.userId);
        console.log('🧪 Has Config:', result.data.environment.hasConfig);
        console.log('🧪 Has Stripe Config:', result.data.environment.hasStripeConfig);
        console.log('🧪 Stripe Config Keys:', result.data.environment.stripeConfigKeys);
        console.log('🧪 Has Secret Key:', result.data.environment.hasSecretKey);
        console.log('🧪 Has Premium Price ID:', result.data.environment.hasPremiumPriceId);
        console.log('🧪 Has Webhook Secret:', result.data.environment.hasWebhookSecret);
        console.log('🧪 Has Env Secret Key:', result.data.environment.hasEnvSecretKey);
        console.log('🧪 Has Env Price ID:', result.data.environment.hasEnvPriceId);
        console.log('🧪 Stripe Init Test:', result.data.environment.stripeInitTest);
        console.log('🧪 Stripe Error:', result.data.environment.stripeError);
        console.log('🧪 Origin:', result.data.environment.origin);
        console.log('🧪 Timestamp:', result.data.environment.timestamp);
        
        alert(`Environment Test Complete!\nCheck console for detailed results.\n\nKey findings:\n- Auth: ${result.data.environment.hasAuth}\n- Config: ${result.data.environment.hasConfig}\n- Stripe Config: ${result.data.environment.hasStripeConfig}\n- Secret Key: ${result.data.environment.hasSecretKey}\n- Stripe Init: ${result.data.environment.stripeInitTest}`);
      } else {
        console.error('🧪 ENVIRONMENT TEST: Failed -', result.data.error);
        alert(`Environment Test Failed!\nError: ${result.data.error}\nCheck console for details.`);
      }
      
    } catch (error) {
      console.error('🧪 ENVIRONMENT TEST: Error -', error);
      alert(`Environment Test Error!\nError: ${error.message}\nCheck console for details.`);
    }
  };

  // Run all tests
  const runFullDiagnostic = async () => {
    setIsRunning(true);
    clearResults();
    
    console.log('🚀 Starting Full Stripe Diagnostic...');
    
    try {
      // Test 1: Environment Variables
      await testEnvironmentVariables();
      
      // Test 2: Network & CORS
      await testNetworkAndCORS();
      
      // Test 3: Stripe SDK
      await testStripeSDK();
      
      // Test 4: Firebase Connection
      await testFirebaseConnection();
      
      // Test 5: Checkout Session (the main test)
      await testCheckoutSession();
      
      console.log('✅ All tests completed successfully!');
      toast.success('All diagnostic tests passed!');
      
    } catch (error) {
      console.error('❌ Diagnostic failed at:', error);
      toast.error(`Diagnostic failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Individual test runners
  const runIndividualTest = async (testName) => {
    setIsRunning(true);
    try {
      switch (testName) {
        case 'env':
          testEnvironmentVariables();
          break;
        case 'stripe':
          await testStripeSDK();
          break;
        case 'firebase':
          await testFirebaseConnection();
          break;
        case 'checkout':
          await testCheckoutSession();
          break;
        case 'network':
          await testNetworkAndCORS();
          break;
        default:
          throw new Error('Unknown test');
      }
      toast.success(`${testName} test completed`);
    } catch (error) {
      toast.error(`${testName} test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        🔧 Stripe Integration Debugger
      </h2>
      
      {/* Control Panel */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Test Controls</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            onClick={runFullDiagnostic}
            variant="primary"
            loading={isRunning}
            disabled={isRunning}
          >
            🚀 Run Full Diagnostic
          </Button>
          <Button 
            onClick={() => runIndividualTest('env')}
            variant="secondary"
            size="sm"
            disabled={isRunning}
          >
            Check Environment
          </Button>
          <Button 
            onClick={() => runIndividualTest('stripe')}
            variant="secondary"
            size="sm"
            disabled={isRunning}
          >
            Test Stripe SDK
          </Button>
          <Button 
            onClick={() => runIndividualTest('firebase')}
            variant="secondary"
            size="sm"
            disabled={isRunning || !user}
          >
            Test Firebase
          </Button>
          <Button 
            onClick={() => runIndividualTest('checkout')}
            variant="secondary"
            size="sm"
            disabled={isRunning || !user}
          >
            Test Checkout
          </Button>
          <button 
            onClick={testEnvironmentDifferences}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            🧪 Test Environment Differences
          </button>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={clearResults}
            variant="secondary"
            size="sm"
          >
            Clear Results
          </Button>
        </div>
      </div>

      {/* Current Status */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">User:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {user ? user.email : 'Not logged in'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">Stripe Key Type:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'LIVE' : 
               process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') ? 'TEST' : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {debugResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Test Results</h3>
          {debugResults.map((result, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.test}
                </span>
                <div className="flex items-center gap-2">
                  <span className={result.status.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                    {result.status}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              {result.details && (
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.error && (
                <div className="mb-2">
                  <pre className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StripeDebugger; 