import { config } from './config';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface APIPerformanceData {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  success: boolean;
  timestamp: string;
  cacheHit?: boolean;
  dataSize?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformanceData[] = [];
  private maxMetricsHistory = 1000;
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, performance.now());
  }

  // End timing and record metric
  endTimer(operationId: string, source: string, metadata?: Record<string, any>): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      console.warn(`Timer not found for operation: ${operationId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operationId);

    this.recordMetric({
      name: operationId,
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      source,
      metadata
    });

    return duration;
  }

  // Record a performance metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log slow operations in development
    if (config.isDevelopment && metric.unit === 'ms' && metric.value > 1000) {
      console.warn(`🐌 Slow operation detected: ${metric.name} took ${metric.value}ms`);
    }

    // Alert for critical performance issues in production
    if (config.isProduction && metric.unit === 'ms' && metric.value > 5000) {
      console.error(`🚨 Critical performance issue: ${metric.name} took ${metric.value}ms`);
    }
  }

  // Record API call performance
  recordAPICall(data: APIPerformanceData): void {
    this.apiMetrics.push(data);
    
    // Keep only recent API metrics
    if (this.apiMetrics.length > this.maxMetricsHistory) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsHistory);
    }

    // Log API performance issues
    if (data.duration > 3000) {
      console.warn(`🐌 Slow API call: ${data.endpoint} took ${data.duration}ms`);
    }

    if (!data.success) {
      console.error(`❌ Failed API call: ${data.endpoint} - Status: ${data.statusCode}`);
    }
  }

  // Create a wrapper for API calls with automatic performance tracking
  wrapAPICall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = performance.now();
    const operationId = `api_${endpoint}_${Date.now()}`;

    return apiCall()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.recordAPICall({
          endpoint,
          method,
          duration,
          statusCode: 200,
          success: true,
          timestamp: new Date().toISOString(),
          dataSize: JSON.stringify(result).length
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.recordAPICall({
          endpoint,
          method,
          duration,
          statusCode: error.statusCode || 500,
          success: false,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalMetrics: number;
    totalAPIMetrics: number;
    averageResponseTime: number;
    slowestOperations: PerformanceMetric[];
    apiSuccessRate: number;
    cacheHitRate: number;
  } {
    const last100Metrics = this.metrics.slice(-100);
    const last100APICalls = this.apiMetrics.slice(-100);

    const averageResponseTime = last100APICalls.length > 0
      ? last100APICalls.reduce((sum, metric) => sum + metric.duration, 0) / last100APICalls.length
      : 0;

    const successfulAPICalls = last100APICalls.filter(call => call.success).length;
    const apiSuccessRate = last100APICalls.length > 0
      ? (successfulAPICalls / last100APICalls.length) * 100
      : 100;

    const cacheHits = last100APICalls.filter(call => call.cacheHit).length;
    const cacheHitRate = last100APICalls.length > 0
      ? (cacheHits / last100APICalls.length) * 100
      : 0;

    const slowestOperations = last100Metrics
      .filter(metric => metric.unit === 'ms')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalMetrics: this.metrics.length,
      totalAPIMetrics: this.apiMetrics.length,
      averageResponseTime,
      slowestOperations,
      apiSuccessRate,
      cacheHitRate
    };
  }

  // Core Web Vitals monitoring (client-side only)
  measureCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: new Date().toISOString(),
          source: 'WEB_VITALS'
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP measurement not supported');
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            source: 'WEB_VITALS'
          });
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID measurement not supported');
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          unit: 'score',
          timestamp: new Date().toISOString(),
          source: 'WEB_VITALS'
        });
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS measurement not supported');
      }
    }
  }

  // Memory usage monitoring
  measureMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      
      this.recordMetric({
        name: 'memory_used',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        source: 'MEMORY',
        metadata: {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  // Start continuous monitoring
  startMonitoring(): void {
    if (!config.monitoring.enablePerformanceMonitoring) {
      return;
    }

    // Measure Core Web Vitals (client-side only)
    this.measureCoreWebVitals();

    // Set up periodic memory monitoring
    setInterval(() => {
      this.measureMemoryUsage();
    }, 30000); // Every 30 seconds

    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Every 5 minutes

    console.log('🔍 Performance monitoring started');
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > oneHourAgo
    );
    
    this.apiMetrics = this.apiMetrics.filter(metric => 
      new Date(metric.timestamp).getTime() > oneHourAgo
    );
  }

  // Export metrics for external monitoring services
  exportMetrics() {
    return {
      performance: this.metrics,
      api: this.apiMetrics,
      stats: this.getPerformanceStats()
    };
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.startTimes.clear();
  }
}

// Create and export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring if enabled
if (typeof window !== 'undefined') {
  // Client-side initialization
  document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.startMonitoring();
  });
} else {
  // Server-side initialization
  performanceMonitor.startMonitoring();
}

export default performanceMonitor; 