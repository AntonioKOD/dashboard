import { clsx, type ClassValue } from "clsx";
import { format, subDays, isAfter, isBefore } from "date-fns";
import { ConflictEvent, SeverityLevel, ThreatLevel, CountryStats, EventType } from "../types/conflict";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, formatStr: string = "MMM dd, yyyy HH:mm"): string {
  return format(new Date(date), formatStr);
}

export function calculateSeverity(event: ConflictEvent): SeverityLevel {
  const { fatalities, event_type } = event;
  
  // Base severity on fatalities and event type
  if (fatalities >= 50 || event_type === 'Bombing' || event_type === 'Airstrike') {
    return 'critical';
  } else if (fatalities >= 10 || event_type === 'Armed clash' || event_type === 'Battle') {
    return 'high';
  } else if (fatalities >= 1 || event_type === 'Attack' || event_type === 'Violence against civilians') {
    return 'medium';
  }
  return 'low';
}

export function getSeverityColor(severity: SeverityLevel): string {
  const colors = {
    critical: '#dc2626', // red-600
    high: '#f59e0b',     // amber-500
    medium: '#f97316',   // orange-500
    low: '#10b981'       // emerald-500
  };
  return colors[severity];
}

export function getThreatLevelColor(level: ThreatLevel): string {
  const colors = {
    minimal: '#10b981',   // emerald-500
    elevated: '#f59e0b',  // amber-500
    high: '#f97316',      // orange-500
    severe: '#dc2626',    // red-600
    critical: '#991b1b'   // red-800
  };
  return colors[level];
}

export function filterEventsByTimeRange(events: ConflictEvent[], timeRange: string): ConflictEvent[] {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '1h':
      startDate = subDays(now, 0);
      startDate.setHours(now.getHours() - 1);
      break;
    case '6h':
      startDate = subDays(now, 0);
      startDate.setHours(now.getHours() - 6);
      break;
    case '24h':
      startDate = subDays(now, 1);
      break;
    case '7d':
      startDate = subDays(now, 7);
      break;
    case '30d':
      startDate = subDays(now, 30);
      break;
    case '90d':
      startDate = subDays(now, 90);
      break;
    default:
      return events;
  }

  return events.filter(event => isAfter(new Date(event.date), startDate));
}

export function calculateCountryStats(events: ConflictEvent[], country: string): CountryStats {
  const countryEvents = events.filter(event => event.country === country);
  const recentEvents = filterEventsByTimeRange(countryEvents, '24h');
  
  const severityBreakdown = countryEvents.reduce((acc, event) => {
    const severity = calculateSeverity(event);
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<SeverityLevel, number>);

  const eventTypeBreakdown = countryEvents.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<EventType, number>);

  // Simple trend calculation based on recent vs historical events
  const historicalAvg = countryEvents.length / 30; // assuming 30-day average
  const recentAvg = recentEvents.length;
  const trend = recentAvg > historicalAvg * 1.2 ? 'increasing' : 
                recentAvg < historicalAvg * 0.8 ? 'decreasing' : 'stable';

  return {
    country,
    totalEvents: countryEvents.length,
    totalFatalities: countryEvents.reduce((sum, event) => sum + event.fatalities, 0),
    recentEvents: recentEvents.length,
    severityBreakdown,
    eventTypeBreakdown,
    trend
  };
}

export function calculateGlobalThreatLevel(events: ConflictEvent[]): ThreatLevel {
  const recentEvents = filterEventsByTimeRange(events, '24h');
  const totalFatalities = recentEvents.reduce((sum, event) => sum + event.fatalities, 0);
  const criticalEvents = recentEvents.filter(event => calculateSeverity(event) === 'critical').length;
  
  if (criticalEvents >= 5 || totalFatalities >= 200) {
    return 'critical';
  } else if (criticalEvents >= 3 || totalFatalities >= 100) {
    return 'severe';
  } else if (criticalEvents >= 1 || totalFatalities >= 50) {
    return 'high';
  } else if (recentEvents.length >= 10) {
    return 'elevated';
  }
  return 'minimal';
}

export function generateMockEvents(): ConflictEvent[] {
  const countries = ['Ukraine', 'Syria', 'Yemen', 'Myanmar', 'Afghanistan', 'Sudan', 'Ethiopia', 'Iraq'];
  const eventTypes: EventType[] = ['Armed clash', 'Attack', 'Airstrike', 'Bombing', 'Drone strike', 'Battle'];
  const sources = ['ACLED', 'Twitter', 'News'] as const;
  
  const events: ConflictEvent[] = [];
  
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setHours(date.getHours() - Math.random() * 168); // Last 7 days
    
    const country = countries[Math.floor(Math.random() * countries.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const fatalities = Math.floor(Math.random() * 25);
    
    const event: ConflictEvent = {
      id: `event_${i}`,
      date: date.toISOString(),
      country,
      region: getRegionForCountry(country),
      latitude: 35 + Math.random() * 30,
      longitude: 20 + Math.random() * 60,
      event_type: eventType,
      sub_event_type: eventType,
      actor1: `Armed Group ${Math.floor(Math.random() * 10)}`,
      actor2: Math.random() > 0.5 ? `Government Forces` : undefined,
      fatalities,
      source: sources[Math.floor(Math.random() * sources.length)],
      notes: `Conflict event in ${country}`,
      severity: 'low' as SeverityLevel, // Will be calculated
      timestamp: new Date().toISOString()
    };
    
    event.severity = calculateSeverity(event);
    events.push(event);
  }
  
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getRegionForCountry(country: string): string {
  const regions = {
    'Ukraine': 'Eastern Europe',
    'Syria': 'Middle East',
    'Yemen': 'Middle East',
    'Myanmar': 'Southeast Asia',
    'Afghanistan': 'Central Asia',
    'Sudan': 'North Africa',
    'Ethiopia': 'East Africa',
    'Iraq': 'Middle East'
  };
  return regions[country as keyof typeof regions] || 'Unknown';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// New utility functions for metrics calculations
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export function formatPercentageChange(change: number): string {
  const absChange = Math.abs(change);
  const sign = change >= 0 ? '+' : '-';
  return `${sign}${absChange.toFixed(1)}%`;
}

export function isToday(date: string | Date): boolean {
  const today = new Date();
  const eventDate = new Date(date);
  return today.toDateString() === eventDate.toDateString();
}

export function isYesterday(date: string | Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const eventDate = new Date(date);
  return yesterday.toDateString() === eventDate.toDateString();
}

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function filterEventsByDateRange(events: ConflictEvent[], start: Date, end: Date): ConflictEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= start && eventDate <= end;
  });
} 