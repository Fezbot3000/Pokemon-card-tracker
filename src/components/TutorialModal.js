import React, { useEffect } from 'react';
import { useTutorial, tutorialSteps } from '../contexts/TutorialContext';

// Import all tutorial images directly
import collectionsImg from '../assets/tutorial/collections.png';
import cardListsImg from '../assets/tutorial/Card_lists.png';
import cardDetailsImg from '../assets/tutorial/card_details.png';
// Use working images as fallbacks for the problematic ones
import markAsSoldImg from '../assets/tutorial/mark_as_sold.png';
import soldItemsImg from '../assets/tutorial/Sold_items.png';
import dashboardExampleImg from '../assets/tutorial/Dashboardexample.png';

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
      case tutorialSteps.COLLECTIONS:
        return {
          title: 'Collections',
          content: 'Organise your cards into custom collections. Group by set, year, or create your own categories to keep your collection perfectly organised.',
          imageAlt: 'Collections dropdown interface showing different collection options',
          imageSrc: collectionsImg
        };
      case tutorialSteps.CARD_LISTS:
        return {
          title: 'Card Lists',
          content: 'View all your cards in an organised list. Sort by name, value, or any other attribute to quickly find the cards you\'re looking for.',
          imageAlt: 'Card list interface showing multiple cards in a collection',
          imageSrc: cardListsImg
        };
      case tutorialSteps.CARD_DETAILS:
        return {
          title: 'Card Details',
          content: 'Tap on any card to view its complete details. See high-resolution images, grading information, purchase history, and current market value.',
          imageAlt: 'Card details modal showing comprehensive information about a card',
          imageSrc: cardDetailsImg
        };
      case tutorialSteps.MARK_AS_SOLD:
        return {
          title: 'Mark as Sold',
          content: 'When you sell a card, easily mark it as sold and record the sale details. Track your profit and keep a complete history of your transactions.',
          imageAlt: 'Mark as sold interface showing sale details form',
          imageSrc: markAsSoldImg
        };
      case tutorialSteps.SOLD_ITEMS:
        return {
          title: 'Sold Items',
          content: 'View all your sold cards in one place. Analyse your sales history, track profits, and gain insights into your collecting and selling performance.',
          imageAlt: 'Sold items list showing past sales and profit information',
          imageSrc: soldItemsImg
        };
      case tutorialSteps.DASHBOARD:
        return {
          title: 'Dashboard',
          content: 'Get a complete overview of your collection with our intuitive dashboard. See total value, recent additions, profit trends, and more at a glance.',
          imageAlt: 'Dashboard showing collection statistics and overview',
          imageSrc: dashboardExampleImg
        };
      case tutorialSteps.DATA_MANAGEMENT:
        return {
          title: 'Data Management',
          content: 'Your data will automatically save to the cloud. Access your collection from any device, anytime, with our seamless cloud syncing.\n\nPremium members enjoy additional backup options and advanced data management features.',
          imageAlt: 'Data management options in settings panel',
          // Remove the image for this step
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
          {currentStep === tutorialSteps.DATA_MANAGEMENT ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;