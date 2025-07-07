const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Tailwind CSS Diagnostic Script
 * Comprehensive analysis of Tailwind configuration and usage issues
 */

class TailwindDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.classUsage = new Map();
    this.invalidClasses = [];
    this.configIssues = [];
    this.dependencyIssues = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Check package.json for Tailwind dependencies
  checkDependencies() {
    this.log('Checking Tailwind dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for Tailwind CSS
      if (!deps.tailwindcss) {
        this.dependencyIssues.push('tailwindcss not found in dependencies');
      } else {
        this.log(`Found tailwindcss: ${deps.tailwindcss}`);
      }
      
      // Check for PostCSS
      if (!deps.postcss) {
        this.dependencyIssues.push('postcss not found in dependencies');
      }
      
      // Check for autoprefixer
      if (!deps.autoprefixer) {
        this.dependencyIssues.push('autoprefixer not found in dependencies');
      }
      
      // Check for conflicting CSS frameworks
      const conflictingFrameworks = ['bootstrap', 'bulma', 'foundation-sites'];
      conflictingFrameworks.forEach(framework => {
        if (deps[framework]) {
          this.dependencyIssues.push(`Conflicting CSS framework detected: ${framework}`);
        }
      });
      
    } catch (error) {
      this.dependencyIssues.push(`Error reading package.json: ${error.message}`);
    }
  }

  // Check Tailwind configuration
  checkTailwindConfig() {
    this.log('Checking Tailwind configuration...');
    
    try {
      const configPath = './tailwind.config.js';
      if (!fs.existsSync(configPath)) {
        this.configIssues.push('tailwind.config.js not found');
        return;
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Check for content paths
      if (!configContent.includes('content:')) {
        this.configIssues.push('Missing content configuration in tailwind.config.js');
      }
      
      // Check for proper file extensions
      const contentMatch = configContent.match(/content:\s*\[(.*?)\]/s);
      if (contentMatch) {
        const contentArray = contentMatch[1];
        if (!contentArray.includes('.js') && !contentArray.includes('.jsx')) {
          this.configIssues.push('Content path missing .js/.jsx extensions');
        }
        if (!contentArray.includes('.ts') && !contentArray.includes('.tsx')) {
          this.warnings.push('Content path missing .ts/.tsx extensions (may be intentional)');
        }
      }
      
      // Check for CSS custom properties usage
      if (configContent.includes('var(--')) {
        this.log('Found CSS custom properties in config');
      }
      
    } catch (error) {
      this.configIssues.push(`Error reading tailwind.config.js: ${error.message}`);
    }
  }

  // Check PostCSS configuration
  checkPostCSSConfig() {
    this.log('Checking PostCSS configuration...');
    
    const configFiles = ['postcss.config.js', '.postcssrc', '.postcssrc.js'];
    let configFound = false;
    
    configFiles.forEach(configFile => {
      if (fs.existsSync(configFile)) {
        configFound = true;
        try {
          const content = fs.readFileSync(configFile, 'utf8');
          if (!content.includes('tailwindcss')) {
            this.configIssues.push(`${configFile} missing tailwindcss plugin`);
          }
          if (!content.includes('autoprefixer')) {
            this.warnings.push(`${configFile} missing autoprefixer plugin`);
          }
        } catch (error) {
          this.configIssues.push(`Error reading ${configFile}: ${error.message}`);
        }
      }
    });
    
    if (!configFound) {
      this.configIssues.push('No PostCSS configuration file found');
    }
  }

  // Scan files for Tailwind class usage
  scanFiles() {
    this.log('Scanning files for Tailwind class usage...');
    
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git') && !file.includes('build')) {
          scanDir(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
          this.scanFileForClasses(filePath);
        }
      });
    };
    
    scanDir('./src');
  }

  scanFileForClasses(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find className attributes
      const classNameRegex = /className\s*=\s*["`']([^"`']*)["`']/g;
      const templateLiteralRegex = /className\s*=\s*`([^`]*)`/g;
      const conditionalRegex = /className\s*=\s*\{[^}]*\}/g;
      
      let match;
      
      // Regular className attributes
      while ((match = classNameRegex.exec(content)) !== null) {
        const classes = match[1].split(/\s+/).filter(cls => cls.length > 0);
        classes.forEach(cls => {
          this.recordClassUsage(cls, filePath);
        });
      }
      
      // Template literal classNames
      while ((match = templateLiteralRegex.exec(content)) !== null) {
        const classes = match[1].split(/\s+/).filter(cls => cls.length > 0);
        classes.forEach(cls => {
          this.recordClassUsage(cls, filePath);
        });
      }
      
      // Check for eslint-disable comments related to Tailwind
      if (content.includes('eslint-disable-next-line tailwindcss/')) {
        this.warnings.push(`${filePath}: ESLint Tailwind rule disabled`);
      }
      
    } catch (error) {
      this.issues.push(`Error scanning ${filePath}: ${error.message}`);
    }
  }

  recordClassUsage(className, filePath) {
    if (!this.classUsage.has(className)) {
      this.classUsage.set(className, []);
    }
    this.classUsage.get(className).push(filePath);
    
    // Check for potentially invalid classes
    if (this.isPotentiallyInvalidClass(className)) {
      this.invalidClasses.push({ className, filePath });
    }
  }

  isPotentiallyInvalidClass(className) {
    // Check for common invalid patterns
    const invalidPatterns = [
      /^tailwindcss\//, // ESLint rule names
      /^\$/, // Variable references
      /^[A-Z]/, // Component names
      /^[0-9]+$/, // Pure numbers
      /\${/, // Template literal variables
    ];
    
    return invalidPatterns.some(pattern => pattern.test(className));
  }

  // Check for CSS imports
  checkCSSImports() {
    this.log('Checking CSS imports...');
    
    const checkFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for Tailwind imports
        if (content.includes('@tailwind base')) {
          this.log(`Found @tailwind base in ${filePath}`);
        }
        if (content.includes('@tailwind components')) {
          this.log(`Found @tailwind components in ${filePath}`);
        }
        if (content.includes('@tailwind utilities')) {
          this.log(`Found @tailwind utilities in ${filePath}`);
        }
        
        // Check for CSS custom properties
        if (content.includes('--color-') || content.includes('--space-')) {
          this.log(`Found CSS custom properties in ${filePath}`);
        }
        
      } catch (error) {
        this.issues.push(`Error checking ${filePath}: ${error.message}`);
      }
    };
    
    // Check common CSS files
    const cssFiles = [
      './src/index.css',
      './src/App.css',
      './src/styles/main.css',
      './src/styles/globals.css',
      './src/styles/variables.css',
      './src/styles/tokens.css'
    ];
    
    cssFiles.forEach(file => {
      if (fs.existsSync(file)) {
        checkFile(file);
      }
    });
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalWarnings: this.warnings.length,
        totalClasses: this.classUsage.size,
        invalidClasses: this.invalidClasses.length,
        configIssues: this.configIssues.length,
        dependencyIssues: this.dependencyIssues.length
      },
      dependencies: this.dependencyIssues,
      configuration: this.configIssues,
      issues: this.issues,
      warnings: this.warnings,
      invalidClasses: this.invalidClasses,
      topClasses: Array.from(this.classUsage.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 20)
        .map(([className, files]) => ({
          className,
          usage: files.length,
          files: files.slice(0, 5) // Show first 5 files
        }))
    };
    
    return report;
  }

  // Run full diagnostic
  async runDiagnostic() {
    this.log('🔍 Starting Tailwind CSS Diagnostic Analysis...');
    this.log('=' .repeat(60));
    
    this.checkDependencies();
    this.checkTailwindConfig();
    this.checkPostCSSConfig();
    this.checkCSSImports();
    this.scanFiles();
    
    const report = this.generateReport();
    
    // Save report
    fs.writeFileSync('./tailwind-diagnostic-report.json', JSON.stringify(report, null, 2));
    
    // Display results
    this.displayResults(report);
    
    return report;
  }

  displayResults(report) {
    console.log('\n🚀 Tailwind CSS Diagnostic Report');
    console.log('=' .repeat(60));
    console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    
    console.log('\n📊 Summary:');
    console.log(`   Total Issues: ${report.summary.totalIssues}`);
    console.log(`   Total Warnings: ${report.summary.totalWarnings}`);
    console.log(`   Total Classes Found: ${report.summary.totalClasses}`);
    console.log(`   Invalid Classes: ${report.summary.invalidClasses}`);
    console.log(`   Config Issues: ${report.summary.configIssues}`);
    console.log(`   Dependency Issues: ${report.summary.dependencyIssues}`);
    
    if (report.dependencies.length > 0) {
      console.log('\n🔧 Dependency Issues:');
      report.dependencies.forEach(issue => {
        console.log(`   ❌ ${issue}`);
      });
    }
    
    if (report.configuration.length > 0) {
      console.log('\n⚙️  Configuration Issues:');
      report.configuration.forEach(issue => {
        console.log(`   ❌ ${issue}`);
      });
    }
    
    if (report.issues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      report.issues.forEach(issue => {
        console.log(`   ❌ ${issue}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }
    
    if (report.invalidClasses.length > 0) {
      console.log('\n🔍 Potentially Invalid Classes:');
      report.invalidClasses.slice(0, 10).forEach(({ className, filePath }) => {
        console.log(`   ❌ "${className}" in ${filePath}`);
      });
      if (report.invalidClasses.length > 10) {
        console.log(`   ... and ${report.invalidClasses.length - 10} more`);
      }
    }
    
    console.log('\n📈 Most Used Classes:');
    report.topClasses.slice(0, 10).forEach(({ className, usage }) => {
      console.log(`   • ${className} (${usage} times)`);
    });
    
    console.log('\n💡 Recommendations:');
    if (report.summary.dependencyIssues > 0) {
      console.log('   1. Fix dependency issues first');
    }
    if (report.summary.configIssues > 0) {
      console.log('   2. Resolve configuration problems');
    }
    if (report.summary.invalidClasses > 0) {
      console.log('   3. Review and fix invalid class names');
    }
    console.log('   4. Consider using Tailwind CSS IntelliSense extension');
    console.log('   5. Enable ESLint Tailwind CSS plugin for better validation');
    
    console.log('\n📋 Full report saved to: tailwind-diagnostic-report.json');
    console.log('=' .repeat(60));
  }
}

// Run diagnostic
const diagnostic = new TailwindDiagnostic();
diagnostic.runDiagnostic().catch(console.error); 