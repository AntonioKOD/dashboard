export interface ConflictEvent {
  id: string;
  date: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  event_type: EventType;
  sub_event_type: string;
  actor1: string;
  actor2?: string;
  fatalities: number;
  source: DataSource;
  notes: string;
  severity: SeverityLevel;
  timestamp: string;
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

export type EventType = 
  | 'Armed clash'
  | 'Attack'
  | 'Airstrike'
  | 'Bombing'
  | 'Drone strike'
  | 'Protest'
  | 'Riot'
  | 'Strategic development'
  | 'Battle'
  | 'Violence against civilians';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ThreatLevel = 'minimal' | 'elevated' | 'high' | 'severe' | 'critical';

export type DataSource = 'ACLED' | 'Twitter' | 'News' | 'Manual' | 'CrisisWatch';

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