import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import LoggingService from '../services/LoggingService';

const TutorialContext = createContext();

// Local storage key for onboarding state
const ONBOARDING_KEY = 'pokemon_tracker_onboarding_complete';

export const tutorialSteps = {
  DASHBOARD: 'dashboard',
  ADD_CARD: 'add_card',
  MARKETPLACE: 'marketplace',
  INVOICES: 'invoices',
  MESSAGING: 'messaging',
  MOBILE: 'mobile',
  GET_STARTED: 'get_started',
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
    setCurrentStep(tutorialSteps.DASHBOARD);
  }, []);

  const endTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setCurrentStep(null);

    // Mark onboarding as complete
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setOnboardingComplete(true);
      // Clear the isNewUser flag so tutorial doesn't show again
      localStorage.removeItem('isNewUser');
    } catch (error) {
      LoggingService.error('Failed to save onboarding state', error);
    }
  }, []);

  const nextStep = useCallback(() => {
    switch (currentStep) {
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
  }, [currentStep, onAddCardOpen, endTutorial]);

  const registerAddCardCallback = useCallback(callback => {
    setOnAddCardOpen(() => callback);
  }, []);

  // Function to check if user is new and start tutorial if needed
  const checkAndStartTutorial = useCallback(() => {
    // Check if user is new (isNewUser flag) AND tutorial hasn't been completed
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    if (isNewUser && !onboardingComplete) {
      startTutorial();
    }
  }, [onboardingComplete, startTutorial]);

  // Function to reset tutorial state (for testing or manual restart)
  const resetTutorial = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      localStorage.setItem('isNewUser', 'true');
      setOnboardingComplete(false);
      startTutorial();
    } catch (error) {
      LoggingService.error('Failed to reset tutorial state', error);
    }
  }, [startTutorial]);

  const contextValue = {
    isTutorialActive,
    currentStep,
    startTutorial,
    nextStep,
    endTutorial,
    registerAddCardCallback,
    onboardingComplete,
    checkAndStartTutorial,
    resetTutorial,
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
