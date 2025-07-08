#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to the JSON file that will store ESLint results
const eslintResultsPath = path.join(__dirname, 'public', 'eslint-results.json');

// Ensure the public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function updateESLintResults() {
  console.log('🔍 Running ESLint to count warnings and errors...');

  exec('npm run lint 2>&1', (error, stdout, stderr) => {
    let warnings = 0;
    let errors = 0;
    let success = true;

    try {
      // Parse the output for warning and error counts
      const output = stdout + stderr;
      
      // Look for the summary line like "8 errors, 905 warnings"
      const summaryMatch = output.match(/(\d+)\s+errors?,\s+(\d+)\s+warnings?/);
      if (summaryMatch) {
        errors = parseInt(summaryMatch[1]);
        warnings = parseInt(summaryMatch[2]);
      } else {
        // Try to count individual warnings and errors from the output
        const lines = output.split('\n');
        let warningCount = 0;
        let errorCount = 0;
        
        for (const line of lines) {
          if (line.includes('warning')) warningCount++;
          if (line.includes('error') && !line.includes('0 errors')) errorCount++;
        }
        
        warnings = warningCount;
        errors = errorCount;
      }

      console.log(`📊 Found: ${errors} errors, ${warnings} warnings`);

      // Create the results object
      const results = {
        warnings: warnings,
        errors: errors,
        totalProblems: warnings + errors,
        lastUpdated: new Date().toISOString(),
        success: success,
        rawOutput: output.substring(0, 1000) // First 1000 chars for debugging
      };

      // Write the results to the JSON file
      fs.writeFileSync(eslintResultsPath, JSON.stringify(results, null, 2));

      console.log('✅ Updated eslint-results.json with new counts');
      console.log(`   📈 Progress: ${warnings <= 100 ? '🎉 Goal reached!' : `${warnings - 100} warnings over target (100)`}`);
      
      // Show progress bar
      const progress = Math.min(100, Math.max(0, 100 - (warnings / 10)));
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      console.log(`   📊 Progress: [${progressBar}] ${progress.toFixed(1)}%`);
      
    } catch (parseError) {
      console.error('❌ Error parsing ESLint output:', parseError);
      
      // Create error results
      const errorResults = {
        warnings: 0,
        errors: 0,
        totalProblems: 0,
        lastUpdated: new Date().toISOString(),
        success: false,
        error: parseError.message,
        rawOutput: (stdout + stderr).substring(0, 1000)
      };
      
      fs.writeFileSync(eslintResultsPath, JSON.stringify(errorResults, null, 2));
    }
  });
}

// If called directly, run once
if (require.main === module) {
  updateESLintResults();
}

// Export for use in other scripts
module.exports = {
  updateESLintResults,
  eslintResultsPath
}; 