// Centralized feature flags for progressive rollouts
// Use REACT_APP_ env vars to control behavior without code changes

export const featureFlags = {
  useCardContextSource:
    (process.env.REACT_APP_USE_CARDCONTEXT_SOURCE || 'true').toLowerCase() ===
    'true',
};

export default featureFlags;


