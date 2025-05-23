/**
 * Expanded Pokemon TCG Sets Data
 * Organized by year and era for dynamic filtering in the card forms
 * Includes additional Japanese sets, special sets, and promotional sets
 */

import db from '../services/firestore/dbAdapter';
import logger from '../utils/logger';

// Pokemon TCG Sets
const POKEMON_SETS = {
  // Base Era
  1996: [
    { value: 'Base Set (JP)', label: 'Base Set (JP)' },
  ],
  1997: [
    { value: 'Jungle (JP)', label: 'Jungle (JP)' },
    { value: 'Fossil (JP)', label: 'Fossil (JP)' },
    { value: 'Team Rocket (JP)', label: 'Team Rocket (JP)' },
  ],
  1998: [
    { value: 'Gym Heroes (JP)', label: 'Gym Heroes (JP)' },
    { value: 'Gym Challenge (JP)', label: 'Gym Challenge (JP)' },
  ],
  1999: [
    { value: 'Base Set', label: 'Base Set (EN)' },
    { value: 'Jungle', label: 'Jungle (EN)' },
    { value: 'Fossil', label: 'Fossil (EN)' },
    { value: 'Neo Genesis (JP)', label: 'Neo Genesis (JP)' },
  ],
  2000: [
    { value: 'Base Set 2', label: 'Base Set 2 (EN)' },
    { value: 'Team Rocket', label: 'Team Rocket (EN)' },
    { value: 'Gym Heroes', label: 'Gym Heroes (EN)' },
    { value: 'Gym Challenge', label: 'Gym Challenge (EN)' },
    { value: 'Neo Genesis', label: 'Neo Genesis (EN)' },
    { value: 'Neo Discovery (JP)', label: 'Neo Discovery (JP)' },
    { value: 'Neo Revelation (JP)', label: 'Neo Revelation (JP)' },
    { value: 'Wizards Black Star Promos', label: 'Wizards Black Star Promos (EN)' },
  ],
  // Neo Era
  2001: [
    { value: 'Neo Discovery', label: 'Neo Discovery (EN)' },
    { value: 'Neo Revelation', label: 'Neo Revelation (EN)' },
    { value: 'Neo Destiny (JP)', label: 'Neo Destiny (JP)' },
    { value: 'Expedition Base Set (JP)', label: 'Expedition Base Set (JP)' },
    { value: 'Aquapolis (JP)', label: 'Aquapolis (JP)' },
    { value: 'Skyridge (JP)', label: 'Skyridge (JP)' },
  ],
  2002: [
    { value: 'Neo Destiny', label: 'Neo Destiny (EN)' },
    { value: 'Legendary Collection', label: 'Legendary Collection (EN)' },
    { value: 'Expedition Base Set', label: 'Expedition Base Set (EN)' },
    { value: 'Web Series (JP)', label: 'Web Series (JP)' },
    { value: 'e-Card Series (JP)', label: 'e-Card Series (JP)' },
  ],
  // E-Reader Era
  2003: [
    { value: 'Aquapolis', label: 'Aquapolis (EN)' },
    { value: 'Skyridge', label: 'Skyridge (EN)' },
    { value: 'EX Ruby & Sapphire', label: 'EX Ruby & Sapphire (EN)' },
    { value: 'EX Sandstorm', label: 'EX Sandstorm (EN)' },
    { value: 'EX Dragon', label: 'EX Dragon (EN)' },
    { value: 'ADV Series (JP)', label: 'ADV Series (JP)' },
    { value: 'Nintendo Black Star Promos', label: 'Nintendo Black Star Promos (EN)' },
  ],
  // EX Era
  2004: [
    { value: 'EX Team Magma vs Team Aqua', label: 'EX Team Magma vs Team Aqua (EN)' },
    { value: 'EX Hidden Legends', label: 'EX Hidden Legends (EN)' },
    { value: 'EX FireRed & LeafGreen', label: 'EX FireRed & LeafGreen (EN)' },
    { value: 'EX Team Rocket Returns', label: 'EX Team Rocket Returns (EN)' },
    { value: 'PCG Series (JP)', label: 'PCG Series (JP)' },
  ],
  2005: [
    { value: 'EX Deoxys', label: 'EX Deoxys (EN)' },
    { value: 'EX Emerald', label: 'EX Emerald (EN)' },
    { value: 'EX Unseen Forces', label: 'EX Unseen Forces (EN)' },
    { value: 'EX Delta Species', label: 'EX Delta Species (EN)' },
    { value: 'Holon Series (JP)', label: 'Holon Series (JP)' },
  ],
  2006: [
    { value: 'EX Legend Maker', label: 'EX Legend Maker (EN)' },
    { value: 'EX Holon Phantoms', label: 'EX Holon Phantoms (EN)' },
    { value: 'EX Crystal Guardians', label: 'EX Crystal Guardians (EN)' },
    { value: 'EX Dragon Frontiers', label: 'EX Dragon Frontiers (EN)' },
    { value: 'DP Series (JP)', label: 'DP Series (JP)' },
  ],
  2007: [
    { value: 'EX Power Keepers', label: 'EX Power Keepers (EN)' },
    { value: 'Diamond & Pearl', label: 'Diamond & Pearl (EN)' },
    { value: 'Mysterious Treasures', label: 'Mysterious Treasures (EN)' },
    { value: 'Secret Wonders', label: 'Secret Wonders (EN)' },
    { value: 'Platinum Series (JP)', label: 'Platinum Series (JP)' },
  ],
  2008: [
    { value: 'Great Encounters', label: 'Great Encounters (EN)' },
    { value: 'Majestic Dawn', label: 'Majestic Dawn (EN)' },
    { value: 'Legends Awakened', label: 'Legends Awakened (EN)' },
    { value: 'Stormfront', label: 'Stormfront (EN)' },
    { value: 'LEGEND Series (JP)', label: 'LEGEND Series (JP)' },
  ],
  2009: [
    { value: 'Platinum', label: 'Platinum (EN)' },
    { value: 'Rising Rivals', label: 'Rising Rivals (EN)' },
    { value: 'Supreme Victors', label: 'Supreme Victors (EN)' },
    { value: 'Arceus', label: 'Arceus (EN)' },
    { value: 'HeartGold & SoulSilver Series (JP)', label: 'HeartGold & SoulSilver Series (JP)' },
  ],
  2010: [
    { value: 'HeartGold & SoulSilver', label: 'HeartGold & SoulSilver (EN)' },
    { value: 'Unleashed', label: 'Unleashed (EN)' },
    { value: 'Undaunted', label: 'Undaunted (EN)' },
    { value: 'Triumphant', label: 'Triumphant (EN)' },
    { value: 'Black & White Series (JP)', label: 'Black & White Series (JP)' },
    { value: 'HGSS Promos', label: 'HGSS Promos (EN)' },
  ],
  // Black & White Era
  2011: [
    { value: 'Call of Legends', label: 'Call of Legends (EN)' },
    { value: 'Black & White', label: 'Black & White (EN)' },
    { value: 'Emerging Powers', label: 'Emerging Powers (EN)' },
    { value: 'Noble Victories', label: 'Noble Victories (EN)' },
    { value: 'BW Expansion (JP)', label: 'BW Expansion (JP)' },
    { value: 'BW Promos', label: 'BW Promos (EN)' },
  ],
  2012: [
    { value: 'Next Destinies', label: 'Next Destinies (EN)' },
    { value: 'Dark Explorers', label: 'Dark Explorers (EN)' },
    { value: 'Dragons Exalted', label: 'Dragons Exalted (EN)' },
    { value: 'Boundaries Crossed', label: 'Boundaries Crossed (EN)' },
    { value: 'XY Series (JP)', label: 'XY Series (JP)' },
  ],
  2013: [
    { value: 'Plasma Storm', label: 'Plasma Storm (EN)' },
    { value: 'Plasma Freeze', label: 'Plasma Freeze (EN)' },
    { value: 'Plasma Blast', label: 'Plasma Blast (EN)' },
    { value: 'Legendary Treasures', label: 'Legendary Treasures (EN)' },
    { value: 'XY Expansion (JP)', label: 'XY Expansion (JP)' },
    { value: 'XY Promos', label: 'XY Promos (EN)' },
  ],
  // XY Era
  2014: [
    { value: 'XY', label: 'XY (EN)' },
    { value: 'Flashfire', label: 'Flashfire (EN)' },
    { value: 'Furious Fists', label: 'Furious Fists (EN)' },
    { value: 'Phantom Forces', label: 'Phantom Forces (EN)' },
    { value: 'XY BREAK Series (JP)', label: 'XY BREAK Series (JP)' },
  ],
  2015: [
    { value: 'Primal Clash', label: 'Primal Clash (EN)' },
    { value: 'Roaring Skies', label: 'Roaring Skies (EN)' },
    { value: 'Ancient Origins', label: 'Ancient Origins (EN)' },
    { value: 'BREAKthrough', label: 'BREAKthrough (EN)' },
    { value: 'Sun & Moon Series (JP)', label: 'Sun & Moon Series (JP)' },
  ],
  2016: [
    { value: 'BREAKpoint', label: 'BREAKpoint (EN)' },
    { value: 'Fates Collide', label: 'Fates Collide (EN)' },
    { value: 'Steam Siege', label: 'Steam Siege (EN)' },
    { value: 'Evolutions', label: 'Evolutions (EN)' },
    { value: 'Generations', label: 'Generations (EN)' },
    { value: 'SM Expansion (JP)', label: 'SM Expansion (JP)' },
  ],
  // Sun & Moon Era
  2017: [
    { value: 'Sun & Moon', label: 'Sun & Moon (EN)' },
    { value: 'Guardians Rising', label: 'Guardians Rising (EN)' },
    { value: 'Burning Shadows', label: 'Burning Shadows (EN)' },
    { value: 'Crimson Invasion', label: 'Crimson Invasion (EN)' },
    { value: 'Shining Legends', label: 'Shining Legends (EN)' },
    { value: 'Ultra Sun & Ultra Moon (JP)', label: 'Ultra Sun & Ultra Moon (JP)' },
    { value: 'SM Promos', label: 'SM Promos (EN)' },
  ],
  2018: [
    { value: 'Ultra Prism', label: 'Ultra Prism (EN)' },
    { value: 'Forbidden Light', label: 'Forbidden Light (EN)' },
    { value: 'Celestial Storm', label: 'Celestial Storm (EN)' },
    { value: 'Lost Thunder', label: 'Lost Thunder (EN)' },
    { value: 'Dragon Majesty', label: 'Dragon Majesty (EN)' },
    { value: 'GX Ultra Shiny (JP)', label: 'GX Ultra Shiny (JP)' },
    { value: 'McDonald\'s Collection 2018', label: 'McDonald\'s Collection 2018 (EN)' },
  ],
  2019: [
    { value: 'Team Up', label: 'Team Up (EN)' },
    { value: 'Unbroken Bonds', label: 'Unbroken Bonds (EN)' },
    { value: 'Unified Minds', label: 'Unified Minds (EN)' },
    { value: 'Cosmic Eclipse', label: 'Cosmic Eclipse (EN)' },
    { value: 'Detective Pikachu', label: 'Detective Pikachu (EN)' },
    { value: 'Hidden Fates', label: 'Hidden Fates (EN)' },
    { value: 'Tag Team GX All Stars (JP)', label: 'Tag Team GX All Stars (JP)' },
    { value: 'Dream League (JP)', label: 'Dream League (JP)' },
    { value: 'McDonald\'s Collection 2019', label: 'McDonald\'s Collection 2019 (EN)' },
  ],
  // Sword & Shield Era
  2020: [
    { value: 'Sword & Shield', label: 'Sword & Shield (EN)' },
    { value: 'Rebel Clash', label: 'Rebel Clash (EN)' },
    { value: 'Darkness Ablaze', label: 'Darkness Ablaze (EN)' },
    { value: 'Vivid Voltage', label: 'Vivid Voltage (EN)' },
    { value: 'Champion\'s Path', label: 'Champion\'s Path (EN)' },
    { value: 'Sword & Shield Series (JP)', label: 'Sword & Shield Series (JP)' },
    { value: 'Shiny Star V (JP)', label: 'Shiny Star V (JP)' },
    { value: 'SWSH Promos', label: 'SWSH Promos (EN)' },
  ],
  2021: [
    { value: 'Battle Styles', label: 'Battle Styles (EN)' },
    { value: 'Chilling Reign', label: 'Chilling Reign (EN)' },
    { value: 'Evolving Skies', label: 'Evolving Skies (EN)' },
    { value: 'Fusion Strike', label: 'Fusion Strike (EN)' },
    { value: 'Shining Fates', label: 'Shining Fates (EN)' },
    { value: 'Celebrations', label: 'Celebrations (EN)' },
    { value: 'VMAX Climax (JP)', label: 'VMAX Climax (JP)' },
    { value: 'Eevee Heroes (JP)', label: 'Eevee Heroes (JP)' },
    { value: 'McDonald\'s Collection 2021', label: 'McDonald\'s Collection 2021 (EN)' },
  ],
  2022: [
    { value: 'Brilliant Stars', label: 'Brilliant Stars (EN)' },
    { value: 'Astral Radiance', label: 'Astral Radiance (EN)' },
    { value: 'Lost Origin', label: 'Lost Origin (EN)' },
    { value: 'Silver Tempest', label: 'Silver Tempest (EN)' },
    { value: 'Pokémon GO', label: 'Pokémon GO (EN)' },
    { value: 'VSTAR Universe (JP)', label: 'VSTAR Universe (JP)' },
    { value: 'Dark Phantasma (JP)', label: 'Dark Phantasma (JP)' },
    { value: 'McDonald\'s Collection 2022', label: 'McDonald\'s Collection 2022 (EN)' },
  ],
  // Scarlet & Violet Era
  2023: [
    { value: 'Scarlet & Violet', label: 'Scarlet & Violet (EN)' },
    { value: 'Paldea Evolved', label: 'Paldea Evolved (EN)' },
    { value: 'Obsidian Flames', label: 'Obsidian Flames (EN)' },
    { value: 'Paradox Rift', label: 'Paradox Rift (EN)' },
    { value: 'Crown Zenith', label: 'Crown Zenith (EN)' },
    { value: 'Pokémon 151', label: 'Pokémon 151 (EN)' },
    { value: 'Scarlet & Violet Series (JP)', label: 'Scarlet & Violet Series (JP)' },
    { value: 'Snow Hazard (JP)', label: 'Snow Hazard (JP)' },
    { value: 'Clay Burst (JP)', label: 'Clay Burst (JP)' },
    { value: 'SV Promos', label: 'SV Promos (EN)' },
    { value: 'McDonald\'s Collection 2023', label: 'McDonald\'s Collection 2023 (EN)' },
  ],
  2024: [
    { value: 'Temporal Forces', label: 'Temporal Forces (EN)' },
    { value: 'Twilight Masquerade', label: 'Twilight Masquerade (EN)' },
    { value: 'Stellar Crown', label: 'Stellar Crown (EN)' },
    { value: 'Shrouded Fable', label: 'Shrouded Fable (EN)' },
    { value: 'Paldean Fates', label: 'Paldean Fates (EN)' },
    { value: 'Pocket', label: 'Pocket (EN)' },
    { value: 'Temporal Forces Special Collection', label: 'Temporal Forces Special Collection (EN)' },
    { value: 'Cyber Judge (JP)', label: 'Cyber Judge (JP)' },
    { value: 'Wild Force (JP)', label: 'Wild Force (JP)' },
    { value: 'Crimson Haze (JP)', label: 'Crimson Haze (JP)' },
  ],
};

// Store for custom sets that users have added
let userCustomSets = {};

// Load custom sets from localStorage if available
const loadCustomSets = () => {
  try {
    const storedSets = localStorage.getItem('pokemonCustomSets');
    if (storedSets) {
      userCustomSets = JSON.parse(storedSets);
    }
  } catch (error) {
    logger.error('Failed to load custom sets from localStorage:', error);
  }
};

// Load custom sets on module initialization
loadCustomSets();

/**
 * Get all Pokemon sets
 * @returns {Array} Array of set values
 */
const getAllPokemonSets = () => {
  const allSets = [];
  Object.keys(POKEMON_SETS).forEach(year => {
    POKEMON_SETS[year].forEach(set => {
      allSets.push(set.value);
    });
  });
  return allSets;
};

/**
 * Get Pokemon sets filtered by year
 * @param {string} year - Year to filter by
 * @returns {Array} Array of set values for the specified year
 */
const getPokemonSetsByYear = (year) => {
  if (!year) return getAllPokemonSets();
  
  const standardSets = POKEMON_SETS[year] ? POKEMON_SETS[year].map(set => set.value) : [];
  const customSets = userCustomSets[year] ? userCustomSets[year].map(set => set.value) : [];
  
  // Combine standard and custom sets
  return [...standardSets, ...customSets];
};

/**
 * Add a custom set to the database
 * @param {string} setName - The name of the set to add
 * @param {string} year - The year to add the set to (as a string)
 * @returns {string} The name of the added set
 */
const addCustomSet = (setName, year = "2024") => {
  if (!setName) return; // Must have a set name
  
  // Default to current year if no year provided
  const targetYear = year || "2024";

  // Initialize the year if it doesn't exist
  if (!userCustomSets[targetYear]) {
    userCustomSets[targetYear] = [];
  }

  // Check if the set already exists in this year
  const setExists = userCustomSets[targetYear].some(set => set.value === setName);
  if (!setExists) {
    userCustomSets[targetYear].push({ value: setName, label: setName });
    
    // Save to localStorage
    try {
      localStorage.setItem('pokemonCustomSets', JSON.stringify(userCustomSets));
      console.log(`Added custom set "${setName}" to year ${targetYear}`);
      console.log('Updated userCustomSets:', userCustomSets);
    } catch (error) {
      logger.error('Failed to save custom sets to localStorage:', error);
    }
  }
  
  return setName;
};

/**
 * Get all available years for filtering
 * @returns {Array} Array of year strings
 */
const getAvailableYears = () => {
  return Object.keys(POKEMON_SETS).sort();
};

export {
  getAllPokemonSets,
  getPokemonSetsByYear,
  addCustomSet,
  getAvailableYears
};

export default POKEMON_SETS;
