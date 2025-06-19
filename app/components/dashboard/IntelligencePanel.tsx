'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, TrendingUp, TrendingDown, Shield, Zap, Globe } from 'lucide-react';

interface CrisisAlert {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  timestamp: string;
  category: 'MILITARY' | 'POLITICAL' | 'ECONOMIC' | 'HUMANITARIAN' | 'CYBER';
  confidence: number;
  trends: string[];
}

interface EconomicIndicator {
  country: string;
  indicator: string;
  value: number;
  change: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

interface GeopoliticalTrend {
  region: string;
  trend: string;
  description: string;
  severity: string;
  relatedCountries: string[];
}

interface IntelligenceData {
  crisisAlerts: { count: number; alerts: CrisisAlert[] };
  economicIndicators: { count: number; indicators: EconomicIndicator[] };
  geopoliticalTrends: { count: number; trends: GeopoliticalTrend[] };
  regionalRiskAssessment: { [region: string]: { level: string; factors: string[] } };
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    highRiskRegions: string[];
    economicConcerns: number;
  };
}

export default function IntelligencePanel() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntelligenceData();
    const interval = setInterval(fetchIntelligenceData, 15 * 60 * 1000); // Refresh every 15 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchIntelligenceData = async () => {
    try {
      const response = await fetch('/api/test-crisis');
      if (!response.ok) throw new Error('Failed to fetch intelligence data');
      
      const result = await response.json();
      if (result.status === 'success') {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching intelligence data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-400 border-red-400';
      case 'high': return 'text-amber-400 border-amber-400';
      case 'medium': return 'text-orange-400 border-orange-400';
      case 'low': return 'text-emerald-400 border-emerald-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MILITARY': return <Shield className="w-4 h-4" />;
      case 'CYBER': return <Zap className="w-4 h-4" />;
      case 'POLITICAL': return <Globe className="w-4 h-4" />;
      case 'ECONOMIC': return <TrendingDown className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      if (!timestamp) return 'Unknown time';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Error formatting timestamp:', error, 'Timestamp:', timestamp);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card title="Intelligence Analysis" subtitle="Loading geopolitical intelligence...">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card title="Intelligence Analysis" subtitle="Error loading data">
        <div className="text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!data || !data.summary) return null;

  return (
    <div className="space-y-6">
      {/* Crisis Alerts Overview */}
      <Card title="Crisis Monitoring" subtitle={`${data.summary?.totalAlerts || 0} active alerts • ${data.summary?.criticalAlerts || 0} critical`}>
        <div className="space-y-4">
          {(data.crisisAlerts?.alerts || []).slice(0, 3).map((alert) => (
            <div key={alert.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(alert.category)}
                  <h4 className="font-medium text-slate-100">{alert.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity.toLowerCase() as any}>
                    {alert.severity}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {Math.round((alert.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-2">{alert.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{alert.location}</span>
                <span>{formatTimestamp(alert.timestamp)}</span>
              </div>
              {(alert.trends?.length || 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(alert.trends || []).map((trend, index) => (
                    <span key={index} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                      #{trend}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Economic Indicators */}
      <Card title="Economic Intelligence" subtitle={`${data.economicIndicators?.count || 0} indicators • ${data.summary?.economicConcerns || 0} concerns`}>
        <div className="space-y-3">
          {(data.economicIndicators?.indicators || []).map((indicator, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg bg-slate-800/30">
              <div>
                <div className="font-medium text-slate-100">{indicator.indicator}</div>
                <div className="text-sm text-slate-400">{indicator.country}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-slate-100">
                  {typeof indicator.value === 'number' ? indicator.value.toFixed(2) : indicator.value}
                </div>
                <div className={`text-sm flex items-center gap-1 ${
                  (indicator.change || 0) > 0 ? 'text-red-400' : (indicator.change || 0) < 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {(indicator.change || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   (indicator.change || 0) < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {(indicator.change || 0) > 0 ? '+' : ''}{(indicator.change || 0).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Geopolitical Trends */}
      <Card title="Geopolitical Trends" subtitle={`${data.geopoliticalTrends?.count || 0} active trends`}>
        <div className="space-y-4">
          {(data.geopoliticalTrends?.trends || []).map((trend, index) => (
            <div key={index} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-slate-100">{trend.trend}</h4>
                  <span className="text-sm text-slate-400">{trend.region}</span>
                </div>
                <Badge variant={trend.severity.toLowerCase() as any}>
                  {trend.severity}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 mb-3">{trend.description}</p>
              <div className="flex flex-wrap gap-1">
                {(trend.relatedCountries || []).map((country, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Regional Risk Assessment */}
      <Card title="Regional Risk Assessment" subtitle={`${data.summary?.highRiskRegions?.length || 0} high-risk regions`}>
        <div className="space-y-3">
          {Object.entries(data.regionalRiskAssessment || {}).map(([region, assessment]) => (
            <div key={region} className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-100">{region}</h4>
                <Badge variant={assessment.level.toLowerCase() as any}>
                  {assessment.level}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(assessment?.factors || []).slice(0, 4).map((factor, index) => (
                  <div key={index} className="text-sm text-slate-300 flex items-center gap-2">
                    <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
} 