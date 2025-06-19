import { clsx, type ClassValue } from "clsx";
import { format, subDays, isAfter, isBefore } from "date-fns";
import { ConflictEvent, SeverityLevel, ThreatLevel, CountryStats, EventType } from "../types/conflict";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, formatStr: string = "MMM dd, yyyy HH:mm"): string {
  try {
    // Handle null, undefined, or empty string dates
    if (!date) {
      return 'Unknown date';
    }
    
    const dateObj = new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDate:', date);
      return 'Invalid date';
    }
    
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error, 'Date value:', date);
    return 'Invalid date';
  }
}

export function calculateSeverity(event: ConflictEvent): SeverityLevel {
  const fatalities = event.fatalities || 0;
  const eventType = event.event_type || event.eventType;
  
  // Enhanced severity calculation with multiple factors
  let severityScore = 0;
  
  // Fatality-based scoring (0-40 points)
  if (fatalities >= 100) severityScore += 40;
  else if (fatalities >= 50) severityScore += 35;
  else if (fatalities >= 25) severityScore += 30;
  else if (fatalities >= 10) severityScore += 25;
  else if (fatalities >= 5) severityScore += 20;
  else if (fatalities >= 1) severityScore += 15;
  else severityScore += 5; // Even zero-fatality events have some severity
  
  // Event type-based scoring (0-30 points)
  if (eventType) {
    const typeStr = eventType.toString().toLowerCase();
    if (typeStr.includes('bombing') || typeStr.includes('airstrike') || typeStr.includes('explosion')) {
      severityScore += 30;
    } else if (typeStr.includes('battle') || typeStr.includes('armed clash') || typeStr.includes('clash')) {
      severityScore += 25;
    } else if (typeStr.includes('attack') || typeStr.includes('violence against civilians')) {
      severityScore += 20;
    } else if (typeStr.includes('drone strike') || typeStr.includes('missile')) {
      severityScore += 25;
    } else if (typeStr.includes('cyber attack')) {
      severityScore += 15;
    } else {
      severityScore += 10; // Default for other event types
    }
  } else {
    severityScore += 5; // Minimal score for unknown event type
  }
  
  // Additional factors (0-30 points)
  // Source reliability
  const source = event.source;
  if (source === 'ACLED' || source === 'Intelligence') {
    severityScore += 10; // Reliable sources
  } else if (source === 'News') {
    severityScore += 8;
  } else if (source === 'Twitter') {
    severityScore += 5; // Less reliable
  }
  
  // Verification status
  if (event.verified) {
    severityScore += 10;
  }
  
  // Recent events are more severe
  const timestamp = event.timestamp || event.date;
  if (timestamp) {
    const eventDate = new Date(timestamp);
    const hoursAgo = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 6) severityScore += 10;
    else if (hoursAgo <= 24) severityScore += 5;
  }
  
  // Convert score to severity level (0-100 scale)
  if (severityScore >= 75) return 'critical';
  else if (severityScore >= 55) return 'high';
  else if (severityScore >= 35) return 'medium';
  else return 'low';
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

  return events.filter(event => {
    try {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) return false;
      return isAfter(eventDate, startDate);
    } catch (error) {
      console.warn('Error filtering event by date:', error, 'Event:', event);
      return false;
    }
  });
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
  try {
    if (!date) return false;
    
    const today = new Date();
    const eventDate = new Date(date);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      return false;
    }
    
    return today.toDateString() === eventDate.toDateString();
  } catch (error) {
    console.warn('Error checking if date is today:', error, 'Date value:', date);
    return false;
  }
}

export function isYesterday(date: string | Date): boolean {
  try {
    if (!date) return false;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const eventDate = new Date(date);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      return false;
    }
    
    return yesterday.toDateString() === eventDate.toDateString();
  } catch (error) {
    console.warn('Error checking if date is yesterday:', error, 'Date value:', date);
    return false;
  }
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
    const dateStr = getEventDate(event);
    if (!dateStr) return false;
    
    try {
      const eventDate = new Date(dateStr);
      if (isNaN(eventDate.getTime())) return false;
      return eventDate >= start && eventDate <= end;
    } catch (error) {
      return false;
    }
  });
}

// Utility function to safely get event date
export function getEventDate(event: ConflictEvent): string | null {
  return event.timestamp || event.date || null;
} 