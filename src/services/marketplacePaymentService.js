import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from './firebase-unified';
import logger from '../utils/logger';

/**
 * Marketplace payment service for Stripe Connect integration
 */
class MarketplacePaymentService {
  
  /**
   * Create complete Stripe Connect account with user information
   */
  static async createSellerAccountWithInfo(formData) {
    try {
      const createAccountWithInfo = httpsCallable(functions, 'createSellerAccountWithInfo');
      
      const result = await createAccountWithInfo({ formData });
      
      logger.info('Seller account created:', result.data);
      return result.data;
      
    } catch (error) {
      logger.error('Error creating seller account:', error);
      throw error;
    }
  }
  
  /**
   * Create Stripe Connect onboarding link for sellers
   */
  static async createSellerOnboardingLink(returnUrl, refreshUrl) {
    try {
      const createOnboardingLink = httpsCallable(functions, 'createSellerOnboardingLink');

      // Ensure HTTPS return URLs in live mode (Stripe requires HTTPS)
      const origin = window.location.origin || '';
      const isLocalHttp = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
      const safeBase = isLocalHttp ? 'https://www.mycardtracker.com.au' : origin;

      const result = await createOnboardingLink({
        returnUrl: returnUrl || `${safeBase}/dashboard/marketplace`,
        refreshUrl: refreshUrl || `${safeBase}/dashboard/marketplace?refresh=true`
      });
      
      logger.info('Seller onboarding link created:', result.data);
      return result.data;
      
    } catch (error) {
      logger.error('Error creating seller onboarding link:', error);
      throw error;
    }
  }
  
  /**
   * Process marketplace purchase with Stripe Connect
   */
  static async processMarketplacePurchase(listingId, shippingAddress) {
    try {
      const processPurchase = httpsCallable(functions, 'processMarketplacePurchase');

      // Ensure HTTPS success/cancel URLs in live mode
      const origin = window.location.origin || '';
      const isLocalHttp = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
      const safeBase = isLocalHttp ? 'https://www.mycardtracker.com.au' : origin;

      const result = await processPurchase({
        listingId,
        shippingAddress,
        successUrl: `${safeBase}/dashboard/marketplace?tab=orders`,
        cancelUrl: `${safeBase}/dashboard/marketplace`
      });
      
      logger.info('Marketplace purchase session created:', result.data);
      return result.data;
      
    } catch (error) {
      logger.error('Error processing marketplace purchase:', error);
      throw error;
    }
  }
  
  /**
   * Check if current user has completed Stripe Connect onboarding
   */
  static async checkSellerOnboardingStatus() {
    try {
      // This would typically be called from a function or checked in Firestore
      // For now, we'll check the user's marketplace profile
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');
      
      const auth = getAuth();
      const db = getFirestore();
      
      if (!auth.currentUser) {
        return { onboardingComplete: false, payoutsEnabled: false };
      }
      
      const profileRef = doc(db, 'marketplaceProfiles', auth.currentUser.uid);
      const profileDoc = await getDoc(profileRef);
      
      if (!profileDoc.exists()) {
        return { onboardingComplete: false, payoutsEnabled: false };
      }
      
      const profile = profileDoc.data();
      return {
        onboardingComplete: profile.onboardingComplete || false,
        payoutsEnabled: profile.payoutsEnabled || false,
        stripeConnectedAccountId: profile.stripeConnectedAccountId || null
      };
      
    } catch (error) {
      logger.error('Error checking seller onboarding status:', error);
      return { onboardingComplete: false, payoutsEnabled: false };
    }
  }
  
  /**
   * Get platform fee information for a given amount
   */
  static calculatePlatformFee(amount, isEstablishedSeller = false) {
    const percentage = isEstablishedSeller ? 3.5 : 8;
    const feeAmount = amount * (percentage / 100);
    const sellerPayout = amount - feeAmount;
    
    return {
      percentage,
      feeAmount,
      sellerPayout,
      totalAmount: amount
    };
  }
  
  /**
   * Format amounts for display with fees
   */
  static formatPurchaseBreakdown(amount, currency = 'AUD', isEstablishedSeller = false) {
    const fees = this.calculatePlatformFee(amount, isEstablishedSeller);
    
    return {
      listingPrice: amount,
      platformFee: fees.feeAmount,
      platformFeePercentage: fees.percentage,
      sellerReceives: fees.sellerPayout,
      currency
    };
  }
}

export default MarketplacePaymentService;
