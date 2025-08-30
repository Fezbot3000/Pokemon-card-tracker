import React, { useState } from 'react';
import { Button, toastService as toast } from '../../design-system';
import { useAuth } from '../../design-system';
import MarketplacePaymentService from '../../services/marketplacePaymentService';
import logger from '../../utils/logger';

/**
 * Multi-step seller onboarding wizard that collects all required information
 * before creating the Stripe Connect account
 */
function SellerOnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal/Business Info
    businessType: 'individual', // 'individual' or 'company'
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    
    // Business Info (if company)
    businessName: '',
    businessWebsite: '',
    businessDescription: '',
    
    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'AU',
    
    // Bank Account
    accountHolderName: '',
    routingNumber: '', // BSB for Australia
    accountNumber: '',
    
    // Tax Info
    taxId: '', // ABN for Australia
    
    // Agreement
    agreesToTerms: false,
    agreesToStripeTerms: false
  });

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Business Type & Personal Info
        if (formData.businessType === 'individual') {
          if (!formData.firstName || !formData.lastName || !formData.email || !formData.dateOfBirth) {
            toast.error('Please fill in all required personal information');
            return false;
          }
        } else {
          if (!formData.businessName || !formData.businessWebsite || !formData.firstName || !formData.lastName) {
            toast.error('Please fill in all required business information');
            return false;
          }
        }
        return true;
      
      case 2: // Address
        if (!formData.addressLine1 || !formData.city || !formData.state || !formData.postalCode) {
          toast.error('Please fill in all required address fields');
          return false;
        }
        return true;
      
      case 3: // Bank Account
        if (!formData.accountHolderName || !formData.routingNumber || !formData.accountNumber) {
          toast.error('Please fill in all bank account details');
          return false;
        }
        return true;
      
      case 4: // Review & Terms
        if (!formData.agreesToTerms || !formData.agreesToStripeTerms) {
          toast.error('Please agree to the terms and conditions');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      toast.info('Creating your seller account...');

      // Create Stripe Connect account with all the information
      const result = await MarketplacePaymentService.createSellerAccountWithInfo(formData);
      
      if (result.success) {
        toast.success('🎉 Seller account created successfully! You can now receive payments.');
        onComplete();
      } else {
        throw new Error(result.error || 'Failed to create seller account');
      }

    } catch (error) {
      logger.error('Error creating seller account:', error);
      toast.error('Failed to create seller account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Business Information
        </h3>
        
        {/* Business Type */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Are you selling as an individual or business?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="individual"
                checked={formData.businessType === 'individual'}
                onChange={(e) => updateFormData('businessType', e.target.value)}
                className="mr-2"
              />
              Individual
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="company"
                checked={formData.businessType === 'company'}
                onChange={(e) => updateFormData('businessType', e.target.value)}
                className="mr-2"
              />
              Business/Company
            </label>
          </div>
        </div>

        {/* Business Name (if company) */}
        {formData.businessType === 'company' && (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => updateFormData('businessName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Your Business Name"
              />
            </div>
            
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Website *
              </label>
              <input
                type="url"
                value={formData.businessWebsite}
                onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="https://your-business-website.com"
              />
            </div>
          </>
        )}

        {/* Personal Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="0474 150 613 (will be formatted as +61474150613)"
            />
          </div>
        </div>

        {/* Date of Birth (for individuals) */}
        {formData.businessType === 'individual' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date of Birth *
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Address Information
        </h3>
        
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.addressLine1}
            onChange={(e) => updateFormData('addressLine1', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="123 Main Street"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address Line 2 (Optional)
          </label>
          <input
            type="text"
            value={formData.addressLine2}
            onChange={(e) => updateFormData('addressLine2', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateFormData('city', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              State/Territory *
            </label>
            <select
              value={formData.state}
              onChange={(e) => updateFormData('state', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select State</option>
              <option value="NSW">New South Wales</option>
              <option value="VIC">Victoria</option>
              <option value="QLD">Queensland</option>
              <option value="WA">Western Australia</option>
              <option value="SA">South Australia</option>
              <option value="TAS">Tasmania</option>
              <option value="ACT">Australian Capital Territory</option>
              <option value="NT">Northern Territory</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Postal Code *
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => updateFormData('postalCode', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="2000"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Bank Account Information
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          This is where you'll receive payments from sales. All information is securely encrypted.
        </p>
        
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Account Holder Name *
          </label>
          <input
            type="text"
            value={formData.accountHolderName}
            onChange={(e) => updateFormData('accountHolderName', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Name on the bank account"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            BSB Number *
          </label>
          <input
            type="text"
            value={formData.routingNumber}
            onChange={(e) => updateFormData('routingNumber', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="123-456"
            maxLength="7"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => updateFormData('accountNumber', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="123456789"
          />
        </div>

        {formData.businessType === 'company' && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ABN (Australian Business Number)
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => updateFormData('taxId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="12 345 678 901"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Review & Agreements
        </h3>
        
        {/* Summary */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Account Summary:</h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Type:</strong> {formData.businessType === 'individual' ? 'Individual' : 'Business'}</p>
            <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
            {formData.businessType === 'company' && <p><strong>Business:</strong> {formData.businessName}</p>}
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Address:</strong> {formData.city}, {formData.state} {formData.postalCode}</p>
            <p><strong>Bank:</strong> ***{formData.accountNumber.slice(-4)} (BSB: {formData.routingNumber})</p>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreesToTerms}
              onChange={(e) => updateFormData('agreesToTerms', e.target.checked)}
              className="mr-3 mt-1"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I agree to MyCardTracker's <a href="/terms" className="text-purple-600 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a>
            </span>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreesToStripeTerms}
              onChange={(e) => updateFormData('agreesToStripeTerms', e.target.checked)}
              className="mr-3 mt-1"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I agree to Stripe's <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Connected Account Agreement</a> and authorize MyCardTracker to create a Stripe account on my behalf
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Step {currentStep} of 4
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round((currentStep / 4) * 100)}% Complete
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-2 rounded-full bg-purple-600 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          onClick={prevStep}
          variant="secondary"
          disabled={currentStep === 1}
          className={currentStep === 1 ? 'invisible' : ''}
        >
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button onClick={nextStep} variant="primary">
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            variant="primary" 
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? 'Creating Account...' : 'Create Seller Account'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default SellerOnboardingWizard;
