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

  // Filter events - be more lenient to show all available news
  const validEvents = (events || []).filter(event => 
    event && 
    (event.id || event.title) && 
    (event.event_type || event.title || event.description)
  );

  const filteredEvents = validEvents
    .filter(event => filter === 'all' || event.severity === filter)
    .slice(0, maxEvents);

  // Show loading state if no events yet
  if (validEvents.length === 0) {
    return (
      <Card title="Live Event Feed" subtitle="Loading real-time news...">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse border border-slate-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getEventIcon = (eventType: EventType) => {
    // Return appropriate icon based on event type
    return <MapPin className="w-4 h-4" />;
  };

  const getTimeAgo = (date: string) => {
    try {
      if (!date) return 'Unknown time';
      
      const now = new Date();
      const eventDate = new Date(date);
      
      if (isNaN(eventDate.getTime())) return 'Invalid date';
      
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
    } catch (error) {
      console.warn('Error calculating time ago:', error, 'Date:', date);
      return 'Unknown time';
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
          {filteredEvents.length} of {validEvents.length} events
        </div>
      </div>

      {/* Event List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        {filteredEvents.map((event, index) => (
          <div
            key={event.id || `event-${index}`}
            className="group border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-600 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
            onClick={() => setExpandedEvent(expandedEvent === (event.id || `event-${index}`) ? null : (event.id || `event-${index}`))}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Event Icon */}
                <div 
                  className="p-2.5 rounded-xl shadow-inner"
                  style={{ 
                    backgroundColor: `${getSeverityColor(event.severity || 'medium')}15`,
                    border: `1px solid ${getSeverityColor(event.severity || 'medium')}30`
                  }}
                >
                  {getEventIcon(event.event_type || EventType.Other)}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title and Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-100 leading-tight group-hover:text-white transition-colors">
                      {event.title || 
                       (event.event_type && event.country ? `${event.event_type} in ${event.country}` : 
                        event.event_type || 'Breaking News')}
                    </h3>
                    {event.severity && (
                      <Badge variant="severity" severity={event.severity} className="ml-2 flex-shrink-0">
                        {event.severity}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {(event.description || event.notes) && (
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                      {(event.description || event.notes || '').slice(0, 200)}
                      {(event.description || event.notes || '').length > 200 ? '...' : ''}
                    </p>
                  )}
                  
                  {/* Metadata Row */}
                  <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mb-2">
                    {(event.region || event.country || event.location) && (
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{event.location || event.region || event.country}</span>
                      </div>
                    )}
                    
                    {event.fatalities !== undefined && event.fatalities > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-300">{event.fatalities} casualties</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{getTimeAgo(event.date || event.timestamp || new Date().toISOString())}</span>
                    </div>

                    {event.source && (
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-blue-300 font-medium">{event.source}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {event.tags.slice(0, 4).map((tag, tagIndex) => (
                        <span 
                          key={tagIndex}
                          className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md border border-slate-600/50"
                        >
                          #{tag}
                        </span>
                      ))}
                      {event.tags.length > 4 && (
                        <span className="px-2 py-1 bg-slate-700/30 text-slate-400 text-xs rounded-md">
                          +{event.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {expandedEvent === (event.id || `event-${index}`) && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {(event.actors || event.actor1) && (
                        <div className="bg-slate-800/30 rounded-lg p-3">
                          <div className="text-sm font-medium text-slate-200 mb-1">Involved Parties</div>
                          <div className="text-sm text-slate-300">
                            {event.actors || event.actor1}
                            {event.actor2 && ` • ${event.actor2}`}
                          </div>
                        </div>
                      )}
                      
                      {(event.latitude && event.longitude) && (
                        <div className="bg-slate-800/30 rounded-lg p-3">
                          <div className="text-sm font-medium text-slate-200 mb-1">Coordinates</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-slate-800/30 rounded-lg p-3">
                        <div className="text-sm font-medium text-slate-200 mb-1">Timestamp</div>
                        <div className="text-sm text-slate-300">
                          {formatDate(event.date || event.timestamp || new Date().toISOString(), 'PPpp')}
                        </div>
                      </div>

                      {event.sourceUrl && (
                        <div className="pt-2">
                          <a
                            href={event.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Read Full Article</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              >
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