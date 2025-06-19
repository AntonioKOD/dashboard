'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

import { ConflictEvent, SeverityLevel } from '../../types/conflict';
import { Badge } from '../ui/Badge';
import { getSeverityColor, formatDate } from '../../lib/utils';

interface LeafletMapProps {
  events: ConflictEvent[];
  filter?: SeverityLevel | 'all';
}

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LeafletMap({ events, filter = 'all' }: LeafletMapProps) {
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);

  // Filter events based on severity
  const filteredEvents = events.filter(event => 
    filter === 'all' || event.severity === filter
  );

  // Create custom icon for different severity levels
  const createCustomIcon = (severity: SeverityLevel) => {
    const color = getSeverityColor(severity);
    const size = severity === 'critical' ? 12 : severity === 'high' ? 10 : 8;
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px ${color}50;
          animation: pulse 2s infinite;
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  // Custom CSS for pulsing animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
      }
      .leaflet-container {
        background: #1e293b !important;
      }
      .leaflet-control-container .leaflet-control {
        background: #0f172a !important;
        border: 1px solid #334155 !important;
        color: #f1f5f9 !important;
      }
      .leaflet-control-zoom a {
        background-color: #0f172a !important;
        border: none !important;
        color: #f1f5f9 !important;
      }
      .leaflet-control-zoom a:hover {
        background-color: #1e293b !important;
      }
      .leaflet-control-attribution {
        background: rgba(15, 23, 42, 0.8) !important;
        color: #94a3b8 !important;
      }
      .leaflet-control-attribution a {
        color: #60a5fa !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={[20, 0]} // Center on world
        zoom={2}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ background: '#1e293b' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        
        {filteredEvents.map((event) => (
          <CircleMarker
            key={event.id}
            center={[event.latitude, event.longitude]}
            radius={event.severity === 'critical' ? 8 : event.severity === 'high' ? 6 : 4}
            pathOptions={{
              fillColor: getSeverityColor(event.severity),
              color: 'white',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            }}
            eventHandlers={{
              click: () => setSelectedEvent(event),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    {event.event_type}
                  </h3>
                  <Badge variant="severity" severity={event.severity}>
                    {event.severity}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-xs text-slate-600">
                  <div><strong>Country:</strong> {event.country}</div>
                  <div><strong>Region:</strong> {event.region}</div>
                  <div><strong>Date:</strong> {formatDate(event.date, 'MMM dd, yyyy')}</div>
                  <div><strong>Fatalities:</strong> {event.fatalities}</div>
                  <div><strong>Actors:</strong> {event.actor1}{event.actor2 ? ` vs ${event.actor2}` : ''}</div>
                  <div><strong>Source:</strong> {event.source}</div>
                </div>
                
                {event.notes && (
                  <div className="mt-2 text-xs text-slate-500 max-w-xs">
                    <strong>Details:</strong> {event.notes.substring(0, 100)}...
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
        <h4 className="text-xs font-medium text-slate-300 mb-2">Event Severity</h4>
        <div className="space-y-1">
          {(['critical', 'high', 'medium', 'low'] as SeverityLevel[]).map((severity) => (
            <div key={severity} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: getSeverityColor(severity) }}
              />
              <span className="text-xs text-slate-400 capitalize">{severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event count */}
      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
        <div className="text-xs text-slate-400">
          Showing <span className="text-slate-200 font-medium">{filteredEvents.length}</span> events
          {filteredEvents.length !== events.length && (
            <span> (filtered from {events.length})</span>
          )}
        </div>
      </div>
    </div>
  );
} 