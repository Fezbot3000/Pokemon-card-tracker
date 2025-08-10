// Unified hook entrypoint for card data source selection
// Chooses between CardContext-backed compatibility layer and legacy useCardData

import useCardDataCompat from '../contexts/CardContextCompatibility';
import useCardDataLegacy from './useCardData';
import { featureFlags } from '../config/featureFlags';

// Select the hook implementation at module load (no conditional hook calls)
const useCardsSource = featureFlags.useCardContextSource
  ? useCardDataCompat
  : useCardDataLegacy;

export default useCardsSource;


