/**
 * Pokemon TCG Sets Data
 * Organized by year and era for dynamic filtering in the card forms
 */

import db from '../services/firestore/dbAdapter';
import logger from '../utils/logger'; // Import logger for consistent error handling

// Pokemon TCG Sets
// Updated with expanded list of sets including additional Japanese sets, special sets, and promotional sets
const POKEMON_SETS = {
  // Base Era
  1996: [
    { value: 'Base Set (JP)', label: 'Base Set (JP)' },
    { value: 'Quick Starter Gift Set (JP)', label: 'Quick Starter Gift Set (JP)' },
    { value: 'Pokémon Snap (JP)', label: 'Pokémon Snap (JP)' },
  ],
  1997: [
    { value: 'Jungle (JP)', label: 'Jungle (JP)' },
    { value: 'Fossil (JP)', label: 'Fossil (JP)' },
    { value: 'Team Rocket (JP)', label: 'Team Rocket (JP)' },
    { value: 'Vending Series (JP)', label: 'Vending Series (JP)' },
    { value: 'Tropical Mega Battle (JP)', label: 'Tropical Mega Battle (JP)' },
  ],
  1998: [
    { value: 'Gym Heroes (JP)', label: 'Gym Heroes (JP)' },
    { value: 'Gym Challenge (JP)', label: 'Gym Challenge (JP)' },
    { value: 'Vending Series 2 (JP)', label: 'Vending Series 2 (JP)' },
    { value: 'Vending Series 3 (JP)', label: 'Vending Series 3 (JP)' },
    { value: 'Japanese Promo Cards (1998)', label: 'Japanese Promo Cards (1998)' },
  ],
  1999: [
    { value: 'Base Set', label: 'Base Set (EN)' },
    { value: 'Jungle', label: 'Jungle (EN)' },
    { value: 'Fossil', label: 'Fossil (EN)' },
    { value: 'Neo Genesis (JP)', label: 'Neo Genesis (JP)' },
    { value: 'Southern Islands (JP)', label: 'Southern Islands (JP)' },
    { value: 'Tropical Mega Battle (1999)', label: 'Tropical Mega Battle (1999)' },
    { value: 'Pokémon Card Game Official Tournament', label: 'Pokémon Card Game Official Tournament (JP)' },
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
    { value: 'Southern Islands (EN)', label: 'Southern Islands (EN)' },
    { value: 'Rocket Gang (JP)', label: 'Rocket Gang (JP)' },
    { value: 'Intro Pack (JP)', label: 'Intro Pack (JP)' },
    { value: 'Vending Series 4-6 (JP)', label: 'Vending Series 4-6 (JP)' },
  ],
  // Neo Era
  2001: [
    { value: 'Neo Discovery', label: 'Neo Discovery (EN)' },
    { value: 'Neo Revelation', label: 'Neo Revelation (EN)' },
    { value: 'Neo Destiny (JP)', label: 'Neo Destiny (JP)' },
    { value: 'Expedition Base Set (JP)', label: 'Expedition Base Set (JP)' },
    { value: 'Aquapolis (JP)', label: 'Aquapolis (JP)' },
    { value: 'Skyridge (JP)', label: 'Skyridge (JP)' },
    { value: 'VS Series (JP)', label: 'VS Series (JP)' },
    { value: 'Pokémon Card Game Rally (JP)', label: 'Pokémon Card Game Rally (JP)' },
    { value: 'Tropical Mega Battle (2001)', label: 'Tropical Mega Battle (2001)' },
  ],
  2002: [
    { value: 'Neo Destiny', label: 'Neo Destiny (EN)' },
    { value: 'Legendary Collection', label: 'Legendary Collection (EN)' },
    { value: 'Expedition Base Set', label: 'Expedition Base Set (EN)' },
    { value: 'Web Series (JP)', label: 'Web Series (JP)' },
    { value: 'e-Card Series (JP)', label: 'e-Card Series (JP)' },
    { value: 'The Best of Pokémon (JP)', label: 'The Best of Pokémon (JP)' },
    { value: 'McDonald\'s Collection 2002 (JP)', label: 'McDonald\'s Collection 2002 (JP)' },
    { value: 'Pokémon Players Club (JP)', label: 'Pokémon Players Club (JP)' },
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
    { value: 'Pokémon-e Promotion Cards (JP)', label: 'Pokémon-e Promotion Cards (JP)' },
    { value: 'Battle Road Spring/Summer/Autumn 2003 (JP)', label: 'Battle Road Spring/Summer/Autumn 2003 (JP)' },
    { value: 'World Championship Pack (2003)', label: 'World Championship Pack (2003)' },
    { value: 'McDonald\'s Collection 2003 (JP)', label: 'McDonald\'s Collection 2003 (JP)' },
  ],
  // EX Era
  2004: [
    { value: 'EX Team Magma vs Team Aqua', label: 'EX Team Magma vs Team Aqua (EN)' },
    { value: 'EX Hidden Legends', label: 'EX Hidden Legends (EN)' },
    { value: 'EX FireRed & LeafGreen', label: 'EX FireRed & LeafGreen (EN)' },
    { value: 'EX Team Rocket Returns', label: 'EX Team Rocket Returns (EN)' },
    { value: 'PCG Series (JP)', label: 'PCG Series (JP)' },
    { value: 'POP Series 1', label: 'POP Series 1 (EN)' },
    { value: 'Nintendo Promos (2004)', label: 'Nintendo Promos (2004)' },
    { value: 'ADV Promos (JP)', label: 'ADV Promos (JP)' },
    { value: 'Players Club Promos (2004)', label: 'Players Club Promos (2004)' },
    { value: 'World Championship Pack (2004)', label: 'World Championship Pack (2004)' },
  ],
  2005: [
    { value: 'EX Deoxys', label: 'EX Deoxys (EN)' },
    { value: 'EX Emerald', label: 'EX Emerald (EN)' },
    { value: 'EX Unseen Forces', label: 'EX Unseen Forces (EN)' },
    { value: 'EX Delta Species', label: 'EX Delta Species (EN)' },
    { value: 'Holon Series (JP)', label: 'Holon Series (JP)' },
    { value: 'POP Series 2', label: 'POP Series 2 (EN)' },
    { value: 'POP Series 3', label: 'POP Series 3 (EN)' },
    { value: 'Nintendo Promos (2005)', label: 'Nintendo Promos (2005)' },
    { value: 'Players Club Promos (2005)', label: 'Players Club Promos (2005)' },
    { value: 'Trainer Kit: Latias & Latios', label: 'Trainer Kit: Latias & Latios (EN)' },
    { value: 'Trainer Kit: Plusle & Minun', label: 'Trainer Kit: Plusle & Minun (EN)' },
  ],
  2006: [
    { value: 'EX Legend Maker', label: 'EX Legend Maker (EN)' },
    { value: 'EX Holon Phantoms', label: 'EX Holon Phantoms (EN)' },
    { value: 'EX Crystal Guardians', label: 'EX Crystal Guardians (EN)' },
    { value: 'EX Dragon Frontiers', label: 'EX Dragon Frontiers (EN)' },
    { value: 'EX Power Keepers', label: 'EX Power Keepers (EN)' },
    { value: 'DP Series (JP)', label: 'DP Series (JP)' },
    { value: 'POP Series 4', label: 'POP Series 4 (EN)' },
    { value: 'POP Series 5', label: 'POP Series 5 (EN)' },
    { value: 'Nintendo Promos (2006)', label: 'Nintendo Promos (2006)' },
    { value: 'Players Club Promos (2006)', label: 'Players Club Promos (2006)' },
    { value: 'EX Trainer Kit 2: Plusle & Minun', label: 'EX Trainer Kit 2: Plusle & Minun (EN)' },
    { value: 'World Championship Deck (2006)', label: 'World Championship Deck (2006)' },
  ],
  2007: [
    { value: 'Diamond & Pearl', label: 'Diamond & Pearl (EN)' },
    { value: 'Mysterious Treasures', label: 'Mysterious Treasures (EN)' },
    { value: 'Secret Wonders', label: 'Secret Wonders (EN)' },
    { value: 'POP Series 6', label: 'POP Series 6 (EN)' },
    { value: 'POP Series 7', label: 'POP Series 7 (EN)' },
    { value: 'Nintendo Promos (2007)', label: 'Nintendo Promos (2007)' },
    { value: 'Players Club Promos (2007)', label: 'Players Club Promos (2007)' },
    { value: 'Diamond & Pearl Trainer Kit', label: 'Diamond & Pearl Trainer Kit (EN)' },
    { value: 'World Championship Deck (2007)', label: 'World Championship Deck (2007)' },
    { value: 'DP Promos (JP)', label: 'DP Promos (JP)' },
  ],
  2008: [
    { value: 'Great Encounters', label: 'Great Encounters (EN)' },
    { value: 'Majestic Dawn', label: 'Majestic Dawn (EN)' },
    { value: 'Legends Awakened', label: 'Legends Awakened (EN)' },
    { value: 'Stormfront', label: 'Stormfront (EN)' },
    { value: 'POP Series 8', label: 'POP Series 8 (EN)' },
    { value: 'POP Series 9', label: 'POP Series 9 (EN)' },
    { value: 'Nintendo Promos (2008)', label: 'Nintendo Promos (2008)' },
    { value: 'Players Club Promos (2008)', label: 'Players Club Promos (2008)' },
    { value: 'World Championship Deck (2008)', label: 'World Championship Deck (2008)' },
    { value: 'Platinum Series (JP)', label: 'Platinum Series (JP)' },
    { value: 'Movie Commemoration Random Pack (JP)', label: 'Movie Commemoration Random Pack (JP)' },
    { value: 'LEGEND Series (JP)', label: 'LEGEND Series (JP)' },
  ],
  2009: [
    { value: 'Platinum', label: 'Platinum (EN)' },
    { value: 'Rising Rivals', label: 'Rising Rivals (EN)' },
    { value: 'Supreme Victors', label: 'Supreme Victors (EN)' },
    { value: 'Arceus', label: 'Arceus (EN)' },
    { value: 'Nintendo Promos (2009)', label: 'Nintendo Promos (2009)' },
    { value: 'Players Club Promos (2009)', label: 'Players Club Promos (2009)' },
    { value: 'World Championship Deck (2009)', label: 'World Championship Deck (2009)' },
    { value: 'HGSS Series (JP)', label: 'HGSS Series (JP)' },
    { value: 'Platinum Promos (JP)', label: 'Platinum Promos (JP)' },
    { value: 'DPt-P Promotional Cards (JP)', label: 'DPt-P Promotional Cards (JP)' },
    { value: 'Movie Random Pack (2009)', label: 'Movie Random Pack (2009)' },
  ],
  2010: [
    { value: 'HeartGold & SoulSilver', label: 'HeartGold & SoulSilver (EN)' },
    { value: 'Unleashed', label: 'Unleashed (EN)' },
    { value: 'Undaunted', label: 'Undaunted (EN)' },
    { value: 'Triumphant', label: 'Triumphant (EN)' },
    { value: 'HGSS Promos', label: 'HGSS Promos (EN)' },
    { value: 'Call of Legends', label: 'Call of Legends (EN)' },
    { value: 'Nintendo Promos (2010)', label: 'Nintendo Promos (2010)' },
    { value: 'Players Club Promos (2010)', label: 'Players Club Promos (2010)' },
    { value: 'World Championship Deck (2010)', label: 'World Championship Deck (2010)' },
    { value: 'LEGEND Box Promos (JP)', label: 'LEGEND Box Promos (JP)' },
    { value: 'HGSS-P Promotional Cards (JP)', label: 'HGSS-P Promotional Cards (JP)' },
    { value: 'Movie Random Pack (2010)', label: 'Movie Random Pack (2010)' },
  ],
  // Black & White Era
  2011: [
    { value: 'Black & White', label: 'Black & White (EN)' },
    { value: 'Emerging Powers', label: 'Emerging Powers (EN)' },
    { value: 'Noble Victories', label: 'Noble Victories (EN)' },
    { value: 'BW Promos', label: 'BW Promos (EN)' },
    { value: 'Black & White Series (JP)', label: 'Black & White Series (JP)' },
    { value: 'BW-P Promotional Cards (JP)', label: 'BW-P Promotional Cards (JP)' },
    { value: 'McDonald\'s Collection 2011 (EN)', label: 'McDonald\'s Collection 2011 (EN)' },
    { value: 'World Championship Deck (2011)', label: 'World Championship Deck (2011)' },
    { value: 'Battle Strength Decks (JP)', label: 'Battle Strength Decks (JP)' },
  ],
  2012: [
    { value: 'Next Destinies', label: 'Next Destinies (EN)' },
    { value: 'Dark Explorers', label: 'Dark Explorers (EN)' },
    { value: 'Dragons Exalted', label: 'Dragons Exalted (EN)' },
    { value: 'Dragon Vault', label: 'Dragon Vault (EN)' },
    { value: 'Boundaries Crossed', label: 'Boundaries Crossed (EN)' },
    { value: 'McDonald\'s Collection 2012 (EN)', label: 'McDonald\'s Collection 2012 (EN)' },
    { value: 'World Championship Deck (2012)', label: 'World Championship Deck (2012)' },
    { value: 'BW-P Promotional Cards 2012 (JP)', label: 'BW-P Promotional Cards 2012 (JP)' },
    { value: 'Battle Strength Deck Reshiram/Zekrom (JP)', label: 'Battle Strength Deck Reshiram/Zekrom (JP)' },
  ],
  2013: [
    { value: 'Plasma Storm', label: 'Plasma Storm (EN)' },
    { value: 'Plasma Freeze', label: 'Plasma Freeze (EN)' },
    { value: 'Plasma Blast', label: 'Plasma Blast (EN)' },
    { value: 'Legendary Treasures', label: 'Legendary Treasures (EN)' },
    { value: 'XY Promos', label: 'XY Promos (EN)' },
    { value: 'XY Series (JP)', label: 'XY Series (JP)' },
    { value: 'McDonald\'s Collection 2013 (EN)', label: 'McDonald\'s Collection 2013 (EN)' },
    { value: 'World Championship Deck (2013)', label: 'World Championship Deck (2013)' },
    { value: 'BW-P Promotional Cards 2013 (JP)', label: 'BW-P Promotional Cards 2013 (JP)' },
    { value: 'Best of XY (JP)', label: 'Best of XY (JP)' },
    { value: 'Radiant Collection', label: 'Radiant Collection (EN)' },
  ],
  // XY Era
  2014: [
    { value: 'XY', label: 'XY (EN)' },
    { value: 'Flashfire', label: 'Flashfire (EN)' },
    { value: 'Furious Fists', label: 'Furious Fists (EN)' },
    { value: 'Phantom Forces', label: 'Phantom Forces (EN)' },
    { value: 'XY Promos', label: 'XY Promos (EN)' },
    { value: 'McDonald\'s Collection 2014 (EN)', label: 'McDonald\'s Collection 2014 (EN)' },
    { value: 'World Championship Deck (2014)', label: 'World Championship Deck (2014)' },
    { value: 'XY-P Promotional Cards (JP)', label: 'XY-P Promotional Cards (JP)' },
    { value: 'Mega Battle Pack (JP)', label: 'Mega Battle Pack (JP)' },
    { value: 'Premium Champion Pack (JP)', label: 'Premium Champion Pack (JP)' },
    { value: 'XY Trainer Kit: Sylveon & Noivern', label: 'XY Trainer Kit: Sylveon & Noivern (EN)' },
  ],
  2015: [
    { value: 'Primal Clash', label: 'Primal Clash (EN)' },
    { value: 'Roaring Skies', label: 'Roaring Skies (EN)' },
    { value: 'Ancient Origins', label: 'Ancient Origins (EN)' },
    { value: 'BREAKthrough', label: 'BREAKthrough (EN)' },
    { value: 'XY Promos', label: 'XY Promos (EN)' },
    { value: 'XY BREAK Series (JP)', label: 'XY BREAK Series (JP)' },
    { value: 'McDonald\'s Collection 2015 (EN)', label: 'McDonald\'s Collection 2015 (EN)' },
    { value: 'World Championship Deck (2015)', label: 'World Championship Deck (2015)' },
    { value: 'XY-P Promotional Cards 2015 (JP)', label: 'XY-P Promotional Cards 2015 (JP)' },
    { value: 'Mythical & Legendary Dream Shine Collection (JP)', label: 'Mythical & Legendary Dream Shine Collection (JP)' },
    { value: 'Double Crisis', label: 'Double Crisis (EN)' },
    { value: 'XY Trainer Kit: Latias & Latios', label: 'XY Trainer Kit: Latias & Latios (EN)' },
    { value: 'XY Trainer Kit: Pikachu Libre & Suicune', label: 'XY Trainer Kit: Pikachu Libre & Suicune (EN)' },
  ],
  2016: [
    { value: 'BREAKpoint', label: 'BREAKpoint (EN)' },
    { value: 'Fates Collide', label: 'Fates Collide (EN)' },
    { value: 'Steam Siege', label: 'Steam Siege (EN)' },
    { value: 'Evolutions', label: 'Evolutions (EN)' },
    { value: 'Generations', label: 'Generations (EN)' },
    { value: 'XY Promos', label: 'XY Promos (EN)' },
    { value: 'McDonald\'s Collection 2016 (EN)', label: 'McDonald\'s Collection 2016 (EN)' },
    { value: 'World Championship Deck (2016)', label: 'World Championship Deck (2016)' },
    { value: 'XY-P Promotional Cards 2016 (JP)', label: 'XY-P Promotional Cards 2016 (JP)' },
    { value: 'Mario Pikachu Special Box (JP)', label: 'Mario Pikachu Special Box (JP)' },
    { value: 'Mythical Pokémon Collection', label: 'Mythical Pokémon Collection (EN)' },
    { value: 'Radiant Collection (Generations)', label: 'Radiant Collection (Generations) (EN)' },
    { value: 'Sun & Moon Series (JP)', label: 'Sun & Moon Series (JP)' },
    { value: '20th Anniversary Concept Pack (JP)', label: '20th Anniversary Concept Pack (JP)' },
    { value: 'SM Expansion (JP)', label: 'SM Expansion (JP)' },
  ],
  // Sun & Moon Era
  2017: [
    { value: 'Sun & Moon', label: 'Sun & Moon (EN)' },
    { value: 'Guardians Rising', label: 'Guardians Rising (EN)' },
    { value: 'Burning Shadows', label: 'Burning Shadows (EN)' },
    { value: 'Crimson Invasion', label: 'Crimson Invasion (EN)' },
    { value: 'Shining Legends', label: 'Shining Legends (EN)' },
    { value: 'SM Promos', label: 'SM Promos (EN)' },
    { value: 'McDonald\'s Collection 2017 (EN)', label: 'McDonald\'s Collection 2017 (EN)' },
    { value: 'World Championship Deck (2017)', label: 'World Championship Deck (2017)' },
    { value: 'SM-P Promotional Cards (JP)', label: 'SM-P Promotional Cards (JP)' },
    { value: 'Ash vs Team Rocket Deck Kit (JP)', label: 'Ash vs Team Rocket Deck Kit (JP)' },
    { value: 'Strength Expansion Pack (JP)', label: 'Strength Expansion Pack (JP)' },
    { value: 'Premium Trainer Box (JP)', label: 'Premium Trainer Box (JP)' },
    { value: 'GX Battle Boost (JP)', label: 'GX Battle Boost (JP)' },
    { value: 'Alolan Moonlight & Solgaleo GX & Lunala GX Starter Set (JP)', label: 'Alolan Moonlight & Solgaleo GX & Lunala GX Starter Set (JP)' },
  ],
  2018: [
    { value: 'Ultra Prism', label: 'Ultra Prism (EN)' },
    { value: 'Forbidden Light', label: 'Forbidden Light (EN)' },
    { value: 'Celestial Storm', label: 'Celestial Storm (EN)' },
    { value: 'Lost Thunder', label: 'Lost Thunder (EN)' },
    { value: 'Dragon Majesty', label: 'Dragon Majesty (EN)' },
    { value: 'SM Promos', label: 'SM Promos (EN)' },
    { value: 'GX Ultra Shiny (JP)', label: 'GX Ultra Shiny (JP)' },
    { value: 'SM-P Promotional Cards 2018 (JP)', label: 'SM-P Promotional Cards 2018 (JP)' },
    { value: 'Full Metal Wall (JP)', label: 'Full Metal Wall (JP)' },
    { value: 'Night Unison (JP)', label: 'Night Unison (JP)' },
    { value: 'Champion Road (JP)', label: 'Champion Road (JP)' },
    { value: 'McDonald\'s Collection 2018', label: 'McDonald\'s Collection 2018 (EN)' },
    { value: 'World Championship Deck (2018)', label: 'World Championship Deck (2018)' },
    { value: 'Detective Pikachu', label: 'Detective Pikachu (EN)' },
    { value: 'Tag Team GX Starter Set (JP)', label: 'Tag Team GX Starter Set (JP)' },
    { value: 'GX Ultra Shiny High Class Pack (JP)', label: 'GX Ultra Shiny High Class Pack (JP)' },
  ],
  2019: [
    { value: 'Team Up', label: 'Team Up (EN)' },
    { value: 'Unbroken Bonds', label: 'Unbroken Bonds (EN)' },
    { value: 'Unified Minds', label: 'Unified Minds (EN)' },
    { value: 'Cosmic Eclipse', label: 'Cosmic Eclipse (EN)' },
    { value: 'Hidden Fates', label: 'Hidden Fates (EN)' },
    { value: 'SM Promos', label: 'SM Promos (EN)' },
    { value: 'Tag Team GX All Stars (JP)', label: 'Tag Team GX All Stars (JP)' },
    { value: 'Dream League (JP)', label: 'Dream League (JP)' },
    { value: 'McDonald\'s Collection 2019', label: 'McDonald\'s Collection 2019 (EN)' },
    { value: 'World Championship Deck (2019)', label: 'World Championship Deck (2019)' },
    { value: 'SM-P Promotional Cards 2019 (JP)', label: 'SM-P Promotional Cards 2019 (JP)' },
    { value: 'Remix Bout (JP)', label: 'Remix Bout (JP)' },
    { value: 'Miracle Twin (JP)', label: 'Miracle Twin (JP)' },
    { value: 'GX Tag Team Tag All Stars (JP)', label: 'GX Tag Team Tag All Stars (JP)' },
    { value: 'Hidden Fates: Shiny Vault', label: 'Hidden Fates: Shiny Vault (EN)' },
    { value: 'Sword & Shield Series (JP)', label: 'Sword & Shield Series (JP)' },
  ],
  // Sword & Shield Era
  2020: [
    { value: 'Sword & Shield', label: 'Sword & Shield (EN)' },
    { value: 'Rebel Clash', label: 'Rebel Clash (EN)' },
    { value: 'Darkness Ablaze', label: 'Darkness Ablaze (EN)' },
    { value: 'Vivid Voltage', label: 'Vivid Voltage (EN)' },
    { value: 'Champion\'s Path', label: 'Champion\'s Path (EN)' },
    { value: 'SWSH Promos', label: 'SWSH Promos (EN)' },
    { value: 'Shiny Star V (JP)', label: 'Shiny Star V (JP)' },
    { value: 'SWSH-P Promotional Cards (JP)', label: 'SWSH-P Promotional Cards (JP)' },
    { value: 'McDonald\'s Collection 2020', label: 'McDonald\'s Collection 2020 (EN)' },
    { value: 'Amazing Volt Tackle (JP)', label: 'Amazing Volt Tackle (JP)' },
    { value: 'Legendary Heartbeat (JP)', label: 'Legendary Heartbeat (JP)' },
    { value: 'Astonishing Volt Tackle (JP)', label: 'Astonishing Volt Tackle (JP)' },
    { value: 'Explosive Walker (JP)', label: 'Explosive Walker (JP)' },
    { value: 'Infinity Zone (JP)', label: 'Infinity Zone (JP)' },
    { value: 'Rebellion Crash (JP)', label: 'Rebellion Crash (JP)' },
    { value: 'Sword Shield Starter Set (JP)', label: 'Sword Shield Starter Set (JP)' },
  ],
  2021: [
    { value: 'Battle Styles', label: 'Battle Styles (EN)' },
    { value: 'Chilling Reign', label: 'Chilling Reign (EN)' },
    { value: 'Evolving Skies', label: 'Evolving Skies (EN)' },
    { value: 'Fusion Strike', label: 'Fusion Strike (EN)' },
    { value: 'Shining Fates', label: 'Shining Fates (EN)' },
    { value: 'Celebrations', label: 'Celebrations (EN)' },
    { value: 'SWSH Promos', label: 'SWSH Promos (EN)' },
    { value: 'VMAX Climax (JP)', label: 'VMAX Climax (JP)' },
    { value: 'Eevee Heroes (JP)', label: 'Eevee Heroes (JP)' },
    { value: 'Blue Sky Stream (JP)', label: 'Blue Sky Stream (JP)' },
    { value: 'Jet Black Spirit (JP)', label: 'Jet Black Spirit (JP)' },
    { value: 'Matchless Fighter (JP)', label: 'Matchless Fighter (JP)' },
    { value: 'Silver Lance (JP)', label: 'Silver Lance (JP)' },
    { value: 'Single Strike Master (JP)', label: 'Single Strike Master (JP)' },
    { value: 'Rapid Strike Master (JP)', label: 'Rapid Strike Master (JP)' },
    { value: 'SWSH-P Promotional Cards 2021 (JP)', label: 'SWSH-P Promotional Cards 2021 (JP)' },
    { value: 'McDonald\'s Collection 2021', label: 'McDonald\'s Collection 2021 (EN)' },
    { value: 'Shiny Star V Shiny Box (JP)', label: 'Shiny Star V Shiny Box (JP)' },
    { value: 'Shining Fates: Shiny Vault', label: 'Shining Fates: Shiny Vault (EN)' },
    { value: 'Celebrations: Classic Collection', label: 'Celebrations: Classic Collection (EN)' },
    { value: 'Fusion Arts (JP)', label: 'Fusion Arts (JP)' },
    { value: 'Gengar VMAX & Inteleon VMAX High Class Deck (JP)', label: 'Gengar VMAX & Inteleon VMAX High Class Deck (JP)' },
  ],
  2022: [
    { value: 'Brilliant Stars', label: 'Brilliant Stars (EN)' },
    { value: 'Astral Radiance', label: 'Astral Radiance (EN)' },
    { value: 'Lost Origin', label: 'Lost Origin (EN)' },
    { value: 'Silver Tempest', label: 'Silver Tempest (EN)' },
    { value: 'Pokémon GO', label: 'Pokémon GO (EN)' },
    { value: 'SWSH Promos', label: 'SWSH Promos (EN)' },
    { value: 'VSTAR Universe (JP)', label: 'VSTAR Universe (JP)' },
    { value: 'Dark Phantasma (JP)', label: 'Dark Phantasma (JP)' },
    { value: 'Battle Region (JP)', label: 'Battle Region (JP)' },
    { value: 'Space Juggler (JP)', label: 'Space Juggler (JP)' },
    { value: 'Lost Abyss (JP)', label: 'Lost Abyss (JP)' },
    { value: 'Incandescent Arcana (JP)', label: 'Incandescent Arcana (JP)' },
    { value: 'Paradigm Trigger (JP)', label: 'Paradigm Trigger (JP)' },
    { value: 'SWSH-P Promotional Cards 2022 (JP)', label: 'SWSH-P Promotional Cards 2022 (JP)' },
    { value: 'McDonald\'s Collection 2022', label: 'McDonald\'s Collection 2022 (EN)' },
    { value: 'Brilliant Stars: Trainer Gallery', label: 'Brilliant Stars: Trainer Gallery (EN)' },
    { value: 'Astral Radiance: Trainer Gallery', label: 'Astral Radiance: Trainer Gallery (EN)' },
    { value: 'Lost Origin: Trainer Gallery', label: 'Lost Origin: Trainer Gallery (EN)' },
    { value: 'Silver Tempest: Trainer Gallery', label: 'Silver Tempest: Trainer Gallery (EN)' },
    { value: 'Crown Zenith', label: 'Crown Zenith (EN)' },
    { value: 'Crown Zenith: Galarian Gallery', label: 'Crown Zenith: Galarian Gallery (EN)' },
    { value: 'Scarlet & Violet Series (JP)', label: 'Scarlet & Violet Series (JP)' },
  ],
  // Scarlet & Violet Era
  2023: [
    { value: 'Scarlet & Violet', label: 'Scarlet & Violet (EN)' },
    { value: 'Paldea Evolved', label: 'Paldea Evolved (EN)' },
    { value: 'Obsidian Flames', label: 'Obsidian Flames (EN)' },
    { value: 'Paradox Rift', label: 'Paradox Rift (EN)' },
    { value: 'Pokémon 151', label: 'Pokémon 151 (EN)' },
    { value: 'SV Promos', label: 'SV Promos (EN)' },
    { value: 'Triplet Beat (JP)', label: 'Triplet Beat (JP)' },
    { value: 'Snow Hazard (JP)', label: 'Snow Hazard (JP)' },
    { value: 'Clay Burst (JP)', label: 'Clay Burst (JP)' },
    { value: 'Night Wanderer (JP)', label: 'Night Wanderer (JP)' },
    { value: 'Ancient Roar (JP)', label: 'Ancient Roar (JP)' },
    { value: 'Future Flash (JP)', label: 'Future Flash (JP)' },
    { value: 'Raging Surf (JP)', label: 'Raging Surf (JP)' },
    { value: 'SV-P Promotional Cards 2023 (JP)', label: 'SV-P Promotional Cards 2023 (JP)' },
    { value: 'McDonald\'s Collection 2023', label: 'McDonald\'s Collection 2023 (EN)' },
    { value: 'Scarlet & Violet Special Illustration Rare Collection (JP)', label: 'Scarlet & Violet Special Illustration Rare Collection (JP)' },
    { value: 'Pokémon Card 151 (JP)', label: 'Pokémon Card 151 (JP)' },
    { value: 'Shiny Treasure ex (JP)', label: 'Shiny Treasure ex (JP)' },
  ],
  2024: [
    { value: 'Scarlet & Violet: Paldean Fates', label: 'Scarlet & Violet: Paldean Fates (EN)' },
    { value: 'Temporal Forces', label: 'Temporal Forces (EN)' },
    { value: 'Twilight Masquerade', label: 'Twilight Masquerade (EN)' },
    { value: 'Scarlet & Violet: Astral Forces', label: 'Scarlet & Violet: Astral Forces (EN)' },
    { value: 'Stellar Crown', label: 'Stellar Crown (EN)' },
    { value: 'Shrouded Fable', label: 'Shrouded Fable (EN)' },
    { value: 'Pocket', label: 'Pocket (EN)' },
    { value: 'SV Promos', label: 'SV Promos (EN)' },
    { value: 'Mask of Change (JP)', label: 'Mask of Change (JP)' },
    { value: 'Crimson Haze (JP)', label: 'Crimson Haze (JP)' },
    { value: 'Cyber Judge (JP)', label: 'Cyber Judge (JP)' },
    { value: 'Wild Force (JP)', label: 'Wild Force (JP)' },
    { value: 'Ruler of the Dark (JP)', label: 'Ruler of the Dark (JP)' },
    { value: 'SV-P Promotional Cards 2024 (JP)', label: 'SV-P Promotional Cards 2024 (JP)' },
    { value: 'McDonald\'s Collection 2024', label: 'McDonald\'s Collection 2024 (EN)' },
    { value: 'Temporal Forces Special Collection', label: 'Temporal Forces Special Collection (EN)' },
    { value: 'Scarlet & Violet: Paldean Fates Shiny Treasure', label: 'Scarlet & Violet: Paldean Fates Shiny Treasure (EN)' },
    { value: 'Scarlet & Violet High-Class Pack (JP)', label: 'Scarlet & Violet High-Class Pack (JP)' },
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
      allSets.push(set);
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
  
  const standardSets = POKEMON_SETS[year] || []; 
  const customSets = userCustomSets[year] || [];
  
  // Combine standard and custom sets
  return [...standardSets, ...customSets];
};

// Magic: The Gathering Sets
const MAGIC_SETS = [
  'Alpha',
  'Beta',
  'Unlimited',
  'Arabian Nights',
  'Antiquities',
  'Legends',
  'The Dark',
  'Fallen Empires',
  'Ice Age',
  'Homelands',
  'Alliances',
  'Mirage',
  'Visions',
  'Weatherlight',
  'Tempest',
  'Stronghold',
  'Exodus',
  'Urza\'s Saga',
  'Urza\'s Legacy',
  'Urza\'s Destiny',
  'Mercadian Masques',
  'Nemesis',
  'Prophecy',
  'Invasion',
  'Planeshift',
  'Apocalypse',
  'Odyssey',
  'Torment',
  'Judgment',
  'Onslaught',
  'Legions',
  'Scourge',
  'Mirrodin',
  'Darksteel',
  'Fifth Dawn',
  'Champions of Kamigawa',
  'Betrayers of Kamigawa',
  'Saviors of Kamigawa',
  'Ravnica: City of Guilds',
  'Guildpact',
  'Dissension',
  'Time Spiral',
  'Planar Chaos',
  'Future Sight',
  'Lorwyn',
  'Morningtide',
  'Shadowmoor',
  'Eventide',
  'Shards of Alara',
  'Conflux',
  'Alara Reborn',
  'Zendikar',
  'Worldwake',
  'Rise of the Eldrazi',
  'Scars of Mirrodin',
  'Mirrodin Besieged',
  'New Phyrexia',
  'Innistrad',
  'Dark Ascension',
  'Avacyn Restored',
  'Return to Ravnica',
  'Gatecrash',
  'Dragon\'s Maze',
  'Theros',
  'Born of the Gods',
  'Journey into Nyx',
  'Khans of Tarkir',
  'Fate Reforged',
  'Dragons of Tarkir',
  'Battle for Zendikar',
  'Oath of the Gatewatch',
  'Shadows over Innistrad',
  'Eldritch Moon',
  'Kaladesh',
  'Aether Revolt',
  'Amonkhet',
  'Hour of Devastation',
  'Ixalan',
  'Rivals of Ixalan',
  'Dominaria',
  'Guilds of Ravnica',
  'Ravnica Allegiance',
  'War of the Spark',
  'Throne of Eldraine',
  'Theros Beyond Death',
  'Ikoria: Lair of Behemoths',
  'Core Set 2021',
  'Zendikar Rising',
  'Kaldheim',
  'Strixhaven: School of Mages',
  'Adventures in the Forgotten Realms',
  'Innistrad: Midnight Hunt',
  'Innistrad: Crimson Vow',
  'Kamigawa: Neon Dynasty',
  'Streets of New Capenna',
  'Dominaria United',
  'The Brothers\' War',
  'Phyrexia: All Will Be One',
  'March of the Machine',
  'March of the Machine: The Aftermath',
  'Wilds of Eldraine',
  'The Lost Caverns of Ixalan',
  'Murders at Karlov Manor',
  'Outlaws of Thunder Junction',
  'Modern Horizons',
  'Modern Horizons 2',
  'Modern Horizons 3',
  'Double Masters',
  'Double Masters 2022',
  'Commander Legends',
  'Commander Legends: Battle for Baldur\'s Gate',
  'Commander Masters',
];

// Yu-Gi-Oh Sets
const YUGIOH_SETS = [
  'Legend of Blue Eyes White Dragon',
  'Metal Raiders',
  'Spell Ruler',
  'Pharaoh\'s Servant',
  'Labyrinth of Nightmare',
  'Legacy of Darkness',
  'Pharaonic Guardian',
  'Magician\'s Force',
  'Dark Crisis',
  'Invasion of Chaos',
  'Ancient Sanctuary',
  'Soul of the Duelist',
  'Rise of Destiny',
  'Flaming Eternity',
  'The Lost Millennium',
  'Cybernetic Revolution',
  'Elemental Energy',
  'Shadow of Infinity',
  'Enemy of Justice',
  'Power of the Duelist',
  'Cyberdark Impact',
  'Strike of Neos',
  'Force of the Breaker',
  'Tactical Evolution',
  'Gladiator\'s Assault',
  'Phantom Darkness',
  'Light of Destruction',
  'The Duelist Genesis',
  'Crossroads of Chaos',
  'Crimson Crisis',
  'Raging Battle',
  'Ancient Prophecy',
  'Stardust Overdrive',
  'Absolute Powerforce',
  'The Shining Darkness',
  'Duelist Revolution',
  'Starstrike Blast',
  'Storm of Ragnarok',
  'Extreme Victory',
  'Generation Force',
  'Photon Shockwave',
  'Order of Chaos',
  'Galactic Overlord',
  'Return of the Duelist',
  'Abyss Rising',
  'Cosmo Blazer',
  'Lord of the Tachyon Galaxy',
  'Judgment of the Light',
  'Shadow Specters',
  'Legacy of the Valiant',
  'Primal Origin',
  'Duelist Alliance',
  'The New Challengers',
  'Secrets of Eternity',
  'Crossed Souls',
  'Clash of Rebellions',
  'Dimension of Chaos',
  'Breakers of Shadow',
  'Shining Victories',
  'The Dark Illusion',
  'Invasion: Vengeance',
  'Raging Tempest',
  'Maximum Crisis',
  'Code of the Duelist',
  'Circuit Break',
  'Extreme Force',
  'Flames of Destruction',
  'Cybernetic Horizon',
  'Soul Fusion',
  'Savage Strike',
  'Dark Neostorm',
  'Rising Rampage',
  'Chaos Impact',
  'Ignition Assault',
  'Eternity Code',
  'Rise of the Duelist',
  'Phantom Rage',
  'Blazing Vortex',
  'Lightning Overdrive',
  'Dawn of Majesty',
  'Burst of Destiny',
  'Battle of Chaos',
  'Dimension Force',
  'Power of the Elements',
  'Darkwing Blast',
  'Photon Hypernova',
  'Cyberstorm Access',
  'Duelist Nexus',
  'Age of Overlord',
  'Structure Deck: Yugi',
  'Structure Deck: Kaiba',
  'Structure Deck: Joey',
  'Legendary Collection',
  'Gold Series',
  'Duel Devastator',
  'Battles of Legend',
];

// One Piece Sets
const ONE_PIECE_SETS = [
  'Romance Dawn',
  'Paramount War',
  'The Seven Warlords of the Sea',
  'Animal Kingdom Pirates',
  'Kingdoms of Intrigue',
  'Pillars of Strength',
  'Thriller Bark',
  'One Piece Film Edition',
  'Straw Hat Crew',
  'Marineford War',
  'Dressrosa',
  'Whole Cake Island',
  'Wano Country',
  'Egghead',
];

// Digimon Sets
const DIGIMON_SETS = [
  'New Evolution',
  'Release Special Booster',
  'Clash of Rebellion',
  'Great Legend',
  'Battle of Omni',
  'Double Diamond',
  'Fusion Fighters',
  'Next Adventure',
  'Digital Hazard',
  'Cross Encounter',
  'Dimensional Phase',
  'Xros Encounter',
  'Raging Raid',
  'Across Time',
  'Booster EX-01',
  'Booster EX-02',
  'Booster EX-03',
  'Booster EX-04',
];

// Dragon Ball Z Sets
const DRAGON_BALL_SETS = [
  'Awakening',
  'Union Force',
  'Cross Worlds',
  'Tournament of Power',
  'Miraculous Revival',
  'Destroyer Kings',
  'World Martial Arts Tournament',
  'Assault of the Saiyans',
  'Malicious Machinations',
  'Rise of the Unison Warrior',
  'Vermilion Bloodline',
  'Supreme Rivalry',
  'Cross Spirits',
  'Saiyan Showdown',
  'Realm of the Gods',
  'Zenkai Series',
  'Pride of the Saiyans',
  'Vicious Rejuvenation',
  'Unison Warrior Series',
  'Mythic Booster',
  'Ultimate Deck',
];

// Marvel Sets
const MARVEL_SETS = [
  'Marvel Universe',
  'Marvel Masterpieces',
  'Marvel Premium',
  'Marvel Beginnings',
  'Marvel Now',
  'Marvel Avengers',
  'Marvel X-Men',
  'Marvel Guardians of the Galaxy',
  'Marvel Spider-Man',
  'Marvel Deadpool',
  'Marvel Black Panther',
  'Marvel Captain Marvel',
  'Marvel Infinity War',
  'Marvel Endgame',
  'Marvel Legends',
  'Marvel Ultimate Universe',
  'Marvel Retro',
  'Marvel Fleer Ultra',
  'Marvel Flair',
  'Marvel Metal',
];

// WWE Sets
const WWE_SETS = [
  'WWE Legends',
  'WWE Raw',
  'WWE SmackDown',
  'WWE NXT',
  'WWE WrestleMania',
  'WWE SummerSlam',
  'WWE Royal Rumble',
  'WWE Survivor Series',
  'WWE Undisputed',
  'WWE Heritage',
  'WWE Chrome',
  'WWE Finest',
  'WWE Topps',
  'WWE Panini',
  'WWE Revolution',
  'WWE Hall of Fame',
];

// NBA Sets
const NBA_SETS = [
  'Topps Basketball',
  'Fleer Basketball',
  'Upper Deck Basketball',
  'Panini Prizm',
  'Panini Select',
  'Panini Optic',
  'Panini Revolution',
  'Panini Mosaic',
  'Panini Contenders',
  'Panini National Treasures',
  'Panini Immaculate',
  'Panini Flawless',
  'Panini Court Kings',
  'Panini Chronicles',
  'Panini Noir',
  'Panini Status',
  'Panini Certified',
  'Panini Absolute',
  'Panini Spectra',
  'Panini Origins',
  'Panini Crown Royale',
  'Panini Donruss',
  'Panini Hoops',
];

// NFL Sets
const NFL_SETS = [
  'Topps Football',
  'Fleer Football',
  'Upper Deck Football',
  'Panini Prizm Football',
  'Panini Select Football',
  'Panini Optic Football',
  'Panini Contenders Football',
  'Panini National Treasures Football',
  'Panini Immaculate Football',
  'Panini Flawless Football',
  'Panini Chronicles Football',
  'Panini Mosaic Football',
  'Panini Absolute Football',
  'Panini Certified Football',
  'Panini Spectra Football',
  'Panini Origins Football',
  'Panini Crown Royale Football',
  'Panini Donruss Football',
  'Panini Score Football',
  'Panini Prestige Football',
  'Panini Legacy Football',
];

// MLB Sets
const MLB_SETS = [
  'Topps Baseball',
  'Topps Chrome',
  'Topps Heritage',
  'Topps Allen & Ginter',
  'Topps Gypsy Queen',
  'Topps Stadium Club',
  'Topps Archives',
  'Topps Update',
  'Topps Tier One',
  'Topps Tribute',
  'Topps Dynasty',
  'Topps Five Star',
  'Topps Gold Label',
  'Topps Museum Collection',
  'Topps Inception',
  'Topps Definitive',
  'Bowman Baseball',
  'Bowman Chrome',
  'Bowman Draft',
  'Bowman Sterling',
  'Bowman Platinum',
  'Panini Prizm Baseball',
  'Panini Select Baseball',
  'Panini National Treasures Baseball',
  'Panini Immaculate Baseball',
  'Panini Flawless Baseball',
  'Upper Deck Baseball',
];

// Soccer Sets
const SOCCER_SETS = [
  'Topps Match Attax',
  'Topps Chrome UEFA Champions League',
  'Topps Merlin Premier League',
  'Topps Stadium Club',
  'Topps Finest',
  'Panini Prizm World Cup',
  'Panini Select Soccer',
  'Panini Chronicles Soccer',
  'Panini Immaculate Soccer',
  'Panini National Treasures Soccer',
  'Panini Flawless Soccer',
  'Panini Donruss Soccer',
  'Panini Obsidian Soccer',
  'Panini Mosaic Soccer',
  'Panini Revolution Soccer',
  'Panini Spectra Soccer',
  'Panini Gold Standard Soccer',
  'Panini Noir Soccer',
  'Upper Deck Soccer',
];

// UFC Sets
const UFC_SETS = [
  'Topps UFC',
  'Topps UFC Chrome',
  'Topps UFC Finest',
  'Topps UFC Knockout',
  'Topps UFC High Impact',
  'Topps UFC Museum Collection',
  'Topps UFC Dynasty',
  'Panini Prizm UFC',
  'Panini Select UFC',
  'Panini Chronicles UFC',
  'Panini Immaculate UFC',
  'Panini National Treasures UFC',
  'Panini Obsidian UFC',
  'Panini Donruss UFC',
];

// F1 Sets
const F1_SETS = [
  'Topps Formula 1',
  'Topps Chrome Formula 1',
  'Topps Dynasty Formula 1',
  'Topps Finest Formula 1',
  'Topps Fire Formula 1',
  'Topps Museum Collection Formula 1',
  'Topps Definitive Formula 1',
  'Topps Gold Label Formula 1',
  'Topps High Tek Formula 1',
  'Topps Transcendent Formula 1',
  'Topps Luminaries Formula 1',
];

// NRL Sets
const NRL_SETS = [
  'NRL Traders',
  'NRL Elite',
  'NRL Classic',
  'NRL Dynasty',
  'NRL Footy Stars',
  'NRL Select',
  'NRL Prizm',
  'NRL Phoenix',
  'NRL Immortals',
  'NRL Origins',
  'NRL Prestige',
];

/**
 * Get sets filtered by category
 * @param {string} category - Category to filter by
 * @returns {Array} Array of set values appropriate for the specified category
 */
const getSetsByCategory = (category) => {
  if (!category) return [];
  
  // Return sets based on category
  switch (category) {
    case 'pokemon':
      return getAllPokemonSets();
    case 'magicTheGathering':
      return MAGIC_SETS;
    case 'yugioh':
      return YUGIOH_SETS;
    case 'onePiece':
      return ONE_PIECE_SETS;
    case 'digimon':
      return DIGIMON_SETS;
    case 'dragonBallZ':
      return DRAGON_BALL_SETS;
    case 'marvel':
      return MARVEL_SETS;
    case 'wwe':
      return WWE_SETS;
    case 'nba':
      return NBA_SETS;
    case 'nfl':
      return NFL_SETS;
    case 'mlb':
      return MLB_SETS;
    case 'soccer':
      return SOCCER_SETS;
    case 'ufc':
      return UFC_SETS;
    case 'f1':
      return F1_SETS;
    case 'nrl':
      return NRL_SETS;
    default:
      return [];
  }
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
  getSetsByCategory,
  addCustomSet,
  getAvailableYears
};

export default POKEMON_SETS;
