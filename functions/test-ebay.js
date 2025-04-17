const fetch = require('node-fetch');

// Your eBay App ID
const EBAY_APP_ID = 'MattKane-MyCardTr-PRD-5b02c4443-d2b45623';

async function testEbayApi() {
  const url = 'https://svcs.ebay.com/services/search/FindingService/v1'
    + '?OPERATION-NAME=findCompletedItems'
    + '&SERVICE-VERSION=1.0.0'
    + '&SECURITY-APPNAME=' + encodeURIComponent(EBAY_APP_ID)
    + '&RESPONSE-DATA-FORMAT=JSON'
    + '&SITE-ID=15'
    + '&keywords=pokemon+card';

  console.log('Testing eBay API...');
  console.log('URL:', url);

  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('Error:', error);
  }
}

testEbayApi();
