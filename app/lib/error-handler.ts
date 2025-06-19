import { config } from './config';

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
  source: string;
  userId?: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly source: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    source: string = 'UNKNOWN',
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.source = source;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class APIError extends AppError {
  constructor(message: string, source: string, statusCode: number = 500) {
    super(message, statusCode, 'API_ERROR', source);
  }
}

export class DataFetchError extends AppError {
  constructor(message: string, source: string) {
    super(message, 503, 'DATA_FETCH_ERROR', source);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', field || 'VALIDATION');
  }
}

export class RateLimitError extends AppError {
  constructor(source: string) {
    super(`Rate limit exceeded for ${source}`, 429, 'RATE_LIMIT_ERROR', source);
  }
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: Error | AppError, context?: any): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: config.isDevelopment ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      source: error instanceof AppError ? error.source : 'UNKNOWN',
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      statusCode: error instanceof AppError ? error.statusCode : 500,
      ...context
    };

    // Log based on environment and severity
    if (config.isProduction) {
      // In production, only log errors and warnings
      if (errorInfo.statusCode && errorInfo.statusCode >= 500) {
        console.error('🚨 Critical Error:', JSON.stringify(errorInfo, null, 2));
      } else if (errorInfo.statusCode && errorInfo.statusCode >= 400) {
        console.warn('⚠️ Client Error:', JSON.stringify(errorInfo, null, 2));
      }
    } else {
      // In development, log all errors with full details
      console.error('🐛 Error Details:', JSON.stringify(errorInfo, null, 2));
    }

    // Track error frequency
    this.trackErrorFrequency(errorInfo.source);

    // Send to external monitoring service in production
    if (config.monitoring.enableErrorTracking && config.isProduction) {
      this.sendToMonitoring(errorInfo);
    }
  }

  private trackErrorFrequency(source: string): void {
    const now = Date.now();
    const count = this.errorCount.get(source) || 0;
    const lastTime = this.lastErrorTime.get(source) || 0;

    // Reset count if more than 1 hour has passed
    if (now - lastTime > 60 * 60 * 1000) {
      this.errorCount.set(source, 1);
    } else {
      this.errorCount.set(source, count + 1);
    }

    this.lastErrorTime.set(source, now);

    // Alert if error frequency is high
    if (this.errorCount.get(source)! > 10) {
      console.error(`🚨 High error frequency detected for ${source}: ${this.errorCount.get(source)} errors in the last hour`);
    }
  }

  private sendToMonitoring(errorInfo: ErrorInfo): void {
    // Placeholder for external monitoring service integration
    // In a real application, you would integrate with services like:
    // - Sentry
    // - Bugsnag
    // - LogRocket
    // - DataDog
    
    if (config.isDevelopment) {
      console.log('📊 Would send to monitoring service:', errorInfo);
    }
  }

  handleAsyncError(error: Error, context?: any): void {
    this.logError(error, context);
    
    // Don't crash the application for operational errors
    if (error instanceof AppError && error.isOperational) {
      return;
    }

    // For non-operational errors in production, we might want to restart
    if (config.isProduction) {
      console.error('💥 Non-operational error detected. Application may need restart.');
    }
  }

  createSafeAsyncWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    source: string,
    fallbackValue?: R
  ) {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError(
          error instanceof Error ? error : new Error(String(error)),
          { source, args: config.isDevelopment ? args : undefined }
        );
        
        return fallbackValue;
      }
    };
  }

  createErrorBoundary(source: string) {
    return (error: Error, errorInfo: any) => {
      this.logError(error, { source, componentStack: errorInfo.componentStack });
    };
  }

  // Rate limiting for error-prone operations
  shouldAllowOperation(source: string, maxErrors: number = 5, timeWindow: number = 60000): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorTime.get(source) || 0;
    const errorCount = this.errorCount.get(source) || 0;

    // Reset if time window has passed
    if (now - lastTime > timeWindow) {
      this.errorCount.set(source, 0);
      return true;
    }

    return errorCount < maxErrors;
  }

  getErrorStats(): Record<string, { count: number; lastError: string }> {
    const stats: Record<string, { count: number; lastError: string }> = {};
    
    for (const [source, count] of this.errorCount.entries()) {
      const lastTime = this.lastErrorTime.get(source);
      stats[source] = {
        count,
        lastError: lastTime ? new Date(lastTime).toISOString() : 'Never'
      };
    }
    
    return stats;
  }
}

// Global error handlers
if (typeof window !== 'undefined') {
  // Client-side error handling
  window.addEventListener('error', (event) => {
    ErrorHandler.getInstance().logError(event.error, {
      source: 'WINDOW_ERROR',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.getInstance().logError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { source: 'UNHANDLED_PROMISE' }
    );
  });
} else {
  // Server-side error handling
  process.on('uncaughtException', (error) => {
    ErrorHandler.getInstance().logError(error, { source: 'UNCAUGHT_EXCEPTION' });
    
    if (config.isProduction) {
      console.error('💥 Uncaught exception. Shutting down gracefully...');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason) => {
    ErrorHandler.getInstance().logError(
      new Error(`Unhandled Rejection: ${reason}`),
      { source: 'UNHANDLED_REJECTION' }
    );
  });
}

export const errorHandler = ErrorHandler.getInstance();
export default errorHandler; 