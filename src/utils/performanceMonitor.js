/**
 * Performance monitoring utilities
 * Helps identify performance bottlenecks in production
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.enabled = process.env.NODE_ENV === 'development';
  }

  // Measure component render time
  measureRender(componentName, callback) {
    if (!this.enabled) {
      return callback();
    }

    const start = performance.now();
    const result = callback();
    const end = performance.now();

    const duration = end - start;
    this.recordMetric(`${componentName}_render`, duration);

    if (duration > 16) {
      // More than one frame (60fps)
      console.warn(
        `Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }

  // Measure async operations
  async measureAsync(operationName, asyncCallback) {
    if (!this.enabled) {
      return asyncCallback();
    }

    const start = performance.now();
    try {
      const result = await asyncCallback();
      const end = performance.now();

      const duration = end - start;
      this.recordMetric(`${operationName}_async`, duration);

      if (duration > 1000) {
        // More than 1 second
        console.warn(
          `Slow async operation ${operationName}: ${duration.toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const end = performance.now();
      this.recordMetric(`${operationName}_async_error`, end - start);
      throw error;
    }
  }

  // Record a metric
  recordMetric(name, value) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
      };
    }

    const metric = this.metrics[name];
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // Keep last 100 values for percentile calculations
    metric.values.push(value);
    if (metric.values.length > 100) {
      metric.values.shift();
    }
  }

  // Get performance report
  getReport() {
    const report = {};

    for (const [name, metric] of Object.entries(this.metrics)) {
      const avg = metric.total / metric.count;
      const sorted = [...metric.values].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

      report[name] = {
        count: metric.count,
        average: avg.toFixed(2),
        min: metric.min.toFixed(2),
        max: metric.max.toFixed(2),
        p95: p95.toFixed(2),
      };
    }

    return report;
  }

  // Log performance report
  logReport() {
    if (!this.enabled) return;

    console.group('Performance Report');
    const report = this.getReport();

    for (const [name, stats] of Object.entries(report)) {
      // // console.log(`${name}:`, stats);
    }

    console.groupEnd();
  }

  // Reset metrics
  reset() {
    this.metrics = {};
  }

  // Check if we should show performance warnings
  checkMemoryUsage() {
    if (!this.enabled || !performance.memory) return;

    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;

    const usagePercent = (used / limit) * 100;

    if (usagePercent > 90) {
      console.error(`Critical memory usage: ${usagePercent.toFixed(1)}%`);
    } else if (usagePercent > 70) {
      console.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Check memory usage periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.checkMemoryUsage();
  }, 30000); // Every 30 seconds
}

export default performanceMonitor;
