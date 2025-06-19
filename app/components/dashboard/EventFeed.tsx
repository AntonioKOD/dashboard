'use client';

import { useState } from 'react';
import { Clock, MapPin, Users, Filter, MoreHorizontal } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConflictEvent, EventType, SeverityLevel } from '../../types/conflict';
import { formatDate, getSeverityColor } from '../../lib/utils';

interface EventFeedProps {
  events: ConflictEvent[];
  maxEvents?: number;
}

export function EventFeed({ events, maxEvents = 20 }: EventFeedProps) {
  const [filter, setFilter] = useState<SeverityLevel | 'all'>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const filteredEvents = events
    .filter(event => filter === 'all' || event.severity === filter)
    .slice(0, maxEvents);

  const getEventIcon = (eventType: EventType) => {
    // Return appropriate icon based on event type
    return <MapPin className="w-4 h-4" />;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffMs = now.getTime() - eventDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Card title="Live Event Feed" subtitle="Real-time conflict monitoring">
      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
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
        </div>
        <div className="text-xs text-slate-500">
          {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Event List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="border border-slate-700 rounded-lg p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
            onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div 
                  className="p-1.5 rounded-full"
                  style={{ backgroundColor: `${getSeverityColor(event.severity)}20` }}
                >
                  {getEventIcon(event.event_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-slate-200 truncate">
                      {event.event_type} in {event.country}
                    </h4>
                    <Badge variant="severity" severity={event.severity}>
                      {event.severity}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-slate-400 mb-2">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{event.region}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{event.fatalities} fatalities</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(event.date)}</span>
                    </div>
                  </div>

                  {expandedEvent === event.id && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-sm text-slate-300 mb-2">
                        <strong>Actors:</strong> {event.actor1}
                        {event.actor2 && ` vs ${event.actor2}`}
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        <strong>Source:</strong> {event.source}
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        <strong>Location:</strong> {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </div>
                      <div className="text-sm text-slate-400">
                        <strong>Time:</strong> {formatDate(event.date)}
                      </div>
                      {event.notes && (
                        <div className="text-sm text-slate-400 mt-2">
                          <strong>Notes:</strong> {event.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No events match the selected filter</p>
        </div>
      )}
    </Card>
  );
} 