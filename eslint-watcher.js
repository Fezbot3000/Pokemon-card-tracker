#!/usr/bin/env node

const { updateESLintResults } = require('./update-eslint-count.js');
const fs = require('fs');
const path = require('path');

// Configuration
const UPDATE_INTERVAL = 30000; // 30 seconds
const eslintResultsPath = path.join(__dirname, 'public', 'eslint-results.json');

let isRunning = false;
let updateCount = 0;
let lastUpdateTime = null;

function logStatus(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

function runUpdate() {
  if (isRunning) {
    logStatus('⏳ ESLint update already in progress, skipping...');
    return;
  }

  isRunning = true;
  updateCount++;
  
  logStatus(`🔄 Starting ESLint update #${updateCount}...`);
  
  try {
    updateESLintResults();
    lastUpdateTime = new Date();
    logStatus(`✅ ESLint update #${updateCount} completed successfully`);
  } catch (error) {
    logStatus(`❌ ESLint update #${updateCount} failed: ${error.message}`);
    
    // Create error results file if update fails
    const errorResults = {
      warnings: 0,
      errors: 0,
      totalProblems: 0,
      lastUpdated: new Date().toISOString(),
      success: false,
      error: error.message,
      updateCount: updateCount
    };
    
    try {
      fs.writeFileSync(eslintResultsPath, JSON.stringify(errorResults, null, 2));
    } catch (writeError) {
      logStatus(`❌ Failed to write error results: ${writeError.message}`);
    }
  } finally {
    isRunning = false;
  }
}

function startWatcher() {
  logStatus('🚀 Starting ESLint watcher...');
  logStatus(`📊 Update interval: ${UPDATE_INTERVAL / 1000} seconds`);
  
  // Run initial update
  runUpdate();
  
  // Set up interval for continuous updates
  const intervalId = setInterval(() => {
    runUpdate();
  }, UPDATE_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logStatus('🛑 Received SIGINT, shutting down gracefully...');
    clearInterval(intervalId);
    
    if (lastUpdateTime) {
      logStatus(`📈 Final stats: ${updateCount} updates completed, last update: ${lastUpdateTime.toLocaleTimeString()}`);
    }
    
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logStatus('🛑 Received SIGTERM, shutting down gracefully...');
    clearInterval(intervalId);
    process.exit(0);
  });
  
  logStatus('✅ ESLint watcher started. Press Ctrl+C to stop.');
  logStatus('📁 Results will be saved to: public/eslint-results.json');
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ESLint Watcher - Continuous ESLint monitoring

Usage:
  node eslint-watcher.js [options]

Options:
  --help, -h     Show this help message
  --once         Run ESLint once and exit
  --status       Show current status

Examples:
  node eslint-watcher.js           # Start continuous monitoring
  node eslint-watcher.js --once    # Run once and exit
  node eslint-watcher.js --status  # Show current results
`);
    process.exit(0);
  }
  
  if (args.includes('--once')) {
    logStatus('🔄 Running ESLint once...');
    runUpdate();
    process.exit(0);
  }
  
  if (args.includes('--status')) {
    try {
      if (fs.existsSync(eslintResultsPath)) {
        const results = JSON.parse(fs.readFileSync(eslintResultsPath, 'utf8'));
        console.log('📊 Current ESLint Status:');
        console.log(`   Errors: ${results.errors}`);
        console.log(`   Warnings: ${results.warnings}`);
        console.log(`   Total: ${results.totalProblems}`);
        console.log(`   Last Updated: ${new Date(results.lastUpdated).toLocaleString()}`);
        console.log(`   Success: ${results.success ? '✅' : '❌'}`);
      } else {
        console.log('❌ No ESLint results file found. Run the watcher first.');
      }
    } catch (error) {
      console.error('❌ Error reading ESLint results:', error.message);
    }
    process.exit(0);
  }
  
  // Default: start continuous monitoring
  startWatcher();
}

module.exports = {
  startWatcher,
  runUpdate,
  UPDATE_INTERVAL
}; 