const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Baseline Metrics Analysis Script
 * Documents current project state before modernization
 */

function analyzeFileStructure() {
  const cssFiles = [];
  const jsFiles = [];
  
  function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
        walkDir(filePath, fileList);
      } else if (stat.isFile()) {
        if (file.endsWith('.css')) {
          cssFiles.push({
            path: filePath,
            size: stat.size,
            lines: fs.readFileSync(filePath, 'utf8').split('\n').length
          });
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          jsFiles.push({
            path: filePath,
            size: stat.size,
            lines: fs.readFileSync(filePath, 'utf8').split('\n').length
          });
        }
      }
    });
  }
  
  walkDir('./src');
  
  return { cssFiles, jsFiles };
}

function analyzeBuildSize() {
  const buildDir = './build';
  if (!fs.existsSync(buildDir)) {
    console.log('⚠️  Build directory not found. Run npm run build first.');
    return null;
  }
  
  const staticDir = path.join(buildDir, 'static');
  const cssDir = path.join(staticDir, 'css');
  const jsDir = path.join(staticDir, 'js');
  
  let totalCSSSize = 0;
  let totalJSSize = 0;
  let cssFileCount = 0;
  let jsFileCount = 0;
  
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    cssFiles.forEach(file => {
      if (file.endsWith('.css')) {
        cssFileCount++;
        totalCSSSize += fs.statSync(path.join(cssDir, file)).size;
      }
    });
  }
  
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    jsFiles.forEach(file => {
      if (file.endsWith('.js')) {
        jsFileCount++;
        totalJSSize += fs.statSync(path.join(jsDir, file)).size;
      }
    });
  }
  
  return {
    totalCSSSize,
    totalJSSize,
    cssFileCount,
    jsFileCount
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateReport() {
  const { cssFiles, jsFiles } = analyzeFileStructure();
  const buildMetrics = analyzeBuildSize();
  
  const report = {
    timestamp: new Date().toISOString(),
    source: {
      cssFiles: cssFiles.length,
      jsFiles: jsFiles.length,
      totalCSSLines: cssFiles.reduce((sum, file) => sum + file.lines, 0),
      totalJSLines: jsFiles.reduce((sum, file) => sum + file.lines, 0),
      cssFileDetails: cssFiles.map(file => ({
        name: path.basename(file.path),
        path: file.path,
        size: formatBytes(file.size),
        lines: file.lines
      })),
      largestCSSFiles: cssFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .map(file => ({
          name: path.basename(file.path),
          size: formatBytes(file.size),
          lines: file.lines
        }))
    },
    build: buildMetrics ? {
      totalCSSSize: formatBytes(buildMetrics.totalCSSSize),
      totalJSSize: formatBytes(buildMetrics.totalJSSize),
      cssFileCount: buildMetrics.cssFileCount,
      jsFileCount: buildMetrics.jsFileCount,
      totalSize: formatBytes(buildMetrics.totalCSSSize + buildMetrics.totalJSSize)
    } : null
  };
  
  return report;
}

function saveReport(report) {
  const reportPath = './baseline-metrics.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Baseline metrics saved to ${reportPath}`);
}

function displayReport(report) {
  console.log('\n🚀 PWA Styling Modernization - Baseline Metrics');
  console.log('=' .repeat(60));
  console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
  console.log('\n📁 Source Files:');
  console.log(`   CSS Files: ${report.source.cssFiles}`);
  console.log(`   JS Files: ${report.source.jsFiles}`);
  console.log(`   Total CSS Lines: ${report.source.totalCSSLines.toLocaleString()}`);
  console.log(`   Total JS Lines: ${report.source.totalJSLines.toLocaleString()}`);
  
  console.log('\n📦 CSS Files Found:');
  report.source.cssFileDetails.forEach(file => {
    console.log(`   • ${file.name} (${file.size}, ${file.lines} lines)`);
  });
  
  console.log('\n🔍 Largest CSS Files:');
  report.source.largestCSSFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (${file.size}, ${file.lines} lines)`);
  });
  
  if (report.build) {
    console.log('\n🏗️  Build Output:');
    console.log(`   CSS Bundle Size: ${report.build.totalCSSSize}`);
    console.log(`   JS Bundle Size: ${report.build.totalJSSize}`);
    console.log(`   Total Bundle Size: ${report.build.totalSize}`);
    console.log(`   CSS Files Generated: ${report.build.cssFileCount}`);
    console.log(`   JS Files Generated: ${report.build.jsFileCount}`);
  } else {
    console.log('\n⚠️  Build metrics not available. Run npm run build first.');
  }
  
  console.log('\n🎯 Phase 1 Setup Complete!');
  console.log('Next steps:');
  console.log('   1. Run npm run lint to check code quality');
  console.log('   2. Run npm run format to format code');
  console.log('   3. Run npm run type-check to verify TypeScript');
  console.log('   4. Begin Phase 2: CSS Architecture Consolidation');
  console.log('=' .repeat(60));
}

// Run the analysis
console.log('🔍 Analyzing current project state...');
const report = generateReport();
saveReport(report);
displayReport(report); 