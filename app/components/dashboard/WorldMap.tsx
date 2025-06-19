'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ConflictEvent, SeverityLevel } from '../../types/conflict';
import { Card } from '../ui/Card';

interface WorldMapProps {
  events: ConflictEvent[];
}

export function WorldMap({ events }: WorldMapProps) {
  const [filter, setFilter] = useState<SeverityLevel | 'all'>('all');

  // Dynamic import of Leaflet map to avoid SSR issues
  const LeafletMap = useMemo(() => dynamic(
    () => import('./LeafletMap'),
    {
      loading: () => (
        <div className="w-full h-96 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto mb-2"></div>
            <p className="text-slate-400 text-sm">Loading map...</p>
          </div>
        </div>
      ),
      ssr: false
    }
  ), []);

  const filteredEvents = events.filter(event => 
    filter === 'all' || event.severity === filter
  );

  return (
    <Card 
      title="Global Conflict Map"
      subtitle="Real-time visualization of conflict events"
      actions={
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as SeverityLevel | 'all')}
          className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <option value="all">All Events</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      }
    >
      <LeafletMap events={filteredEvents} filter={filter} />
      
      <div className="mt-4 text-xs text-slate-500 text-center">
        Showing {filteredEvents.length} of {events.length} events
        {filteredEvents.length !== events.length && ` (filtered by ${filter})`}
      </div>
    </Card>
  );
} 