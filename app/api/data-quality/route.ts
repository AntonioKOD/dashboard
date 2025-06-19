import { NextResponse } from 'next/server';
import { ConflictDataAggregator } from '../../lib/api/aggregator';

const aggregator = new ConflictDataAggregator();

export async function GET() {
  try {
    console.log('Generating data quality report...');
    
    // Get all events for analysis
    const events = await aggregator.getAllConflictEvents();
    
    // Data quality metrics
    const qualityMetrics = {
      totalEvents: events.length,
      dataCompleteness: calculateDataCompleteness(events),
      dataAccuracy: calculateDataAccuracy(events),
      sourceDistribution: calculateSourceDistribution(events),
      severityDistribution: calculateSeverityDistribution(events),
      geographicCoverage: calculateGeographicCoverage(events),
      temporalCoverage: calculateTemporalCoverage(events),
      validationResults: performValidationChecks(events),
      qualityScore: 0 // Will be calculated
    };
    
    // Calculate overall quality score
    qualityMetrics.qualityScore = calculateOverallQualityScore(qualityMetrics);
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Data quality report generated successfully',
      data: qualityMetrics,
      recommendations: generateQualityRecommendations(qualityMetrics)
    });
    
  } catch (error) {
    console.error('Error generating data quality report:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to generate data quality report',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateDataCompleteness(events: any[]): any {
  const completeness = {
    location: 0,
    coordinates: 0,
    timestamp: 0,
    eventType: 0,
    source: 0,
    severity: 0,
    actors: 0,
    overall: 0
  };
  
  if (events.length === 0) return completeness;
  
  events.forEach(event => {
    if (event.location && event.location !== 'INVALID') completeness.location++;
    if ((event.coordinates?.lat || event.latitude) && (event.coordinates?.lng || event.longitude)) completeness.coordinates++;
    if (event.timestamp || event.date) completeness.timestamp++;
    if (event.eventType || event.event_type) completeness.eventType++;
    if (event.source) completeness.source++;
    if (event.severity) completeness.severity++;
    if (event.actors?.length > 0 || event.actor1) completeness.actors++;
  });
  
  // Convert to percentages
  (Object.keys(completeness) as Array<keyof typeof completeness>).forEach(key => {
    if (key !== 'overall') {
      completeness[key] = Math.round((completeness[key] / events.length) * 100);
    }
  });
  
  // Calculate overall completeness
  const fields: Array<keyof typeof completeness> = ['location', 'coordinates', 'timestamp', 'eventType', 'source', 'severity', 'actors'];
  completeness.overall = Math.round(fields.reduce((sum, field) => sum + completeness[field], 0) / fields.length);
  
  return completeness;
}

function calculateDataAccuracy(events: any[]): any {
  const accuracy = {
    validCoordinates: 0,
    validTimestamps: 0,
    validSeverity: 0,
    validEventTypes: 0,
    verifiedEvents: 0,
    overall: 0
  };
  
  if (events.length === 0) return accuracy;
  
  events.forEach(event => {
    // Check coordinate validity
    const lat = event.coordinates?.lat || event.latitude || 0;
    const lng = event.coordinates?.lng || event.longitude || 0;
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
      accuracy.validCoordinates++;
    }
    
    // Check timestamp validity
    const timestamp = event.timestamp || event.date;
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime()) && date <= new Date()) {
        accuracy.validTimestamps++;
      }
    }
    
    // Check severity validity
    if (['low', 'medium', 'high', 'critical'].includes(event.severity)) {
      accuracy.validSeverity++;
    }
    
    // Check event type validity
    if (event.eventType || event.event_type) {
      accuracy.validEventTypes++;
    }
    
    // Check verification status
    if (event.verified === true) {
      accuracy.verifiedEvents++;
    }
  });
  
  // Convert to percentages
  (Object.keys(accuracy) as Array<keyof typeof accuracy>).forEach(key => {
    if (key !== 'overall') {
      accuracy[key] = Math.round((accuracy[key] / events.length) * 100);
    }
  });
  
  // Calculate overall accuracy
  const fields: Array<keyof typeof accuracy> = ['validCoordinates', 'validTimestamps', 'validSeverity', 'validEventTypes'];
  accuracy.overall = Math.round(fields.reduce((sum, field) => sum + accuracy[field], 0) / fields.length);
  
  return accuracy;
}

function calculateSourceDistribution(events: any[]): any {
  const distribution: { [key: string]: number } = {};
  
  events.forEach(event => {
    const source = event.source || 'Unknown';
    distribution[source] = (distribution[source] || 0) + 1;
  });
  
  // Convert to percentages
  const total = events.length;
  Object.keys(distribution).forEach(source => {
    distribution[source] = Math.round((distribution[source] / total) * 100);
  });
  
  return distribution;
}

function calculateSeverityDistribution(events: any[]): any {
  const distribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  events.forEach(event => {
    const severity = event.severity || 'low';
    if (severity in distribution) {
      distribution[severity as keyof typeof distribution]++;
    }
  });
  
  // Convert to percentages
  const total = events.length;
  (Object.keys(distribution) as Array<keyof typeof distribution>).forEach(severity => {
    distribution[severity] = Math.round((distribution[severity] / total) * 100);
  });
  
  return distribution;
}

function calculateGeographicCoverage(events: any[]): any {
  const countries = new Set();
  const regions = new Set();
  
  events.forEach(event => {
    const location = event.location || event.country;
    if (location && location !== 'INVALID' && location !== 'Unknown') {
      countries.add(location);
    }
    
    const region = event.region;
    if (region && region !== 'Unknown') {
      regions.add(region);
    }
  });
  
  return {
    uniqueCountries: countries.size,
    uniqueRegions: regions.size,
    countriesList: Array.from(countries).slice(0, 10), // Top 10
    regionsList: Array.from(regions)
  };
}

function calculateTemporalCoverage(events: any[]): any {
  const timestamps = events
    .map(event => event.timestamp || event.date)
    .filter(Boolean)
    .map(ts => new Date(ts))
    .filter(date => !isNaN(date.getTime()));
  
  if (timestamps.length === 0) {
    return {
      earliestEvent: null,
      latestEvent: null,
      timeSpanHours: 0,
      eventsLast24h: 0,
      eventsLast7d: 0
    };
  }
  
  timestamps.sort((a, b) => a.getTime() - b.getTime());
  
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    earliestEvent: timestamps[0].toISOString(),
    latestEvent: timestamps[timestamps.length - 1].toISOString(),
    timeSpanHours: Math.round((timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime()) / (1000 * 60 * 60)),
    eventsLast24h: timestamps.filter(ts => ts > last24h).length,
    eventsLast7d: timestamps.filter(ts => ts > last7d).length
  };
}

function performValidationChecks(events: any[]): any {
  const checks = {
    duplicateEvents: findDuplicateEvents(events),
    invalidCoordinates: findInvalidCoordinates(events),
    missingCriticalFields: findMissingCriticalFields(events),
    inconsistentData: findInconsistentData(events),
    outliers: findOutliers(events)
  };
  
  return checks;
}

function findDuplicateEvents(events: any[]): any {
  const seen = new Map();
  const duplicates: any[] = [];
  
  events.forEach(event => {
    const key = `${event.location}_${event.timestamp}_${event.eventType || event.event_type}`;
    if (seen.has(key)) {
      duplicates.push({
        original: seen.get(key),
        duplicate: event.id,
        key
      });
    } else {
      seen.set(key, event.id);
    }
  });
  
  return {
    count: duplicates.length,
    percentage: Math.round((duplicates.length / events.length) * 100),
    examples: duplicates.slice(0, 5)
  };
}

function findInvalidCoordinates(events: any[]): any {
  const invalid = events.filter(event => {
    const lat = event.coordinates?.lat || event.latitude || 0;
    const lng = event.coordinates?.lng || event.longitude || 0;
    return lat < -90 || lat > 90 || lng < -180 || lng > 180;
  });
  
  return {
    count: invalid.length,
    percentage: Math.round((invalid.length / events.length) * 100),
    examples: invalid.slice(0, 3).map(e => ({ id: e.id, lat: e.latitude, lng: e.longitude }))
  };
}

function findMissingCriticalFields(events: any[]): any {
  const missing = {
    location: events.filter(e => !e.location && !e.country).length,
    timestamp: events.filter(e => !e.timestamp && !e.date).length,
    eventType: events.filter(e => !e.eventType && !e.event_type).length,
    source: events.filter(e => !e.source).length
  };
  
  (Object.keys(missing) as Array<keyof typeof missing>).forEach(field => {
    const count = missing[field];
    missing[field] = {
      count,
      percentage: Math.round((count / events.length) * 100)
    } as any;
  });
  
  return missing;
}

function findInconsistentData(events: any[]): any {
  const inconsistent = events.filter(event => {
    // Check if severity matches fatality count
    const fatalities = event.fatalities || 0;
    const severity = event.severity;
    
    if (fatalities >= 50 && severity !== 'critical') return true;
    if (fatalities === 0 && severity === 'critical') return true;
    
    return false;
  });
  
  return {
    count: inconsistent.length,
    percentage: Math.round((inconsistent.length / events.length) * 100),
    examples: inconsistent.slice(0, 3).map(e => ({ 
      id: e.id, 
      fatalities: e.fatalities, 
      severity: e.severity 
    }))
  };
}

function findOutliers(events: any[]): any {
  const fatalities = events.map(e => e.fatalities || 0).filter(f => f > 0);
  
  if (fatalities.length === 0) {
    return { count: 0, percentage: 0, examples: [] };
  }
  
  fatalities.sort((a, b) => a - b);
  const q3 = fatalities[Math.floor(fatalities.length * 0.75)];
  const q1 = fatalities[Math.floor(fatalities.length * 0.25)];
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers = events.filter(e => (e.fatalities || 0) > upperBound);
  
  return {
    count: outliers.length,
    percentage: Math.round((outliers.length / events.length) * 100),
    threshold: upperBound,
    examples: outliers.slice(0, 3).map(e => ({ 
      id: e.id, 
      fatalities: e.fatalities, 
      location: e.location || e.country 
    }))
  };
}

function calculateOverallQualityScore(metrics: any): number {
  const weights = {
    completeness: 0.3,
    accuracy: 0.3,
    validity: 0.2,
    consistency: 0.2
  };
  
  const scores = {
    completeness: metrics.dataCompleteness.overall,
    accuracy: metrics.dataAccuracy.overall,
    validity: 100 - metrics.validationResults.invalidCoordinates.percentage,
    consistency: 100 - metrics.validationResults.inconsistentData.percentage
  };
  
  const weightedScore = (Object.keys(weights) as Array<keyof typeof weights>).reduce((sum, key) => {
    return sum + (scores[key] * weights[key]);
  }, 0);
  
  return Math.round(weightedScore);
}

function generateQualityRecommendations(metrics: any): string[] {
  const recommendations = [];
  
  if (metrics.dataCompleteness.overall < 80) {
    recommendations.push('Improve data completeness by enhancing data collection processes');
  }
  
  if (metrics.dataAccuracy.overall < 85) {
    recommendations.push('Implement stricter data validation rules to improve accuracy');
  }
  
  if (metrics.validationResults.duplicateEvents.percentage > 5) {
    recommendations.push('Enhance deduplication algorithms to reduce duplicate events');
  }
  
  if (metrics.validationResults.invalidCoordinates.percentage > 2) {
    recommendations.push('Improve coordinate validation and geocoding processes');
  }
  
  if (metrics.qualityScore < 70) {
    recommendations.push('Overall data quality needs significant improvement');
  } else if (metrics.qualityScore < 85) {
    recommendations.push('Data quality is good but has room for improvement');
  } else {
    recommendations.push('Excellent data quality - maintain current standards');
  }
  
  return recommendations;
} 