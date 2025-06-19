import { ConflictEvent, DashboardMetrics, SeverityLevel, ThreatLevel, EventType, DataSource } from '../../types/conflict';
import { acledClient } from './acled';
import { twitterClient } from './twitter';
import { newsScraperClient } from './news-scraper';
import { crisisMonitorClient } from './crisis-monitor';
import { calculateGlobalThreatLevel } from '../utils';

interface SourceStatus {
  name: string;
  enabled: boolean;
  lastFetch: Date | null;
  errorCount: number;
  eventCount: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  sources?: number;
}

export class ConflictDataAggregator {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly longCacheTTL = 15 * 60 * 1000; // 15 minutes for less critical data
  private sourceStatus: Map<string, SourceStatus> = new Map();
  private isRefreshing: Map<string, Promise<any>> = new Map(); // Prevent duplicate requests

  constructor() {
    this.initializeSourceStatus();
  }

  private initializeSourceStatus() {
    this.sourceStatus.set('ACLED', {
      name: 'ACLED',
      enabled: acledClient.isConfigured(),
      lastFetch: null,
      errorCount: 0,
      eventCount: 0
    });

    this.sourceStatus.set('Twitter', {
      name: 'Twitter',
      enabled: twitterClient.isConfigured(), // Twitter scraping is always available
      lastFetch: null,
      errorCount: 0,
      eventCount: 0
    });

    this.sourceStatus.set('News', {
      name: 'News',
      enabled: newsScraperClient.isConfigured(), // News scraping is always available
      lastFetch: null,
      errorCount: 0,
      eventCount: 0
    });

    this.sourceStatus.set('Intelligence', {
      name: 'Intelligence',
      enabled: true, // Crisis monitoring is always available
      lastFetch: null,
      errorCount: 0,
      eventCount: 0
    });
  }

  private updateSourceStatus(sourceName: string, success: boolean, eventCount: number = 0) {
    const status = this.sourceStatus.get(sourceName);
    if (status) {
      status.lastFetch = new Date();
      status.eventCount = eventCount;
      if (success) {
        status.errorCount = 0;
      } else {
        status.errorCount += 1;
      }
    }
  }

  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    sourceName: string,
    maxRetries: number = 3
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching from ${sourceName} (attempt ${attempt}/${maxRetries})`);
        
        // Add timeout to prevent hanging requests
        const result = await Promise.race([
          fetchFn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${sourceName} fetch timeout`)), 15000)
          )
        ]);
        
        // Update event count if result is an array
        const eventCount = Array.isArray(result) ? result.length : 0;
        this.updateSourceStatus(sourceName, true, eventCount);
        console.log(`✓ Successfully fetched from ${sourceName} (${eventCount} events)`);
        return result;
      } catch (error) {
        console.error(`${sourceName} attempt ${attempt}/${maxRetries} failed:`, error);
        
        // Check for specific error types that shouldn't be retried immediately
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isCorsError = errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS');
        const isTimeoutError = errorMessage.includes('timeout');
        
        if (attempt === maxRetries) {
          this.updateSourceStatus(sourceName, false);
          console.error(`✗ Final failure for ${sourceName}:`, error);
          return null;
        }
        
        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.log(`Retrying ${sourceName} in ${Math.round(delay)}ms... (${isCorsError ? 'CORS' : isTimeoutError ? 'Timeout' : 'Network'} error)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  async getAllConflictEvents(forceRefresh: boolean = false): Promise<ConflictEvent[]> {
    const cacheKey = 'all_events';
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Using cached conflict events (${cached.data.length} events)`);
      return cached.data;
    }

    // Check if we're already refreshing to prevent duplicate requests
    if (this.isRefreshing.has(cacheKey)) {
      console.log('Already refreshing, waiting for existing request...');
      return await this.isRefreshing.get(cacheKey)!;
    }

    console.log('Fetching fresh conflict data from all sources...');

    // Create the refresh promise
    const refreshPromise = this.performDataFetch(cacheKey);
    this.isRefreshing.set(cacheKey, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.isRefreshing.delete(cacheKey);
    }
  }

  private async performDataFetch(cacheKey: string): Promise<ConflictEvent[]> {
    const cached = this.cache.get(cacheKey);

    // Implement parallel data fetching as recommended by Next.js docs
    const dataPromises: Promise<ConflictEvent[] | null>[] = [];

    // ACLED - Recent high-impact events
    if (this.sourceStatus.get('ACLED')?.enabled) {
      dataPromises.push(
        this.fetchWithRetry(
          () => acledClient.getAllActiveConflicts(),
          'ACLED'
        )
      );
    }

    // Twitter - Real-time social media reports
    if (this.sourceStatus.get('Twitter')?.enabled) {
      dataPromises.push(
        this.fetchWithRetry(
          () => twitterClient.getRecentEvents(30),
          'Twitter'
        )
      );
    }

    // News - Real-time news scraping (including current Israel-Iran situation)
    if (this.sourceStatus.get('News')?.enabled) {
      dataPromises.push(
        this.fetchWithRetry(
          () => newsScraperClient.getRecentEvents(24),
          'News'
        )
      );
    }

    // Intelligence - Crisis monitoring and geopolitical alerts
    if (this.sourceStatus.get('Intelligence')?.enabled) {
      dataPromises.push(
        this.fetchWithRetry(
          () => crisisMonitorClient.convertCrisisAlertsToEvents(),
          'Intelligence'
        )
      );
    }

    try {
      // Execute all data fetches in parallel with timeout
      const results = await Promise.allSettled(dataPromises);
      
      const allEvents: ConflictEvent[] = [];
      const eventIds = new Set<string>();

      // Process results and deduplicate
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const events = result.value;
          console.log(`Source ${index} returned ${events.length} events`);
          
          events.forEach(event => {
            // Enhanced data quality validation and normalization
            const location = this.validateAndNormalizeLocation(event);
            const coordinates = this.validateCoordinates(event);
            const timestamp = this.validateTimestamp(event);
            const eventType = this.validateEventType(event);
            const source = this.validateSource(event);
            const severity = this.validateSeverity(event);
            
            // Only include events with valid core data
            if (location !== 'INVALID' && eventType !== 'INVALID') {
              // Enhanced deduplication based on multiple factors
              const dedupeKey = `${location}_${coordinates.lat.toFixed(2)}_${coordinates.lng.toFixed(2)}_${timestamp}_${eventType}`;
              if (!eventIds.has(dedupeKey)) {
                eventIds.add(dedupeKey);
                
                // Normalize the event data before adding
                const normalizedEvent = {
                  ...event,
                  location,
                  coordinates,
                  timestamp,
                  eventType,
                  source,
                  severity,
                  // Ensure required fields are present
                  fatalities: event.fatalities || 0,
                  actors: event.actors || [event.actor1, event.actor2].filter(Boolean),
                  verified: event.verified || false,
                  tags: event.tags || []
                };
                
                allEvents.push(normalizedEvent);
              }
            } else {
              console.warn('Skipping invalid event:', { 
                id: event.id, 
                location, 
                eventType, 
                originalLocation: event.location || event.country,
                originalEventType: event.eventType || event.event_type 
              });
            }
          });
        }
      });

      // Sort by date (most recent first) and severity
      allEvents.sort((a, b) => {
        const timestampA = a.timestamp || a.date || new Date().toISOString();
        const timestampB = b.timestamp || b.date || new Date().toISOString();
        const dateComparison = new Date(timestampB).getTime() - new Date(timestampA).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      console.log(`Total events after deduplication: ${allEvents.length}`);
      
      // Cache the results with performance metrics
      this.cache.set(cacheKey, { 
        data: allEvents, 
        timestamp: Date.now(),
        sources: results.filter(r => r.status === 'fulfilled').length
      });
      
      return allEvents;
    } catch (error) {
      console.error('Error fetching conflict events:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Returning cached data due to fetch error');
        return cached.data;
      }
      
      return [];
    }
  }

  async getCriticalEvents(): Promise<ConflictEvent[]> {
    const cacheKey = 'critical_events';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Parallel fetch for critical events
    const criticalPromises: Promise<ConflictEvent[] | null>[] = [];

    if (this.sourceStatus.get('ACLED')?.enabled) {
      criticalPromises.push(
        this.fetchWithRetry(
          () => acledClient.getCriticalEvents(7),
          'ACLED'
        )
      );
    }

    try {
      const results = await Promise.allSettled(criticalPromises);
      const criticalEvents: ConflictEvent[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          criticalEvents.push(...result.value);
        }
      });

      // Sort by severity and fatalities
      criticalEvents.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityComparison = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityComparison !== 0) return severityComparison;
        return b.fatalities - a.fatalities;
      });

      this.cache.set(cacheKey, { data: criticalEvents, timestamp: Date.now() });
      return criticalEvents;
    } catch (error) {
      console.error('Error fetching critical events:', error);
      return [];
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    console.log('Calculating dashboard metrics...');
    
    const events = await this.getAllConflictEvents();
    
    // Use improved date filtering utilities
    const { filterEventsByDateRange, getDateRange, isToday, isYesterday, calculatePercentageChange } = await import('../utils');
    
    // Get today's and yesterday's date ranges
    const todayRange = getDateRange(0); // Today only
    const yesterdayRange = getDateRange(1); // Yesterday only
    yesterdayRange.end = new Date(yesterdayRange.end.getTime() - 24 * 60 * 60 * 1000); // Adjust end to yesterday
    yesterdayRange.start = new Date(yesterdayRange.start.getTime() - 24 * 60 * 60 * 1000); // Adjust start to yesterday
    
    // Filter events for today and yesterday
    const todayEvents = events.filter(event => {
      const eventDate = event.timestamp || event.date;
      return eventDate ? isToday(eventDate) : false;
    });
    const yesterdayEvents = events.filter(event => {
      const eventDate = event.timestamp || event.date;
      return eventDate ? isYesterday(eventDate) : false;
    });
    
    // Calculate today's metrics
    const totalEventsToday = todayEvents.length;
    const totalFatalitiesToday = todayEvents.reduce((sum, event) => sum + event.fatalities, 0);
    
    // Calculate yesterday's metrics for comparison
    const totalEventsYesterday = yesterdayEvents.length;
    const totalFatalitiesYesterday = yesterdayEvents.reduce((sum, event) => sum + event.fatalities, 0);
    
    // Calculate percentage changes
    const eventsChange = calculatePercentageChange(totalEventsToday, totalEventsYesterday);
    const fatalitiesChange = calculatePercentageChange(totalFatalitiesToday, totalFatalitiesYesterday);
    
    // Calculate active conflicts (events in last 7 days)
    const sevenDaysRange = getDateRange(7);
    const recentEvents = filterEventsByDateRange(events, sevenDaysRange.start, sevenDaysRange.end);
    
    // Count unique countries with conflicts
    const activeCountries = new Set(recentEvents.map(event => event.location || event.country || 'unknown').filter(Boolean));
    const activeConflicts = activeCountries.size;
    
    // Compare with previous week for active conflicts
    const previousWeekRange = getDateRange(14);
    previousWeekRange.end = new Date(previousWeekRange.end.getTime() - 7 * 24 * 60 * 60 * 1000);
    previousWeekRange.start = new Date(previousWeekRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekEvents = filterEventsByDateRange(events, previousWeekRange.start, previousWeekRange.end);
    const previousActiveCountries = new Set(previousWeekEvents.map(event => event.location || event.country || 'unknown').filter(Boolean));
    const activeConflictsChange = calculatePercentageChange(activeConflicts, previousActiveCountries.size);
    
    // Count critical alerts (high and critical severity events in last 24 hours)
    const last24HoursRange = getDateRange(1);
    const criticalEvents = filterEventsByDateRange(events, last24HoursRange.start, last24HoursRange.end);
    const criticalAlerts = criticalEvents.filter(event => 
      event.severity === 'critical' || event.severity === 'high'
    ).length;
    
    // Compare with previous 24 hours
    const previous24HoursRange = getDateRange(2);
    previous24HoursRange.end = new Date(previous24HoursRange.end.getTime() - 24 * 60 * 60 * 1000);
    previous24HoursRange.start = new Date(previous24HoursRange.start.getTime() - 24 * 60 * 60 * 1000);
    const previousCriticalEvents = filterEventsByDateRange(events, previous24HoursRange.start, previous24HoursRange.end);
    const previousCriticalAlerts = previousCriticalEvents.filter(event => 
      event.severity === 'critical' || event.severity === 'high'
    ).length;
    const criticalAlertsChange = calculatePercentageChange(criticalAlerts, previousCriticalAlerts);
    
    // Calculate global threat level
    const globalThreatLevel = calculateGlobalThreatLevel(recentEvents);
    
    const metrics: DashboardMetrics = {
      totalEventsToday,
      totalFatalitiesToday,
      activeConflicts,
      criticalAlerts,
      globalThreatLevel,
      dataLastUpdated: new Date().toISOString(),
      // Add percentage changes
      percentageChanges: {
        events: eventsChange,
        fatalities: fatalitiesChange,
        activeConflicts: activeConflictsChange,
        criticalAlerts: criticalAlertsChange
      }
    };

    console.log('Dashboard metrics calculated:', metrics);
    return metrics;
  }

  getSourceStatus(): Map<string, SourceStatus> {
    return new Map(this.sourceStatus);
  }

  clearCache(): void {
    this.cache.clear();
    console.log('Data aggregator cache cleared');
  }

  // Get events by specific criteria
  async getEventsByCountry(country: string): Promise<ConflictEvent[]> {
    const allEvents = await this.getAllConflictEvents();
    return allEvents.filter(event => {
      const eventCountry = event.location || event.country || '';
      return eventCountry.toLowerCase().includes(country.toLowerCase());
    });
  }

  async getEventsBySeverity(severity: SeverityLevel): Promise<ConflictEvent[]> {
    const allEvents = await this.getAllConflictEvents();
    return allEvents.filter(event => event.severity === severity);
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    const status = Array.from(this.sourceStatus.values());
    return {
      sources: status,
      cacheSize: this.cache.size,
      lastUpdate: Math.max(...status.map(s => s.lastFetch?.getTime() || 0))
    };
  }

  // Data quality validation methods
  private validateAndNormalizeLocation(event: ConflictEvent): string {
    // Priority order: location > country > region
    const rawLocation = event.location || event.country || event.region;
    
    if (!rawLocation) {
      // Try to derive from coordinates if available
      const coords = this.validateCoordinates(event);
      if (coords.lat !== 0 || coords.lng !== 0) {
        return this.getLocationFromCoordinates(coords.lat, coords.lng);
      }
      return 'INVALID'; // Mark as invalid rather than 'unknown'
    }
    
    // Normalize common location variations
    const normalizedLocation = this.normalizeLocationName(rawLocation.trim());
    return normalizedLocation;
  }
  
  private validateCoordinates(event: ConflictEvent): { lat: number; lng: number } {
    const lat = event.coordinates?.lat || event.latitude || 0;
    const lng = event.coordinates?.lng || event.longitude || 0;
    
    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates detected:', { lat, lng, eventId: event.id });
      return { lat: 0, lng: 0 };
    }
    
    return { lat, lng };
  }
  
  private validateTimestamp(event: ConflictEvent): string {
    const timestamp = event.timestamp || event.date;
    
    if (!timestamp) {
      return new Date().toISOString();
    }
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp detected:', timestamp, 'for event:', event.id);
        return new Date().toISOString();
      }
      
      // Ensure timestamp is not in the future
      const now = new Date();
      if (date > now) {
        console.warn('Future timestamp detected:', timestamp, 'for event:', event.id);
        return now.toISOString();
      }
      
      return date.toISOString();
    } catch (error) {
      console.warn('Error parsing timestamp:', timestamp, 'for event:', event.id);
      return new Date().toISOString();
    }
  }
  
  private validateEventType(event: ConflictEvent): EventType | 'INVALID' {
    const eventType = event.eventType || event.event_type;
    
    if (!eventType) {
      return 'INVALID'; // Mark as invalid rather than 'unknown'
    }
    
    // Normalize event type variations
    const normalizedType = this.normalizeEventType(eventType);
    return normalizedType as EventType;
  }
  
  private validateSource(event: ConflictEvent): DataSource {
    const source = event.source;
    
    if (!source) {
      // Try to derive from other fields
      if (event.id?.includes('acled_')) return DataSource.ACLED;
      if (event.id?.includes('news_')) return DataSource.News;
      if (event.id?.includes('twitter_')) return DataSource.Twitter;
      if (event.id?.includes('crisis_')) return DataSource.Intelligence;
      
      return DataSource.Manual; // Better than 'unknown'
    }
    
    // Convert string to DataSource enum if needed
    if (typeof source === 'string') {
      switch (source.toLowerCase()) {
        case 'acled': return DataSource.ACLED;
        case 'news': return DataSource.News;
        case 'twitter': return DataSource.Twitter;
        case 'intelligence': return DataSource.Intelligence;
        case 'crisiswatch': return DataSource.CrisisWatch;
        default: return DataSource.Manual;
      }
    }
    
    return source as DataSource;
  }
  
  private validateSeverity(event: ConflictEvent): SeverityLevel {
    // Don't trust existing severity, recalculate based on data
    const { calculateSeverity } = require('../utils');
    return calculateSeverity(event);
  }
  
  private normalizeLocationName(location: string): string {
    // Common location normalizations
    const normalizations: { [key: string]: string } = {
      'gaza strip': 'Gaza',
      'west bank': 'Palestine',
      'drc': 'Democratic Republic of Congo',
      'car': 'Central African Republic',
      'uae': 'United Arab Emirates',
      'usa': 'United States',
      'uk': 'United Kingdom'
    };
    
    const lowerLocation = location.toLowerCase();
    return normalizations[lowerLocation] || location;
  }
  
  private normalizeEventType(eventType: string): string {
    // Common event type normalizations
    const normalizations: { [key: string]: string } = {
      'armed clash': 'Battle',
      'battles': 'Battle',
      'violence against civilians': 'ViolenceAgainstCivilians',
      'explosions/remote violence': 'Bombing',
      'suicide bomb': 'Bombing',
      'air strike': 'Airstrike',
      'drone strike': 'DroneStrike'
    };
    
    const lowerType = eventType.toLowerCase();
    return normalizations[lowerType] || eventType;
  }
  
  private getLocationFromCoordinates(lat: number, lng: number): string {
    // Simple coordinate-to-location mapping for major regions
    if (lat >= 35 && lat <= 55 && lng >= 20 && lng <= 50) return 'Middle East';
    if (lat >= 45 && lat <= 70 && lng >= 20 && lng <= 50) return 'Eastern Europe';
    if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) return 'Africa';
    if (lat >= 10 && lat <= 55 && lng >= 60 && lng <= 150) return 'Asia';
    if (lat >= -55 && lat <= 35 && lng >= -170 && lng <= -30) return 'Americas';
    
    return 'Global'; // Better than 'unknown'
  }
}

export const conflictDataAggregator = new ConflictDataAggregator(); 