/**
 * Ad Block Detector
 * 
 * This utility helps detect if ad blockers or privacy extensions are
 * interfering with Firebase connections and provides workarounds.
 */

import logger from './logger';

/**
 * Detects if an ad blocker or privacy extension is likely active
 * @returns {Promise<boolean>} True if an ad blocker is detected
 */
export const detectAdBlocker = async () => {
  try {
    // Method 1: Try to fetch a resource that ad blockers typically block
    const testUrls = [
      'https://www.google-analytics.com/analytics.js',
      'https://googleads.g.doubleclick.net/pagead/id',
      'https://stats.g.doubleclick.net/r/collect'
    ];
    
    // Try each URL to see if any are blocked
    for (const url of testUrls) {
      try {
        const response = await fetch(url, { 
          mode: 'no-cors',
          cache: 'no-store',
          method: 'HEAD'
        });
        // If we get here, the request wasn't blocked
      } catch (error) {
        // If we get an error, it might be blocked
        logger.debug(`Possible ad blocker detected: ${error.message}`);
        return true;
      }
    }
    
    // Method 2: Check for common ad blocker variables
    if (window.adBlockDetected || 
        window.blockAdBlock || 
        window.adBlocker || 
        window.fuckAdBlock) {
      logger.debug('Ad blocker detected via global variables');
      return true;
    }
    
    // Method 3: Create a bait element
    const bait = document.createElement('div');
    bait.setAttribute('class', 'ads ad adsbox doubleclick ad-placement carbon-ads');
    bait.setAttribute('style', 'height: 1px; width: 1px; position: absolute; left: -10000px; top: -10000px;');
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    
    // Check if the bait was hidden by an ad blocker
    const isHidden = window.getComputedStyle(bait).display === 'none' || 
                     bait.offsetHeight === 0 || 
                     bait.offsetParent === null;
    
    // Clean up
    document.body.removeChild(bait);
    
    if (isHidden) {
      logger.debug('Ad blocker detected via DOM bait element');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error in ad blocker detection:', error);
    return false; // Assume no ad blocker on error
  }
};

/**
 * Apply workarounds for ad blockers
 * @param {boolean} adBlockerDetected Whether an ad blocker was detected
 */
export const applyAdBlockWorkarounds = (adBlockerDetected) => {
  if (adBlockerDetected) {
    logger.info('Applying ad blocker workarounds');
    
    // Add a class to the body to enable CSS workarounds
    document.body.classList.add('adblocker-detected');
    
    // Show a user-friendly message
    const showAdBlockMessage = () => {
      // Only show if we're not in an iframe and haven't shown it before
      if (window.top === window.self && !localStorage.getItem('adblock-message-shown')) {
        const message = document.createElement('div');
        message.className = 'adblock-message';
        message.innerHTML = `
          <div style="position: fixed; bottom: 20px; right: 20px; background: #f8f9fa; border: 1px solid #dee2e6; 
                      border-radius: 4px; padding: 15px; max-width: 350px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 9999;">
            <h4 style="margin-top: 0; color: #343a40;">Ad Blocker Detected</h4>
            <p style="margin-bottom: 10px; color: #495057;">
              Your ad blocker might interfere with some app features. If you experience issues, consider disabling it for this site.
            </p>
            <button id="adblock-dismiss" style="background: #007bff; color: white; border: none; padding: 5px 10px; 
                                               border-radius: 4px; cursor: pointer;">Got it</button>
          </div>
        `;
        
        document.body.appendChild(message);
        
        // Add event listener to dismiss button
        document.getElementById('adblock-dismiss').addEventListener('click', () => {
          document.body.removeChild(message);
          localStorage.setItem('adblock-message-shown', 'true');
        });
      }
    };
    
    // Show the message after a short delay
    setTimeout(showAdBlockMessage, 3000);
  }
};

export default {
  detectAdBlocker,
  applyAdBlockWorkarounds
};
