import React from 'react';
import { useTutorial, tutorialSteps } from '../contexts/TutorialContext';

const TutorialModal = () => {
  const { isTutorialActive, currentStep, nextStep, endTutorial } = useTutorial();

  if (!isTutorialActive) return null;

  const getTutorialContent = () => {
    switch (currentStep) {
      case tutorialSteps.COLLECTIONS:
        return {
          title: 'Collections',
          content: 'Add different collections to organize your cards. You can create collections by set, year, or any way you prefer.',
          imageAlt: 'Collections dropdown interface',
          imageSrc: '/Addingnewcollection.png'
        };
      case tutorialSteps.ADD_CARD:
        return {
          title: 'Add Cards',
          content: 'Tap here to add a new card to your collection. You can enter details like card name, grade, and price.',
          imageAlt: 'Add Card button interface',
          imageSrc: '/addcard.png'
        };
      case tutorialSteps.IMPORT_UPDATE:
        return {
          title: 'Import & Update',
          content: 'Quickly import multiple cards using CSV files or update card prices in bulk. You can also update individual cards by tapping on them.',
          imageAlt: 'Import and update buttons interface',
          imageSrc: '/aimport.png'
        };
      case tutorialSteps.DATA_MANAGEMENT:
        return {
          title: 'Data Management',
          content: 'Back up your collection by exporting to a file. You can restore your data by importing this file on any device.\n\nPaid members get automatic cloud syncing.',
          imageAlt: 'Data management interface in settings',
          imageSrc: '/aDatamanagement.png'
        };
      default:
        return null;
    }
  };

  const content = getTutorialContent();
  if (!content) return null;

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
            <img 
              src={content.imageSrc} 
              alt={content.imageAlt} 
              className="w-full h-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.classList.add('h-48', 'flex', 'items-center', 'justify-center');
                const placeholder = document.createElement('div');
                placeholder.className = 'text-gray-400 dark:text-gray-600 text-center';
                placeholder.innerHTML = `<span class="material-icons text-3xl mb-2">image</span><p class="text-sm">${content.imageAlt}</p>`;
                e.target.parentNode.appendChild(placeholder);
              }}
            />
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