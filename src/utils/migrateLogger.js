/**
 * Logger Migration Script
 *
 * This script helps identify all files using the old logger
 * so they can be reviewed for potential cleanup.
 */

import LoggingService from '../services/LoggingService';
const fs = require('fs');
const path = require('path');

// Files to scan
const srcDir = path.join(__dirname, '..');

// Pattern to find logger imports and usage
const loggerImportPattern = /import\s+logger\s+from\s+['"].*logger['"]/g;
const loggerUsagePattern = /logger\.(debug|log|info|warn|error|critical)/g;

// Recursively find all JS/JSX files
function findJSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules')) {
      findJSFiles(fullPath, files);
    } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Analyze files for logger usage
function analyzeLoggerUsage() {
  const files = findJSFiles(srcDir);
  const results = {
    filesWithLogger: [],
    totalLoggerCalls: 0,
    loggerCallsByType: {
      debug: 0,
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    },
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    if (loggerImportPattern.test(content)) {
      const matches = content.match(loggerUsagePattern) || [];

      if (matches.length > 0) {
        results.filesWithLogger.push({
          file: path.relative(srcDir, file),
          calls: matches.length,
        });

        results.totalLoggerCalls += matches.length;

        // Count by type
        matches.forEach(match => {
          const type = match.split('.')[1];
          results.loggerCallsByType[type]++;
        });
      }
    }
  }

  return results;
}

// Run analysis
if (require.main === module) {
  // // LoggingService.info('Analyzing logger usage in the codebase...\n');

  const results = analyzeLoggerUsage();

  // // LoggingService.info(`Files using logger: ${results.filesWithLogger.length}`);
  // // LoggingService.info(`Total logger calls: ${results.totalLoggerCalls}\n`);

  // // LoggingService.info('Logger calls by type:');
  // Object.entries(results.loggerCallsByType).forEach(([type, count]) => {
  //   // LoggingService.info(`  ${type}: ${count}`);
  // });

  // // LoggingService.info('\nFiles with logger (sorted by usage):');
  // results.filesWithLogger
  //   .sort((a, b) => b.calls - a.calls)
  //   .forEach(({ file, calls }) => {
  //     // LoggingService.info(`  ${file}: ${calls} calls`);
  //   });
}

module.exports = { analyzeLoggerUsage };
