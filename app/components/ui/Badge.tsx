import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { SeverityLevel } from '../../types/conflict';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'severity' | 'outline';
  severity?: SeverityLevel;
  className?: string;
}

export function Badge({ children, variant = 'default', severity, className }: BadgeProps) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  const variantClasses = {
    default: "bg-slate-700 text-slate-300",
    outline: "border border-slate-600 text-slate-300",
    severity: getSeverityClasses(severity)
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
}

function getSeverityClasses(severity?: SeverityLevel): string {
  if (!severity) return "bg-slate-700 text-slate-300";
  
  const severityClasses = {
    critical: "bg-red-900/30 text-red-400 border border-red-700",
    high: "bg-amber-900/30 text-amber-400 border border-amber-700",
    medium: "bg-orange-900/30 text-orange-400 border border-orange-700",
    low: "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
  };
  
  return severityClasses[severity];
} 