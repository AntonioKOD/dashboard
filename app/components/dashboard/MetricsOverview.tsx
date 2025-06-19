'use client';

import { Users, AlertTriangle, Clock, Target } from 'lucide-react';
import { Card } from '../ui/Card';
import { DashboardMetrics } from '../../types/conflict';
import { formatDate } from '../../lib/utils';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
  isLoading?: boolean;
}

export function MetricsOverview({ metrics, isLoading = false }: MetricsOverviewProps) {
  const metricCards = [
    {
      title: 'Events Today',
      value: metrics.totalEventsToday,
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Fatalities',
      value: metrics.totalFatalitiesToday,
      icon: Users,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Active Conflicts',
      value: metrics.activeConflicts,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Critical Alerts',
      value: metrics.criticalAlerts,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} className={`relative overflow-hidden ${isLoading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-700 rounded animate-pulse"></span>
                  ) : (
                    metric.value.toLocaleString()
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
            
            {/* Subtle background pattern */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 opacity-5">
              <Icon className="w-full h-full" />
            </div>
          </Card>
        );
      })}
      
      {/* Data freshness indicator */}
      <div className="col-span-full">
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data • Last updated: {formatDate(metrics.dataLastUpdated, 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
} 