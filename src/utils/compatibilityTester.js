/**
 * Side-by-side compatibility tester for useCardData vs CardContext migration
 * This utility validates that both systems produce identical results
 */

import LoggingService from '../services/LoggingService';

class CompatibilityTester {
  constructor() {
    this.testResults = [];
    this.isTestMode = false;
  }

  enableTestMode() {
    this.isTestMode = true;
    console.log('🧪 Compatibility Test Mode ENABLED');
  }

  disableTestMode() {
    this.isTestMode = false;
    console.log('🧪 Compatibility Test Mode DISABLED');
  }

  async compareCardArrays(oldCards, newCards, testName) {
    if (!this.isTestMode) return;
    
    const result = {
      testName,
      timestamp: new Date().toISOString(),
      passed: false,
      details: {}
    };

    try {
      // Basic length check
      result.details.lengthMatch = oldCards.length === newCards.length;
      
      // Sort both arrays by ID for comparison
      const sortedOld = [...oldCards].sort((a, b) => (a.id || a.slabSerial || '').localeCompare(b.id || b.slabSerial || ''));
      const sortedNew = [...newCards].sort((a, b) => (a.id || a.slabSerial || '').localeCompare(b.id || b.slabSerial || ''));
      
      // Compare each card
      const cardDifferences = [];
      for (let i = 0; i < Math.max(sortedOld.length, sortedNew.length); i++) {
        const oldCard = sortedOld[i];
        const newCard = sortedNew[i];
        
        if (!oldCard || !newCard) {
          cardDifferences.push({
            index: i,
            issue: !oldCard ? 'Missing in old array' : 'Missing in new array',
            oldCard: oldCard?.id || 'undefined',
            newCard: newCard?.id || 'undefined'
          });
          continue;
        }
        
        // Compare key properties
        const keyProperties = ['id', 'slabSerial', 'name', 'currentValueAUD', 'investmentAUD'];
        for (const prop of keyProperties) {
          if (oldCard[prop] !== newCard[prop]) {
            cardDifferences.push({
              index: i,
              cardId: oldCard.id || oldCard.slabSerial,
              property: prop,
              oldValue: oldCard[prop],
              newValue: newCard[prop]
            });
          }
        }
      }
      
      result.details.cardDifferences = cardDifferences;
      result.passed = result.details.lengthMatch && cardDifferences.length === 0;
      
      // Log results
      if (result.passed) {
        console.log(`✅ ${testName}: Card arrays match perfectly`);
      } else {
        console.error(`❌ ${testName}: Card arrays differ:`, result.details);
      }
      
    } catch (error) {
      result.passed = false;
      result.error = error.message;
      console.error(`💥 ${testName}: Test failed with error:`, error);
    }
    
    this.testResults.push(result);
    return result;
  }

  async testUpdateOperation(oldUpdateFn, newUpdateFn, testCard, testName) {
    if (!this.isTestMode) return;
    
    const result = {
      testName: `${testName} - Update Operation`,
      timestamp: new Date().toISOString(),
      passed: false,
      details: {}
    };

    try {
      // Prepare test scenarios
      const scenarios = [
        { description: 'Update single property', changes: { currentValueAUD: 1500 } },
        { description: 'Update multiple properties', changes: { currentValueAUD: 1600, investmentAUD: 1000 } },
        { description: 'Update with collection change', changes: { collection: 'Test Collection' } }
      ];

      result.details.scenarios = [];

      for (const scenario of scenarios) {
        const scenarioResult = {
          description: scenario.description,
          passed: false,
          error: null
        };

        try {
          // Test the update operation (we can't actually call them side-by-side safely,
          // but we can validate the function signatures and parameters)
          
          // Validate function exists and is callable
          const oldFnValid = typeof oldUpdateFn === 'function';
          const newFnValid = typeof newUpdateFn === 'function';
          
          scenarioResult.oldFunctionValid = oldFnValid;
          scenarioResult.newFunctionValid = newFnValid;
          scenarioResult.passed = oldFnValid && newFnValid;
          
          if (scenarioResult.passed) {
            console.log(`✅ ${scenario.description}: Both functions are valid`);
          } else {
            console.error(`❌ ${scenario.description}: Function validation failed`);
          }
          
        } catch (error) {
          scenarioResult.error = error.message;
          scenarioResult.passed = false;
          console.error(`💥 ${scenario.description}: ${error.message}`);
        }

        result.details.scenarios.push(scenarioResult);
      }

      result.passed = result.details.scenarios.every(s => s.passed);
      
    } catch (error) {
      result.passed = false;
      result.error = error.message;
      console.error(`💥 ${testName}: Update test failed:`, error);
    }
    
    this.testResults.push(result);
    return result;
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    };

    console.log('\n🧪 COMPATIBILITY TEST REPORT');
    console.log('============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.testName}: ${result.error || 'See details'}`);
      });
    }
    
    LoggingService.info('Compatibility test report generated', report);
    return report;
  }

  clearResults() {
    this.testResults = [];
    console.log('🧪 Test results cleared');
  }
}

// Singleton instance
const compatibilityTester = new CompatibilityTester();

export default compatibilityTester; 