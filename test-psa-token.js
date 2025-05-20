// Simple script to test PSA API token
const fetch = require('node-fetch');

// Known valid PSA cert number for testing
const certNumber = '89101258'; // The Charizard from your screenshots

// Test the token directly
async function testPsaToken() {
  console.log('Testing PSA API token...');
  
  try {
    // Call the Firebase function we just deployed
    const response = await fetch(`https://us-central1-mycardtracker-c8479.cloudfunctions.net/testPsaToken?certNumber=${certNumber}`);
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n=== PSA TOKEN TEST RESULTS ===');
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Certificate: ${data.certNumber}`);
    console.log(`\nToken Status:`);
    console.log(`- Valid: ${data.tokenStatus.isLikelyValid}`);
    console.log(`- Expired: ${data.tokenStatus.isLikelyExpired}`);
    console.log(`- Recommendation: ${data.tokenStatus.recommendation}`);
    
    console.log(`\nEndpoint Summary:`);
    console.log(`- Total Endpoints: ${data.summary.totalEndpoints}`);
    console.log(`- Successful: ${data.summary.successfulEndpoints}`);
    console.log(`- Failed: ${data.summary.failedEndpoints}`);
    
    console.log('\nDetailed Results:');
    data.endpointResults.forEach((result, index) => {
      console.log(`\nEndpoint ${index + 1}: ${result.endpoint}`);
      console.log(`- Success: ${result.success}`);
      if (result.status) {
        console.log(`- Status: ${result.status} ${result.statusText}`);
      }
      if (result.error) {
        console.log(`- Error: ${result.error}`);
      }
      
      // Show a sample of the response data if available
      if (result.data) {
        console.log('- Response Data Sample:');
        console.log(JSON.stringify(result.data).substring(0, 200) + '...');
      }
    });
    
    console.log('\n=== CONCLUSION ===');
    if (data.tokenStatus.isLikelyExpired) {
      console.log('The PSA API token appears to be EXPIRED and needs to be renewed.');
    } else if (data.tokenStatus.isLikelyValid) {
      console.log('The PSA API token appears to be VALID.');
    } else {
      console.log('The PSA API token status is UNCERTAIN. All endpoints failed but not necessarily due to token issues.');
    }
    
  } catch (error) {
    console.error('Error testing PSA token:', error);
  }
}

// Run the test
testPsaToken();
