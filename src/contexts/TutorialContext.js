import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TutorialContext = createContext();

// Local storage key for onboarding state
const ONBOARDING_KEY = 'pokemon_tracker_onboarding_complete';

export const tutorialSteps = {
  COLLECTIONS: 'collections',
  CARD_LISTS: 'card_lists',
  CARD_DETAILS: 'card_details',
  MARK_AS_SOLD: 'mark_as_sold',
  SOLD_ITEMS: 'sold_items',
  DASHBOARD: 'dashboard',
  DATA_MANAGEMENT: 'data_management'
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
        setCurrentStep(tutorialSteps.CARD_LISTS);
        break;
      case tutorialSteps.CARD_LISTS:
        setCurrentStep(tutorialSteps.CARD_DETAILS);
        break;
      case tutorialSteps.CARD_DETAILS:
        setCurrentStep(tutorialSteps.MARK_AS_SOLD);
        break;
      case tutorialSteps.MARK_AS_SOLD:
        setCurrentStep(tutorialSteps.SOLD_ITEMS);
        break;
      case tutorialSteps.SOLD_ITEMS:
        setCurrentStep(tutorialSteps.DASHBOARD);
        break;
      case tutorialSteps.DASHBOARD:
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