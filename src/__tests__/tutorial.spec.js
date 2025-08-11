import { renderHook, act } from '@testing-library/react';
import { TutorialProvider, useTutorial } from '../contexts/TutorialContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock LoggingService
jest.mock('../services/LoggingService', () => ({
  error: jest.fn(),
}));

const wrapper = ({ children }) => (
  <TutorialProvider>{children}</TutorialProvider>
);

describe('TutorialContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('should start tutorial for new users when onboarding is not complete', () => {
    // Mock localStorage to simulate new user BEFORE component renders
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'pokemon_tracker_onboarding_complete') {
        return null; // onboardingComplete = false
      }
      return null;
    });

    const { result } = renderHook(() => useTutorial(), { wrapper });

    // Now set isNewUser flag and check tutorial
    act(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'isNewUser') {
          return 'true'; // isNewUser = true
        }
        if (key === 'pokemon_tracker_onboarding_complete') {
          return null; // onboardingComplete = false
        }
        return null;
      });
      result.current.checkAndStartTutorial();
    });

    expect(result.current.isTutorialActive).toBe(true);
    expect(result.current.currentStep).toBe('dashboard');
  });

  it('should not start tutorial for existing users', () => {
    // Mock localStorage to simulate existing user
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'pokemon_tracker_onboarding_complete') {
        return null; // onboardingComplete = false
      }
      return null;
    });

    const { result } = renderHook(() => useTutorial(), { wrapper });

    act(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'isNewUser') {
          return null; // isNewUser = false
        }
        if (key === 'pokemon_tracker_onboarding_complete') {
          return null; // onboardingComplete = false
        }
        return null;
      });
      result.current.checkAndStartTutorial();
    });

    expect(result.current.isTutorialActive).toBe(false);
  });

  it('should not start tutorial if onboarding is already complete', () => {
    // Mock localStorage to simulate user who completed tutorial
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'pokemon_tracker_onboarding_complete') {
        return 'true'; // onboardingComplete = true
      }
      return null;
    });

    const { result } = renderHook(() => useTutorial(), { wrapper });

    act(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'isNewUser') {
          return 'true'; // isNewUser = true
        }
        if (key === 'pokemon_tracker_onboarding_complete') {
          return 'true'; // onboardingComplete = true
        }
        return null;
      });
      result.current.checkAndStartTutorial();
    });

    expect(result.current.isTutorialActive).toBe(false);
  });

  it('should clear isNewUser flag when tutorial is completed', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'pokemon_tracker_onboarding_complete') {
        return null; // onboardingComplete = false
      }
      return null;
    });

    const { result } = renderHook(() => useTutorial(), { wrapper });

    act(() => {
      result.current.endTutorial();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('pokemon_tracker_onboarding_complete', 'true');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('isNewUser');
    expect(result.current.isTutorialActive).toBe(false);
  });

  it('should reset tutorial state when resetTutorial is called', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'pokemon_tracker_onboarding_complete') {
        return 'true'; // onboardingComplete = true (initially)
      }
      return null;
    });

    const { result } = renderHook(() => useTutorial(), { wrapper });

    act(() => {
      result.current.resetTutorial();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pokemon_tracker_onboarding_complete');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('isNewUser', 'true');
    expect(result.current.isTutorialActive).toBe(true);
  });
});
