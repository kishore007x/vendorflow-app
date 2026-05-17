import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeLabel = 'vs last period',
  variant = 'default',
  className 
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const iconBgColors = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn('kpi-card group', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : isNegative ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : null}
              <span className={cn(
                'text-sm font-medium',
                isPositive && 'text-success',
                isNegative && 'text-destructive',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}>
                {isPositive && '+'}{change}%
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          'p-3 rounded-xl transition-transform group-hover:scale-110',
          iconBgColors[variant]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
