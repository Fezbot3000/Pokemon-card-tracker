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
          content: 'This is where you will add your card collections. You can sort your cards out however you want, one example is based on their set.',
          position: 'left-4 top-16'
        };
      case tutorialSteps.ADD_CARD:
        return {
          title: 'Add Cards',
          content: 'Here is where you can manually add your cards one by one.',
          position: 'right-[15rem] top-24'
        };
      case tutorialSteps.IMPORT_UPDATE:
        return {
          title: 'Import & Update',
          content: 'Import base data allows you to bulk import your cards from a CSV file. The update prices allows you to bulk update the values of your cards in one go. Alternatively, you can manually edit these details by clicking on each card.',
          position: 'right-4 top-16'
        };
      case tutorialSteps.DATA_MANAGEMENT:
        return {
          title: 'Data Management',
          content: 'Data management is how you back up your data. For free users, you will be able to export and import data manually. Export will download a ZIP packet to your computer as a local backup, and import will import that same ZIP file to restore your data. You can use this to get data to show on multiple devices. This will back up everything you have done on the website.\n\nIf you want to be a paid member, you will get the ability to just sync your data to the cloud.',
          position: 'right-[35%] top-1/2 -translate-y-1/2'
        };
      default:
        return null;
    }
  };

  const content = getTutorialContent();
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className={`absolute ${content.position} w-80 bg-white dark:bg-[#1B2131] rounded-xl shadow-lg p-4 pointer-events-auto`}>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {content.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-line">
          {content.content}
        </p>
        <div className="flex justify-between">
          <button
            onClick={endTutorial}
            className="btn btn-sm btn-tertiary"
          >
            Skip
          </button>
          <button
            onClick={nextStep}
            className="btn btn-sm btn-primary"
          >
            {currentStep === tutorialSteps.DATA_MANAGEMENT ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal; 