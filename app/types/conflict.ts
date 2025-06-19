export interface ConflictEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
  severity: SeverityLevel;
  eventType: EventType;
  source: DataSource;
  fatalities: number;
  actors: string[];
  tags?: string[];
  sourceUrl?: string;
  verified?: boolean;
  // Legacy fields for compatibility
  date?: string;
  country?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  event_type?: EventType;
  sub_event_type?: string;
  actor1?: string;
  actor2?: string;
  notes?: string;
}

export interface CountryStats {
  country: string;
  totalEvents: number;
  totalFatalities: number;
  recentEvents: number;
  severityBreakdown: Record<SeverityLevel, number>;
  eventTypeBreakdown: Record<EventType, number>;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface RegionalSummary {
  region: string;
  countries: string[];
  totalEvents: number;
  totalFatalities: number;
  averageSeverity: number;
  lastUpdated: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  type: AlertType;
  conditions: AlertCondition[];
  isActive: boolean;
  recipients: string[];
  createdAt: string;
}

export interface AlertCondition {
  field: keyof ConflictEvent;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface DashboardMetrics {
  totalEventsToday: number;
  totalFatalitiesToday: number;
  activeConflicts: number;
  criticalAlerts: number;
  dataLastUpdated: string;
  globalThreatLevel: ThreatLevel;
  percentageChanges?: {
    events: number;
    fatalities: number;
    activeConflicts: number;
    criticalAlerts: number;
  };
}

export enum EventType {
  Battle = 'Battle',
  Bombing = 'Bombing',
  ViolenceAgainstCivilians = 'Violence against civilians',
  CyberAttack = 'Cyber attack',
  Humanitarian = 'Humanitarian crisis',
  Other = 'Other',
  // Legacy types for compatibility
  ArmedClash = 'Armed clash',
  Attack = 'Attack',
  Airstrike = 'Airstrike',
  DroneStrike = 'Drone strike',
  Protest = 'Protest',
  Riot = 'Riot',
  StrategicDevelopment = 'Strategic development'
}

export enum SeverityLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export type ThreatLevel = 'minimal' | 'elevated' | 'high' | 'severe' | 'critical';

export enum DataSource {
  ACLED = 'ACLED',
  Twitter = 'Twitter',
  News = 'News',
  Intelligence = 'Intelligence',
  Manual = 'Manual',
  CrisisWatch = 'CrisisWatch'
}

export type AlertType = 'threshold' | 'pattern' | 'geographic' | 'escalation';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d' | 'all';

export interface FilterOptions {
  countries: string[];
  eventTypes: EventType[];
  severityLevels: SeverityLevel[];
  dateRange: {
    start: string;
    end: string;
  };
  minFatalities: number;
  sources: DataSource[];
} 