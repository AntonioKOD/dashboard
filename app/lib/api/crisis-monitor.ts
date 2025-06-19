import { ConflictEvent, EventType, SeverityLevel, DataSource } from '../../types/conflict';

interface CrisisAlert {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
  category: 'MILITARY' | 'POLITICAL' | 'ECONOMIC' | 'HUMANITARIAN' | 'CYBER';
  source: string;
  confidence: number;
  trends: string[];
}

interface EconomicIndicator {
  country: string;
  indicator: string;
  value: number;
  change: number;
  timestamp: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

interface GeopoliticalTrend {
  region: string;
  trend: string;
  description: string;
  severity: SeverityLevel;
  timestamp: string;
  relatedCountries: string[];
}

class CrisisMonitorClient {
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes

  private readonly worldBankApiBase = 'https://api.worldbank.org/v2';
  private readonly restCountriesApi = 'https://restcountries.com/v3.1';
  private readonly openDataApi = 'https://api.exchangerate-api.com/v4/latest';

  private readonly conflictHotspots = {
    'Eastern Europe': {
      countries: ['Ukraine', 'Russia', 'Belarus', 'Moldova'],
      center: { lat: 50.0, lng: 30.0 },
      riskLevel: 'CRITICAL'
    },
    'Middle East': {
      countries: ['Syria', 'Iraq', 'Iran', 'Israel', 'Palestine', 'Lebanon'],
      center: { lat: 33.0, lng: 36.0 },
      riskLevel: 'HIGH'
    },
    'East Asia': {
      countries: ['China', 'Taiwan', 'North Korea', 'South Korea'],
      center: { lat: 35.0, lng: 120.0 },
      riskLevel: 'HIGH'
    },
    'South Asia': {
      countries: ['Afghanistan', 'Pakistan', 'India', 'Myanmar'],
      center: { lat: 30.0, lng: 75.0 },
      riskLevel: 'MEDIUM'
    },
    'Africa': {
      countries: ['Sudan', 'Somalia', 'Mali', 'Niger', 'Ethiopia'],
      center: { lat: 10.0, lng: 20.0 },
      riskLevel: 'MEDIUM'
    }
  };

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCrisisAlerts(): Promise<CrisisAlert[]> {
    const cacheKey = 'crisis_alerts';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const alerts = await Promise.all([
        this.generateMilitaryAlerts(),
        this.generateEconomicAlerts(),
        this.generatePoliticalAlerts(),
        this.generateCyberAlerts()
      ]);

      const allAlerts = alerts.flat();
      this.setCachedData(cacheKey, allAlerts);
      return allAlerts;
    } catch (error) {
      console.error('Error fetching crisis alerts:', error);
      return this.generateSampleAlerts();
    }
  }

  async getEconomicIndicators(): Promise<EconomicIndicator[]> {
    const cacheKey = 'economic_indicators';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // In a real implementation, you'd fetch from World Bank API, IMF, etc.
      const indicators = this.generateEconomicSampleData();
      this.setCachedData(cacheKey, indicators);
      return indicators;
    } catch (error) {
      console.error('Error fetching economic indicators:', error);
      return this.generateEconomicSampleData();
    }
  }

  async getGeopoliticalTrends(): Promise<GeopoliticalTrend[]> {
    const cacheKey = 'geopolitical_trends';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const trends = this.generateTrendAnalysis();
      this.setCachedData(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      return this.generateTrendAnalysis();
    }
  }

  async getRegionalRiskAssessment(): Promise<{ [region: string]: { level: string; factors: string[] } }> {
    const cacheKey = 'regional_risk';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const assessment: { [region: string]: { level: string; factors: string[] } } = {};

    for (const [region, data] of Object.entries(this.conflictHotspots)) {
      assessment[region] = {
        level: data.riskLevel,
        factors: this.generateRiskFactors(region, data.countries)
      };
    }

    this.setCachedData(cacheKey, assessment);
    return assessment;
  }

  private async generateMilitaryAlerts(): Promise<CrisisAlert[]> {
    const now = new Date();
    return [
      {
        id: 'mil_001',
        title: 'NATO Increases Eastern Flank Presence',
        description: 'NATO announces deployment of additional troops to Eastern European member states',
        severity: 'HIGH' as const,
        location: 'Eastern Europe',
        coordinates: { lat: 52.0, lng: 20.0 },
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'MILITARY' as const,
        source: 'Defense Intelligence',
        confidence: 0.85,
        trends: ['military-buildup', 'nato-expansion']
      },
      {
        id: 'mil_002',
        title: 'Naval Exercise Activity Increases in South China Sea',
        description: 'Multiple nations conducting simultaneous naval exercises in disputed waters',
        severity: 'MEDIUM' as const,
        location: 'South China Sea',
        coordinates: { lat: 15.0, lng: 115.0 },
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        category: 'MILITARY' as const,
        source: 'Maritime Intelligence',
        confidence: 0.78,
        trends: ['naval-tensions', 'territorial-disputes']
      }
    ];
  }

  private async generateEconomicAlerts(): Promise<CrisisAlert[]> {
    const now = new Date();
    return [
      {
        id: 'econ_001',
        title: 'Energy Prices Surge Amid Supply Concerns',
        description: 'Global energy markets react to geopolitical tensions affecting supply chains',
        severity: 'HIGH' as const,
        location: 'Global',
        coordinates: { lat: 0, lng: 0 },
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        category: 'ECONOMIC' as const,
        source: 'Economic Intelligence',
        confidence: 0.92,
        trends: ['energy-crisis', 'supply-chain-disruption']
      }
    ];
  }

  private async generatePoliticalAlerts(): Promise<CrisisAlert[]> {
    const now = new Date();
    return [
      {
        id: 'pol_001',
        title: 'Diplomatic Relations Strain Between Regional Powers',
        description: 'Escalating diplomatic tensions following recent territorial incidents',
        severity: 'MEDIUM' as const,
        location: 'Asia-Pacific',
        coordinates: { lat: 25.0, lng: 120.0 },
        timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        category: 'POLITICAL' as const,
        source: 'Diplomatic Intelligence',
        confidence: 0.73,
        trends: ['diplomatic-crisis', 'regional-tensions']
      }
    ];
  }

  private async generateCyberAlerts(): Promise<CrisisAlert[]> {
    const now = new Date();
    return [
      {
        id: 'cyber_001',
        title: 'Critical Infrastructure Cyber Threats Detected',
        description: 'Increased cyber attack attempts targeting power grid and communication systems',
        severity: 'CRITICAL' as const,
        location: 'Multiple Regions',
        coordinates: { lat: 40.0, lng: -100.0 },
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        category: 'CYBER' as const,
        source: 'Cyber Intelligence',
        confidence: 0.88,
        trends: ['cyber-warfare', 'infrastructure-attacks']
      }
    ];
  }

  private generateSampleAlerts(): CrisisAlert[] {
    return [
      ...this.generateMilitaryAlerts(),
      ...this.generateEconomicAlerts(),
      ...this.generatePoliticalAlerts(),
      ...this.generateCyberAlerts()
    ].flat();
  }

  private generateEconomicSampleData(): EconomicIndicator[] {
    const now = new Date();
    return [
      {
        country: 'Global',
        indicator: 'Oil Price (Brent)',
        value: 89.50,
        change: 5.2,
        timestamp: now.toISOString(),
        impact: 'NEGATIVE'
      },
      {
        country: 'Ukraine',
        indicator: 'GDP Growth',
        value: -30.4,
        change: -25.8,
        timestamp: now.toISOString(),
        impact: 'NEGATIVE'
      },
      {
        country: 'Russia',
        indicator: 'Sanctions Impact Index',
        value: 78.3,
        change: 12.1,
        timestamp: now.toISOString(),
        impact: 'NEGATIVE'
      },
      {
        country: 'China',
        indicator: 'Manufacturing PMI',
        value: 49.2,
        change: -1.8,
        timestamp: now.toISOString(),
        impact: 'NEGATIVE'
      }
    ];
  }

  private generateTrendAnalysis(): GeopoliticalTrend[] {
    const now = new Date();
    return [
      {
        region: 'Eastern Europe',
        trend: 'Military Escalation',
        description: 'Continued military buildup and defensive positioning across the region',
        severity: SeverityLevel.Critical,
        timestamp: now.toISOString(),
        relatedCountries: ['Ukraine', 'Russia', 'Poland', 'Baltic States']
      },
      {
        region: 'Middle East',
        trend: 'Regional Proxy Conflicts',
        description: 'Increasing proxy warfare and sectarian tensions across multiple theaters',
        severity: SeverityLevel.High,
        timestamp: now.toISOString(),
        relatedCountries: ['Iran', 'Saudi Arabia', 'Israel', 'Syria', 'Yemen']
      },
      {
        region: 'Asia-Pacific',
        trend: 'Naval Power Competition',
        description: 'Growing naval presence and territorial assertiveness in disputed waters',
        severity: SeverityLevel.High,
        timestamp: now.toISOString(),
        relatedCountries: ['China', 'Taiwan', 'Philippines', 'Japan', 'Australia']
      },
      {
        region: 'Africa',
        trend: 'Democratic Backsliding',
        description: 'Increasing military coups and authoritarian consolidation',
        severity: SeverityLevel.Medium,
        timestamp: now.toISOString(),
        relatedCountries: ['Mali', 'Niger', 'Sudan', 'Myanmar']
      }
    ];
  }

  private generateRiskFactors(region: string, countries: string[]): string[] {
    const riskFactors: { [key: string]: string[] } = {
      'Eastern Europe': [
        'Active military conflict',
        'NATO-Russia tensions',
        'Energy supply disruptions',
        'Refugee crisis',
        'Nuclear facility risks'
      ],
      'Middle East': [
        'Sectarian conflicts',
        'Proxy warfare',
        'Oil supply vulnerabilities',
        'Terrorism threats',
        'Water scarcity'
      ],
      'East Asia': [
        'Taiwan Strait tensions',
        'North Korean nuclear program',
        'Trade war implications',
        'Territorial disputes',
        'Cyber warfare capabilities'
      ],
      'South Asia': [
        'Taliban governance issues',
        'Kashmir tensions',
        'Rohingya crisis',
        'Climate change impacts',
        'Nuclear proliferation risks'
      ],
      'Africa': [
        'Military coups',
        'Jihadist insurgencies',
        'Climate-induced migration',
        'Resource conflicts',
        'Weak governance structures'
      ]
    };

    return riskFactors[region] || ['General instability', 'Economic challenges', 'Political tensions'];
  }

  async convertCrisisAlertsToEvents(): Promise<ConflictEvent[]> {
    const alerts = await this.getCrisisAlerts();
    
    return alerts.map(alert => ({
      id: `crisis_${alert.id}`,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      coordinates: alert.coordinates,
      timestamp: alert.timestamp,
      severity: this.mapSeverity(alert.severity),
      eventType: this.mapEventType(alert.category),
      source: DataSource.Intelligence,
      fatalities: 0,
      actors: [alert.source],
      tags: alert.trends,
      verified: alert.confidence > 0.8
    }));
  }

  private mapSeverity(severity: string): SeverityLevel {
    switch (severity) {
      case 'CRITICAL': return SeverityLevel.Critical;
      case 'HIGH': return SeverityLevel.High;
      case 'MEDIUM': return SeverityLevel.Medium;
      case 'LOW': return SeverityLevel.Low;
      default: return SeverityLevel.Medium;
    }
  }

  private mapEventType(category: string): EventType {
    switch (category) {
      case 'MILITARY': return EventType.Battle;
      case 'POLITICAL': return EventType.Other;
      case 'ECONOMIC': return EventType.Other;
      case 'HUMANITARIAN': return EventType.Humanitarian;
      case 'CYBER': return EventType.CyberAttack;
      default: return EventType.Other;
    }
  }
}

export const crisisMonitorClient = new CrisisMonitorClient(); 