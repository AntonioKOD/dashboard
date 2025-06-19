import { NextResponse } from 'next/server';
import { twitterClient } from '../../lib/api/twitter';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Cors = require('cors');

// Initializing the cors middleware
const _cors = Cors({
  methods: ['GET'],
});

// Helper method to wait for a middleware to execute before continuing
function _runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export async function GET(_request: Request) {
  try {
    console.log('Testing Twitter scraping integration...');
    
    // Test Twitter scraping
    const events = await twitterClient.getRecentEvents(30);
    
    return NextResponse.json({
      status: 'success',
      message: 'Twitter scraping is working correctly',
      configured: true,
      scrapingWorking: true,
      eventCount: events.length,
      sampleEvents: events.slice(0, 5).map(event => ({
        id: event.id,
        country: event.country,
        region: event.region,
        event_type: event.event_type,
        fatalities: event.fatalities,
        date: event.date,
        severity: event.severity,
        author: event.actor1,
        source: event.source,
        notes: event.notes ? event.notes.slice(0, 100) + '...' : 'No notes available'
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Twitter scraping test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: `Error testing Twitter scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
      configured: true,
      scrapingWorking: false
    });
  }
} 