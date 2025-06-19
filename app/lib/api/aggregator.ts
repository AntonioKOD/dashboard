import { ConflictEvent, DashboardMetrics, SeverityLevel, ThreatLevel } from '../../types/conflict';
import { acledClient } from './acled';
import { twitterClient } from './twitter';
import { newsScraperClient } from './news-scraper';
import { calculateGlobalThreatLevel } from '../utils';

interface SourceStatus {
  name: string;
  enabled: boolean;
  lastFetch: Date | null;
  errorCount: number;
  eventCount: number;
}

class ConflictDataAggregator {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  private sourceStatus: Map<string, SourceStatus> = new Map();

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
        const result = await fetchFn();
        // Update event count if result is an array
        const eventCount = Array.isArray(result) ? result.length : 0;
        this.updateSourceStatus(sourceName, true, eventCount);
        return result;
      } catch (error) {
        console.error(`${sourceName} attempt ${attempt}/${maxRetries} failed:`, error);
        if (attempt === maxRetries) {
          this.updateSourceStatus(sourceName, false);
          return null;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return null;
  }

  async getAllConflictEvents(forceRefresh: boolean = false): Promise<ConflictEvent[]> {
    const cacheKey = 'all_events';
    const cached = this.cache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Using cached conflict events (${cached.data.length} events)`);
      return cached.data;
    }

    console.log('Fetching fresh conflict data from all sources...');

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

    try {
      // Execute all data fetches in parallel
      const results = await Promise.allSettled(dataPromises);
      
      const allEvents: ConflictEvent[] = [];
      const eventIds = new Set<string>();

      // Process results and deduplicate
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const events = result.value;
          console.log(`Source ${index} returned ${events.length} events`);
          
          events.forEach(event => {
            // Simple deduplication based on similar location and date
            const dedupeKey = `${event.country}_${event.latitude.toFixed(2)}_${event.longitude.toFixed(2)}_${event.date}`;
            if (!eventIds.has(dedupeKey)) {
              eventIds.add(dedupeKey);
              allEvents.push(event);
            }
          });
        }
      });

      // Sort by date (most recent first) and severity
      allEvents.sort((a, b) => {
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      console.log(`Total events after deduplication: ${allEvents.length}`);
      
      // Cache the results
      this.cache.set(cacheKey, { data: allEvents, timestamp: Date.now() });
      
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
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate today's events
    const todayEvents = events.filter(event => event.date === today);
    const totalEventsToday = todayEvents.length;
    const totalFatalitiesToday = todayEvents.reduce((sum, event) => sum + event.fatalities, 0);
    
    // Calculate active conflicts (events in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEvents = events.filter(event => new Date(event.date) >= sevenDaysAgo);
    
    // Count unique countries with conflicts
    const activeCountries = new Set(recentEvents.map(event => event.country));
    const activeConflicts = activeCountries.size;
    
    // Count critical alerts (high and critical severity events in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const criticalAlerts = events.filter(event => 
      new Date(event.date) >= oneDayAgo && 
      (event.severity === 'critical' || event.severity === 'high')
    ).length;
    
    // Calculate global threat level
    const globalThreatLevel = calculateGlobalThreatLevel(recentEvents);
    
    const metrics: DashboardMetrics = {
      totalEventsToday,
      totalFatalitiesToday,
      activeConflicts,
      criticalAlerts,
      globalThreatLevel,
      dataLastUpdated: new Date().toISOString()
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
    return allEvents.filter(event => 
      event.country.toLowerCase().includes(country.toLowerCase())
    );
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
}

export const conflictDataAggregator = new ConflictDataAggregator(); 