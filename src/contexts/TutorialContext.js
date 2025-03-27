import React, { createContext, useContext, useState, useCallback } from 'react';

const TutorialContext = createContext();

export const tutorialSteps = {
  COLLECTIONS: 'collections',
  ADD_CARD: 'add_card',
  IMPORT_UPDATE: 'import_update',
  DATA_MANAGEMENT: 'data_management',
};

export function TutorialProvider({ children }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [onSettingsOpen, setOnSettingsOpen] = useState(null);

  const startTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setCurrentStep(tutorialSteps.COLLECTIONS);
  }, []);

  const nextStep = useCallback(() => {
    switch (currentStep) {
      case tutorialSteps.COLLECTIONS:
        setCurrentStep(tutorialSteps.ADD_CARD);
        break;
      case tutorialSteps.ADD_CARD:
        setCurrentStep(tutorialSteps.IMPORT_UPDATE);
        break;
      case tutorialSteps.IMPORT_UPDATE:
        setCurrentStep(tutorialSteps.DATA_MANAGEMENT);
        // When moving to data management step, open settings
        if (onSettingsOpen) onSettingsOpen();
        break;
      case tutorialSteps.DATA_MANAGEMENT:
        endTutorial();
        break;
      default:
        break;
    }
  }, [currentStep, onSettingsOpen]);

  const endTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setCurrentStep(null);
  }, []);

  const registerSettingsCallback = useCallback((callback) => {
    setOnSettingsOpen(() => callback);
  }, []);

  const contextValue = {
    isTutorialActive,
    currentStep,
    startTutorial,
    nextStep,
    endTutorial,
    registerSettingsCallback,
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
} 