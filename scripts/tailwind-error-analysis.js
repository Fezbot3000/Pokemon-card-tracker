const fs = require('fs');
const path = require('path');

/**
 * Tailwind CSS Error Analysis Script
 * Focused analysis of the specific classnames-order errors
 */

class TailwindErrorAnalyzer {
  constructor() {
    this.findings = [];
    this.solutions = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Analyze the specific files with eslint-disable comments
  analyzeProblematicFiles() {
    const problematicFiles = [
      'src/components/AddCardModal.js',
      'src/design-system/components/CardDetailsModal.js',
      'src/components/HelpCenter.js'
    ];

    problematicFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.analyzeFile(filePath);
      }
    });
  }

  analyzeFile(filePath) {
    this.log(`Analyzing ${filePath}...`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Look for eslint-disable comments
        if (line.includes('eslint-disable-next-line tailwindcss/classnames-order')) {
          const nextLine = lines[index + 1];
          if (nextLine && nextLine.includes('className=')) {
            this.analyzeClassNameLine(filePath, index + 2, nextLine);
          }
        }
      });
    } catch (error) {
      this.log(`Error reading ${filePath}: ${error.message}`, 'error');
    }
  }

  analyzeClassNameLine(filePath, lineNumber, line) {
    // Extract className content
    const classNameMatch = line.match(/className\s*=\s*"([^"]+)"/);
    if (classNameMatch) {
      const classes = classNameMatch[1];
      this.log(`Found problematic className at ${filePath}:${lineNumber}`);
      this.log(`Classes: ${classes}`);
      
      // Analyze the class order issue
      const classArray = classes.split(/\s+/).filter(c => c.length > 0);
      const orderIssue = this.findOrderIssue(classArray);
      
      if (orderIssue) {
        this.findings.push({
          file: filePath,
          line: lineNumber,
          classes: classes,
          issue: orderIssue,
          suggestion: this.suggestFix(classArray)
        });
      }
    }
  }

  findOrderIssue(classArray) {
    // Common Tailwind class order issues
    const orderCategories = {
      layout: ['block', 'inline', 'flex', 'grid', 'hidden', 'fixed', 'absolute', 'relative', 'static', 'sticky'],
      positioning: ['inset-', 'top-', 'right-', 'bottom-', 'left-', 'z-'],
      sizing: ['w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-', 'size-'],
      spacing: ['m-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-', 'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-'],
      typography: ['font-', 'text-', 'leading-', 'tracking-', 'align-'],
      background: ['bg-'],
      border: ['border', 'border-', 'rounded'],
      effects: ['shadow', 'opacity-', 'cursor-'],
      transforms: ['transform', 'scale-', 'rotate-', 'translate-'],
      interactivity: ['hover:', 'focus:', 'active:', 'disabled:'],
      responsive: ['sm:', 'md:', 'lg:', 'xl:', '2xl:'],
      darkMode: ['dark:']
    };

    // Check for common order violations
    let previousCategory = null;
    let categoryOrder = ['layout', 'positioning', 'sizing', 'spacing', 'typography', 'background', 'border', 'effects', 'transforms', 'interactivity', 'responsive', 'darkMode'];
    
    for (let className of classArray) {
      let currentCategory = this.getClassCategory(className, orderCategories);
      
      if (currentCategory && previousCategory) {
        const prevIndex = categoryOrder.indexOf(previousCategory);
        const currIndex = categoryOrder.indexOf(currentCategory);
        
        if (prevIndex > currIndex) {
          return `Class order violation: ${className} (${currentCategory}) should come before previous ${previousCategory} classes`;
        }
      }
      
      if (currentCategory) {
        previousCategory = currentCategory;
      }
    }

    return null;
  }

  getClassCategory(className, orderCategories) {
    for (let [category, prefixes] of Object.entries(orderCategories)) {
      if (prefixes.some(prefix => className.startsWith(prefix) || className === prefix)) {
        return category;
      }
    }
    return null;
  }

  suggestFix(classArray) {
    // Use a more sophisticated ordering based on Tailwind's recommended order
    const orderedClasses = [...classArray].sort((a, b) => {
      const orderCategories = {
        layout: 0,
        positioning: 1,
        sizing: 2,
        spacing: 3,
        typography: 4,
        background: 5,
        border: 6,
        effects: 7,
        transforms: 8,
        interactivity: 9,
        responsive: 10,
        darkMode: 11
      };

      const categoryA = this.getClassCategory(a, {
        layout: ['block', 'inline', 'flex', 'grid', 'hidden', 'fixed', 'absolute', 'relative', 'static', 'sticky'],
        positioning: ['inset-', 'top-', 'right-', 'bottom-', 'left-', 'z-'],
        sizing: ['w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-', 'size-'],
        spacing: ['m-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-', 'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-'],
        typography: ['font-', 'text-', 'leading-', 'tracking-', 'align-'],
        background: ['bg-'],
        border: ['border', 'border-', 'rounded'],
        effects: ['shadow', 'opacity-', 'cursor-'],
        transforms: ['transform', 'scale-', 'rotate-', 'translate-'],
        interactivity: ['hover:', 'focus:', 'active:', 'disabled:'],
        responsive: ['sm:', 'md:', 'lg:', 'xl:', '2xl:'],
        darkMode: ['dark:']
      }) || 'other';

      const categoryB = this.getClassCategory(b, {
        layout: ['block', 'inline', 'flex', 'grid', 'hidden', 'fixed', 'absolute', 'relative', 'static', 'sticky'],
        positioning: ['inset-', 'top-', 'right-', 'bottom-', 'left-', 'z-'],
        sizing: ['w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-', 'size-'],
        spacing: ['m-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-', 'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-'],
        typography: ['font-', 'text-', 'leading-', 'tracking-', 'align-'],
        background: ['bg-'],
        border: ['border', 'border-', 'rounded'],
        effects: ['shadow', 'opacity-', 'cursor-'],
        transforms: ['transform', 'scale-', 'rotate-', 'translate-'],
        interactivity: ['hover:', 'focus:', 'active:', 'disabled:'],
        responsive: ['sm:', 'md:', 'lg:', 'xl:', '2xl:'],
        darkMode: ['dark:']
      }) || 'other';

      const orderA = orderCategories[categoryA] || 99;
      const orderB = orderCategories[categoryB] || 99;

      return orderA - orderB;
    });

    return orderedClasses.join(' ');
  }

  // Check Tailwind configuration issues
  checkTailwindConfig() {
    this.log('Checking Tailwind configuration issues...');
    
    try {
      const configContent = fs.readFileSync('./tailwind.config.js', 'utf8');
      
      // Check content paths
      const contentMatch = configContent.match(/content:\s*\[(.*?)\]/s);
      if (contentMatch) {
        const contentArray = contentMatch[1];
        
        // Check if content paths are properly configured
        if (!contentArray.includes('./src/**/*.{js,jsx,ts,tsx}')) {
          this.findings.push({
            type: 'config',
            issue: 'Content paths may not be properly configured',
            current: contentArray,
            suggestion: "content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html']"
          });
        }
      }
      
      // Check for CSS custom properties that might cause issues
      if (configContent.includes('var(--')) {
        this.log('Found CSS custom properties in Tailwind config');
        // This might be causing issues with class validation
        this.findings.push({
          type: 'config',
          issue: 'CSS custom properties in Tailwind config may cause class validation issues',
          suggestion: 'Consider using standard Tailwind color values or ensure custom properties are properly defined'
        });
      }
      
    } catch (error) {
      this.log(`Error reading Tailwind config: ${error.message}`, 'error');
    }
  }

  // Check ESLint configuration
  checkESLintConfig() {
    this.log('Checking ESLint configuration...');
    
    try {
      const eslintContent = fs.readFileSync('./.eslintrc.js', 'utf8');
      
      // Check if tailwindcss/classnames-order is set to error
      if (eslintContent.includes("'tailwindcss/classnames-order': 'error'")) {
        this.findings.push({
          type: 'eslint',
          issue: 'tailwindcss/classnames-order is set to error, causing compilation failures',
          suggestion: 'Consider changing to "warn" or configure prettier-plugin-tailwindcss for automatic sorting'
        });
      }
      
      // Check for prettier-plugin-tailwindcss
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      if (!packageJson.devDependencies['prettier-plugin-tailwindcss']) {
        this.findings.push({
          type: 'missing-plugin',
          issue: 'prettier-plugin-tailwindcss not found in devDependencies',
          suggestion: 'Install prettier-plugin-tailwindcss to automatically sort Tailwind classes'
        });
      }
      
    } catch (error) {
      this.log(`Error reading ESLint config: ${error.message}`, 'error');
    }
  }

  // Generate solutions
  generateSolutions() {
    this.log('Generating solutions...');
    
    // Solution 1: Fix the immediate class order issues
    this.solutions.push({
      title: 'Fix Class Order Issues',
      description: 'Reorder Tailwind classes according to recommended order',
      priority: 'high',
      implementation: 'Apply the suggested class orders to the problematic files'
    });

    // Solution 2: Configure automatic sorting
    this.solutions.push({
      title: 'Configure Automatic Class Sorting',
      description: 'Set up prettier-plugin-tailwindcss for automatic class sorting',
      priority: 'high',
      implementation: 'Install and configure prettier-plugin-tailwindcss'
    });

    // Solution 3: Adjust ESLint rules
    this.solutions.push({
      title: 'Adjust ESLint Rules',
      description: 'Change tailwindcss/classnames-order from error to warn',
      priority: 'medium',
      implementation: 'Update .eslintrc.js to use warn instead of error'
    });

    // Solution 4: Fix Tailwind config
    this.solutions.push({
      title: 'Fix Tailwind Configuration',
      description: 'Ensure content paths are properly configured',
      priority: 'medium',
      implementation: 'Update tailwind.config.js content paths'
    });
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFindings: this.findings.length,
        totalSolutions: this.solutions.length,
        severity: this.findings.some(f => f.type === 'config') ? 'high' : 'medium'
      },
      findings: this.findings,
      solutions: this.solutions,
      rootCause: this.identifyRootCause()
    };

    return report;
  }

  identifyRootCause() {
    const causes = [];
    
    // Check for configuration issues
    if (this.findings.some(f => f.type === 'config')) {
      causes.push('Tailwind configuration issues');
    }
    
    // Check for ESLint strictness
    if (this.findings.some(f => f.type === 'eslint')) {
      causes.push('ESLint rule set to error instead of warn');
    }
    
    // Check for missing tooling
    if (this.findings.some(f => f.type === 'missing-plugin')) {
      causes.push('Missing automatic class sorting tooling');
    }
    
    // Check for class order issues
    if (this.findings.some(f => f.issue && f.issue.includes('order violation'))) {
      causes.push('Manual class ordering violations');
    }

    return causes.length > 0 ? causes : ['Unknown cause - requires manual investigation'];
  }

  async runAnalysis() {
    this.log('🔍 Starting Tailwind CSS Error Analysis...');
    this.log('=' .repeat(60));
    
    this.analyzeProblematicFiles();
    this.checkTailwindConfig();
    this.checkESLintConfig();
    this.generateSolutions();
    
    const report = this.generateReport();
    
    // Save report
    fs.writeFileSync('./tailwind-error-analysis.json', JSON.stringify(report, null, 2));
    
    // Display results
    this.displayResults(report);
    
    return report;
  }

  displayResults(report) {
    console.log('\n🚀 Tailwind CSS Error Analysis Report');
    console.log('=' .repeat(60));
    console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`🎯 Severity: ${report.summary.severity.toUpperCase()}`);
    
    console.log('\n🔍 Root Cause Analysis:');
    report.rootCause.forEach(cause => {
      console.log(`   • ${cause}`);
    });
    
    console.log('\n📊 Findings:');
    report.findings.forEach((finding, index) => {
      console.log(`   ${index + 1}. ${finding.issue || finding.type}`);
      if (finding.file) {
        console.log(`      File: ${finding.file}:${finding.line}`);
      }
      if (finding.suggestion) {
        console.log(`      Fix: ${finding.suggestion}`);
      }
    });
    
    console.log('\n💡 Recommended Solutions (Priority Order):');
    report.solutions
      .sort((a, b) => (a.priority === 'high' ? -1 : 1))
      .forEach((solution, index) => {
        console.log(`   ${index + 1}. ${solution.title} (${solution.priority.toUpperCase()})`);
        console.log(`      ${solution.description}`);
        console.log(`      Implementation: ${solution.implementation}`);
      });
    
    console.log('\n🔧 Quick Fix Commands:');
    console.log('   1. npm install --save-dev prettier-plugin-tailwindcss');
    console.log('   2. Update .eslintrc.js: change "error" to "warn"');
    console.log('   3. Run: npm run format');
    console.log('   4. Remove eslint-disable comments from problematic files');
    
    console.log('\n📋 Full report saved to: tailwind-error-analysis.json');
    console.log('=' .repeat(60));
  }
}

// Run analysis
const analyzer = new TailwindErrorAnalyzer();
analyzer.runAnalysis().catch(console.error); 