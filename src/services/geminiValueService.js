import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';

/**
 * GeminiValueService - Service for updating card values using Gemini AI
 * Supports both cloud function and direct API calls with fallback options
 */
class GeminiValueService {
  constructor() {
    // Fallback API key if cloud function fails
    this.fallbackApiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyB2Ub14CUulyiCp-VDNB6JhBGT0lZncWGw';
    this.isUsingFallback = false;
    
    console.log("GeminiValueService initialized. Using env variable:", !!process.env.REACT_APP_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY);
  }

  /**
   * Get card price estimation from Gemini AI
   * @param {Object} cardData - Card data containing details for analysis
   * @returns {Promise<Object>} - Estimated price and explanation
   */
  async getCardPrice(cardData) {
    console.log('Analyzing card value for:', cardData);

    try {
      // First try using the Cloud Function
      const result = await this._getCardPriceViaCloudFunction(cardData);
      this.isUsingFallback = false;
      return result;
    } catch (error) {
      console.warn('Cloud function failed, trying fallback method:', error);
      this.isUsingFallback = true;
      
      // If cloud function fails, try direct API call
      try {
        return await this._getCardPriceViaDirectApi(cardData);
      } catch (fallbackError) {
        console.error('Both cloud function and fallback failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Call the Firebase Cloud Function to get card price
   * @private
   */
  async _getCardPriceViaCloudFunction(cardData) {
    const functions = getFunctions();
    const getCardPrice = httpsCallable(functions, 'getCardPrice');
    
    const result = await getCardPrice(cardData);
    return result.data;
  }

  /**
   * Call the Gemini API directly as a fallback method
   * @private
   */
  async _getCardPriceViaDirectApi(cardData) {
    console.log("Calling Gemini API directly with card data:", cardData);

    const prompt = `Analyze the current market value of the following Pokemon card based *specifically on its grade*:
Card Name: ${cardData.cardName}
Year: ${cardData.year}
Set (if applicable): ${cardData.set || 'N/A'}
Grading Company: ${cardData.gradingCompany || 'N/A'}
Grade: ${cardData.grade || 'N/A'}

**IMPORTANT**: Provide the value for this card in the specified grade (${cardData.grade || 'raw/ungraded'}). Do not provide the raw value if a grade is given. Base the value on recent sales data for the *exact grade*.

Return the response strictly in the following format, with no additional text before or after:
1. estimatedValue: <numeric value in USD>
2. explanation: <brief explanation of how you determined this value, considering the grade>
3. comparableSales: <JSON array of recent sales for this specific grade, including 'saleDate', 'price' (USD), 'source', and 'url' (direct link to listing if possible)>. If no verifiable sales with URLs can be found for the exact grade, return an empty array [].`;

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';
    const url = `${endpoint}?key=${this.fallbackApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API direct call error:', errorText);
      throw new Error(`Gemini API error: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("Gemini API direct call raw response:", JSON.stringify(result));

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) {
      console.error("Empty response from Gemini API direct call:", JSON.stringify(result));
      throw new Error('Received empty response from Gemini API');
    }

    console.log("Extracted response text from direct call:", responseText);
    
    // Parse the response text (same logic as Cloud Function)
    let estimatedValue = null;
    let explanation = '';
    let comparableSales = [];

    try {
      // Extract estimatedValue
      const valueMatch = responseText.match(/1. estimatedValue: ([0-9.]+)/);
      if (valueMatch && valueMatch[1]) {
        estimatedValue = parseFloat(valueMatch[1]);
      }

      // Extract explanation
      const explanationMatch = responseText.match(/2. explanation: (.*?)(?=3. comparableSales:|$)/s);
      if (explanationMatch && explanationMatch[1]) {
        explanation = explanationMatch[1].trim();
      }

      // Extract comparableSales JSON array string
      const salesMatch = responseText.match(/3. comparableSales: (\s*\n*)(\[.*\])/s);
      if (salesMatch && salesMatch[2]) {
        const salesString = salesMatch[2];
        // Basic cleanup: Remove potential comments within the array string if Gemini adds them
        const cleanedSalesString = salesString.replace(/\/\/.*$/gm, '').trim();
        comparableSales = JSON.parse(cleanedSalesString);
      } else {
        console.log("Could not find comparableSales array in fallback response.");
      }
      
      if (estimatedValue === null || !explanation) {
          console.error("Failed to parse essential fields from Gemini fallback response:", responseText);
          throw new Error('Failed to parse response from Gemini API');
      }

    } catch (parseError) {
      console.error("Error parsing Gemini fallback response text:", parseError, "\nResponse Text:", responseText);
      throw new Error('Failed to parse response from Gemini API');
    }

    console.log("Parsed fallback response:", { estimatedValue, explanation, comparableSales });

    // Return the structured data
    return { estimatedValue, explanation, comparableSales };
    
  } catch (error) {
    let errorMessage = 'Gemini API direct call failed'; // Default message
    if (error.response) {
      // Include status if available, but don't await text()
      errorMessage = `Gemini API error: Status ${error.response.status}`;
    } else if (error.message) {
      // Use the standard error message if no response object
       errorMessage = `Gemini API error: ${error.message}`;
    }
    console.error("Gemini API direct call error detail:", errorMessage, error);
    throw new Error(errorMessage);
  }
}

// Create and export singleton instance
const geminiValueService = new GeminiValueService();
export default geminiValueService;
