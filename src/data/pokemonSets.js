/**
 * Pokemon TCG Sets Data
 * Organized by year and era for dynamic filtering in the card forms
 */

import db from '../services/db';

const POKEMON_SETS = {
  // Base Era
  1999: [
    { value: 'Base Set', label: 'Base Set' },
    { value: 'Jungle', label: 'Jungle' },
    { value: 'Fossil', label: 'Fossil' },
  ],
  2000: [
    { value: 'Base Set 2', label: 'Base Set 2' },
    { value: 'Team Rocket', label: 'Team Rocket' },
    { value: 'Gym Heroes', label: 'Gym Heroes' },
    { value: 'Gym Challenge', label: 'Gym Challenge' },
    { value: 'Neo Genesis', label: 'Neo Genesis' },
  ],
  // Neo Era
  2001: [
    { value: 'Neo Discovery', label: 'Neo Discovery' },
    { value: 'Neo Revelation', label: 'Neo Revelation' },
  ],
  2002: [
    { value: 'Neo Destiny', label: 'Neo Destiny' },
    { value: 'Legendary Collection', label: 'Legendary Collection' },
    { value: 'Expedition Base Set', label: 'Expedition Base Set' },
  ],
  // E-Reader Era
  2003: [
    { value: 'Aquapolis', label: 'Aquapolis' },
    { value: 'Skyridge', label: 'Skyridge' },
    { value: 'EX Ruby & Sapphire', label: 'EX Ruby & Sapphire' },
    { value: 'EX Sandstorm', label: 'EX Sandstorm' },
    { value: 'EX Dragon', label: 'EX Dragon' },
  ],
  // EX Era
  2004: [
    { value: 'EX Team Magma vs Team Aqua', label: 'EX Team Magma vs Team Aqua' },
    { value: 'EX Hidden Legends', label: 'EX Hidden Legends' },
    { value: 'EX FireRed & LeafGreen', label: 'EX FireRed & LeafGreen' },
    { value: 'EX Team Rocket Returns', label: 'EX Team Rocket Returns' },
  ],
  2005: [
    { value: 'EX Deoxys', label: 'EX Deoxys' },
    { value: 'EX Emerald', label: 'EX Emerald' },
    { value: 'EX Unseen Forces', label: 'EX Unseen Forces' },
    { value: 'EX Delta Species', label: 'EX Delta Species' },
  ],
  2006: [
    { value: 'EX Legend Maker', label: 'EX Legend Maker' },
    { value: 'EX Holon Phantoms', label: 'EX Holon Phantoms' },
    { value: 'EX Crystal Guardians', label: 'EX Crystal Guardians' },
    { value: 'EX Dragon Frontiers', label: 'EX Dragon Frontiers' },
  ],
  2007: [
    { value: 'EX Power Keepers', label: 'EX Power Keepers' },
    { value: 'Diamond & Pearl', label: 'Diamond & Pearl' },
    { value: 'Mysterious Treasures', label: 'Mysterious Treasures' },
    { value: 'Secret Wonders', label: 'Secret Wonders' },
  ],
  // Diamond & Pearl Era
  2008: [
    { value: 'Great Encounters', label: 'Great Encounters' },
    { value: 'Majestic Dawn', label: 'Majestic Dawn' },
    { value: 'Legends Awakened', label: 'Legends Awakened' },
    { value: 'Stormfront', label: 'Stormfront' },
  ],
  2009: [
    { value: 'Platinum', label: 'Platinum' },
    { value: 'Rising Rivals', label: 'Rising Rivals' },
    { value: 'Supreme Victors', label: 'Supreme Victors' },
    { value: 'Arceus', label: 'Arceus' },
  ],
  // HeartGold & SoulSilver Era
  2010: [
    { value: 'HeartGold & SoulSilver', label: 'HeartGold & SoulSilver' },
    { value: 'Unleashed', label: 'Unleashed' },
    { value: 'Undaunted', label: 'Undaunted' },
    { value: 'Triumphant', label: 'Triumphant' },
  ],
  // Black & White Era
  2011: [
    { value: 'Call of Legends', label: 'Call of Legends' },
    { value: 'Black & White', label: 'Black & White' },
    { value: 'Emerging Powers', label: 'Emerging Powers' },
    { value: 'Noble Victories', label: 'Noble Victories' },
  ],
  2012: [
    { value: 'Next Destinies', label: 'Next Destinies' },
    { value: 'Dark Explorers', label: 'Dark Explorers' },
    { value: 'Dragons Exalted', label: 'Dragons Exalted' },
    { value: 'Boundaries Crossed', label: 'Boundaries Crossed' },
  ],
  2013: [
    { value: 'Plasma Storm', label: 'Plasma Storm' },
    { value: 'Plasma Freeze', label: 'Plasma Freeze' },
    { value: 'Plasma Blast', label: 'Plasma Blast' },
    { value: 'Legendary Treasures', label: 'Legendary Treasures' },
  ],
  // XY Era
  2014: [
    { value: 'XY', label: 'XY' },
    { value: 'Flashfire', label: 'Flashfire' },
    { value: 'Furious Fists', label: 'Furious Fists' },
    { value: 'Phantom Forces', label: 'Phantom Forces' },
  ],
  2015: [
    { value: 'Primal Clash', label: 'Primal Clash' },
    { value: 'Roaring Skies', label: 'Roaring Skies' },
    { value: 'Ancient Origins', label: 'Ancient Origins' },
    { value: 'BREAKthrough', label: 'BREAKthrough' },
  ],
  2016: [
    { value: 'BREAKpoint', label: 'BREAKpoint' },
    { value: 'Fates Collide', label: 'Fates Collide' },
    { value: 'Steam Siege', label: 'Steam Siege' },
    { value: 'Evolutions', label: 'Evolutions' },
  ],
  // Sun & Moon Era
  2017: [
    { value: 'Sun & Moon', label: 'Sun & Moon' },
    { value: 'Guardians Rising', label: 'Guardians Rising' },
    { value: 'Burning Shadows', label: 'Burning Shadows' },
    { value: 'Crimson Invasion', label: 'Crimson Invasion' },
  ],
  2018: [
    { value: 'Ultra Prism', label: 'Ultra Prism' },
    { value: 'Forbidden Light', label: 'Forbidden Light' },
    { value: 'Celestial Storm', label: 'Celestial Storm' },
    { value: 'Lost Thunder', label: 'Lost Thunder' },
  ],
  2019: [
    { value: 'Team Up', label: 'Team Up' },
    { value: 'Unbroken Bonds', label: 'Unbroken Bonds' },
    { value: 'Unified Minds', label: 'Unified Minds' },
    { value: 'Cosmic Eclipse', label: 'Cosmic Eclipse' },
    { value: 'Pokémon TCG: Detective Pikachu', label: 'Detective Pikachu' },
    { value: 'Hidden Fates', label: 'Hidden Fates' },
  ],
  // Sword & Shield Era
  2020: [
    { value: 'Sword & Shield', label: 'Sword & Shield' },
    { value: 'Rebel Clash', label: 'Rebel Clash' },
    { value: 'Darkness Ablaze', label: 'Darkness Ablaze' },
    { value: 'Vivid Voltage', label: 'Vivid Voltage' },
    { value: 'Champion\'s Path', label: 'Champion\'s Path' },
  ],
  2021: [
    { value: 'Battle Styles', label: 'Battle Styles' },
    { value: 'Chilling Reign', label: 'Chilling Reign' },
    { value: 'Evolving Skies', label: 'Evolving Skies' },
    { value: 'Fusion Strike', label: 'Fusion Strike' },
    { value: 'Shining Fates', label: 'Shining Fates' },
    { value: 'Celebrations', label: 'Celebrations' },
  ],
  2022: [
    { value: 'Brilliant Stars', label: 'Brilliant Stars' },
    { value: 'Astral Radiance', label: 'Astral Radiance' },
    { value: 'Lost Origin', label: 'Lost Origin' },
    { value: 'Silver Tempest', label: 'Silver Tempest' },
  ],
  // Scarlet & Violet Era
  2023: [
    { value: 'Crown Zenith', label: 'Crown Zenith' },
    { value: 'Scarlet & Violet', label: 'Scarlet & Violet' },
    { value: 'Paldea Evolved', label: 'Paldea Evolved' },
    { value: 'Obsidian Flames', label: 'Obsidian Flames' },
    { value: 'Paradox Rift', label: 'Paradox Rift' },
  ],
  2024: [
    { value: 'Temporal Forces', label: 'Temporal Forces' },
    { value: 'Twilight Masquerade', label: 'Twilight Masquerade' },
    { value: 'Stellar Crown', label: 'Stellar Crown' },
    { value: 'Shrouded Fable', label: 'Shrouded Fable' },
  ],
  2025: [
    { value: 'Upcoming 2025 Set', label: 'Upcoming 2025 Set' }, // Placeholder for future sets
  ],
};

// Store for custom sets that users have added
let userCustomSets = {};

// Load custom sets from both localStorage and Firestore
const loadCustomSets = async () => {
  try {
    // First load from localStorage for immediate display
    const savedSets = localStorage.getItem('pokemonCustomSets');
    if (savedSets) {
      userCustomSets = JSON.parse(savedSets);
    }
    
    // Then load from Firestore (this will take precedence)
    const firestoreSets = await db.loadCustomSets();
    
    // Merge the sets, with Firestore taking precedence
    Object.keys(firestoreSets).forEach(year => {
      if (!userCustomSets[year]) {
        userCustomSets[year] = [];
      }
      
      // Convert array of set names to proper set objects
      firestoreSets[year].forEach(setName => {
        // Check if this set already exists
        const exists = userCustomSets[year].some(set => set.value === setName);
        if (!exists) {
          userCustomSets[year].push({ value: setName, label: setName });
        }
      });
    });
    
    // Save the merged sets back to localStorage
    localStorage.setItem('pokemonCustomSets', JSON.stringify(userCustomSets));
  } catch (error) {
    console.error('Failed to load custom sets:', error);
  }
};

// Initialize loading of custom sets
loadCustomSets();

/**
 * Add a custom set to a specific year
 * @param {string} setName - The name of the set to add
 * @param {string} year - The year to add the set to (as a string)
 */
export const addCustomSet = async (setName, year) => {
  if (!year) return; // Must have a year

  // Initialize the year if it doesn't exist
  if (!userCustomSets[year]) {
    userCustomSets[year] = [];
  }

  // Check if the set already exists in this year
  const setExists = userCustomSets[year].some(set => set.value === setName);
  if (!setExists) {
    userCustomSets[year].push({ value: setName, label: setName });
    
    // Save to localStorage
    try {
      localStorage.setItem('pokemonCustomSets', JSON.stringify(userCustomSets));
    } catch (error) {
      console.error('Failed to save custom sets to localStorage:', error);
    }
    
    // Save to Firestore
    try {
      await db.saveCustomSet(setName, year);
    } catch (error) {
      console.error('Failed to save custom set to Firestore:', error);
    }
  }
};

/**
 * Get all custom sets for a specific year
 * @param {string} year - The year to get sets for
 * @returns {Array} - Array of sets for that year
 */
export const getCustomSetsForYear = (year) => {
  return userCustomSets[year] || [];
};

/**
 * Get all Pokemon sets for a specific year, including custom sets
 * @param {string} year - The year to get sets for
 * @returns {Array} - Array of all sets for that year
 */
export const getPokemonSetsByYear = (year) => {
  const standardSets = POKEMON_SETS[year] || [];
  const customSets = getCustomSetsForYear(year) || [];
  return [...standardSets, ...customSets];
};

// Utility function to get all Pokemon sets (flattened)
export const getAllPokemonSets = () => {
  return Object.values(POKEMON_SETS).flat();
};

// Get years with available sets
export const getAvailableYears = () => {
  return Object.keys(POKEMON_SETS).map(year => parseInt(year, 10)).sort();
};

export default POKEMON_SETS;
