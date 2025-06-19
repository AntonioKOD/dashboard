import { NextResponse } from 'next/server';
import { newsScraperClient } from '../../lib/api/news-scraper';

export async function GET() {
  try {
    console.log('Testing news scraping integration...');
    
    // Test news scraping
    const events = await newsScraperClient.getRecentEvents(24);
    
    return NextResponse.json({
      status: 'success',
      message: 'News scraping is working correctly',
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
        actor1: event.actor1,
        source: event.source,
        notes: event.notes ? event.notes.slice(0, 150) + '...' : 'No notes available'
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('News scraping test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: `Error testing news scraping: ${error instanceof Error ? error.message : 'Unknown error'}`,
      configured: true,
      scrapingWorking: false
    });
  }
} 