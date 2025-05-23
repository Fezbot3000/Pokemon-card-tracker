/**
 * Migration Script
 * 
 * This script helps migrate from the old db.js to the new Firestore service
 * by replacing imports throughout the codebase.
 */

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/utils/exportDataManager.js',
  'src/utils/dataResetManager.js',
  'src/utils/collectionManager.js',
  'src/services/cardRepo.js',
  'src/repositories/CardRepository.js',
  'src/services/cloudSync.js',
  'src/services/psaSearch.js',
  'src/services/subscriptionService.js',
  'src/data/pokemonSetsExpanded.js',
  'src/contexts/InvoiceContext.js',
  'src/contexts/CardContext.js',
  'src/data/pokemonSets.js',
  'src/design-system/components/CardDetailsForm.js',
  'src/AppContent.js',
  'src/App.optimized.js',
  'src/design-system/components/SettingsModal.js',
  'src/components/RestoreListener.js',
  'src/components/SoldItems/SoldItems.js',
  'src/components/PurchaseInvoices/PurchaseInvoices.js',
  'src/components/PurchaseInvoices/CreateInvoiceModal.js',
  'src/components/OptimizedCard.js',
  'src/components/NewCardForm.js',
  'src/components/MoveVerification.js',
  'src/components/Header.js',
  'src/components/Marketplace/Marketplace.js',
  'src/components/Marketplace/MarketplaceSelling.js',
  'src/components/CardList.js',
  'src/components/CardDetails.js',
  'src/App.js',
  'src/components/CardDetails.fixed.js'
];

function updateImports() {
  const projectRoot = path.resolve(__dirname, '../../..');
  
  filesToUpdate.forEach(filePath => {
    const fullPath = path.join(projectRoot, filePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${filePath}`);
        return;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace db imports with adapter imports
      const importRegex = /import\s+db\s+from\s+['"]([^'"]*\/)?db['"]/g;
      
      if (importRegex.test(content)) {
        // Calculate relative path from file to adapter
        const fileDir = path.dirname(fullPath);
        const adapterPath = path.join(projectRoot, 'src/services/firestore/dbAdapter.js');
        let relativePath = path.relative(fileDir, adapterPath).replace(/\\/g, '/');
        
        // Remove .js extension
        relativePath = relativePath.replace(/\.js$/, '');
        
        // Ensure it starts with ./ or ../
        if (!relativePath.startsWith('.')) {
          relativePath = './' + relativePath;
        }
        
        // Replace the import
        content = content.replace(importRegex, `import db from '${relativePath}'`);
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✓ Updated: ${filePath}`);
      } else {
        console.log(`No db import found in: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error updating ${filePath}:`, error.message);
    }
  });
}

// Run the migration
console.log('Starting migration...');
updateImports();
console.log('Migration complete!');
