import { NextResponse } from 'next/server';
import { crisisMonitorClient } from '../../lib/api/crisis-monitor';

export async function GET() {
  try {
    console.log('Testing Crisis Monitor API...');
    
    // Test all crisis monitoring endpoints
    const [alerts, indicators, trends, riskAssessment, events] = await Promise.all([
      crisisMonitorClient.getCrisisAlerts(),
      crisisMonitorClient.getEconomicIndicators(),
      crisisMonitorClient.getGeopoliticalTrends(),
      crisisMonitorClient.getRegionalRiskAssessment(),
      crisisMonitorClient.convertCrisisAlertsToEvents()
    ]);

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        crisisAlerts: {
          count: alerts.length,
          alerts: alerts.slice(0, 5) // Show first 5 for testing
        },
        economicIndicators: {
          count: indicators.length,
          indicators: indicators
        },
        geopoliticalTrends: {
          count: trends.length,
          trends: trends
        },
        regionalRiskAssessment: riskAssessment,
        convertedEvents: {
          count: events.length,
          events: events.slice(0, 3) // Show first 3 for testing
        }
      },
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
        highRiskRegions: Object.entries(riskAssessment)
          .filter(([_, data]) => data.level === 'CRITICAL' || data.level === 'HIGH')
          .map(([region]) => region),
        economicConcerns: indicators.filter(i => i.impact === 'NEGATIVE').length
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Crisis Monitor API test failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch crisis monitoring data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 