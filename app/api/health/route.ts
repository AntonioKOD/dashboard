import { NextRequest, NextResponse } from 'next/server';
import { config, validateConfig } from '../../lib/config';
import { performanceMonitor } from '../../lib/performance-monitor';
import { errorHandler } from '../../lib/error-handler';

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Basic health check data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      
      // System information
      system: {
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        cpu: process.cpuUsage(),
      },
      
      // Configuration validation
      config: validateConfig(),
      
      // Data sources status
      dataSources: {
        acled: {
          configured: config.dataSources.acled.enabled,
          priority: config.dataSources.acled.priority
        },
        news: {
          configured: config.dataSources.news.enabled,
          priority: config.dataSources.news.priority,
          sources: config.dataSources.news.sources.length
        },
        twitter: {
          configured: config.dataSources.twitter.enabled,
          priority: config.dataSources.twitter.priority,
          usingSampleData: config.dataSources.twitter.useSampleData
        }
      },
      
      // Performance metrics
      performance: performanceMonitor.getPerformanceStats(),
      
      // Error statistics
      errors: errorHandler.getErrorStats(),
      
      // Response time for this health check
      responseTime: 0 // Will be set before response
    };
    
    // Detailed health checks
    const detailedChecks = await runDetailedHealthChecks();
    
    // Determine overall health status
    const overallStatus = determineOverallStatus(healthData, detailedChecks);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthData.responseTime = responseTime;
    
    // Log health check if it's slow
    if (responseTime > 1000) {
      console.warn(`Slow health check: ${responseTime}ms`);
    }
    
    const response = {
      ...healthData,
      status: overallStatus,
      checks: detailedChecks
    };
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    errorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
      source: 'HEALTH_CHECK',
      endpoint: '/api/health'
    });
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}

async function runDetailedHealthChecks() {
  const checks = {
    database: await checkDatabaseConnection(),
    externalAPIs: await checkExternalAPIs(),
    cache: checkCacheSystem(),
    fileSystem: checkFileSystem(),
    memory: checkMemoryUsage(),
    disk: await checkDiskSpace()
  };
  
  return checks;
}

async function checkDatabaseConnection() {
  // Since we don't have a traditional database, check data aggregation
  try {
    // This is a placeholder - in a real app you'd check your database
    return {
      status: 'healthy',
      message: 'No database configured - using API-based data sources',
      responseTime: 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkExternalAPIs() {
  const apiChecks = {
    acled: { status: 'unknown', responseTime: 0 },
    news: { status: 'unknown', responseTime: 0 }
  };
  
  // Check ACLED API
  if (config.dataSources.acled.enabled) {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${config.acled.baseUrl}?key=${config.acled.apiKey}&format=json&limit=1`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      apiChecks.acled = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        statusCode: response.status
      } as any;
    } catch (error) {
      apiChecks.acled = {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      } as any;
    }
  } else {
    apiChecks.acled = {
      status: 'disabled',
      message: 'ACLED API not configured'
    } as any;
  }
  
  // Check News RSS feeds
  const newsStartTime = Date.now();
  try {
    const firstSource = config.dataSources.news.sources[0];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(firstSource.url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    apiChecks.news = {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - newsStartTime,
      statusCode: response.status,
      source: firstSource.name
    } as any;
  } catch (error) {
    apiChecks.news = {
      status: 'unhealthy',
      responseTime: Date.now() - newsStartTime,
      error: error instanceof Error ? error.message : String(error)
    } as any;
  }
  
  return apiChecks;
}

function checkCacheSystem() {
  try {
    // Check if cache is working by testing Map operations
    const testCache = new Map();
    testCache.set('test', 'value');
    const retrieved = testCache.get('test');
    
    return {
      status: retrieved === 'value' ? 'healthy' : 'unhealthy',
      message: 'In-memory cache system operational'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Cache system failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkFileSystem() {
  try {
    // Check if we can read the current directory
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    fs.readdirSync('.');
    
    return {
      status: 'healthy',
      message: 'File system accessible'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'File system check failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkMemoryUsage() {
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  
  let status = 'healthy';
  let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`;
  
  if (usagePercent > 90) {
    status = 'critical';
    message += ' - Critical memory usage';
  } else if (usagePercent > 75) {
    status = 'warning';
    message += ' - High memory usage';
  }
  
  return {
    status,
    message,
    metrics: {
      usedMB,
      totalMB,
      usagePercent,
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    }
  };
}

async function checkDiskSpace() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs').promises;
    const _stats = await fs.stat('.');
    
    return {
      status: 'healthy',
      message: 'Disk space check completed',
      // Note: Getting actual disk space requires additional system calls
      // This is a simplified check
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Disk space check failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function determineOverallStatus(healthData: any, detailedChecks: any): 'healthy' | 'degraded' | 'unhealthy' {
  // Check for critical issues
  if (!healthData.config.isValid) {
    return 'unhealthy';
  }
  
  // Check memory usage
  if (detailedChecks.memory.status === 'critical') {
    return 'unhealthy';
  }
  
  // Check external APIs
  const apiStatuses = Object.values(detailedChecks.externalAPIs);
  const unhealthyAPIs = apiStatuses.filter((api: any) => api.status === 'unhealthy').length;
  const totalAPIs = apiStatuses.filter((api: any) => api.status !== 'disabled').length;
  
  if (totalAPIs > 0 && unhealthyAPIs === totalAPIs) {
    return 'unhealthy';
  }
  
  // Check for warnings
  if (detailedChecks.memory.status === 'warning' || unhealthyAPIs > 0) {
    return 'degraded';
  }
  
  // Check performance
  const perfStats = healthData.performance;
  if (perfStats.apiSuccessRate < 90) {
    return 'degraded';
  }
  
  return 'healthy';
} 