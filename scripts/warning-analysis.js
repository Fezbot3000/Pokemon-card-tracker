const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * ESLint Warning Analysis Script
 * Comprehensive analysis and categorization of all ESLint warnings
 */

class WarningAnalyzer {
  constructor() {
    this.warnings = [];
    this.categories = {
      'no-console': [],
      'no-unused-vars': [],
      'tailwindcss/no-custom-classname': [],
      'react-hooks/exhaustive-deps': [],
      'import/no-anonymous-default-export': [],
      'no-undef': [],
      'default-case': [],
      'no-dupe-class-members': [],
      'react/no-array-index-key': [],
      'no-useless-escape': [],
      'no-loop-func': [],
      'other': []
    };
    this.stats = {
      totalWarnings: 0,
      totalErrors: 0,
      fileCount: 0,
      categories: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Parse lint output to extract warnings
  parseLintOutput(output) {
    const lines = output.split('\n');
    let currentFile = '';
    
    for (const line of lines) {
      // Check for file path
      if (line.includes('.js') || line.includes('.jsx') || line.includes('.ts') || line.includes('.tsx')) {
        const fileMatch = line.match(/^(.+\.(js|jsx|ts|tsx))$/);
        if (fileMatch) {
          currentFile = fileMatch[1];
          continue;
        }
      }
      
      // Check for warning/error line
      const warningMatch = line.match(/^\s*(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+([a-zA-Z\-\/]+)$/);
      if (warningMatch && currentFile) {
        const [, lineNum, colNum, severity, message, rule] = warningMatch;
        
        const warning = {
          file: currentFile,
          line: parseInt(lineNum),
          column: parseInt(colNum),
          severity,
          message: message.trim(),
          rule: rule.trim()
        };
        
        this.warnings.push(warning);
        this.categorizeWarning(warning);
      }
    }
  }

  // Categorize warnings by rule type
  categorizeWarning(warning) {
    const rule = warning.rule;
    
    if (this.categories[rule]) {
      this.categories[rule].push(warning);
    } else {
      this.categories.other.push(warning);
    }
  }

  // Generate statistics
  generateStats() {
    this.stats.totalWarnings = this.warnings.filter(w => w.severity === 'warning').length;
    this.stats.totalErrors = this.warnings.filter(w => w.severity === 'error').length;
    this.stats.fileCount = [...new Set(this.warnings.map(w => w.file))].length;
    
    // Category statistics
    for (const [category, warnings] of Object.entries(this.categories)) {
      if (warnings.length > 0) {
        this.stats.categories[category] = warnings.length;
      }
    }
  }

  // Generate fix recommendations
  generateFixRecommendations() {
    const recommendations = [];
    
    // Console statements
    if (this.categories['no-console'].length > 0) {
      recommendations.push({
        category: 'no-console',
        count: this.categories['no-console'].length,
        priority: 'medium',
        description: 'Remove or replace console statements with proper logging',
        approach: 'Replace console.log with logger utility or remove debug statements',
        effort: 'low'
      });
    }

    // Unused variables
    if (this.categories['no-unused-vars'].length > 0) {
      recommendations.push({
        category: 'no-unused-vars',
        count: this.categories['no-unused-vars'].length,
        priority: 'high',
        description: 'Remove unused variables and imports',
        approach: 'Delete unused variables or prefix with underscore if needed',
        effort: 'low'
      });
    }

    // Tailwind custom classes
    if (this.categories['tailwindcss/no-custom-classname'].length > 0) {
      recommendations.push({
        category: 'tailwindcss/no-custom-classname',
        count: this.categories['tailwindcss/no-custom-classname'].length,
        priority: 'high',
        description: 'Fix custom Tailwind classes not in configuration',
        approach: 'Add custom classes to Tailwind config or replace with valid classes',
        effort: 'medium'
      });
    }

    // React hooks dependencies
    if (this.categories['react-hooks/exhaustive-deps'].length > 0) {
      recommendations.push({
        category: 'react-hooks/exhaustive-deps',
        count: this.categories['react-hooks/exhaustive-deps'].length,
        priority: 'high',
        description: 'Fix React hook dependency arrays',
        approach: 'Add missing dependencies or wrap in useCallback/useMemo',
        effort: 'medium'
      });
    }

    // Anonymous default exports
    if (this.categories['import/no-anonymous-default-export'].length > 0) {
      recommendations.push({
        category: 'import/no-anonymous-default-export',
        count: this.categories['import/no-anonymous-default-export'].length,
        priority: 'medium',
        description: 'Replace anonymous default exports with named exports',
        approach: 'Assign to variable before exporting',
        effort: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Generate detailed report
  generateReport() {
    const recommendations = this.generateFixRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.stats,
      recommendations,
      topFiles: this.getTopProblematicFiles(),
      categoryBreakdown: this.getCategoryBreakdown(),
      fixPlan: this.generateFixPlan()
    };
    
    return report;
  }

  // Get files with most warnings
  getTopProblematicFiles() {
    const fileWarnings = {};
    
    this.warnings.forEach(warning => {
      if (!fileWarnings[warning.file]) {
        fileWarnings[warning.file] = 0;
      }
      fileWarnings[warning.file]++;
    });
    
    return Object.entries(fileWarnings)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));
  }

  // Get category breakdown
  getCategoryBreakdown() {
    const breakdown = {};
    
    for (const [category, warnings] of Object.entries(this.categories)) {
      if (warnings.length > 0) {
        breakdown[category] = {
          count: warnings.length,
          files: [...new Set(warnings.map(w => w.file))].length,
          examples: warnings.slice(0, 3).map(w => ({
            file: w.file,
            line: w.line,
            message: w.message
          }))
        };
      }
    }
    
    return breakdown;
  }

  // Generate implementation plan
  generateFixPlan() {
    const plan = [
      {
        phase: 1,
        title: 'Quick Wins - Unused Variables & Imports',
        description: 'Remove unused variables and imports',
        categories: ['no-unused-vars'],
        estimatedTime: '30 minutes',
        risk: 'low'
      },
      {
        phase: 2,
        title: 'Console Statement Cleanup',
        description: 'Replace console statements with proper logging',
        categories: ['no-console'],
        estimatedTime: '45 minutes',
        risk: 'low'
      },
      {
        phase: 3,
        title: 'Tailwind Class Fixes',
        description: 'Fix custom Tailwind classes',
        categories: ['tailwindcss/no-custom-classname'],
        estimatedTime: '60 minutes',
        risk: 'medium'
      },
      {
        phase: 4,
        title: 'React Hook Dependencies',
        description: 'Fix React hook dependency arrays',
        categories: ['react-hooks/exhaustive-deps'],
        estimatedTime: '90 minutes',
        risk: 'high'
      },
      {
        phase: 5,
        title: 'Code Quality Improvements',
        description: 'Fix remaining warnings (exports, array keys, etc.)',
        categories: ['import/no-anonymous-default-export', 'react/no-array-index-key', 'default-case'],
        estimatedTime: '60 minutes',
        risk: 'medium'
      }
    ];
    
    return plan;
  }

  // Display report
  displayReport(report) {
    console.log('\n🔍 ESLint Warning Analysis Report');
    console.log('=' .repeat(60));
    console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`📊 Total Issues: ${report.summary.totalWarnings} warnings, ${report.summary.totalErrors} errors`);
    console.log(`📁 Files Affected: ${report.summary.fileCount}`);
    
    console.log('\n📋 Warning Categories:');
    Object.entries(report.summary.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   • ${category}: ${count} issues`);
      });
    
    console.log('\n🎯 Top Problematic Files:');
    report.topFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.file} (${file.count} warnings)`);
    });
    
    console.log('\n🚀 Implementation Plan:');
    report.fixPlan.forEach(phase => {
      console.log(`   Phase ${phase.phase}: ${phase.title}`);
      console.log(`      Time: ${phase.estimatedTime} | Risk: ${phase.risk}`);
      console.log(`      Categories: ${phase.categories.join(', ')}`);
    });
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec.category} (${rec.count} issues) - Priority: ${rec.priority}`);
      console.log(`     ${rec.description}`);
      console.log(`     Approach: ${rec.approach}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review and approve the implementation plan');
    console.log('   2. Execute fixes phase by phase');
    console.log('   3. Test after each phase to ensure no regressions');
    console.log('   4. Verify final lint output is clean');
    console.log('=' .repeat(60));
  }

  // Save report to file
  saveReport(report) {
    const reportPath = './warning-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to ${reportPath}`);
  }
}

// Run the analysis
console.log('🔍 Starting comprehensive ESLint warning analysis...');

try {
  // Get lint output
  const lintOutput = execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
  
  const analyzer = new WarningAnalyzer();
  analyzer.parseLintOutput(lintOutput);
  analyzer.generateStats();
  
  const report = analyzer.generateReport();
  analyzer.saveReport(report);
  analyzer.displayReport(report);
  
} catch (error) {
  // ESLint exits with non-zero code when warnings exist
  const analyzer = new WarningAnalyzer();
  analyzer.parseLintOutput(error.stdout || error.message);
  analyzer.generateStats();
  
  const report = analyzer.generateReport();
  analyzer.saveReport(report);
  analyzer.displayReport(report);
} 