import { NextResponse } from 'next/server';
import { acledClient } from '../../lib/api/acled';

export async function GET() {
  try {
    console.log('Testing ACLED integration...');
    
    // Test ACLED client
    const events = await acledClient.getAllActiveConflicts();
    
    return NextResponse.json({
      status: 'success',
      message: 'ACLED integration is working correctly',
      configured: acledClient.isConfigured(),
      apiWorking: true,
      eventCount: events.length,
      sampleEvents: events.slice(0, 3).map(event => ({
        id: event.id,
        country: event.country,
        region: event.region,
        event_type: event.event_type,
        fatalities: event.fatalities,
        date: event.date,
        severity: event.severity,
        source: event.source
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('ACLED test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: `Error testing ACLED: ${error instanceof Error ? error.message : 'Unknown error'}`,
      configured: acledClient.isConfigured(),
      apiWorking: false
    });
  }
} 