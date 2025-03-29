import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TutorialContext = createContext();

// Local storage key for onboarding state
const ONBOARDING_KEY = 'pokemon_tracker_onboarding_complete';

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
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try {
      // Try to get from localStorage
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch (error) {
      // If localStorage fails, default to not completed
      return false;
    }
  });

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
    
    // Mark onboarding as complete
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setOnboardingComplete(true);
    } catch (error) {
      console.error("Failed to save onboarding state", error);
    }
  }, []);

  const registerSettingsCallback = useCallback((callback) => {
    setOnSettingsOpen(() => callback);
  }, []);

  // Function to check if user is new and start tutorial if needed
  const checkAndStartTutorial = useCallback(() => {
    if (!onboardingComplete) {
      startTutorial();
    }
  }, [onboardingComplete, startTutorial]);
  
  const contextValue = {
    isTutorialActive,
    currentStep,
    startTutorial,
    nextStep,
    endTutorial,
    registerSettingsCallback,
    onboardingComplete,
    checkAndStartTutorial,
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