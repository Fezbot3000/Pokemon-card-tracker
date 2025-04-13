import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { testPSAConnection, searchByCertNumber, parsePSACardData } from '../services/psaSearch';

/**
 * Debug component for testing PSA API connectivity and response structure
 */
const PSADebugTest = () => {
  const [certNumber, setCertNumber] = useState('10249374');
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    setResponseData(null);
    setParsedData(null);
    
    try {
      // Test the PSA API connection
      const data = await testPSAConnection(certNumber);
      console.log('Test Connection Response:', data);
      setResponseData(data);
      
      // Try parsing the data
      try {
        if (!data.error) {
          const parsed = parsePSACardData(data);
          setParsedData(parsed);
        }
      } catch (parseError) {
        console.error('Error parsing test data:', parseError);
        setError(`Parsing error: ${parseError.message}`);
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResponseData(null);
    setParsedData(null);
    
    try {
      // Use the actual search function
      const data = await searchByCertNumber(certNumber);
      console.log('Real Search Response:', data);
      setResponseData(data);
      
      // Try parsing the data
      try {
        if (!data.error) {
          const parsed = parsePSACardData(data);
          setParsedData(parsed);
        }
      } catch (parseError) {
        console.error('Error parsing search data:', parseError);
        setError(`Parsing error: ${parseError.message}`);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">PSA API Debug Test</h1>
      
      <div className="mb-6">
        <label className="block text-gray-700 dark:text-gray-200 mb-2">PSA Certificate Number</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={certNumber} 
            onChange={e => setCertNumber(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder="Enter PSA cert number"
          />
          <button 
            onClick={handleTestConnection}
            disabled={isLoading} 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button 
            onClick={handleRealSearch}
            disabled={isLoading} 
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            Real Search
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className="mb-4 text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {responseData && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Raw Response</h2>
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-auto max-h-60">
            <pre className="text-xs text-gray-800 dark:text-gray-300">
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {parsedData && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Parsed Data</h2>
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-auto max-h-60">
            <pre className="text-xs text-gray-800 dark:text-gray-300">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
          <li>Check that your PSA API token is correct and not expired</li>
          <li>Verify the certification number exists in the PSA database</li>
          <li>Check the console logs for detailed error messages</li>
          <li>Try different certificate numbers to test (e.g., 10249374, 12345678)</li>
        </ul>
      </div>
    </div>
  );
};

export default PSADebugTest;
