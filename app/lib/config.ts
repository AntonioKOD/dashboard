// Production-ready configuration with environment validation
export const config = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // API Configuration with validation
  acled: {
    baseUrl: 'https://api.acleddata.com/acled/read',
    apiKey: process.env.ACLED_API_KEY || '',
    isConfigured: !!process.env.ACLED_API_KEY,
    maxRetries: 3,
    timeout: 10000, // 10 seconds
  },
  
  // Cache configuration - production optimized
  cache: {
    ttl: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5min prod, 2min dev
    newsTtl: process.env.NODE_ENV === 'production' ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10min prod, 5min dev
    twitterTtl: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 10 * 60 * 1000, // 15min prod, 10min dev
  },
  
  // Rate limiting for production
  rateLimit: {
    maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Data sources configuration
  dataSources: {
    acled: {
      enabled: !!process.env.ACLED_API_KEY,
      priority: 1,
    },
    news: {
      enabled: true,
      priority: 2,
      sources: [
        { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC', timeout: 5000 },
        { url: 'https://rss.dw.com/rdf/rss-en-world', name: 'Deutsche Welle', timeout: 5000 },
        { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', timeout: 5000 }
      ]
    },
    twitter: {
      enabled: true,
      priority: 3,
      useSampleData: true, // Always use sample data due to Twitter anti-bot measures
    }
  },
  
  // Performance settings
  performance: {
    enableCompression: true,
    enableCaching: true,
    maxConcurrentRequests: process.env.NODE_ENV === 'production' ? 5 : 10,
    requestTimeout: 30000, // 30 seconds
  },
  
  // Security settings
  security: {
    enableCors: process.env.NODE_ENV === 'production',
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000'],
    enableRateLimit: process.env.NODE_ENV === 'production',
  },
  
  // Monitoring and logging
  monitoring: {
    enableErrorTracking: process.env.NODE_ENV === 'production',
    enablePerformanceMonitoring: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  },
  
  // Feature flags
  features: {
    realTimeUpdates: true,
    advancedAnalytics: process.env.NODE_ENV === 'production',
    experimentalFeatures: process.env.NODE_ENV === 'development',
  },
  
  // UI Configuration
  ui: {
    refreshInterval: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5min prod, 2min dev
    maxEventsDisplay: 100,
    enableAnimations: true,
    theme: 'dark',
  }
};

// Validation function for production readiness
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check critical environment variables
  if (config.isProduction) {
    if (!config.acled.apiKey) {
      errors.push('ACLED_API_KEY is required for production');
    }
    
    if (!process.env.NEXTAUTH_SECRET) {
      console.warn('NEXTAUTH_SECRET not set - using default (not recommended for production)');
    }
  }
  
  // Validate data source configurations
  config.dataSources.news.sources.forEach(source => {
    try {
      new URL(source.url);
    } catch {
      errors.push(`Invalid RSS URL: ${source.url}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export individual configurations for easier imports
export const { acled, cache, dataSources, performance, security, monitoring, features, ui } = config;

export default config; 