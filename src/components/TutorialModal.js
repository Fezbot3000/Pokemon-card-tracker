import React, { useEffect } from 'react';
import { useTutorial, tutorialSteps } from '../contexts/TutorialContext';

// Use public asset paths instead of imports
const dashboardImg = '/screenshots/dashboard.png';
const addCardImg = '/screenshots/addcards.png';
const marketplaceImg = '/screenshots/marketplace.png';
const invoiceImg = '/screenshots/invoicepaeg.png'; 
const messagingImg = '/screenshots/marketplacemessages.png';
const mobileImg = '/screenshots/phonemockup.png';

const TutorialModal = () => {
  const { isTutorialActive, currentStep, nextStep, endTutorial } = useTutorial();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isTutorialActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isTutorialActive]);

  if (!isTutorialActive) return null;

  function getTutorialContent() {
    switch (currentStep) {
      case tutorialSteps.DASHBOARD:
        return {
          title: 'Dashboard Overview',
          content: 'Your dashboard provides a complete overview of your collection. See your total portfolio value, recent additions, top performers, and collection statistics at a glance. Monitor your investment performance and track market trends.',
          imageAlt: 'Dashboard showing collection overview with statistics and charts',
          imageSrc: dashboardImg
        };
      case tutorialSteps.ADD_CARD:
        return {
          title: 'Adding Cards',
          content: 'Easily add cards to your collection by entering the PSA certification number or manually inputting card details. The system automatically fetches card information, images, and current market values to keep your collection up-to-date.',
          imageAlt: 'Add card interface showing form fields and card details',
          imageSrc: addCardImg
        };
      case tutorialSteps.MARKETPLACE:
        return {
          title: 'Marketplace',
          content: 'Browse and discover cards from other collectors. Search by set, player, or specific cards you\'re looking for. Connect with sellers, view detailed card information, and expand your collection through our integrated marketplace.',
          imageAlt: 'Marketplace showing available cards from other collectors',
          imageSrc: marketplaceImg
        };
      case tutorialSteps.INVOICES:
        return {
          title: 'Purchase & Sales Invoices',
          content: 'Keep track of all your transactions with detailed invoices. Record purchases, manage sales, and maintain a complete financial history of your collecting activities. Generate professional invoices for your sales.',
          imageAlt: 'Invoice management interface showing purchase and sales records',
          imageSrc: invoiceImg
        };
      case tutorialSteps.MESSAGING:
        return {
          title: 'Marketplace Messaging',
          content: 'Communicate directly with other collectors through our secure messaging system. Negotiate prices, ask questions about cards, and build relationships within the collecting community.',
          imageAlt: 'Messaging interface for communicating with other collectors',
          imageSrc: messagingImg
        };
      case tutorialSteps.MOBILE:
        return {
          title: 'Mobile Experience',
          content: 'Access your collection anywhere with our responsive mobile interface. Add cards on the go, check values at card shows, and manage your collection from your phone or tablet.',
          imageAlt: 'Mobile app interface showing collection management on phone',
          imageSrc: mobileImg
        };
      case tutorialSteps.GET_STARTED:
        return {
          title: 'Ready to Get Started!',
          content: 'You\'re all set! Click "Start Collecting" below to add your first card and begin building your digital collection. You can always access this tutorial again from the help menu.',
          imageAlt: 'Ready to start collecting cards',
          imageSrc: null
        };
      default:
        return {
          title: 'Welcome',
          content: 'Welcome to the Pokemon Card Tracker tutorial!',
          imageAlt: 'Welcome screen',
          imageSrc: null
        };
    }
  };

  const content = getTutorialContent();

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        height: '100vh',
        minHeight: '100vh'
      }}
    >
      {/* Blurred Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={endTutorial}
      />
      
      {/* Modal Container */}
      <div 
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div className="border-b border-gray-200 dark:border-gray-700/50 px-6 pt-6 pb-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {content.title}
          </h3>
          <button
            onClick={endTutorial}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Image Section - Much larger */}
            <div className="order-2 md:order-1">
              {content.imageSrc ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 shadow-lg">
                  <img 
                    src={content.imageSrc} 
                    alt={content.imageAlt} 
                    className="w-full h-auto object-contain max-h-[400px]"
                    onError={(e) => {
                      console.error(`Failed to load image: ${content.imageSrc}`);
                      e.target.style.display = 'none';
                      e.target.parentNode.classList.add('h-64', 'flex', 'items-center', 'justify-center');
                      const placeholder = document.createElement('div');
                      placeholder.className = 'text-gray-400 dark:text-gray-600 text-center';
                      placeholder.innerHTML = `<div class="text-4xl mb-4">📱</div><p class="text-lg">${content.imageAlt}</p>`;
                      e.target.parentNode.appendChild(placeholder);
                    }}
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                  <div className="text-gray-400 dark:text-gray-600 text-center">
                    <div className="text-4xl mb-4">🚀</div>
                    <p className="text-lg">{content.imageAlt}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Description Text */}
            <div className="order-1 md:order-2">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {content.content}
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal Footer with Fixed Buttons */}
        <div className="border-t border-gray-200 dark:border-gray-700/50 px-6 pt-4 pb-6 flex justify-between bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={endTutorial}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Skip Tutorial
          </button>
          <button
            onClick={nextStep}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg"
          >
            {currentStep === tutorialSteps.GET_STARTED ? 'Start Collecting' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
