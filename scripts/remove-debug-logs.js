/**
 * Script to remove debug logs from production builds
 * This helps reduce bundle size and improve performance
 */

const fs = require('fs');
const path = require('path');

// Patterns to remove
const debugPatterns = [
  /console\.(log|debug|info|warn)\([^)]*\);?/g,
  /logger\.(log|debug|info|warn)\([^)]*\);?/g,
];

// Directories to process
const srcDir = path.join(__dirname, '..', 'src');
const buildDir = path.join(__dirname, '..', 'build');

// Function to remove debug statements from a file
function removeDebugFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    debugPatterns.forEach(pattern => {
      const newContent = content.replace(pattern, '');
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Cleaned: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively process directory
function processDirectory(dir) {
  let filesProcessed = 0;
  let filesModified = 0;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      const result = processDirectory(filePath);
      filesProcessed += result.processed;
      filesModified += result.modified;
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      filesProcessed++;
      if (removeDebugFromFile(filePath)) {
        filesModified++;
      }
    }
  });
  
  return { processed: filesProcessed, modified: filesModified };
}

// Main execution
console.log('🧹 Removing debug logs...\n');

// Check if we should process src or build directory
const targetDir = process.argv[2] === '--build' ? buildDir : srcDir;

if (!fs.existsSync(targetDir)) {
  console.error(`❌ Directory not found: ${targetDir}`);
  process.exit(1);
}

console.log(`Processing: ${targetDir}\n`);

const result = processDirectory(targetDir);

console.log(`\n✨ Complete!`);
console.log(`   Files processed: ${result.processed}`);
console.log(`   Files modified: ${result.modified}`);

if (process.argv[2] !== '--build') {
  console.log('\n⚠️  Warning: You modified source files!');
  console.log('   Make sure to test thoroughly before committing.');
}
