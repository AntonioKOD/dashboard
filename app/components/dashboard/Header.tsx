'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Globe, Settings, Bell, Shield, Activity, Coffee, Search } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ThreatLevel } from '../../types/conflict';
import { getThreatLevelColor, formatDate, cn } from '../../lib/utils';

interface HeaderProps {
  threatLevel: ThreatLevel;
  activeAlerts: number;
  lastUpdated: string;
}

export function Header({ threatLevel, activeAlerts, lastUpdated }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getThreatIcon = (level: ThreatLevel) => {
    switch (level) {
      case 'critical':
      case 'severe':
        return <AlertTriangle className="w-5 h-5" />;
      case 'high':
        return <Shield className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-white">WW3 Dashboard</h1>
                <p className="text-xs text-slate-400">Global Conflict Monitoring</p>
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-6">
            {/* Current Time */}
            <div className="text-sm text-slate-300">
              {formatDate(currentTime, 'MMM dd, yyyy HH:mm:ss')} UTC
            </div>

            {/* Threat Level */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Threat Level:</span>
              <Badge 
                variant="severity" 
                className={cn(
                  "flex items-center space-x-1",
                  `bg-[${getThreatLevelColor(threatLevel)}20]`,
                  `border-[${getThreatLevelColor(threatLevel)}]`,
                  `text-[${getThreatLevelColor(threatLevel)}]`
                )}
              >
                {getThreatIcon(threatLevel)}
                <span className="uppercase font-semibold">{threatLevel}</span>
              </Badge>
            </div>

            {/* Active Alerts */}
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{activeAlerts}</span>
              <span className="text-xs text-slate-500">alerts</span>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-slate-500">
              Updated: {formatDate(lastUpdated, 'HH:mm')}
            </div>

            {/* Deep Investigation Button */}
            <Link href="/nothing">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 transition-colors"
                title="Find out what's really happening"
              >
                <Search className="w-4 h-4 mr-1" />
                <span className="text-xs hidden sm:inline">Truth</span>
              </Button>
            </Link>

            {/* Buy me a coffee */}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
              onClick={() => window.open('https://coff.ee/codewithtoni', '_blank')}
              title="Support this project"
            >
              <Coffee className="w-4 h-4 mr-1" />
              <span className="text-xs hidden sm:inline">Support</span>
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 