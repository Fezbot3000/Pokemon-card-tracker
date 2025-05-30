import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TutorialContext = createContext();

// Local storage key for onboarding state
const ONBOARDING_KEY = 'pokemon_tracker_onboarding_complete';

export const tutorialSteps = {
  WELCOME: 'welcome',
  DASHBOARD: 'dashboard',
  ADD_CARD: 'add_card',
  MARKETPLACE: 'marketplace',
  INVOICES: 'invoices',
  MESSAGING: 'messaging',
  MOBILE: 'mobile',
  GET_STARTED: 'get_started'
};

export function TutorialProvider({ children }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [onAddCardOpen, setOnAddCardOpen] = useState(null);
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
    setCurrentStep(tutorialSteps.WELCOME);
  }, []);

  const nextStep = useCallback(() => {
    switch (currentStep) {
      case tutorialSteps.WELCOME:
        setCurrentStep(tutorialSteps.DASHBOARD);
        break;
      case tutorialSteps.DASHBOARD:
        setCurrentStep(tutorialSteps.ADD_CARD);
        break;
      case tutorialSteps.ADD_CARD:
        setCurrentStep(tutorialSteps.MARKETPLACE);
        break;
      case tutorialSteps.MARKETPLACE:
        setCurrentStep(tutorialSteps.INVOICES);
        break;
      case tutorialSteps.INVOICES:
        setCurrentStep(tutorialSteps.MESSAGING);
        break;
      case tutorialSteps.MESSAGING:
        setCurrentStep(tutorialSteps.MOBILE);
        break;
      case tutorialSteps.MOBILE:
        setCurrentStep(tutorialSteps.GET_STARTED);
        break;
      case tutorialSteps.GET_STARTED:
        // When finishing tutorial, open add card modal
        if (onAddCardOpen) onAddCardOpen();
        endTutorial();
        break;
      default:
        break;
    }
  }, [currentStep, onAddCardOpen]);

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

  const registerAddCardCallback = useCallback((callback) => {
    setOnAddCardOpen(() => callback);
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
    registerAddCardCallback,
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