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

  // Log the current step for debugging
  useEffect(() => {
    if (currentStep) {
      console.log('Current tutorial step:', currentStep);
    }
  }, [currentStep]);

  if (!isTutorialActive) return null;

  function getTutorialContent() {
    switch (currentStep) {
      case tutorialSteps.WELCOME:
        return {
          title: 'Welcome to Pokemon Card Tracker!',
          content: 'The ultimate tool for managing your Pokemon card collection. Track values, organize cards, manage sales, and connect with other collectors. Let\'s take a quick tour of the main features.',
          imageAlt: 'Welcome to Pokemon Card Tracker',
          imageSrc: null
        };
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
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#111827] flex flex-col">
      {/* Modal Header */}
      <div className="border-b border-gray-200 dark:border-gray-700/50 px-6 py-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {content.title}
        </h3>
      </div>
      
      {/* Modal Content - Scrollable area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Image Section - Larger for full screen */}
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 max-w-md mx-auto">
          {content.imageSrc ? (
            <div className="relative">
              <img 
                src={content.imageSrc} 
                alt={content.imageAlt} 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  console.error(`Failed to load image: ${content.imageSrc}`);
                  e.target.style.display = 'none';
                  e.target.parentNode.classList.add('h-48', 'flex', 'items-center', 'justify-center');
                  const placeholder = document.createElement('div');
                  placeholder.className = 'text-gray-400 dark:text-gray-600 text-center';
                  placeholder.innerHTML = `<span class="material-icons text-3xl mb-2">image</span><p class="text-sm">${content.imageAlt}</p>`;
                  e.target.parentNode.appendChild(placeholder);
                }}
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-600 text-center">
                <span className="material-icons text-3xl mb-2">image</span>
                <p className="text-sm">{content.imageAlt}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Description Text */}
        <p className="text-lg text-center text-gray-700 dark:text-gray-300 whitespace-pre-line max-w-md mx-auto">
          {content.content}
        </p>
      </div>
      
      {/* Modal Footer with Fixed Buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700/50 px-6 py-4 flex justify-between sticky bottom-0 bg-white dark:bg-[#111827]">
        <button
          onClick={endTutorial}
          className="btn btn-lg btn-tertiary"
        >
          Skip
        </button>
        <button
          onClick={nextStep}
          className="btn btn-lg btn-primary"
        >
          {currentStep === tutorialSteps.GET_STARTED ? 'Start Collecting' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;