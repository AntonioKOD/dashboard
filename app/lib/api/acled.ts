import { ConflictEvent, EventType, DataSource, SeverityLevel } from '../../types/conflict';
import { calculateSeverity } from '../utils';

interface ACLEDEvent {
  event_id: string;
  event_date: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2?: string;
  fatalities: number;
  notes: string;
  source: string;
  timestamp: number;
}

interface ACLEDResponse {
  success: boolean;
  count: number;
  data: ACLEDEvent[];
}

class ACLEDClient {
  private baseUrl: string;
  private apiKey: string;
  private cache: Map<string, { data: ConflictEvent[]; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = process.env.ACLED_BASE_URL || 'https://api.acleddata.com/acled/read';
    this.apiKey = process.env.ACLED_API_KEY || '';
    this.cache = new Map();
  }

  private async makeRequest(_endpoint: string = '', params: Record<string, any> = {}): Promise<ACLEDResponse> {
    if (!this.apiKey) {
      throw new Error('ACLED API key not configured');
    }

    const url = new URL(this.baseUrl);
    
    // Add authentication and default parameters
    const searchParams = {
      key: this.apiKey,
      format: 'json',
      limit: 2000, // Increased limit for more comprehensive data
      ...params
    };

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      console.log(`Fetching ACLED data: ${url.toString().replace(this.apiKey, '[API_KEY]')}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WW3-Dashboard/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ACLED API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`ACLED API returned ${data.count} events`);
      return data;
    } catch (error) {
      console.error('ACLED API request failed:', error);
      throw error;
    }
  }

  private transformACLEDEvent(acledEvent: ACLEDEvent): ConflictEvent {
    const event: ConflictEvent = {
      id: `acled_${acledEvent.event_id}`,
      date: acledEvent.event_date,
      country: acledEvent.country,
      region: acledEvent.region,
      latitude: acledEvent.latitude,
      longitude: acledEvent.longitude,
      event_type: this.mapEventType(acledEvent.event_type),
      sub_event_type: acledEvent.sub_event_type,
      actor1: acledEvent.actor1,
      actor2: acledEvent.actor2,
      fatalities: acledEvent.fatalities || 0,
      source: 'ACLED' as DataSource,
      notes: acledEvent.notes,
      severity: SeverityLevel.Low, // Will be calculated
      timestamp: new Date().toISOString()
    };

    event.severity = calculateSeverity(event);
    return event;
  }

  private mapEventType(acledType: string): EventType {
    const typeMapping: Record<string, EventType> = {
      'Violence against civilians': 'Violence against civilians',
      'Battles': 'Battle',
      'Explosions/Remote violence': 'Bombing',
      'Protests': 'Protest',
      'Riots': 'Riot',
      'Strategic developments': 'Strategic development'
    };

    return typeMapping[acledType] || 'Armed clash';
  }

  async getRecentEvents(days: number = 30): Promise<ConflictEvent[]> {
    const cacheKey = `recent_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Using cached ACLED data (${cached.data.length} events)`);
      return cached.data;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const params = {
      event_date: `${startDate.toISOString().split('T')[0]}|${endDate.toISOString().split('T')[0]}`,
      event_date_where: 'BETWEEN',
      // Focus on high-impact events
      event_type: 'Violence against civilians|Battles|Explosions/Remote violence'
    };

    try {
      const response = await this.makeRequest('', params);
      const events = response.data
        .filter(event => event.latitude && event.longitude) // Only events with valid coordinates
        .map(event => this.transformACLEDEvent(event));
      
      console.log(`Transformed ${events.length} ACLED events`);
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      return events;
    } catch (error) {
      console.error('Failed to fetch ACLED events:', error);
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Returning expired cached data due to API error');
        return cached.data;
      }
      return [];
    }
  }

  async getCriticalEvents(days: number = 7): Promise<ConflictEvent[]> {
    const cacheKey = `critical_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const params = {
      event_date: `${startDate.toISOString().split('T')[0]}|${endDate.toISOString().split('T')[0]}`,
      event_date_where: 'BETWEEN',
      event_type: 'Violence against civilians|Battles|Explosions/Remote violence',
      // Focus on high-fatality events
      fatalities: '10',
      fatalities_where: '>='
    };

    try {
      const response = await this.makeRequest('', params);
      const events = (response.data || [])
        .filter(event => event.latitude && event.longitude)
        .map(event => this.transformACLEDEvent(event));
      
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      return events;
    } catch (error) {
      console.error('Failed to fetch critical ACLED events:', error);
      return [];
    }
  }

  async getEventsByCountry(country: string, days: number = 30): Promise<ConflictEvent[]> {
    const cacheKey = `country_${country}_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const params = {
      country: country,
      event_date: `${startDate.toISOString().split('T')[0]}|${endDate.toISOString().split('T')[0]}`,
      event_date_where: 'BETWEEN'
    };

    try {
      const response = await this.makeRequest('', params);
      const events = (response.data || [])
        .filter(event => event.latitude && event.longitude)
        .map(event => this.transformACLEDEvent(event));
      
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      return events;
    } catch (error) {
      console.error(`Failed to fetch ACLED events for ${country}:`, error);
      return [];
    }
  }

  async getAllActiveConflicts(): Promise<ConflictEvent[]> {
    const cacheKey = 'all_active_conflicts';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Try ACLED API if configured, otherwise use sample data
    if (this.isConfigured()) {
      try {
        const params = {
          event_date: `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}|${new Date().toISOString().split('T')[0]}`,
          event_date_where: 'BETWEEN',
          limit: 1000 // Reduced to avoid timeouts
        };

        const response = await this.makeRequest('', params);
        const events = (response.data || [])
          .filter(event => event.latitude && event.longitude)
          .map(event => this.transformACLEDEvent(event));
        
        console.log(`Fetched ${events.length} ACLED events`);
        this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
        return events;
      } catch (error) {
        console.error('ACLED API failed, using sample data:', error);
      }
    }

    // Fallback to sample data for demonstration
    console.log('Using sample ACLED data for demonstration');
    const sampleEvents = this.getSampleACLEDEvents();
    this.cache.set(cacheKey, { data: sampleEvents, timestamp: Date.now() });
    return sampleEvents;
  }

  private getSampleACLEDEvents(): ConflictEvent[] {
    const now = new Date();
    const sampleData = [
      {
        event_id: 'ACLED_SAMPLE_1',
        event_date: now.toISOString().split('T')[0],
        country: 'Ukraine',
        region: 'Eastern Europe',
        admin1: 'Donetsk',
        admin2: 'Bakhmut',
        event_type: 'Battles',
        sub_event_type: 'Armed clash',
        actor1: 'Military Forces of Ukraine',
        actor2: 'Wagner Group',
        latitude: 48.5937,
        longitude: 37.9969,
        fatalities: 25,
        notes: 'Intense fighting continues in eastern Donetsk region with multiple casualties reported.',
        source: 'BBC News',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).getTime()
      },
      {
        event_id: 'ACLED_SAMPLE_2',
        event_date: now.toISOString().split('T')[0],
        country: 'Syria',
        region: 'Middle East',
        admin1: 'Idlib',
        admin2: 'Idlib',
        event_type: 'Explosions/Remote violence',
        sub_event_type: 'Air/drone strike',
        actor1: 'Military Forces of Syria',
        actor2: 'Civilians',
        latitude: 35.9241,
        longitude: 36.6335,
        fatalities: 8,
        notes: 'Government forces conducted airstrikes on civilian areas in Idlib province.',
        source: 'Syrian Observatory for Human Rights',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).getTime()
      },
      {
        event_id: 'ACLED_SAMPLE_3',
        event_date: now.toISOString().split('T')[0],
        country: 'Gaza Strip',
        region: 'Middle East',
        admin1: 'Gaza',
        admin2: 'Gaza City',
        event_type: 'Violence against civilians',
        sub_event_type: 'Attack',
        actor1: 'Military Forces of Israel',
        actor2: 'Civilians',
        latitude: 31.3547,
        longitude: 34.3088,
        fatalities: 15,
        notes: 'Israeli military operations in Gaza City result in civilian casualties.',
        source: 'Reuters',
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).getTime()
      },
      {
        event_id: 'ACLED_SAMPLE_4',
        event_date: now.toISOString().split('T')[0],
        country: 'Myanmar',
        region: 'Southeast Asia',
        admin1: 'Rakhine',
        admin2: 'Maungdaw',
        event_type: 'Battles',
        sub_event_type: 'Armed clash',
        actor1: 'Military Forces of Myanmar',
        actor2: 'Arakan Army',
        latitude: 20.8167,
        longitude: 92.3667,
        fatalities: 12,
        notes: 'Clashes between Myanmar military and ethnic armed groups continue in Rakhine state.',
        source: 'Associated Press',
        timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).getTime()
      },
      {
        event_id: 'ACLED_SAMPLE_5',
        event_date: now.toISOString().split('T')[0],
        country: 'Somalia',
        region: 'Eastern Africa',
        admin1: 'Lower Shabelle',
        admin2: 'Afgooye',
        event_type: 'Explosions/Remote violence',
        sub_event_type: 'Suicide bomb',
        actor1: 'Al Shabaab',
        actor2: 'Civilians',
        latitude: 2.1333,
        longitude: 45.1167,
        fatalities: 20,
        notes: 'Suicide bombing at market in Lower Shabelle region kills civilians.',
        source: 'Voice of America',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime()
      }
    ];

    return sampleData.map(event => this.transformACLEDEvent(event));
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Check if API is properly configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const acledClient = new ACLEDClient(); 