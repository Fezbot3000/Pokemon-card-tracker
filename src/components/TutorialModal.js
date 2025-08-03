import React, { useEffect } from 'react';
import { useTutorial, tutorialSteps } from '../contexts/TutorialContext';
import LoggingService from '../services/LoggingService';

// Use public asset paths instead of imports
const dashboardImg = '/screenshots/Dashboard.png';
const addCardImg = '/screenshots/AddCards.png';
const marketplaceImg = '/screenshots/Marketplace.png';
const invoiceImg = '/screenshots/Invoices.png';
const messagingImg = '/screenshots/marketplacemessages.png';
const mobileImg = '/screenshots/MobileMockup.png';

const TutorialModal = () => {
  const { isTutorialActive, currentStep, nextStep, endTutorial } =
    useTutorial();

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
          content:
            'Your dashboard provides a complete overview of your collection. See your total portfolio value, recent additions, top performers, and collection statistics at a glance. Monitor your investment performance and track market trends.',
          imageAlt:
            'Dashboard showing collection overview with statistics and charts',
          imageSrc: dashboardImg,
        };
      case tutorialSteps.ADD_CARD:
        return {
          title: 'Adding Cards',
          content:
            'Easily add cards to your collection by entering the PSA certification number or manually inputting card details. The system automatically fetches card information, images, and current market values to keep your collection up-to-date.',
          imageAlt: 'Add card interface showing form fields and card details',
          imageSrc: addCardImg,
        };
      case tutorialSteps.MARKETPLACE:
        return {
          title: 'Marketplace',
          content:
            "Browse and discover cards from other collectors. Search by set, player, or specific cards you're looking for. Connect with sellers, view detailed card information, and expand your collection through our integrated marketplace.",
          imageAlt: 'Marketplace showing available cards from other collectors',
          imageSrc: marketplaceImg,
        };
      case tutorialSteps.INVOICES:
        return {
          title: 'Purchase & Sales Invoices',
          content:
            'Keep track of all your transactions with detailed invoices. Record purchases, manage sales, and maintain a complete financial history of your collecting activities. Generate professional invoices for your sales.',
          imageAlt:
            'Invoice management interface showing purchase and sales records',
          imageSrc: invoiceImg,
        };
      case tutorialSteps.MESSAGING:
        return {
          title: 'Marketplace Messaging',
          content:
            'Communicate directly with other collectors through our secure messaging system. Negotiate prices, ask questions about cards, and build relationships within the collecting community.',
          imageAlt:
            'Messaging interface for communicating with other collectors',
          imageSrc: messagingImg,
        };
      case tutorialSteps.MOBILE:
        return {
          title: 'Mobile Experience',
          content:
            'Access your collection anywhere with our responsive mobile interface. Add cards on the go, check values at card shows, and manage your collection from your phone or tablet.',
          imageAlt:
            'Mobile app interface showing collection management on phone',
          imageSrc: mobileImg,
        };
      case tutorialSteps.GET_STARTED:
        return {
          title: 'Ready to Get Started!',
          content:
            'You\'re all set! Click "Start Collecting" below to add your first card and begin building your digital collection. You can always access this tutorial again from the help menu.',
          imageAlt: 'Ready to start collecting cards',
          imageSrc: null,
        };
      default:
        return {
          title: 'Welcome',
          content: 'Welcome to the Pokemon Card Tracker tutorial!',
          imageAlt: 'Welcome screen',
          imageSrc: null,
        };
    }
  }

  const content = getTutorialContent();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Blurred Background Overlay */}
      <div
        className="bg-black/50 absolute inset-0 backdrop-blur-sm"
        onClick={endTutorial}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#0F0F0F]"
        style={{
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div className="border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {content.title}
          </h3>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-6">
          <div className="grid items-center gap-8 md:grid-cols-2">
            {/* Image Section - Much larger */}
            <div className="order-2 md:order-1">
              {content.imageSrc ? (
                <div className="dark:bg-[#0F0F0F] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-lg dark:border-gray-700">
                  <img
                    src={content.imageSrc}
                    alt={content.imageAlt}
                    className="h-auto max-h-[400px] w-full object-contain"
                    onError={e => {
                      LoggingService.error(
                        `Failed to load image: ${content.imageSrc}`
                      );
                      e.target.style.display = 'none';
                      e.target.parentNode.classList.add(
                        'h-64',
                        'flex',
                        'items-center',
                        'justify-center'
                      );
                      const placeholder = document.createElement('div');
                      placeholder.className =
                        'text-gray-400 dark:text-gray-600 text-center';
                      placeholder.innerHTML = `<div class="text-4xl mb-4">📱</div><p class="text-lg">${content.imageAlt}</p>`;
                      e.target.parentNode.appendChild(placeholder);
                    }}
                  />
                </div>
              ) : (
                <div className="dark:bg-[#0F0F0F] flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700">
                  <div className="text-center text-gray-400 dark:text-gray-600">
                    <div className="mb-4 text-4xl">🚀</div>
                    <p className="text-lg">{content.imageAlt}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description Text */}
            <div className="order-1 md:order-2">
              <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {content.content}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Fixed Buttons */}
        <div className="dark:border-gray-700 dark:bg-[#0F0F0F] flex justify-between border-t border-gray-200 bg-gray-50 px-6 pb-6 pt-4">
          <button
            onClick={endTutorial}
            className="px-6 py-3 font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip Tutorial
          </button>
          <button
            onClick={nextStep}
            className="rounded-lg bg-blue-600 px-8 py-3 font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            {currentStep === tutorialSteps.GET_STARTED
              ? 'Start Collecting'
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
