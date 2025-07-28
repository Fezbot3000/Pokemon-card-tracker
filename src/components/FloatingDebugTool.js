import React, { useState, useEffect } from 'react';
import { useCards } from '../contexts/CardContext';
import { CardRepository } from '../repositories/CardRepository';
import { useAuth } from '../design-system/contexts/AuthContext';
import { detectAndCleanupGhostCards } from '../utils/ghostCardDetector';

export function FloatingDebugTool({ selectedCollection = 'All Cards' }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [scanMode, setScanMode] = useState('current'); // 'current' or 'all'
  const [currentCardCount, setCurrentCardCount] = useState(0);
  const [allCardCount, setAllCardCount] = useState(0);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [diagnostics, setDiagnostics] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [scrollDebugInfo, setScrollDebugInfo] = useState(null);
  const [showScrollDebug, setShowScrollDebug] = useState(false);
  const [paginationDebugInfo, setPaginationDebugInfo] = useState(null);

  const { cards } = useCards();
  const { currentUser } = useAuth();

  // Get real-time card counts and scroll position using reliable prop-based collection detection
  useEffect(() => {
    const updateCardCounts = async () => {
      try {
        if (!currentUser) {
          setCurrentCardCount(0);
          setAllCardCount(0);
          setDebugInfo('Not logged in');
          return;
        }

        // Get repository and fetch all cards
        const repository = new CardRepository(currentUser.uid);
        const allCards = await repository.getAllCards();
        setAllCardCount(allCards.length);

        // Filter cards for current collection
        let currentViewCards = allCards;
        if (selectedCollection !== 'All Cards') {
          currentViewCards = allCards.filter(card => 
            card.collection === selectedCollection || 
            card.collectionName === selectedCollection ||
            card.collectionId === selectedCollection
          );
        }

        setCurrentCardCount(currentViewCards.length);
        setError(null);
        
        const debugMsg = `Collection: ${selectedCollection}, Current: ${currentViewCards.length}, Total: ${allCards.length}, Context: ${cards.length}`;
        setDebugInfo(debugMsg);
        
      } catch (error) {
        setError(error.message);
        setDebugInfo(`Error: ${error.message}`);
      }
    };

    updateCardCounts();
    
    // Check for updates every 2 seconds
    const interval = setInterval(updateCardCounts, 2000);
    
    return () => clearInterval(interval);
  }, [selectedCollection, cards, currentUser]);

  // Monitor scroll position and page state
  useEffect(() => {
    const updateScrollDebugInfo = () => {
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = Math.round((scrollY / (scrollHeight - clientHeight)) * 100);
      
      // Check if we're on a cards page
      const isOnCardsPage = window.location.pathname.includes('/cards') || 
                           window.location.pathname.includes('/dashboard');
      
      // Check for modal presence
      const hasModal = document.querySelector('[role="dialog"]') || 
                      document.querySelector('.modal') ||
                      document.querySelector('[data-modal]');
      
      setScrollDebugInfo({
        scrollY,
        scrollHeight,
        clientHeight,
        scrollPercentage,
        isOnCardsPage,
        hasModal,
        timestamp: new Date().toISOString()
      });
    };

    // Update immediately
    updateScrollDebugInfo();
    
    // Update on scroll events
    const handleScroll = () => {
      updateScrollDebugInfo();
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Update periodically to catch programmatic scroll changes
    const interval = setInterval(updateScrollDebugInfo, 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  // Monitor pagination state
  useEffect(() => {
    const updatePaginationDebugInfo = () => {
      // Try to find the actual CardList component's pagination state
      // Look for React components that might expose this information
      let estimatedVisibleCount = 0;
      let estimatedTotalCards = currentCardCount;
      let paginationLevel = 0;
      let hasLoadMore = false;
      
      // Method 1: Try to find the grid and count actual card elements
      const cardGrid = document.querySelector('.grid');
      if (cardGrid) {
        // Look for actual card elements with more specific selectors
        // The Card components have specific class patterns
        const cardSelectors = [
          '[class*="group relative"]', // Card component base classes
          '[class*="rounded-2xl"]', // Card component rounded corners
          '[class*="bg-white dark:bg-[#0F0F0F]"]', // Card background
          '[class*="cursor-pointer"]', // Card clickable elements
          '[class*="overflow-hidden"]', // Card container
          '[class*="transition-all"]', // Card transitions
          '[class*="border border-gray-200"]', // Card borders
          '[class*="dark:border-gray-700"]', // Dark mode card borders
        ];
        
        // Try each selector to find cards
        for (const selector of cardSelectors) {
          const elements = cardGrid.querySelectorAll(selector);
          if (elements.length > 0) {
            estimatedVisibleCount = elements.length;
            break;
          }
        }
        
        // If no cards found with specific selectors, try counting div elements that look like cards
        if (estimatedVisibleCount === 0) {
          const allDivs = cardGrid.querySelectorAll('div');
          // Filter for divs that have card-like characteristics
          const cardLikeDivs = Array.from(allDivs).filter(div => {
            const classes = div.className || '';
            return classes.includes('group') || 
                   classes.includes('relative') || 
                   classes.includes('rounded') ||
                   classes.includes('cursor-pointer') ||
                   classes.includes('overflow-hidden');
          });
          estimatedVisibleCount = cardLikeDivs.length;
        }
        
        // If we found cards, calculate pagination level based on typical pagination size
        if (estimatedVisibleCount > 0) {
          // CardList uses 24 as initial visibleCardCount, then adds more rows
          const initialCount = 24;
          const cardsPerRow = window.innerWidth < 640 ? 2 : 
                             window.innerWidth < 768 ? 3 : 
                             window.innerWidth < 1024 ? 5 : 
                             window.innerWidth < 1280 ? 6 : 7;
          
          // Calculate how many "load more" cycles have happened
          const additionalCards = Math.max(0, estimatedVisibleCount - initialCount);
          const additionalRows = Math.ceil(additionalCards / cardsPerRow);
          paginationLevel = 1 + additionalRows; // Start at level 1, add rows
        }
      }
      
      // Method 2: Look for load more indicator
      const loadMoreIndicator = document.querySelector('[class*="load-more"], [class*="Loading more"], [class*="loading"]');
      hasLoadMore = !!loadMoreIndicator;
      
      // Method 3: Check if we're near the bottom of the page (indicates more content available)
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 80 && estimatedVisibleCount < estimatedTotalCards) {
        hasLoadMore = true;
      }
      
      // Fallback: If we couldn't detect properly, use a reasonable estimate
      if (estimatedVisibleCount === 0 && estimatedTotalCards > 0) {
        // Estimate based on scroll position and total cards
        const scrollRatio = window.scrollY / document.documentElement.scrollHeight;
        estimatedVisibleCount = Math.min(
          Math.ceil(estimatedTotalCards * scrollRatio * 2), // Show more as user scrolls
          estimatedTotalCards
        );
        paginationLevel = Math.ceil(estimatedVisibleCount / 24);
      }
      
      setPaginationDebugInfo({
        visibleCards: estimatedVisibleCount,
        totalCards: estimatedTotalCards,
        paginationLevel,
        hasLoadMore,
        timestamp: new Date().toISOString()
      });
    };

    // Update immediately
    updatePaginationDebugInfo();
    
    // Update periodically
    const interval = setInterval(updatePaginationDebugInfo, 2000);
    
    return () => clearInterval(interval);
  }, [currentCardCount]);

  const runGhostCardDetection = async () => {
    setIsRunning(true);
    setDiagnostics(null);
    try {
      let detectionResults;
      let diagnosticInfo = {
        mode: scanMode,
        selectedCollection: selectedCollection,
        cardAnalysis: null,
        problematicCardSearch: null,
        detectionSummary: null
      };
      
      if (scanMode === 'all') {
        // Scan ALL cards from all collections
        const repository = new CardRepository(currentUser.uid);
        const allCards = await repository.getAllCards();
        
        diagnosticInfo.cardAnalysis = {
          totalCards: allCards.length,
          sampleCards: allCards.slice(0, 3).map(c => ({
            id: c.id,
            cardName: c.cardName || c.card,
            slabSerial: c.slabSerial,
            collection: c.collection || c.collectionName
          }))
        };
        
        // Look for card 53579205 specifically
        const problematicCard = allCards.find(card => 
          card.slabSerial === '53579205' || 
          card.slabSerial === 53579205 ||
          card.id === '53579205' ||
          card.id === 53579205
        );
        
        if (problematicCard) {
          const backendCard = await repository.getCard(problematicCard.id);
          diagnosticInfo.problematicCardSearch = {
            found: true,
            cardData: {
              id: problematicCard.id,
              slabSerial: problematicCard.slabSerial,
              cardName: problematicCard.cardName || problematicCard.card,
              collection: problematicCard.collection || problematicCard.collectionName
            },
            backendExists: !!backendCard,
            isGhost: !backendCard
          };
        } else {
          diagnosticInfo.problematicCardSearch = {
            found: false,
            searchedIn: 'All Cards',
            totalSearched: allCards.length
          };
        }
        
        detectionResults = await detectAndCleanupGhostCards(currentUser.uid, allCards);
        detectionResults.scanMode = 'All Collections';
        detectionResults.originalCount = allCards.length;
      } else {
        // Get cards for current collection only
        const repository = new CardRepository(currentUser.uid);
        const allCards = await repository.getAllCards();
        
        // Filter to current collection
        let currentViewCards = allCards;
        if (selectedCollection !== 'All Cards') {
          currentViewCards = allCards.filter(card => 
            card.collection === selectedCollection || 
            card.collectionName === selectedCollection ||
            card.collectionId === selectedCollection
          );
        }
        
        diagnosticInfo.cardAnalysis = {
          totalCards: currentViewCards.length,
          filteredFrom: allCards.length,
          sampleCards: currentViewCards.slice(0, 3).map(c => ({
            id: c.id,
            cardName: c.cardName || c.card,
            slabSerial: c.slabSerial,
            collection: c.collection || c.collectionName
          }))
        };
        
        // Look specifically for the problematic card 53579205
        const problematicCard = currentViewCards.find(card => 
          card.slabSerial === '53579205' || 
          card.slabSerial === 53579205 ||
          card.id === '53579205' ||
          card.id === 53579205
        );
        
        if (problematicCard) {
          const backendCard = await repository.getCard(problematicCard.id);
          diagnosticInfo.problematicCardSearch = {
            found: true,
            cardData: {
              id: problematicCard.id,
              slabSerial: problematicCard.slabSerial,
              cardName: problematicCard.cardName || problematicCard.card,
              collection: problematicCard.collection || problematicCard.collectionName
            },
            backendExists: !!backendCard,
            isGhost: !backendCard
          };
        } else {
          diagnosticInfo.problematicCardSearch = {
            found: false,
            searchedIn: selectedCollection,
            totalSearched: currentViewCards.length,
            availableCards: currentViewCards.slice(0, 5).map(c => ({
              id: c.id,
              slabSerial: c.slabSerial,
              cardName: c.cardName || c.card
            }))
          };
        }
        
        detectionResults = await detectAndCleanupGhostCards(currentUser.uid, currentViewCards);
        detectionResults.scanMode = `Collection: ${selectedCollection}`;
        detectionResults.originalCount = currentViewCards.length;
      }
      
      diagnosticInfo.detectionSummary = {
        ghostCardsFound: detectionResults.summary?.ghostCardsFound || 0,
        validCards: detectionResults.summary?.validCards || 0,
        errors: detectionResults.summary?.errors?.length || 0
      };
      
      setDiagnostics(diagnosticInfo);
      setResults(detectionResults);
    } catch (error) {
      setResults({ error: error.message });
      setDiagnostics({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  // Error fallback
  if (error) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          zIndex: 9999,
          background: '#dc2626',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '300px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🚨 Debug Tool Error</div>
        <div>{error}</div>
        <button
          onClick={() => setError(null)}
          style={{ 
            marginTop: '8px', 
            padding: '4px 8px', 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            borderRadius: '4px', 
            color: 'white', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        zIndex: 9999,
        background: '#1f2937',
        color: 'white',
        fontSize: '12px',
        borderRadius: '8px',
        padding: '12px',
        border: '2px solid #059669',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        minWidth: '300px',
        maxWidth: '450px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontWeight: '600' }}>🔍 Ghost Card Debug</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowScrollDebug(!showScrollDebug)}
            style={{ 
              background: 'none', 
              border: '1px solid #4b5563', 
              color: '#9ca3af', 
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            {showScrollDebug ? 'Hide' : 'Scroll'}
          </button>
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            style={{ 
              background: 'none', 
              border: '1px solid #4b5563', 
              color: '#9ca3af', 
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          >
            {showDiagnostics ? 'Hide' : 'Diagnostics'}
          </button>
          <button
            onClick={() => setResults(null)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Real-time Card Counts */}
      <div style={{ marginBottom: '8px', color: '#d1d5db', fontSize: '11px' }}>
        <div>🎯 Current: {selectedCollection} ({currentCardCount} cards)</div>
        <div>📊 Total Cards: {allCardCount} cards</div>
        <div style={{ color: '#9ca3af', fontSize: '10px' }}>Context: {cards.length} cards</div>
        <div style={{ color: '#6b7280', fontSize: '9px', marginTop: '4px' }}>{debugInfo}</div>
      </div>

      {/* Scan Mode Selection */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <button
            onClick={() => setScanMode('current')}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: scanMode === 'current' ? '#2563eb' : '#374151',
              color: 'white'
            }}
          >
            Current ({currentCardCount})
          </button>
          <button
            onClick={() => setScanMode('all')}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: scanMode === 'all' ? '#9333ea' : '#374151',
              color: 'white'
            }}
          >
            All ({allCardCount})
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          {scanMode === 'current' ? `Scan ${selectedCollection} only` : 'Scan ALL collections'}
        </div>
      </div>

      <button
        onClick={runGhostCardDetection}
        disabled={isRunning}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          border: 'none',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          background: scanMode === 'all' ? '#9333ea' : '#2563eb',
          color: 'white',
          opacity: isRunning ? 0.6 : 1,
          marginBottom: showDiagnostics && diagnostics ? '12px' : '0'
        }}
      >
        {isRunning ? '🔄 Scanning...' : `🚀 Find Ghost Cards (${scanMode.toUpperCase()})`}
      </button>

      {/* Scroll Debug Panel */}
      {showScrollDebug && scrollDebugInfo && (
        <div style={{ 
          background: '#111827', 
          border: '1px solid #374151', 
          borderRadius: '6px', 
          padding: '8px', 
          fontSize: '10px',
          marginBottom: '8px'
        }}>
          <div style={{ fontWeight: '600', color: '#60a5fa', marginBottom: '6px' }}>
            📍 Scroll & Pagination Debug
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#fbbf24' }}>📊 Scroll Metrics:</div>
            <div style={{ color: '#d1d5db', paddingLeft: '8px', fontSize: '9px' }}>
              Position: {scrollDebugInfo.scrollY}px<br/>
              Percentage: {scrollDebugInfo.scrollPercentage}%<br/>
              Page Height: {scrollDebugInfo.scrollHeight}px<br/>
              Viewport: {scrollDebugInfo.clientHeight}px
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#fbbf24' }}>🌐 Page State:</div>
            <div style={{ color: '#d1d5db', paddingLeft: '8px', fontSize: '9px' }}>
              On Cards Page: {scrollDebugInfo.isOnCardsPage ? '✅ Yes' : '❌ No'}<br/>
              Modal Open: {scrollDebugInfo.hasModal ? '✅ Yes' : '❌ No'}<br/>
              Path: {window.location.pathname}
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#fbbf24' }}>⏰ Last Update:</div>
            <div style={{ color: '#9ca3af', paddingLeft: '8px', fontSize: '9px' }}>
              {new Date(scrollDebugInfo.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {paginationDebugInfo && (
            <div>
              <div style={{ color: '#fbbf24' }}>📄 Pagination State:</div>
              <div style={{ color: '#d1d5db', paddingLeft: '8px', fontSize: '9px' }}>
                Visible: {paginationDebugInfo.visibleCards} cards<br/>
                Total: {paginationDebugInfo.totalCards} cards<br/>
                Level: {paginationDebugInfo.paginationLevel}<br/>
                Load More: {paginationDebugInfo.hasLoadMore ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diagnostics Panel */}
      {showDiagnostics && diagnostics && (
        <div style={{ 
          background: '#111827', 
          border: '1px solid #374151', 
          borderRadius: '6px', 
          padding: '8px', 
          fontSize: '10px',
          marginBottom: '8px'
        }}>
          <div style={{ fontWeight: '600', color: '#60a5fa', marginBottom: '6px' }}>
            🔬 Diagnostic Report
          </div>
          
          {diagnostics.cardAnalysis && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#fbbf24' }}>📊 Card Analysis:</div>
              <div style={{ color: '#d1d5db', paddingLeft: '8px' }}>
                Total: {diagnostics.cardAnalysis.totalCards} cards
                {diagnostics.cardAnalysis.filteredFrom && 
                  ` (filtered from ${diagnostics.cardAnalysis.filteredFrom})`
                }
              </div>
              {diagnostics.cardAnalysis.sampleCards.length > 0 && (
                <div style={{ color: '#9ca3af', paddingLeft: '8px', fontSize: '9px' }}>
                  Sample: {diagnostics.cardAnalysis.sampleCards.map(c => 
                    `${c.slabSerial || c.id}:${c.cardName}`
                  ).join(', ')}
                </div>
              )}
            </div>
          )}

          {diagnostics.problematicCardSearch && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#fbbf24' }}>🎯 Card 53579205 Search:</div>
              {diagnostics.problematicCardSearch.found ? (
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ color: '#34d399' }}>✅ Found in frontend data</div>
                  <div style={{ color: '#d1d5db', fontSize: '9px' }}>
                    ID: {diagnostics.problematicCardSearch.cardData.id}<br/>
                    Serial: {diagnostics.problematicCardSearch.cardData.slabSerial}<br/>
                    Name: {diagnostics.problematicCardSearch.cardData.cardName}<br/>
                    Collection: {diagnostics.problematicCardSearch.cardData.collection}
                  </div>
                  <div style={{ 
                    color: diagnostics.problematicCardSearch.isGhost ? '#ef4444' : '#34d399'
                  }}>
                    {diagnostics.problematicCardSearch.isGhost ? '👻 GHOST (not in backend)' : '✅ Exists in backend'}
                  </div>
                </div>
              ) : (
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ color: '#ef4444' }}>❌ NOT found in {diagnostics.problematicCardSearch.searchedIn}</div>
                  <div style={{ color: '#9ca3af', fontSize: '9px' }}>
                    Searched {diagnostics.problematicCardSearch.totalSearched} cards
                  </div>
                  {diagnostics.problematicCardSearch.availableCards && (
                    <div style={{ color: '#9ca3af', fontSize: '9px' }}>
                      Available: {diagnostics.problematicCardSearch.availableCards.map(c => 
                        `${c.slabSerial || c.id}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {diagnostics.detectionSummary && (
            <div>
              <div style={{ color: '#fbbf24' }}>📋 Detection Summary:</div>
              <div style={{ color: '#d1d5db', paddingLeft: '8px', fontSize: '9px' }}>
                Ghost Cards: {diagnostics.detectionSummary.ghostCardsFound}<br/>
                Valid Cards: {diagnostics.detectionSummary.validCards}<br/>
                Errors: {diagnostics.detectionSummary.errors}
              </div>
            </div>
          )}
        </div>
      )}

      {results && (
        <div style={{ fontSize: '11px' }}>
          {results.error ? (
            <div style={{ color: '#ef4444' }}>❌ Error: {results.error}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ color: '#60a5fa', fontWeight: '600' }}>
                📊 Scan: {results.scanMode || 'Unknown'}
              </div>
              <div style={{ color: '#34d399' }}>
                ✅ Scanned: {results.summary?.totalFrontendCards || results.originalCount || 0} cards
              </div>
              <div style={{ color: '#fbbf24' }}>
                👻 Found: {results.summary?.ghostCardsFound || 0} ghost cards
              </div>
              <div style={{ color: '#60a5fa' }}>
                🧹 Cleaned: {results.summary?.ghostCardsRemoved || 0} cards
              </div>
              <div style={{ color: '#9ca3af' }}>
                ✅ Valid: {results.summary?.validCards || 0} cards
              </div>
              {results.summary?.errors?.length > 0 && (
                <div style={{ color: '#ef4444' }}>
                  ⚠️ Errors: {results.summary.errors.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 