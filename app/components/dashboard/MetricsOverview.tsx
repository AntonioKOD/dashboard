'use client';

import { TrendingUp, TrendingDown, Users, AlertTriangle, Clock, Target } from 'lucide-react';
import { Card } from '../ui/Card';
import { DashboardMetrics } from '../../types/conflict';
import { formatDate } from '../../lib/utils';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const metricCards = [
    {
      title: 'Events Today',
      value: metrics.totalEventsToday,
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      change: '+12%',
      changeType: 'increase' as const
    },
    {
      title: 'Fatalities',
      value: metrics.totalFatalitiesToday,
      icon: Users,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      change: '+8%',
      changeType: 'increase' as const
    },
    {
      title: 'Active Conflicts',
      value: metrics.activeConflicts,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      change: '-2%',
      changeType: 'decrease' as const
    },
    {
      title: 'Critical Alerts',
      value: metrics.criticalAlerts,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      change: '+5%',
      changeType: 'increase' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = metric.changeType === 'increase' ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {metric.value.toLocaleString()}
                </p>
                <div className="flex items-center mt-2 space-x-1">
                  <TrendIcon className={`w-3 h-3 ${
                    metric.changeType === 'increase' ? 'text-red-400' : 'text-green-400'
                  }`} />
                  <span className={`text-xs font-medium ${
                    metric.changeType === 'increase' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-slate-500">vs yesterday</span>
                </div>
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