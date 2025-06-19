'use client';

import { useState, useEffect } from 'react';
import { Header } from './components/dashboard/Header';
import { MetricsOverview } from './components/dashboard/MetricsOverview';
import { WorldMap } from './components/dashboard/WorldMap';
import { EventFeed } from './components/dashboard/EventFeed';
import { CoffeeButton } from './components/ui/CoffeeButton';
import { ConflictEvent, DashboardMetrics } from './types/conflict';
import { conflictDataAggregator } from './lib/api/aggregator';

export default function DashboardPage() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with live data using parallel fetching
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      
      try {
        console.log('Starting dashboard initialization...');
        
        // Parallel data fetching for better performance
        const [liveEvents, dashboardMetrics] = await Promise.all([
          conflictDataAggregator.getAllConflictEvents(),
          conflictDataAggregator.getDashboardMetrics()
        ]);

        console.log(`Loaded ${liveEvents.length} events for dashboard`);
        setEvents(liveEvents);
        setMetrics(dashboardMetrics);
      } catch (error) {
        console.error('Failed to load live data:', error);
        // Fallback to empty array if APIs fail
        setEvents([]);
        setMetrics({
          totalEventsToday: 0,
          totalFatalitiesToday: 0,
          activeConflicts: 0,
          criticalAlerts: 0,
          dataLastUpdated: new Date().toISOString(),
          globalThreatLevel: 'minimal'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();

    // Set up periodic data refresh (every 5 minutes for live data)
    const interval = setInterval(async () => {
      try {
        console.log('Refreshing dashboard data...');
        
        // Force refresh and parallel fetch
        const [freshEvents, freshMetrics] = await Promise.all([
          conflictDataAggregator.getAllConflictEvents(true),
          conflictDataAggregator.getDashboardMetrics()
        ]);
        
        console.log(`Refreshed with ${freshEvents.length} events`);
        setEvents(freshEvents);
        setMetrics(freshMetrics);
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">Loading WW3 Dashboard</h2>
          <p className="text-slate-400 mb-4">Fetching real-time conflict data from global sources...</p>
          
                  <div className="space-y-2 text-sm text-slate-500">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Connecting to ACLED API</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
            <span>Scraping Twitter for breaking news</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse delay-300"></div>
            <span>Monitoring live news feeds (Israel-Iran conflict)</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-450"></div>
            <span>Processing conflict events</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-600"></div>
            <span>Calculating threat metrics</span>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header 
        threatLevel={metrics.globalThreatLevel}
        activeAlerts={metrics.criticalAlerts}
        lastUpdated={metrics.dataLastUpdated}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Emergency Alert Banner */}
        {metrics.globalThreatLevel === 'critical' && (
          <div className="mb-8 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-red-400">Critical Global Threat Level</h3>
            </div>
            <p className="text-red-300 mt-1">
              Multiple high-severity conflicts detected. Enhanced monitoring active.
            </p>
          </div>
        )}

        {/* Metrics Overview */}
        <div className="mb-8">
          <MetricsOverview metrics={metrics} />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* World Map - Takes up 2 columns on xl screens */}
          <div className="xl:col-span-2">
            <WorldMap events={events} />
          </div>

          {/* Event Feed - Takes up 1 column */}
          <div className="xl:col-span-1">
            <EventFeed events={events} />
          </div>
        </div>

        {/* Additional Sections */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Regional Analysis Placeholder */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Regional Analysis</h3>
            <div className="text-center py-8 text-slate-400">
              <p>Regional conflict analysis coming soon...</p>
              <p className="text-sm mt-2">Integration with UCDP and ACLED APIs in progress</p>
            </div>
          </div>

          {/* Trends & Analytics Placeholder */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Trend Analytics</h3>
            <div className="text-center py-8 text-slate-400">
              <p>Conflict trend charts coming soon...</p>
              <p className="text-sm mt-2">Historical analysis and forecasting tools</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-700 pt-8">
          <div className="text-center text-slate-500 text-sm space-y-4">
            <p>WW3 Dashboard • Global Conflict Monitoring System</p>
            <p>
              Data sources: ACLED, Twitter, News RSS • 
              <span className="ml-2">Last updated: {new Date().toLocaleTimeString()}</span>
            </p>
            
            {/* Support Section */}
            <div className="flex flex-col items-center space-y-3 pt-4 border-t border-slate-800">
              <p className="text-slate-400">This is a free, open-source project providing real-time global conflict intelligence</p>
              <a
                href="https://coff.ee/codewithtoni"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 2h-13C4.12 2 3 3.12 3 4.5S4.12 7 5.5 7h1.75l1.26 10.1c.09.73.69 1.29 1.42 1.39.06.01.12.01.18.01h5.78c.73 0 1.36-.53 1.49-1.25L18.5 7h1.75c1.38 0 2.5-1.12 2.5-2.5S21.63 2 20.25 2h-1.75zM16.5 5.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5zm-2 0c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5zm-2 0c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5zm-2 0c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5zm-2 0c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5z"/>
                </svg>
                <span className="font-medium">Buy me a coffee</span>
              </a>
              <p className="text-xs text-slate-600">Support the development and hosting of this dashboard</p>
            </div>
          </div>
        </footer>
      </main>
      
      {/* Floating Coffee Button */}
      <CoffeeButton />
    </div>
  );
}
