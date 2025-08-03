import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const CollectingGuide = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'card-conditions', title: 'Card Conditions', icon: '💎' },
    { id: 'grading', title: 'Grading Guide', icon: '🏆' },
    { id: 'storage', title: 'Storage & Protection', icon: '🛡️' },
    { id: 'market-trends', title: 'Market Trends', icon: '📈' },
    { id: 'authentication', title: 'Authentication', icon: '🔍' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Getting Started with Pokémon Card Collecting
            </h2>

            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                🎯 Define Your Collection Goals
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Choose your focus: specific sets, Pokémon, or eras</li>
                <li>• Set a realistic budget for your collection</li>
                <li>• Decide between vintage or modern cards</li>
                <li>• Consider long-term vs. short-term collecting</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-green-400">
                  💰 Budget Planning
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Start with lower-value cards to learn</li>
                  <li>• Allocate funds for storage and protection</li>
                  <li>• Track your spending with our tools</li>
                  <li>• Consider grading costs for valuable cards</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-purple-400">
                  📚 Research & Education
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Study price guides and market trends</li>
                  <li>• Join collecting communities</li>
                  <li>• Learn about card variations</li>
                  <li>• Understand printing processes</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'card-conditions':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Understanding Pokémon Card Conditions
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-green-400">
                  💎 Mint (M)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Perfect condition, no visible flaws
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Sharp corners</li>
                  <li>• Perfect centering</li>
                  <li>• No surface wear</li>
                  <li>• Clean edges</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-blue-400">
                  ⭐ Near Mint (NM)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Excellent condition with minor flaws
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Very minor edge wear</li>
                  <li>• Slight centering issues</li>
                  <li>• Minimal surface scratches</li>
                  <li>• Sharp corners</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="mb-4 text-xl font-bold text-yellow-400">
                  ✨ Excellent (EX)
                </h3>
                <p className="mb-4 text-sm text-gray-300">
                  Good condition with noticeable wear
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Light edge wear</li>
                  <li>• Minor corner wear</li>
                  <li>• Some surface scratches</li>
                  <li>• Good overall appearance</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'grading':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Pokémon Card Grading: Latest Data, Standards and Best Practices (2025)
            </h2>

            {/* Section 1: Booming Market */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                🚀 A Booming Graded-Card Market
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Pokémon cards have become the dominant segment of the graded trading-card market in 2025. A July 2025 analysis by GemRate reports that trading-card and non-sports cards accounted for 7.2 million of the 12.4 million cards graded by the four major authentication companies in the first half of 2025—a 59% share, up 70% year-over-year.
                </p>
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="mb-2 font-semibold text-yellow-400">Key 2025 Statistics:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• 97 of the top 100 cards graded by PSA were Pokémon cards</li>
                    <li>• Pikachu alone had more than 345,000 graded examples</li>
                    <li>• "Pikachu with Grey Felt Hat" became PSA's most-graded Pokémon card (84,000 copies)</li>
                    <li>• CGC Cards graded 2.18 million items in first six months of 2025</li>
                    <li>• PSA's GameStop partnership drove over 1 million submissions</li>
                  </ul>
                </div>
                <p className="text-sm">
                  Collectors are chasing high grades because gem-mint cards command large premiums; PSA 10 copies of the Grey Felt Hat Pikachu can sell for US$900+ despite a population exceeding 40,000.
                </p>
              </div>
            </div>

            {/* Section 2: Grading Criteria */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-purple-400">
                🔍 Understanding Grading Criteria
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Professional grading evaluates several aspects of a card's physical condition. Graders assess centering, corners, edges, and surface using precision equipment.
                </p>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-green-400">PSA 10 (Gem Mint)</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Front centering: up to 55/45</li>
                      <li>• Back centering: up to 75/25</li>
                      <li>• Perfect corners and edges</li>
                      <li>• Flawless surface</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-blue-400">PSA 9 (Mint)</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Front centering: up to 60/40</li>
                      <li>• Back centering: up to 90/10</li>
                      <li>• Slight off-centering allowed</li>
                      <li>• Minor edge whitening possible</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-600/10 border border-amber-600/20 rounded-lg p-4">
                  <h4 className="mb-2 font-semibold text-amber-400">💡 Grading Tips</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Inspect cards with good lighting before submission</li>
                    <li>• Use soft microfiber cloths to remove fingerprints</li>
                    <li>• Sleeve cards carefully to prevent damage</li>
                    <li>• Verify authenticity and check for trimming/recoloring</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Company Comparison */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-green-400">
                ⚖️ Comparing PSA, BGS and CGC (2024-25)
              </h3>
              <div className="space-y-4">
                <p className="text-gray-300">
                  Choosing a grading service affects turnaround time, cost, slab durability and resale value:
                </p>
                
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-red-400">PSA (Professional Sports Authenticator)</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li><strong>Scale:</strong> 1-10, no half grades</li>
                      <li><strong>Slabs:</strong> Thinner, lighter, red labels</li>
                      <li><strong>Speed:</strong> Known for long waits</li>
                      <li><strong>Cost:</strong> Varies with declared value</li>
                      <li><strong>Resale:</strong> Highest premiums, especially PSA 10</li>
                      <li><strong>Best for:</strong> Maximum resale value</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-yellow-400">BGS (Beckett Grading Services)</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li><strong>Scale:</strong> 1-10 with sub-grades</li>
                      <li><strong>Slabs:</strong> Thick, robust, gold/silver/black labels</li>
                      <li><strong>Speed:</strong> Typically slower than PSA</li>
                      <li><strong>Cost:</strong> Generally more expensive</li>
                      <li><strong>Resale:</strong> Black Label 10s highly sought</li>
                      <li><strong>Best for:</strong> Detailed sub-grades</li>
                    </ul>
                  </div>

                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-blue-400">CGC (Certified Guaranty Company)</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li><strong>Scale:</strong> 1-10 with half grades</li>
                      <li><strong>Slabs:</strong> Mid-weight, blue labels</li>
                      <li><strong>Speed:</strong> Generally fastest option</li>
                      <li><strong>Cost:</strong> Most affordable overall</li>
                      <li><strong>Resale:</strong> Growing but lower than PSA/BGS</li>
                      <li><strong>Best for:</strong> Fast, affordable grading</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Raw Card Conditions */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-orange-400">
                📋 Raw Card Condition Categories
              </h3>
              <div className="space-y-4">
                <p className="text-gray-300">
                  Beyond professional grading, marketplaces often describe raw cards using standardized condition terms:
                </p>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-green-400">Near Mint (NM)</h4>
                    <p className="text-sm text-gray-300">
                      Cards have minimal wear and appear almost unplayed; may show slight edge wear or minor scratches but no major defects.
                    </p>
                  </div>

                  <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-yellow-400">Slightly Played (SP)</h4>
                    <p className="text-sm text-gray-300">
                      Cards show minor imperfections such as light border or corner wear, scuffs or small scratches but no structural damage.
                    </p>
                  </div>

                  <div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-orange-400">Moderately Played (MP)</h4>
                    <p className="text-sm text-gray-300">
                      Cards show noticeable wear including edge or corner wear, scratches, scuffing, creases or whitening affecting small areas.
                    </p>
                  </div>

                  <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-red-400">Played (PL)</h4>
                    <p className="text-sm text-gray-300">
                      Cards exhibit major wear and creasing and may have flaws impacting structural integrity, but remain playable in a sleeve.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Storage & Protection */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-cyan-400">
                🛡️ Storage, Handling and Protection
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Proper storage and handling are critical for maintaining condition and achieving high grades:
                </p>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="mb-2 font-semibold text-blue-400">Essential Protection</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Use soft polypropylene sleeves first</li>
                        <li>• Add rigid toploaders over sleeves</li>
                        <li>• Store in archival-quality binder pages</li>
                        <li>• Use acid-free storage boxes</li>
                      </ul>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="mb-2 font-semibold text-green-400">Climate Control</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Store in cool, dry environment</li>
                        <li>• Avoid temperature fluctuations</li>
                        <li>• Keep away from direct sunlight</li>
                        <li>• Use climate-controlled storage for high-value collections</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="mb-2 font-semibold text-yellow-400">Proper Handling</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Wash and dry hands before handling</li>
                        <li>• Hold cards by edges, not surface</li>
                        <li>• Support cards to avoid bending</li>
                        <li>• Keep food and drinks away</li>
                      </ul>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="mb-2 font-semibold text-purple-400">Regular Maintenance</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Inspect storage materials regularly</li>
                        <li>• Replace damaged sleeves/toploaders</li>
                        <li>• Use soft microfiber cloth for dust</li>
                        <li>• Avoid liquids or cleaning chemicals</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Summary */}
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                📈 Summary and Outlook
              </h3>
              <div className="space-y-3 text-gray-300">
                <p>
                  The Pokémon graded-card market is booming in 2025, with non-sports cards dominating grading submissions and modern promos seeing huge volumes.
                </p>
                <p>
                  Grading standards remain stringent: PSA emphasizes centering, corners, edges and surface, while BGS and CGC offer alternative scales with sub-grades and half-grades.
                </p>
                <p>
                  Choosing between PSA, BGS and CGC depends on your priorities—resale value, grading precision, or turnaround time. Regardless of service, careful handling and proper storage are essential to maintain card integrity.
                </p>
                <p className="font-semibold text-blue-300">
                  With demand surging and grading companies expanding capacity, collectors who understand these standards and practices will be well-positioned to maximize the value of their Pokémon card collections.
                </p>
              </div>
            </div>
          </div>
        );

      case 'market-trends':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Pokémon Card Market Trends – 2025 Snapshot
            </h2>

            {/* Graded Volume and Demographics */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                📊 Graded-Card Volume and Demographic Shifts
              </h3>
              <div className="space-y-4 text-gray-300">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-green-400">TCG Dominance in Graded Submissions</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>7.2 million</strong> TCG/non-sports cards graded in H1 2025</li>
                      <li>• <strong>59%</strong> of all graded cards (up 70% year-over-year)</li>
                      <li>• <strong>97 of top 100</strong> PSA submissions were Pokémon cards</li>
                      <li>• CGC graded <strong>2.18 million items</strong> (nearly matching 2024 total)</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-purple-400">Population Trends & Scarcity</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Sun & Moon Latias & Latios GX: <strong>4k graded copies</strong></li>
                      <li>• Modern "Moonbreon": <strong>23k+ graded copies</strong></li>
                      <li>• Modern promos flood grading queues</li>
                      <li>• Vintage alternate-arts remain scarce</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Key Takeaway:</strong> The collectible-card grading industry is now driven by Pokémon and TCGs. Modern promos dominate submissions, but vintage cards maintain premium pricing due to scarcity.
                  </p>
                </div>
              </div>
            </div>

            {/* Price Movers - Rising */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-green-400">
                📈 Price Movers: Cards Rising in Value
              </h3>
              <div className="space-y-4">
                <p className="text-gray-300">
                  TCGplayer's June 2025 price-trends report identifies cards with the biggest month-on-month increases:
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-green-400">Top 30-Day Gainers (Under $30)</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Hop's Snorlax (Cosmos Holo)</span>
                          <span className="text-green-400">+$23.13</span>
                        </div>
                        <p className="text-xs text-gray-400">Asian-exclusive promo, unique Cosmos foil drove demand spike</p>
                        
                        <div className="flex justify-between">
                          <span>Tool Scrapper (Secret)</span>
                          <span className="text-green-400">+$11.05</span>
                        </div>
                        <p className="text-xs text-gray-400">Competitive demand after Standard format announcement</p>
                        
                        <div className="flex justify-between">
                          <span>Togepi & Cleffa & Igglybuff GX</span>
                          <span className="text-green-400">+$10.88</span>
                        </div>
                        <p className="text-xs text-gray-400">Sun & Moon scarcity speculation</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>N's Reshiram (Stamped)</span>
                          <span className="text-green-400">+$9.77</span>
                        </div>
                        <p className="text-xs text-gray-400">Journey Together exclusive, buyout on June 12</p>
                        
                        <div className="flex justify-between">
                          <span>Skarmory EX (Full Art)</span>
                          <span className="text-green-400">+$9.57</span>
                        </div>
                        <p className="text-xs text-gray-400">2014 XY card, limited NM supply remaining</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-yellow-400">High-Value Gainers (Over $30)</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                      <div>
                        <div className="flex justify-between">
                          <span>Gengar & Mimikyu GX (Alt)</span>
                          <span className="text-green-400">+$70.37</span>
                        </div>
                        <p className="text-xs text-gray-400">Now ≈$829.66</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <span>Arceus & Dialga & Palkia GX</span>
                          <span className="text-green-400">+$56.68</span>
                        </div>
                        <p className="text-xs text-gray-400">Now ≈$351.09</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <span>Latias & Latios GX (Alt)</span>
                          <span className="text-green-400">+$44.00</span>
                        </div>
                        <p className="text-xs text-gray-400">Now ≈$1,782.85</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Gains driven by Sun & Moon scarcity and Legends Z-A Mega Pokémon announcement
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Declines */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-red-400">
                📉 Price Declines and Volatility
              </h3>
              <div className="space-y-4">
                <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                  <h4 className="mb-3 font-semibold text-red-400">Prismatic Evolutions: Eeveelution Hype Cools</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Umbreon EX (SIR)</span>
                        <span className="text-red-400">-16%</span>
                      </div>
                      <p className="text-xs text-gray-400">Peaked ~$1,600, now ~$1,245</p>
                      
                      <div className="flex justify-between">
                        <span>Vaporeon EX</span>
                        <span className="text-red-400">-27%</span>
                      </div>
                      <p className="text-xs text-gray-400">From $387 peak to ~$283</p>
                      
                      <div className="flex justify-between">
                        <span>Sylveon EX</span>
                        <span className="text-red-400">-13%</span>
                      </div>
                      <p className="text-xs text-gray-400">Now ~$488</p>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Leafeon EX</span>
                        <span className="text-red-400">-19%</span>
                      </div>
                      <p className="text-xs text-gray-400">From $468 peak to ~$380</p>
                      
                      <div className="flex justify-between">
                        <span>Other Eeveelutions</span>
                        <span className="text-red-400">-15-30%</span>
                      </div>
                      <p className="text-xs text-gray-400">Range: $169-$283</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-4">
                  <h4 className="mb-2 font-semibold text-orange-400">Other Trend Reversals</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Journey Together Set</span>
                        <span className="text-red-400">-68%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average price ~$631, limited collector enthusiasm</p>
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Destined Rivals Set</span>
                        <span className="text-red-400">-38%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average price ~$1,759</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strong Momentum */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-purple-400">
                🚀 Sets and Products with Strong Momentum
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-purple-400">New Japanese Expansions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>White Flare</span>
                        <span className="text-green-400">+1000%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average set price ~$2,001</p>
                      
                      <div className="flex justify-between">
                        <span>Black Bolt</span>
                        <span className="text-green-400">+1000%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average set price ~$2,258</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Tied to Pokémon Legends Z-A announcement
                    </p>
                  </div>

                  <div className="bg-amber-600/10 border border-amber-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-amber-400">Vintage Set Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Legendary Collection</span>
                        <span className="text-green-400">+855%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average card ~$36</p>
                      
                      <div className="flex justify-between">
                        <span>Aquapolis</span>
                        <span className="text-green-400">+305%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average card ~$40</p>
                      
                      <div className="flex justify-between">
                        <span>Neo Destiny</span>
                        <span className="text-green-400">+265%</span>
                      </div>
                      <p className="text-xs text-gray-400">Average card ~$103</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Factors */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-cyan-400">
                🎯 Factors Shaping the 2025 Market
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-blue-400">Supply Dynamics</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• Increased print runs during Sword & Shield era</li>
                      <li>• Sun & Moon sets now scarcer by comparison</li>
                      <li>• Modern promos flood grading queues</li>
                      <li>• Finite supply drives vintage premiums</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-green-400">Reprints & Rotation</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• Announced reprints influence competitive demand</li>
                      <li>• Mega Pokémon return in Legends Z-A</li>
                      <li>• Standard format changes drive price spikes</li>
                      <li>• Tool Scrapper reprint example</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-yellow-400">Hype Cycles</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• New sets experience "hype peaks"</li>
                      <li>• Price corrections follow restocks</li>
                      <li>• FOMO drives initial premiums</li>
                      <li>• Prismatic Evolutions decline example</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-purple-400">Grading Trends</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• Pokémon TCG: ~60% gem rate</li>
                      <li>• Sports cards: ~34% gem rate</li>
                      <li>• Population reports affect values</li>
                      <li>• High submission volumes for modern promos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Guidance */}
            <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-600/20 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-green-400">
                💡 Practical Guidance for Collectors and Investors
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="mb-1 font-semibold text-yellow-400">⚠️ Exercise Caution with New Releases</h4>
                    <p className="text-sm text-gray-300">
                      Prices spike on release due to scarcity and FOMO but often retrace once restocks arrive. Budget for potential short-term losses.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="mb-1 font-semibold text-blue-400">🔍 Look for Scarcity and Unique Provenance</h4>
                    <p className="text-sm text-gray-300">
                      Cards with limited distribution or older print-runs tend to hold or grow their value.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="mb-1 font-semibold text-purple-400">📢 Monitor Reprint Announcements</h4>
                    <p className="text-sm text-gray-300">
                      Competitive players drive demand when reprints return cards to legality. Stay informed about future sets.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="mb-1 font-semibold text-cyan-400">📊 Consider Grading Volume</h4>
                    <p className="text-sm text-gray-300">
                      High modern promo submissions mean many won't remain scarce. Check population reports for under-graded gems.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conclusion */}
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                📈 Market Outlook Conclusion
              </h3>
              <div className="space-y-3 text-gray-300">
                <p>
                  The Pokémon card market in 2025 is characterized by both exuberance and volatility. Graded-card statistics show that Pokémon dominates the collectible-card world, with modern promos flooding grading queues.
                </p>
                <p>
                  Price trends illustrate that scarcity, print-run differences, and timely reprints heavily influence which cards rise or fall in value. While new sets like White Flare and Black Bolt have generated extraordinary gains, others like Journey Together and Prismatic Evolutions demonstrate how quickly hype can cool.
                </p>
                <p className="font-semibold text-blue-300">
                  Collectors who understand these dynamics—and who remain skeptical of short-term hype—are best positioned to navigate the evolving market.
                </p>
              </div>
            </div>
          </div>
        );

      case 'authentication':
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">
              Authenticating Pokémon Cards – Current Techniques and Market Context
            </h2>

            {/* Why Authentication Matters */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-blue-400">
                🔍 Why Authentication Matters
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Pokémon's global trading card phenomenon has minted rare collectibles worth thousands of dollars. Over 43.2 billion cards had been sold worldwide by 2023. That success has spawned a counterfeit industry ranging from poorly printed knock-offs to sophisticated proxies using similar cardstock and foiling.
                </p>
                <p>
                  Collectors risk financial loss, market erosion and gameplay disruption when fakes circulate. Professional authentication therefore underpins both consumer confidence and the broader market: third-party graders encapsulated 7.5 million trading-card-game (TCG) cards in 2023—1.4 million more than the previous year—and eBay shipped 2.3 million authenticated singles through its Authenticity Guarantee service.
                </p>
                <p className="text-amber-300 font-semibold">
                  A $2.1 million fake "Black Lotus" bust in early 2024 further galvanised demand for trusted verification.
                </p>
              </div>
            </div>

            {/* Growing Market */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-green-400">
                📈 The Growing Authentication Services Market
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Market analysts expect the trading card game authentication services sector—covering grading, encapsulation and technology solutions—to grow from roughly US$2.24 billion in 2024 to US$6.61 billion by 2033, a compound annual growth rate (CAGR) of 13.13%.
                </p>
                <p>
                  This surge is driven by record grading submissions, high-value auction results and improved technology. Collectors and fractional-ownership platforms now insist on serialised slabs and public-API verification before trading high-value cards.
                </p>
                <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                  <h4 className="mb-2 font-semibold text-green-400">📊 Market Growth</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• 2024: $2.24 billion market size</li>
                    <li>• 2033: $6.61 billion projected</li>
                    <li>• 13.13% compound annual growth rate</li>
                    <li>• New entrants like Cardriffic (48,000 submissions in Q1 2024)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Technology Innovations */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-purple-400">
                🤖 Technology Innovations Reshaping Authentication
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Advances in machine vision are reducing grading turnaround times and increasing consistency. PSA's average turnaround fell from 25 days in early 2023 to nine days by March 2024 thanks to machine-learning image processing and ultraviolet fluorescence mapping.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-purple-400">🔬 Advanced Technology</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Beckett's VisionPRO: 450 cards/hour batch scanning</li>
                      <li>• SGC's LUCIA: 0.15mm centering precision</li>
                      <li>• CGC's 30TB ink-dispersion library</li>
                      <li>• Blockchain-anchored audit logs</li>
                    </ul>
                  </div>
                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-blue-400">🚀 AI-Powered Services</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• TCGrader: AI grading platform</li>
                      <li>• Instant results via image analysis</li>
                      <li>• Dual AI models for grading & counterfeits</li>
                      <li>• Automated corner, edge, surface inspection</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Detection Techniques */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-amber-400">
                🕵️ Practical Techniques for Detecting Counterfeit Pokémon Cards
              </h3>
              <div className="space-y-6 text-gray-300">
                <p className="text-amber-300 font-semibold">
                  Collectors can perform several checks before sending a card for professional authentication. These methods are not foolproof—counterfeiters continually improve—but they provide an important first line of defence.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-red-400">🎨 Examine Print Quality and Colour</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Check for crisp, clear text and artwork</li>
                      <li>• Look for vibrant and consistent colours</li>
                      <li>• Spot blurry images or washed-out colours</li>
                      <li>• Verify energy symbols fit neatly within circles</li>
                      <li>• Watch for misaligned or oversized symbols</li>
                    </ul>
                  </div>

                  <div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-orange-400">📏 Check Dimensions and Cardstock</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Standard size: 2.5 × 3.5 inches</li>
                      <li>• Look for "sandwich" construction</li>
                      <li>• Check for thin black inner layer</li>
                      <li>• Feel for proper thickness and texture</li>
                      <li>• Verify textured finish on holographic cards</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-yellow-400">💡 Perform the Light Test</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Hold card up to flashlight</li>
                      <li>• Authentic cards allow minimal light through</li>
                      <li>• Black layer blocks illumination</li>
                      <li>• Fakes often appear more transparent</li>
                      <li>• Quick way to spot many counterfeits</li>
                    </ul>
                  </div>

                  <div className="bg-cyan-600/10 border border-cyan-600/20 rounded-lg p-4">
                    <h4 className="mb-3 font-semibold text-cyan-400">🔍 Compare with Known Genuine Card</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Side-by-side comparison with authentic example</li>
                      <li>• Check font inconsistencies</li>
                      <li>• Verify holographic patterns</li>
                      <li>• Look for off-centre borders</li>
                      <li>• Use magnification for high-value cards</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                  <h4 className="mb-3 font-semibold text-green-400">📦 Inspect Packaging and Sealed Products</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Examine packaging quality and seals</li>
                    <li>• Look for crisp printing and correct logos</li>
                    <li>• Check for consistent shrink-wrap texture</li>
                    <li>• Verify intact security seals on booster boxes</li>
                    <li>• Watch for loose wrapping or misaligned logos</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Professional Services */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-indigo-400">
                🏆 Use Professional Graders and Reputable Sellers
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  The safest path for valuable cards is to use recognised grading services. PSA, BGS and CGC employ advanced forensic techniques and maintain expert connections with printing facilities. CGC, for example, leverages printing-quality experts to verify rare error cards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-indigo-400">🛡️ Professional Authentication</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• PSA, BGS, CGC advanced forensics</li>
                      <li>• Expert printing facility connections</li>
                      <li>• Specialised error card verification</li>
                      <li>• Encrypted photo archives</li>
                    </ul>
                  </div>
                  <div className="bg-violet-600/10 border border-violet-600/20 rounded-lg p-4">
                    <h4 className="mb-2 font-semibold text-violet-400">🛒 Safe Buying Practices</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Check seller ratings and reviews</li>
                      <li>• Use authorised dealers</li>
                      <li>• Be cautious of too-good-to-be-true prices</li>
                      <li>• eBay's Authenticity Guarantee service</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Broader Challenges */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="mb-4 text-xl font-bold text-red-400">
                ⚖️ Broader Challenges and Community Response
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Counterfeiters increasingly employ advanced printing techniques that can outpace casual visual inspections. Regulatory scrutiny is rising: in 2023 the U.S. Financial Crimes Enforcement Network added graded cards to its high-value collectibles watchlist, and European customs agencies have deployed machine-vision kiosks to flag suspicious slabs.
                </p>
                <p>
                  The Pokémon Company has taken legal action against graders who fail to prevent fake slabs, highlighting the serious legal risks of negligence. In response, graders maintain encrypted photo archives and tamper-evident sleeves.
                </p>
                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                  <h4 className="mb-2 font-semibold text-blue-400">🤝 Community Vigilance</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Educate yourself on current counterfeiting methods</li>
                    <li>• Buy only from reputable sources</li>
                    <li>• Seek community input when uncertain</li>
                    <li>• Report fakes to The Pokémon Company</li>
                    <li>• Share knowledge through forums</li>
                  </ul>
                </div>
                <p className="text-blue-300 font-semibold">
                  With improved technology, robust market infrastructure and an informed community, collectors can continue enjoying Pokémon cards while safeguarding their investments.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <h2 className="mb-6 text-3xl font-bold">Coming Soon</h2>
            <p className="text-gray-300">
              This section is under development. Check back soon for
              comprehensive guides!
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>
          Pokemon Card Collecting Guide Australia | PSA Grading & Investment
          Tips
        </title>
        <meta
          name="description"
          content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards. Expert advice for collectors."
        />
        <meta
          name="keywords"
          content="pokemon card collecting guide australia, PSA grading pokemon cards, pokemon card conditions guide, how to store pokemon cards, pokemon card market trends, fake pokemon cards identification, vintage pokemon cards collecting, first edition pokemon cards, shadowless pokemon cards, pokemon card investment tips, charizard card collecting, pokemon booster box collecting"
        />
        <meta
          property="og:title"
          content="Pokemon Card Collecting Guide Australia | PSA Grading & Investment Tips"
        />
        <meta
          property="og:description"
          content="Complete guide to collecting Pokemon cards in Australia. Learn PSA grading, card conditions, storage tips, market trends, and how to spot fake Pokemon cards."
        />
        <link
          rel="canonical"
          href="https://www.mycardtracker.com.au/collecting-guide"
        />

        {/* Structured Data for Collecting Guide */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to Collect Pokemon Cards: Complete Beginner Guide',
            description: 'Step-by-step guide to collecting Pokemon cards, including grading, storage, and identifying valuable cards.',
            image: 'https://www.mycardtracker.com.au/screenshots/Dashboard.png',
            estimatedCost: {
              '@type': 'MonetaryAmount',
              currency: 'AUD',
              value: '50'
            },
            totalTime: 'PT30M',
            step: [
              {
                '@type': 'HowToStep',
                name: 'Choose Your Collection Focus',
                text: 'Decide whether to collect vintage cards (1998-2003), modern cards, or specific Pokemon. Focus helps guide purchasing decisions.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep', 
                name: 'Learn Card Conditions and Grading',
                text: 'Understand the PSA grading scale (1-10) and how condition affects value. Learn to spot centering issues, surface scratches, and edge wear.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Set Up Proper Storage',
                text: 'Use penny sleeves, toploaders, and card savers to protect your cards. Store in a cool, dry place away from direct sunlight.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Research Market Values',
                text: 'Use PSA auction prices, sold eBay listings, and price tracking tools to understand current market values before buying.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              },
              {
                '@type': 'HowToStep',
                name: 'Start with Key Cards',
                text: 'Begin with iconic cards like Base Set Charizard, Blastoise, and Venusaur. These maintain value and are good entry points.',
                image: 'https://www.mycardtracker.com.au/screenshots/dashboard.png'
              }
            ]
          })}
        </script>
      </Helmet>
      <NavigationBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Expert Knowledge Base
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Collecting
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Guide
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Everything you need to know about collecting, grading, and
            protecting your valuable Pokémon cards.
          </p>
        </div>
      </section>

      {/* Navigation & Content */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h3 className="mb-4 text-lg font-bold">Guide Sections</h3>
                <nav className="space-y-2">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="mr-3">{section.icon}</span>
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 rounded-2xl p-8">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CollectingGuide;
