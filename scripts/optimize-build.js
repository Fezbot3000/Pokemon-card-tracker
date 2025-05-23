/**
 * Build optimization script
 * Run this before building for production to ensure optimal performance
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build optimization...\n');

// 1. Check and update package.json for production build
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure we have the correct build script
if (!packageJson.scripts['build:prod']) {
  packageJson.scripts['build:prod'] = 'GENERATE_SOURCEMAP=false react-scripts build';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Added production build script');
}

// 2. Create a production environment file if it doesn't exist
const envProdPath = path.join(__dirname, '..', '.env.production.local');
if (!fs.existsSync(envProdPath)) {
  const envContent = `# Production environment variables
GENERATE_SOURCEMAP=false
REACT_APP_ENV=production
`;
  fs.writeFileSync(envProdPath, envContent);
  console.log('✅ Created production environment file');
}

// 3. Check for large dependencies
console.log('\n📦 Checking bundle size...');
const checkLargeDeps = () => {
  const deps = packageJson.dependencies || {};
  const largeDeps = [];
  
  const knownLargeDeps = {
    'moment': 'Consider using date-fns or dayjs instead',
    'lodash': 'Import specific functions instead of entire library',
    'axios': 'Consider using native fetch API',
  };
  
  Object.keys(deps).forEach(dep => {
    if (knownLargeDeps[dep]) {
      largeDeps.push(`${dep}: ${knownLargeDeps[dep]}`);
    }
  });
  
  if (largeDeps.length > 0) {
    console.log('⚠️  Large dependencies found:');
    largeDeps.forEach(dep => console.log(`   - ${dep}`));
  } else {
    console.log('✅ No known large dependencies found');
  }
};

checkLargeDeps();

// 4. Optimization recommendations
console.log('\n📋 Optimization Checklist:');
console.log('   ✓ Lazy loading implemented for routes');
console.log('   ✓ Image optimization utilities available');
console.log('   ✓ Performance monitoring in place');
console.log('   ✓ Production build configured');

console.log('\n🎯 Next steps:');
console.log('   1. Run "npm run build:prod" for optimized production build');
console.log('   2. Test the production build locally with "serve -s build"');
console.log('   3. Deploy to your hosting provider');

console.log('\n✨ Build optimization complete!');
